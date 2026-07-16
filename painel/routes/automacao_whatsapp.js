import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import qrcode from 'qrcode';
import whatsappWeb from 'whatsapp-web.js';
import WhatsAppProvider from '../services/whatsapp/WhatsAppProvider.js';
import { ensureInboxStorage, getInboxSummary, getCommercialDashboard, getInboxData, getConversationMessages, getInboxRevision, registerWhatsAppMessage, updateInboxContact, repairInboxIdentities, repairInboxContactNames, markConversationRead, markConversationUnread, getInboxMediaFile, storeInboxMediaFile, repairInboxGroupNames, syncInboxFromWhatsApp, getInboxStorageReport, cleanInboxStorage } from '../services/whatsapp_inbox.js';

const { Client, LocalAuth, MessageMedia } = whatsappWeb;
const router = express.Router();
const MODULE_VERSION = '0.6.3.3-provider-v1.0.1';

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
  readyWatchdog: null,
  recoveryAttempts: 0,
  syncing:false,
  lastSyncAt:null,
  messageCache:new Map(),
  provider:null
};

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
    lastSyncAt:waState.lastSyncAt
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
          { id: makeId('etapa'), tipo: 'opcoes', texto: 'Responda com o número desejado:', opcoes: [
            { label: '1️⃣ Smartphones', resposta: '1', proximoBloco: 'Smartphones' },
            { label: '2️⃣ Assistência', resposta: '2', proximoBloco: 'Assistência' }
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
      horarioAniversario: '08:00',
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
  if(!fs.existsSync(filePath(app, 'config.json'))) writeJson(app, 'config.json', d.config);
}
function syncLegacyMediaCatalog(app, blocos, midias){
  const list = Array.isArray(midias) ? [...midias] : [];
  const knownPaths = new Set(list.map(m => m.caminho).filter(Boolean));
  let changed = false;
  for(const bloco of blocos || []){
    for(const step of bloco.etapas || []){
      if(!['imagem','audio','video','arquivo'].includes(step.tipo) || !step.caminho || knownPaths.has(step.caminho)) continue;
      const absolute = localMediaPath(app, step.caminho);
      let tamanho = 0;
      try{ if(fs.existsSync(absolute)) tamanho = fs.statSync(absolute).size; }catch{}
      const nome = path.basename(String(step.caminho).split('?')[0]) || 'Mídia antiga';
      const media = { id:makeId('midia'), nome, tipo:step.tipo, categoria:step.tipo === 'imagem'?'imagens':step.tipo === 'audio'?'audios':step.tipo === 'video'?'videos':'arquivos', caminho:step.caminho, arquivo:nome, mime:'', tamanho, legado:true, criadoEm:now(), atualizadoEm:now() };
      list.push(media); knownPaths.add(step.caminho); step.mediaId = media.id; changed = true;
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
    config: { ...d.config, ...readJson(app, 'config.json', d.config), version: MODULE_VERSION }
  };
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
      const opcoes = Array.isArray(s.opcoes) ? s.opcoes.slice(0, 10).map(o => ({
        label: safeText(o.label, 120), resposta: safeText(o.resposta, 30), proximoBloco: safeText(o.proximoBloco, 120)
      })).filter(o => o.label || o.resposta || o.proximoBloco) : [];
      return { ...base, texto: safeText(s.texto, 1500), opcoes };
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
  if((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) digits = '55' + digits;
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
async function executeBlockToChat(app, destination, bloco){
  if(waState.blockRunning) throw new Error('Já existe um bloco em execução. Aguarde a conclusão.');
  const { digits='', chatId, label='' } = destination;
  waState.blockRunning = true;
  addLog(app, 'bloco_envio_inicio', `Início do bloco: ${bloco.nome}`, { blocoId: bloco.id, numero: digits || null, destino: label || chatId });
  try {
    for(let index = 0; index < (bloco.etapas || []).length; index += 1){
      const step = bloco.etapas[index] || {};
      if(step.tipo === 'texto'){
        const seconds = safeNumber(step.digitandoSegundos, 0, 0, 180);
        if(seconds > 0){
          const chat = await waState.client.getChatById(chatId);
          await chat.sendStateTyping();
          await sleep(seconds * 1000);
          await chat.clearState();
        }
        if(step.texto) await waState.client.sendMessage(chatId, step.texto);
      } else if(step.tipo === 'pausa'){
        await sleep(safeNumber(step.segundos, 0, 0, 600) * 1000);
      } else if(step.tipo === 'imagem' || step.tipo === 'video' || step.tipo === 'arquivo'){
        await sendMediaFromPath(app, chatId, step.caminho, step.legenda || '');
      } else if(step.tipo === 'audio'){
        const seconds = safeNumber(step.gravandoSegundos, 0, 0, 180);
        if(seconds > 0){
          const chat = await waState.client.getChatById(chatId);
          await chat.sendStateRecording();
          await sleep(seconds * 1000);
          await chat.clearState();
        }
        await sendMediaFromPath(app, chatId, step.caminho, '', { sendAudioAsVoice: true });
        if(step.legenda) await waState.client.sendMessage(chatId, step.legenda);
      } else if(step.tipo === 'opcoes'){
        await waState.client.sendMessage(chatId, optionsAsText(step));
      }
      addLog(app, 'bloco_etapa_enviada', `Etapa ${index + 1} enviada: ${step.tipo}`, { blocoId: bloco.id, numero: digits || null, destino: label || chatId, etapaId: step.id });
    }
    addLog(app, 'bloco_envio_sucesso', `Bloco concluído: ${bloco.nome}`, { blocoId: bloco.id, numero: digits || null, destino: label || chatId });
    return { digits, total: (bloco.etapas || []).length };
  } finally {
    waState.blockRunning = false;
  }
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
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'quality-teste', dataPath: authDir(app), rmMaxRetries: 5 }),
    puppeteer: {
      headless: true,
      executablePath: chromePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });
  waState.client = client;
  ensureWhatsAppProvider().connect(client);

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
    setWaState('conectado', 'WhatsApp conectado e pronto para envios manuais.', {
      qrDataUrl: null, connectedNumber: number, connectedName: name, initialized: true, starting: false, lastError: null
    });
    const data = loadAll(app);
    writeJson(app, 'config.json', { ...data.config, whatsappConectado: true, atualizadoEm: now(), version: MODULE_VERSION });
    addLog(app, 'whatsapp_conectado', 'WhatsApp conectado com sucesso.', { numero: number, nome: name });
    try{
      waState.syncing=true;
      const sync=await syncInboxFromWhatsApp(app,client,{chatLimit:120,messageLimit:60,onMessage:cacheWhatsAppMessage});
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
      const names = await repairInboxContactNames(app, client);
      if(names.updated) addLog(app, 'inbox_nomes_corrigidos', 'Nomes automáticos dos contatos foram revisados com base no chat remoto.', names);
      if(names.unresolved) addLog(app, 'inbox_nomes_pendentes', 'Alguns contatos ainda aguardam um nome remoto confiável.', names);
    } catch(error){
      addLog(app, 'inbox_erro_nomes', 'Falha ao revisar nomes automáticos dos contatos.', { erro:error.message });
    }
    try {
      const groups = await repairInboxGroupNames(app, client);
      if(groups.updated) addLog(app, 'inbox_grupos_corrigidos', 'Títulos reais dos grupos foram atualizados.', groups);
      if(groups.unresolved) addLog(app, 'inbox_grupos_pendentes', 'Alguns grupos ainda aguardam título real do WhatsApp.', groups);
    } catch(error){
      addLog(app, 'inbox_erro_grupos', 'Falha ao revisar nomes dos grupos.', { erro:error.message });
    }
  });
  client.on('auth_failure', (message) => {
    clearReadyWatchdog();
    setWaState('erro', 'Falha de autenticação. Será necessário conectar novamente.', { lastError: String(message), starting: false, initialized: false });
    addLog(app, 'whatsapp_auth_falhou', 'Falha na autenticação do WhatsApp.', { erro: String(message) });
  });
  client.on('disconnected', (reason) => {
    clearReadyWatchdog();
    setWaState('desconectado', 'WhatsApp desconectado.', { connectedNumber: null, connectedName: null, initialized: false, starting: false });
    waState.client = null;
    if(waState.provider) waState.provider.setClient(null);
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
      if(result?.saved && message?.hasMedia) persistMessageMedia(app,message,result);
      if(result?.saved){
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
    await client.initialize();
  } catch (error) {
    waState.client = null;
    setWaState('erro', 'Não foi possível abrir o WhatsApp Web.', { lastError: error.message, starting: false, initialized: false });
    addLog(app, 'whatsapp_erro', 'Falha ao inicializar o WhatsApp.', { erro: error.message });
    throw error;
  }
}

export async function initializeWhatsApp(app){
  waState.app = app;
  ensureData(app);
  ensureInboxStorage(app);
  const sessionPath = path.join(authDir(app), 'session-quality-teste');
  if(fs.existsSync(sessionPath)){
    try { await createClient(app); } catch { /* erro já registrado */ }
  }
}

export async function shutdownWhatsApp(){
  clearReadyWatchdog();
  if(!waState.client) return;
  try { await waState.client.destroy(); } catch { /* encerramento do painel */ }
  waState.client = null;
  if(waState.provider) waState.provider.setClient(null);
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
    const found = (bloco.etapas || []).some(e => (media.id && e.mediaId === media.id) || (media.caminho && e.caminho === media.caminho));
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
function inboxMediaOptions(mime=''){
  const isAudio=String(mime).startsWith('audio/');
  return { isAudio, options:isAudio ? { sendAudioAsVoice:true } : {} };
}



router.get('/', (req,res)=>{
  const data = loadAll(req.app);
  ensureInboxStorage(req.app);
  let inboxData = getInboxData(req.app);
  const selectedConversationId = safeConversationId(req.query.conversation || '');
  if(selectedConversationId){
    try { markConversationRead(req.app, selectedConversationId); } catch {}
    inboxData = getInboxData(req.app);
  }
  const inboxSummary = getInboxSummary(req.app);
  const commercialDashboard = getCommercialDashboard(req.app);
  const storageReport = getInboxStorageReport(req.app);
  const selectedConversation = inboxData.conversations.find(c => c.id === selectedConversationId) || null;
  const selectedMessages = selectedConversation ? getConversationMessages(req.app, selectedConversation.id) : [];
  const tab = safeText(req.query.tab || 'dashboard', 30);
  const editId = safeText(req.query.edit || '', 120);
  const blocoEdit = data.blocos.find(b => b.id === editId) || null;
  const midiasComUso = data.midias.map(m => ({ ...m, usos: mediaUsage(data.blocos, m) }));
  res.render('automacao_whatsapp', {
    flash: req.query.flash || null,
    error: req.query.error || null,
    version: MODULE_VERSION,
    tab,
    blocoEdit,
    whatsapp: publicWaState(),
    inboxSummary,
    commercialDashboard,
    storageReport,
    inboxConversations: inboxData.conversations,
    inboxContacts: inboxData.contacts,
    selectedConversation,
    selectedMessages,
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

router.post('/inbox/marcar-nao-lida', (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    markConversationUnread(req.app, conversationId);
    res.json({ success:true, message:'Conversa marcada como não lida.' });
  } catch(error){
    res.status(400).json({ success:false, message:error.message || 'Não foi possível marcar a conversa.' });
  }
});


router.post('/inbox/contato/atualizar', (req,res)=>{
  try {
    const conversationId = safeConversationId(req.body?.conversationId);
    updateInboxContact(req.app, conversationId, {
      name: req.body?.name,
      commercialStatus: safeText(req.body?.commercialStatus, 40),
      origin: safeText(req.body?.origin, 40),
      interestProduct: req.body?.interestProduct,
      saveContact: req.body?.saveContact === '1'
    });
    flash(res, `/automacao-whatsapp?tab=inbox&conversation=${encodeURIComponent(conversationId)}`, req.body?.saveContact === '1' ? 'Alterações salvas e contato incluído na agenda do Painel.' : 'Alterações da conversa salvas.');
  } catch(error){
    flash(res, `/automacao-whatsapp?tab=inbox`, error.message || 'Não foi possível atualizar o contato.');
  }
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

function safeDownloadName(value='arquivo'){
  return safeText(value,180).replace(/[\\/:*?"<>|]+/g,'-').trim() || 'arquivo';
}
function messageIdCore(value=''){
  const raw=String(value||'').trim();
  const decoded=(()=>{ try{return decodeURIComponent(raw);}catch{return raw;} })();
  const hexParts=decoded.split('_').filter(part=>/^[A-F0-9]{16,}$/i.test(part));
  if(hexParts.length) return hexParts[0];
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
async function fetchInboxMediaFromWhatsApp(conversation,savedMessage){
  const message=await findInboxWhatsAppMessage(conversation,savedMessage);
  if(!message) throw new Error('A mensagem desta mídia não foi encontrada no WhatsApp.');
  if(!message.hasMedia || typeof message.downloadMedia!=='function') throw new Error('A mídia não está mais disponível no WhatsApp.');
  const downloaded=await message.downloadMedia();
  if(!downloaded?.data || !validBase64(downloaded.data)) throw new Error('O WhatsApp não retornou um arquivo de mídia válido.');
  const buffer=Buffer.from(String(downloaded.data).replace(/\s+/g,''),'base64');
  if(!buffer.length) throw new Error('O WhatsApp retornou uma mídia vazia.');
  return {
    buffer,
    mime:safeText(downloaded.mimetype || message?._data?.mimetype || 'application/octet-stream',120),
    filename:safeDownloadName(downloaded.filename || message?._data?.filename || savedMessage?.media?.originalName || 'arquivo')
  };
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
      if(download) return res.download(found.absolute,safeDownloadName(found.media?.originalName||found.media?.filename||'arquivo'));
      return res.sendFile(found.absolute);
    }

    const inboxData=getInboxData(req.app);
    const conversation=inboxData.conversations.find(item=>item.id===conversationId);
    if(!conversation) throw new Error('Conversa não encontrada no Inbox.');
    const savedMessage=getConversationMessages(req.app,conversationId).find(item=>item.id===messageId || idsMatch(item.id,messageId));
    if(!savedMessage?.hasMedia) throw new Error('Esta mensagem não possui mídia registrada.');

    const remote=await fetchInboxMediaFromWhatsApp(conversation,savedMessage);
    const cached=storeInboxMediaFile(req.app,conversationId,savedMessage.id,remote.buffer,{ mime:remote.mime, originalName:savedMessage.media?.originalName || remote.filename, kind:savedMessage.media?.kind });
    const preferredName=safeDownloadName(savedMessage.media?.originalName || remote.filename || 'arquivo');
    const mime=remote.mime || savedMessage.media?.mime || 'application/octet-stream';

    res.status(200);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','private, no-store');
    res.setHeader('Content-Type',mime);
    res.setHeader('Content-Length',String(remote.buffer.length));
    res.setHeader('Content-Disposition',`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(preferredName)}`);
    return res.end(remote.buffer);
  }catch(error){
    if(res.headersSent){ try{return res.end();}catch{return;} }
    const text=error?.message || 'Mídia não encontrada.';
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
    res.json({ success:true, message:`Bloco “${bloco.nome}” concluído com ${result.total} etapa(s).` });
  } catch(error){
    addLog(req.app, 'inbox_bloco_erro', 'Falha ao executar bloco pelo Inbox.', {
      conversa:safeText(req.body?.conversationId,80),
      blocoId:safeText(req.body?.blocoId,120),
      erro:error.message
    });
    res.status(400).json({ success:false, message:error.message || 'Falha ao executar o bloco.' });
  }
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
    if(waState.client) await waState.client.destroy();
    waState.client = null;
    setWaState('desconectado', 'WhatsApp desconectado manualmente. A sessão local foi preservada.', { qrDataUrl:null, connectedNumber:null, connectedName:null, initialized:false, starting:false });
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
    res.json({ success:true, message:`Bloco “${bloco.nome}” concluído com ${result.total} etapa(s).` });
  } catch(error){
    addLog(req.app, 'bloco_envio_erro', 'Falha ao executar bloco.', { erro:error.message, blocoId:safeText(req.body?.blocoId,120) });
    res.status(400).json({success:false,message:error.message||'Falha ao executar bloco.'});
  }
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
  flash(res, '/automacao-whatsapp?tab=blocos&edit=' + encodeURIComponent(id), '💬 Bloco salvo com sucesso.');
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
    horarioAniversario: safeText(body.horarioAniversario || '08:00', 20),
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

export default router;
