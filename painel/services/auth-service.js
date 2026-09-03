import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { businessDate } from '../utils/date-time.js';

function text(value=''){ return String(value ?? '').trim(); }
function base64url(value){ return Buffer.from(value).toString('base64url'); }
function fromBase64url(value){ return Buffer.from(String(value||''),'base64url').toString('utf8'); }
function parseCookies(header=''){
  const out={};
  String(header||'').split(';').forEach(part=>{
    const index=part.indexOf('=');
    if(index<0)return;
    const key=part.slice(0,index).trim();
    if(!key)return;
    try{ out[key]=decodeURIComponent(part.slice(index+1).trim()); }catch(_){ out[key]=part.slice(index+1).trim(); }
  });
  return out;
}
function jsonRequest(req){
  return req.path.includes('/api/') || req.path.startsWith('/api/') || String(req.headers.accept||'').includes('application/json') || String(req.headers['x-requested-with']||'').toLowerCase()==='xmlhttprequest';
}
function safeReturnTo(value=''){
  const raw=text(value);
  if(!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/login') || raw.startsWith('/logout')) return '/';
  return raw.slice(0,1200);
}
function normalizeIp(value=''){
  let raw=text(value).replace(/^\[|\]$/g,'');
  if(raw.includes(',') ) raw=raw.split(',')[0].trim();
  if(raw.startsWith('::ffff:')) raw=raw.slice(7);
  if(raw==='::1') return '127.0.0.1';
  return raw;
}
function minutesFromTime(value='00:00'){
  const [h,m]=String(value||'00:00').split(':').map(Number);
  return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);
}
function localDateKey(date=new Date()){ return businessDate(date); }

export default class AuthService {
  constructor({ dataDir, userService, permissionService, cookieName='quality_erp_auth', ttlHours=1 }={}){
    this.dataDir=path.resolve(dataDir);
    this.userService=userService;
    this.permissionService=permissionService;
    this.cookieName=cookieName;
    this.ttlMs=Math.max(1,Number(ttlHours)||168)*60*60*1000;
    this.secretFile=path.join(this.dataDir,'auth-secret.key');
    fs.mkdirSync(this.dataDir,{recursive:true});
    this.secret=this.loadSecret();
  }

  loadSecret(){
    try{
      if(fs.existsSync(this.secretFile)){
        const value=fs.readFileSync(this.secretFile,'utf8').trim();
        if(value.length>=48)return value;
      }
    }catch(_){ }
    const secret=crypto.randomBytes(48).toString('hex');
    try{ fs.writeFileSync(this.secretFile,secret,{encoding:'utf8',mode:0o600}); }catch(_){ fs.writeFileSync(this.secretFile,secret,'utf8'); }
    return secret;
  }

  sign(payload){ return crypto.createHmac('sha256',this.secret).update(payload).digest('base64url'); }

  tokenFor(user){
    const payload=base64url(JSON.stringify({ uid:user.id, iat:Date.now(), exp:Date.now()+this.ttlMs }));
    return `${payload}.${this.sign(payload)}`;
  }

  verifyToken(token=''){
    try{
      const [payload,signature]=String(token||'').split('.');
      if(!payload||!signature)return null;
      const expected=this.sign(payload);
      const left=Buffer.from(signature); const right=Buffer.from(expected);
      if(left.length!==right.length || !crypto.timingSafeEqual(left,right))return null;
      const data=JSON.parse(fromBase64url(payload));
      if(!data?.uid || !Number.isFinite(Number(data.exp)) || Number(data.exp)<Date.now())return null;
      const user=this.userService?.get?.(data.uid);
      return user?.active!==false ? user : null;
    }catch(_){ return null; }
  }

  setCookie(res,user,req){
    const secure=String(req?.headers?.['x-forwarded-proto']||'').split(',')[0].trim()==='https' || req?.secure===true;
    const parts=[`${this.cookieName}=${encodeURIComponent(this.tokenFor(user))}`,'Path=/','HttpOnly','SameSite=Lax',`Max-Age=${Math.floor(this.ttlMs/1000)}`];
    if(secure)parts.push('Secure');
    res.append('Set-Cookie',parts.join('; '));
  }

  clearCookie(res){ res.append('Set-Cookie',`${this.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`); }

  currentUser(req){
    const cookies=parseCookies(req.headers.cookie||'');
    return this.verifyToken(cookies[this.cookieName]||'');
  }

  clientIp(req){
    return normalizeIp(req?.ip || req?.socket?.remoteAddress || req?.connection?.remoteAddress || '');
  }

  accessStatus(user,req,now=new Date()){
    if(!user) return {allowed:false,code:'AUTH_REQUIRED',message:'Usuário não autenticado.'};
    const policy=user.accessPolicy && typeof user.accessPolicy==='object' ? user.accessPolicy : {};
    const until=text(policy.accessUntil);
    if(until && localDateKey(now)>until){
      return {allowed:false,code:'ACCESS_EXPIRED',message:`Seu acesso ao ERP terminou em ${until.split('-').reverse().join('/')}. Procure um administrador.`};
    }

    if(policy.ipRestrictionEnabled===true){
      const ip=this.clientIp(req);
      const allowed=(Array.isArray(policy.allowedIps)?policy.allowedIps:[]).map(normalizeIp).filter(Boolean);
      if(!ip || !allowed.includes(ip)) return {allowed:false,code:'IP_RESTRICTED',message:`Este usuário não está liberado para acessar pelo IP atual${ip?` (${ip})`:''}.`};
    }

    if(policy.scheduleEnabled===true){
      const day=String(now.getDay());
      const rule=policy.schedule?.[day];
      if(!rule?.enabled) return {allowed:false,code:'SCHEDULE_RESTRICTED',message:'Este usuário não tem acesso liberado neste dia da semana.'};
      const current=now.getHours()*60+now.getMinutes();
      const start=minutesFromTime(rule.start||'00:00');
      const end=minutesFromTime(rule.end||'23:59');
      const inside=start<=end ? current>=start && current<=end : current>=start || current<=end;
      if(!inside) return {allowed:false,code:'SCHEDULE_RESTRICTED',message:`Acesso permitido hoje somente das ${rule.start||'00:00'} às ${rule.end||'23:59'}.`};
    }
    return {allowed:true,code:'OK',message:''};
  }

  can(user,permission=''){
    if(!user)return false;
    return this.permissionService?.can?.(user.profileId,permission)===true;
  }

  profile(user){ return user ? this.permissionService?.get?.(user.profileId) || null : null; }
  permissions(user){ return this.profile(user)?.permissions || []; }

  attachUser(){
    return (req,res,next)=>{
      const sessionUser=this.currentUser(req);
      const status=sessionUser?this.accessStatus(sessionUser,req):{allowed:false,code:'AUTH_REQUIRED',message:''};
      req.authAccessStatus=status;
      req.user=status.allowed?sessionUser:null;
      if(sessionUser && !status.allowed) this.clearCookie(res);
      // Sessão deslizante: 1 hora sem nenhuma atividade protegida encerra o login.
      // Cada ação válida do usuário renova a janela, sem guardar senha ou sessão no servidor.
      if(req.user && this.permissionFor(req)) this.setCookie(res,req.user,req);
      res.locals.currentUser=req.user||null;
      res.locals.currentProfile=req.user?this.profile(req.user):null;
      res.locals.currentPermissions=req.user?this.permissions(req.user):[];
      res.locals.can=(permission)=>this.can(req.user,permission);
      next();
    };
  }

  permissionFor(req){
    const p=String(req.path||'');
    const method=String(req.method||'GET').toUpperCase();
    const write=!['GET','HEAD','OPTIONS'].includes(method);

    if(p==='/' || p.startsWith('/api/dashboard') || p.startsWith('/atalhos/')) return write?'dashboard.manage':'dashboard.view';
    if(p.startsWith('/configuracoes/usuarios')) return 'users.manage';
    if(p.startsWith('/configuracoes')) return 'settings.manage';
    if(p.startsWith('/kernel')) return write?'audit.manage':'audit.view';

    if(p.startsWith('/erp/api/metas-comissoes') || p.startsWith('/erp/metas-comissoes')) return write?'commissions.manage':'commissions.view';
    if(p.startsWith('/erp/api/relatorios') || p.startsWith('/erp/relatorios')) return 'reports.view';
    if(p.startsWith('/erp/financeiro')) return write?'finance.manage':'finance.view';
    if(p==='/erp/pdv/descontos/chave') return 'pdv.discount.approve';
    if(p.startsWith('/erp/pdv/trocas-devolucoes')) return 'pdv.returns';
    if(p.startsWith('/erp/pdv/operacoes/') && /\/(cancelar|estornar)$/.test(p)) return 'pdv.cancel';
    if(p.startsWith('/erp/pdv/caixa')) return write?'cash.manage':'cash.view';
    if(p.startsWith('/erp/pdv')) return write?'pdv.sell':'pdv.view';
    if(p.startsWith('/erp/estoque')) return write?'inventory.manage':'inventory.view';
    if(p.startsWith('/erp/precificacao') || p.startsWith('/erp/api/precificacao')) return write?'products.manage':'products.view';
    if(p.startsWith('/erp/compras')) return write?'purchases.manage':'purchases.view';
    if(p.startsWith('/erp/clientes')) return write?'customers.manage':'customers.view';
    if(p.startsWith('/erp/fornecedores')) return write?'suppliers.manage':'suppliers.view';
    if(p.startsWith('/erp/produtos')) return write?'products.manage':'products.view';
    if(p.startsWith('/erp/categorias')) return write?'products.manage':'products.view';
    if(p.startsWith('/erp/agenda')) return write?'agenda.manage':'agenda.view';
    if(p.startsWith('/erp/historico')) return 'audit.view';
    if(p.startsWith('/erp/centro-operacoes')) return 'operations.view';
    if(p.startsWith('/erp/configuracoes')) return 'settings.manage';
    if(p.startsWith('/erp/endereco/')) return 'customers.view';
    if(p==='/erp' || p.startsWith('/erp/modulo/')) return 'erp.view';

    if(p.startsWith('/orcamentos')) return write?'quotes.manage':'quotes.view';

    if(p.startsWith('/automacao-whatsapp/inbox')) return write?'crm.inbox.manage':'crm.inbox.view';
    if(p.startsWith('/automacao-whatsapp/palavras-chave') || p.startsWith('/automacao-whatsapp/blocos') || p.startsWith('/automacao-whatsapp/midias') || p.startsWith('/automacao-whatsapp/simulador') || p.startsWith('/automacao-whatsapp/aniversariantes')) return write?'crm.automation.manage':'crm.automation.view';
    if(p.startsWith('/automacao-whatsapp/whatsapp') || p.startsWith('/automacao-whatsapp/configuracoes') || p.startsWith('/automacao-whatsapp/armazenamento')) return write?'crm.settings.manage':'crm.view';
    if(p==='/automacao-whatsapp' || p==='/crm'){
      const tab=text(req.query?.tab);
      if(tab==='inbox') return 'crm.inbox.view';
      if(['palavras-chave','automacao','blocos','fluxos'].includes(tab)) return 'crm.automation.view';
      return 'crm.view';
    }

    if(p.startsWith('/analytics')){
      if(p==='/analytics/track') return null;
      return write?'analytics.manage':'analytics.view';
    }
    if(p.startsWith('/marketing')) return write?'marketing.manage':'marketing.view';
    if(p.startsWith('/sorteios')) return write?'marketing.manage':'marketing.view';
    if(p.startsWith('/compatibilidade')) return write?'compatibility.manage':'compatibility.view';
    if(p==='/ferramentas' || p.startsWith('/ferramentas/')) return 'tools.view';

    if(p.startsWith('/produtos')) return write?'site.products.manage':'site.products.view';
    if(p.startsWith('/categorias') || p.startsWith('/subcategorias')) return write?'site.catalog.manage':'site.catalog.view';
    if(p.startsWith('/seo')) return write?'site.seo.manage':'site.seo.view';
    if(p.startsWith('/aparencia') || p.startsWith('/personalizacao') || p.startsWith('/estilos') || p.startsWith('/css')) return write?'site.design.manage':'site.design.view';
    if(p.startsWith('/manutencao')) return write?'site.maintenance.manage':'site.maintenance.view';
    if(p.startsWith('/publicar')) return 'site.publish';
    if(p.startsWith('/header') || p.startsWith('/footer') || p.startsWith('/sobre') || p.startsWith('/pagamentos') || p.startsWith('/paginas') || p.startsWith('/banners')) return write?'site.content.manage':'site.content.view';
    if(p==='/site') return 'site.view';
    if(p.startsWith('/site/')) return null;

    if(['/header.html','/footer.html','/css/style.css'].includes(p)) return null;
    return null;
  }

  authorizeRequests(){
    return (req,res,next)=>{
      const permission=this.permissionFor(req);
      if(!permission)return next();
      const hasUsers=(this.userService?.list?.({includeInactive:true})||[]).length>0;
      if(!hasUsers){
        if(jsonRequest(req))return res.status(401).json({success:false,code:'FIRST_ACCESS',message:'Configure o primeiro administrador para liberar o ERP.',loginUrl:'/login'});
        return res.redirect(`/login?primeiro=1&returnTo=${encodeURIComponent(safeReturnTo(req.originalUrl||req.path))}`);
      }
      if(!req.user){
        const access=req.authAccessStatus;
        const message=access && access.code && access.code!=='AUTH_REQUIRED' ? access.message : 'Sua sessão expirou. Entre novamente.';
        if(jsonRequest(req))return res.status(401).json({success:false,code:access?.code||'AUTH_REQUIRED',message,loginUrl:'/login'});
        return res.redirect(`/login?error=${encodeURIComponent(message)}&returnTo=${encodeURIComponent(safeReturnTo(req.originalUrl||req.path))}`);
      }
      if(!this.can(req.user,permission)){
        if(jsonRequest(req))return res.status(403).json({success:false,code:'FORBIDDEN',message:'Seu usuário não tem permissão para esta ação.',permission});
        return res.status(403).render('acesso_negado',{flash:null,permission});
      }
      next();
    };
  }

  safeReturnTo(value){ return safeReturnTo(value); }
}
