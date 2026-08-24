import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import FinanceService from '../services/finance-service.js';
import CustomerService from '../services/customer-service.js';
import CouponService from '../services/coupon-service.js';
import SupplierService from '../services/supplier-service.js';

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

router.get('/cupons', (req,res) => {
  res.render('configuracoes_cupons', { flash:req.query.flash || null, coupons:getCouponService(req.app).list({includeInactive:true}) });
});
router.post('/cupons', express.json(), (req,res) => {
  try { const coupon=getCouponService(req.app).save(req.body||{}, req.user?.name || req.user?.email || 'painel'); return res.json({success:true,message:'Cupom salvo com sucesso.',coupon}); }
  catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.get('/financeiro', (req, res) => {
  const foundation = getFinanceService(req.app).getFoundation();
  const { settings: financeSettings, ...viewData } = foundation;
  res.render('configuracoes_financeiro', { flash: req.query.flash || null, ...viewData, financeSettings });
});

export default router;
