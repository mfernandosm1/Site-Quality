import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import multer from 'multer';
import FinanceService from '../services/finance-service.js';
import CustomerService from '../services/customer-service.js';
import CouponService from '../services/coupon-service.js';
import CommerceService from '../services/commerce-service.js';
import SupplierService from '../services/supplier-service.js';
import UserService from '../services/user-service.js';
import CarrierService from '../services/carrier-service.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');

const companyLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/png','image/jpeg','image/webp'].includes(file.mimetype))
});
function getCompanyLogoDir(req){ return path.join(req.app.locals.paths.PUBLIC_DIR, 'uploads', 'platform'); }
function writeJsonAtomic(file,data){ const temp=`${file}.tmp`; fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8'); fs.renameSync(temp,file); }

function getFinanceService(app) {
  if (app.locals.financeService) return app.locals.financeService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.financeService = new FinanceService({ dataDir });
  return app.locals.financeService;
}

function getCustomerService(app) {
  if (app.locals.customerService) return app.locals.customerService;
  app.locals.customerService = new CustomerService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'customers') });
  return app.locals.customerService;
}


function getSupplierService(app) {
  if (app.locals.supplierService) return app.locals.supplierService;
  app.locals.supplierService = new SupplierService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'suppliers') });
  return app.locals.supplierService;
}

function getCouponService(app) {
  if (app.locals.couponService) return app.locals.couponService;
  app.locals.couponService = new CouponService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'coupons') });
  return app.locals.couponService;
}

function getCommerceService(app) {
  if (app.locals.commerceService) return app.locals.commerceService;
  app.locals.commerceService = new CommerceService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'commerce') });
  return app.locals.commerceService;
}

function getCarrierService(app) {
  if (app.locals.carrierService) return app.locals.carrierService;
  app.locals.carrierService = new CarrierService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'carriers') });
  return app.locals.carrierService;
}

function getUserService(app) {
  if (app.locals.userService) return app.locals.userService;
  app.locals.userService = new UserService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'users') });
  return app.locals.userService;
}

function fetchJson(url,{timeout=7000}={}) {
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{headers:{Accept:'application/json','User-Agent':'Quality-ERP/1.0'}},response=>{
      let raw=''; response.setEncoding('utf8');
      response.on('data',chunk=>{ raw+=chunk; if(raw.length>1024*1024)request.destroy(new Error('Resposta muito grande.')); });
      response.on('end',()=>{
        try{
          const data=raw?JSON.parse(raw):{};
          if(response.statusCode<200||response.statusCode>=300){ const message=data?.message||data?.error||`Consulta retornou HTTP ${response.statusCode}.`; return reject(new Error(message)); }
          resolve(data);
        }catch(error){ reject(new Error('A consulta de CNPJ retornou uma resposta inválida.')); }
      });
    });
    request.setTimeout(timeout,()=>request.destroy(new Error('A consulta de CNPJ demorou demais. Tente novamente.')));
    request.on('error',reject);
  });
}
function isValidCnpj(value){
  const n=String(value||'').replace(/\D/g,''); if(n.length!==14||/^(\d)\1{13}$/.test(n))return false;
  const calc=base=>{let sum=0,weight=base.length-7;for(const ch of base){sum+=Number(ch)*weight--;if(weight<2)weight=9;}const r=sum%11;return r<2?0:11-r;};
  return calc(n.slice(0,12))===Number(n[12])&&calc(n.slice(0,13))===Number(n[13]);
}

function actor(req) { return req.user?.displayName || req.user?.name || req.user?.email || req.session?.user?.name || 'painel'; }

function getProfilePath(req) {
  return path.join(req.app.locals.paths.PUBLIC_DIR, '..', 'data', 'platform', 'company.json');
}

router.get('/', (req, res) => {
  let company = {};
  try { company = JSON.parse(fs.readFileSync(getProfilePath(req), 'utf8')); } catch (_) {}
  res.render('configuracoes', { flash: req.query.flash || null, company });
});


router.post('/empresa', companyLogoUpload.single('logo'), (req,res)=>{
  try{
    const file=getProfilePath(req);
    let company={};
    try{company=JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){}
    company.platformName=String(req.body.platformName||company.platformName||'Painel').trim().slice(0,80);
    company.tradeName=String(req.body.tradeName||company.tradeName||'').trim().slice(0,120);
    company.legalName=String(req.body.legalName||company.legalName||'').trim().slice(0,180);
    company.unitName=String(req.body.unitName||company.unitName||'').trim().slice(0,120);
    if(req.body.removeLogo==='1'){
      const dir=getCompanyLogoDir(req);
      for(const name of ['company-logo.png','company-logo.jpg','company-logo.webp']){try{fs.unlinkSync(path.join(dir,name));}catch(_){}}
      company.logoUrl=''; company.logoVersion=Date.now();
    }
    if(req.file){
      const dir=getCompanyLogoDir(req); fs.mkdirSync(dir,{recursive:true});
      const ext=req.file.mimetype==='image/png'?'.png':req.file.mimetype==='image/webp'?'.webp':'.jpg';
      for(const name of ['company-logo.png','company-logo.jpg','company-logo.webp']){try{fs.unlinkSync(path.join(dir,name));}catch(_){}}
      const name=`company-logo${ext}`; fs.writeFileSync(path.join(dir,name),req.file.buffer);
      company.logoUrl=`/public/uploads/platform/${name}`; company.logoVersion=Date.now();
    }
    company.updatedAt=new Date().toISOString();
    writeJsonAtomic(file,company);
    req.app.locals.refreshCompanyProfile?.();
    return res.redirect('/configuracoes?flash='+encodeURIComponent('Dados da empresa e identidade atualizados.'));
  }catch(error){
    return res.redirect('/configuracoes?flash='+encodeURIComponent(error.message||'Não foi possível salvar os dados da empresa.'));
  }
});

router.get('/usuarios', (req, res) => {
  const users=getUserService(req.app).list({includeInactive:true});
  const profiles=req.app.locals.kernelService?.permissions?.list?.() || [];
  const permissionCatalog=req.app.locals.kernelService?.permissions?.catalog?.() || [];
  res.render('configuracoes_usuarios', { flash:req.query.flash || null, users, profiles, permissionCatalog, currentIp:req.app.locals.authService?.clientIp?.(req)||'' });
});

router.get('/usuarios/api', (req,res) => {
  const users=getUserService(req.app).list({includeInactive:true});
  const profiles=req.app.locals.kernelService?.permissions?.list?.() || [];
  const permissionCatalog=req.app.locals.kernelService?.permissions?.catalog?.() || [];
  return res.json({success:true,users,profiles,permissionCatalog,currentIp:req.app.locals.authService?.clientIp?.(req)||''});
});

router.post('/usuarios', express.json(), (req,res) => {
  try {
    const profileIds=new Set((req.app.locals.kernelService?.permissions?.list?.() || []).map(item=>String(item.id)));
    if(req.body?.profileId && !profileIds.has(String(req.body.profileId))) throw new Error('Perfil de permissão inválido.');
    const service=getUserService(req.app);
    const existing=req.body?.id ? service.get(req.body.id) : null;
    const activeAdmins=service.list({includeInactive:false}).filter(item=>item.profileId==='administrator');
    if(existing?.profileId==='administrator' && activeAdmins.length<=1 && (String(req.body?.profileId||existing.profileId)!=='administrator' || req.body?.active===false)) throw new Error('Mantenha pelo menos um administrador ativo no ERP.');
    if(existing && String(req.user?.id||'')===String(existing.id)){
      const proposedPolicy=service.sanitizeAccessPolicy(req.body?.accessPolicy||{},existing.accessPolicy||{});
      const access=req.app.locals.authService?.accessStatus?.({...existing,accessPolicy:proposedPolicy},req);
      if(access && !access.allowed) throw new Error(`Esta restrição bloquearia o usuário que está logado agora. ${access.message}`);
    }
    const user=service.save(req.body||{},actor(req));
    req.app.locals.kernelService?.audits?.record?.({
      actor:actor(req),module:'usuarios',action:req.body?.id?'USER_UPDATED':'USER_CREATED',entityType:'user',entityId:user.id,
      label:req.body?.id?`Usuário atualizado: ${user.name}`:`Usuário criado: ${user.name}`,after:user
    });
    return res.json({success:true,message:req.body?.id?'Usuário atualizado.':'Usuário cadastrado.',user});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível salvar o usuário.'}); }
});

router.post('/usuarios/:id/senha', express.json(), (req,res) => {
  try {
    const user=getUserService(req.app).setPassword(req.params.id,req.body?.password||'',actor(req));
    req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'usuarios',action:'USER_PASSWORD_CHANGED',entityType:'user',entityId:user.id,label:`Senha alterada: ${user.name}`});
    return res.json({success:true,message:'Senha alterada com sucesso.'});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível alterar a senha.'}); }
});

router.post('/usuarios/:id/chave-recuperacao', express.json(), (req,res) => {
  try {
    const result=getUserService(req.app).generateRecoveryKey(req.params.id,actor(req));
    req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'usuarios',action:'RECOVERY_KEY_CREATED',entityType:'user',entityId:result.user.id,label:`Chave de recuperação gerada: ${result.user.name}`});
    return res.json({success:true,message:'Chave de recuperação gerada. Ela será mostrada somente agora.',key:result.key,user:result.user});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível gerar a chave de recuperação.'}); }
});

router.post('/usuarios/:id/status', express.json(), (req,res) => {
  try {
    const service=getUserService(req.app);
    const target=service.get(req.params.id);
    if(!target) throw new Error('Usuário não encontrado.');
    if(String(req.user?.id||'')===String(target.id) && req.body?.active!==true) throw new Error('Você não pode inativar o usuário que está usando agora.');
    if(target.profileId==='administrator' && req.body?.active!==true && service.list({includeInactive:false}).filter(item=>item.profileId==='administrator').length<=1) throw new Error('Mantenha pelo menos um administrador ativo no ERP.');
    const user=service.setActive(req.params.id,req.body?.active===true,actor(req));
    req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'usuarios',action:user.active?'USER_ACTIVATED':'USER_DEACTIVATED',entityType:'user',entityId:user.id,label:`Usuário ${user.active?'ativado':'inativado'}: ${user.name}`,after:user});
    return res.json({success:true,message:`Usuário ${user.active?'ativado':'inativado'}.`,user});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível alterar o status.'}); }
});


router.post('/usuarios/perfis/:id', express.json(), (req,res) => {
  try {
    const permissions=req.app.locals.kernelService?.permissions;
    const profile=permissions?.saveProfile?.(req.params.id,req.body||{});
    if(!profile) throw new Error('Não foi possível salvar o perfil.');
    req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'usuarios',action:'PERMISSION_PROFILE_UPDATED',entityType:'permission_profile',entityId:profile.id,label:`Perfil de permissão atualizado: ${profile.name}`,after:profile});
    return res.json({success:true,message:'Perfil e permissões atualizados.',profile});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível salvar o perfil.'}); }
});

router.get('/clientes', (req, res) => {
  const fieldSettings = getCustomerService(req.app).getFieldSettings();
  res.render('configuracoes_clientes', { flash:req.query.flash || null, fieldSettings });
});

router.post('/clientes', express.json(), (req, res) => {
  try {
    const settings = getCustomerService(req.app).saveFieldSettings(req.body || {});
    return res.json({ success:true, message:'Configurações do cadastro de clientes salvas.', settings });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível salvar as configurações.' });
  }
});

router.post('/clientes/restaurar', express.json(), (req, res) => {
  try {
    const settings = getCustomerService(req.app).resetFieldSettings();
    return res.json({ success:true, message:'Configuração padrão restaurada.', settings });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível restaurar a configuração.' });
  }
});



router.get('/fornecedores', (req, res) => {
  res.render('configuracoes_fornecedores', { flash:req.query.flash || null, fieldSettings:getSupplierService(req.app).getFieldSettings() });
});
router.post('/fornecedores', express.json(), (req, res) => {
  try { const settings=getSupplierService(req.app).saveFieldSettings(req.body||{}); return res.json({success:true,message:'Configurações do cadastro de fornecedores salvas.',settings}); }
  catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível salvar as configurações.'}); }
});
router.post('/fornecedores/restaurar', express.json(), (req, res) => {
  try { const settings=getSupplierService(req.app).resetFieldSettings(); return res.json({success:true,message:'Configuração padrão de fornecedores restaurada.',settings}); }
  catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível restaurar a configuração.'}); }
});


router.get('/transportadoras/cnpj/:cnpj', async (req,res) => {
  try {
    const cnpj=String(req.params.cnpj||'').replace(/\D/g,'');
    if(!isValidCnpj(cnpj)) return res.status(400).json({success:false,message:'Informe um CNPJ válido com 14 dígitos.'});
    const existing=getCarrierService(req.app).list({includeInactive:true}).find(item=>String(item.document||'').replace(/\D/g,'')===cnpj);
    if(existing && String(req.query.id||'')!==String(existing.id)) return res.status(409).json({success:false,message:`Este CNPJ já está cadastrado em ${existing.name}.`,existingId:existing.id});
    const data=await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`);
    const ie=Array.isArray(data.inscricoes_estaduais)?(data.inscricoes_estaduais.find(item=>item?.ativo!==false)?.inscricao_estadual||''):'';
    const street=[data.descricao_tipo_de_logradouro,data.logradouro].filter(Boolean).join(' ').trim();
    const address=[street,data.numero,data.complemento].filter(Boolean).join(', ');
    const phone=[data.ddd_telefone_1,data.ddd_telefone_2].find(Boolean)||'';
    return res.json({success:true,source:'BrasilAPI',data:{
      document:cnpj, legalName:data.razao_social||'', tradeName:data.nome_fantasia||'',
      name:data.nome_fantasia||data.razao_social||'', stateRegistration:ie, zip:String(data.cep||'').replace(/\D/g,''),
      address, neighborhood:data.bairro||'', city:data.municipio||'', state:data.uf||'', phone, email:data.email||'',
      registrationStatus:data.descricao_situacao_cadastral||''
    }});
  } catch(error) {
    return res.status(502).json({success:false,message:`Não foi possível consultar o CNPJ agora. ${error.message||''}`.trim()});
  }
});

router.get('/transportadoras', (req,res) => {
  res.render('configuracoes_transportadoras', { flash:req.query.flash || null, carriers:getCarrierService(req.app).list({includeInactive:true}) });
});
router.post('/transportadoras', express.json(), (req,res) => {
  try { const carrier=getCarrierService(req.app).save(req.body||{},actor(req)); req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'configuracoes',action:req.body?.id?'CARRIER_UPDATED':'CARRIER_CREATED',entityType:'carrier',entityId:carrier.id,label:`Transportadora / entrega ${req.body?.id?'atualizada':'cadastrada'}: ${carrier.name}`,after:carrier}); return res.json({success:true,message:'Cadastro salvo com sucesso.',carrier}); }
  catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível salvar.'}); }
});
router.delete('/transportadoras/:id', (req,res) => {
  try { getCarrierService(req.app).remove(req.params.id); req.app.locals.kernelService?.audits?.record?.({actor:actor(req),module:'configuracoes',action:'CARRIER_DELETED',entityType:'carrier',entityId:req.params.id,label:'Transportadora / método de entrega removido'}); return res.json({success:true,message:'Cadastro removido.'}); }
  catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível remover.'}); }
});

router.get('/cupons', (req,res) => {
  const commerce=getCommerceService(req.app);
  const cashboxes=commerce.listCashboxes();
  const canApproveDiscount=!req.app.locals.authService || req.app.locals.authService.can(req.user,'pdv.discount.approve');
  res.render('configuracoes_cupons', { flash:req.query.flash || null, coupons:getCouponService(req.app).list({includeInactive:true}), cashboxes, canApproveDiscount });
});
router.post('/cupons', express.json(), (req,res) => {
  try { const coupon=getCouponService(req.app).save(req.body||{}, req.user?.displayName || req.user?.name || req.user?.email || 'painel'); return res.json({success:true,message:'Cupom salvo com sucesso.',coupon}); }
  catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.get('/financeiro', (req, res) => {
  const foundation = getFinanceService(req.app).getFoundation();
  const { settings: financeSettings, ...viewData } = foundation;
  res.render('configuracoes_financeiro', { flash: req.query.flash || null, ...viewData, financeSettings });
});

export default router;
