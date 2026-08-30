import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import InventoryService from './inventory-service.js';
import StockCountService from './stock-count-service.js';
import Wm10ProductImportService from './wm10-product-import-service.js';

const ID='WM10-COUNT-20260830-A';
const ITEMS=[
  {
    "code": 1361,
    "qty": 2,
    "name": "Capa Motorola  MOTO G7/ G7 PLUS PRETO"
  },
  {
    "code": 1363,
    "qty": 4,
    "name": "Capa Motorola  MOTO G7/ G7 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 1997,
    "qty": 1,
    "name": "Capa motorola moto E E5 Plus PRETO"
  },
  {
    "code": 1999,
    "qty": 2,
    "name": "Capa motorola moto E E5 Plus ANTI IMPACTO TRANSP"
  },
  {
    "code": 3906,
    "qty": 1,
    "name": "Capa Motorola  MOTO G7 PLAY ANTI IMPACTO TRANSP"
  },
  {
    "code": 2013,
    "qty": 1,
    "name": "Capa motorola moto E E5 Play PRETO"
  },
  {
    "code": 1966,
    "qty": 4,
    "name": "Capa motorola moto Z Z3 Play ANTI IMPACTO TRANSP"
  },
  {
    "code": 1332,
    "qty": 1,
    "name": "Capa Motorola  MOTO G4/ G4 PLUS TRANSPARENTE"
  },
  {
    "code": 1336,
    "qty": 4,
    "name": "Capa Motorola  MOTO G4/ G4 PLUS FUMÊ"
  },
  {
    "code": 1747,
    "qty": 1,
    "name": "Capa Motorola Moto Edge Plus ANTI IMPACTO TRANSP"
  },
  {
    "code": 7567,
    "qty": 1,
    "name": "CAPA MOTO C MOTO C PLUS  ANTI IMPACTO TRANSP"
  },
  {
    "code": 1492,
    "qty": 1,
    "name": "Capa Motorola MOTO G8 PLAY/ ONE MACRO  ANTI IMPACTO PRETA"
  },
  {
    "code": 4324,
    "qty": 2,
    "name": "Capa Motorola  MOTO G50 4G ANTI IMPACTO TRANSP"
  },
  {
    "code": 1349,
    "qty": 1,
    "name": "Capa Motorola  MOTO G6 PLUS PRETO"
  },
  {
    "code": 1983,
    "qty": 1,
    "name": "Capa motorola moto Z Z2 Play FUMÊ"
  },
  {
    "code": 2021,
    "qty": 1,
    "name": "Capa motorola moto  C FUMÊ"
  },
  {
    "code": 1372,
    "qty": 2,
    "name": "Capa Motorola  MOTO G7 POWER FUMÊ"
  },
  {
    "code": 4270,
    "qty": 2,
    "name": "Capa Motorola  MOTO G 5G ANTI IMPACTO TRANSP"
  },
  {
    "code": 7566,
    "qty": 5,
    "name": "CAPA MOTO C MOTO C ANTI IMPACTO TRANSP"
  },
  {
    "code": 1995,
    "qty": 1,
    "name": "Capa motorola moto E E6 Plus ANTI IMPACTO TRANSP"
  },
  {
    "code": 4278,
    "qty": 2,
    "name": "Capa Motorola  G200 5G ANTI IMPACTO TRANSP"
  },
  {
    "code": 2003,
    "qty": 1,
    "name": "Capa motorola moto E E6 Play ANTI IMPACTO TRANSP"
  },
  {
    "code": 1429,
    "qty": 1,
    "name": "Capa Motorola  MOTO G5S PLUS FUMÊ"
  },
  {
    "code": 1964,
    "qty": 1,
    "name": "Capa motorola moto Z Z3 Play PRETO"
  },
  {
    "code": 4267,
    "qty": 2,
    "name": "Capa Motorola Moto Edge 20 ANTI IMPACTO TRANSP"
  },
  {
    "code": 7583,
    "qty": 1,
    "name": "Capa Motorola  X4 PRETO"
  },
  {
    "code": 1308,
    "qty": 1,
    "name": "Capa motorola linha one MOTO ONE HYPER ANTI IMPACTO TRANSP"
  },
  {
    "code": 1313,
    "qty": 1,
    "name": "Capa motorola linha one MOTO ONE ZOOM ANTI IMPACTO BRANCO"
  },
  {
    "code": 1387,
    "qty": 1,
    "name": "Capa Motorola  MOTO G9 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 1987,
    "qty": 1,
    "name": "Capa motorola moto E E7 Plus ANTI IMPACTO TRANSP"
  },
  {
    "code": 1491,
    "qty": 1,
    "name": "Capa Motorola MOTO G8 PLAY/ ONE MACRO  ANTI IMPACTO TRANSP"
  },
  {
    "code": 4340,
    "qty": 1,
    "name": "Capa Motorola  MOTO G52 / G82 5G ANTI IMPACTO TRANSP"
  },
  {
    "code": 4770,
    "qty": 1,
    "name": "Capa Motorola  MOTO G41 ANTI IMPACTO TRANSP"
  },
  {
    "code": 2127,
    "qty": 3,
    "name": "Capa samsung A8 2018 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1894,
    "qty": 1,
    "name": "Capa samsung linha J J5 J500 PRETO"
  },
  {
    "code": 1904,
    "qty": 1,
    "name": "Capa samsung linha J J7 J700 J7 Neo ANTI IMPACTO TRANSP"
  },
  {
    "code": 1902,
    "qty": 4,
    "name": "Capa samsung linha J J7 J700 J7 Neo PRETO"
  },
  {
    "code": 7021,
    "qty": 1,
    "name": "Capa samsung M20 TRANSPARENTE"
  },
  {
    "code": 930,
    "qty": 4,
    "name": "Capa samsung A01 CORE ANTI IMPACTO TRANSP"
  },
  {
    "code": 1870,
    "qty": 2,
    "name": "Capa samsung linha J J2 Pro 2018 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1022,
    "qty": 1,
    "name": "Capa samsung linha S S7 PRETO"
  },
  {
    "code": 1025,
    "qty": 2,
    "name": "Capa samsung linha S S8 PRETO"
  },
  {
    "code": 7001,
    "qty": 1,
    "name": "Capa samsung M31 TRANSPARENTE"
  },
  {
    "code": 994,
    "qty": 1,
    "name": "Capa samsung A90 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1862,
    "qty": 1,
    "name": "Capa samsung linha J J2 J200 PRETO"
  },
  {
    "code": 998,
    "qty": 3,
    "name": "Capa samsung A41 ANTI IMPACTO TRANSP"
  },
  {
    "code": 7010,
    "qty": 1,
    "name": "Capa samsung M30 S PRETO"
  },
  {
    "code": 1019,
    "qty": 3,
    "name": "Capa samsung linha S S9 ANTI IMPACTO TRANSP"
  },
  {
    "code": 986,
    "qty": 1,
    "name": "Capa samsung A60 ANTI IMPACTO TRANSP"
  },
  {
    "code": 995,
    "qty": 1,
    "name": "Capa samsung A40 PRETO"
  },
  {
    "code": 984,
    "qty": 3,
    "name": "Capa samsung A42 5G ANTI IMPACTO TRANSP"
  },
  {
    "code": 1887,
    "qty": 1,
    "name": "Capa samsung linha J J4 Plus / J4 Core ANTI IMPACTO TRANSP"
  },
  {
    "code": 1279,
    "qty": 1,
    "name": "Capa Samsung linha Note NOTE 10 ANTI IMPACTO TRANSP"
  },
  {
    "code": 2139,
    "qty": 1,
    "name": "Capa samsung A7 2018 ANTI IMPACTO TRANSP"
  },
  {
    "code": 996,
    "qty": 1,
    "name": "Capa samsung A40 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1036,
    "qty": 1,
    "name": "Capa samsung linha S S20 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 3431,
    "qty": 1,
    "name": "Capa samsung M21 M21S ANTI IMPACTO TRANSP"
  },
  {
    "code": 938,
    "qty": 3,
    "name": "Capa samsung A2 CORE ANTI IMPACTO TRANSP"
  },
  {
    "code": 2663,
    "qty": 3,
    "name": "Capa samsung  A32 5G ANTI IMPACTO TRANSP"
  },
  {
    "code": 1028,
    "qty": 3,
    "name": "Capa samsung linha S S8 PLUS PRETO"
  },
  {
    "code": 2111,
    "qty": 1,
    "name": "Capa samsung A5 2017 PRETO"
  },
  {
    "code": 2109,
    "qty": 2,
    "name": "Capa samsung A9 2018 ANTI IMPACTO TRANSP"
  },
  {
    "code": 2108,
    "qty": 1,
    "name": "Capa samsung A9 2018 PRETO"
  },
  {
    "code": 2138,
    "qty": 1,
    "name": "Capa samsung A7 2018 PRETO"
  },
  {
    "code": 1281,
    "qty": 1,
    "name": "Capa Samsung linha Note NOTE 10 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 2372,
    "qty": 1,
    "name": "Capa samsung linha J J5 Pro ANTI IMPACTO TRANSP"
  },
  {
    "code": 990,
    "qty": 1,
    "name": "Capa samsung A70 ANTI IMPACTO TRANSP"
  },
  {
    "code": 4512,
    "qty": 1,
    "name": "Capa samsung linha S S11 E PRETO"
  },
  {
    "code": 2389,
    "qty": 1,
    "name": "Capa case samsung note 8  PRETO"
  },
  {
    "code": 2590,
    "qty": 1,
    "name": "Capa samsung A72 ANTI IMPACTO TRANSP"
  },
  {
    "code": 2126,
    "qty": 2,
    "name": "Capa samsung A8 2018 PRETO"
  },
  {
    "code": 2124,
    "qty": 1,
    "name": "Capa samsung A8 2018 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 7244,
    "qty": 1,
    "name": "Capa CASE Samsung A01 CORE PRETO"
  },
  {
    "code": 1283,
    "qty": 2,
    "name": "Capa Samsung linha Note NOTE 20 PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 7022,
    "qty": 1,
    "name": "Capa samsung M20 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1017,
    "qty": 2,
    "name": "Capa samsung linha S S9 Plus PRETO"
  },
  {
    "code": 1338,
    "qty": 1,
    "name": "Capa Motorola  MOTO G4 PLAY TRANSPARENTE"
  },
  {
    "code": 1350,
    "qty": 1,
    "name": "Capa Motorola  MOTO G6 PLUS TRANSPARENTE"
  },
  {
    "code": 1427,
    "qty": 1,
    "name": "Capa Motorola  MOTO G5S PLUS ANTI IMPACTO TRANSP"
  },
  {
    "code": 2009,
    "qty": 2,
    "name": "Capa motorola moto E E3 PRETO"
  },
  {
    "code": 1973,
    "qty": 1,
    "name": "Capa motorola moto Z Z Play TRANSPARENTE"
  },
  {
    "code": 1968,
    "qty": 2,
    "name": "Capa motorola moto Z Z PRETO"
  },
  {
    "code": 1204,
    "qty": 3,
    "name": "Capa Xiaomi Redmi MI 8 MI 8 PRO ANTI IMPACTO TRANSP"
  },
  {
    "code": 1221,
    "qty": 1,
    "name": "Capa Xiaomi Redmi Note 8 Pro PRETO"
  },
  {
    "code": 1152,
    "qty": 2,
    "name": "Capa Xiaomi Redmi MI 9 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1234,
    "qty": 2,
    "name": "Capa Xiaomi Redmi REDMI K20 REDMI 9T PRETO"
  },
  {
    "code": 1233,
    "qty": 1,
    "name": "Capa Xiaomi Redmi REDMI GO PRETO"
  },
  {
    "code": 1162,
    "qty": 3,
    "name": "Capa Xiaomi Redmi NOTE 9 4G FUMÊ"
  },
  {
    "code": 1180,
    "qty": 1,
    "name": "Capa Xiaomi Redmi REDMI 7A ANTI IMPACTO TRANSP"
  },
  {
    "code": 1134,
    "qty": 1,
    "name": "Capa Xiaomi Redmi Note 7/Note 7 Pro ANTI IMPACTO TRANSP"
  },
  {
    "code": 5212,
    "qty": 1,
    "name": "Capa Xiaomi Redmi REDMI 10A ANTI IMPACTO TRANSP"
  },
  {
    "code": 1188,
    "qty": 1,
    "name": "Capa Xiaomi Redmi REDMI 9 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1237,
    "qty": 1,
    "name": "Capa Xiaomi Redmi REDMI 6 PRO PRETO"
  },
  {
    "code": 3319,
    "qty": 7,
    "name": "Bateria Apple IPHONE 8"
  },
  {
    "code": 3323,
    "qty": 5,
    "name": "Bateria Apple IPHONE 7"
  },
  {
    "code": 3321,
    "qty": 3,
    "name": "Bateria Apple IPHONE 6"
  },
  {
    "code": 4480,
    "qty": 2,
    "name": "Tela frontal Apple iPhone 6S Plus 1ª LINHA PRETO"
  },
  {
    "code": 4455,
    "qty": 3,
    "name": "Tela frontal Apple iPhone 7G 1ª LINHA BRANCO"
  },
  {
    "code": 4470,
    "qty": 1,
    "name": "Tela frontal Apple iPhone 6S 1ª LINHA PRETO"
  },
  {
    "code": 3325,
    "qty": 1,
    "name": "Bateria Apple IPHONE 5"
  },
  {
    "code": 4479,
    "qty": 1,
    "name": "Tela frontal Apple iPhone 6S Plus 1ª LINHA BRANCO"
  },
  {
    "code": 3327,
    "qty": 1,
    "name": "Bateria Apple IPHONE 6 PLUS"
  },
  {
    "code": 3600,
    "qty": 3,
    "name": "Tela frontal Apple iPhone 8 / SE 1ª LINHA BRANCO"
  },
  {
    "code": 4458,
    "qty": 2,
    "name": "Tela frontal Apple iPhone 6G 1ª LINHA BRANCO"
  },
  {
    "code": 4474,
    "qty": 2,
    "name": "Tela frontal Apple iPhone 5G 1ª LINHA BRANCO"
  },
  {
    "code": 4472,
    "qty": 1,
    "name": "Tela frontal Apple iPhone 5S 1ª LINHA BRANCO"
  },
  {
    "code": 1880,
    "qty": 3,
    "name": "Capa samsung linha J J4 J400 ANTI IMPACTO TRANSP"
  },
  {
    "code": 1878,
    "qty": 3,
    "name": "Capa samsung linha J J4 J400 PRETO"
  },
  {
    "code": 8855,
    "qty": 1,
    "name": "Capa Iphone 15 BRANCO"
  },
  {
    "code": 1868,
    "qty": 2,
    "name": "Capa samsung linha J J2 Pro 2018 PRETO"
  }
];
const UNRESOLVED=[{suppliedCode:4780,qty:2,description:'é uma fonte',wm10Name:'Capa Motorola MOTO G8 POWER LITE ANTI IMPACTO PRETA',reason:'O código 4780 é uma capa na WM10; a descrição física informa apenas fonte, então não há identificação segura.'}];

const clean=v=>String(v??'').trim();
const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
function read(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return fallback;}}
function write(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8');fs.renameSync(tmp,file);}
function list(data){return Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[]);}
function wmCodes(p){const w=p?.integrations?.wm10||{};return [...new Set([w.productCode,...(w.productCodes||[])].map(Number).filter(Number.isFinite))];}
function comboCode(c){const n=Number(c?.wm10Code);return Number.isFinite(n)?n:null;}
function deactivateLvAndActivateErp(p){p.erp=p.erp&&typeof p.erp==='object'?p.erp:{};p.erp.active=true;p.active=false;p.virtualStore=p.virtualStore&&typeof p.virtualStore==='object'?p.virtualStore:{};p.virtualStore.active=false;p.virtualStore.channels=p.virtualStore.channels&&typeof p.virtualStore.channels==='object'?p.virtualStore.channels:{};p.virtualStore.channels.lojaVirtual={...(p.virtualStore.channels.lojaVirtual||{}),enabled:false};}
function selection(p,c=null){const pid=clean(p?.id),code=clean(p?.erp?.internalCode||p?.code||p?.sku),sku=clean(p?.erp?.sku||p?.sku||code),bar=clean(p?.erp?.barcode||p?.barcode);if(c){const iid=clean(c.inventoryItemId);if(!iid)return null;return{inventoryItemId:iid,productId:pid,selectionId:`${pid}::${iid}`,name:clean(c.sourceName)||[clean(p?.name),clean(c.label)].filter(Boolean).join(' · '),code,sku:clean(c.reference)||sku,barcode:clean(c.barcode)||bar,variationLabel:clean(c.label)};}const iid=clean(p?.inventory?.itemId||`PRD-${pid}`);if(!iid||!pid)return null;p.inventory=p.inventory&&typeof p.inventory==='object'?p.inventory:{};p.inventory.itemId=iid;p.inventory.stockControlled=true;return{inventoryItemId:iid,productId:pid,selectionId:pid,name:clean(p?.name)||'Produto',code,sku,barcode:bar,variationLabel:''};}
function findExisting(products,source,state){const code=Number(source.code),m=state?.products?.[String(code)];if(m&&['imported','linked'].includes(clean(m.status))){const p=products.find(x=>String(x?.id)===String(m.productId));if(p){const cs=p?.variations?.combinations||[],c=cs.find(x=>comboCode(x)===code);if(c)return{p,c,by:'migration-variation'};if(!p?.variations?.enabled||!cs.length)return{p,c:null,by:'migration-product'};}}let a=[];for(const p of products){const cs=p?.variations?.combinations||[];for(const c of cs)if(comboCode(c)===code)a.push({p,c,by:'variation-code'});if((!p?.variations?.enabled||!cs.length)&&wmCodes(p).includes(code))a.push({p,c:null,by:'product-code'});}if(a.length===1)return a[0];if(a.length>1)return{amb:`Código WM10 ${code} aparece em mais de um cadastro.`};const n=norm(source.name);a=[];for(const p of products){const cs=p?.variations?.combinations||[];for(const c of cs)if(norm(c?.sourceName)===n)a.push({p,c,by:'variation-name'});if((!p?.variations?.enabled||!cs.length)&&norm(p?.name)===n)a.push({p,c:null,by:'product-name'});}if(a.length===1)return a[0];if(a.length>1)return{amb:`Nome exato duplicado no ERP: ${source.name}`};const b=clean(source.barcode);if(b){a=[];for(const p of products){const cs=p?.variations?.combinations||[];for(const c of cs)if(clean(c?.barcode)===b)a.push({p,c,by:'variation-barcode'});if((!p?.variations?.enabled||!cs.length)&&clean(p?.erp?.barcode||p?.barcode)===b)a.push({p,c:null,by:'product-barcode'});}if(a.length===1)return a[0];if(a.length>1)return{amb:`Código de barras ${b} duplicado no ERP.`};}return null;}
function link(p,s,actor){p.integrations=p.integrations&&typeof p.integrations==='object'?p.integrations:{};const w=p.integrations.wm10||{},codes=[...new Set([...(w.productCodes||[]),w.productCode,s.code].map(Number).filter(Number.isFinite))];p.integrations.wm10={...w,productCode:Number.isFinite(Number(w.productCode))?Number(w.productCode):Number(s.code),productCodes:codes,originalName:w.originalName||s.name,sourceActive:s.active,sourceStock:s.stock,sourceCost:s.cost,sourcePrice:s.price,lastLinkedAt:new Date().toISOString(),lastLinkedBy:actor};}
function saveState(state,s,p,actor,by){state.products=state.products||{};state.products[String(s.code)]={status:'imported',productId:p.id,productCode:clean(p?.erp?.internalCode||p?.code),name:p.name,at:new Date().toISOString(),by:actor,assistedCountBatch:ID,assistedCountMatch:by};state.updatedAt=new Date().toISOString();}

export async function applyOneTimeWm10CountBatch20260830({app}={}){
  const actor='painel',panel=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),content=app?.locals?.paths?.CONTENT_DIR;
  if(!content)throw new Error('CONTENT_DIR indisponível.');
  const productsFile=path.join(content,'products.json');if(!fs.existsSync(productsFile))throw new Error(`products.json não encontrado: ${productsFile}`);
  const invDir=path.join(panel,'data','erp','inventory'),prodDir=path.join(panel,'data','erp','products'),marker=path.join(invDir,`${ID}.json`);
  const old=read(marker,null);if(old?.status==='applied'&&old?.countId)return{...old,alreadyApplied:true};
  const cache=read(path.join(prodDir,'wm10-product-source-cache.json'),null);if(!cache?.rows)throw new Error('Cache WM10 de produtos inválido.');
  const importer=new Wm10ProductImportService({dataDir:prodDir,productsFile,backupDir:path.join(prodDir,'backups','manual-count-20260830')});
  const source=new Map(cache.rows.map(r=>importer.mapRow(r)).filter(x=>Number.isFinite(x.code)).map(x=>[Number(x.code),x]));
  const pdata=read(productsFile,{version:'1.0',items:[]}),products=list(pdata),stateFile=path.join(prodDir,'wm10-product-migration-state.json'),state=read(stateFile,{version:'1.0',products:{}});
  const inventory=new InventoryService({dataDir:invDir}),counts=new StockCountService({dataDir:invDir,inventoryService:inventory});
  let count=(counts.read().items||[]).find(x=>x.status==='in_progress'&&clean(x.notes).includes(`[${ID}]`));
  if(!count)count=counts.create({type:'partial',blockPdv:false,notes:`[${ID}] Contagem parcial assistida da conferência física de 30/08/2026.`,createdBy:actor,locationId:inventory.getDefaultLocationId()});
  const report={batchId:ID,status:'processing',countId:count.id,requestedUniqueProducts:111,requestedUnits:190,queuedUniqueProducts:0,queuedUnits:0,existingMatched:0,importedNew:0,skipped:[],unresolved:UNRESOLVED,corrections:[{from:1365,desc:'G7/G7 Plus preta',to:1361},{from:1365,desc:'G7/G7 Plus anti impacto transp',to:1363},{from:1998,desc:'E5 Plus anti impacto transp',to:1999},{name:'capa moto x4 preta',to:7583},{name:'capa anti impacto transparente j2 pro',to:1870},{name:'bateria iphone 5g',to:3325},{name:'bateria iphone 6g',to:3321}],items:[],startedAt:new Date().toISOString()};
  let changed=false,backup=null;
  const pending=[];
  for(const req of ITEMS){const s=source.get(Number(req.code));if(!s){report.skipped.push({code:req.code,qty:req.qty,reason:'Código ausente no cache WM10.'});continue;}if(norm(s.name)!==norm(req.name)){report.skipped.push({code:req.code,qty:req.qty,reason:`Nome divergente no cache: ${s.name}`});continue;}const ex=findExisting(products,s,state);if(ex?.amb){report.skipped.push({code:req.code,qty:req.qty,name:s.name,reason:ex.amb});continue;}let p,c=null,by='';if(ex){p=ex.p;c=ex.c;by=ex.by;report.existingMatched++;}else{if(!backup){const dir=path.join(prodDir,'backups','manual-count-20260830');fs.mkdirSync(dir,{recursive:true});backup=path.join(dir,`products-before-${ID}-${Date.now()}.json`);fs.copyFileSync(productsFile,backup);}p=importer.buildProduct(s,products,actor,{salePrice:true,cost:false,barcode:true,ncm:true,reference:true,brand:true,unit:true,active:false,stock:false,collection:false});products.push(p);by='new-standalone-import';report.importedNew++;}deactivateLvAndActivateErp(p);link(p,s,actor);changed=true;const sel=selection(p,c);if(!sel){report.skipped.push({code:req.code,qty:req.qty,name:s.name,reason:'Sem item de estoque utilizável.'});continue;}saveState(state,s,p,actor,by);pending.push({req,s,p,sel,by});}
  if(changed){write(productsFile,Array.isArray(pdata)?products:{...pdata,items:products});write(stateFile,state);}
  for(const row of pending){inventory.configurarItem({inventoryItemId:row.sel.inventoryItemId,minimumQuantity:Number(row.p?.inventory?.minimumQuantity)||0});counts.saveItem(count.id,{product:row.sel,quantity:row.req.qty,actor});report.queuedUniqueProducts++;report.queuedUnits+=row.req.qty;report.items.push({code:row.req.code,qty:row.req.qty,name:row.s.name,productId:row.p.id,productCode:clean(row.p?.erp?.internalCode||row.p?.code),inventoryItemId:row.sel.inventoryItemId,matchedBy:row.by});}
  report.status='applied';report.finishedAt=new Date().toISOString();report.productsBackup=backup;report.unresolvedUnits=2;write(marker,report);
  console.log(`✅ ${ID}: ${report.queuedUniqueProducts} produtos / ${report.queuedUnits} unidades lançados em ${count.id}. Código 4780 ficou pendente por divergência.`);
  return report;
}
export default applyOneTimeWm10CountBatch20260830;
