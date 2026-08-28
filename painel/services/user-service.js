import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function text(value=''){ return String(value ?? '').trim(); }
function normalize(value=''){
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function bool(value, fallback=false){
  if(value === undefined || value === null || value === '') return fallback;
  if(typeof value === 'boolean') return value;
  return ['1','true','yes','on','sim'].includes(normalize(value));
}
function cleanTime(value='',fallback='08:00'){
  const raw=text(value);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(raw) ? raw : fallback;
}
function cleanDate(value=''){
  const raw=text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}
function normalizeIp(value=''){
  let raw=text(value).replace(/^\[|\]$/g,'');
  if(raw.startsWith('::ffff:')) raw=raw.slice(7);
  if(raw==='::1') return '127.0.0.1';
  return raw;
}
function publicUser(user={}){
  const { passwordHash, passwordSalt, recoveryKeyHash, recoveryKeySalt, ...safe } = user;
  safe.recoveryKeyConfigured=Boolean(recoveryKeyHash&&recoveryKeySalt);
  safe.displayName=text(safe.displayName)||text(safe.name)||text(safe.username);
  safe.accessPolicy=safe.accessPolicy && typeof safe.accessPolicy==='object' ? clone(safe.accessPolicy) : {accessUntil:'',scheduleEnabled:false,schedule:{},ipRestrictionEnabled:false,allowedIps:[]};
  safe.pdvPolicy=safe.pdvPolicy && typeof safe.pdvPolicy==='object' ? clone(safe.pdvPolicy) : {maxDiscountPercent:0};
  return clone(safe);
}

export default class UserService {
  constructor({ dataDir }){
    this.dataDir=path.resolve(dataDir);
    this.usersFile=path.join(this.dataDir,'users.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.usersFile)) this.write({version:'1.3',items:[]});
  }

  read(){
    try{
      const data=JSON.parse(fs.readFileSync(this.usersFile,'utf8'));
      return {version:data?.version||'1.3',items:Array.isArray(data?.items)?data.items:[]};
    }catch(_){ return {version:'1.3',items:[]}; }
  }

  write(data){
    fs.mkdirSync(path.dirname(this.usersFile),{recursive:true});
    const temp=`${this.usersFile}.tmp`;
    fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');
    fs.renameSync(temp,this.usersFile);
  }

  list({includeInactive=true}={}){
    return this.read().items
      .filter(user=>includeInactive || user.active!==false)
      .map(publicUser)
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  }

  get(id){
    const user=this.read().items.find(item=>String(item.id)===String(id));
    return user ? publicUser(user) : null;
  }

  getRaw(id){ return this.read().items.find(item=>String(item.id)===String(id)) || null; }

  defaultFunctions(profileId=''){
    return {
      seller: profileId==='seller',
      technician: profileId==='service'
    };
  }

  validateUsername(username='',excludeId=''){
    const clean=normalize(username);
    if(!clean) throw new Error('Informe o usuário de acesso.');
    if(clean.length<3) throw new Error('O usuário de acesso precisa ter pelo menos 3 caracteres.');
    if(!/^[a-z0-9._-]+$/.test(clean)) throw new Error('No usuário de acesso use apenas letras, números, ponto, hífen ou sublinhado.');
    const duplicate=this.read().items.find(item=>String(item.id)!==String(excludeId) && normalize(item.username)===clean);
    if(duplicate) throw new Error(`O usuário “${username}” já está cadastrado.`);
    return clean;
  }

  validateEmail(email='',excludeId=''){
    const clean=text(email).toLowerCase();
    if(!clean) throw new Error('Informe o e-mail do usuário. Ele é obrigatório para recuperação de acesso.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Informe um e-mail válido.');
    const duplicate=this.read().items.find(item=>String(item.id)!==String(excludeId) && text(item.email).toLowerCase()===clean);
    if(duplicate) throw new Error(`O e-mail “${email}” já está vinculado a outro usuário.`);
    return clean;
  }


  validateMobile(mobile='',excludeId='',required=true){
    let digits=String(mobile??'').replace(/\D+/g,'');
    if(digits.startsWith('55') && digits.length>=12) digits=digits.slice(2);
    if(!digits){
      if(required) throw new Error('Informe o celular do usuário. Ele será usado como segundo canal de recuperação.');
      return '';
    }
    if(!/^\d{10,11}$/.test(digits)) throw new Error('Informe um celular válido com DDD.');
    const duplicate=this.read().items.find(item=>String(item.id)!==String(excludeId) && String(item.mobile||'').replace(/\D+/g,'').replace(/^55(?=\d{10,11}$)/,'')===digits);
    if(duplicate) throw new Error('Este celular já está vinculado a outro usuário.');
    return digits;
  }

  maskMobile(mobile=''){
    const d=String(mobile||'').replace(/\D+/g,'');
    if(d.length===11) return `(${d.slice(0,2)}) *****-${d.slice(-4)}`;
    if(d.length===10) return `(${d.slice(0,2)}) ****-${d.slice(-4)}`;
    return '';
  }

  hashRecoveryKey(key='',salt=''){
    return crypto.createHash('sha256').update(`${salt}:${String(key||'').trim().toUpperCase()}`).digest('hex');
  }

  generateRecoveryKey(id,actor='painel'){
    const data=this.read(),index=data.items.findIndex(item=>String(item.id)===String(id));
    if(index<0) throw new Error('Usuário não encontrado.');
    const raw=crypto.randomBytes(10).toString('hex').toUpperCase();
    const key=`QERP-${raw.slice(0,5)}-${raw.slice(5,10)}-${raw.slice(10,15)}-${raw.slice(15,20)}`;
    const salt=crypto.randomBytes(16).toString('hex');
    data.items[index].recoveryKeySalt=salt;
    data.items[index].recoveryKeyHash=this.hashRecoveryKey(key,salt);
    data.items[index].recoveryKeyCreatedAt=new Date().toISOString();
    data.items[index].recoveryKeyCreatedBy=text(actor)||'painel';
    data.items[index].updatedAt=new Date().toISOString();
    data.items[index].updatedBy=text(actor)||'painel';
    data.version='1.3';this.write(data);
    return {user:publicUser(data.items[index]),key};
  }

  recoveryIdentity(login=''){
    const needle=normalize(login);
    if(!needle) return null;
    const user=this.read().items.find(item=>item.active!==false && (normalize(item.username)===needle || normalize(item.email)===needle));
    if(!user) return null;
    const email=text(user.email),[local='',domain='']=email.split('@');
    const maskedEmail=email?`${local.slice(0,2)}${local.length>2?'***':''}@${domain}`:'';
    return {id:user.id,name:user.name,username:user.username,emailMasked:maskedEmail,mobileMasked:this.maskMobile(user.mobile),recoveryKeyConfigured:Boolean(user.recoveryKeyHash&&user.recoveryKeySalt)};
  }

  resetWithRecoveryKey(login='',key='',password=''){
    const needle=normalize(login),data=this.read();
    const index=data.items.findIndex(item=>item.active!==false && (normalize(item.username)===needle || normalize(item.email)===needle));
    if(index<0) throw new Error('Não foi possível validar os dados de recuperação.');
    const user=data.items[index];
    if(!user.recoveryKeyHash||!user.recoveryKeySalt) throw new Error('Esta conta não possui chave de recuperação configurada. Procure um administrador.');
    const candidate=this.hashRecoveryKey(key,user.recoveryKeySalt);
    const a=Buffer.from(candidate,'hex'),b=Buffer.from(user.recoveryKeyHash,'hex');
    if(a.length!==b.length||!crypto.timingSafeEqual(a,b)) throw new Error('Não foi possível validar os dados de recuperação.');
    Object.assign(user,this.hashPassword(password),{updatedAt:new Date().toISOString(),updatedBy:'recuperacao-chave'});
    delete user.recoveryKeyHash;delete user.recoveryKeySalt;delete user.recoveryKeyCreatedAt;delete user.recoveryKeyCreatedBy;
    data.version='1.3';this.write(data);
    return publicUser(user);
  }

  validateDisplayName(displayName='',excludeId=''){
    const clean=text(displayName);
    if(!clean) throw new Error('Informe o nome curto que aparecerá no PDV e na O.S.');
    if(clean.length>24) throw new Error('O nome exibido no PDV/O.S. pode ter no máximo 24 caracteres.');
    const duplicate=this.read().items.find(item=>{
      if(String(item.id)===String(excludeId)) return false;
      const existing=text(item.displayName)||text(item.name)||text(item.username);
      return normalize(existing)===normalize(clean);
    });
    if(duplicate) throw new Error(`O nome exibido “${clean}” já está sendo usado por outro usuário. Escolha outro para evitar vendedores/técnicos duplicados.`);
    return clean;
  }

  sanitizeAccessPolicy(payload={},current={}){
    const source=payload && typeof payload==='object' ? payload : {};
    const old=current && typeof current==='object' ? current : {};
    const scheduleEnabled=bool(source.scheduleEnabled,old.scheduleEnabled===true);
    const ipRestrictionEnabled=bool(source.ipRestrictionEnabled,old.ipRestrictionEnabled===true);
    const accessUntil=source.accessUntil!==undefined ? cleanDate(source.accessUntil) : cleanDate(old.accessUntil);
    const incomingSchedule=source.schedule && typeof source.schedule==='object' ? source.schedule : {};
    const oldSchedule=old.schedule && typeof old.schedule==='object' ? old.schedule : {};
    const schedule={};
    for(let day=0;day<7;day++){
      const key=String(day);
      const row=incomingSchedule[key] && typeof incomingSchedule[key]==='object' ? incomingSchedule[key] : (oldSchedule[key]||{});
      schedule[key]={
        enabled:bool(row.enabled,false),
        start:cleanTime(row.start,'08:00'),
        end:cleanTime(row.end,'18:00')
      };
    }
    if(scheduleEnabled && !Object.values(schedule).some(row=>row.enabled)) throw new Error('Na restrição por horário, habilite pelo menos um dia da semana.');
    const rawIps=Array.isArray(source.allowedIps) ? source.allowedIps : (typeof source.allowedIps==='string' ? source.allowedIps.split(/[\n,;]+/) : (Array.isArray(old.allowedIps)?old.allowedIps:[]));
    const allowedIps=[...new Set(rawIps.map(normalizeIp).filter(Boolean))].slice(0,24);
    if(ipRestrictionEnabled && !allowedIps.length) throw new Error('Informe pelo menos um IP permitido ou desative a restrição por IP.');
    return {accessUntil,scheduleEnabled,schedule,ipRestrictionEnabled,allowedIps};
  }


  sanitizePdvPolicy(payload={},current={}){
    const source=payload && typeof payload==='object' ? payload : {};
    const old=current && typeof current==='object' ? current : {};
    const raw=source.maxDiscountPercent!==undefined ? source.maxDiscountPercent : old.maxDiscountPercent;
    const maxDiscountPercent=Math.min(100,Math.max(0,Number(raw)||0));
    return {maxDiscountPercent:Math.round(maxDiscountPercent*100)/100};
  }

  hashPassword(password=''){
    const raw=String(password||'');
    if(raw.length<6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
    const salt=crypto.randomBytes(16).toString('hex');
    const hash=crypto.scryptSync(raw,salt,64).toString('hex');
    return {passwordSalt:salt,passwordHash:hash};
  }

  verifyPassword(user,password=''){
    if(!user?.passwordHash || !user?.passwordSalt) return false;
    try{
      const candidate=crypto.scryptSync(String(password||''),user.passwordSalt,64);
      const stored=Buffer.from(user.passwordHash,'hex');
      return stored.length===candidate.length && crypto.timingSafeEqual(stored,candidate);
    }catch(_){ return false; }
  }

  save(payload={},actor='painel'){
    const data=this.read();
    const id=text(payload.id);
    const index=id ? data.items.findIndex(item=>String(item.id)===id) : -1;
    const current=index>=0 ? data.items[index] : null;
    const creating=!current;
    const name=text(payload.name);
    if(!name) throw new Error('Informe o nome do usuário.');
    const profileId=text(payload.profileId)||'seller';
    const defaults=this.defaultFunctions(profileId);
    const username=this.validateUsername(payload.username || current?.username || '',current?.id||'');
    const email=this.validateEmail(payload.email,current?.id||'');
    const mobile=this.validateMobile(payload.mobile!==undefined?payload.mobile:current?.mobile,current?.id||'',creating||payload.mobile!==undefined||Boolean(current?.mobile));
    const displayName=this.validateDisplayName(payload.displayName || current?.displayName || name,current?.id||'');
    const accessPolicy=this.sanitizeAccessPolicy(payload.accessPolicy||{},current?.accessPolicy||{});
    const pdvPolicy=this.sanitizePdvPolicy(payload.pdvPolicy||{},current?.pdvPolicy||{});
    const now=new Date().toISOString();
    const user={
      ...(current||{}),
      id:current?.id || `USR-${crypto.randomUUID()}`,
      name,
      displayName,
      username,
      email,
      mobile,
      profileId,
      active:bool(payload.active,current ? current.active!==false : true),
      seller:bool(payload.seller,current ? current.seller===true : defaults.seller),
      technician:bool(payload.technician,current ? current.technician===true : defaults.technician),
      accessPolicy,
      pdvPolicy,
      updatedAt:now,
      updatedBy:text(actor)||'painel'
    };
    if(creating){ user.createdAt=now; user.createdBy=text(actor)||'painel'; }
    if(text(payload.password)) Object.assign(user,this.hashPassword(payload.password));
    if(creating && !user.passwordHash) throw new Error('Informe uma senha inicial com pelo menos 6 caracteres.');
    if(index>=0) data.items[index]=user; else data.items.push(user);
    data.version='1.3';
    this.write(data);
    return publicUser(user);
  }

  setPassword(id,password='',actor='painel'){
    const data=this.read();
    const index=data.items.findIndex(item=>String(item.id)===String(id));
    if(index<0) throw new Error('Usuário não encontrado.');
    Object.assign(data.items[index],this.hashPassword(password),{updatedAt:new Date().toISOString(),updatedBy:text(actor)||'painel'});
    this.write(data);
    return publicUser(data.items[index]);
  }

  setActive(id,active,actor='painel'){
    const data=this.read();
    const index=data.items.findIndex(item=>String(item.id)===String(id));
    if(index<0) throw new Error('Usuário não encontrado.');
    data.items[index].active=Boolean(active);
    data.items[index].updatedAt=new Date().toISOString();
    data.items[index].updatedBy=text(actor)||'painel';
    this.write(data);
    return publicUser(data.items[index]);
  }

  findByEmail(email=''){
    const needle=text(email).toLowerCase();
    if(!needle) return null;
    const user=this.read().items.find(item=>text(item.email).toLowerCase()===needle);
    return user ? publicUser(user) : null;
  }

  findByLogin(login=''){
    const needle=normalize(login);
    if(!needle) return null;
    const user=this.read().items.find(item=>item.active!==false && (normalize(item.username)===needle || normalize(item.email)===needle));
    return user ? publicUser(user) : null;
  }

  authenticate(login='',password=''){
    const needle=normalize(login);
    if(!needle) return null;
    const user=this.read().items.find(item=>item.active!==false && (normalize(item.username)===needle || normalize(item.email)===needle));
    return user && this.verifyPassword(user,password) ? publicUser(user) : null;
  }
}
