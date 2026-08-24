import fs from 'fs';
import path from 'path';

// Mantém o Inbox isolado por conta conectada. O WeakMap evita estado global
// compartilhado entre instâncias do app e não persiste dados sensíveis em memória.
const activeInboxAccounts = new WeakMap();
const inboundMetricsCache = new WeakMap();
const commercialDashboardCache = new WeakMap();

function normalizeAccountKey(value=''){
  const key = digits(value);
  return key ? key.slice(0, 20) : '';
}

export function setInboxAccount(app, accountNumber){
  const key = normalizeAccountKey(accountNumber);
  if(!key) throw new Error('Não foi possível identificar a conta do WhatsApp.');
  activeInboxAccounts.set(app, key);
  ensureInboxStorage(app);
  return key;
}

export function clearInboxAccount(app){
  activeInboxAccounts.delete(app);
}

export function getInboxAccount(app){
  return activeInboxAccounts.get(app) || null;
}

function paths(app){
  const accountKey = getInboxAccount(app) || '__disconnected__';
  const root = path.join(app.locals.paths.CONTENT_DIR, 'automacao_whatsapp', 'inbox', 'accounts', accountKey);
  return {
    root,
    conversationsFile: path.join(root, 'conversations.json'),
    contactsFile: path.join(root, 'contacts.json'),
    messagesDir: path.join(root, 'messages'),
    mediaDir: path.join(root, 'media'),
    backupsDir: path.join(root, 'backups')
  };
}

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true }); }
function now(){ return new Date().toISOString(); }
function safeText(value, max=500){ return String(value ?? '').replace(/[<>]/g, '').trim().slice(0,max); }
function digits(value=''){ return String(value).replace(/\D/g,''); }
function isPlausiblePhone(value=''){
  const n = digits(value);
  return n.length >= 10 && n.length <= 13 && (n.startsWith('55') || n.length <= 11);
}
function normalizePhone(value=''){
  let n = digits(value);
  if(n.startsWith('00')) n = n.slice(2);
  if((n.length === 10 || n.length === 11) && !n.startsWith('55')) n = `55${n}`;
  return isPlausiblePhone(n) ? n : '';
}
function atomicWriteJson(file, data){
  ensureDir(path.dirname(file));
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(temp, file);
}
function writeJsonIfMissing(file, data){ if(!fs.existsSync(file)) atomicWriteJson(file, data); }
function readJson(file, fallback){
  try { if(!fs.existsSync(file)) return fallback; return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}
function listFrom(data, key){ return Array.isArray(data) ? data : (Array.isArray(data?.[key]) ? data[key] : []); }
function serializedId(value=''){
  if(typeof value === 'string') return value;
  return value?._serialized || '';
}
function idDigits(chatId=''){ return digits(String(chatId).replace(/@(c|lid|g)\.us$/,'')); }
function lidKey(value=''){ return idDigits(value); }
function isLid(value=''){ return String(value).endsWith('@lid') || String(value).endsWith('@lid.us'); }
function isGroup(value=''){ return String(value).endsWith('@g.us'); }
function groupConversationId(chatId=''){ const key=idDigits(chatId); return key ? `group_${key}` : ''; }
function messageFile(p, conversationId){ return path.join(p.messagesDir, `${safeText(conversationId,80).replace(/[^a-zA-Z0-9_-]/g,'_')}.json`); }
function minDate(...values){ return values.filter(Boolean).sort()[0] || null; }
function maxDate(...values){ return values.filter(Boolean).sort().at(-1) || null; }
function safeFilePart(value='', fallback='arquivo'){
  const clean = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120);
  return clean || fallback;
}
function extensionFromMime(mime='', originalName=''){
  const original = path.extname(String(originalName || '')).toLowerCase();
  if(original && /^\.[a-z0-9]{1,8}$/.test(original)) return original;
  const map = {
    'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif',
    'audio/ogg':'.ogg','audio/oga':'.oga','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/webm':'.webm',
    'video/mp4':'.mp4','video/webm':'.webm','application/pdf':'.pdf',
    'application/msword':'.doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx',
    'application/vnd.ms-excel':'.xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx',
    'text/plain':'.txt','application/zip':'.zip'
  };
  return map[String(mime || '').toLowerCase()] || '';
}
function mediaKind(type='', mime=''){
  if(type === 'sticker') return 'sticker';
  if(String(mime).startsWith('image/') || type === 'image') return 'image';
  if(String(mime).startsWith('audio/') || ['audio','ptt'].includes(type)) return 'audio';
  if(String(mime).startsWith('video/') || type === 'video') return 'video';
  return 'document';
}
function describeMedia(msg, type=''){
  const mime = safeText(msg?._data?.mimetype || msg?._data?.mediaData?.mimetype || '',120).toLowerCase();
  const originalName = safeText(msg?._data?.filename || msg?._data?.mediaData?.filename || '',180);
  const rawSize = Number(msg?._data?.size || msg?._data?.mediaData?.size || 0);
  return {
    kind:mediaKind(type,mime),
    mime,
    originalName:originalName || '',
    filename:'',
    relativePath:'',
    size:Number.isFinite(rawSize) && rawSize > 0 ? rawSize : 0,
    stored:false,
    remote:true,
    error:null
  };
}

export function ensureInboxStorage(app){
  const p = paths(app);
  ensureDir(p.root); ensureDir(p.messagesDir); ensureDir(p.mediaDir); ensureDir(p.backupsDir);
  writeJsonIfMissing(p.conversationsFile, { version:3, conversations:[] });
  writeJsonIfMissing(p.contactsFile, { version:3, contacts:[] });
  return p;
}

export function detectOrigin(text=''){
  const normalized = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/(vim|venho).{0,30}(site|qualitycel|quality cel)/.test(normalized) || normalized.includes('atraves do site')) return 'site_quality';
  if(normalized.includes('instagram') || normalized.includes('insta')) return 'instagram';
  if(normalized.includes('campanha') || normalized.includes('promocao') || normalized.includes('anuncio')) return 'campaign';
  if(normalized.includes('indicacao') || normalized.includes('indicado')) return 'referral';
  return normalized.trim() ? 'whatsapp_direct' : 'unknown';
}

export function extractInterestProduct(text=''){
  const raw = String(text).replace(/\s+/g,' ').trim();
  const patterns = [
    /tenho interesse (?:no|na|em)\s+(.+?)(?:[.!?]|$)/i,
    /produto\s*:\s*(.+?)(?:\n|$)/i,
    /interesse\s*:\s*(.+?)(?:\n|$)/i
  ];
  for(const pattern of patterns){
    const match = raw.match(pattern);
    if(match?.[1]){
      const value=safeText(match[1],220).replace(/\s+/g,' ').trim();
      const markers=(value.match(/(?:^|\s)\d{1,2}\s*[-–—.)]/g)||[]).length;
      if(value.length<=100 && value.split(/\s+/).filter(Boolean).length<=14 && markers<2) return value;
    }
  }
  return '';
}

function savedContactFor(contacts, conversation){
  return contacts.find(c => c.manuallySaved === true && (
    (conversation.phoneResolved && c.phone === conversation.phone) ||
    (conversation.whatsappId && c.whatsappId === conversation.whatsappId)
  )) || null;
}


const CONVERSATION_STATES = ['open','closed'];
const CLOSE_REASONS = ['customer_bought','customer_gave_up','will_think','no_interest','completed','other'];

function withCommercialLifecycle(conversation={}){
  if(conversation.conversationType === 'group') return conversation;
  const state = CONVERSATION_STATES.includes(conversation.attendanceState) ? conversation.attendanceState : 'open';
  return {
    ...conversation,
    attendanceState:state,
    attendanceOpenedAt:conversation.attendanceOpenedAt || conversation.firstContactAt || conversation.createdAt || now(),
    attendanceClosedAt:state === 'closed' ? (conversation.attendanceClosedAt || conversation.updatedAt || null) : null,
    attendanceClosedReason:state === 'closed' ? (conversation.attendanceClosedReason || 'completed') : null,
    attendanceClosedBy:state === 'closed' ? (conversation.attendanceClosedBy || 'operador') : null,
    attendanceReopenedAt:conversation.attendanceReopenedAt || null,
    attendanceCloseCount:Number(conversation.attendanceCloseCount || 0),
    attendanceReopenCount:Number(conversation.attendanceReopenCount || 0),
    attendanceHistory:Array.isArray(conversation.attendanceHistory) ? conversation.attendanceHistory : []
  };
}

function persistConversationMutation(app, conversationId, mutate){
  const p=ensureInboxStorage(app);
  const data=readJson(p.conversationsFile,{version:5,conversations:[]});
  const conversations=listFrom(data,'conversations');
  const conversation=conversations.find(c=>c.id===String(conversationId||''));
  if(!conversation) throw new Error('Conversa não encontrada.');
  if(conversation.conversationType==='group' || isGroup(conversation.whatsappId)) throw new Error('Grupos não possuem ciclo comercial.');
  Object.assign(conversation,withCommercialLifecycle(conversation));
  mutate(conversation);
  conversation.updatedAt=now();
  atomicWriteJson(p.conversationsFile,{version:5,conversations});
  return conversation;
}


export function ensureInboxConversationForContact(app,{phone='',whatsappId='',name=''}={}){
  const p=ensureInboxStorage(app);
  const cleanPhone=normalizePhone(phone);
  if(!cleanPhone) throw new Error('Informe um número válido para iniciar a conversa.');
  const cleanWhatsappId=safeText(whatsappId,160) || `${cleanPhone}@c.us`;
  const data=readJson(p.conversationsFile,{version:5,conversations:[]});
  const conversations=listFrom(data,'conversations');
  let conversation=conversations.find(c=>c.conversationType!=='group' && (normalizePhone(c.phone)===cleanPhone || c.whatsappId===cleanWhatsappId));
  if(conversation){
    if(name && !conversation.nameEdited && (!conversation.name || conversation.name===conversation.phone)) conversation.name=safeText(name,160);
    conversation.phone=cleanPhone; conversation.phoneResolved=true; conversation.whatsappId=cleanWhatsappId; conversation.updatedAt=now();
    atomicWriteJson(p.conversationsFile,{version:5,conversations});
    return withCommercialLifecycle(conversation);
  }
  const timestamp=now();
  conversation={
    id:cleanPhone,conversationType:'contact',phone:cleanPhone,phoneResolved:true,whatsappId:cleanWhatsappId,
    name:safeText(name,160)||cleanPhone,nameEdited:false,groupParticipantCount:null,
    createdAt:timestamp,updatedAt:timestamp,firstContactAt:timestamp,lastMessageAt:timestamp,
    lastIncomingAt:null,lastOutgoingAt:null,awaitingResponse:false,waitingSince:null,unreadCount:0,
    commercialStatus:'new',commercialStatusUpdatedAt:timestamp,origin:'whatsapp_direct',originMode:'automatic',
    interestProduct:'',originPage:null,firstResponseAt:null,firstResponseTimeSeconds:null,archived:false,
    attendanceState:'open',attendanceOpenedAt:timestamp,attendanceClosedAt:null,attendanceClosedReason:null,attendanceClosedBy:null,attendanceReopenedAt:null,
    attendanceCloseCount:0,attendanceReopenCount:0,attendanceHistory:[]
  };
  conversations.push(conversation);
  atomicWriteJson(p.conversationsFile,{version:5,conversations});
  const messagesPath=messageFile(p,conversation.id);
  if(!fs.existsSync(messagesPath)) atomicWriteJson(messagesPath,{version:4,conversationId:conversation.id,messages:[]});
  return conversation;
}

export function updateConversationAttendance(app, conversationId, changes={}){
  const action=safeText(changes.action,20);
  const actor=safeText(changes.actor || 'operador',120) || 'operador';
  return persistConversationMutation(app,conversationId,conversation=>{
    const timestamp=now();
    if(action==='close'){
      const reason=CLOSE_REASONS.includes(changes.reason) ? changes.reason : 'completed';
      if(conversation.attendanceState!=='closed') conversation.attendanceCloseCount=Number(conversation.attendanceCloseCount||0)+1;
      conversation.attendanceState='closed';
      conversation.attendanceClosedAt=timestamp;
      conversation.attendanceClosedReason=reason;
      conversation.attendanceClosedBy=actor;
      conversation.awaitingResponse=false;
      conversation.waitingSince=null;
      conversation.attendanceHistory=[...(conversation.attendanceHistory||[]),{action:'closed',at:timestamp,reason,by:actor}].slice(-100);
      if(reason==='customer_bought'){
        conversation.commercialStatus='completed_sale';
        conversation.commercialStatusUpdatedAt=timestamp;
      } else if(reason==='customer_gave_up'){
        conversation.commercialStatus='lost';
        conversation.commercialStatusUpdatedAt=timestamp;
      } else if(reason==='no_interest'){
        conversation.commercialStatus='no_potential';
        conversation.commercialStatusUpdatedAt=timestamp;
      }
    } else if(action==='reopen'){
      if(conversation.attendanceState==='closed') conversation.attendanceReopenCount=Number(conversation.attendanceReopenCount||0)+1;
      conversation.attendanceState='open';
      conversation.attendanceOpenedAt=timestamp;
      conversation.attendanceReopenedAt=timestamp;
      conversation.attendanceClosedAt=null;
      conversation.attendanceClosedReason=null;
      conversation.attendanceClosedBy=null;
      conversation.attendanceHistory=[...(conversation.attendanceHistory||[]),{action:'reopened',at:timestamp,by:actor}].slice(-100);
    } else throw new Error('Ação de atendimento inválida.');
  });
}

export function bulkUpdateConversationAttendance(app, conversationIds=[], changes={}){
  const ids=[...new Set((Array.isArray(conversationIds)?conversationIds:[]).map(v=>safeText(v,80).replace(/[^a-zA-Z0-9_-]/g,'')).filter(Boolean))];
  if(!ids.length) throw new Error('Selecione ao menos uma conversa.');
  const updated=[];
  const errors=[];
  for(const id of ids){
    try{ updated.push(updateConversationAttendance(app,id,changes)); }
    catch(error){ errors.push({id,message:error.message}); }
  }
  return {updated:updated.length,errors};
}

export function getInboxData(app){
  const p = ensureInboxStorage(app);
  const contacts = listFrom(readJson(p.contactsFile,{contacts:[]}), 'contacts');
  const conversations = listFrom(readJson(p.conversationsFile,{conversations:[]}), 'conversations')
    .map(c => {
      const conversationType = c.conversationType || (isGroup(c.whatsappId) || String(c.id||'').startsWith('group_') ? 'group' : 'contact');
      return withCommercialLifecycle({ ...c, conversationType, contactSaved:conversationType === 'contact' && Boolean(savedContactFor(contacts,c)) });
    })
    .sort((a,b)=>String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')));
  return { conversations, contacts:contacts.filter(c => c.manuallySaved === true) };
}

export function getConversationMessages(app, conversationId){
  const p = ensureInboxStorage(app);
  const data = readJson(messageFile(p, conversationId), { version:3, conversationId, messages:[] });
  const hiddenTechnicalTypes=new Set(['ciphertext','protocol','notification_template','gp2','e2e_notification','debug']);
  const userTextTypes=new Set(['chat','buttons_response','list_response','reaction','poll_creation','poll_update']);
  return listFrom(data,'messages').filter(item=>!hiddenTechnicalTypes.has(String(item?.type||''))).map(item=>{
    const type=String(item?.type||'');
    if(['call_notification','call_log','call','missed_call'].includes(type)) return {...item,type:'call_notification',text:'📞 Chamada pelo WhatsApp'};
    if(type==='revoked') return {...item,text:'🚫 Mensagem apagada'};
    const text=String(item?.text||'');
    if(!userTextTypes.has(type) && text.length>1000){
      const compact=text.replace(/\s+/g,'');
      if(compact.length>900 && compact.length/Math.max(1,text.length)>.82) return {...item,text:'⚙️ Evento técnico do WhatsApp'};
    }
    return item;
  }).sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||'')));
}

export function getInboxSummary(app, prefetchedData=null){
  const data = prefetchedData || getInboxData(app);
  const conversations = data.conversations.filter(c => c.conversationType !== 'group');
  const groups = data.conversations.filter(c => c.conversationType === 'group');
  return {
    groups: groups.length,
    total: conversations.length,
    awaitingResponse: conversations.filter(c => c.attendanceState !== 'closed' && c.awaitingResponse).length,
    closedAttendances: conversations.filter(c => c.attendanceState === 'closed').length,
    newContacts: conversations.filter(c => c.commercialStatus === 'new').length,
    inProgress: conversations.filter(c => c.commercialStatus === 'in_progress').length,
    pending: conversations.filter(c => c.commercialStatus === 'pending').length,
    completedSales: conversations.filter(c => c.commercialStatus === 'completed_sale').length,
    lost: conversations.filter(c => c.commercialStatus === 'lost').length,
    noPotential: conversations.filter(c => c.commercialStatus === 'no_potential').length
  };
}


export function getInboundContactMetrics(app, prefetchedData=null){
  const p=ensureInboxStorage(app);
  const conversations=(prefetchedData || getInboxData(app)).conversations.filter(c=>c.conversationType!=='group');
  const signature=[conversations.length,conversations[0]?.lastMessageAt||'',conversations.reduce((sum,c)=>sum+Number(c.unreadCount||0),0)].join('|');
  const cached=inboundMetricsCache.get(app);
  if(cached && cached.signature===signature && Date.now()-cached.at<15000) return cached.value;
  const nowDate=new Date();
  const dayStart=new Date(nowDate); dayStart.setHours(0,0,0,0);
  const weekStart=new Date(dayStart); weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const monthStart=new Date(nowDate.getFullYear(),nowDate.getMonth(),1);
  const endMs=Date.now()+1000;
  const ranges={today:dayStart.getTime(),week:weekStart.getTime(),month:monthStart.getTime()};
  const counts={today:0,week:0,month:0};
  const daily=new Map();
  for(let cursor=new Date(monthStart);cursor.getTime()<=dayStart.getTime();cursor.setDate(cursor.getDate()+1)){
    daily.set(cursor.toISOString().slice(0,10),0);
  }
  for(const conversation of conversations){
    const lastMs=Date.parse(conversation.lastMessageAt||'');
    if(!Number.isFinite(lastMs) || lastMs<ranges.month) continue;
    const data=readJson(messageFile(p,conversation.id),{messages:[]});
    const messages=listFrom(data,'messages').filter(m=>['incoming','outgoing'].includes(m.direction)).map(m=>({...m,_ms:Date.parse(m.timestamp||'')})).filter(m=>Number.isFinite(m._ms)&&m._ms<=endMs).sort((a,b)=>a._ms-b._ms);
    if(!messages.length) continue;
    for(const [key,startMs] of Object.entries(ranges)){
      const first=messages.find(m=>m._ms>=startMs);
      if(first?.direction==='incoming') counts[key]+=1;
    }
    for(const [dateKey] of daily){
      const start=new Date(dateKey+'T00:00:00');
      const finish=new Date(start); finish.setDate(finish.getDate()+1);
      const first=messages.find(m=>m._ms>=start.getTime()&&m._ms<finish.getTime());
      if(first?.direction==='incoming') daily.set(dateKey,(daily.get(dateKey)||0)+1);
    }
  }
  const value={today:counts.today,week:counts.week,month:counts.month,daily:[...daily.entries()].map(([date,total])=>({date,total}))};
  inboundMetricsCache.set(app,{signature,at:Date.now(),value});
  return value;
}

function cleanCommercialInterest(value=''){
  let text=safeText(value,220).replace(/\s+/g,' ').trim();
  if(!text) return '';
  text=text.replace(/^(?:produto|interesse)\s*:\s*/i,'').trim();
  const menuMarkers=(text.match(/(?:^|\s)\d{1,2}\s*[-–—.)]/g)||[]).length;
  const menuWords=(text.match(/\b(?:consultar|cancelar|lojas? parceiras?|reclama[cç][aã]o|acompanhe|deseja)\b/gi)||[]).length;
  const words=text.split(/\s+/).filter(Boolean);
  // Evita transformar textos inteiros de menus/fluxos em "interesse" comercial.
  if(menuMarkers>=2 || (menuMarkers>=1 && menuWords>=2) || words.length>14 || text.length>100) return '';
  return text;
}

function recentConversationSignals(app, conversations, nowMs){
  const p=ensureInboxStorage(app);
  const recent30=nowMs-(30*86400000);
  const freshWindow=nowMs-(7*86400000);
  const map=new Map();
  const responseSamples=[];
  for(const conversation of conversations){
    const lastKnown=Date.parse(conversation.lastMessageAt||'');
    if(!Number.isFinite(lastKnown) || lastKnown<recent30) continue;
    const data=readJson(messageFile(p,conversation.id),{messages:[]});
    const messages=listFrom(data,'messages')
      .filter(m=>m && (m.direction==='incoming'||m.direction==='outgoing'))
      .map(m=>({...m,_ms:Date.parse(m.timestamp||'')}))
      .filter(m=>Number.isFinite(m._ms))
      .sort((a,b)=>a._ms-b._ms);
    if(!messages.length) continue;
    const last=messages[messages.length-1];
    const lastIncoming=[...messages].reverse().find(m=>m.direction==='incoming');
    const isOpen=conversation.attendanceState!=='closed' && !['completed_sale','lost','no_potential'].includes(conversation.commercialStatus||'new');
    const awaiting=isOpen && last.direction==='incoming' && last._ms>=freshWindow;
    const waitingSeconds=awaiting?Math.max(0,Math.round((nowMs-last._ms)/1000)):0;
    map.set(conversation.id,{awaitingResponse:awaiting,waitingSeconds,waitingSince:awaiting?last.timestamp:null,lastIncomingAt:lastIncoming?.timestamp||conversation.lastIncomingAt||null,lastDirection:last.direction});

    // Mede a primeira resposta somente quando o cliente iniciou o contato daquele dia.
    // Limita a 12 h para um atendimento deixado de um dia para o outro não distorcer todo o indicador.
    const recent=messages.filter(m=>m._ms>=recent30);
    const byDay=new Map();
    for(const msg of recent){
      const d=new Date(msg._ms); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if(!byDay.has(key)) byDay.set(key,[]);
      byDay.get(key).push(msg);
    }
    for(const dayMessages of byDay.values()){
      const first=dayMessages[0];
      if(!first || first.direction!=='incoming') continue;
      const reply=messages.find(m=>m.direction==='outgoing' && m._ms>first._ms && m._ms-first._ms<=12*60*60*1000);
      if(reply) responseSamples.push(Math.round((reply._ms-first._ms)/1000));
    }
  }
  return {map,responseSamples};
}

export function getCommercialDashboard(app, prefetchedData=null){
  const conversations = (prefetchedData || getInboxData(app)).conversations.filter(c => c.conversationType !== 'group');
  const signature=[conversations.length,conversations[0]?.lastMessageAt||'',conversations.reduce((sum,c)=>sum+Number(c.unreadCount||0),0)].join('|');
  const cached=commercialDashboardCache.get(app);
  if(cached && cached.signature===signature && Date.now()-cached.at<10000) return cached.value;

  const statusOrder = ['new','in_progress','pending','completed_sale','lost','no_potential'];
  const originOrder = ['site_quality','instagram','whatsapp_direct','campaign','referral','unknown'];
  const byStatus = Object.fromEntries(statusOrder.map(key => [key, conversations.filter(c => c.commercialStatus === key).length]));
  const byOrigin = Object.fromEntries(originOrder.map(key => [key, conversations.filter(c => (c.origin || 'unknown') === key).length]));
  const completed = byStatus.completed_sale || 0;
  const lost = byStatus.lost || 0;
  const qualifiedBase = completed + lost;
  const conversionRate = qualifiedBase ? Math.round((completed / qualifiedBase) * 100) : 0;
  const nowMs=Date.now();
  const signals=recentConversationSignals(app,conversations,nowMs);
  const usefulResponseTimes=signals.responseSamples.filter(v=>Number.isFinite(v)&&v>=0);
  const averageFirstResponseSeconds=usefulResponseTimes.length?Math.round(usefulResponseTimes.reduce((sum,value)=>sum+value,0)/usefulResponseTimes.length):null;

  const interests = new Map();
  for(const conversation of conversations){
    const interest = cleanCommercialInterest(conversation.interestProduct);
    if(!interest) continue;
    const key = interest.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
    const current = interests.get(key) || { name:interest, total:0 };
    current.total += 1;
    interests.set(key,current);
  }
  const topInterests = [...interests.values()].sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name,'pt-BR')).slice(0,8);

  const open=c=>c.attendanceState !== 'closed' && !['completed_sale','lost','no_potential'].includes(c.commercialStatus || 'new');
  const allOpportunities = conversations.filter(open).map(c=>{
    const signal=signals.map.get(c.id);
    const awaitingResponse=Boolean(signal?.awaitingResponse);
    const waitingSeconds=Number(signal?.waitingSeconds||0);
    const waitingSince=signal?.waitingSince||null;
    const cleanInterest=cleanCommercialInterest(c.interestProduct);
    const dueMs=c.nextActionDueAt ? new Date(c.nextActionDueAt).getTime() : null;
    const nextActionOverdue=Number.isFinite(dueMs) && dueMs < nowMs;
    const lastIncomingMs=Date.parse(signal?.lastIncomingAt||c.lastIncomingAt||'');
    const daysSinceIncoming=Number.isFinite(lastIncomingMs)?Math.max(0,Math.floor((nowMs-lastIncomingMs)/86400000)):9999;
    let score=0, opportunityReason='', suggestedAction='';
    if(awaitingResponse){ score+=100+Math.min(60,Math.floor(waitingSeconds/1800)*4); opportunityReason='Cliente está aguardando resposta'; suggestedAction='Responder agora'; }
    if(nextActionOverdue){ score+=85; opportunityReason=opportunityReason||'Próxima ação está vencida'; suggestedAction=suggestedAction||safeText(c.nextAction,180)||'Executar próxima ação'; }
    if((c.pendingType&&c.pendingType!=='none') || c.pendingNote){ score+=55; opportunityReason=opportunityReason||'Existe uma pendência registrada'; suggestedAction=suggestedAction||safeText(c.pendingNote,180)||'Resolver pendência'; }
    if(safeText(c.nextAction,300) && !nextActionOverdue){ score+=35; opportunityReason=opportunityReason||'Há uma próxima ação definida'; suggestedAction=suggestedAction||safeText(c.nextAction,180); }
    if(cleanInterest){ score+=30; opportunityReason=opportunityReason||`Interesse em ${cleanInterest}`; suggestedAction=suggestedAction||'Dar continuidade à negociação'; }
    if(c.commercialStatus==='pending') score+=25;
    else if(c.commercialStatus==='in_progress') score+=18;
    if(daysSinceIncoming<=2) score+=18; else if(daysSinceIncoming<=7) score+=10; else if(daysSinceIncoming>14) score-=45;
    let attentionLevel='normal';
    if((awaitingResponse && waitingSeconds>=7200) || nextActionOverdue) attentionLevel='critical';
    else if((awaitingResponse && waitingSeconds>=1800) || (c.pendingType&&c.pendingType!=='none')) attentionLevel='warning';
    return {...c,interestProduct:cleanInterest,awaitingResponse,waitingSeconds,waitingSince,nextActionOverdue,daysSinceIncoming,attentionLevel,opportunityScore:score,opportunityReason,suggestedAction};
  }).filter(c=>Number.isFinite(Date.parse(c.lastIncomingAt||'')) && c.daysSinceIncoming<=30 && c.opportunityScore>=30)
    .sort((a,b)=>b.opportunityScore-a.opportunityScore || String(b.lastIncomingAt||'').localeCompare(String(a.lastIncomingAt||'')));
  const opportunities=allOpportunities.slice(0,40);
  const awaiting=allOpportunities.filter(c=>c.awaitingResponse);
  const value={
    total:conversations.length,
    closedAttendances:conversations.filter(c=>c.attendanceState==='closed').length,
    activePipeline:allOpportunities.length,
    awaitingResponse:awaiting.length,
    waitingOver30m:awaiting.filter(c=>c.waitingSeconds>=1800).length,
    waitingOver2h:awaiting.filter(c=>c.waitingSeconds>=7200).length,
    structuredPending:allOpportunities.filter(c=>(c.pendingType&&c.pendingType!=='none') || c.pendingNote).length,
    withoutNextAction:allOpportunities.filter(c=>!safeText(c.nextAction,500)).length,
    overdueNextActions:allOpportunities.filter(c=>c.nextActionOverdue).length,
    completedSales:completed,
    conversionRate,
    averageFirstResponseSeconds,
    responseSampleSize:usefulResponseTimes.length,
    byStatus,
    byOrigin,
    topInterests,
    opportunities
  };
  commercialDashboardCache.set(app,{signature,at:Date.now(),value});
  return value;
}

export function getInboxRevision(app, conversationId=''){
  const { conversations } = getInboxData(app);
  const selected = conversations.find(c => c.id === String(conversationId || ''));
  const messages = selected ? getConversationMessages(app, selected.id) : [];
  return [
    conversations.length,
    conversations[0]?.lastMessageAt || '',
    conversations.reduce((sum,c)=>sum + Number(c.unreadCount || 0),0),
    selected?.updatedAt || '',
    messages.length,
    messages[messages.length-1]?.id || ''
  ].join('|');
}

async function contactFromChat(msg){
  let chat = null;
  let contact = null;
  try { chat = await msg.getChat(); } catch {}
  try { if(chat?.getContact) contact = await chat.getContact(); } catch {}
  if(!contact && !msg.fromMe){ try { contact = await msg.getContact(); } catch {} }
  return { chat, contact };
}

async function lidMappings(client, ids=[]){
  if(!client?.getContactLidAndPhone) return [];
  const unique = [...new Set(ids.filter(Boolean))];
  if(!unique.length) return [];
  const attempts = [unique, unique.map(lidKey).filter(Boolean)];
  for(const values of attempts){
    try {
      const result = await client.getContactLidAndPhone(values);
      if(Array.isArray(result) && result.length) return result;
    } catch {}
  }
  return [];
}

function mappingPhone(mapping){ return normalizePhone(mapping?.pn || mapping?.phone || mapping?.number || ''); }
function mappingLid(mapping){ return lidKey(mapping?.lid || mapping?.id || ''); }
function trustworthyContactName(contact, chat, ownName=''){
  const candidates=[chat?.name, chat?.formattedTitle, contact?.pushname, contact?.name, contact?.shortName]
    .map(value=>safeText(value,160)).filter(Boolean);
  return candidates.find(name=>!ownName || name.toLocaleLowerCase('pt-BR')!==String(ownName).toLocaleLowerCase('pt-BR')) || '';
}

async function browserChatSnapshots(client){
  try{
    const page=client?.pupPage;
    if(!page?.evaluate) return [];
    const result=await page.evaluate(() => {
      const store=window.Store;
      const models=store?.Chat?.getModelsArray ? store.Chat.getModelsArray() : [];
      return (models || []).map(chat => {
        const id=chat?.id?._serialized || chat?.id?.toString?.() || '';
        const contact=chat?.contact || {};
        return {
          id,
          isGroup:Boolean(chat?.isGroup || String(id).endsWith('@g.us')),
          name:String(chat?.name || chat?.formattedTitle || chat?.groupMetadata?.subject || ''),
          formattedTitle:String(chat?.formattedTitle || ''),
          subject:String(chat?.groupMetadata?.subject || ''),
          unreadCount:Number(chat?.unreadCount || 0),
          timestamp:Number(chat?.t || chat?.timestamp || 0),
          participantCount:Array.isArray(chat?.groupMetadata?.participants) ? chat.groupMetadata.participants.length : null,
          contactNumber:String(contact?.number || ''),
          contactId:String(contact?.id?._serialized || ''),
          contactName:String(contact?.name || contact?.pushname || contact?.shortName || '')
        };
      }).filter(item => item.id && item.id !== 'status@broadcast');
    });
    return Array.isArray(result) ? result : [];
  }catch{return [];}
}

function providerChatToSnapshot(chat={}){
  return {
    id:String(chat?.id || ''),
    isGroup:Boolean(chat?.isGroup || String(chat?.id || '').endsWith('@g.us')),
    name:String(chat?.name || ''),
    formattedTitle:String(chat?.formattedTitle || chat?.name || ''),
    subject:String(chat?.subject || ''),
    unreadCount:Number(chat?.unreadCount || 0),
    timestamp:Number(chat?.timestamp || 0),
    participantCount:Number.isFinite(Number(chat?.participantCount)) ? Number(chat.participantCount) : null,
    contactNumber:String(chat?.contact?.number || ''),
    contactId:String(chat?.contact?.id || ''),
    contactName:String(chat?.contact?.name || chat?.contact?.pushname || chat?.contact?.shortName || '')
  };
}

async function getChatCatalog(client, provider=null){
  if(provider?.getChatsSafe){
    try{
      const result=await provider.getChatsSafe();
      const snapshots=(result?.chats || []).map(providerChatToSnapshot)
        .filter(item=>item.id && item.id!=='status@broadcast');
      if(snapshots.length) return { chats:[], snapshots, source:'provider', providerStats:result?.stats || null };
    }catch{}
  }
  try{
    const chats=await client.getChats();
    if(Array.isArray(chats) && chats.length) return { chats, snapshots:[], source:'public_api' };
  }catch{}
  const snapshots=await browserChatSnapshots(client);
  return { chats:[], snapshots, source:'browser_store' };
}

function canonicalIncomingMessageId(msg, rawChatId, fromMe){
  const serialized=safeText(msg?.id?._serialized || '',180);
  if(serialized) return serialized;
  const short=safeText(msg?.id?.id || '',100);
  if(!short) return '';
  return `${fromMe}_${rawChatId}_${short}`;
}

async function resolvePhone(client, msg, chatId){
  const { chat, contact } = await contactFromChat(msg);
  const actualChatId = serializedId(chat?.id) || chatId;
  const candidates = [
    contact?.number,
    serializedId(contact?.id)?.endsWith('@c.us') ? serializedId(contact.id) : '',
    actualChatId.endsWith('@c.us') ? actualChatId : '',
    String(chatId).endsWith('@c.us') ? chatId : ''
  ];

  for(const candidate of candidates){
    const phone = normalizePhone(candidate);
    if(phone) return { phone, resolved:true, contact, chat, whatsappId:actualChatId || chatId };
  }

  const lidId = [actualChatId, chatId, serializedId(contact?.id)].find(isLid) || '';
  if(lidId){
    const mappings = await lidMappings(client, [lidId]);
    const expected = lidKey(lidId);
    const found = mappings.find(item => !mappingLid(item) || mappingLid(item) === expected) || mappings[0];
    const phone = mappingPhone(found);
    if(phone) return { phone, resolved:true, contact, chat, whatsappId:lidId };
  }

  return { phone:idDigits(lidId || actualChatId || chatId), resolved:false, contact, chat, whatsappId:lidId || actualChatId || chatId };
}

function mergeMessageFiles(p, oldId, newId){
  if(!oldId || !newId || oldId === newId) return 0;
  const oldFile = messageFile(p, oldId);
  if(!fs.existsSync(oldFile)) return 0;
  const newFile = messageFile(p, newId);
  const oldData = readJson(oldFile,{messages:[]});
  const newData = readJson(newFile,{messages:[]});
  const byId = new Map();
  for(const item of [...listFrom(oldData,'messages'), ...listFrom(newData,'messages')]){
    if(item?.id) byId.set(item.id,{...item,conversationId:newId});
  }
  const messages = [...byId.values()].sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||'')));
  atomicWriteJson(newFile,{version:3,conversationId:newId,messages});
  try { fs.unlinkSync(oldFile); } catch {}
  return messages.length;
}

function preferredEditedName(items=[]){
  return items.filter(item => item?.nameEdited && item?.name).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0]?.name || '';
}

function mergeConversationRecords(records, phone, whatsappId=''){
  const sortedLatest = records.slice().sort((a,b)=>String(b.lastMessageAt||b.updatedAt||'').localeCompare(String(a.lastMessageAt||a.updatedAt||'')));
  const latest = sortedLatest[0] || {};
  const latestStatus = records.slice().sort((a,b)=>String(b.commercialStatusUpdatedAt||'').localeCompare(String(a.commercialStatusUpdatedAt||'')))[0] || latest;
  const manualOrigin = records.filter(c=>c.originMode==='manual').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
  const editedName = preferredEditedName(records);
  const result = {
    ...latest,
    id:phone,
    phone,
    phoneResolved:true,
    whatsappId: whatsappId || records.find(c=>isLid(c.whatsappId))?.whatsappId || latest.whatsappId || `${phone}@c.us`,
    name: editedName || records.find(c=>c.name && c.name !== c.phone && c.name !== 'Contato do WhatsApp')?.name || latest.name || phone,
    nameEdited:Boolean(editedName),
    createdAt:minDate(...records.map(c=>c.createdAt)) || latest.createdAt || now(),
    firstContactAt:minDate(...records.map(c=>c.firstContactAt)) || latest.firstContactAt || now(),
    updatedAt:maxDate(...records.map(c=>c.updatedAt), ...records.map(c=>c.lastMessageAt)) || now(),
    lastMessageAt:maxDate(...records.map(c=>c.lastMessageAt)),
    lastIncomingAt:maxDate(...records.map(c=>c.lastIncomingAt)),
    lastOutgoingAt:maxDate(...records.map(c=>c.lastOutgoingAt)),
    commercialStatus:latestStatus.commercialStatus || 'new',
    commercialStatusUpdatedAt:latestStatus.commercialStatusUpdatedAt || latestStatus.updatedAt || now(),
    origin:manualOrigin?.origin || records.find(c=>c.origin && c.origin!=='unknown')?.origin || latest.origin || 'unknown',
    originMode:manualOrigin ? 'manual' : (records.find(c=>c.originMode==='automatic')?.originMode || 'automatic'),
    interestProduct:records.find(c=>c.interestProduct)?.interestProduct || '',
    archived:records.every(c=>Boolean(c.archived))
  };
  const lastDirection = latest.lastMessageDirection;
  result.lastMessageDirection = lastDirection;
  result.lastMessageText = latest.lastMessageText || '';
  result.awaitingResponse = lastDirection === 'incoming';
  result.waitingSince = result.awaitingResponse ? (latest.waitingSince || latest.lastIncomingAt || latest.lastMessageAt) : null;
  result.unreadCount = result.awaitingResponse ? records.reduce((sum,c)=>sum+Number(c.unreadCount||0),0) : 0;
  result.firstResponseAt = minDate(...records.map(c=>c.firstResponseAt));
  result.firstResponseTimeSeconds = result.firstResponseAt && result.firstContactAt
    ? Math.max(0, Math.round((new Date(result.firstResponseAt)-new Date(result.firstContactAt))/1000))
    : null;
  return result;
}

function backupBeforeMigration(p){
  const stamp = now().replace(/[:.]/g,'-');
  const dir = path.join(p.backupsDir, `v0.5.3-${stamp}`);
  ensureDir(dir);
  for(const file of [p.conversationsFile,p.contactsFile]){
    if(fs.existsSync(file)) fs.copyFileSync(file,path.join(dir,path.basename(file)));
  }
  return dir;
}

function mergeContactsForIdentity(contacts, phone, lidId, conversation){
  const matches = contacts.filter(c => c.phone === phone || (lidId && c.whatsappId === lidId) || (!c.manuallySaved && c.phone === lidKey(lidId)));
  const manuallySaved = matches.filter(c=>c.manuallySaved===true);
  const remaining = contacts.filter(c=>!matches.includes(c));
  if(!manuallySaved.length) return remaining;
  const base = manuallySaved.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
  remaining.push({
    ...base,
    id:`contact_${phone}`,
    phone,
    whatsappId:lidId || base.whatsappId || `${phone}@c.us`,
    name:preferredEditedName(manuallySaved) || conversation.name || base.name || phone,
    nameEdited:Boolean(preferredEditedName(manuallySaved) || base.nameEdited),
    manuallySaved:true,
    updatedAt:now(),
    firstContactAt:minDate(...matches.map(c=>c.firstContactAt),conversation.firstContactAt),
    lastContactAt:maxDate(...matches.map(c=>c.lastContactAt),conversation.lastMessageAt),
    erpCustomerId:matches.find(c=>c.erpCustomerId)?.erpCustomerId || null
  });
  return remaining;
}

export async function repairInboxIdentities(app, client){
  const p = ensureInboxStorage(app);
  const conversationsData = readJson(p.conversationsFile,{version:3,conversations:[]});
  let conversations = listFrom(conversationsData,'conversations');
  const unresolved = conversations.filter(c=>!c.phoneResolved && (isLid(c.whatsappId) || isLid(`${c.id}@lid`)));
  if(!unresolved.length) return { migrated:0, merged:0, unresolved:0 };

  const lidIds = unresolved.map(c=>isLid(c.whatsappId)?c.whatsappId:`${c.id}@lid`);
  const mappings = await lidMappings(client,lidIds);
  if(!mappings.length) return { migrated:0, merged:0, unresolved:unresolved.length };

  backupBeforeMigration(p);
  let contacts = listFrom(readJson(p.contactsFile,{version:3,contacts:[]}), 'contacts');
  let migrated = 0;
  let merged = 0;

  for(const mapping of mappings){
    const lid = mappingLid(mapping);
    const phone = mappingPhone(mapping);
    if(!lid || !phone) continue;
    const related = conversations.filter(c=>c.id===phone || c.phone===phone || lidKey(c.whatsappId)===lid || (!c.phoneResolved && c.id===lid));
    if(!related.length) continue;
    const lidId = related.find(c=>isLid(c.whatsappId))?.whatsappId || `${lid}@lid`;
    for(const old of related){ if(old.id!==phone) mergeMessageFiles(p,old.id,phone); }
    const mergedConversation = mergeConversationRecords(related,phone,lidId);
    conversations = conversations.filter(c=>!related.includes(c));
    conversations.push(mergedConversation);
    contacts = mergeContactsForIdentity(contacts,phone,lidId,mergedConversation);
    migrated += related.filter(c=>c.id!==phone).length;
    if(related.length>1) merged += related.length-1;
  }

  // Registros automáticos antigos não devem virar agenda sem ação do usuário.
  contacts = contacts.filter(c=>c.manuallySaved===true);
  atomicWriteJson(p.conversationsFile,{version:3,conversations});
  atomicWriteJson(p.contactsFile,{version:3,contacts});
  return { migrated, merged, unresolved:conversations.filter(c=>!c.phoneResolved).length };
}

export async function registerWhatsAppMessage(app, msg, client=null, options={}){
  const p = ensureInboxStorage(app);
  const fromMe = Boolean(msg.fromMe);
  const forcedChat=options?.chatOverride || null;
  const forcedChatId=serializedId(forcedChat?.id);
  const rawChatId = forcedChatId || (fromMe ? String(msg.to || '') : String(msg.from || ''));
  if(!rawChatId || rawChatId === 'status@broadcast') return { ignored:true, reason:'chat_nao_suportado' };
  const id = canonicalIncomingMessageId(msg,rawChatId,fromMe);
  if(!id) return { ignored:true, reason:'sem_id' };

  const group = Boolean(forcedChat?.isGroup) || isGroup(rawChatId);
  let phone='', chatId=rawChatId, conversationId='', resolved=null, chat=null, whatsappName='', participantCount=null;
  if(group){
    conversationId = groupConversationId(rawChatId);
    if(!conversationId) return { ignored:true, reason:'sem_identificador', whatsappId:rawChatId };
    chat=forcedChat;
    if(!chat){ try { chat = await msg.getChat(); } catch {} }
    whatsappName = safeText(chat?.name || chat?.formattedTitle || '',160);
    participantCount = Array.isArray(chat?.participants) ? chat.participants.length : null;
  } else {
    if(forcedChat){
      let remoteContact=null;
      try { if(forcedChat.getContact) remoteContact=await forcedChat.getContact(); } catch {}
      const actualChatId=serializedId(forcedChat.id) || rawChatId;
      let resolvedPhone='';
      for(const candidate of [remoteContact?.number,serializedId(remoteContact?.id),actualChatId]){
        resolvedPhone=normalizePhone(candidate); if(resolvedPhone) break;
      }
      if(!resolvedPhone && isLid(actualChatId)){
        const mappings=await lidMappings(client,[actualChatId]);
        resolvedPhone=mappingPhone(mappings.find(item=>mappingLid(item)===lidKey(actualChatId)) || mappings[0]);
      }
      resolved={phone:resolvedPhone || idDigits(actualChatId),resolved:Boolean(resolvedPhone),contact:remoteContact,chat:forcedChat,whatsappId:actualChatId};
    } else resolved = await resolvePhone(client,msg,rawChatId);
    if(!resolved.phone) return { ignored:true, reason:'sem_identificador', whatsappId:resolved.whatsappId };
    phone = resolved.phone;
    chatId = resolved.whatsappId || rawChatId;
    conversationId = phone;
    const ownName=safeText(client?.info?.pushname || '',160);
    whatsappName = trustworthyContactName(resolved.contact,resolved.chat,ownName) || (!fromMe ? safeText(msg?._data?.notifyName || '',160) : '');
  }

  const timestamp = msg.timestamp ? new Date(Number(msg.timestamp)*1000).toISOString() : now();
  const rawType = safeText(msg.type || 'chat',40);
  // Eventos internos podem aparecer por alguns instantes após reiniciar o processo
  // (Ctrl+C / npm start). Eles não são mensagens do usuário e, quando salvos,
  // acabam aparecendo como códigos extensos no Inbox.
  if(['notification_template','gp2','protocol','ciphertext','e2e_notification','debug'].includes(rawType)){
    return { ignored:true, reason:'mensagem_de_sistema', type:rawType };
  }
  const isCallNotice = ['call_log','call','missed_call'].includes(rawType);
  const isRevoked = rawType === 'revoked';
  const type = isCallNotice ? 'call_notification' : (isRevoked ? 'revoked' : rawType);
  let text = isCallNotice ? '📞 Chamada pelo WhatsApp' : (isRevoked ? '🚫 Mensagem apagada' : safeText(msg.body || '',6000));
  // Proteção adicional contra payloads técnicos/serializados de tipos não textuais.
  // Não interfere em chat, respostas, legendas ou mensagens normais do cliente.
  const userTextTypes = new Set(['chat','buttons_response','list_response','reaction','poll_creation','poll_update']);
  if(!userTextTypes.has(rawType) && text.length > 1000){
    const compact=text.replace(/\s+/g,'');
    if(compact.length > 900 && compact.length / Math.max(1,text.length) > .82) text='⚙️ Evento técnico do WhatsApp';
  }
  const conversationsData = readJson(p.conversationsFile,{version:4,conversations:[]});
  const conversations = listFrom(conversationsData,'conversations');
  let conversation = conversations.find(c => c.id === conversationId || (group && c.whatsappId === rawChatId));
  const wasNew = !conversation;
  if(!conversation){
    conversation = {
      id:conversationId, conversationType:group?'group':'contact', phone:group?'':phone,
      phoneResolved:group?false:Boolean(resolved?.resolved), whatsappId:chatId, firstMessageDirection:fromMe?'outgoing':'incoming',
      name:whatsappName || (group?'Grupo do WhatsApp':phone), nameEdited:false,
      groupParticipantCount:group?participantCount:null,
      createdAt:timestamp, updatedAt:timestamp, firstContactAt:timestamp, lastMessageAt:timestamp,
      lastIncomingAt:null, lastOutgoingAt:null, awaitingResponse:false, waitingSince:null, unreadCount:0,
      commercialStatus:group?null:'new', commercialStatusUpdatedAt:group?null:timestamp,
      origin:group?'group':'unknown', originMode:group?'system':'automatic',
      interestProduct:'', originPage:null, firstResponseAt:null, firstResponseTimeSeconds:null, archived:false,
      attendanceState:group?null:'open', attendanceOpenedAt:group?null:timestamp, attendanceClosedAt:null,
      attendanceClosedReason:null, attendanceClosedBy:null, attendanceReopenedAt:null,
      attendanceCloseCount:0, attendanceReopenCount:0, attendanceHistory:[]
    };
    conversations.push(conversation);
  }

  const messagesPath = messageFile(p,conversation.id);
  const messageData = readJson(messagesPath,{version:4,conversationId:conversation.id,messages:[]});
  const messages = listFrom(messageData,'messages');
  if(messages.some(item=>item.id===id)) return { ignored:true, reason:'duplicada' };
  if(!conversation.firstMessageDirection && !messages.length) conversation.firstMessageDirection=fromMe?'outgoing':'incoming';

  if(!group){
    const contacts = listFrom(readJson(p.contactsFile,{version:3,contacts:[]}), 'contacts');
    const savedContact = contacts.find(c=>c.manuallySaved===true && (c.phone===phone || c.whatsappId===chatId));
    if(savedContact?.name){ conversation.name=savedContact.name; conversation.nameEdited=true; }
    else if(!conversation.nameEdited && whatsappName) conversation.name=whatsappName;
    conversation.phone=phone;
    conversation.phoneResolved=Boolean(resolved?.resolved) || Boolean(conversation.phoneResolved);
  } else {
    conversation.conversationType='group';
    conversation.whatsappId=rawChatId;
    if(!conversation.nameEdited && whatsappName) conversation.name=whatsappName;
    if(Number.isFinite(participantCount)) conversation.groupParticipantCount=participantCount;
  }

  conversation.updatedAt=timestamp;
  conversation.lastMessageAt=timestamp;
  conversation.lastMessageText=text || `[${type}]`;
  conversation.lastMessageDirection=fromMe?'outgoing':'incoming';

  let authorId='', authorName='';
  if(group){
    authorId = fromMe ? '' : safeText(msg.author || msg?._data?.author || '',180);
    if(fromMe) authorName='Você';
    else {
      try {
        const authorContact = authorId && client?.getContactById ? await client.getContactById(authorId) : null;
        authorName = safeText(authorContact?.pushname || authorContact?.name || authorContact?.shortName || msg?._data?.notifyName || normalizePhone(authorId) || 'Participante',160);
      } catch { authorName=safeText(msg?._data?.notifyName || normalizePhone(authorId) || 'Participante',160); }
    }
    conversation.lastMessageAuthor=authorName;
  }

  if(fromMe){
    conversation.lastOutgoingAt=timestamp;
    conversation.awaitingResponse=false;
    conversation.waitingSince=null;
    conversation.unreadCount=0;
    if(!group && !conversation.firstResponseAt && conversation.lastIncomingAt){
      conversation.firstResponseAt=timestamp;
      conversation.firstResponseTimeSeconds=Math.max(0,Math.round((new Date(timestamp)-new Date(conversation.firstContactAt))/1000));
    }
  } else {
    conversation.lastIncomingAt=timestamp;
    if(!options?.historical) conversation.unreadCount=Number(conversation.unreadCount||0)+1;
    if(!group){
      Object.assign(conversation,withCommercialLifecycle(conversation));
      if(conversation.attendanceState==='closed' && !options?.historical){
        conversation.attendanceState='open';
        conversation.attendanceOpenedAt=timestamp;
        conversation.attendanceReopenedAt=timestamp;
        conversation.attendanceClosedAt=null;
        conversation.attendanceClosedReason=null;
        conversation.attendanceClosedBy=null;
        conversation.attendanceReopenCount=Number(conversation.attendanceReopenCount||0)+1;
        conversation.attendanceHistory=[...(conversation.attendanceHistory||[]),{action:'reopened_automatically',at:timestamp,by:'nova_mensagem_cliente'}].slice(-100);
      }
      if(!conversation.awaitingResponse) conversation.waitingSince=timestamp;
      conversation.awaitingResponse=true;
      if(wasNew || conversation.origin==='unknown'){
        conversation.origin=detectOrigin(text);
        conversation.originMode='automatic';
      }
      if(!conversation.interestProduct) conversation.interestProduct=extractInterestProduct(text);
    }
  }

  const media = Boolean(msg.hasMedia) ? describeMedia(msg,type) : null;
  messages.push({
    id, conversationId:conversation.id, conversationType:group?'group':'contact',
    direction:fromMe?'outgoing':'incoming', type, text, timestamp,
    status:fromMe?'sent':'received', hasMedia:Boolean(msg.hasMedia), media,
    authorId:group?authorId:'', authorName:group?authorName:''
  });
  atomicWriteJson(messageFile(p,conversation.id),{version:4,conversationId:conversation.id,messages});
  atomicWriteJson(p.conversationsFile,{version:4,conversations});
  return {
    saved:true, conversationId:conversation.id, conversationType:group?'group':'contact',
    direction:fromMe?'outgoing':'incoming', phone:conversation.phone,
    phoneResolved:conversation.phoneResolved, name:conversation.name,
    preview:text || `[${type}]`, authorName, messageId:id, mediaKind:media?.kind || ''
  };
}

export async function repairInboxContactNames(app, client, options={}){
  const p=ensureInboxStorage(app);
  const data=readJson(p.conversationsFile,{version:4,conversations:[]});
  const conversations=listFrom(data,'conversations');
  const contacts=conversations.filter(c=>c.conversationType!=='group' && !isGroup(c.whatsappId));
  if(!client || !contacts.length) return {updated:0,unresolved:contacts.length,total:contacts.length};
  const ownName=safeText(client?.info?.pushname || '',160);
  const catalog=await getChatCatalog(client, options.provider);
  const byId=new Map((catalog.chats||[]).map(chat=>[serializedId(chat?.id),chat]));
  const snapshots=catalog.snapshots||[];
  const snapById=new Map(snapshots.map(item=>[item.id,item]));
  let updated=0, unresolved=0;
  for(const conversation of contacts){
    if(conversation.nameEdited) continue;
    let realName='';
    let chat=byId.get(conversation.whatsappId) || byId.get(`${conversation.phone}@c.us`) || null;
    if(!chat && conversation.whatsappId){ try{ chat=await client.getChatById(conversation.whatsappId); }catch{} }
    if(chat){
      let contact=null; try{ contact=chat.getContact?await chat.getContact():null; }catch{}
      realName=trustworthyContactName(contact,chat,ownName);
    }
    if(!realName){
      const snap=snapById.get(conversation.whatsappId) || snapById.get(`${conversation.phone}@c.us`) || snapshots.find(item=>normalizePhone(item.contactNumber||item.contactId)===conversation.phone);
      realName=safeText(snap?.contactName || snap?.formattedTitle || snap?.name || '',160);
      if(realName && ownName && realName.toLowerCase()===ownName.toLowerCase()) realName='';
    }
    if(!realName){ unresolved+=1; continue; }
    if(conversation.name!==realName){ conversation.name=realName; conversation.updatedAt=now(); updated+=1; }
  }
  if(updated) atomicWriteJson(p.conversationsFile,{version:4,conversations});
  return {updated,unresolved,total:contacts.length};
}

export async function syncInboxFromWhatsApp(app,client,options={}){
  ensureInboxStorage(app);
  const chatLimit=Math.min(200,Math.max(20,Number(options.chatLimit)||120));
  const messageLimit=Math.min(120,Math.max(20,Number(options.messageLimit)||60));
  const catalog=await getChatCatalog(client, options.provider);
  let entries=[];
  if(catalog.chats.length){
    entries=catalog.chats.map(chat=>({id:serializedId(chat.id),chat,snapshot:null,timestamp:Number(chat?.timestamp||0)}));
  }else{
    entries=(catalog.snapshots||[]).map(snapshot=>({id:snapshot.id,chat:null,snapshot,timestamp:Number(snapshot.timestamp||0)}));
  }
  entries=entries.filter(item=>item.id&&item.id!=='status@broadcast').sort((a,b)=>b.timestamp-a.timestamp).slice(0,chatLimit);
  const initialData=getInboxData(app);
  const initialConversations=initialData.conversations;
  const incremental=options.incremental !== false;
  let totalMessages=0,saved=0,errors=0,resolvedChats=0,skippedUpToDate=0;
  for(const entry of entries){
    try{
      const existing=initialConversations.find(c=>c.whatsappId===entry.id || (isGroup(entry.id) && (c.id===groupConversationId(entry.id) || idDigits(c.whatsappId)===idDigits(entry.id))) || (!isGroup(entry.id) && normalizePhone(c.phone)===normalizePhone(entry.snapshot?.contactNumber||entry.snapshot?.contactId||entry.id)));
      const rawRemoteTs=Number(entry.timestamp||0);
      const remoteMs=rawRemoteTs > 1e12 ? rawRemoteTs : rawRemoteTs*1000;
      const localMs=existing?.lastMessageAt ? new Date(existing.lastMessageAt).getTime() : 0;
      // Na abertura/reconexão, chats já atualizados não precisam buscar novamente
      // as últimas dezenas de mensagens. Isso evita milhares de leituras/escritas.
      if(incremental && existing && remoteMs > 0 && Number.isFinite(localMs) && localMs >= remoteMs-1000){
        skippedUpToDate+=1;
        continue;
      }
      let chat=entry.chat;
      if(!chat){ try{ chat=await client.getChatById(entry.id); }catch{} }
      if(!chat){ errors+=1; continue; }
      resolvedChats+=1;
      let fetched=chat.fetchMessages?await chat.fetchMessages({limit:messageLimit}):[];
      fetched=(fetched||[]).slice().sort((a,b)=>Number(a?.timestamp||0)-Number(b?.timestamp||0));
      totalMessages+=fetched.length;
      for(const message of fetched){
        if(typeof options.onMessage==='function') await options.onMessage(message);
        const result=await registerWhatsAppMessage(app,message,client,{historical:true,chatOverride:chat});
        if(result?.saved) saved+=1;
        if(typeof options.onRegistered==='function') await options.onRegistered(message,result);
      }
      const p=ensureInboxStorage(app);
      const data=readJson(p.conversationsFile,{version:4,conversations:[]});
      const conversations=listFrom(data,'conversations');
      const sid=entry.id;
      const group=Boolean(chat?.isGroup)||Boolean(entry.snapshot?.isGroup)||isGroup(sid);
      let conversation=group
        ? conversations.find(c=>c.id===groupConversationId(sid)||idDigits(c.whatsappId)===idDigits(sid))
        : conversations.find(c=>c.whatsappId===sid || normalizePhone(c.phone)===normalizePhone(entry.snapshot?.contactNumber||entry.snapshot?.contactId||sid));
      if(conversation){
        conversation.whatsappId=sid;
        if(group&&!conversation.nameEdited){
          const title=safeText(entry.snapshot?.subject || entry.snapshot?.name || entry.snapshot?.formattedTitle || chat?.name || chat?.formattedTitle || '',160);
          if(title) conversation.name=title;
        }
        if(!group&&!conversation.nameEdited){
          let contact=null; try{ contact=chat.getContact?await chat.getContact():null; }catch{}
          const remote=trustworthyContactName(contact,chat,safeText(client?.info?.pushname||'',160)) || safeText(entry.snapshot?.contactName || entry.snapshot?.formattedTitle || '',160);
          if(remote) conversation.name=remote;
        }
        const count=entry.snapshot?.participantCount ?? (Array.isArray(chat?.participants)?chat.participants.length:null);
        if(group&&Number.isFinite(Number(count))) conversation.groupParticipantCount=Number(count);
        const unread=entry.snapshot?.unreadCount ?? chat?.unreadCount;
        if(Number.isFinite(Number(unread))) conversation.unreadCount=Math.max(0,Number(unread));
        conversation.updatedAt=now();
        atomicWriteJson(p.conversationsFile,{version:4,conversations});
      }
    }catch{ errors+=1; }
  }
  return {chats:entries.length,resolvedChats,messages:totalMessages,saved,errors,skippedUpToDate,source:catalog.source || (catalog.chats.length?'public_api':'browser_store'),providerStats:catalog.providerStats || null};
}

export async function repairInboxGroupNames(app, client, options={}){
  const p=ensureInboxStorage(app);
  const data=readJson(p.conversationsFile,{version:4,conversations:[]});
  const conversations=listFrom(data,'conversations');
  const groups=conversations.filter(c=>c.conversationType==='group' || isGroup(c.whatsappId));
  if(!client || !groups.length) return {updated:0,unresolved:groups.length,total:groups.length};
  const catalog=await getChatCatalog(client, options.provider);
  const snapshots=catalog.snapshots||[];
  const key=value=>String(value||'').replace(/\D/g,'');
  const byExact=new Map(); const byKey=new Map();
  for(const chat of catalog.chats||[]){ const id=serializedId(chat.id); byExact.set(id,{chat}); byKey.set(key(id),{chat}); }
  for(const snapshot of snapshots){ byExact.set(snapshot.id,{snapshot}); byKey.set(key(snapshot.id),{snapshot}); }
  let updated=0,unresolved=0;
  for(const group of groups){
    let found=byExact.get(group.whatsappId) || byKey.get(key(group.whatsappId)) || null;
    let chat=found?.chat || null, snapshot=found?.snapshot || null;
    if(!chat && group.whatsappId){ try{ chat=await client.getChatById(group.whatsappId); }catch{} }
    const realName=safeText(snapshot?.subject || snapshot?.name || snapshot?.formattedTitle || chat?.name || chat?.formattedTitle || chat?._data?.name || '',160);
    if(!realName){ unresolved+=1; continue; }
    if(!group.nameEdited && group.name!==realName){ group.name=realName; group.updatedAt=now(); updated+=1; }
    const actualId=snapshot?.id || serializedId(chat?.id);
    if(actualId) group.whatsappId=actualId;
    const count=snapshot?.participantCount ?? (Array.isArray(chat?.participants)?chat.participants.length:null);
    if(Number.isFinite(Number(count))) group.groupParticipantCount=Number(count);
  }
  if(updated) atomicWriteJson(p.conversationsFile,{version:4,conversations});
  return {updated,unresolved,total:groups.length,source:catalog.source || (catalog.chats.length?'public_api':'browser_store')};
}

export function storeInboxMediaFile(app, conversationId, messageId, buffer, meta={}){
  const p=ensureInboxStorage(app);
  const cid=safeText(conversationId,80).replace(/[^a-zA-Z0-9_-]/g,'');
  const mid=safeText(messageId,180);
  if(!cid || !mid || !Buffer.isBuffer(buffer) || !buffer.length) return null;
  const data=readJson(messageFile(p,cid),{version:4,conversationId:cid,messages:[]});
  const messages=listFrom(data,'messages');
  const message=messages.find(item=>item.id===mid);
  if(!message) return null;
  const originalName=safeText(meta.originalName || message.media?.originalName || 'arquivo',180);
  const ext=extensionFromMime(meta.mime || message.media?.mime || '',originalName);
  const filename=`${safeFilePart(mid,'midia')}${ext}`;
  const folder=safeFilePart(cid,'conversa');
  const relativePath=path.join(folder,filename).replace(/\\/g,'/');
  const absolute=path.join(p.mediaDir,relativePath);
  ensureDir(path.dirname(absolute));
  fs.writeFileSync(absolute,buffer);
  message.media={...(message.media||{}),kind:meta.kind || message.media?.kind || mediaKind(message.type,meta.mime),mime:safeText(meta.mime || message.media?.mime || '',120),originalName,filename,relativePath,size:buffer.length,stored:true,remote:false,error:null};
  atomicWriteJson(messageFile(p,cid),{version:4,conversationId:cid,messages});
  return {absolute,relativePath,media:message.media};
}

export function getInboxMediaFile(app, conversationId, messageId){
  const p = ensureInboxStorage(app);
  const safeConversationId = safeText(conversationId,80).replace(/[^a-zA-Z0-9_-]/g,'');
  const safeMessageId = safeText(messageId,180);
  const message = getConversationMessages(app,safeConversationId).find(item=>item.id===safeMessageId);
  const relativePath = message?.media?.relativePath;
  if(!relativePath) return null;
  const root = path.resolve(p.mediaDir);
  const absolute = path.resolve(p.mediaDir,relativePath);
  if(absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  if(!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return null;
  return { absolute, message, media:message.media };
}


function walkFiles(root){
  const files=[]; const dirs=[];
  if(!fs.existsSync(root)) return {files,dirs};
  const visit=(dir)=>{
    dirs.push(dir);
    let entries=[]; try{ entries=fs.readdirSync(dir,{withFileTypes:true}); }catch{return;}
    for(const entry of entries){
      const absolute=path.join(dir,entry.name);
      if(entry.isDirectory()) visit(absolute);
      else if(entry.isFile()){
        try{ const stat=fs.statSync(absolute); files.push({absolute,size:stat.size,mtimeMs:stat.mtimeMs}); }catch{}
      }
    }
  };
  visit(root); return {files,dirs};
}
function relativeTo(root,absolute){ return path.relative(root,absolute).replace(/\\/g,'/'); }
function directorySize(root){ return walkFiles(root).files.reduce((sum,item)=>sum+item.size,0); }
function removeEmptyDirs(root){
  if(!fs.existsSync(root)) return 0;
  let removed=0;
  const visit=(dir)=>{
    let entries=[]; try{ entries=fs.readdirSync(dir,{withFileTypes:true}); }catch{return false;}
    for(const entry of entries){ if(entry.isDirectory()) visit(path.join(dir,entry.name)); }
    if(dir!==root){
      try{ if(fs.readdirSync(dir).length===0){ fs.rmdirSync(dir); removed+=1; return true; } }catch{}
    }
    return false;
  };
  visit(root); return removed;
}
function collectMediaReferences(app){
  const p=ensureInboxStorage(app);
  const conversations=getInboxData(app).conversations;
  const conversationMap=new Map(conversations.map(c=>[c.id,c]));
  const references=[];
  for(const file of walkFiles(p.messagesDir).files.filter(item=>item.absolute.endsWith('.json'))){
    const data=readJson(file.absolute,{messages:[]});
    for(const message of listFrom(data,'messages')){
      const rel=String(message?.media?.relativePath||'').replace(/\\/g,'/');
      if(!rel) continue;
      references.push({
        relativePath:rel,
        conversationId:data.conversationId||message.conversationId||'',
        messageId:message.id||'',
        conversationType:message.conversationType||conversationMap.get(data.conversationId||message.conversationId||'')?.conversationType||'contact',
        timestamp:message.timestamp||null,
        stored:Boolean(message?.media?.stored)
      });
    }
  }
  return references;
}
function bytesLabel(bytes){
  const value=Number(bytes)||0;
  if(value<1024) return `${value} B`;
  if(value<1024*1024) return `${(value/1024).toFixed(1).replace('.',',')} KB`;
  if(value<1024*1024*1024) return `${(value/1024/1024).toFixed(1).replace('.',',')} MB`;
  return `${(value/1024/1024/1024).toFixed(2).replace('.',',')} GB`;
}
export function getInboxStorageReport(app){
  const p=ensureInboxStorage(app);
  const inboxData=getInboxData(app);
  const mediaWalk=walkFiles(p.mediaDir);
  const messageWalk=walkFiles(p.messagesDir);
  const backupWalk=walkFiles(p.backupsDir);
  const rootWalk=walkFiles(p.root);
  const references=collectMediaReferences(app);
  const referencedSet=new Set(references.map(item=>item.relativePath));
  const mediaFiles=mediaWalk.files.map(item=>({...item,relativePath:relativeTo(p.mediaDir,item.absolute)}));
  const orphanFiles=mediaFiles.filter(item=>!referencedSet.has(item.relativePath));
  const groupReferenceSet=new Set(references.filter(item=>item.conversationType==='group').map(item=>item.relativePath));
  const groupFiles=mediaFiles.filter(item=>groupReferenceSet.has(item.relativePath));
  const cutoff30=Date.now()-30*86400000;
  const cutoff90=Date.now()-90*86400000;
  const old30Files=mediaFiles.filter(item=>item.mtimeMs<cutoff30);
  const old90Files=mediaFiles.filter(item=>item.mtimeMs<cutoff90);
  const invalidJson=[];
  for(const item of rootWalk.files.filter(file=>file.absolute.endsWith('.json'))){
    try{ JSON.parse(fs.readFileSync(item.absolute,'utf-8')); }catch{ invalidJson.push(relativeTo(p.root,item.absolute)); }
  }
  const emptyDirs=mediaWalk.dirs.filter(dir=>dir!==p.mediaDir).filter(dir=>{ try{return fs.readdirSync(dir).length===0;}catch{return false;} });
  let messageCount=0;
  for(const item of messageWalk.files.filter(file=>file.absolute.endsWith('.json'))){
    const data=readJson(item.absolute,{messages:[]}); messageCount+=listFrom(data,'messages').length;
  }
  const largestMedia=mediaFiles.slice().sort((a,b)=>b.size-a.size)[0]||null;
  const report={
    generatedAt:now(),
    totalBytes:rootWalk.files.reduce((sum,item)=>sum+item.size,0),
    mediaBytes:mediaFiles.reduce((sum,item)=>sum+item.size,0),
    messagesBytes:messageWalk.files.reduce((sum,item)=>sum+item.size,0),
    backupsBytes:backupWalk.files.reduce((sum,item)=>sum+item.size,0),
    messageCount,
    contacts:inboxData.conversations.filter(c=>c.conversationType!=='group').length,
    groups:inboxData.conversations.filter(c=>c.conversationType==='group').length,
    savedContacts:inboxData.contacts.length,
    mediaFiles:mediaFiles.length,
    folders:rootWalk.dirs.length,
    backups:backupWalk.files.length,
    orphanFiles:{count:orphanFiles.length,bytes:orphanFiles.reduce((sum,item)=>sum+item.size,0)},
    groupFiles:{count:groupFiles.length,bytes:groupFiles.reduce((sum,item)=>sum+item.size,0)},
    old30Files:{count:old30Files.length,bytes:old30Files.reduce((sum,item)=>sum+item.size,0)},
    old90Files:{count:old90Files.length,bytes:old90Files.reduce((sum,item)=>sum+item.size,0)},
    emptyDirs:emptyDirs.length,
    invalidJson,
    largestMedia:largestMedia?{name:path.basename(largestMedia.absolute),bytes:largestMedia.size,relativePath:largestMedia.relativePath}:null
  };
  report.labels={
    total:bytesLabel(report.totalBytes), media:bytesLabel(report.mediaBytes), messages:bytesLabel(report.messagesBytes), backups:bytesLabel(report.backupsBytes),
    orphan:bytesLabel(report.orphanFiles.bytes), groups:bytesLabel(report.groupFiles.bytes), old30:bytesLabel(report.old30Files.bytes), old90:bytesLabel(report.old90Files.bytes),
    largest:bytesLabel(report.largestMedia?.bytes||0)
  };
  return report;
}
function clearStoredMediaMetadata(app,relativePaths){
  const p=ensureInboxStorage(app); const target=new Set(relativePaths);
  if(!target.size) return 0;
  let updated=0;
  for(const file of walkFiles(p.messagesDir).files.filter(item=>item.absolute.endsWith('.json'))){
    const data=readJson(file.absolute,{messages:[]}); let changed=false;
    for(const message of listFrom(data,'messages')){
      const rel=String(message?.media?.relativePath||'').replace(/\\/g,'/');
      if(!target.has(rel)) continue;
      message.media={...message.media,stored:false,remote:true,relativePath:'',filename:'',size:Number(message.media?.size||0),error:null};
      changed=true; updated+=1;
    }
    if(changed) atomicWriteJson(file.absolute,data);
  }
  return updated;
}
export function cleanInboxStorage(app,action){
  const p=ensureInboxStorage(app); const report=getInboxStorageReport(app);
  const mediaFiles=walkFiles(p.mediaDir).files.map(item=>({...item,relativePath:relativeTo(p.mediaDir,item.absolute)}));
  const references=collectMediaReferences(app);
  const referencedSet=new Set(references.map(item=>item.relativePath));
  const groupSet=new Set(references.filter(item=>item.conversationType==='group').map(item=>item.relativePath));
  const cutoff30=Date.now()-30*86400000, cutoff90=Date.now()-90*86400000;
  let targets=[];
  if(action==='orphans') targets=mediaFiles.filter(item=>!referencedSet.has(item.relativePath));
  else if(action==='groups') targets=mediaFiles.filter(item=>groupSet.has(item.relativePath));
  else if(action==='older30') targets=mediaFiles.filter(item=>item.mtimeMs<cutoff30);
  else if(action==='older90') targets=mediaFiles.filter(item=>item.mtimeMs<cutoff90);
  else if(action==='all_media') targets=mediaFiles;
  else if(action==='empty_dirs'){
    const removedDirs=removeEmptyDirs(p.mediaDir); return {action,removedFiles:0,removedDirs,freedBytes:0,freedLabel:bytesLabel(0),updatedMessages:0};
  } else throw new Error('Ação de limpeza inválida.');
  let removedFiles=0,freedBytes=0; const removedPaths=[];
  for(const item of targets){
    try{ if(fs.existsSync(item.absolute)){ fs.unlinkSync(item.absolute); removedFiles+=1; freedBytes+=item.size; removedPaths.push(item.relativePath); } }catch{}
  }
  const updatedMessages=clearStoredMediaMetadata(app,removedPaths);
  const removedDirs=removeEmptyDirs(p.mediaDir);
  return {action,removedFiles,removedDirs,freedBytes,freedLabel:bytesLabel(freedBytes),updatedMessages,before:report.labels.media};
}

export function markConversationRead(app, conversationId){
  const p = ensureInboxStorage(app);
  const data = readJson(p.conversationsFile,{version:3,conversations:[]});
  const conversations = listFrom(data,'conversations');
  const conversation = conversations.find(c => c.id === String(conversationId || ''));
  if(!conversation) throw new Error('Conversa não encontrada.');
  if(Number(conversation.unreadCount||0)===0 && !conversation.manuallyUnread) return conversation;
  conversation.unreadCount = 0;
  conversation.manuallyUnread = false;
  conversation.readAt = now();
  conversation.updatedAt = now();
  atomicWriteJson(p.conversationsFile,{version:3,conversations});
  return conversation;
}

export function markConversationUnread(app, conversationId){
  const p = ensureInboxStorage(app);
  const data = readJson(p.conversationsFile,{version:3,conversations:[]});
  const conversations = listFrom(data,'conversations');
  const conversation = conversations.find(c => c.id === String(conversationId || ''));
  if(!conversation) throw new Error('Conversa não encontrada.');
  conversation.unreadCount = Math.max(1, Number(conversation.unreadCount || 0));
  conversation.manuallyUnread = true;
  conversation.updatedAt = now();
  atomicWriteJson(p.conversationsFile,{version:3,conversations});
  return conversation;
}
export function updateInboxContact(app, conversationId, changes={}){
  const p = ensureInboxStorage(app);
  const id = safeText(conversationId,80).replace(/[^a-zA-Z0-9_-]/g,'');
  const conversationsData = readJson(p.conversationsFile,{version:3,conversations:[]});
  const conversations = listFrom(conversationsData,'conversations');
  const conversation = conversations.find(c=>c.id===id);
  if(!conversation) throw new Error('Conversa não encontrada.');
  if(conversation.conversationType === 'group' || isGroup(conversation.whatsappId)) throw new Error('Grupos não possuem cadastro comercial.');

  const name=safeText(changes.name,160);
  if(!name) throw new Error('Informe um nome para a conversa.');
  conversation.name=name;
  conversation.nameEdited=true;
  const allowedStatus=['new','in_progress','pending','completed_sale','lost','no_potential'];
  const allowedOrigin=['site_quality','instagram','whatsapp_direct','campaign','referral','unknown'];
  if(allowedStatus.includes(changes.commercialStatus)){
    conversation.commercialStatus=changes.commercialStatus;
    conversation.commercialStatusUpdatedAt=now();
  }
  if(allowedOrigin.includes(changes.origin)){
    conversation.origin=changes.origin;
    conversation.originMode='manual';
  }
  conversation.interestProduct=safeText(changes.interestProduct,220);
  const allowedPendingTypes=['none','send_quote','send_photo','check_stock','customer_reply','supplier_reply','payment','technical','other'];
  if(allowedPendingTypes.includes(changes.pendingType)){
    conversation.pendingType=changes.pendingType;
  }
  conversation.pendingNote=safeText(changes.pendingNote,500);
  conversation.nextAction=safeText(changes.nextAction,500);
  const dueRaw=safeText(changes.nextActionDueAt,40);
  const dueDate=dueRaw ? new Date(dueRaw) : null;
  conversation.nextActionDueAt=dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : null;
  conversation.attentionUpdatedAt=now();
  conversation.updatedAt=now();

  let contactSaved=false;
  if(changes.saveContact===true){
    if(!conversation.phoneResolved) throw new Error('O número real ainda não foi identificado. Envie ou receba uma nova mensagem e tente novamente.');
    const contactsData=readJson(p.contactsFile,{version:3,contacts:[]});
    const contacts=listFrom(contactsData,'contacts').filter(c=>c.manuallySaved===true);
    let contact=contacts.find(c=>c.phone===conversation.phone || c.whatsappId===conversation.whatsappId);
    if(!contact){
      contact={
        id:`contact_${conversation.phone}`, phone:conversation.phone, name, nameEdited:true,
        manuallySaved:true, whatsappId:conversation.whatsappId, createdAt:now(), updatedAt:now(),
        firstContactAt:conversation.firstContactAt, lastContactAt:conversation.lastMessageAt, erpCustomerId:null
      };
      contacts.push(contact);
    } else {
      Object.assign(contact,{phone:conversation.phone,name,nameEdited:true,manuallySaved:true,
        whatsappId:conversation.whatsappId,updatedAt:now(),lastContactAt:conversation.lastMessageAt});
    }
    atomicWriteJson(p.contactsFile,{version:3,contacts});
    contactSaved=true;
  }

  atomicWriteJson(p.conversationsFile,{version:3,conversations});
  return { conversation, contactSaved };
}
