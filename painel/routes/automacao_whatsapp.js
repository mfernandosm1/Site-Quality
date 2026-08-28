import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createRequire } from 'module';
import multer from 'multer';
import qrcode from 'qrcode';
import whatsappWeb from 'whatsapp-web.js';
import WhatsAppProvider from '../services/whatsapp/WhatsAppProvider.js';
import MediaEngine from '../services/whatsapp/MediaEngine.js';
import { ensureInboxStorage, setInboxAccount, clearInboxAccount, getInboxSummary, getCommercialDashboard, getInboundContactMetrics, getInboxData, getConversationMessages, getInboxRevision, registerWhatsAppMessage, updateInboxContact, repairInboxIdentities, repairInboxContactNames, markConversationRead, markConversationUnread, getInboxMediaFile, storeInboxMediaFile, repairInboxGroupNames, syncInboxFromWhatsApp, getInboxStorageReport, cleanInboxStorage, updateConversationAttendance, bulkUpdateConversationAttendance, ensureInboxConversationForContact } from '../services/whatsapp_inbox.js';
import { ensureErpStorage, getCustomerContext, updateCustomer, addCustomerNote, createCustomerLabel } from '../services/erp_customers.js';
import { ensureTaskStorage, getTaskOverview, listTasks, createTask, completeTask, deleteTask } from '../services/erp_tasks.js';
import CustomerService from '../services/customer-service.js';

const { Client, LocalAuth, MessageMedia } = whatsappWeb;
const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');
const MODULE_VERSION = '0.12.7-whatsapp-safety';
const CLIENT_INITIALIZE_TIMEOUT_MS = 90000;
const BIRTHDAY_TIMEZONE = 'America/Sao_Paulo';
const DEFAULT_BIRTHDAY_INTERVAL_SECONDS = 45;
const MIN_AUTOMATED_BIRTHDAY_INTERVAL_SECONDS = 45;
const SCHEDULED_QUEUE_GAP_MS = 5000;
const AUTOMATED_BLOCK_GAP_MS = 1800;
const DEFAULT_BIRTHDAY_MESSAGE = `Olá {primeiro_nome} 😃
Hoje é um dia especial 🎈
Desejamos um aniversário maravilhoso, repleto de alegria e momentos inesquecíveis 🎂🥳🎉

Que o seu dia seja tão incrível quanto você! Esperamos continuar a te atender com a mesma dedicação e qualidade de sempre`;
const DEFAULT_LATE_BIRTHDAY_MESSAGE = `Olá {primeiro_nome} 😃
Passando um pouquinho atrasados, mas não poderíamos deixar essa data especial passar em branco 🎈
Esperamos que o seu aniversário tenha sido maravilhoso, repleto de alegria e momentos inesquecíveis 🎂🥳🎉

Desejamos muitas felicidades e agradecemos por continuar com a gente. Conte sempre conosco!`;

const birthdayRuntime = {
  timer:null,
  running:false,
  lastAutomaticAttemptAt:0,
  lastDisconnectedDate:'',
  lastRunAt:null,
  lastRunResult:null
};

const scheduledMessageRuntime = {
  timer:null,
  wakeup:null,
  wakeAt:0,
  running:false,
  lastTickAt:null
};

const waState = {
  client: null,
  app: null,
  status: 'desconectado',
  message: 'WhatsApp desconectado.',
  qrDataUrl: null,
  connectedNumber: null,
  connectedName: null,
  initialized: false,
  starting: false,
  lastEventAt: null,
  lastError: null,
  blockRunning: false,
  blockQueueTail: Promise.resolve(),
  flowWaits:new Map(),
  flowTimeoutTimer:null,
  readyWatchdog: null,
  recoveryAttempts: 0,
  syncing:false,
  lastSyncAt:null,
  messageCache:new Map(),
  provider:null,
  mediaEngine:null,
  connectedSince:null,
  contactDirectoryCache:null,
  contactDirectoryCacheAt:0,
  contactDirectoryPromise:null,
  authenticatedAt:null,
  clientCreatedAt:null
};


function getCanonicalCustomerService(app){
  if(app.locals.customerService) return app.locals.customerService;
  app.locals.customerService=new CustomerService({dataDir:path.join(PANEL_DIR,'data','erp','customers')});
  return app.locals.customerService;
}
function normalizeDirectoryText(value=''){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function contactPhoneDigits(value=''){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('00')) digits=digits.slice(2);
  if(digits.length===10||digits.length===11) digits='55'+digits;
  return digits;
}
async function getWhatsAppContactDirectory(){
  if(!waState.client || waState.status!=='conectado') return [];
  const age=Date.now()-Number(waState.contactDirectoryCacheAt||0);
  if(Array.isArray(waState.contactDirectoryCache)&&age<30*60*1000) return waState.contactDirectoryCache;
  if(waState.contactDirectoryPromise) return waState.contactDirectoryPromise;
  waState.contactDirectoryPromise=(async()=>{
    let contacts=[];
    try{ contacts=await waState.client.getContacts(); }catch{ contacts=[]; }
    const compact=(contacts||[]).filter(c=>!c.isGroup&&c.id).map(c=>{
      const serialized=c.id?._serialized||'';
      const phone=contactPhoneDigits(c.number||serialized);
      if(!phone) return null;
      return {phone,whatsappId:serialized||`${phone}@c.us`,name:safeText(c.pushname||c.name||c.shortName||c.verifiedName||'',160),isMyContact:Boolean(c.isMyContact)};
    }).filter(Boolean);
    waState.contactDirectoryCache=compact; waState.contactDirectoryCacheAt=Date.now();
    return compact;
  })().finally(()=>{ waState.contactDirectoryPromise=null; });
  return waState.contactDirectoryPromise;
}
function warmWhatsAppContactDirectory(){
  if(!waState.client || waState.status!=='conectado') return;
  const age=Date.now()-Number(waState.contactDirectoryCacheAt||0);
  if(Array.isArray(waState.contactDirectoryCache)&&age<30*60*1000) return;
  if(waState.contactDirectoryPromise) return;
  getWhatsAppContactDirectory().catch(()=>{});
}

function P(app){ return app.locals.paths; }
function moduleDir(app){ return path.join(P(app).CONTENT_DIR, 'automacao_whatsapp'); }
function uploadsDir(app){ return path.join(P(app).PUBLIC_DIR, 'uploads', 'automacao_whatsapp'); }
function blockMediaRoot(app){ return path.join(uploadsDir(app), 'blocos'); }
function blockMediaDir(app, tipo='arquivos'){ return path.join(blockMediaRoot(app), tipo); }
function blockMediaUrl(tipo, filename){ return '/public/uploads/automacao_whatsapp/blocos/' + tipo + '/' + filename; }
function authDir(app){ return path.join(moduleDir(app), 'session'); }
function uploadUrl(filename){ return '/public/uploads/automacao_whatsapp/' + filename; }
function filePath(app, name){ return path.join(moduleDir(app), name); }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true }); }
function now(){ return new Date().toISOString(); }
function makeId(prefix='item'){
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
function safeText(value, max=500){
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}
function safeNumber(value, fallback=0, min=0, max=3600){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function safeConversationId(value){ return safeText(value, 80).replace(/[^a-zA-Z0-9_-]/g, ''); }
function isGroupConversation(conversation){ return conversation?.conversationType === 'group' || String(conversation?.whatsappId || '').endsWith('@g.us'); }
async function resolveInboxDestination(conversation){
  if(!waState.client || waState.status !== 'conectado') throw new Error('Conecte o WhatsApp antes de enviar.');
  if(isGroupConversation(conversation)){
    if(!conversation.whatsappId || !String(conversation.whatsappId).endsWith('@g.us')) throw new Error('O grupo ainda não possui um identificador válido.');
    return { digits:'', chatId:conversation.whatsappId, label:conversation.name || 'Grupo' };
  }
  if(!conversation.phoneResolved || !conversation.phone) throw new Error('O número real deste contato ainda não foi identificado.');
  const result = await resolveChatId(conversation.phone);
  return { ...result, label:conversation.name || result.digits };
}
function readJson(app, name, fallback){
  try {
    const fp = filePath(app, name);
    if(!fs.existsSync(fp)) return fallback;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return fallback;
  }
}
function writeJson(app, name, data){
  ensureDir(moduleDir(app));
  fs.writeFileSync(filePath(app, name), JSON.stringify(data, null, 2), 'utf-8');
}
function addLog(app, type, message, details={}){
  if(!app) return;
  const logs = readJson(app, 'logs.json', []);
  logs.unshift({ id: makeId('log'), type: safeText(type, 50), message: safeText(message, 500), details, at: now() });
  writeJson(app, 'logs.json', logs.slice(0, 500));
}
function ensureWhatsAppProvider(){
  if(!waState.provider){
    waState.provider = new WhatsAppProvider({
      client:waState.client,
      statusReader:() => ({ whatsappStatus:waState.status, initialized:waState.initialized }),
      logger:(type,message,details={}) => addLog(waState.app,type,message,details)
    });
  } else {
    waState.provider.setClient(waState.client);
  }
  return waState.provider;
}

function ensureMediaEngine(){
  const provider=ensureWhatsAppProvider();
  if(!waState.mediaEngine){
    waState.mediaEngine=new MediaEngine({
      client:waState.client,
      provider,
      messageCache:waState.messageCache,
      logger:(type,message,details={})=>addLog(waState.app,type,message,details)
    });
  }else{
    waState.mediaEngine.setClient(waState.client).setProvider(provider);
  }
  return waState.mediaEngine;
}

function setWaState(status, message, extra={}){
  waState.status = status;
  waState.message = message;
  waState.lastEventAt = now();
  Object.assign(waState, extra);
}
function clearReadyWatchdog(){
  if(waState.readyWatchdog){
    clearTimeout(waState.readyWatchdog);
    waState.readyWatchdog = null;
  }
}
function armReadyWatchdog(app, client){
  clearReadyWatchdog();
  waState.readyWatchdog = setTimeout(async () => {
    if(waState.client !== client || waState.status === 'conectado') return;
    addLog(app, 'whatsapp_sessao_lenta', 'A sessão autenticou, mas não ficou pronta no tempo esperado.', { tentativa:waState.recoveryAttempts + 1 });
    if(waState.recoveryAttempts >= 1){
      setWaState('erro', 'A sessão foi autenticada, mas não concluiu a inicialização. Feche o painel e abra novamente.', {
        lastError:'Tempo limite aguardando o evento ready.', starting:false, initialized:false
      });
      return;
    }
    waState.recoveryAttempts += 1;
    try { await client.destroy(); } catch {}
    if(waState.client === client) waState.client = null;
    waState.starting = false;
    setWaState('reiniciando', 'Sessão demorou para iniciar. Tentando novamente sem apagar os dados...', {
      qrDataUrl:null, initialized:false, starting:false
    });
    await sleep(1500);
    try { await createClient(app); } catch {}
  }, 30000);
}
function publicWaState(){
  return {
    status: waState.status,
    message: waState.message,
    qrDataUrl: waState.qrDataUrl,
    connectedNumber: waState.connectedNumber,
    connectedName: waState.connectedName,
    initialized: waState.initialized,
    starting: waState.starting,
    lastEventAt: waState.lastEventAt,
    lastError: waState.lastError,
    blockRunning: waState.blockRunning,
    syncing:waState.syncing,
    lastSyncAt:waState.lastSyncAt,
    connectedSince:waState.connectedSince,
    authenticatedAt:waState.authenticatedAt,
    clientCreatedAt:waState.clientCreatedAt,
    messageCacheSize:waState.messageCache.size
  };
}
function defaults(){
  return {
    blocos: [
      {
        id: 'bloco_menu_inicial',
        nome: 'Menu inicial',
        descricao: 'Exemplo de bloco com texto, pausa e opções.',
        gatilho: 'menu',
        categoria: 'Geral',
        favorito: true,
        ativo: true,
        criadoEm: now(),
        atualizadoEm: now(),
        etapas: [
          { id: makeId('etapa'), tipo: 'texto', texto: 'Olá 😃\nEscolha uma opção:\n\n1️⃣ Smartphones\n2️⃣ Assistência', digitandoSegundos: 2 },
          { id: makeId('etapa'), tipo: 'pausa', segundos: 3 },
          { id: makeId('etapa'), tipo: 'opcoes', texto: 'Escolha uma opção:', opcoes: [
            { label: 'Smartphones', resposta: '1', acaoTipo:'texto', texto:'Vou te mostrar nossas opções de smartphones 👇', proximoBloco:'' },
            { label: 'Assistência', resposta: '2', acaoTipo:'texto', texto:'Me conte qual aparelho precisa de assistência.', proximoBloco:'' }
          ]}
        ]
      }
    ],
    contatos: [],
    fila: [],
    midias: [],
    logs: [],
    config: {
      version: MODULE_VERSION,
      whatsappConectado: false,
      envioRealAtivo: false,
      numeroTeste: '',
      aniversariantesAtivo: false,
      horarioAniversario: '08:00',
      mensagemAniversario: DEFAULT_BIRTHDAY_MESSAGE,
      mensagemAniversarioAtrasado: DEFAULT_LATE_BIRTHDAY_MESSAGE,
      intervaloAniversarioSegundos: DEFAULT_BIRTHDAY_INTERVAL_SECONDS,
      limiteDiario: 40,
      delayHumanoMin: 4,
      delayHumanoMax: 12,
      digitandoPadrao: 2,
      gravandoAudioPadrao: 2,
      criadoEm: now(),
      atualizadoEm: now()
    }
  };
}
function ensureData(app){
  const d = defaults();
  ensureDir(moduleDir(app));
  if(!fs.existsSync(filePath(app, 'blocos.json'))) writeJson(app, 'blocos.json', d.blocos);
  if(!fs.existsSync(filePath(app, 'contatos.json'))) writeJson(app, 'contatos.json', d.contatos);
  if(!fs.existsSync(filePath(app, 'fila.json'))) writeJson(app, 'fila.json', d.fila);
  if(!fs.existsSync(filePath(app, 'midias.json'))) writeJson(app, 'midias.json', d.midias);
  if(!fs.existsSync(filePath(app, 'logs.json'))) writeJson(app, 'logs.json', d.logs);
  if(!fs.existsSync(filePath(app, 'flow_sessions.json'))) writeJson(app, 'flow_sessions.json', []);
  if(!fs.existsSync(filePath(app, 'aniversariantes_envios.json'))) writeJson(app, 'aniversariantes_envios.json', { version:1, items:[] });
  if(!fs.existsSync(filePath(app, 'mensagens_agendadas.json'))) writeJson(app, 'mensagens_agendadas.json', { version:1, items:[] });
  if(!fs.existsSync(filePath(app, 'palavras_chave.json'))) writeJson(app, 'palavras_chave.json', { version:1, items:[] });
  if(!fs.existsSync(filePath(app, 'automacao_bloqueios.json'))) writeJson(app, 'automacao_bloqueios.json', { version:1, items:[] });
  if(!fs.existsSync(filePath(app, 'config.json'))) writeJson(app, 'config.json', d.config);
}
function syncLegacyMediaCatalog(app, blocos, midias){
  const list = Array.isArray(midias) ? [...midias] : [];
  const knownPaths = new Set(list.map(m => m.caminho).filter(Boolean));
  let changed = false;
  for(const bloco of blocos || []){
    for(const step of bloco.etapas || []){
      const candidates=[];
      if(['imagem','audio','video','arquivo'].includes(step.tipo) && step.caminho) candidates.push(step);
      if(step.tipo==='opcoes' && Array.isArray(step.opcoes)){
        for(const option of step.opcoes){
          if(['imagem','audio','video','arquivo'].includes(option.acaoTipo) && option.caminho) candidates.push({ ...option, tipo:option.acaoTipo, _target:option });
        }
      }
      for(const item of candidates){
        if(!item.caminho || knownPaths.has(item.caminho)) continue;
        const absolute = localMediaPath(app, item.caminho);
        let tamanho = 0;
        try{ if(fs.existsSync(absolute)) tamanho = fs.statSync(absolute).size; }catch{}
        const nome = path.basename(String(item.caminho).split('?')[0]) || 'Mídia antiga';
        const media = { id:makeId('midia'), nome, tipo:item.tipo, categoria:item.tipo === 'imagem'?'imagens':item.tipo === 'audio'?'audios':item.tipo === 'video'?'videos':'arquivos', caminho:item.caminho, arquivo:nome, mime:'', tamanho, legado:true, criadoEm:now(), atualizadoEm:now() };
        list.push(media); knownPaths.add(item.caminho); (item._target || item).mediaId = media.id; changed = true;
      }
    }
  }
  if(changed){ writeJson(app, 'midias.json', list); writeJson(app, 'blocos.json', blocos); }
  return list;
}
function loadAll(app){
  ensureData(app);
  const d = defaults();
  const blocos = readJson(app, 'blocos.json', d.blocos);
  const midias = syncLegacyMediaCatalog(app, blocos, readJson(app, 'midias.json', d.midias));
  return {
    blocos,
    contatos: readJson(app, 'contatos.json', d.contatos),
    fila: readJson(app, 'fila.json', d.fila),
    midias,
    logs: readJson(app, 'logs.json', d.logs),
    palavrasChave: keywordRulesData(app).items,
    config: { ...d.config, ...readJson(app, 'config.json', d.config), version: MODULE_VERSION }
  };
}

function normalizeAutomationText(value=''){
  return String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function automationSuppressionsData(app){
  const raw=readJson(app,'automacao_bloqueios.json',{version:1,items:[]});
  const items=(Array.isArray(raw?.items)?raw.items:[]).map(item=>({
    phone:String(item?.phone||'').replace(/\D/g,''),
    blockedAt:item?.blockedAt||null,
    reason:safeText(item?.reason||'opt_out',80),
    source:safeText(item?.source||'whatsapp',80)
  })).filter(item=>item.phone);
  return {version:1,items};
}
function saveAutomationSuppressions(app,data){ writeJson(app,'automacao_bloqueios.json',{version:1,items:(data?.items||[]).slice(-5000)}); }
function automationPhoneKey(value=''){
  let n=String(value||'').replace(/\D/g,'');
  if((n.length===10||n.length===11)&&!n.startsWith('55'))n='55'+n;
  return n;
}
function isAutomationSuppressed(app,phone=''){
  const key=automationPhoneKey(phone);if(!key)return false;
  return automationSuppressionsData(app).items.some(item=>item.phone===key);
}
function setAutomationSuppressed(app,phone='',blocked=true,{reason='opt_out',source='whatsapp'}={}){
  const key=automationPhoneKey(phone);if(!key)return false;
  const data=automationSuppressionsData(app);const index=data.items.findIndex(item=>item.phone===key);
  if(blocked){
    const next={phone:key,blockedAt:now(),reason:safeText(reason,80),source:safeText(source,80)};
    if(index>=0)data.items[index]=next;else data.items.push(next);
  }else if(index>=0)data.items.splice(index,1);
  saveAutomationSuppressions(app,data);return true;
}
function automationPreferenceIntent(text=''){
  const normalized=normalizeAutomationText(text);if(!normalized)return '';
  const optIn=['quero voltar a receber','pode voltar a enviar','pode me enviar novamente','voltar a receber mensagens'];
  if(optIn.some(item=>normalized.includes(item)))return 'opt_in';
  const exactOut=new Set(['parar','pare','sair','descadastrar','remover meu numero','remova meu numero']);
  if(exactOut.has(normalized))return 'opt_out';
  const out=['nao quero receber mensagens','nao quero mais receber','nao me envie mensagens','nao envie mais mensagens','cancelar mensagens','parar de receber mensagens','remover das mensagens'];
  if(out.some(item=>normalized.includes(item)))return 'opt_out';
  return '';
}
function applyInboundAutomationPreference(app,{phone='',text=''}={}){
  const intent=automationPreferenceIntent(text);if(!intent||!phone)return intent;
  if(intent==='opt_out')setAutomationSuppressed(app,phone,true,{reason:'pedido_cliente',source:'mensagem_recebida'});
  if(intent==='opt_in')setAutomationSuppressed(app,phone,false,{reason:'retorno_cliente',source:'mensagem_recebida'});
  return intent;
}
function splitKeywordInput(value){
  const source=Array.isArray(value)?value.join('\n'):String(value||'');
  const seen=new Set();
  return source.split(/\r?\n|;|,/).map(item=>safeText(item,180).trim()).filter(Boolean).filter(item=>{
    const key=normalizeAutomationText(item);
    if(!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,60);
}
function keywordRulesData(app){
  const raw=readJson(app,'palavras_chave.json',{version:1,items:[]});
  const items=(Array.isArray(raw?.items)?raw.items:[]).map((item,index)=>({
    id:safeText(item.id||makeId('keyword'),100),
    nome:safeText(item.nome||`Regra ${index+1}`,160),
    modo:['contem','igual','comeca'].includes(item.modo)?item.modo:'contem',
    palavras:splitKeywordInput(item.palavras||item.keywords||[]),
    blocoId:safeText(item.blocoId||'',120),
    ativo:item.ativo!==false,
    execucoes:Math.max(0,Number(item.execucoes||0)),
    execucoesHistorico:(Array.isArray(item.execucoesHistorico)?item.execucoesHistorico:[]).map(hit=>({at:hit?.at||null,palavra:safeText(hit?.palavra||'',180),mensagem:safeText(hit?.mensagem||'',240)})).filter(hit=>hit.at).slice(-1200),
    criadoEm:item.criadoEm||now(),
    atualizadoEm:item.atualizadoEm||item.criadoEm||now(),
    ultimoAcionamentoEm:item.ultimoAcionamentoEm||null,
    ultimaMensagem:safeText(item.ultimaMensagem||'',300)
  })).filter(item=>item.palavras.length && item.blocoId);
  return {version:1,items};
}
function saveKeywordRulesData(app,data){
  const items=(Array.isArray(data?.items)?data.items:[]).slice(0,500);
  writeJson(app,'palavras_chave.json',{version:1,items});
}
function keywordMatchesRule(rule,messageText){
  const text=normalizeAutomationText(messageText);
  if(!text) return false;
  return (rule.palavras||[]).some(raw=>{
    const keyword=normalizeAutomationText(raw);
    if(!keyword) return false;
    if(rule.modo==='igual') return text===keyword;
    if(rule.modo==='comeca') return text===keyword || text.startsWith(keyword+' ');
    return text.includes(keyword);
  });
}
function matchingKeywordTerm(rule,messageText){
  const text=normalizeAutomationText(messageText);
  if(!text) return '';
  return (rule.palavras||[]).find(raw=>{
    const keyword=normalizeAutomationText(raw);
    if(!keyword) return false;
    if(rule.modo==='igual') return text===keyword;
    if(rule.modo==='comeca') return text===keyword || text.startsWith(keyword+' ');
    return text.includes(keyword);
  }) || '';
}
function keywordAutomationMetrics(rules=[]){
  const current=new Date();
  const dayStart=new Date(current);dayStart.setHours(0,0,0,0);
  const weekStart=new Date(dayStart);weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const monthStart=new Date(current.getFullYear(),current.getMonth(),1);
  const countSince=start=>rules.reduce((sum,rule)=>sum+(rule.execucoesHistorico||[]).filter(hit=>Date.parse(hit.at)>=start.getTime()).length,0);
  const top=rules.filter(rule=>Number(rule.execucoes||0)>0).map(rule=>({id:rule.id,nome:rule.nome,total:Number(rule.execucoes||0),ultimoAcionamentoEm:rule.ultimoAcionamentoEm||null,ultimaMensagem:rule.ultimaMensagem||''})).sort((a,b)=>b.total-a.total).slice(0,8);
  const terms=new Map();
  for(const rule of rules){for(const hit of (rule.execucoesHistorico||[])){const label=safeText(hit.palavra||'',180);if(!label)continue;const key=normalizeAutomationText(label);const item=terms.get(key)||{label,total:0};item.total+=1;terms.set(key,item);}}
  const topTerms=[...terms.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label,'pt-BR')).slice(0,8);
  return {today:countSince(dayStart),week:countSince(weekStart),month:countSince(monthStart),total:rules.reduce((sum,rule)=>sum+Number(rule.execucoes||0),0),top,topTerms};
}
function findMatchingKeywordRule(app,messageText){
  const rules=keywordRulesData(app).items;
  return rules.find(rule=>rule.ativo && keywordMatchesRule(rule,messageText)) || null;
}
async function handleKeywordAutomation(app,message){
  if(!message || message.fromMe) return false;
  const chatId=flowSessionKey(message.from||message.author||'');
  if(!chatId || chatId.endsWith('@g.us')) return false;
  const body=safeText(message?.body||'',4000);
  if(!body) return false;
  const data=keywordRulesData(app);
  const rule=data.items.find(item=>item.ativo && keywordMatchesRule(item,body));
  if(!rule) return false;
  const bloco=findBlockByReference(app,rule.blocoId);
  if(!bloco || !bloco.ativo){
    addLog(app,'palavra_chave_bloco_indisponivel','Palavra-chave correspondeu a uma regra, mas o bloco está inexistente ou inativo.',{
      regraId:rule.id,regra:rule.nome,blocoId:rule.blocoId,mensagem:safeText(body,220)
    });
    return false;
  }
  const hitAt=now();
  const matchedTerm=matchingKeywordTerm(rule,body);
  try{
    await executeBlockToChat(app,{digits:'',chatId,label:chatId},bloco);
    rule.execucoes=Number(rule.execucoes||0)+1;
    rule.execucoesHistorico=[...(rule.execucoesHistorico||[]),{at:hitAt,palavra:safeText(matchedTerm,180),mensagem:safeText(body,240)}].slice(-1200);
    rule.ultimoAcionamentoEm=hitAt;
    rule.ultimaMensagem=safeText(body,300);
    rule.atualizadoEm=hitAt;
    saveKeywordRulesData(app,data);
    addLog(app,'palavra_chave_acionada',`Resposta automática enviada: ${rule.nome}.`,{
      regraId:rule.id,blocoId:bloco.id,bloco:bloco.nome,chatId,mensagem:safeText(body,220),palavra:safeText(matchedTerm,180),modo:rule.modo
    });
  }catch(error){
    addLog(app,'palavra_chave_erro','Falha ao executar o bloco acionado pela automação.',{
      regraId:rule.id,blocoId:bloco.id,chatId,erro:error?.message||String(error)
    });
  }
  return true;
}

function normalizeSteps(raw){
  let steps = [];
  try { steps = JSON.parse(raw || '[]'); } catch { steps = []; }
  if(!Array.isArray(steps)) steps = [];

  return steps.slice(0, 80).map((s) => {
    const tipo = safeText(s.tipo || 'texto', 30);
    const base = { id: safeText(s.id || makeId('etapa'), 80), tipo };

    if(tipo === 'texto') return { ...base, texto: safeText(s.texto, 4000), digitandoSegundos: safeNumber(s.digitandoSegundos, 0, 0, 180) };
    if(tipo === 'pausa') return { ...base, segundos: safeNumber(s.segundos, 3, 0, 600) };
    if(tipo === 'audio') return { ...base, caminho: safeText(s.caminho, 600), mediaId: safeText(s.mediaId, 120), gravandoSegundos: safeNumber(s.gravandoSegundos, 2, 0, 180), legenda: safeText(s.legenda, 1000) };
    if(tipo === 'imagem') return { ...base, caminho: safeText(s.caminho, 600), mediaId: safeText(s.mediaId, 120), legenda: safeText(s.legenda, 1500) };
    if(tipo === 'video') return { ...base, caminho: safeText(s.caminho, 600), mediaId: safeText(s.mediaId, 120), legenda: safeText(s.legenda, 1500) };
    if(tipo === 'arquivo') return { ...base, caminho: safeText(s.caminho, 600), mediaId: safeText(s.mediaId, 120), legenda: safeText(s.legenda, 1500) };
    if(tipo === 'opcoes'){
      const opcoes = Array.isArray(s.opcoes) ? s.opcoes.slice(0, 10).map((o,index) => {
        let acaoTipo = safeText(o.acaoTipo, 30);
        if(!acaoTipo) acaoTipo = o.proximoBloco ? 'bloco' : 'encerrar';
        if(!['texto','audio','imagem','video','arquivo','bloco','encerrar'].includes(acaoTipo)) acaoTipo = 'encerrar';
        return {
          label: safeText(o.label, 100),
          resposta: safeText(o.resposta || String(index+1), 30),
          acaoTipo,
          texto: safeText(o.texto, 4000),
          caminho: safeText(o.caminho, 600),
          mediaId: safeText(o.mediaId, 120),
          legenda: safeText(o.legenda, 1500),
          proximoBloco: safeText(o.proximoBloco, 120)
        };
      }).filter(o => o.label) : [];
      return { ...base,
        texto: safeText(s.texto, 1500),
        mensagemInvalida: Object.prototype.hasOwnProperty.call(s,'mensagemInvalida') ? safeText(s.mensagemInvalida, 2000) : 'Não entendi sua resposta. Por favor, escolha uma das opções informadas acima.',
        tempoLimiteMinutos: safeNumber(s.tempoLimiteMinutos, 30, 0, 10080),
        mensagemExpirada: Object.prototype.hasOwnProperty.call(s,'mensagemExpirada') ? safeText(s.mensagemExpirada, 2000) : 'Este atendimento foi encerrado automaticamente por falta de resposta. Quando precisar, é só chamar novamente.',
        encerrarAoExpirar: s.encerrarAoExpirar !== false,
        opcoes
      };
    }
    return { ...base, tipo:'texto', texto: safeText(s.texto || '', 4000), digitandoSegundos: 0 };
  });
}
function flash(res, url, msg){
  res.redirect(url + (url.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent(msg));
}
function sleep(ms){ return new Promise(resolve => setTimeout(resolve, Math.max(0, ms))); }
function detectChrome(){
  const candidates = process.platform === 'win32' ? [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ] : [];
  return candidates.find(candidate => candidate && fs.existsSync(candidate));
}
function normalizePhone(raw){
  let digits = String(raw || '').replace(/\D/g, '');
  if(digits.startsWith('00')) digits = digits.slice(2);
  // Cadastros do ERP usam normalmente DDD + número (10/11 dígitos).
  // Mesmo quando o DDD é 55, ainda precisamos acrescentar o código do Brasil.
  if(digits.length === 10 || digits.length === 11) digits = '55' + digits;
  if(!/^\d{12,13}$/.test(digits) || !digits.startsWith('55')) throw new Error('Informe um número brasileiro com DDD. Exemplo: 5599999999999.');
  return digits;
}
async function resolveChatId(raw){
  if(!waState.client || waState.status !== 'conectado') throw new Error('Conecte o WhatsApp antes de enviar.');
  const digits = normalizePhone(raw);
  const found = await waState.client.getNumberId(digits);
  if(!found?._serialized) throw new Error('Este número não foi encontrado no WhatsApp.');
  return { digits, chatId: found._serialized };
}

function birthdayClock(date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{
    timeZone:BIRTHDAY_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  }).formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  return {
    year:Number(parts.year),month:Number(parts.month),day:Number(parts.day),hour:Number(parts.hour),minute:Number(parts.minute),second:Number(parts.second),
    date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`
  };
}
function parseBirthday(value=''){
  const raw=String(value||'').trim();
  let match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match) return {year:Number(match[1]),month:Number(match[2]),day:Number(match[3])};
  match=raw.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
  if(match) return {year:Number(match[3]),month:Number(match[2]),day:Number(match[1])};
  return null;
}
function birthdayFirstName(name=''){
  return safeText(name,160).split(/\s+/).filter(Boolean)[0] || 'Cliente';
}
function birthdayDisplayDate(value=''){
  const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match?`${match[3]}/${match[2]}/${match[1]}`:String(value||'');
}
function renderBirthdayMessage(template, customer={}, context={}){
  const fullName=safeText(customer.name||'',160) || 'Cliente';
  const first=birthdayFirstName(fullName);
  const birthdayDate=safeText(context.birthdayDateLabel||customer.birthdayDateLabel||'',40);
  return String(template||DEFAULT_BIRTHDAY_MESSAGE)
    .replace(/\{\{\s*primeiro_nome\s*\}\}|\{primeiro_nome\}/gi,first)
    .replace(/\{\{\s*nome\s*\}\}|\{nome\}/gi,fullName)
    .replace(/\{\{\s*data_aniversario\s*\}\}|\{data_aniversario\}/gi,birthdayDate)
    .trim().slice(0,4000);
}
function normalizeBirthdayPhone(value='',isMobile=false){
  let digits=String(value||'').replace(/\D/g,'');
  if(digits.startsWith('00')) digits=digits.slice(2);
  // Mantém a compatibilidade da automação antiga: celular brasileiro legado
  // com DDD + 8 dígitos recebe o nono dígito antes da consulta no WhatsApp.
  if(isMobile && digits.length===10) digits=digits.slice(0,2)+'9'+digits.slice(2);
  return normalizePhone(digits);
}
function birthdayPhone(customer={}){
  if(customer.mobile){ try { return normalizeBirthdayPhone(customer.mobile,true); } catch {} }
  if(customer.phone){ try { return normalizeBirthdayPhone(customer.phone,false); } catch {} }
  return '';
}
function birthdayHistory(app){
  const data=readJson(app,'aniversariantes_envios.json',{version:1,items:[]});
  data.version=1; data.items=Array.isArray(data.items)?data.items:[];
  return data;
}
function saveBirthdayHistory(app,data){
  const items=(Array.isArray(data?.items)?data.items:[]).slice(-5000);
  writeJson(app,'aniversariantes_envios.json',{version:1,items});
}
function findBirthdayHistoryEntry(history,date,customerId){
  return (history.items||[]).find(item=>item.date===date && String(item.customerId)===String(customerId)) || null;
}
function findBirthdaySentByPhone(history,date,phone){
  const clean=String(phone||'').replace(/\D/g,'');
  if(!clean) return null;
  return (history.items||[]).find(item=>item.date===date && item.status==='enviado' && String(item.phone||'').replace(/\D/g,'')===clean) || null;
}
function upsertBirthdayHistory(app,{date,customer,phone,status,error='',message='',source='automatico'}){
  const history=birthdayHistory(app);
  let item=findBirthdayHistoryEntry(history,date,customer.id);
  const timestamp=now();
  if(!item){
    item={id:makeId('aniv'),date,customerId:customer.id,customerName:safeText(customer.name,160),phone:phone||'',status:'pendente',attempts:0,createdAt:timestamp};
    history.items.push(item);
  }
  item.customerName=safeText(customer.name,160); item.phone=phone||item.phone||''; item.status=status; item.source=source;
  item.attempts=Number(item.attempts||0)+1; item.lastAttemptAt=timestamp; item.updatedAt=timestamp;
  if(status==='enviado') item.sentAt=timestamp;
  item.error=error?safeText(error,500):''; item.message=message?safeText(message,4000):(item.message||'');
  saveBirthdayHistory(app,history);
  return item;
}
function getBirthdayCustomers(app, clock=birthdayClock()){
  const service=getCanonicalCustomerService(app);
  return service.listCustomers({includeInactive:false}).filter(customer=>{
    const birth=parseBirthday(customer.birthDate);
    return birth && birth.month===clock.month && birth.day===clock.day;
  });
}
function getMissedBirthdayDashboard(app,config){
  const clock=birthdayClock(new Date(Date.now()-24*60*60*1000));
  const history=birthdayHistory(app);
  const customers=getBirthdayCustomers(app,clock);
  const dateLabel=birthdayDisplayDate(clock.date);
  const rows=customers.map(customer=>{
    const phone=birthdayPhone(customer);
    const entry=findBirthdayHistoryEntry(history,clock.date,customer.id);
    const sentByPhone=phone?findBirthdaySentByPhone(history,clock.date,phone):null;
    const suppressed=phone?isAutomationSuppressed(app,phone):false;
    const status=suppressed?'opt_out':(entry?.status || (sentByPhone?'enviado':(phone?'pendente':'sem_telefone')));
    return {
      id:customer.id,name:customer.name||'Cliente',birthDate:customer.birthDate||'',phone,
      status,error:entry?.error||'',sentAt:entry?.sentAt||null,birthdayDate:clock.date,birthdayDateLabel:dateLabel,
      message:renderBirthdayMessage(config.mensagemAniversarioAtrasado||DEFAULT_LATE_BIRTHDAY_MESSAGE,customer,{birthdayDateLabel:dateLabel})
    };
  }).filter(row=>row.status!=='enviado' && row.status!=='opt_out');
  return {
    date:clock.date,dateLabel,rows,total:rows.length,
    pending:rows.filter(row=>row.status==='pendente'||row.status==='erro').length,
    noPhone:rows.filter(row=>row.status==='sem_telefone').length,
    optedOut:rows.filter(row=>row.status==='opt_out').length,
    previewMessage:renderBirthdayMessage(config.mensagemAniversarioAtrasado||DEFAULT_LATE_BIRTHDAY_MESSAGE,{name:'João da Silva'},{birthdayDateLabel:dateLabel})
  };
}
function getBirthdayDashboard(app,config){
  const clock=birthdayClock();
  const history=birthdayHistory(app);
  const customers=getBirthdayCustomers(app,clock);
  const rows=customers.map(customer=>{
    const phone=birthdayPhone(customer);
    const entry=findBirthdayHistoryEntry(history,clock.date,customer.id);
    const sentByPhone=phone?findBirthdaySentByPhone(history,clock.date,phone):null;
    const suppressed=phone?isAutomationSuppressed(app,phone):false;
    let status=suppressed?'opt_out':(entry?.status || (sentByPhone?'enviado':(phone?'pendente':'sem_telefone')));
    return {
      id:customer.id,name:customer.name||'Cliente',birthDate:customer.birthDate||'',phone,
      status,error:entry?.error||'',sentAt:entry?.sentAt||null,
      message:renderBirthdayMessage(config.mensagemAniversario,customer,{birthdayDateLabel:birthdayDisplayDate(clock.date)})
    };
  });
  const sent=rows.filter(row=>row.status==='enviado').length;
  const pending=rows.filter(row=>row.status==='pendente'||row.status==='erro').length;
  const noPhone=rows.filter(row=>row.status==='sem_telefone').length;
  const optedOut=rows.filter(row=>row.status==='opt_out').length;
  const recent=(history.items||[]).slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))).slice(0,30);
  return {
    date:clock.date,rows,total:rows.length,sent,pending,noPhone,optedOut,recent,
    previewMessage:renderBirthdayMessage(config.mensagemAniversario,{name:'João da Silva'},{birthdayDateLabel:birthdayDisplayDate(clock.date)}),
    missedPreviousDay:getMissedBirthdayDashboard(app,config),
    runtime:{running:birthdayRuntime.running,lastRunAt:birthdayRuntime.lastRunAt,lastRunResult:birthdayRuntime.lastRunResult}
  };
}
function randomBirthdayDelay(config){
  const configured=safeNumber(config.intervaloAniversarioSegundos,DEFAULT_BIRTHDAY_INTERVAL_SECONDS,0,600);
  // Mensagens proativas não são disparadas em rajada. O intervalo mínimo é deliberadamente
  // conservador para reduzir envios acidentais em sequência; não substitui as regras oficiais do WhatsApp.
  return Math.max(MIN_AUTOMATED_BIRTHDAY_INTERVAL_SECONDS,configured||DEFAULT_BIRTHDAY_INTERVAL_SECONDS)*1000;
}
async function sendMissedBirthdayCustomer(app,customerId,templateOverride=""){
  if(birthdayRuntime.running) return {success:false,skipped:true,message:'Já existe uma rotina de aniversariantes em execução.'};
  if(!waState.client || waState.status!=='conectado') return {success:false,skipped:true,message:'WhatsApp desconectado.'};
  const data=loadAll(app),config=data.config;
  const clock=birthdayClock(new Date(Date.now()-24*60*60*1000));
  const customer=getBirthdayCustomers(app,clock).find(item=>String(item.id)===String(customerId));
  if(!customer) return {success:false,skipped:true,message:'Este cliente não está na lista de aniversariantes do dia anterior.'};
  const history=birthdayHistory(app);
  const previous=findBirthdayHistoryEntry(history,clock.date,customer.id);
  if(previous?.status==='enviado') return {success:false,skipped:true,message:'Este aniversário do dia anterior já foi recuperado/enviado.'};
  const phone=birthdayPhone(customer);
  if(!phone) return {success:false,skipped:true,message:'Corrija o telefone/celular deste cliente antes de enviar.'};
  if(isAutomationSuppressed(app,phone)) return {success:false,skipped:true,message:'Este contato pediu para não receber mensagens automáticas.'};
  if(findBirthdaySentByPhone(history,clock.date,phone)) return {success:false,skipped:true,message:'Este número já recebeu a mensagem referente a esse aniversário.'};
  birthdayRuntime.running=true;
  try{
    const dateLabel=birthdayDisplayDate(clock.date);
    const lateTemplate=safeText(templateOverride,4000) || config.mensagemAniversarioAtrasado || DEFAULT_LATE_BIRTHDAY_MESSAGE;
    const message=renderBirthdayMessage(lateTemplate,customer,{birthdayDateLabel:dateLabel});
    const {digits,chatId}=await resolveChatId(phone);
    const sentMessage=await waState.client.sendMessage(chatId,message);
    const entry=upsertBirthdayHistory(app,{date:clock.date,customer,phone:digits,status:'enviado',message,source:'manual_atrasado'});
    birthdayRuntime.lastRunAt=now(); birthdayRuntime.lastRunResult={source:'manual_atrasado',sent:1,customerId:customer.id,birthdayDate:clock.date};
    addLog(app,'aniversario_atrasado_manual',`Mensagem de aniversário atrasada enviada manualmente para ${customer.name||digits}.`,{customerId:customer.id,telefone:digits,birthdayDate:clock.date,attempts:entry.attempts||1,whatsappMessageId:sentMessage?.id?._serialized||null});
    return {success:true,date:clock.date,dateLabel,customerId:customer.id,customerName:customer.name||'Cliente',phone:digits,attempts:entry.attempts||1};
  }catch(error){
    const dateLabel=birthdayDisplayDate(clock.date);
    const lateTemplate=safeText(templateOverride,4000) || config.mensagemAniversarioAtrasado || DEFAULT_LATE_BIRTHDAY_MESSAGE;
    const message=renderBirthdayMessage(lateTemplate,customer,{birthdayDateLabel:dateLabel});
    const entry=upsertBirthdayHistory(app,{date:clock.date,customer,phone,status:'erro',error:error.message,message,source:'manual_atrasado'});
    addLog(app,'aniversario_atrasado_manual_erro',`Falha no envio manual de aniversário atrasado para ${customer.name||phone}.`,{customerId:customer.id,telefone:phone,birthdayDate:clock.date,attempts:entry.attempts||1,erro:error.message});
    return {success:false,message:error.message||'Falha ao enviar a mensagem atrasada.',customerId:customer.id,attempts:entry.attempts||1};
  }finally{
    birthdayRuntime.running=false;
  }
}
async function processMissedBirthdayRun(app,templateOverride=""){
  if(birthdayRuntime.running) return {success:false,skipped:true,message:'Já existe uma rotina de aniversariantes em execução.'};
  if(!waState.client || waState.status!=='conectado') return {success:false,skipped:true,message:'WhatsApp desconectado.'};
  const data=loadAll(app),config=data.config;
  const clock=birthdayClock(new Date(Date.now()-24*60*60*1000));
  const dateLabel=birthdayDisplayDate(clock.date);
  birthdayRuntime.running=true;
  const result={date:clock.date,dateLabel,total:0,sent:0,alreadySent:0,noPhone:0,errors:0,source:'manual_atrasado'};
  try{
    const customers=getBirthdayCustomers(app,clock);
    result.total=customers.length;
    let processed=0;
    for(const customer of customers){
      const history=birthdayHistory(app);
      const previous=findBirthdayHistoryEntry(history,clock.date,customer.id);
      if(previous?.status==='enviado'){ result.alreadySent++; continue; }
      const phone=birthdayPhone(customer);
      if(!phone){ result.noPhone++; continue; }
      if(isAutomationSuppressed(app,phone)){ result.optedOut=Number(result.optedOut||0)+1; continue; }
      if(findBirthdaySentByPhone(history,clock.date,phone)){ result.alreadySent++; continue; }
      processed++;
      const lateTemplate=safeText(templateOverride,4000) || config.mensagemAniversarioAtrasado || DEFAULT_LATE_BIRTHDAY_MESSAGE;
      const message=renderBirthdayMessage(lateTemplate,customer,{birthdayDateLabel:dateLabel});
      try{
        const {digits,chatId}=await resolveChatId(phone);
        const sentMessage=await waState.client.sendMessage(chatId,message);
        upsertBirthdayHistory(app,{date:clock.date,customer,phone:digits,status:'enviado',message,source:'manual_atrasado'});
        addLog(app,'aniversario_atrasado_manual',`Mensagem de aniversário atrasada enviada manualmente para ${customer.name||digits}.`,{customerId:customer.id,telefone:digits,birthdayDate:clock.date,source:'manual_atrasado',whatsappMessageId:sentMessage?.id?._serialized||null});
        result.sent++;
      }catch(error){
        upsertBirthdayHistory(app,{date:clock.date,customer,phone,status:'erro',error:error.message,message,source:'manual_atrasado'});
        addLog(app,'aniversario_atrasado_manual_erro',`Falha no envio manual de aniversário atrasado para ${customer.name||phone}.`,{customerId:customer.id,telefone:phone,birthdayDate:clock.date,erro:error.message});
        result.errors++;
      }
      if(processed<customers.length){ const delay=randomBirthdayDelay(config); if(delay>0) await sleep(delay); }
    }
    birthdayRuntime.lastRunAt=now(); birthdayRuntime.lastRunResult=result;
    addLog(app,'aniversario_atrasado_rotina_manual','Recuperação manual de aniversários do dia anterior concluída.',result);
    return {success:true,...result};
  }finally{
    birthdayRuntime.running=false;
  }
}

async function resendBirthdayCustomer(app,customerId){
  if(birthdayRuntime.running) return {success:false,skipped:true,message:'Já existe uma rotina de aniversariantes em execução.'};
  if(!waState.client || waState.status!=='conectado') return {success:false,skipped:true,message:'WhatsApp desconectado.'};
  const data=loadAll(app),config=data.config,clock=birthdayClock();
  const customer=getBirthdayCustomers(app,clock).find(item=>String(item.id)===String(customerId));
  if(!customer) return {success:false,skipped:true,message:'Este cliente não está na lista de aniversariantes de hoje.'};
  const history=birthdayHistory(app);
  const previous=findBirthdayHistoryEntry(history,clock.date,customer.id);
  if(previous?.status==='enviado') return {success:false,skipped:true,message:'Este aniversariante já recebeu a mensagem hoje.'};
  const phone=birthdayPhone(customer);
  if(!phone) return {success:false,skipped:true,message:'Corrija o telefone/celular deste cliente antes de reenviar.'};
  if(isAutomationSuppressed(app,phone)) return {success:false,skipped:true,message:'Este contato pediu para não receber mensagens automáticas.'};
  if(findBirthdaySentByPhone(history,clock.date,phone)) return {success:false,skipped:true,message:'Este número já recebeu uma mensagem de aniversário hoje.'};
  birthdayRuntime.running=true;
  try{
    const message=renderBirthdayMessage(config.mensagemAniversario,customer);
    const {digits,chatId}=await resolveChatId(phone);
    const sentMessage=await waState.client.sendMessage(chatId,message);
    const entry=upsertBirthdayHistory(app,{date:clock.date,customer,phone:digits,status:'enviado',message,source:'manual_reenvio'});
    const result={success:true,date:clock.date,customerId:customer.id,customerName:customer.name||'Cliente',phone:digits,attempts:entry.attempts||1};
    birthdayRuntime.lastRunAt=now(); birthdayRuntime.lastRunResult={source:'manual_reenvio',sent:1,customerId:customer.id};
    addLog(app,'aniversario_reenvio_manual',`Mensagem de aniversário reenviada manualmente para ${customer.name||digits}.`,{customerId:customer.id,telefone:digits,attempts:entry.attempts||1,whatsappMessageId:sentMessage?.id?._serialized||null});
    return result;
  }catch(error){
    const message=renderBirthdayMessage(config.mensagemAniversario,customer);
    const entry=upsertBirthdayHistory(app,{date:clock.date,customer,phone,status:'erro',error:error.message,message,source:'manual_reenvio'});
    addLog(app,'aniversario_reenvio_manual_erro',`Falha no reenvio manual de aniversário para ${customer.name||phone}.`,{customerId:customer.id,telefone:phone,attempts:entry.attempts||1,erro:error.message});
    return {success:false,message:error.message||'Falha ao reenviar a mensagem.',customerId:customer.id,attempts:entry.attempts||1};
  }finally{
    birthdayRuntime.running=false;
  }
}

async function processBirthdayRun(app,{source='automatico',force=false}={}){
  if(birthdayRuntime.running) return {success:false,skipped:true,message:'Já existe uma rotina de aniversariantes em execução.'};
  const data=loadAll(app),config=data.config,clock=birthdayClock();
  if(!force && !config.aniversariantesAtivo) return {success:false,skipped:true,message:'Automação de aniversariantes está desativada.'};
  if(!waState.client || waState.status!=='conectado') return {success:false,skipped:true,message:'WhatsApp desconectado.'};
  birthdayRuntime.running=true;
  const result={date:clock.date,total:0,sent:0,alreadySent:0,noPhone:0,optedOut:0,errors:0,limited:false,source};
  try{
    const customers=getBirthdayCustomers(app,clock);
    const limit=safeNumber(config.limiteDiario,40,1,1000);
    result.total=customers.length;
    let processed=0;
    for(const customer of customers){
      const history=birthdayHistory(app);
      const previous=findBirthdayHistoryEntry(history,clock.date,customer.id);
      if(previous?.status==='enviado'){ result.alreadySent++; continue; }
      if(source==='automatico' && previous?.status==='erro' && Number(previous.attempts||0)>=3){ result.errors++; continue; }
      const phone=birthdayPhone(customer);
      if(!phone){ result.noPhone++; continue; }
      if(isAutomationSuppressed(app,phone)){ result.optedOut++; continue; }
      if(findBirthdaySentByPhone(history,clock.date,phone)){ result.alreadySent++; continue; }
      if(processed>=limit){ result.limited=true; break; }
      processed++;
      const message=renderBirthdayMessage(config.mensagemAniversario,customer);
      try{
        const {digits,chatId}=await resolveChatId(phone);
        const sentMessage=await waState.client.sendMessage(chatId,message);
        upsertBirthdayHistory(app,{date:clock.date,customer,phone:digits,status:'enviado',message,source});
        addLog(app,'aniversario_enviado',`Mensagem de aniversário enviada para ${customer.name||digits}.`,{customerId:customer.id,telefone:digits,source,whatsappMessageId:sentMessage?.id?._serialized||null});
        result.sent++;
      }catch(error){
        upsertBirthdayHistory(app,{date:clock.date,customer,phone,status:'erro',error:error.message,message,source});
        addLog(app,'aniversario_erro',`Falha ao enviar aniversário para ${customer.name||phone}.`,{customerId:customer.id,telefone:phone,source,erro:error.message});
        result.errors++;
      }
      if(processed<customers.length){ const delay=randomBirthdayDelay(config); if(delay>0) await sleep(delay); }
    }
    birthdayRuntime.lastRunAt=now(); birthdayRuntime.lastRunResult=result;
    addLog(app,'aniversario_rotina_concluida','Rotina de aniversariantes concluída.',result);
    return {success:true,...result};
  } finally { birthdayRuntime.running=false; }
}
function shouldRunBirthdayNow(config,clock){
  if(!config.aniversariantesAtivo) return false;
  const value=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(config.horarioAniversario||''))?String(config.horarioAniversario):'08:00';
  return clock.time>=value;
}
async function automaticBirthdayTick(app){
  try{
    const config=loadAll(app).config,clock=birthdayClock();
    if(!shouldRunBirthdayNow(config,clock) || birthdayRuntime.running) return;
    if(Date.now()-birthdayRuntime.lastAutomaticAttemptAt<5*60*1000) return;
    birthdayRuntime.lastAutomaticAttemptAt=Date.now();
    const dashboard=getBirthdayDashboard(app,config);
    if(!dashboard.pending) return;
    if(!waState.client || waState.status!=='conectado'){
      if(birthdayRuntime.lastDisconnectedDate!==clock.date){
        birthdayRuntime.lastDisconnectedDate=clock.date;
        addLog(app,'aniversario_aguardando_whatsapp','Há aniversariantes pendentes, mas o WhatsApp está desconectado.',{date:clock.date,pending:dashboard.pending});
      }
      return;
    }
    await processBirthdayRun(app,{source:'automatico'});
  }catch(error){ addLog(app,'aniversario_monitor_erro','Falha no monitor automático de aniversariantes.',{erro:error.message}); }
}
function armBirthdayMonitor(app){
  if(birthdayRuntime.timer) return;
  birthdayRuntime.timer=setInterval(()=>automaticBirthdayTick(app),30000);
  birthdayRuntime.timer.unref?.();
  setTimeout(()=>automaticBirthdayTick(app),5000).unref?.();
}
function clearBirthdayMonitor(){
  if(birthdayRuntime.timer) clearInterval(birthdayRuntime.timer);
  birthdayRuntime.timer=null;
}


function scheduledMessagesDir(app){
  return path.join(uploadsDir(app), 'agendados');
}
function scheduledMessagesData(app){
  const data=readJson(app,'mensagens_agendadas.json',{version:1,items:[]});
  data.version=1;
  data.items=Array.isArray(data.items)?data.items:[];
  return data;
}
function saveScheduledMessagesData(app,data){
  const items=(Array.isArray(data?.items)?data.items:[]).slice(-3000);
  writeJson(app,'mensagens_agendadas.json',{version:1,items});
}
function scheduledPublicItem(item={}){
  return {
    id:safeText(item.id,100),
    conversationId:safeConversationId(item.conversationId),
    conversationName:safeText(item.conversationName,160),
    type:['image','audio','video'].includes(item.type)?item.type:'text',
    text:safeText(item.text,4000),
    fileName:safeText(item.fileName,180),
    mime:safeText(item.mime,120),
    scheduledAt:item.scheduledAt||null,
    status:safeText(item.status||'pendente',30),
    attempts:Number(item.attempts||0),
    lastError:safeText(item.lastError||'',500),
    lastAttemptAt:item.lastAttemptAt||null,
    nextAttemptAt:item.nextAttemptAt||null,
    createdAt:item.createdAt||null,
    sentAt:item.sentAt||null,
    cancelledAt:item.cancelledAt||null,
    deliveryMode:safeText(item.deliveryMode||'',40)
  };
}
function listScheduledMessages(app,conversationId=''){
  const cleanId=safeConversationId(conversationId);
  const items=scheduledMessagesData(app).items
    .filter(item=>!cleanId || safeConversationId(item.conversationId)===cleanId)
    .sort((a,b)=>Date.parse(a.scheduledAt||0)-Date.parse(b.scheduledAt||0));
  const active=items.filter(item=>['pendente','erro'].includes(item.status));
  const recent=items.filter(item=>!['pendente','erro'].includes(item.status)).slice(-8);
  return [...active,...recent].slice(-30).map(scheduledPublicItem);
}
function listScheduledOverview(app,limit=10){
  const priority={pendente:0,erro:1,enviado:2,cancelado:3};
  return scheduledMessagesData(app).items
    .filter(item=>['pendente','erro'].includes(item.status))
    .sort((a,b)=>{
      const pa=priority[a.status]??9,pb=priority[b.status]??9;
      if(pa!==pb) return pa-pb;
      return Date.parse(a.nextAttemptAt||a.scheduledAt||0)-Date.parse(b.nextAttemptAt||b.scheduledAt||0);
    })
    .slice(0,Math.max(1,Number(limit)||10))
    .map(scheduledPublicItem);
}
function deleteScheduledMessage(app,id){
  const data=scheduledMessagesData(app);
  const index=data.items.findIndex(row=>row.id===id);
  if(index<0) throw new Error('Agendamento não encontrado.');
  const [item]=data.items.splice(index,1);
  removeScheduledFile(app,item);
  saveScheduledMessagesData(app,data);
  refreshScheduledMessageWakeup(app);
  return item;
}
function clearScheduledMessages(app,{conversationId='',mode='history'}={}){
  const cleanId=safeConversationId(conversationId);
  const data=scheduledMessagesData(app);
  const removed=[],kept=[];
  data.items.forEach(item=>{
    const sameConversation=!cleanId || safeConversationId(item.conversationId)===cleanId;
    const removeByMode=mode==='all'
      ? sameConversation
      : sameConversation && !['pendente'].includes(item.status);
    if(removeByMode){ removed.push(item); removeScheduledFile(app,item); }
    else kept.push(item);
  });
  data.items=kept;
  saveScheduledMessagesData(app,data);
  refreshScheduledMessageWakeup(app);
  return removed;
}
function removeScheduledFile(app,item={}){
  const relative=safeText(item.filePath||'',600);
  if(!relative) return;
  try{
    const absolute=localMediaPath(app,relative);
    if(absolute && fs.existsSync(absolute)) fs.unlinkSync(absolute);
  }catch{}
}
function normalizeScheduledAt(value){
  const parsed=Date.parse(String(value||''));
  if(!Number.isFinite(parsed)) throw new Error('Informe uma data e horário válidos.');
  const current=Date.now();
  // O input datetime-local trabalha por minuto. Se o usuário mantiver o minuto atual,
  // agenda alguns segundos à frente em vez de rejeitar como horário passado.
  const normalized = parsed < current && parsed >= current-60000 ? current+3000 : parsed;
  if(normalized<current-60000) throw new Error('Escolha o horário atual ou um horário futuro para o agendamento.');
  const max=Date.now()+(366*24*60*60*1000);
  if(parsed>max) throw new Error('O agendamento pode ser feito com até 1 ano de antecedência.');
  return new Date(normalized).toISOString();
}
async function sendWhatsAppReliable(chatId,content,options={}){
  if(!waState.client || waState.status!=='conectado') throw new Error('WhatsApp desconectado no momento do envio.');
  const errors=[];
  try{ return await waState.client.sendMessage(chatId,content,options); }
  catch(error){ errors.push(error?.message||String(error)); }
  try{
    const chat=await waState.client.getChatById(chatId);
    if(chat?.sendMessage) return await chat.sendMessage(content,options);
  }catch(error){ errors.push(error?.message||String(error)); }
  if(String(chatId||'').endsWith('@c.us')){
    try{
      const number=String(chatId).replace(/@c\.us$/,'');
      const fresh=await waState.client.getNumberId(number);
      const freshId=fresh?._serialized || fresh?.id?._serialized || fresh?.toString?.();
      if(freshId && freshId!==chatId) return await waState.client.sendMessage(freshId,content,options);
    }catch(error){ errors.push(error?.message||String(error)); }
  }
  throw new Error('Falha no envio automático pelo WhatsApp: '+safeText(errors.filter(Boolean).join(' | ')||'erro não identificado',420));
}

function resolveFfmpegBinary(){
  const explicit=safeText(process.env.FFMPEG_PATH||'',500);
  if(explicit) return explicit;
  try{
    const bundled=require('ffmpeg-static');
    if(bundled) return bundled;
  }catch{}
  return process.platform==='win32'?'ffmpeg.exe':'ffmpeg';
}
async function ensureScheduledVoiceAudio(app,item,absolute){
  if(item.type!=='audio') return {absolute,item};

  // Perfil de compatibilidade para PTT/voice note do WhatsApp mobile.
  // O navegador grava em WebM/Opus, mas enviar esse arquivo diretamente (ou um OGG
  // com bitrate/perfis genéricos) pode tocar no WhatsApp Web e ficar indisponível
  // no celular. Normalizamos SEMPRE para um OGG/Opus mono, 48 kHz, ~18 kbps,
  // frames de 20 ms e timestamps iniciando em zero antes do envio.
  const source=absolute;
  const base=absolute.replace(/\.[^.\\/]+$/,'');
  const output=base.endsWith('.ptt') ? `${base}.ogg` : `${base}.ptt.ogg`;
  const ffmpeg=resolveFfmpegBinary();

  // Se já for um arquivo gerado por este perfil, apenas valida se ele continua legível.
  const alreadyPrepared=path.basename(source).toLowerCase().endsWith('.ptt.ogg');
  if(alreadyPrepared){
    try{
      await execFileAsync(ffmpeg,[
        '-v','error','-i',source,'-map','0:a:0','-t','0.25','-f','null','-'
      ],{windowsHide:true,timeout:15000,maxBuffer:1024*1024});
      item.filePath=`/public/uploads/automacao_whatsapp/agendados/${path.basename(source)}`;
      item.fileName=String(item.fileName||path.basename(source)).replace(/\.[^.]+$/, '')+'.ogg';
      item.mime='audio/ogg; codecs=opus';
      item.size=fs.statSync(source).size;
      item.updatedAt=now();
      return {absolute:source,item};
    }catch{}
  }

  try{
    await execFileAsync(ffmpeg,[
      '-y','-hide_banner','-loglevel','error',
      '-i',source,
      '-map','0:a:0','-vn',
      '-af','aresample=48000:async=1:first_pts=0',
      '-ac','1','-ar','48000',
      '-c:a','libopus',
      '-application','voip',
      '-frame_duration','20',
      '-b:a','18k',
      '-vbr','on',
      '-compression_level','10',
      '-avoid_negative_ts','make_zero',
      '-fflags','+genpts',
      output
    ],{windowsHide:true,timeout:45000,maxBuffer:2*1024*1024});

    if(!fs.existsSync(output)||fs.statSync(output).size<250){
      throw new Error('A conversão gerou um arquivo vazio ou incompleto.');
    }

    // Faz o próprio FFmpeg decodificar o começo do arquivo. Assim não enviamos um
    // OGG que o desktop tolera, mas que esteja estruturalmente inválido para o celular.
    await execFileAsync(ffmpeg,[
      '-v','error','-i',output,'-map','0:a:0','-t','0.25','-f','null','-'
    ],{windowsHide:true,timeout:15000,maxBuffer:1024*1024});
  }catch(error){
    const detail=safeText(error?.stderr||error?.message||String(error),420);
    try{ if(fs.existsSync(output)) fs.unlinkSync(output); }catch{}
    throw new Error('Não foi possível preparar o áudio em formato compatível com mensagem de voz no celular (OGG/Opus). '+detail);
  }

  // Mantemos o original até o OGG compatível estar pronto. Depois ele não é mais
  // necessário para o agendamento/reenvio.
  try{ if(source!==output && fs.existsSync(source)) fs.unlinkSync(source); }catch{}
  item.filePath=`/public/uploads/automacao_whatsapp/agendados/${path.basename(output)}`;
  item.fileName=String(item.fileName||path.basename(output)).replace(/\.[^.]+$/, '')+'.ogg';
  item.mime='audio/ogg; codecs=opus';
  item.size=fs.statSync(output).size;
  item.audioProfile='whatsapp-ptt-mobile-v1';
  item.updatedAt=now();
  return {absolute:output,item};
}

function scheduledMediaFromDisk(app,item,absolute){
  const buffer=fs.readFileSync(absolute);
  const mime=safeText(String(item.mime||''),160) || (item.type==='audio'?'audio/ogg; codecs=opus':'image/jpeg');
  const filename=safeText(item.fileName||path.basename(absolute),180) || path.basename(absolute);
  // O envio manual do Inbox já usa MessageMedia em memória. Repetimos o mesmo caminho
  // aqui porque a leitura via fromFilePath tem apresentado falhas de mídia em algumas
  // versões recentes do WhatsApp Web/whatsapp-web.js.
  return new MessageMedia(mime,buffer.toString('base64'),filename);
}
async function sendScheduledMessage(app,item){
  const inboxData=getInboxData(app);
  const conversation=inboxData.conversations.find(row=>row.id===safeConversationId(item.conversationId));
  if(!conversation) throw new Error('A conversa agendada não existe mais no Inbox.');
  const destination=await resolveInboxDestination(conversation);
  if(destination.digits && isAutomationSuppressed(app,destination.digits)) throw new Error('Este contato pediu para não receber mensagens automáticas.');
  if(item.type==='image' || item.type==='audio' || item.type==='video'){
    let absolute=localMediaPath(app,item.filePath||'');
    if(!absolute || !fs.existsSync(absolute)) throw new Error(item.type==='audio'?'O áudio agendado não foi encontrado no armazenamento.':item.type==='video'?'O vídeo agendado não foi encontrado no armazenamento.':'A imagem agendada não foi encontrada no armazenamento.');
    if(item.type==='audio'){
      const prepared=await ensureScheduledVoiceAudio(app,item,absolute);
      absolute=prepared.absolute;
      const scheduled=scheduledMessagesData(app);
      const stored=scheduled.items.find(row=>row.id===item.id);
      if(stored){Object.assign(stored,prepared.item);saveScheduledMessagesData(app,scheduled);}
    }
    const media=scheduledMediaFromDisk(app,item,absolute);
    let sent,deliveryMode='media';
    if(item.type==='audio'){
      const failures=[];
      try{
        sent=await sendWhatsAppReliable(destination.chatId,media,{sendAudioAsVoice:true});
        deliveryMode='voice';
      }catch(voiceError){
        failures.push(voiceError?.message||String(voiceError));
        addLog(app,'inbox_agendamento_audio_fallback','Envio como voz falhou; tentando como áudio comum.',{agendamentoId:item.id,erro:voiceError?.message||String(voiceError)});
        try{
          sent=await sendWhatsAppReliable(destination.chatId,media,{});
          deliveryMode='audio';
        }catch(audioError){
          failures.push(audioError?.message||String(audioError));
          // Não transforma áudio em documento: isso foge do comportamento esperado do Inbox.
          // Mantemos como erro para nova tentativa, preservando o arquivo para o usuário tentar novamente.
          throw new Error('Falha ao enviar o áudio como mensagem de voz: '+safeText(failures.filter(Boolean).join(' | '),420));
        }
      }
      if(item.text){ await sleep(1500); await sendWhatsAppReliable(destination.chatId,item.text); }
    }else{
      sent=await sendWhatsAppReliable(destination.chatId,media,{caption:item.text||undefined});
    }
    return {sent,conversation,destination,deliveryMode};
  }
  if(!safeText(item.text,4000)) throw new Error('A mensagem agendada está vazia.');
  const sent=await sendWhatsAppReliable(destination.chatId,item.text);
  return {sent,conversation,destination,deliveryMode:'text'};
}

function clearScheduledMessageWakeup(){
  if(scheduledMessageRuntime.wakeup) clearTimeout(scheduledMessageRuntime.wakeup);
  scheduledMessageRuntime.wakeup=null;
  scheduledMessageRuntime.wakeAt=0;
}
function refreshScheduledMessageWakeup(app){
  clearScheduledMessageWakeup();
  const current=Date.now();
  const candidates=scheduledMessagesData(app).items.filter(item=>item.status==='pendente').map(item=>{
    const due=Date.parse(item.nextAttemptAt||item.scheduledAt||'');
    return Number.isFinite(due)?due:null;
  }).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!candidates.length) return;
  const target=candidates[0];
  scheduledMessageRuntime.wakeAt=target;
  const delay=Math.max(100,Math.min(target-current+250,2140000000));
  scheduledMessageRuntime.wakeup=setTimeout(()=>{
    scheduledMessageRuntime.wakeup=null;
    scheduledMessageRuntime.wakeAt=0;
    processScheduledMessages(app).catch(error=>{
      addLog(app,'inbox_agendamento_wakeup_erro','Falha ao processar o horário exato de uma mensagem agendada.',{erro:error?.message||String(error)});
    });
  },delay);
  scheduledMessageRuntime.wakeup.unref?.();
}

async function processScheduledMessages(app){
  if(scheduledMessageRuntime.running) return;
  scheduledMessageRuntime.lastTickAt=now();
  if(!waState.client || waState.status!=='conectado') return;
  const snapshot=scheduledMessagesData(app);
  const current=Date.now();
  const due=snapshot.items.filter(item=>{
    if(item.status!=='pendente') return false;
    const when=Date.parse(item.scheduledAt||'');
    const retryAt=Date.parse(item.nextAttemptAt||'')||0;
    return Number.isFinite(when) && when<=current && (!retryAt || retryAt<=current);
  }).sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt)).slice(0,12).map(item=>item.id);
  if(!due.length) return;
  scheduledMessageRuntime.running=true;
  try{
    for(const id of due){
      // Recarrega antes de cada item para não sobrescrever um novo agendamento criado
      // enquanto outro envio estava aguardando resposta do WhatsApp.
      let data=scheduledMessagesData(app);
      let item=data.items.find(row=>row.id===id);
      if(!item || item.status!=='pendente') continue;
      const when=Date.parse(item.scheduledAt||'');
      const retryAt=Date.parse(item.nextAttemptAt||'')||0;
      if(!Number.isFinite(when) || when>Date.now() || (retryAt && retryAt>Date.now())) continue;
      const scheduledConversation=getInboxData(app).conversations.find(row=>row.id===safeConversationId(item.conversationId));
      if(scheduledConversation && !isGroupConversation(scheduledConversation) && isAutomationSuppressed(app,scheduledConversation.phone)){
        item.status='cancelado'; item.cancelledAt=now(); item.updatedAt=now(); item.nextAttemptAt=null;
        item.lastError='Cancelado automaticamente: o contato pediu para não receber mensagens automáticas.';
        removeScheduledFile(app,item);
        saveScheduledMessagesData(app,data);
        addLog(app,'inbox_agendamento_opt_out','Agendamento cancelado porque o contato pediu para não receber mensagens automáticas.',{agendamentoId:item.id,conversa:item.conversationId});
        continue;
      }
      item.lastAttemptAt=now();
      item.attempts=Number(item.attempts||0)+1;
      item.updatedAt=now();
      saveScheduledMessagesData(app,data);
      const sendingItem={...item};
      try{
        const result=await sendScheduledMessage(app,sendingItem);
        data=scheduledMessagesData(app);
        item=data.items.find(row=>row.id===id);
        if(!item) continue;
        item.status='enviado';
        item.sentAt=now();
        item.updatedAt=now();
        item.lastError='';
        item.deliveryMode=safeText(result.deliveryMode||'',40);
        item.nextAttemptAt=null;
        addLog(app,'inbox_agendamento_enviado','Mensagem agendada enviada pelo Inbox.',{
          agendamentoId:item.id,conversa:item.conversationId,nome:item.conversationName||result.conversation?.name||'',tipo:item.type,
          horario:item.scheduledAt,whatsappMessageId:result.sent?.id?._serialized||null
        });
        if(item.type==='image' || item.type==='audio' || item.type==='video') removeScheduledFile(app,item);
        saveScheduledMessagesData(app,data);
      }catch(error){
        data=scheduledMessagesData(app);
        item=data.items.find(row=>row.id===id);
        if(!item) continue;
        item.lastError=safeText(error?.message||String(error),500);
        item.updatedAt=now();
        if(Number(item.attempts||0)>=3){
          item.status='erro';
          item.nextAttemptAt=null;
        }else{
          item.status='pendente';
          item.nextAttemptAt=new Date(Date.now()+2*60*1000).toISOString();
        }
        addLog(app,'inbox_agendamento_erro','Falha ao enviar mensagem agendada pelo Inbox.',{
          agendamentoId:item.id,conversa:item.conversationId,tentativa:item.attempts,erro:item.lastError
        });
        saveScheduledMessagesData(app,data);
      }
      await sleep(SCHEDULED_QUEUE_GAP_MS);
    }
  }finally{
    scheduledMessageRuntime.running=false;
    refreshScheduledMessageWakeup(app);
  }
}
function armScheduledMessageMonitor(app){
  if(scheduledMessageRuntime.timer) return;
  scheduledMessageRuntime.timer=setInterval(()=>processScheduledMessages(app).catch(error=>{
    addLog(app,'inbox_agendamento_monitor_erro','Falha no monitor de mensagens agendadas.',{erro:error?.message||String(error)});
  }),5000);
  scheduledMessageRuntime.timer.unref?.();
  refreshScheduledMessageWakeup(app);
  setTimeout(()=>processScheduledMessages(app).catch(()=>{}),1000).unref?.();
}
function clearScheduledMessageMonitor(){
  if(scheduledMessageRuntime.timer) clearInterval(scheduledMessageRuntime.timer);
  scheduledMessageRuntime.timer=null;
  clearScheduledMessageWakeup();
}
function localMediaPath(app, caminho){
  const clean = String(caminho || '').split('?')[0];
  if(clean.startsWith('/public/')) return path.join(P(app).PUBLIC_DIR, clean.replace(/^\/public\//, ''));
  if(path.isAbsolute(clean)) return clean;
  return path.join(P(app).PUBLIC_DIR, clean.replace(/^\/+/, ''));
}
async function sendMediaFromPath(app, chatId, caminho, caption='', options={}){
  const absolute = localMediaPath(app, caminho);
  if(!fs.existsSync(absolute)) throw new Error('Arquivo não encontrado: ' + caminho);
  const media = MessageMedia.fromFilePath(absolute);
  return waState.client.sendMessage(chatId, media, { caption: caption || undefined, ...options });
}
function optionsAsText(step){
  const lines = [step.texto || 'Escolha uma opção:'];
  for(const option of step.opcoes || []) lines.push(option.label || option.resposta || 'Opção');
  return lines.filter(Boolean).join('\n');
}

function flowSessionKey(chatId){ return safeText(chatId,180); }
function loadFlowSessions(app){
  const list=readJson(app,'flow_sessions.json',[]);
  const cutoff=Date.now()-(24*60*60*1000);
  return (Array.isArray(list)?list:[]).filter(item=>{
    const ts=Date.parse(item?.updatedAt||item?.createdAt||'');
    return item?.chatId && Number.isFinite(ts) && ts>=cutoff;
  });
}
function persistFlowSessions(app){
  const list=Array.from(waState.flowWaits.values()).map(item=>({...item,options:(item.options||[]).slice(0,10)}));
  writeJson(app,'flow_sessions.json',list.slice(-300));
}
function hydrateFlowSessions(app){
  if(waState.flowWaits.size) return;
  for(const item of loadFlowSessions(app)) waState.flowWaits.set(flowSessionKey(item.chatId),item);
}
function setPendingFlow(app, chatId, bloco, step){
  hydrateFlowSessions(app);
  const nonce=makeId('menu');
  const options=(step.opcoes||[]).map((option,index)=>({
    id:`qwflow:${nonce}:${index}`,
    label:safeText(option.label||`Opção ${index+1}`,100),
    resposta:safeText(option.resposta||String(index+1),30),
    acaoTipo:safeText(option.acaoTipo || (option.proximoBloco ? 'bloco' : 'encerrar'),30),
    texto:safeText(option.texto,4000),
    caminho:safeText(option.caminho,600),
    mediaId:safeText(option.mediaId,120),
    legenda:safeText(option.legenda,1500),
    proximoBloco:safeText(option.proximoBloco,120)
  })).filter(option=>option.label);
  const createdAt=now();
  const timeoutMinutes=safeNumber(step.tempoLimiteMinutos,30,0,10080);
  const expiresAt=timeoutMinutes>0 ? new Date(Date.now()+(timeoutMinutes*60*1000)).toISOString() : null;
  const session={
    chatId:flowSessionKey(chatId),blocoId:bloco.id,etapaId:step.id||null,nonce,options,
    mensagemInvalida:safeText(step.mensagemInvalida,2000),
    tempoLimiteMinutos:timeoutMinutes,
    mensagemExpirada:Object.prototype.hasOwnProperty.call(step,'mensagemExpirada') ? safeText(step.mensagemExpirada,2000) : 'Este atendimento foi encerrado automaticamente por falta de resposta. Quando precisar, é só chamar novamente.',
    encerrarAoExpirar:step.encerrarAoExpirar!==false,
    createdAt,updatedAt:createdAt,expiresAt
  };
  waState.flowWaits.set(session.chatId,session);
  persistFlowSessions(app);
  return session;
}
function clearPendingFlow(app, chatId){
  hydrateFlowSessions(app);
  waState.flowWaits.delete(flowSessionKey(chatId));
  persistFlowSessions(app);
}

function findInboxConversationByChatId(app, chatId){
  const target=flowSessionKey(chatId);
  if(!target) return null;
  try{
    const inbox=getInboxData(app);
    const conversations=Array.isArray(inbox?.conversations) ? inbox.conversations : [];
    const targetDigits=String(target).replace(/\D/g,'');
    return conversations.find(item=>String(item?.whatsappId||'')===target)
      || conversations.find(item=>targetDigits && String(item?.phone||'').replace(/\D/g,'')===targetDigits)
      || null;
  }catch{return null;}
}
async function expirePendingFlow(app, session){
  if(!session?.chatId) return false;
  const key=flowSessionKey(session.chatId);
  const current=waState.flowWaits.get(key);
  if(!current || current.nonce!==session.nonce) return false;
  const message=safeText(session.mensagemExpirada,2000);
  if(message && waState.client && waState.status==='conectado'){
    try{ await waState.client.sendMessage(key,message); }
    catch(error){ addLog(app,'bloco_menu_timeout_mensagem_erro','Não foi possível enviar a mensagem de encerramento por tempo limite.',{chatId:key,erro:error?.message||String(error)}); }
  }
  if(session.encerrarAoExpirar!==false){
    const conversation=findInboxConversationByChatId(app,key);
    if(conversation?.id){
      try{ updateConversationAttendance(app,conversation.id,{action:'close',reason:'completed',actor:'automacao_timeout'}); }
      catch(error){ addLog(app,'bloco_menu_timeout_encerramento_erro','Não foi possível encerrar automaticamente o atendimento após o tempo limite.',{chatId:key,conversa:conversation.id,erro:error?.message||String(error)}); }
    }
  }
  waState.flowWaits.delete(key);
  persistFlowSessions(app);
  addLog(app,'bloco_menu_timeout','Fluxo encerrado automaticamente por falta de resposta.',{chatId:key,blocoId:session.blocoId||null,etapaId:session.etapaId||null,tempoLimiteMinutos:session.tempoLimiteMinutos||0,encerrarAtendimento:session.encerrarAoExpirar!==false});
  return true;
}
async function sweepPendingFlowTimeouts(app){
  hydrateFlowSessions(app);
  const due=Array.from(waState.flowWaits.values()).filter(session=>{
    const ts=Date.parse(session?.expiresAt||'');
    return Number.isFinite(ts) && ts<=Date.now();
  });
  for(const session of due) await expirePendingFlow(app,session);
}
function armFlowTimeoutMonitor(app){
  if(waState.flowTimeoutTimer) return;
  sweepPendingFlowTimeouts(app).catch(()=>{});
  waState.flowTimeoutTimer=setInterval(()=>{ sweepPendingFlowTimeouts(app).catch(()=>{}); },15000);
  if(typeof waState.flowTimeoutTimer.unref==='function') waState.flowTimeoutTimer.unref();
}
function clearFlowTimeoutMonitor(){
  if(waState.flowTimeoutTimer){ clearInterval(waState.flowTimeoutTimer); waState.flowTimeoutTimer=null; }
}
function extractSelectedRowId(message){
  const raw=message?.rawData||{};
  return safeText(
    message?.selectedRowId ||
    raw?.selectedRowId ||
    raw?.listResponse?.singleSelectReply?.selectedRowId ||
    raw?.listResponse?.singleSelectReply?.rowId ||
    raw?.singleSelectReply?.selectedRowId ||
    raw?.singleSelectReply?.rowId ||
    '',180
  );
}
function findFlowOption(session,message){
  if(!session) return null;
  const selectedId=extractSelectedRowId(message);
  if(selectedId){
    const byId=(session.options||[]).find(option=>option.id===selectedId);
    if(byId) return byId;
  }
  const body=safeText(message?.body||'',160).toLowerCase();
  if(!body) return null;
  return (session.options||[]).find((option,index)=>{
    const values=[option.resposta,option.label,String(index+1)].map(v=>safeText(v,160).toLowerCase()).filter(Boolean);
    return values.includes(body);
  })||null;
}
function findBlockByReference(app, reference){
  const ref=safeText(reference,120);
  if(!ref) return null;
  const data=loadAll(app);
  const needle=ref.toLowerCase();
  return data.blocos.find(b=>b.id===ref) || data.blocos.find(b=>String(b.nome||'').trim().toLowerCase()===needle) || null;
}
async function executeFlowOption(app, chatId, option, session){
  const kind=safeText(option?.acaoTipo || (option?.proximoBloco ? 'bloco' : 'encerrar'),30);
  addLog(app,'bloco_menu_escolha','Cliente escolheu uma opção do fluxo.',{
    chatId,blocoId:session?.blocoId||null,etapaId:session?.etapaId||null,opcao:option?.label||null,acao:kind,proximoBloco:option?.proximoBloco||null
  });
  if(kind==='texto'){
    if(option.texto) await waState.client.sendMessage(chatId,option.texto);
    return true;
  }
  if(['audio','imagem','video','arquivo'].includes(kind)){
    if(!option.caminho){
      await waState.client.sendMessage(chatId,'Essa opção está temporariamente indisponível. Um atendente poderá continuar por aqui.');
      return true;
    }
    if(kind==='audio'){
      await sendMediaFromPath(app,chatId,option.caminho,'',{sendAudioAsVoice:true});
      if(option.legenda) await waState.client.sendMessage(chatId,option.legenda);
    }else{
      await sendMediaFromPath(app,chatId,option.caminho,option.legenda||'');
    }
    return true;
  }
  if(kind==='bloco'){
    const nextBlock=findBlockByReference(app,option.proximoBloco);
    if(!nextBlock || !nextBlock.ativo){
      await waState.client.sendMessage(chatId,'Essa opção está temporariamente indisponível. Um atendente poderá continuar por aqui.');
      addLog(app,'bloco_menu_destino_invalido','Opção aponta para bloco inexistente ou inativo.',{chatId,referencia:option.proximoBloco});
      return true;
    }
    executeBlockToChat(app,{digits:'',chatId,label:chatId},nextBlock).catch(error=>{
      addLog(app,'bloco_menu_fluxo_erro','Falha ao continuar fluxo após escolha do cliente.',{chatId,blocoId:nextBlock.id,erro:error?.message||String(error)});
    });
    return true;
  }
  return true;
}

async function sendInteractiveOptions(app, chatId, bloco, step){
  const session=setPendingFlow(app,chatId,bloco,step);
  const title=step.texto||'Escolha uma opção:';
  const fallback=optionsAsText({...step,opcoes:session.options.map((option,index)=>({...option,label:`${index+1}. ${option.label}`}))});
  await waState.client.sendMessage(chatId,fallback);
  addLog(app,'bloco_menu_aguardando_canal_interativo','Menu enviado em modo compatível. As ramificações estão prontas para um canal com botões/listas interativas.',{
    blocoId:bloco.id,etapaId:step.id||null,opcoes:session.options.length
  });
  return { preview:{type:'text',text:String(fallback)}, waitingChoice:true, deliveryMode:'numbered_text', title };
}

async function handlePendingFlowSelection(app,message){
  if(!message || message.fromMe) return false;
  const chatId=flowSessionKey(message.from||message.author||'');
  if(!chatId || chatId.endsWith('@g.us')) return false;
  hydrateFlowSessions(app);
  const session=waState.flowWaits.get(chatId);
  if(!session) return false;
  const expiresTs=Date.parse(session.expiresAt||'');
  if(Number.isFinite(expiresTs) && expiresTs<=Date.now()){
    await expirePendingFlow(app,session);
    return true;
  }
  const option=findFlowOption(session,message);
  if(!option){
    session.updatedAt=now();
    waState.flowWaits.set(chatId,session);
    persistFlowSessions(app);
    const invalidMessage=safeText(session.mensagemInvalida,2000);
    if(invalidMessage){
      await waState.client.sendMessage(chatId,invalidMessage);
      addLog(app,'bloco_menu_resposta_invalida','Cliente enviou uma resposta que não corresponde às opções do fluxo.',{
        chatId,blocoId:session.blocoId||null,etapaId:session.etapaId||null,resposta:safeText(message?.body||'',180)
      });
    }
    return true;
  }
  clearPendingFlow(app,chatId);
  await executeFlowOption(app,chatId,option,session);
  return true;
}

async function runBlockToChat(app, destination, bloco){
  const { digits='', chatId, label='' } = destination;
  const startedAt = Date.now();
  const totalSteps = Array.isArray(bloco?.etapas) ? bloco.etapas.length : 0;
  const summary = { total:totalSteps, success:0, failed:0, failures:[], sentMessages:[], waitingChoice:false };

  waState.blockRunning = true;
  addLog(app, 'bloco_envio_inicio', `Início do bloco: ${bloco.nome}`, {
    blocoId: bloco.id,
    numero: digits || null,
    destino: label || chatId,
    etapas: totalSteps
  });

  try {
    for(let index = 0; index < totalSteps; index += 1){
      const step = bloco.etapas[index] || {};
      const stepNumber = index + 1;
      const stepType = safeText(step.tipo || 'desconhecido', 30);
      const stepStartedAt = Date.now();

      addLog(app, 'bloco_etapa_inicio', `Executando etapa ${stepNumber}/${totalSteps}: ${stepType}`, {
        blocoId: bloco.id,
        numero: digits || null,
        destino: label || chatId,
        etapaId: step.id || null,
        etapa: stepNumber,
        totalEtapas: totalSteps,
        tipo: stepType
      });

      try {
        let sentPreview=null;
        if(stepType === 'texto'){
          const seconds = safeNumber(step.digitandoSegundos, 0, 0, 180);
          if(seconds > 0) await sleep(seconds * 1000);
          if(step.texto){
            await waState.client.sendMessage(chatId, step.texto);
            sentPreview={ type:'text', text:String(step.texto) };
          }
        } else if(stepType === 'pausa'){
          await sleep(safeNumber(step.segundos, 0, 0, 600) * 1000);
        } else if(stepType === 'imagem' || stepType === 'video' || stepType === 'arquivo'){
          await sendMediaFromPath(app, chatId, step.caminho, step.legenda || '');
          sentPreview={ type:stepType, text:String(step.legenda || ''), label:stepType==='imagem'?'Imagem enviada':stepType==='video'?'Vídeo enviado':'Arquivo enviado' };
        } else if(stepType === 'audio'){
          const seconds = safeNumber(step.gravandoSegundos, 0, 0, 180);
          if(seconds > 0) await sleep(seconds * 1000);
          await sendMediaFromPath(app, chatId, step.caminho, '', { sendAudioAsVoice: true });
          sentPreview={ type:'audio', text:'', label:'Áudio enviado' };
          if(step.legenda){
            await waState.client.sendMessage(chatId, step.legenda);
            summary.sentMessages.push(sentPreview);
            summary.sentMessages.push({ type:'text', text:String(step.legenda) });
            sentPreview=null;
          }
        } else if(stepType === 'opcoes'){
          const menuResult=await sendInteractiveOptions(app,chatId,bloco,step);
          sentPreview=menuResult.preview;
          if(menuResult.waitingChoice){
            if(sentPreview) summary.sentMessages.push(sentPreview);
            summary.success += 1;
            summary.waitingChoice=true;
            addLog(app,'bloco_aguardando_escolha','Fluxo pausado aguardando escolha do cliente.',{blocoId:bloco.id,numero:digits||null,destino:label||chatId,etapaId:step.id||null,etapa:stepNumber,totalEtapas:totalSteps,modo:menuResult.deliveryMode||'numbered_text'});
            break;
          }
        } else {
          throw new Error(`Tipo de etapa não suportado: ${stepType}`);
        }

        if(sentPreview) summary.sentMessages.push(sentPreview);
        if(sentPreview && index < totalSteps - 1){
          const nextType=safeText(bloco.etapas[index+1]?.tipo||'',30);
          if(nextType!=='pausa') await sleep(AUTOMATED_BLOCK_GAP_MS);
        }
        summary.success += 1;
        addLog(app, 'bloco_etapa_enviada', `Etapa ${stepNumber}/${totalSteps} concluída: ${stepType}`, {
          blocoId: bloco.id,
          numero: digits || null,
          destino: label || chatId,
          etapaId: step.id || null,
          etapa: stepNumber,
          totalEtapas: totalSteps,
          tipo: stepType,
          duracaoMs: Date.now() - stepStartedAt
        });
      } catch(error){
        const errorText = error?.stack || error?.message || String(error);
        summary.failed += 1;
        summary.failures.push({
          etapa: stepNumber,
          etapaId: step.id || null,
          tipo: stepType,
          erro: error?.message || String(error)
        });
        addLog(app, 'bloco_etapa_erro', `Falha na etapa ${stepNumber}/${totalSteps}: ${stepType}. O bloco continuará.`, {
          blocoId: bloco.id,
          numero: digits || null,
          destino: label || chatId,
          etapaId: step.id || null,
          etapa: stepNumber,
          totalEtapas: totalSteps,
          tipo: stepType,
          caminho: step.caminho || null,
          erro: errorText,
          duracaoMs: Date.now() - stepStartedAt
        });
      }
    }

    const durationMs = Date.now() - startedAt;
    const logType = summary.failed ? 'bloco_envio_concluido_com_falhas' : 'bloco_envio_sucesso';
    const message = summary.failed
      ? `Bloco concluído com ${summary.success} etapa(s) enviada(s) e ${summary.failed} falha(s): ${bloco.nome}`
      : `Bloco concluído: ${bloco.nome}`;

    addLog(app, logType, message, {
      blocoId: bloco.id,
      numero: digits || null,
      destino: label || chatId,
      total: summary.total,
      sucesso: summary.success,
      falhas: summary.failed,
      detalhesFalhas: summary.failures,
      duracaoMs: durationMs
    });

    return {
      digits,
      label,
      total: summary.total,
      success: summary.success,
      failed: summary.failed,
      failures: summary.failures,
      sentMessages: summary.sentMessages,
      waitingChoice: summary.waitingChoice,
      durationMs
    };
  } finally {
    waState.blockRunning = false;
  }
}

async function executeBlockToChat(app, destination, bloco){
  // Enfileira blocos em vez de rejeitar o segundo clique. Assim o operador pode
  // selecionar o próximo bloco imediatamente sem misturar as etapas no WhatsApp.
  const previous=waState.blockQueueTail || Promise.resolve();
  const queued=previous.catch(()=>{}).then(()=>runBlockToChat(app,destination,bloco));
  waState.blockQueueTail=queued.catch(()=>{});
  return queued;
}

async function executeBlock(app, rawNumber, bloco){
  const { digits, chatId } = await resolveChatId(rawNumber);
  return executeBlockToChat(app, { digits, chatId, label:digits }, bloco);
}

function cacheWhatsAppMessage(message){
  const serialized=String(message?.id?._serialized || message?.id?.id || '');
  if(!serialized) return;
  const core=messageIdCore(serialized);
  const variants=new Set([serialized,core]);
  for(const value of messageIdVariants(serialized)) variants.add(value);
  for(const key of variants){ if(key) waState.messageCache.set(key,message); }
  while(waState.messageCache.size>2500){
    const first=waState.messageCache.keys().next().value;
    waState.messageCache.delete(first);
  }
  try{ ensureWhatsAppProvider().cacheMessage(message); }catch{}
}
async function persistMessageMedia(app,message,result){
  if(!result?.saved || !message?.hasMedia || typeof message.downloadMedia!=='function') return;
  try{
    const downloaded=await message.downloadMedia();
    if(!downloaded?.data || !validBase64(downloaded.data)) return;
    const buffer=Buffer.from(String(downloaded.data).replace(/\s+/g,''),'base64');
    if(!buffer.length) return;
    storeInboxMediaFile(app,result.conversationId,result.messageId,buffer,{
      mime:downloaded.mimetype || message?._data?.mimetype || '',
      originalName:downloaded.filename || message?._data?.filename || '',
      kind:result.mediaKind || ''
    });
    addLog(app,'inbox_midia_armazenada','Mídia nova armazenada localmente.',{conversa:result.conversationId,mensagem:result.messageId,tamanho:buffer.length});
  }catch(error){
    addLog(app,'inbox_midia_nao_armazenada','A mídia nova foi registrada, mas não pôde ser armazenada localmente.',{conversa:result.conversationId,mensagem:result.messageId,erro:error?.message || String(error)});
  }
}

async function createClient(app){
  if(waState.client || waState.starting) return;
  ensureDir(authDir(app));
  waState.starting = true;
  waState.app = app;
  setWaState('iniciando', 'Abrindo o WhatsApp Web...', { qrDataUrl: null, lastError: null });
  addLog(app, 'whatsapp_iniciando', 'Inicialização do cliente WhatsApp solicitada.');

  const chromePath = detectChrome();
  addLog(app, 'whatsapp_cliente_configurando', 'Preparando o cliente e o navegador do WhatsApp.', {
    chromeDetectado:Boolean(chromePath),
    chromePath:chromePath || null,
    sessao:authDir(app),
    cacheWebVersion:'padrao-da-biblioteca',
    timeoutMs:CLIENT_INITIALIZE_TIMEOUT_MS
  });

  // Não fixamos uma versão remota do WhatsApp Web. A configuração remota
  // estrita pode impedir o QR e a restauração da sessão quando o cache deixa
  // de estar disponível. Nesta versão usamos o fluxo padrão do whatsapp-web.js.
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'quality-teste', dataPath: authDir(app), rmMaxRetries: 5 }),
    puppeteer: {
      headless: true,
      executablePath: chromePath || undefined,
      protocolTimeout: 120000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });
  waState.client = client;
  waState.clientCreatedAt = now();
  ensureWhatsAppProvider().connect(client);
  ensureMediaEngine().setClient(client);

  client.on('qr', async (qr) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
      setWaState('aguardando_qr', 'Escaneie o QR Code pelo WhatsApp do número de teste.', { qrDataUrl, starting: false });
      addLog(app, 'whatsapp_qr', 'Novo QR Code gerado para conexão.');
    } catch (error) {
      setWaState('erro', 'Falha ao gerar a imagem do QR Code.', { lastError: error.message, starting: false });
    }
  });
  client.on('authenticated', () => {
    waState.authenticatedAt = now();
    setWaState('autenticado', 'QR Code confirmado. Preparando a sessão...', { qrDataUrl: null, starting:true });
    armReadyWatchdog(app, client);
    addLog(app, 'whatsapp_autenticado', 'Sessão WhatsApp autenticada.');
  });
  client.on('ready', async () => {
    clearReadyWatchdog();
    waState.recoveryAttempts = 0;
    const info = client.info || {};
    const number = info.wid?.user || null;
    const name = info.pushname || null;
    setInboxAccount(app, number);
    setWaState('conectado', 'WhatsApp conectado e pronto para envios manuais.', {
      qrDataUrl: null, connectedNumber: number, connectedName: name, initialized: true, starting: false, lastError: null, connectedSince:now()
    });
    const data = loadAll(app);
    writeJson(app, 'config.json', { ...data.config, whatsappConectado: true, atualizadoEm: now(), version: MODULE_VERSION });
    addLog(app, 'whatsapp_conectado', 'WhatsApp conectado com sucesso.', { numero: number, nome: name });
    setTimeout(()=>processScheduledMessages(app).catch(error=>{
      addLog(app,'inbox_agendamento_reconexao_erro','Falha ao recuperar mensagens agendadas após reconectar o WhatsApp.',{erro:error?.message||String(error)});
    }),500).unref?.();
    try {
      const runtime = await client.pupPage.evaluate(() => {
        const safe = value => { try { return value == null ? null : String(value); } catch { return null; } };
        let chatCount = null;
        let messageCount = null;
        try { chatCount = window.require('WAWebCollections')?.Chat?.getModelsArray?.()?.length ?? null; } catch {}
        try { messageCount = window.require('WAWebCollections')?.Msg?.getModelsArray?.()?.length ?? null; } catch {}
        return {
          whatsappWebVersion: safe(window?.Debug?.VERSION || window?.WhatsAppWebClient?.version),
          hasWindowRequire: typeof window.require === 'function',
          hasChatCollection: Boolean(window.require?.('WAWebCollections')?.Chat),
          hasMessageCollection: Boolean(window.require?.('WAWebCollections')?.Msg),
          hasDownloadManager: (() => { try { return Boolean(window.require('WAWebDownloadManager')?.downloadManager); } catch { return false; } })(),
          chatCount,
          messageCount
        };
      });
      addLog(app, 'whatsapp_base_compatibilidade', 'Base do WhatsApp Web carregada pelo fluxo padrão da biblioteca.', {
        moduleVersion:MODULE_VERSION,
        cacheMode:'library-default',
        ...runtime
      });
    } catch(error) {
      addLog(app, 'whatsapp_base_diagnostico_falhou', 'Não foi possível confirmar a versão carregada do WhatsApp Web.', {
        moduleVersion:MODULE_VERSION,
        cacheMode:'library-default',
        erro:error?.stack || error?.message || String(error)
      });
    }
    try{
      waState.syncing=true;
      const sync=await syncInboxFromWhatsApp(app,client,{
        chatLimit:80,
        messageLimit:25,
        incremental:true,
        onMessage:cacheWhatsAppMessage,
        // Sincronização histórica salva apenas metadados/texto. Mídias não são baixadas em massa.
        provider:ensureWhatsAppProvider()
      });
      waState.lastSyncAt=now();
      addLog(app,'inbox_sincronizacao_concluida','Conversas recentes foram sincronizadas com o WhatsApp.',sync);
    }catch(error){ addLog(app,'inbox_erro_sincronizacao','Falha ao sincronizar conversas recentes.',{erro:error.message}); }
    finally{ waState.syncing=false; }
    try {
      const repair = await repairInboxIdentities(app, client);
      if(repair.migrated || repair.merged){
        addLog(app, 'inbox_identidades_corrigidas', 'Conversas antigas foram vinculadas aos números reais.', repair);
      } else if(repair.unresolved){
        addLog(app, 'inbox_identidades_pendentes', 'Algumas conversas ainda aguardam identificação do número real.', repair);
      }
    } catch(error){
      addLog(app, 'inbox_erro_migracao', 'Falha ao revisar identificadores antigos do Inbox.', { erro:error.message });
    }
    try {
      const names = await repairInboxContactNames(app, client, { provider:ensureWhatsAppProvider() });
      if(names.updated) addLog(app, 'inbox_nomes_corrigidos', 'Nomes automáticos dos contatos foram revisados com base no chat remoto.', names);
      if(names.unresolved) addLog(app, 'inbox_nomes_pendentes', 'Alguns contatos ainda aguardam um nome remoto confiável.', names);
    } catch(error){
      addLog(app, 'inbox_erro_nomes', 'Falha ao revisar nomes automáticos dos contatos.', { erro:error.message });
    }
    try {
      const groups = await repairInboxGroupNames(app, client, { provider:ensureWhatsAppProvider() });
      if(groups.updated) addLog(app, 'inbox_grupos_corrigidos', 'Títulos reais dos grupos foram atualizados.', groups);
      if(groups.unresolved) addLog(app, 'inbox_grupos_pendentes', 'Alguns grupos ainda aguardam título real do WhatsApp.', groups);
    } catch(error){
      addLog(app, 'inbox_erro_grupos', 'Falha ao revisar nomes dos grupos.', { erro:error.message });
    }
  });
  client.on('auth_failure', (message) => {
    clearReadyWatchdog();
    clearInboxAccount(app);
    setWaState('erro', 'Falha de autenticação. Será necessário conectar novamente.', { lastError: String(message), starting: false, initialized: false });
    addLog(app, 'whatsapp_auth_falhou', 'Falha na autenticação do WhatsApp.', { erro: String(message) });
  });
  client.on('disconnected', (reason) => {
    clearReadyWatchdog();
    clearInboxAccount(app);
    setWaState('desconectado', 'WhatsApp desconectado.', { connectedNumber: null, connectedName: null, initialized: false, starting: false });
    waState.client = null;
    if(waState.provider) waState.provider.setClient(null);
    if(waState.mediaEngine) waState.mediaEngine.setClient(null);
    const data = loadAll(app);
    writeJson(app, 'config.json', { ...data.config, whatsappConectado: false, atualizadoEm: now(), version: MODULE_VERSION });
    addLog(app, 'whatsapp_desconectado', 'WhatsApp desconectado.', { motivo: String(reason || '') });
  });
  client.on('change_state', state => {
    waState.lastEventAt = now();
    addLog(app, 'whatsapp_estado', `Estado do WhatsApp: ${state}`);
  });
  client.on('message_create', async (message) => {
    try {
      cacheWhatsAppMessage(message);
      const result = await registerWhatsAppMessage(app, message, client);
      if(result?.saved && result?.conversationType!=='group' && message?.hasMedia) await persistMessageMedia(app,message,result);
      if(result?.saved){
        if(result.direction === 'incoming'){
          const preference=applyInboundAutomationPreference(app,{phone:result.phone,text:message?.body||result.preview||''});
          if(preference==='opt_out'){
            addLog(app,'automacao_opt_out','Contato pediu para não receber mensagens automáticas.',{telefone:result.phone||null,conversa:result.conversationId});
          }else{
            if(preference==='opt_in') addLog(app,'automacao_opt_in','Contato voltou a autorizar mensagens automáticas.',{telefone:result.phone||null,conversa:result.conversationId});
            const flowHandled=await handlePendingFlowSelection(app,message);
            if(!flowHandled) await handleKeywordAutomation(app,message);
          }
        }
        addLog(app, 'inbox_mensagem_registrada', result.direction === 'incoming' ? 'Mensagem recebida e registrada no Inbox.' : 'Mensagem enviada e registrada no Inbox.', {
          conversa: result.conversationId,
          nome: result.name,
          telefone: result.phoneResolved ? result.phone : null,
          identificacaoResolvida: result.phoneResolved,
          direcao: result.direction,
          mensagem: result.preview
        });
      } else if(result?.reason === 'sem_identificador'){
        addLog(app, 'inbox_numero_nao_resolvido', 'Mensagem ignorada porque o número real não pôde ser identificado.', {
          whatsappId: result.whatsappId || null
        });
      }
    } catch(error){
      addLog(app, 'inbox_erro_registro', 'Falha ao registrar mensagem no Inbox.', { erro:error.message });
    }
  });

  try {
    addLog(app, 'whatsapp_initialize_inicio', 'Executando client.initialize().', {
      timeoutMs:CLIENT_INITIALIZE_TIMEOUT_MS,
      chromePath:chromePath || null
    });

    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const error = new Error(`Tempo limite de ${Math.round(CLIENT_INITIALIZE_TIMEOUT_MS / 1000)} segundos aguardando client.initialize().`);
        error.code = 'WHATSAPP_INITIALIZE_TIMEOUT';
        reject(error);
      }, CLIENT_INITIALIZE_TIMEOUT_MS);
    });

    try {
      await Promise.race([client.initialize(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }

    addLog(app, 'whatsapp_initialize_retorno', 'client.initialize() retornou sem erro. Aguardando QR, autenticação ou ready.');
  } catch (error) {
    clearReadyWatchdog();
    const details = {
      nome:error?.name || null,
      codigo:error?.code || null,
      erro:error?.message || String(error),
      stack:error?.stack || null,
      chromePath:chromePath || null
    };
    addLog(app, 'whatsapp_initialize_falhou', 'Falha durante client.initialize().', details);
    try { await client.destroy(); } catch(destroyError) {
      addLog(app, 'whatsapp_destroy_falhou', 'Também houve falha ao encerrar o cliente após o erro.', {
        erro:destroyError?.message || String(destroyError)
      });
    }
    if(waState.client === client) waState.client = null;
    if(waState.provider) waState.provider.setClient(null);
    if(waState.mediaEngine) waState.mediaEngine.setClient(null);
    setWaState('erro', error?.code === 'WHATSAPP_INITIALIZE_TIMEOUT'
      ? 'O WhatsApp Web demorou demais para abrir. Consulte os logs antes de apagar a sessão.'
      : 'Não foi possível abrir o WhatsApp Web.', {
        lastError:details.erro,
        starting:false,
        initialized:false,
        qrDataUrl:null
      });
    throw error;
  }
}

export async function initializeWhatsApp(app){
  waState.app = app;
  ensureData(app);
  ensureInboxStorage(app);
  armFlowTimeoutMonitor(app);
  armBirthdayMonitor(app);
  armScheduledMessageMonitor(app);
  const sessionPath = path.join(authDir(app), 'session-quality-teste');
  if(fs.existsSync(sessionPath)){
    try { await createClient(app); } catch { /* erro já registrado */ }
  }
}

export async function shutdownWhatsApp(){
  clearReadyWatchdog();
  clearFlowTimeoutMonitor();
  clearBirthdayMonitor();
  clearScheduledMessageMonitor();
  if(!waState.client) return;
  try { await waState.client.destroy(); } catch { /* encerramento do painel */ }
  waState.client = null;
  if(waState.provider) waState.provider.setClient(null);
  if(waState.mediaEngine) waState.mediaEngine.setClient(null);
  setWaState('desconectado', 'Cliente encerrado junto com o Painel Quality.', { initialized: false, starting: false });
}

function mediaKindFromMime(mime=''){
  if(mime.startsWith('image/')) return 'imagens';
  if(mime.startsWith('audio/')) return 'audios';
  if(mime.startsWith('video/')) return 'videos';
  return 'arquivos';
}
function stepTypeFromMime(mime=''){
  if(mime.startsWith('image/')) return 'imagem';
  if(mime.startsWith('audio/')) return 'audio';
  if(mime.startsWith('video/')) return 'video';
  return 'arquivo';
}
function mediaUsage(blocos, media){
  const used = [];
  for(const bloco of blocos || []){
    const found = (bloco.etapas || []).some(e => {
      if((media.id && e.mediaId === media.id) || (media.caminho && e.caminho === media.caminho)) return true;
      if(e.tipo !== 'opcoes' || !Array.isArray(e.opcoes)) return false;
      return e.opcoes.some(o => (media.id && o.mediaId === media.id) || (media.caminho && o.caminho === media.caminho));
    });
    if(found) used.push({ id: bloco.id, nome: bloco.nome });
  }
  return used;
}
const storage = multer.diskStorage({
  destination(req,file,cb){
    try{
      const kind = mediaKindFromMime(file.mimetype || '');
      const dir = blockMediaDir(req.app, kind);
      ensureDir(dir);
      req.qwMediaKind = kind;
      cb(null,dir);
    }catch(e){ cb(e); }
  },
  filename(req,file,cb){
    const ext=path.extname(file.originalname||'').toLowerCase().slice(0,12);
    const base=path.basename(file.originalname||'arquivo',ext).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'arquivo';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${base}${ext}`);
  }
});
const upload = multer({ storage, limits:{fileSize:80*1024*1024}, fileFilter(req,file,cb){
  const ok=[
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/ogg','audio/wav','audio/mp4','audio/x-m4a',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf','text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  ok.includes(file.mimetype)?cb(null,true):cb(new Error('Tipo de arquivo não permitido.'));
}});

const INBOX_ALLOWED_MIMES = new Set([
  'image/jpeg','image/png','image/webp','image/gif',
  'audio/ogg','audio/mpeg','audio/mp4','audio/webm','audio/wav',
  'video/mp4','video/webm',
  'application/pdf','text/plain','application/zip',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);
const inboxUpload = multer({
  storage:multer.memoryStorage(),
  limits:{ fileSize:40*1024*1024, files:1 },
  fileFilter(req,file,cb){
    const mime=String(file.mimetype||'').toLowerCase();
    if(!INBOX_ALLOWED_MIMES.has(mime)) return cb(new Error('Tipo de arquivo não permitido no Inbox.'));
    cb(null,true);
  }
});

const scheduledInboxUpload = multer({
  storage:multer.diskStorage({
    destination(req,file,cb){
      try{ const dir=scheduledMessagesDir(req.app); ensureDir(dir); cb(null,dir); }
      catch(error){ cb(error); }
    },
    filename(req,file,cb){
      const mime=String(file.mimetype||'').toLowerCase();
      const isVideo=mime.startsWith('video/');
      const fallback=isVideo?(mime.includes('webm')?'.webm':mime.includes('quicktime')?'.mov':'.mp4'):mime.includes('ogg')?'.ogg':mime.includes('mpeg')?'.mp3':mime.includes('mp4')?'.m4a':mime.includes('wav')?'.wav':mime.includes('webm')?'.webm':'.jpg';
      const ext=path.extname(String(file.originalname||'')).toLowerCase().slice(0,10) || fallback;
      cb(null,`${Date.now()}-${Math.random().toString(36).slice(2,9)}${ext}`);
    }
  }),
  limits:{ fileSize:40*1024*1024, files:1 },
  fileFilter(req,file,cb){
    const mime=String(file.mimetype||'').toLowerCase().split(';')[0].trim();
    const isImage=['image/jpeg','image/png','image/webp','image/gif'].includes(mime);
    const isAudio=mime.startsWith('audio/') && ['audio/mpeg','audio/ogg','audio/mp4','audio/webm','audio/wav','audio/x-wav'].includes(mime);
    const isVideo=['video/mp4','video/webm','video/quicktime'].includes(mime);
    if(!isImage&&!isAudio&&!isVideo) return cb(new Error('No agendamento, selecione uma imagem, áudio ou vídeo compatível.'));
    cb(null,true);
  }
});
function inboxMediaOptions(mime=''){
  const isAudio=String(mime).startsWith('audio/');
  return { isAudio, options:isAudio ? { sendAudioAsVoice:true } : {} };
}



router.get('/', (req,res)=>{
  const data = loadAll(req.app);
  ensureInboxStorage(req.app);
  ensureErpStorage(req.app);
  ensureTaskStorage(req.app);
  let inboxData = getInboxData(req.app);
  const selectedConversationId = safeConversationId(req.query.conversation || '');
  if(selectedConversationId){
    const before=inboxData.conversations.find(c=>c.id===selectedConversationId);
    if(before && (Number(before.unreadCount||0)>0 || before.manuallyUnread)){
      try { markConversationRead(req.app, selectedConversationId); } catch {}
      inboxData = getInboxData(req.app);
    }
  }
  // Reaproveita a mesma leitura do índice do Inbox. Antes a página relia o
  // arquivo de conversas várias vezes e ainda varria toda a pasta de mídias.
  const inboxSummary = getInboxSummary(req.app, inboxData);
  const commercialDashboard = getCommercialDashboard(req.app, inboxData);
  const inboundMetrics = getInboundContactMetrics(req.app, inboxData, { month:req.query.contactMonth, compareMonth:req.query.compareMonth });
  const scheduledOverview = listScheduledOverview(req.app, 12);
  const selectedConversation = inboxData.conversations.find(c => c.id === selectedConversationId) || null;
  const selectedMessages = selectedConversation ? getConversationMessages(req.app, selectedConversation.id) : [];
  const customerContext = selectedConversation ? getCustomerContext(req.app, selectedConversation) : { customer:null, labels:[], notes:[] };
  if(customerContext.customer) customerContext.tasks = listTasks(req.app,{customerId:customerContext.customer.id,includeCompleted:true});
  else customerContext.tasks = [];
  const taskOverview = getTaskOverview(req.app);
  let tab = safeText(req.query.tab || 'dashboard', 30);
  if(tab==='comercial') tab='dashboard';
  const keywordMetrics=keywordAutomationMetrics(data.palavrasChave||[]);
  const birthdayDashboard = tab === 'aniversariantes' ? getBirthdayDashboard(req.app, data.config) : null;
  const editId = safeText(req.query.edit || '', 120);
  const blocoEdit = data.blocos.find(b => b.id === editId) || null;
  const keywordEditId=safeText(req.query.kwedit||'',100);
  const keywordEdit=(data.palavrasChave||[]).find(item=>item.id===keywordEditId)||null;
  const midiasComUso = data.midias.map(m => ({ ...m, usos: mediaUsage(data.blocos, m) }));
  res.render('automacao_whatsapp', {
    pageClass: 'qw-whatsapp-page',
    flash: req.query.flash || null,
    error: req.query.error || null,
    version: MODULE_VERSION,
    tab,
    blocoEdit,
    keywordEdit,
    whatsapp: publicWaState(),
    inboxSummary,
    commercialDashboard,
    inboundMetrics,
    scheduledOverview,
    keywordMetrics,
    inboxConversations: inboxData.conversations,
    inboxContacts: inboxData.contacts,
    selectedConversation,
    selectedMessages,
    scheduledMessages: selectedConversation ? listScheduledMessages(req.app, selectedConversation.id) : [],
    customerContext,
    taskOverview,
    birthdayDashboard,
    inboxRevision: getInboxRevision(req.app, selectedConversation?.id || ''),
    settingsSection: safeText(req.query.section || 'geral', 30),
    ...data,
    midias: midiasComUso
  });
});

router.get('/inbox/state', (req,res)=>{
  try {
    const conversationId = safeText(req.query.conversation || '', 80).replace(/[^a-zA-Z0-9_-]/g, '');
    res.set('Cache-Control', 'no-store');
    res.json({ success:true, revision:getInboxRevision(req.app, conversationId) });
  } catch(error) {
    res.status(500).json({ success:false, message:error.message || 'Falha ao consultar o Inbox.' });
  }
});


router.get('/inbox/contatos-iniciar', async (req,res)=>{
  try{
    const query=safeText(req.query.q||'',120);
    const normalized=normalizeDirectoryText(query);
    const digitsQuery=String(query||'').replace(/\D/g,'');
    const inboxData=getInboxData(req.app);
    const existing=(inboxData.conversations||[]).filter(c=>c.conversationType!=='group');
    const existingByPhone=new Map(existing.map(c=>[contactPhoneDigits(c.phone),c]).filter(([phone])=>phone));
    const merged=new Map();
    const add=(entry={})=>{
      const phone=contactPhoneDigits(entry.phone);
      if(!phone) return;
      const current=merged.get(phone)||{phone,name:'',whatsappId:'',sources:new Set(),hasWhatsApp:null,conversationId:''};
      if(entry.name && (!current.name || entry.source==='erp')) current.name=safeText(entry.name,160);
      if(entry.whatsappId) current.whatsappId=entry.whatsappId;
      if(entry.source) current.sources.add(entry.source);
      if(entry.hasWhatsApp===true) current.hasWhatsApp=true;
      if(entry.hasWhatsApp===false && current.hasWhatsApp!==true) current.hasWhatsApp=false;
      if(entry.conversationId) current.conversationId=entry.conversationId;
      merged.set(phone,current);
    };
    existing.forEach(c=>add({phone:c.phone,name:c.name,whatsappId:c.whatsappId,source:'inbox',hasWhatsApp:Boolean(c.phoneResolved),conversationId:c.id}));
    let customers=[];
    try{ customers=getCanonicalCustomerService(req.app).listCustomers({includeInactive:false}); }catch{}
    customers.forEach(c=>{
      const phones=[c.mobile,c.phone].filter(Boolean);
      phones.forEach(phone=>add({phone,name:c.name||c.tradeName||'',source:'erp'}));
    });
    // A pesquisa deve responder imediatamente. Usa o diretório do WhatsApp somente quando já está em cache
    // e aquece o cache em segundo plano uma única vez, evitando getContacts() a cada tecla.
    const whatsappContacts=Array.isArray(waState.contactDirectoryCache)?waState.contactDirectoryCache:[];
    whatsappContacts.forEach(c=>add({phone:c.phone,name:c.name,whatsappId:c.whatsappId,source:'whatsapp',hasWhatsApp:true}));
    warmWhatsAppContactDirectory();
    let items=[...merged.values()].filter(item=>{
      if(!normalized && !digitsQuery) return true;
      const hay=normalizeDirectoryText(`${item.name} ${item.phone}`);
      return (normalized && hay.includes(normalized)) || (digitsQuery && item.phone.includes(digitsQuery));
    });
    items.sort((a,b)=>{
      const ai=a.conversationId?0:(a.sources.has('erp')?1:2), bi=b.conversationId?0:(b.sources.has('erp')?1:2);
      return ai-bi || String(a.name||a.phone).localeCompare(String(b.name||b.phone),'pt-BR');
    });
    items=items.slice(0,40);
    // Não valida vários números durante a digitação. A validação ocorre somente ao abrir/iniciar a conversa.
    res.set('Cache-Control','no-store');
    res.json({success:true,connected:waState.status==='conectado',whatsappDirectoryReady:Array.isArray(waState.contactDirectoryCache),whatsappDirectoryLoading:Boolean(waState.contactDirectoryPromise),items:items.map(item=>({
      phone:item.phone,name:item.name||item.phone,whatsappId:item.whatsappId||'',sources:[...item.sources],hasWhatsApp:item.hasWhatsApp,conversationId:item.conversationId||''
    }))});
  }catch(error){ res.status(500).json({success:false,message:error.message||'Não foi possível carregar os contatos.'}); }
});

router.post('/inbox/iniciar-conversa', async (req,res)=>{
  try{
    const phone=normalizePhone(req.body?.phone||'');
    const name=safeText(req.body?.name||'',160);
    const resolved=await resolveChatId(phone);
    const conversation=ensureInboxConversationForContact(req.app,{phone:resolved.digits,whatsappId:resolved.chatId,name});
    res.json({success:true,conversationId:conversation.id,url:`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversation.id)}`});
  }catch(error){ res.status(400).json({success:false,message:error.message||'Não foi possível iniciar a conversa.'}); }
});

router.post('/inbox/sincronizar', async (req,res)=>{
  if(!waState.client || waState.status !== 'conectado') return res.status(409).json({success:false,message:'Conecte o WhatsApp antes de sincronizar.'});
  if(waState.syncing) return res.status(409).json({success:false,message:'Já existe uma sincronização em andamento.'});
  try{
    waState.syncing=true;
    const sync=await syncInboxFromWhatsApp(req.app,waState.client,{
      chatLimit:120,messageLimit:40,incremental:true,onMessage:cacheWhatsAppMessage,
      // Forçar sincronização também evita download em massa de mídias para reduzir armazenamento local.
      provider:ensureWhatsAppProvider()
    });
    waState.lastSyncAt=now();
    addLog(req.app,'inbox_sincronizacao_manual','Inbox sincronizado manualmente pelo operador.',sync);
    res.json({success:true,message:'Inbox sincronizado com sucesso.',lastSyncAt:waState.lastSyncAt,summary:sync,revision:getInboxRevision(req.app,'')});
  }catch(error){
    addLog(req.app,'inbox_sincronizacao_manual_falhou','Falha na sincronização manual do Inbox.',{erro:error?.message||String(error)});
    res.status(500).json({success:false,message:error?.message||'Falha ao sincronizar o Inbox.'});
  }finally{ waState.syncing=false; }
});

router.post('/inbox/marcar-nao-lida', (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    markConversationUnread(req.app, conversationId);
    res.json({ success:true, message:'Conversa marcada como não lida.' });
  } catch(error){
    res.status(400).json({ success:false, message:error.message || 'Não foi possível marcar a conversa.' });
  }
});



router.post('/inbox/atendimento', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try{
    updateConversationAttendance(req.app,conversationId,{
      action:safeText(req.body?.action,20),
      reason:safeText(req.body?.reason,40),
      actor:'operador'
    });
    const message=req.body?.action==='reopen'?'Atendimento reaberto.':'Atendimento encerrado e removido das oportunidades abertas.';
    flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,message);
  }catch(error){
    flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível alterar o atendimento.');
  }
});

router.post('/inbox/atendimento/lote', (req,res)=>{
  try{
    const ids=Array.isArray(req.body?.conversationIds) ? req.body.conversationIds : (req.body?.conversationIds ? [req.body.conversationIds] : []);
    const result=bulkUpdateConversationAttendance(req.app,ids,{
      action:safeText(req.body?.action||'close',20),
      reason:safeText(req.body?.reason||'completed',40),
      actor:'operador'
    });
    const suffix=result.errors.length?` ${result.errors.length} não puderam ser alteradas.`:'';
    flash(res,'/automacao-whatsapp?tab=comercial',`${result.updated} atendimento(s) encerrado(s).${suffix}`);
  }catch(error){ flash(res,'/automacao-whatsapp?tab=comercial',error.message||'Não foi possível encerrar os atendimentos.'); }
});

router.post('/inbox/contato/atualizar', (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    updateInboxContact(req.app, conversationId, {
      name: req.body?.name,
      commercialStatus: safeText(req.body?.commercialStatus, 40),
      origin: safeText(req.body?.origin, 40),
      interestProduct: req.body?.interestProduct,
      pendingType: safeText(req.body?.pendingType,40),
      pendingNote: req.body?.pendingNote,
      nextAction: req.body?.nextAction,
      nextActionDueAt: req.body?.nextActionDueAt,
      saveContact: req.body?.saveContact === '1'
    });
    flash(res, `/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`, req.body?.saveContact === '1' ? 'Alterações salvas e contato incluído na agenda do Painel.' : 'Alterações da conversa salvas.');
  } catch(error){
    flash(res, `/automacao-whatsapp?tab=inbox`, error.message || 'Não foi possível atualizar o contato.');
  }
});


router.post('/inbox/cliente/atualizar', (req,res)=>{
  const conversationId = safeConversationId(req.body?.conversationId);
  try {
    const labelIds = Array.isArray(req.body?.labels) ? req.body.labels : (req.body?.labels ? [req.body.labels] : []);
    updateCustomer(req.app, safeText(req.body?.customerId,100), {
      name:req.body?.name, email:req.body?.email, cpf:req.body?.cpf, cnpj:req.body?.cnpj,
      commercialStage:req.body?.commercialStage, interestProduct:req.body?.interestProduct,
      assignedTo:req.body?.assignedTo, labels:labelIds
    });
    updateInboxContact(req.app, conversationId, {
      name:req.body?.name, commercialStatus:safeText(req.body?.commercialStage,40),
      origin:safeText(req.body?.origin,40), interestProduct:req.body?.interestProduct,
      pendingType:safeText(req.body?.pendingType,40), pendingNote:req.body?.pendingNote,
      nextAction:req.body?.nextAction, nextActionDueAt:req.body?.nextActionDueAt,
      saveContact:req.body?.saveContact === '1'
    });
    flash(res, `/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`, 'Ficha do cliente atualizada.');
  } catch(error){ flash(res, `/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`, error.message || 'Não foi possível salvar a ficha do cliente.'); }
});

router.post('/inbox/cliente/nota', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try { addCustomerNote(req.app,safeText(req.body?.customerId,100),req.body?.text); flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,'Nota interna adicionada.'); }
  catch(error){ flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível adicionar a nota.'); }
});

router.post('/inbox/cliente/etiqueta', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try { createCustomerLabel(req.app,{name:req.body?.name,color:req.body?.color}); flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,'Etiqueta criada.'); }
  catch(error){ flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível criar a etiqueta.'); }
});


router.post('/inbox/cliente/lembrete', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try {
    createTask(req.app,{customerId:req.body?.customerId,conversationId,title:req.body?.title,description:req.body?.description,dueAt:req.body?.dueAt,priority:req.body?.priority});
    flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,'Lembrete criado.');
  } catch(error){ flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível criar o lembrete.'); }
});
router.post('/inbox/cliente/lembrete/concluir', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try { completeTask(req.app,req.body?.taskId); flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,'Lembrete concluído.'); }
  catch(error){ flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível concluir o lembrete.'); }
});
router.post('/inbox/cliente/lembrete/excluir', (req,res)=>{
  const conversationId=safeConversationId(req.body?.conversationId);
  try { deleteTask(req.app,req.body?.taskId); flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,'Lembrete excluído.'); }
  catch(error){ flash(res,`/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`,error.message||'Não foi possível excluir o lembrete.'); }
});


router.post('/inbox/enviar-texto', async (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    const texto = safeText(req.body?.texto, 4000);
    if(!conversationId) throw new Error('Conversa não identificada.');
    if(!texto) throw new Error('Digite uma mensagem antes de enviar.');

    const inboxData = getInboxData(req.app);
    const conversation = inboxData.conversations.find(item => item.id === conversationId);
    if(!conversation) throw new Error('Conversa não encontrada.');
    const destination = await resolveInboxDestination(conversation);
    const { digits, chatId, label } = destination;
    const sentMessage = await waState.client.sendMessage(chatId, texto);
    addLog(req.app, 'inbox_texto_enviado', 'Mensagem manual enviada pelo Inbox.', {
      conversa: conversation.id,
      nome: conversation.name || label,
      telefone: digits || null,
      tipoConversa: conversation.conversationType || 'contact',
      mensagem: texto.slice(0, 300),
      whatsappMessageId: sentMessage?.id?._serialized || null
    });
    res.json({ success:true, message:'Mensagem enviada com sucesso.' });
  } catch(error){
    addLog(req.app, 'inbox_texto_erro', 'Falha ao enviar mensagem pelo Inbox.', {
      conversa:safeText(req.body?.conversationId,80),
      erro:error.message
    });
    res.status(400).json({ success:false, message:error.message || 'Falha ao enviar a mensagem.' });
  }
});

router.post('/inbox/enviar-anexo', (req,res)=>{
  inboxUpload.single('arquivo')(req,res,async(uploadError)=>{
    if(uploadError) return res.status(400).json({success:false,message:uploadError.message || 'Falha no upload do anexo.'});
    try {
      const conversationId=safeConversationId(req.body?.conversationId);
      const legenda=safeText(req.body?.legenda,1500);
      if(!conversationId) throw new Error('Conversa não identificada.');
      if(!req.file) throw new Error('Selecione um arquivo para enviar.');
      const inboxData=getInboxData(req.app);
      const conversation=inboxData.conversations.find(item=>item.id===conversationId);
      if(!conversation) throw new Error('Conversa não encontrada.');
      const destination=await resolveInboxDestination(conversation);
      const { digits,chatId,label }=destination;
      const media=new MessageMedia(req.file.mimetype,req.file.buffer.toString('base64'),safeText(req.file.originalname,180));
      const setup=inboxMediaOptions(req.file.mimetype);
      const sent=await waState.client.sendMessage(chatId,media,{...setup.options,caption:setup.isAudio?undefined:(legenda||undefined)});
      if(setup.isAudio && legenda) await waState.client.sendMessage(chatId,legenda);
      addLog(req.app,'inbox_anexo_enviado','Anexo manual enviado pelo Inbox.',{
        conversa:conversation.id,nome:conversation.name||label,telefone:digits||null,tipoConversa:conversation.conversationType||'contact',arquivo:req.file.originalname,
        mime:req.file.mimetype,tamanho:req.file.size,whatsappMessageId:sent?.id?._serialized||null
      });
      res.json({success:true,message:'Anexo enviado com sucesso.'});
    } catch(error){
      addLog(req.app,'inbox_anexo_erro','Falha ao enviar anexo pelo Inbox.',{conversa:safeText(req.body?.conversationId,80),erro:error.message});
      res.status(400).json({success:false,message:error.message||'Falha ao enviar o anexo.'});
    }
  });
});


router.post('/inbox/agendar', (req,res)=>{
  // Garante o monitor mesmo se a inicialização do WhatsApp tiver sido adiada.
  armScheduledMessageMonitor(req.app);
  scheduledInboxUpload.single('arquivo')(req,res,(uploadError)=>{
    if(uploadError) return res.status(400).json({success:false,message:uploadError.message||'Falha ao preparar o arquivo do agendamento.'});
    try{
      const conversationId=safeConversationId(req.body?.conversationId);
      const text=safeText(req.body?.texto,4000);
      const scheduledAt=normalizeScheduledAt(req.body?.scheduledAt);
      if(!conversationId) throw new Error('Conversa não identificada.');
      if(!text && !req.file) throw new Error('Digite uma mensagem, selecione uma imagem, áudio ou vídeo, ou grave um áudio para agendar.');
      const inboxData=getInboxData(req.app);
      const conversation=inboxData.conversations.find(item=>item.id===conversationId);
      if(!conversation) throw new Error('Conversa não encontrada.');
      if(!isGroupConversation(conversation) && (!conversation.phoneResolved || !conversation.phone)) throw new Error('O número deste cliente ainda não foi identificado no WhatsApp.');
      if(!isGroupConversation(conversation) && isAutomationSuppressed(req.app,conversation.phone)) throw new Error('Este contato pediu para não receber mensagens automáticas. Remova o bloqueio somente se ele autorizar novamente.');

      const data=scheduledMessagesData(req.app);
      const item={
        id:makeId('agenda_msg'),conversationId,conversationName:safeText(conversation.name||conversation.phone||'Contato',160),
        type:req.file?(String(req.file.mimetype||'').startsWith('audio/')?'audio':String(req.file.mimetype||'').startsWith('video/')?'video':'image'):'text',text,scheduledAt,status:'pendente',attempts:0,lastError:'',nextAttemptAt:null,
        filePath:req.file?`/public/uploads/automacao_whatsapp/agendados/${req.file.filename}`:'',
        fileName:req.file?safeText(req.file.originalname,180):'',mime:req.file?safeText(String(req.file.mimetype||''),160):'',size:req.file?Number(req.file.size||0):0,
        createdAt:now(),updatedAt:now()
      };
      data.items.push(item);
      saveScheduledMessagesData(req.app,data);
      refreshScheduledMessageWakeup(req.app);
      addLog(req.app,'inbox_agendamento_criado','Mensagem agendada no Inbox.',{
        agendamentoId:item.id,conversa:conversationId,nome:item.conversationName,tipo:item.type,horario:item.scheduledAt,temTexto:Boolean(text)
      });
      return res.json({success:true,message:'Mensagem agendada com sucesso.',item:scheduledPublicItem(item)});
    }catch(error){
      if(req.file?.path){ try{ if(fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); }catch{} }
      return res.status(400).json({success:false,message:error.message||'Não foi possível criar o agendamento.'});
    }
  });
});

router.get('/inbox/agendamentos', (req,res)=>{
  try{
    // Além do timer global, abrir a lista também recupera qualquer item vencido.
    armScheduledMessageMonitor(req.app);
    setTimeout(()=>processScheduledMessages(req.app).catch(()=>{}),50).unref?.();
    const conversationId=safeConversationId(req.query?.conversation||'');
    if(!conversationId) throw new Error('Conversa não identificada.');
    res.set('Cache-Control','no-store');
    return res.json({success:true,items:listScheduledMessages(req.app,conversationId)});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Não foi possível consultar os agendamentos.'});
  }
});

router.post('/inbox/agendamentos/:id/cancelar', (req,res)=>{
  try{
    const id=safeText(req.params.id,100);
    const data=scheduledMessagesData(req.app);
    const item=data.items.find(row=>row.id===id);
    if(!item) throw new Error('Agendamento não encontrado.');
    if(item.status==='enviado') throw new Error('Esta mensagem já foi enviada.');
    if(item.status==='cancelado') return res.json({success:true,message:'Agendamento já estava cancelado.'});
    item.status='cancelado'; item.cancelledAt=now(); item.updatedAt=now(); item.nextAttemptAt=null;
    removeScheduledFile(req.app,item);
    saveScheduledMessagesData(req.app,data);
    refreshScheduledMessageWakeup(req.app);
    addLog(req.app,'inbox_agendamento_cancelado','Agendamento do Inbox cancelado.',{agendamentoId:item.id,conversa:item.conversationId});
    return res.json({success:true,message:'Agendamento cancelado.'});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Não foi possível cancelar o agendamento.'});
  }
});

router.post('/inbox/agendamentos/:id/excluir', (req,res)=>{
  try{
    const item=deleteScheduledMessage(req.app,safeText(req.params.id,100));
    addLog(req.app,'inbox_agendamento_excluido','Agendamento removido do histórico.',{agendamentoId:item.id,conversa:item.conversationId,status:item.status});
    return res.json({success:true,message:'Agendamento excluído.'});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Não foi possível excluir o agendamento.'});
  }
});

router.post('/inbox/agendamentos/limpar', (req,res)=>{
  try{
    const conversationId=safeConversationId(req.body?.conversationId||'');
    const mode=req.body?.mode==='all'?'all':'history';
    const removed=clearScheduledMessages(req.app,{conversationId,mode});
    addLog(req.app,'inbox_agendamentos_limpos','Histórico de agendamentos limpo.',{conversationId:conversationId||null,mode,total:removed.length});
    return res.json({success:true,message:removed.length?`${removed.length} agendamento(s) removido(s).`:'Nenhum agendamento para remover.',removed:removed.length});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Não foi possível limpar os agendamentos.'});
  }
});

router.post('/inbox/agendamentos/:id/tentar-agora', (req,res)=>{
  try{
    const id=safeText(req.params.id,100);
    const data=scheduledMessagesData(req.app);
    const item=data.items.find(row=>row.id===id);
    if(!item) throw new Error('Agendamento não encontrado.');
    if(item.status==='enviado') throw new Error('Esta mensagem já foi enviada.');
    if(item.status==='cancelado') throw new Error('Este agendamento foi cancelado.');
    item.status='pendente'; item.attempts=0; item.lastError=''; item.nextAttemptAt=null;
    item.scheduledAt=new Date(Date.now()+1500).toISOString(); item.updatedAt=now();
    saveScheduledMessagesData(req.app,data);
    refreshScheduledMessageWakeup(req.app);
    setTimeout(()=>processScheduledMessages(req.app).catch(()=>{}),250).unref?.();
    return res.json({success:true,message:'Nova tentativa liberada.'});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Não foi possível tentar novamente.'});
  }
});

function safeDownloadName(value='arquivo'){
  return safeText(value,180).replace(/[\/:*?"<>|]+/g,'-').trim() || 'arquivo';
}
function extensionFromDownloadMime(mime='',kind=''){
  const normalized=String(mime||'').toLowerCase().split(';')[0].trim();
  const map={
    'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif',
    'audio/ogg':'.ogg','audio/oga':'.oga','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/webm':'.webm','audio/wav':'.wav',
    'video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov',
    'application/pdf':'.pdf','application/zip':'.zip','text/plain':'.txt',
    'application/msword':'.doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx',
    'application/vnd.ms-excel':'.xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx'
  };
  if(map[normalized]) return map[normalized];
  if(kind==='sticker') return '.webp';
  if(kind==='image') return '.jpg';
  if(kind==='audio') return '.ogg';
  if(kind==='video') return '.mp4';
  return '';
}
function preferredInboxDownloadName(media={},fallback='arquivo'){
  let name=safeDownloadName(media?.originalName || media?.filename || fallback);
  const currentExt=path.extname(name);
  if(!currentExt){
    const ext=extensionFromDownloadMime(media?.mime,media?.kind);
    if(ext) name += ext;
  }
  return name;
}
function messageIdCore(value=''){
  const raw=String(value||'').trim();
  const decoded=(()=>{ try{return decodeURIComponent(raw);}catch{return raw;} })();
  const hexParts=decoded.split('_').filter(part=>/^[A-F0-9]{16,}$/i.test(part));
  if(hexParts.length) return hexParts.at(-1);
  return decoded;
}
function messageIdVariants(value='', conversation=null, savedMessage=null){
  const raw=String(value||'').trim();
  const decoded=(()=>{ try{return decodeURIComponent(raw);}catch{return raw;} })();
  const core=messageIdCore(decoded);
  const values=new Set([raw,decoded,core]);
  for(const item of [...values]){
    const parts=item.split('_');
    if(parts.length>1) values.add(parts[parts.length-1]);
    const colon=item.split(':');
    if(colon.length>1) values.add(colon[colon.length-1]);
  }
  if(conversation && savedMessage && core){
    const fromMe=savedMessage.direction==='outgoing';
    const remotes=[conversation.whatsappId, conversation.phone?`${conversation.phone}@c.us`:''].filter(Boolean);
    for(const remote of remotes) values.add(`${fromMe}_${remote}_${core}`);
  }
  return [...values].filter(Boolean);
}
function whatsappMessageId(message){
  return String(message?.id?._serialized || message?.id?.id || '');
}
function idsMatch(candidate, saved){
  const left=messageIdVariants(candidate);
  const right=messageIdVariants(saved);
  const leftCore=messageIdCore(candidate);
  const rightCore=messageIdCore(saved);
  if(leftCore && rightCore && leftCore===rightCore) return true;
  return left.some(a=>right.some(b=>a===b || (a.length>=16 && b.endsWith(a)) || (b.length>=16 && a.endsWith(b))));
}
function validBase64(value=''){
  const text=String(value||'').replace(/\s+/g,'');
  if(text.length<8 || text.length%4===1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return false;
  return true;
}
function sameChatIdentity(chatId='', conversation={}){
  const id=String(chatId||'');
  if(!id) return false;
  if(id===String(conversation.whatsappId||'')) return true;
  if(conversation.conversationType==='group'){
    return id.replace(/\D/g,'')===String(conversation.whatsappId||'').replace(/\D/g,'');
  }
  const phone=String(conversation.phone||'').replace(/\D/g,'');
  if(phone && id.endsWith('@c.us') && id.replace(/\D/g,'')===phone) return true;
  return false;
}
async function candidateChatsForConversation(conversation){
  const result=[];
  const seen=new Set();
  const add=chat=>{ const id=String(chat?.id?._serialized||chat?.id||''); if(chat && id && !seen.has(id)){seen.add(id);result.push(chat);} };
  const ids=[conversation?.whatsappId];
  if(conversation?.conversationType!=='group' && conversation?.phone){
    ids.push(`${conversation.phone}@c.us`);
    try{ const found=await waState.client.getNumberId(conversation.phone); if(found?._serialized) ids.push(found._serialized); }catch{}
  }
  for(const id of [...new Set(ids.filter(Boolean))]){
    try{ add(await waState.client.getChatById(id)); }catch{}
  }
  try{
    const chats=await waState.client.getChats();
    for(const chat of chats||[]){
      const id=String(chat?.id?._serialized||'');
      if(sameChatIdentity(id,conversation)){ add(chat); continue; }
      if(conversation?.conversationType!=='group' && conversation?.phone){
        try{
          const contact=chat?.getContact ? await chat.getContact() : null;
          const number=String(contact?.number||'').replace(/\D/g,'');
          if(number && number===String(conversation.phone).replace(/\D/g,'')) add(chat);
        }catch{}
      }
    }
  }catch{}
  return result;
}
async function findInboxWhatsAppMessage(conversation, savedMessage){
  if(!waState.client || waState.status!=='conectado') throw new Error('Conecte o WhatsApp para visualizar esta mídia.');
  const messageId=String(savedMessage?.id || '');
  for(const candidate of messageIdVariants(messageId,conversation,savedMessage)){
    const cached=waState.messageCache.get(candidate) || waState.messageCache.get(messageIdCore(candidate));
    if(cached?.hasMedia) return cached;
  }

  if(typeof waState.client.getMessageById==='function'){
    for(const candidate of messageIdVariants(messageId,conversation,savedMessage)){
      try{
        const direct=await waState.client.getMessageById(candidate);
        if(direct?.hasMedia) return direct;
      }catch{}
    }
  }

  const chats=await candidateChatsForConversation(conversation);
  const savedTime=Date.parse(savedMessage?.timestamp || '');
  let fallback=null;
  let fallbackDistance=Infinity;
  for(const chat of chats){
    if(!chat?.fetchMessages) continue;
    for(const limit of [100,300,800]){
      let messages=[];
      try{ messages=await chat.fetchMessages({limit}); }catch{ break; }
      for(const item of messages||[]){
        if(!item?.hasMedia) continue;
        if(idsMatch(whatsappMessageId(item),messageId)) return item;
        const itemTime=Number(item.timestamp)*1000;
        const distance=Number.isFinite(savedTime) && Number.isFinite(itemTime) ? Math.abs(itemTime-savedTime) : Infinity;
        const sameDirection=Boolean(item.fromMe)===(savedMessage?.direction==='outgoing');
        const savedKind=String(savedMessage?.media?.kind||savedMessage?.type||'');
        const itemKind=String(item.type||'');
        const sameType=!savedKind || !itemKind || savedKind===itemKind || (savedKind==='document' && itemKind==='document');
        if(sameDirection && sameType && distance<=30000 && distance<fallbackDistance){ fallback=item; fallbackDistance=distance; }
      }
      if(fallback || (messages||[]).length<limit) break;
    }
  }
  return fallback;
}
async function downloadFromMessageObject(message,savedMessage={}){
  if(!message?.hasMedia || typeof message.downloadMedia!=='function') return null;
  const downloaded=await message.downloadMedia();
  const data=String(downloaded?.data || '').replace(/\s+/g,'');
  if(!data || data.length < 8 || data.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) return null;
  const buffer=Buffer.from(data,'base64');
  if(!buffer.length) return null;
  return {
    buffer,
    mime:safeText(downloaded?.mimetype || message?._data?.mimetype || savedMessage?.media?.mime || 'application/octet-stream',120),
    filename:safeDownloadName(downloaded?.filename || message?._data?.filename || savedMessage?.media?.originalName || 'arquivo'),
    resolvedMessageId:safeText(message?.id?._serialized || message?.id?.id || savedMessage?.id || '',180)
  };
}

async function fetchInboxMediaFromWhatsApp(conversation,savedMessage){
  if(!waState.client || waState.status !== 'conectado') throw new Error('Conecte o WhatsApp para visualizar esta mídia.');

  // Fluxo restaurado da v0.6.1: usar primeiro o ID original salvo pelo
  // whatsapp-web.js, sem transformar o identificador nem passar por scanner.
  // Esse era o caminho que abria áudio, imagem, sticker e documentos antes da regressão.
  if(typeof waState.client.getMessageById === 'function'){
    const exactId=String(savedMessage?.id || '');
    if(exactId){
      try{
        const exactMessage=await waState.client.getMessageById(exactId);
        const exactMedia=await downloadFromMessageObject(exactMessage,savedMessage);
        if(exactMedia){
          addLog(waState.app,'inbox_midia_fluxo_061','Mídia recuperada pelo fluxo direto restaurado da v0.6.1.',{
            conversa:conversation?.id || null,mensagem:exactId,mime:exactMedia.mime,tamanho:exactMedia.buffer.length
          });
          return exactMedia;
        }
      }catch(error){
        addLog(waState.app,'inbox_midia_fluxo_061_fallback','Fluxo direto da v0.6.1 não recuperou a mídia; usando fallback.',{
          conversa:conversation?.id || null,mensagem:exactId,erro:error?.message || String(error)
        });
      }
    }
  }

  // Segunda tentativa pela API pública com variantes normalizadas do ID.
  // Isso cobre IDs compostos como true_<remote>@lid_<hex> e false_<remote>@lid_<hex>.
  if(typeof waState.client.getMessageById === 'function'){
    const attempts=[];
    for(const candidate of messageIdVariants(savedMessage?.id,conversation,savedMessage)){
      try{
        const message=await waState.client.getMessageById(candidate);
        const media=await downloadFromMessageObject(message,savedMessage);
        attempts.push({candidate,found:Boolean(message),hasMedia:Boolean(message?.hasMedia),downloaded:Boolean(media)});
        if(media){
          addLog(waState.app,'inbox_midia_public_variant_hit','Mídia recuperada pela API pública usando ID normalizado.',{
            conversa:conversation?.id||null,mensagem:savedMessage?.id||null,candidate,resolvedMessageId:media.resolvedMessageId,mime:media.mime,tamanho:media.buffer.length
          });
          return media;
        }
      }catch(error){
        attempts.push({candidate,error:error?.stack||error?.message||String(error)});
      }
    }
    addLog(waState.app,'inbox_midia_public_variants_miss','API pública não recuperou a mídia com nenhuma variante do ID.',{
      conversa:conversation?.id||null,mensagem:savedMessage?.id||null,core:messageIdCore(savedMessage?.id),attempts
    });
  }

  // Fallback interno preservado, agora com diagnóstico detalhado da Store.
  return ensureMediaEngine().recover({ conversation, savedMessage });
}

function mediaErrorPage(message){
  const safe=String(message||'Mídia não encontrada.').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mídia indisponível</title><style>body{font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0}.box{max-width:560px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center;box-shadow:0 12px 30px rgba(15,23,42,.08)}h1{font-size:22px;margin:0 0 10px}p{color:#64748b;line-height:1.5}.btn{display:inline-block;margin-top:10px;padding:10px 16px;border-radius:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:700}</style></head><body><div class="box"><h1>📎 Mídia indisponível</h1><p>${safe}</p><a class="btn" href="javascript:window.close()">Fechar</a></div></body></html>`;
}
async function serveInboxMedia(req,res){
  const conversationId=safeConversationId(req.params.conversationId || req.query.conversation);
  const messageId=safeText(req.params.messageId || req.query.message,180);
  const download=req.query.download==='1';
  if(!conversationId || !messageId) return res.status(400).type('html').send(mediaErrorPage('Conversa ou mensagem não identificada.'));

  try{
    const found=getInboxMediaFile(req.app,conversationId,messageId);
    if(found){
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Cache-Control','private, max-age=300');
      if(found.media?.mime) res.type(found.media.mime);
      if(download) return res.download(found.absolute,preferredInboxDownloadName(found.media,'arquivo'));
      return res.sendFile(found.absolute);
    }

    const inboxData=getInboxData(req.app);
    const conversation=inboxData.conversations.find(item=>item.id===conversationId);
    if(!conversation) throw new Error('Conversa não encontrada no Inbox.');
    const savedMessage=getConversationMessages(req.app,conversationId).find(item=>item.id===messageId || idsMatch(item.id,messageId));
    if(!savedMessage?.hasMedia) throw new Error('Esta mensagem não possui mídia registrada.');

    const remote=await fetchInboxMediaFromWhatsApp(conversation,savedMessage);
    const cached=storeInboxMediaFile(req.app,conversationId,savedMessage.id,remote.buffer,{ mime:remote.mime, originalName:savedMessage.media?.originalName || remote.filename, kind:savedMessage.media?.kind });
    if(!cached?.absolute) throw new Error('A mídia foi recuperada, mas não pôde ser salva localmente.');
    const preferredName=preferredInboxDownloadName({...(cached.media||{}),originalName:savedMessage.media?.originalName || remote.filename || cached.media?.originalName},'arquivo');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','private, max-age=300');
    if(cached.media?.mime || remote.mime) res.type(cached.media?.mime || remote.mime);
    if(download) return res.download(cached.absolute,preferredName);
    // sendFile oferece suporte a Range/206, necessário para áudio e vídeo.
    return res.sendFile(cached.absolute);
  }catch(error){
    if(res.headersSent){ try{return res.end();}catch{return;} }
    const text=String(error?.message || error || 'Mídia não encontrada.');
    addLog(req.app,'inbox_midia_recuperacao_falhou','Falha ao abrir ou recuperar mídia do Inbox.',{ conversa:conversationId, mensagem:messageId, erro:text });
    const status=/Conecte o WhatsApp/.test(text)?503:/não está mais disponível|não foi encontrada|não retornou/.test(text)?410:404;
    return res.status(status).type('html').send(mediaErrorPage(text));
  }
}
router.get('/inbox/media/:conversationId/:messageId',serveInboxMedia);
router.get('/inbox/media',serveInboxMedia);

router.post('/inbox/executar-bloco', async (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    const blocoId = safeText(req.body?.blocoId, 120);
    if(!conversationId) throw new Error('Conversa não identificada.');
    if(!blocoId) throw new Error('Selecione um bloco.');

    const inboxData = getInboxData(req.app);
    const conversation = inboxData.conversations.find(item => item.id === conversationId);
    if(!conversation) throw new Error('Conversa não encontrada.');
    const destination = await resolveInboxDestination(conversation);

    const data = loadAll(req.app);
    const bloco = data.blocos.find(item => item.id === blocoId);
    if(!bloco) throw new Error('Bloco não encontrado.');
    if(!bloco.ativo) throw new Error('Este bloco está inativo.');

    const result = await executeBlockToChat(req.app, destination, bloco);
    addLog(req.app, 'inbox_bloco_enviado', `Bloco “${bloco.nome}” executado manualmente pelo Inbox.`, {
      conversa:conversation.id,
      nome:conversation.name || result.label,
      telefone:result.digits || null,
      tipoConversa:conversation.conversationType || 'contact',
      blocoId:bloco.id,
      etapas:result.total
    });
    res.json({ success:true, message:result.waitingChoice?`Bloco “${bloco.nome}” enviado. Aguardando escolha do cliente.`:`Bloco “${bloco.nome}” concluído com ${result.total} etapa(s).`, waitingChoice:!!result.waitingChoice, sentMessages:Array.isArray(result.sentMessages)?result.sentMessages:[] });
  } catch(error){
    addLog(req.app, 'inbox_bloco_erro', 'Falha ao executar bloco pelo Inbox.', {
      conversa:safeText(req.body?.conversationId,80),
      blocoId:safeText(req.body?.blocoId,120),
      erro:error.message
    });
    res.status(400).json({ success:false, message:error.message || 'Falha ao executar o bloco.' });
  }
});



router.post('/aniversariantes/configuracoes', (req,res)=>{
  try{
    const data=loadAll(req.app),body=req.body||{};
    const horario=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(body.horarioAniversario||''))?String(body.horarioAniversario):data.config.horarioAniversario||'08:00';
    const mensagem=safeText(body.mensagemAniversario||'',4000) || DEFAULT_BIRTHDAY_MESSAGE;
    const mensagemAtrasado=safeText(body.mensagemAniversarioAtrasado||'',4000) || DEFAULT_LATE_BIRTHDAY_MESSAGE;
    const config={
      ...data.config,
      aniversariantesAtivo:body.aniversariantesAtivo==='on'||body.aniversariantesAtivo==='true',
      horarioAniversario:horario,
      mensagemAniversario:mensagem,
      mensagemAniversarioAtrasado:mensagemAtrasado,
      intervaloAniversarioSegundos:safeNumber(body.intervaloAniversarioSegundos,data.config.intervaloAniversarioSegundos||DEFAULT_BIRTHDAY_INTERVAL_SECONDS,MIN_AUTOMATED_BIRTHDAY_INTERVAL_SECONDS,600),
      atualizadoEm:now(),version:MODULE_VERSION
    };
    writeJson(req.app,'config.json',config);
    addLog(req.app,'aniversario_config_atualizada','Configurações de aniversariantes atualizadas.',{ativo:config.aniversariantesAtivo,horario:config.horarioAniversario,intervalo:config.intervaloAniversarioSegundos});
    flash(res,'/automacao-whatsapp?tab=aniversariantes','🎂 Configurações de aniversariantes salvas.');
  }catch(error){ flash(res,'/automacao-whatsapp?tab=aniversariantes',error.message||'Não foi possível salvar as configurações.'); }
});
router.get('/aniversariantes/simular', (req,res)=>{
  try{
    const data=loadAll(req.app),dashboard=getBirthdayDashboard(req.app,data.config);
    const intervalSeconds=Math.max(MIN_AUTOMATED_BIRTHDAY_INTERVAL_SECONDS,safeNumber(data.config.intervaloAniversarioSegundos,DEFAULT_BIRTHDAY_INTERVAL_SECONDS,0,600));
    const eligible=dashboard.rows.filter(row=>row.status==='pendente'||row.status==='erro').length;
    const estimatedSeconds=Math.max(0,(eligible-1)*intervalSeconds);
    res.set('Cache-Control','no-store');
    res.json({
      success:true,date:dashboard.date,total:dashboard.total,sent:dashboard.sent,pending:dashboard.pending,noPhone:dashboard.noPhone,eligible,
      scheduledTime:data.config.horarioAniversario||'08:00',intervalSeconds,estimatedSeconds,
      whatsappConnected:Boolean(waState.client&&waState.status==='conectado'),whatsappStatus:waState.status||'desconectado',
      automationEnabled:Boolean(data.config.aniversariantesAtivo),
      rows:dashboard.rows.map(row=>({id:row.id,name:row.name,phone:row.phone,status:row.status,birthDate:row.birthDate,error:row.error||'',message:row.message||''}))
    });
  }catch(error){ res.status(400).json({success:false,message:error.message||'Falha ao simular aniversariantes.'}); }
});
router.post('/aniversariantes/testar', async (req,res)=>{
  try{
    if(!waState.client || waState.status!=='conectado') throw new Error('Conecte o WhatsApp antes de enviar o teste.');
    const numero=safeText(req.body?.numero,30);
    const nome=safeText(req.body?.nome||'João da Silva',160);
    const template=safeText(req.body?.mensagem,4000) || loadAll(req.app).config.mensagemAniversario || DEFAULT_BIRTHDAY_MESSAGE;
    const message=renderBirthdayMessage(template,{name:nome});
    const {digits,chatId}=await resolveChatId(numero);
    const sentMessage=await waState.client.sendMessage(chatId,message);
    addLog(req.app,'aniversario_teste_enviado','Teste da mensagem de aniversário enviado.',{telefone:digits,nome,whatsappMessageId:sentMessage?.id?._serialized||null});
    res.json({success:true,message:`Teste enviado para +${digits}. Nenhum aniversariante foi marcado como enviado.`});
  }catch(error){
    addLog(req.app,'aniversario_teste_erro','Falha no teste da mensagem de aniversário.',{erro:error.message});
    res.status(400).json({success:false,message:error.message||'Falha ao enviar o teste.'});
  }
});
router.post('/aniversariantes/atrasados/reenviar/:customerId', async (req,res)=>{
  try{
    const customerId=safeText(req.params?.customerId,160);
    if(!customerId) return res.status(400).json({success:false,message:'Cliente inválido.'});
    const result=await sendMissedBirthdayCustomer(req.app,customerId,req.body?.mensagem||'');
    if(!result.success) return res.status(result.skipped?409:400).json(result);
    return res.json({success:true,message:`Mensagem atrasada enviada para ${result.customerName} (+${result.phone}), referente ao aniversário de ${result.dateLabel}.`,result});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Falha ao enviar a mensagem de aniversário atrasada.'});
  }
});
router.post('/aniversariantes/atrasados/enviar-todos', async (req,res)=>{
  try{
    const result=await processMissedBirthdayRun(req.app,req.body?.mensagem||'');
    if(!result.success) return res.status(result.skipped?409:400).json(result);
    return res.json({success:true,message:`Recuperação manual de ${result.dateLabel}: ${result.sent} enviado(s), ${result.alreadySent} já enviado(s), ${result.noPhone} sem telefone e ${result.errors} erro(s).`,result});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Falha ao recuperar os aniversários do dia anterior.'});
  }
});

router.post('/aniversariantes/reenviar/:customerId', async (req,res)=>{
  try{
    const customerId=safeText(req.params?.customerId,160);
    if(!customerId) return res.status(400).json({success:false,message:'Cliente inválido.'});
    const result=await resendBirthdayCustomer(req.app,customerId);
    if(!result.success) return res.status(result.skipped?409:400).json(result);
    return res.json({success:true,message:`Mensagem enviada para ${result.customerName} (+${result.phone}).`,result});
  }catch(error){
    return res.status(400).json({success:false,message:error.message||'Falha ao reenviar a mensagem de aniversário.'});
  }
});

router.post('/aniversariantes/executar-agora', async (req,res)=>{
  try{
    const result=await processBirthdayRun(req.app,{source:'manual',force:false});
    if(!result.success) return res.status(409).json(result);
    res.json({success:true,message:`Rotina concluída: ${result.sent} enviado(s), ${result.alreadySent} já enviado(s), ${result.noPhone} sem telefone e ${result.errors} erro(s).`,result});
  }catch(error){ res.status(400).json({success:false,message:error.message||'Falha ao executar aniversariantes.'}); }
});

router.get('/whatsapp/provider/status', (req,res) => {
  try{
    const provider=ensureWhatsAppProvider();
    return res.json({ success:true, provider:provider.status() });
  }catch(error){
    return res.status(500).json({ success:false, error:error?.message || String(error) });
  }
});

router.post('/whatsapp/provider/testar-chats-safe', async (req,res) => {
  try{
    if(!waState.client || waState.status!=='conectado'){
      return res.status(409).json({ success:false, error:'Conecte o WhatsApp antes de testar o Provider.' });
    }
    const provider=ensureWhatsAppProvider();
    const result=await provider.getChatsSafe();
    addLog(req.app,'provider_teste_concluido','Teste manual do WhatsApp Provider concluído.',result.stats);
    return res.json({
      success:true,
      provider:provider.status(),
      stats:result.stats,
      errors:result.errors,
      chats:result.chats
    });
  }catch(error){
    addLog(req.app,'provider_teste_falhou','Falha no teste manual do WhatsApp Provider.',{erro:error?.message || String(error)});
    return res.status(500).json({ success:false, error:error?.message || String(error) });
  }
});

async function destroyCurrentClient({logout=false,clearSession=false}={}){
  clearReadyWatchdog();
  const client=waState.client;
  if(client){
    if(logout&&typeof client.logout==='function'){try{await client.logout();}catch{}}
    try{await client.destroy();}catch{}
  }
  waState.client=null;
  waState.provider?.setClient(null);
  waState.mediaEngine?.setClient(null);
  waState.messageCache.clear();
  if(clearSession&&waState.app){try{fs.rmSync(authDir(waState.app),{recursive:true,force:true});}catch{}}
}

router.get('/whatsapp/diagnostico', async (req,res)=>{
  try{
    const provider=ensureWhatsAppProvider();
    const adapter=await provider.adapter.diagnose();
    const media=await ensureMediaEngine().diagnose();
    res.set('Cache-Control','no-store');
    return res.json({success:true,version:MODULE_VERSION,session:publicWaState(),provider:provider.status(),adapter,media});
  }catch(error){return res.status(500).json({success:false,message:error?.message||String(error)});}
});
router.post('/whatsapp/reiniciar', async (req,res)=>{
  try{
    await destroyCurrentClient();
    setWaState('reiniciando','Reiniciando a conexão sem apagar a sessão local.',{initialized:false,starting:false,qrDataUrl:null,connectedSince:null});
    await createClient(req.app);
    addLog(req.app,'whatsapp_reinicio_manual','Reinício controlado da sessão solicitado pelo painel.');
    return res.json({success:true,whatsapp:publicWaState()});
  }catch(error){return res.status(500).json({success:false,message:error?.message||String(error),whatsapp:publicWaState()});}
});
router.post('/whatsapp/novo-qr', async (req,res)=>{
  try{
    await destroyCurrentClient({logout:true,clearSession:true});
    clearInboxAccount(req.app);
    setWaState('iniciando','Sessão anterior removida. Gerando um novo QR Code...',{initialized:false,starting:false,qrDataUrl:null,connectedNumber:null,connectedName:null,connectedSince:null,authenticatedAt:null});
    await createClient(req.app);
    addLog(req.app,'whatsapp_novo_qr_manual','Nova autenticação e QR Code solicitados pelo painel.');
    return res.json({success:true,whatsapp:publicWaState()});
  }catch(error){return res.status(500).json({success:false,message:error?.message||String(error),whatsapp:publicWaState()});}
});

router.get('/whatsapp/status', (req,res)=> res.json({ success:true, whatsapp: publicWaState() }));
router.post('/whatsapp/conectar', async (req,res)=>{
  try {
    await createClient(req.app);
    res.json({ success:true, whatsapp: publicWaState() });
  } catch(error){
    res.status(500).json({ success:false, message:error.message || 'Falha ao conectar.', whatsapp: publicWaState() });
  }
});
router.post('/whatsapp/desconectar', async (req,res)=>{
  try {
    await destroyCurrentClient();
    clearInboxAccount(req.app);
    setWaState('desconectado', 'WhatsApp desconectado manualmente. A sessão local foi preservada.', { qrDataUrl:null, connectedNumber:null, connectedName:null, initialized:false, starting:false, connectedSince:null });
    const data = loadAll(req.app);
    writeJson(req.app, 'config.json', { ...data.config, whatsappConectado:false, atualizadoEm:now(), version:MODULE_VERSION });
    addLog(req.app, 'whatsapp_desconectado_manual', 'Cliente WhatsApp desconectado manualmente.');
    res.json({ success:true, whatsapp: publicWaState() });
  } catch(error){
    res.status(500).json({ success:false, message:error.message || 'Falha ao desconectar.' });
  }
});
router.post('/whatsapp/enviar', (req,res)=>{
  upload.single('arquivo')(req,res,async(error)=>{
    if(error) return res.status(400).json({success:false,message:error.message||'Falha no upload.'});
    try {
      const numero = safeText(req.body?.numero, 30);
      const texto = safeText(req.body?.texto, 4000);
      if(!texto && !req.file) throw new Error('Digite um texto ou selecione uma imagem/áudio/arquivo.');
      const { digits, chatId } = await resolveChatId(numero);
      if(req.file){
        const media = MessageMedia.fromFilePath(req.file.path);
        const isAudio = req.file.mimetype.startsWith('audio/');
        await waState.client.sendMessage(chatId, media, { caption: isAudio ? undefined : (texto || undefined), sendAudioAsVoice: isAudio });
        if(isAudio && texto) await waState.client.sendMessage(chatId, texto);
        addLog(req.app, 'envio_manual_midia', `Mídia enviada manualmente para ${digits}.`, { numero:digits, arquivo:req.file.originalname, mime:req.file.mimetype });
      } else {
        await waState.client.sendMessage(chatId, texto);
        addLog(req.app, 'envio_manual_texto', `Texto enviado manualmente para ${digits}.`, { numero:digits });
      }
      const data = loadAll(req.app);
      writeJson(req.app, 'config.json', { ...data.config, numeroTeste:digits, atualizadoEm:now(), version:MODULE_VERSION });
      res.json({ success:true, message:'Envio concluído com sucesso.', numero:digits });
    } catch(sendError){
      addLog(req.app, 'envio_manual_erro', 'Falha no envio manual.', { erro:sendError.message });
      res.status(400).json({success:false,message:sendError.message||'Falha no envio.'});
    }
  });
});
router.post('/whatsapp/executar-bloco', async (req,res)=>{
  try {
    const data = loadAll(req.app);
    const blocoId = safeText(req.body?.blocoId, 120);
    const bloco = data.blocos.find(item => item.id === blocoId);
    if(!bloco) throw new Error('Bloco não encontrado.');
    if(!bloco.ativo) throw new Error('Este bloco está inativo.');
    const result = await executeBlock(req.app, req.body?.numero, bloco);
    writeJson(req.app, 'config.json', { ...data.config, numeroTeste:result.digits, atualizadoEm:now(), version:MODULE_VERSION });
    res.json({ success:true, message:result.waitingChoice?`Bloco “${bloco.nome}” enviado. Aguardando escolha do cliente.`:`Bloco “${bloco.nome}” concluído com ${result.total} etapa(s).`, waitingChoice:!!result.waitingChoice, sentMessages:Array.isArray(result.sentMessages)?result.sentMessages:[] });
  } catch(error){
    addLog(req.app, 'bloco_envio_erro', 'Falha ao executar bloco.', { erro:error.message, blocoId:safeText(req.body?.blocoId,120) });
    res.status(400).json({success:false,message:error.message||'Falha ao executar bloco.'});
  }
});


router.post('/palavras-chave/salvar',(req,res)=>{
  try{
    const data=keywordRulesData(req.app);
    const body=req.body||{};
    const id=safeText(body.id||makeId('keyword'),100);
    const palavras=splitKeywordInput(body.palavras);
    const blocoId=safeText(body.blocoId,120);
    const modo=['contem','igual','comeca'].includes(body.modo)?body.modo:'contem';
    if(!palavras.length) throw new Error('Informe ao menos uma palavra ou frase que deve acionar a automação.');
    const bloco=findBlockByReference(req.app,blocoId);
    if(!bloco) throw new Error('Selecione um bloco válido para executar.');
    const existing=data.items.find(item=>item.id===id);
    const rule={
      id,nome:safeText(body.nome,160)||bloco.nome,modo,palavras,blocoId,
      ativo:body.ativo==='on'||body.ativo==='true',
      execucoes:Number(existing?.execucoes||0),
      criadoEm:existing?.criadoEm||now(),atualizadoEm:now(),
      ultimoAcionamentoEm:existing?.ultimoAcionamentoEm||null,
      ultimaMensagem:existing?.ultimaMensagem||''
    };
    const index=data.items.findIndex(item=>item.id===id);
    if(index>=0) data.items[index]=rule; else data.items.push(rule);
    saveKeywordRulesData(req.app,data);
    addLog(req.app,'palavra_chave_salva',`Regra de palavra-chave salva: ${rule.nome}.`,{regraId:rule.id,blocoId:rule.blocoId,palavras:rule.palavras,modo:rule.modo,ativo:rule.ativo});
    flash(res,'/automacao-whatsapp?tab=palavras-chave','⚡ Automação salva.');
  }catch(error){ flash(res,'/automacao-whatsapp?tab=palavras-chave',error.message||'Não foi possível salvar a palavra-chave.'); }
});
router.post('/palavras-chave/toggle/:id',(req,res)=>{
  try{
    const data=keywordRulesData(req.app),id=safeText(req.params.id,100);
    const rule=data.items.find(item=>item.id===id);
    if(!rule) throw new Error('Regra não encontrada.');
    rule.ativo=!rule.ativo;rule.atualizadoEm=now();saveKeywordRulesData(req.app,data);
    addLog(req.app,'palavra_chave_status',`Regra ${rule.ativo?'ativada':'desativada'}: ${rule.nome}.`,{regraId:rule.id});
    flash(res,'/automacao-whatsapp?tab=palavras-chave',rule.ativo?'✅ Automação ativada.':'⏸️ Automação desativada.');
  }catch(error){flash(res,'/automacao-whatsapp?tab=palavras-chave',error.message||'Não foi possível alterar a regra.');}
});
router.post('/palavras-chave/excluir/:id',(req,res)=>{
  try{
    const data=keywordRulesData(req.app),id=safeText(req.params.id,100);
    const rule=data.items.find(item=>item.id===id);
    if(!rule) throw new Error('Regra não encontrada.');
    data.items=data.items.filter(item=>item.id!==id);saveKeywordRulesData(req.app,data);
    addLog(req.app,'palavra_chave_excluida',`Regra de palavra-chave excluída: ${rule.nome}.`,{regraId:id});
    flash(res,'/automacao-whatsapp?tab=palavras-chave','🗑️ Automação removida.');
  }catch(error){flash(res,'/automacao-whatsapp?tab=palavras-chave',error.message||'Não foi possível remover a regra.');}
});
router.post('/palavras-chave/mover/:id',(req,res)=>{
  try{
    const data=keywordRulesData(req.app),id=safeText(req.params.id,100),direction=safeText(req.body?.direction,10);
    const index=data.items.findIndex(item=>item.id===id);
    if(index<0) throw new Error('Regra não encontrada.');
    const target=direction==='up'?index-1:index+1;
    if(target>=0&&target<data.items.length){[data.items[index],data.items[target]]=[data.items[target],data.items[index]];saveKeywordRulesData(req.app,data);}
    flash(res,'/automacao-whatsapp?tab=palavras-chave','↕️ Prioridade da automação atualizada.');
  }catch(error){flash(res,'/automacao-whatsapp?tab=palavras-chave',error.message||'Não foi possível reordenar a regra.');}
});

router.post('/blocos/salvar', (req,res)=>{
  const data = loadAll(req.app);
  const body = req.body || {};
  const id = safeText(body.id || makeId('bloco'), 120);
  const existing = data.blocos.find(b => b.id === id);
  const bloco = {
    id,
    nome: safeText(body.nome, 160) || 'Bloco sem nome',
    descricao: safeText(body.descricao, 500),
    gatilho: safeText(body.gatilho, 120),
    categoria: safeText(body.categoria || 'Geral', 80) || 'Geral',
    favorito: body.favorito === 'on' || body.favorito === 'true' || existing?.favorito === true,
    ativo: body.ativo === 'on' || body.ativo === 'true',
    etapas: normalizeSteps(body.etapasJson),
    criadoEm: existing?.criadoEm || now(),
    atualizadoEm: now()
  };
  const idx = data.blocos.findIndex(b => b.id === id);
  if(idx >= 0) data.blocos[idx] = bloco; else data.blocos.unshift(bloco);
  writeJson(req.app, 'blocos.json', data.blocos);
  addLog(req.app, existing ? 'bloco_editado' : 'bloco_criado', `${existing ? 'Bloco editado' : 'Bloco criado'}: ${bloco.nome}`, { blocoId:id });
  flash(res, '/automacao-whatsapp?tab=blocos', '💬 Bloco salvo com sucesso.');
});

router.post('/blocos/favorito/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  const bloco = data.blocos.find(b => b.id === id);
  if(!bloco) return flash(res, '/automacao-whatsapp?tab=blocos', '⚠️ Bloco não encontrado.');
  bloco.favorito = !bloco.favorito;
  bloco.atualizadoEm = now();
  writeJson(req.app, 'blocos.json', data.blocos);
  addLog(req.app, 'bloco_favorito', `${bloco.favorito ? 'Bloco favoritado' : 'Bloco removido dos favoritos'}: ${bloco.nome}`, { blocoId:id });
  flash(res, '/automacao-whatsapp?tab=blocos', bloco.favorito ? '⭐ Bloco adicionado aos favoritos.' : 'Bloco removido dos favoritos.');
});

router.post('/blocos/excluir/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  const removido = data.blocos.find(b => b.id === id);
  writeJson(req.app, 'blocos.json', data.blocos.filter(b => b.id !== id));
  if(removido) addLog(req.app, 'bloco_excluido', `Bloco excluído: ${removido.nome}`, { blocoId:id });
  flash(res, '/automacao-whatsapp?tab=blocos', '🗑️ Bloco removido.');
});
router.post('/blocos/duplicar/:id', (req,res)=>{
  const data=loadAll(req.app); const original=data.blocos.find(b=>b.id===safeText(req.params.id,120));
  if(!original) return flash(res,'/automacao-whatsapp?tab=blocos','⚠️ Bloco não encontrado.');
  const copia={...original,id:makeId('bloco'),nome:safeText(original.nome+' (cópia)',160),gatilho:'',etapas:(original.etapas||[]).map(e=>({...e,id:makeId('etapa')})),criadoEm:now(),atualizadoEm:now()};
  data.blocos.unshift(copia); writeJson(req.app,'blocos.json',data.blocos); addLog(req.app,'bloco_duplicado',`Bloco duplicado: ${original.nome}`,{blocoId:copia.id,origemId:original.id});
  flash(res,'/automacao-whatsapp?tab=blocos&edit='+encodeURIComponent(copia.id),'📄 Bloco duplicado com sucesso.');
});
router.post('/midias/upload', (req,res)=>{
  upload.single('arquivo')(req,res,(error)=>{
    if(error) return res.status(400).json({success:false,message:error.message||'Falha no upload.'});
    if(!req.file) return res.status(400).json({success:false,message:'Nenhum arquivo recebido.'});
    const data = loadAll(req.app);
    const kind = req.qwMediaKind || mediaKindFromMime(req.file.mimetype);
    const tipo = stepTypeFromMime(req.file.mimetype);
    const media = {
      id: makeId('midia'), nome: safeText(req.file.originalname, 180), tipo, categoria: kind,
      caminho: blockMediaUrl(kind, req.file.filename), arquivo: req.file.filename,
      mime: req.file.mimetype, tamanho: req.file.size, criadoEm: now(), atualizadoEm: now()
    };
    data.midias.unshift(media);
    writeJson(req.app, 'midias.json', data.midias);
    const payload={success:true,tipo,caminho:media.caminho,mediaId:media.id,nomeOriginal:req.file.originalname,tamanho:req.file.size,mime:req.file.mimetype};
    addLog(req.app,'midia_upload',`Mídia oficial adicionada: ${req.file.originalname}`,{mediaId:media.id,caminho:payload.caminho,mime:payload.mime});
    res.json(payload);
  });
});

router.get('/midias/download/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  const media = data.midias.find(m => m.id === id);
  if(!media) return res.status(404).send('Mídia não encontrada.');

  const absolute = localMediaPath(req.app, media.caminho);
  if(!fs.existsSync(absolute)) return res.status(404).send('Arquivo físico não encontrado.');

  const ext = path.extname(absolute);
  const requestedName = safeText(media.nome || media.arquivo || ('midia' + ext), 180)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim() || ('midia' + ext);

  addLog(req.app, 'midia_download', `Download da mídia: ${requestedName}`, { mediaId:media.id });
  return res.download(absolute, requestedName);
});

router.post('/midias/excluir/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  const media = data.midias.find(m => m.id === id);
  if(!media) return flash(res, '/automacao-whatsapp?tab=midias', '⚠️ Mídia não encontrada.');
  const usos = mediaUsage(data.blocos, media);
  if(usos.length) return flash(res, '/automacao-whatsapp?tab=midias', `⚠️ Esta mídia está em uso por ${usos.length} bloco(s) e não pode ser excluída.`);
  try{ const absolute = localMediaPath(req.app, media.caminho); if(fs.existsSync(absolute)) fs.unlinkSync(absolute); }catch{}
  writeJson(req.app, 'midias.json', data.midias.filter(m => m.id !== id));
  addLog(req.app, 'midia_excluida', `Mídia excluída: ${media.nome}`, { mediaId:id });
  flash(res, '/automacao-whatsapp?tab=midias', '🗑️ Mídia excluída com segurança.');
});
router.post('/simulador/log',(req,res)=>{ addLog(req.app,'simulacao',`Fluxo simulado: ${safeText(req.body?.nome||'Bloco em edição',160)}`,{blocoId:safeText(req.body?.blocoId||'',120)}); res.json({success:true}); });

router.post('/armazenamento/limpar', (req,res)=>{
  try {
    const action=safeText(req.body?.action,30);
    const allowed=new Set(['orphans','groups','older30','older90','all_media','empty_dirs']);
    if(!allowed.has(action)) throw new Error('Ação de limpeza inválida.');
    const result=cleanInboxStorage(req.app,action);
    addLog(req.app,'inbox_armazenamento_limpeza','Limpeza manual do armazenamento do Inbox executada.',result);
    const details=result.removedFiles ? `${result.removedFiles} arquivo(s) removido(s), ${result.freedLabel} liberados.` : `${result.removedDirs||0} pasta(s) vazia(s) removida(s).`;
    flash(res,'/automacao-whatsapp?tab=configuracoes&section=armazenamento',`🧹 Limpeza concluída: ${details}`);
  } catch(error){
    flash(res,'/automacao-whatsapp?tab=configuracoes&section=armazenamento',error.message||'Não foi possível executar a limpeza.');
  }
});

router.get('/armazenamento/relatorio', (req,res)=>{
  try { res.set('Cache-Control','no-store'); res.json({success:true,report:getInboxStorageReport(req.app)}); }
  catch(error){ res.status(500).json({success:false,message:error.message||'Falha ao analisar o armazenamento.'}); }
});

router.post('/configuracoes/salvar', (req,res)=>{
  const data = loadAll(req.app);
  const body = req.body || {};
  const config = {
    ...data.config,
    numeroTeste: safeText(body.numeroTeste || data.config.numeroTeste || '', 30).replace(/\D/g, ''),
    horarioAniversario: safeText(body.horarioAniversario || data.config.horarioAniversario || '08:00', 20),
    mensagemAniversario: data.config.mensagemAniversario || DEFAULT_BIRTHDAY_MESSAGE,
    aniversariantesAtivo: Boolean(data.config.aniversariantesAtivo),
    intervaloAniversarioSegundos: safeNumber(data.config.intervaloAniversarioSegundos,DEFAULT_BIRTHDAY_INTERVAL_SECONDS,MIN_AUTOMATED_BIRTHDAY_INTERVAL_SECONDS,600),
    limiteDiario: safeNumber(body.limiteDiario, 40, 1, 1000),
    delayHumanoMin: safeNumber(body.delayHumanoMin, 4, 0, 600),
    delayHumanoMax: safeNumber(body.delayHumanoMax, 12, 0, 600),
    digitandoPadrao: safeNumber(body.digitandoPadrao, 2, 0, 180),
    gravandoAudioPadrao: safeNumber(body.gravandoAudioPadrao, 2, 0, 180),
    envioRealAtivo: body.envioRealAtivo === 'on' || body.envioRealAtivo === 'true',
    whatsappConectado: waState.status === 'conectado',
    atualizadoEm: now(), version: MODULE_VERSION
  };
  if(config.delayHumanoMax < config.delayHumanoMin) config.delayHumanoMax = config.delayHumanoMin;
  writeJson(req.app, 'config.json', config);
  addLog(req.app, 'config_atualizada', 'Configurações da Automação WhatsApp atualizadas.');
  flash(res, '/automacao-whatsapp?tab=configuracoes', '⚙️ Configurações salvas.');
});


export function listWhatsAppConversations(app){
  try{
    ensureInboxStorage(app);
    const data=getInboxData(app);
    return (data.conversations||[]).filter(item=>!isGroupConversation(item)).map(item=>({
      id:item.id,name:item.name||item.phone||'Contato',phone:item.phone||'',phoneResolved:Boolean(item.phoneResolved),whatsappId:item.whatsappId||''
    }));
  }catch{return [];}
}

export async function sendWhatsAppMediaToConversation(app,conversationId,{buffer,mimetype='application/octet-stream',filename='arquivo',caption=''}={}){
  const cleanId=safeConversationId(conversationId);
  if(!cleanId) throw new Error('Conversa não identificada.');
  if(!buffer || !Buffer.isBuffer(buffer)) throw new Error('Arquivo do comprovante não foi gerado.');
  if(!waState.client || waState.status !== 'conectado') throw new Error('Conecte o WhatsApp antes de enviar.');
  const inboxData=getInboxData(app);
  const conversation=inboxData.conversations.find(item=>item.id===cleanId);
  if(!conversation) throw new Error('Conversa não encontrada no Inbox.');
  const destination=await resolveInboxDestination(conversation);
  const media=new MessageMedia(mimetype,buffer.toString('base64'),filename);
  const sent=await waState.client.sendMessage(destination.chatId,media,{caption:caption||undefined});
  addLog(app,'comprovante_recebimento_whatsapp','Comprovante de recebimento enviado pelo Quality ERP.',{conversa:conversation.id,nome:conversation.name||destination.label,arquivo:filename,whatsappMessageId:sent?.id?._serialized||null});
  return {success:true,messageId:sent?.id?._serialized||null};
}

export async function sendWhatsAppTextToConversation(app,conversationId,text){
  const cleanId=safeConversationId(conversationId);
  const cleanText=safeText(text,4000);
  if(!cleanId) throw new Error('Conversa não identificada.');
  if(!cleanText) throw new Error('A mensagem do orçamento está vazia.');
  const inboxData=getInboxData(app);
  const conversation=inboxData.conversations.find(item=>item.id===cleanId);
  if(!conversation) throw new Error('Conversa não encontrada no Inbox.');
  const destination=await resolveInboxDestination(conversation);
  const sent=await waState.client.sendMessage(destination.chatId,cleanText);
  addLog(app,'orcamento_whatsapp_enviado','Orçamento enviado manualmente pelo Workspace de Orçamentos.',{
    conversa:conversation.id,nome:conversation.name||destination.label,telefone:destination.digits||null,whatsappMessageId:sent?.id?._serialized||null
  });
  return {success:true,messageId:sent?.id?._serialized||null};
}

export default router;
