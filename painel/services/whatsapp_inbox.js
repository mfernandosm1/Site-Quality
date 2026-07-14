import fs from 'fs';
import path from 'path';

function paths(app){
  const root = path.join(app.locals.paths.CONTENT_DIR, 'automacao_whatsapp', 'inbox');
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
    'audio/ogg':'.ogg','audio/mpeg':'.mp3','audio/mp4':'.m4a','audio/webm':'.webm',
    'video/mp4':'.mp4','video/webm':'.webm','application/pdf':'.pdf',
    'application/msword':'.doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'.docx',
    'application/vnd.ms-excel':'.xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'.xlsx',
    'text/plain':'.txt','application/zip':'.zip'
  };
  return map[String(mime || '').toLowerCase()] || '';
}
function mediaKind(type='', mime=''){
  if(String(mime).startsWith('image/') || ['image','sticker'].includes(type)) return 'image';
  if(String(mime).startsWith('audio/') || ['audio','ptt'].includes(type)) return 'audio';
  if(String(mime).startsWith('video/') || type === 'video') return 'video';
  return 'document';
}
async function downloadAndStoreMedia(p, msg, conversationId, messageId, timestamp, type){
  if(!msg?.hasMedia || typeof msg.downloadMedia !== 'function') return null;
  try {
    const downloaded = await msg.downloadMedia();
    if(!downloaded?.data) throw new Error('WhatsApp não retornou o conteúdo da mídia.');
    const mime = safeText(downloaded.mimetype || '',120).toLowerCase();
    const originalName = safeText(downloaded.filename || msg?._data?.filename || '',180);
    const date = new Date(timestamp || now());
    const year = String(date.getFullYear());
    const month = String(date.getMonth()+1).padStart(2,'0');
    const relativeDir = path.join(safeFilePart(conversationId,'contato'),year,month);
    const dir = path.join(p.mediaDir,relativeDir);
    ensureDir(dir);
    const ext = extensionFromMime(mime,originalName);
    const base = safeFilePart(path.basename(originalName, path.extname(originalName)) || `${type || 'midia'}-${messageId}`,'midia');
    const filename = `${base}-${safeFilePart(messageId,'msg').slice(-28)}${ext}`;
    const absolute = path.join(dir,filename);
    const buffer = Buffer.from(downloaded.data,'base64');
    if(!fs.existsSync(absolute)) fs.writeFileSync(absolute,buffer);
    return {
      kind:mediaKind(type,mime), mime, originalName:originalName || filename, filename,
      relativePath:path.join(relativeDir,filename).replace(/\\/g,'/'), size:buffer.length,
      stored:true, error:null
    };
  } catch(error){
    return { kind:mediaKind(type,''), mime:'', originalName:'', filename:'', relativePath:'', size:0, stored:false, error:safeText(error.message,300) };
  }
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
  for(const pattern of patterns){ const match = raw.match(pattern); if(match?.[1]) return safeText(match[1],220); }
  return '';
}

function savedContactFor(contacts, conversation){
  return contacts.find(c => c.manuallySaved === true && (
    (conversation.phoneResolved && c.phone === conversation.phone) ||
    (conversation.whatsappId && c.whatsappId === conversation.whatsappId)
  )) || null;
}

export function getInboxData(app){
  const p = ensureInboxStorage(app);
  const contacts = listFrom(readJson(p.contactsFile,{contacts:[]}), 'contacts');
  const conversations = listFrom(readJson(p.conversationsFile,{conversations:[]}), 'conversations')
    .map(c => {
      const conversationType = c.conversationType || (isGroup(c.whatsappId) || String(c.id||'').startsWith('group_') ? 'group' : 'contact');
      return { ...c, conversationType, contactSaved:conversationType === 'contact' && Boolean(savedContactFor(contacts,c)) };
    })
    .sort((a,b)=>String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')));
  return { conversations, contacts:contacts.filter(c => c.manuallySaved === true) };
}

export function getConversationMessages(app, conversationId){
  const p = ensureInboxStorage(app);
  const data = readJson(messageFile(p, conversationId), { version:3, conversationId, messages:[] });
  return listFrom(data,'messages').slice().sort((a,b)=>String(a.timestamp||'').localeCompare(String(b.timestamp||'')));
}

export function getInboxSummary(app){
  const data = getInboxData(app);
  const conversations = data.conversations.filter(c => c.conversationType !== 'group');
  const groups = data.conversations.filter(c => c.conversationType === 'group');
  return {
    groups: groups.length,
    total: conversations.length,
    awaitingResponse: conversations.filter(c => c.awaitingResponse).length,
    newContacts: conversations.filter(c => c.commercialStatus === 'new').length,
    inProgress: conversations.filter(c => c.commercialStatus === 'in_progress').length,
    pending: conversations.filter(c => c.commercialStatus === 'pending').length,
    completedSales: conversations.filter(c => c.commercialStatus === 'completed_sale').length,
    lost: conversations.filter(c => c.commercialStatus === 'lost').length,
    noPotential: conversations.filter(c => c.commercialStatus === 'no_potential').length
  };
}


export function getCommercialDashboard(app){
  const conversations = getInboxData(app).conversations.filter(c => c.conversationType !== 'group');
  const statusOrder = ['new','in_progress','pending','completed_sale','lost','no_potential'];
  const originOrder = ['site_quality','instagram','whatsapp_direct','campaign','referral','unknown'];
  const byStatus = Object.fromEntries(statusOrder.map(key => [key, conversations.filter(c => c.commercialStatus === key).length]));
  const byOrigin = Object.fromEntries(originOrder.map(key => [key, conversations.filter(c => (c.origin || 'unknown') === key).length]));
  const responseTimes = conversations.map(c => Number(c.firstResponseTimeSeconds)).filter(Number.isFinite).filter(v => v >= 0);
  const averageFirstResponseSeconds = responseTimes.length ? Math.round(responseTimes.reduce((sum,value)=>sum+value,0)/responseTimes.length) : null;
  const completed = byStatus.completed_sale || 0;
  const lost = byStatus.lost || 0;
  const qualifiedBase = completed + lost;
  const conversionRate = qualifiedBase ? Math.round((completed / qualifiedBase) * 100) : 0;
  const interests = new Map();
  for(const conversation of conversations){
    const interest = safeText(conversation.interestProduct,220);
    if(!interest) continue;
    const key = interest.toLocaleLowerCase('pt-BR');
    const current = interests.get(key) || { name:interest, total:0 };
    current.total += 1;
    interests.set(key,current);
  }
  const topInterests = [...interests.values()].sort((a,b)=>b.total-a.total || a.name.localeCompare(b.name,'pt-BR')).slice(0,8);
  const opportunities = conversations.filter(c => !['completed_sale','lost','no_potential'].includes(c.commercialStatus || 'new'))
    .sort((a,b)=>Number(Boolean(b.awaitingResponse))-Number(Boolean(a.awaitingResponse)) || String(b.lastMessageAt||'').localeCompare(String(a.lastMessageAt||'')))
    .slice(0,30);
  return {
    total:conversations.length,
    activePipeline:(byStatus.new||0)+(byStatus.in_progress||0)+(byStatus.pending||0),
    awaitingResponse:conversations.filter(c=>c.awaitingResponse).length,
    completedSales:completed,
    conversionRate,
    averageFirstResponseSeconds,
    byStatus,
    byOrigin,
    topInterests,
    opportunities
  };
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

export async function registerWhatsAppMessage(app, msg, client=null){
  const p = ensureInboxStorage(app);
  const id = safeText(msg?.id?._serialized || msg?.id?.id || '', 180);
  if(!id) return { ignored:true, reason:'sem_id' };
  const fromMe = Boolean(msg.fromMe);
  const rawChatId = fromMe ? String(msg.to || '') : String(msg.from || '');
  if(!rawChatId || rawChatId === 'status@broadcast') return { ignored:true, reason:'chat_nao_suportado' };

  const group = isGroup(rawChatId);
  let phone='', chatId=rawChatId, conversationId='', resolved=null, chat=null, whatsappName='', participantCount=null;
  if(group){
    conversationId = groupConversationId(rawChatId);
    if(!conversationId) return { ignored:true, reason:'sem_identificador', whatsappId:rawChatId };
    try { chat = await msg.getChat(); } catch {}
    whatsappName = safeText(chat?.name || chat?.formattedTitle || msg?._data?.notifyName || 'Grupo do WhatsApp',160);
    participantCount = Array.isArray(chat?.participants) ? chat.participants.length : null;
  } else {
    resolved = await resolvePhone(client,msg,rawChatId);
    if(!resolved.phone) return { ignored:true, reason:'sem_identificador', whatsappId:resolved.whatsappId };
    phone = resolved.phone;
    chatId = resolved.whatsappId || rawChatId;
    conversationId = phone;
    whatsappName = safeText(resolved.contact?.pushname || resolved.contact?.name || resolved.contact?.shortName || msg?._data?.notifyName || phone,160);
  }

  const timestamp = msg.timestamp ? new Date(Number(msg.timestamp)*1000).toISOString() : now();
  const text = safeText(msg.body || '',6000);
  const type = safeText(msg.type || 'chat',40);
  const conversationsData = readJson(p.conversationsFile,{version:4,conversations:[]});
  const conversations = listFrom(conversationsData,'conversations');
  let conversation = conversations.find(c => c.id === conversationId || (group && c.whatsappId === rawChatId));
  const wasNew = !conversation;
  if(!conversation){
    conversation = {
      id:conversationId, conversationType:group?'group':'contact', phone:group?'':phone,
      phoneResolved:group?false:Boolean(resolved?.resolved), whatsappId:chatId,
      name:whatsappName || (group?'Grupo do WhatsApp':phone), nameEdited:false,
      groupParticipantCount:group?participantCount:null,
      createdAt:timestamp, updatedAt:timestamp, firstContactAt:timestamp, lastMessageAt:timestamp,
      lastIncomingAt:null, lastOutgoingAt:null, awaitingResponse:false, waitingSince:null, unreadCount:0,
      commercialStatus:group?null:'new', commercialStatusUpdatedAt:group?null:timestamp,
      origin:group?'group':'unknown', originMode:group?'system':'automatic',
      interestProduct:'', originPage:null, firstResponseAt:null, firstResponseTimeSeconds:null, archived:false
    };
    conversations.push(conversation);
  }

  const messagesPath = messageFile(p,conversation.id);
  const messageData = readJson(messagesPath,{version:4,conversationId:conversation.id,messages:[]});
  const messages = listFrom(messageData,'messages');
  if(messages.some(item=>item.id===id)) return { ignored:true, reason:'duplicada' };

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
    conversation.unreadCount=Number(conversation.unreadCount||0)+1;
    if(!group){
      if(!conversation.awaitingResponse) conversation.waitingSince=timestamp;
      conversation.awaitingResponse=true;
      if(wasNew || conversation.origin==='unknown'){
        conversation.origin=detectOrigin(text);
        conversation.originMode='automatic';
      }
      if(!conversation.interestProduct) conversation.interestProduct=extractInterestProduct(text);
    }
  }

  const media = Boolean(msg.hasMedia) ? await downloadAndStoreMedia(p,msg,conversation.id,id,timestamp,type) : null;
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
    preview:text || `[${type}]`, authorName
  };
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

export function markConversationRead(app, conversationId){
  const p = ensureInboxStorage(app);
  const data = readJson(p.conversationsFile,{version:3,conversations:[]});
  const conversations = listFrom(data,'conversations');
  const conversation = conversations.find(c => c.id === String(conversationId || ''));
  if(!conversation) throw new Error('Conversa não encontrada.');
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
