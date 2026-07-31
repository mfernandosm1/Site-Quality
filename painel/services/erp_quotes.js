import fs from 'fs';
import path from 'path';

function root(app){ return path.join(app.locals.paths.CONTENT_DIR, 'erp'); }
function quoteRoot(app){ return path.join(root(app), 'quotes'); }
function files(app){
  const base=quoteRoot(app);
  return {
    root:base,
    quotes:path.join(base,'quotes.json'),
    settings:path.join(base,'quote_settings.json'),
    supplierTables:path.join(base,'supplier_tables.json')
  };
}
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function readJson(file,fallback){ try{return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):fallback;}catch{return fallback;} }
function writeJson(file,data){ ensureDir(path.dirname(file)); const temp=file+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8'); fs.renameSync(temp,file); }
function now(){ return new Date().toISOString(); }
function id(prefix){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function text(value,max=4000){ return String(value??'').replace(/[<>]/g,'').trim().slice(0,max); }
function num(value,fallback=0){ const n=Number(String(value??'').replace(',','.')); return Number.isFinite(n)?n:fallback; }
function money(value){ return Math.round((num(value,0)+Number.EPSILON)*100)/100; }
function percentage(value){ return Math.max(0,Math.min(95,num(value,0))); }

const DEFAULT_CARD_RATES={
  1:6.9,2:8.5,3:9.3,4:10,5:11,6:13.5,7:12.5,8:16,9:16.5,
  10:17.7,11:17.5,12:18,13:20.5,14:21,15:21.5,16:22,17:22.5,18:23
};
const DEFAULT_CREDIT_RATES={
  1:4,2:6,3:8,4:10,5:12,6:14,7:16,8:18,9:20,
  10:22,11:24,12:26,13:28,14:30,15:32,16:34,17:36,18:38
};
const DEFAULT_SETTINGS={
  version:1,
  calculationMode:'markup',
  displayInstallments:[18,12],
  showCash:true,
  pricing:{roundToNine99:true},
  rates:{
    pix:0,
    cash:0,
    debit:6,
    card:DEFAULT_CARD_RATES,
    credit:DEFAULT_CREDIT_RATES
  },
  defaults:{importRate:20,installments:1,paymentMethod:'pix',dollarRate:5.12,dollarAdd:0.13,defaultProfit:200,tableCashMode:'withFee',manualCashMode:'noFee'},
  marginRules:[
    {keywords:'iphone pro max',profit:300},
    {keywords:'iphone pro',profit:300},
    {keywords:'iphone',profit:260},
    {keywords:'xiaomi redmi poco',profit:200}
  ],
  message:{
    header:'✨ Orçamento Quality Celulares ✨',
    footer:'Valores sujeitos à disponibilidade. Qualquer dúvida, estou à disposição! 😊',
    warranty:'✅ 1 ano de garantia e suporte conosco',
    shipping:'🚚 Frete grátis',
    offerTitle:'Ofertas de Julho Xiaomi 🔥',
    validUntil:'02/07 às 18h',
    productEmoji:'📲',
    installmentEmoji:'💳',
    cashEmoji:'🔥',
    paymentLabels:{card:'no cartão',credit:'no boleto/crediário',cashWithFee:'à vista no Pix ou dinheiro',cashNoFee:'à vista sem taxa'}
  },
  updatedAt:now()
};

export function ensureQuoteStorage(app){
  const f=files(app); ensureDir(f.root);
  if(!fs.existsSync(f.quotes)) writeJson(f.quotes,{version:1,quotes:[]});
  if(!fs.existsSync(f.settings)) writeJson(f.settings,DEFAULT_SETTINGS);
  if(!fs.existsSync(f.supplierTables)) writeJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  return f;
}
export function getQuoteSettings(app){ const f=ensureQuoteStorage(app); return {...DEFAULT_SETTINGS,...readJson(f.settings,DEFAULT_SETTINGS)}; }
export function saveQuoteSettings(app,input={}){
  const current=getQuoteSettings(app);
  const normalizeRates=(source,fallback)=>{
    const out={}; for(let i=1;i<=18;i++) out[i]=percentage(source?.[i]??source?.[String(i)]??fallback?.[i]??0); return out;
  };
  const settings={
    ...current,
    calculationMode:['gross-up','markup'].includes(input.calculationMode)?input.calculationMode:'markup',
    displayInstallments:Array.isArray(input.displayInstallments)?[...new Set(input.displayInstallments.map(v=>Math.max(1,Math.min(18,Math.round(num(v,1))))))]:current.displayInstallments,
    showCash:input.showCash!==false,
    pricing:{roundToNine99:input.pricing?.roundToNine99!==false},
    rates:{
      pix:percentage(input.rates?.pix),cash:percentage(input.rates?.cash),debit:percentage(input.rates?.debit),
      card:normalizeRates(input.rates?.card,current.rates.card),credit:normalizeRates(input.rates?.credit,current.rates.credit)
    },
    defaults:{
      importRate:percentage(input.defaults?.importRate),
      installments:Math.max(1,Math.min(18,Math.round(num(input.defaults?.installments,1)))),
      paymentMethod:['pix','cash','debit','card','credit'].includes(input.defaults?.paymentMethod)?input.defaults.paymentMethod:'pix',
      dollarRate:Math.max(0,num(input.defaults?.dollarRate,current.defaults?.dollarRate||0)),
      dollarAdd:Math.max(0,num(input.defaults?.dollarAdd,current.defaults?.dollarAdd||0)),
      defaultProfit:Math.max(0,money(input.defaults?.defaultProfit??current.defaults?.defaultProfit??0)),
      tableCashMode:input.defaults?.tableCashMode==='noFee'?'noFee':'withFee',
      manualCashMode:input.defaults?.manualCashMode==='withFee'?'withFee':'noFee'
    },
    marginRules:(Array.isArray(input.marginRules)?input.marginRules:current.marginRules||[]).slice(0,200).map(rule=>({keywords:text(rule.keywords,300),profit:Math.max(0,money(rule.profit))})).filter(rule=>rule.keywords),
    message:{
      header:text(input.message?.header,500),footer:text(input.message?.footer,1000),
      warranty:text(input.message?.warranty,500),shipping:text(input.message?.shipping,500),
      offerTitle:text(input.message?.offerTitle,500),validUntil:text(input.message?.validUntil,200),
      productEmoji:text(input.message?.productEmoji,20)||'📲',installmentEmoji:text(input.message?.installmentEmoji,20)||'💳',cashEmoji:text(input.message?.cashEmoji,20)||'🔥',
      paymentLabels:{
        card:text(input.message?.paymentLabels?.card,80)||'no cartão',
        credit:text(input.message?.paymentLabels?.credit,80)||'no boleto/crediário',
        cashWithFee:text(input.message?.paymentLabels?.cashWithFee,80)||'à vista no Pix ou dinheiro',
        cashNoFee:text(input.message?.paymentLabels?.cashNoFee,80)||'à vista sem taxa'
      }
    },updatedAt:now()
  };
  writeJson(files(app).settings,settings); return settings;
}
export function listQuotes(app){ const f=ensureQuoteStorage(app); return (readJson(f.quotes,{quotes:[]}).quotes||[]).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))); }
export function getQuote(app,quoteId){ return listQuotes(app).find(q=>q.id===quoteId)||null; }

export function calculateQuote(input={},settings=DEFAULT_SETTINGS){
  const items=(Array.isArray(input.items)?input.items:[]).map(item=>{
    const quantity=Math.max(1,Math.min(999,Math.round(num(item.quantity,1))));
    const cost=money(item.cost); const importRate=percentage(item.importRate); const profit=money(item.profit);
    const importedCost=money(cost*(1+importRate/100));
    const unitPrice=money(importedCost+profit);
    const cashRate=percentage(settings.rates.pix);
    const card12Rate=percentage(settings.rates.card?.[12]);
    const card18Rate=percentage(settings.rates.card?.[18]);
    const applyRate=(base,rate)=>settings.calculationMode==='gross-up'?money(base/(1-rate/100)):money(base*(1+rate/100));
    const cashPrice=applyRate(unitPrice,cashRate);
    const card12Total=applyRate(unitPrice,card12Rate);
    const card18Total=applyRate(unitPrice,card18Rate);
    return {id:text(item.id||id('item'),100),productId:text(item.productId,120),name:text(item.name,300),quantity,cost,importRate,profit,importedCost,unitPrice,total:money(unitPrice*quantity),cashPrice,card12Total,card12Installment:money(card12Total/12),card18Total,card18Installment:money(card18Total/18),source:text(item.source||'manual',30)};
  }).filter(item=>item.name && item.total>=0);
  const subtotal=money(items.reduce((sum,item)=>sum+item.total,0));
  const entry=money(Math.max(0,num(input.entry,0)));
  const tradeValue=money(Math.max(0,num(input.trade?.value,0)));
  const remaining=money(Math.max(0,subtotal-entry-tradeValue));
  const method=['pix','cash','debit','card','credit'].includes(input.paymentMethod)?input.paymentMethod:'pix';
  const installments=Math.max(1,Math.min(18,Math.round(num(input.installments,1))));
  let rate=0;
  if(method==='pix') rate=percentage(settings.rates.pix);
  if(method==='cash') rate=percentage(settings.rates.cash);
  if(method==='debit') rate=percentage(settings.rates.debit);
  if(method==='card') rate=percentage(settings.rates.card?.[installments]);
  if(method==='credit') rate=percentage(settings.rates.credit?.[installments]);
  let financedTotal=remaining;
  if(remaining>0 && rate>0){ financedTotal=settings.calculationMode==='markup'?money(remaining*(1+rate/100)):money(remaining/(1-rate/100)); }
  const installmentValue=money(financedTotal/installments);
  const totalCost=money(items.reduce((sum,item)=>sum+(item.importedCost*item.quantity),0));
  const estimatedProfit=money(entry+tradeValue+financedTotal-totalCost);
  return {items,subtotal,entry,trade:{name:text(input.trade?.name,240),value:tradeValue},remaining,paymentMethod:method,installments,rate,financedTotal,installmentValue,totalCost,estimatedProfit};
}

export function formatBRL(value){ return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
export function buildQuoteMessage(input={},calculation,settings=DEFAULT_SETTINGS){
  const lines=[];
  const m=settings.message||{};
  const title=m.offerTitle||m.header||'Ofertas Quality Celulares';
  lines.push(`${title}${m.validUntil?` válidas até ${m.validUntil}💥`:''}`);
  if(m.warranty) lines.push(m.warranty);
  if(m.shipping) lines.push(m.shipping);
  lines.push('');
  if(input.customerName) lines.push(`Olá, ${text(input.customerName,160)}! 😊`,'');
  for(const item of calculation.items){
    lines.push(`${m.productEmoji||'📲'}Produto ${item.name}`);
    lines.push('Tem um *investimento* de');
    lines.push(`${m.installmentEmoji||'💳'} 18X de ${formatBRL(item.card18Installment)} no cartão`);
    lines.push(`${m.installmentEmoji||'💳'} 12X de ${formatBRL(item.card12Installment)} no cartão`);
    lines.push(`${formatBRL(item.cashPrice)} à vista no pix ou dinheiro ${m.cashEmoji||'🔥'}`,'');
  }
  if(calculation.trade.value>0) lines.push(`🔄 Recebendo ${calculation.trade.name||'aparelho usado'} na troca por ${formatBRL(calculation.trade.value)}`);
  if(calculation.entry>0) lines.push(`💵 Entrada de ${formatBRL(calculation.entry)}`);
  if(calculation.trade.value>0||calculation.entry>0) lines.push(`📌 Restante: ${formatBRL(calculation.remaining)}`,'');
  if(input.notes) lines.push(text(input.notes,1200),'');
  if(m.footer) lines.push(m.footer);
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

export function saveQuote(app,input={}){
  const f=ensureQuoteStorage(app); const data=readJson(f.quotes,{version:1,quotes:[]}); const settings=getQuoteSettings(app);
  const calculation=calculateQuote(input,settings); if(!calculation.items.length) throw new Error('Adicione pelo menos um produto ao orçamento.');
  const quoteId=text(input.id,100)||id('quote'); const existing=data.quotes.find(q=>q.id===quoteId);
  const quote={
    id:quoteId,number:existing?.number||String(Date.now()).slice(-8),status:text(input.status||existing?.status||'draft',30),
    customerId:text(input.customerId,120),customerName:text(input.customerName,160),conversationId:text(input.conversationId,120),
    notes:text(input.notes,1200),...calculation,message:buildQuoteMessage(input,calculation,settings),
    createdAt:existing?.createdAt||now(),updatedAt:now()
  };
  if(existing) Object.assign(existing,quote); else data.quotes.push(quote); writeJson(f.quotes,data); return quote;
}
export function deleteQuote(app,quoteId){ const f=ensureQuoteStorage(app); const data=readJson(f.quotes,{version:1,quotes:[]}); const before=data.quotes.length; data.quotes=data.quotes.filter(q=>q.id!==quoteId); writeJson(f.quotes,data); return before!==data.quotes.length; }


function normalizeProductKey(value=''){
  return text(value,300).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function cleanSupplierRow(row={},index=0){
  const colors=Array.isArray(row.colors)?row.colors.map(value=>text(value,80)).filter(Boolean).slice(0,40):[];
  return {
    id:text(row.id||`row_${index}`,100),
    name:text(row.name,300),
    colors:[...new Set(colors)],
    original:Math.max(0,money(row.original)),
    currency:['USD','BRL'].includes(row.currency)?row.currency:undefined,
    convertedCost:Math.max(0,money(row.convertedCost)),
    finalCost:Math.max(0,money(row.finalCost)),
    saleBase:Math.max(0,money(row.saleBase)),
    importRate:percentage(row.importRate),
    profit:Math.max(0,money(row.profit)),
    source:text(row.source||'',30),
    selected:row.selected!==false,
    favorite:Boolean(row.favorite)
  };
}
export function listSupplierTables(app){
  const f=ensureQuoteStorage(app); const data=readJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  return (data.tables||[]).map(table=>({...table,itemCount:(table.items||[]).length,items:undefined})).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export function getSupplierTable(app,tableId){
  const f=ensureQuoteStorage(app); const data=readJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  const table=(data.tables||[]).find(item=>item.id===tableId); if(!table) return null;
  const favoriteSet=new Set(data.favorites||[]);
  return {...table,items:(table.items||[]).map(item=>({...item,favorite:favoriteSet.has(normalizeProductKey(item.name))}))};
}
export function saveSupplierTable(app,input={}){
  const f=ensureQuoteStorage(app); const data=readJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  const items=(Array.isArray(input.items)?input.items:[]).slice(0,5000).map(cleanSupplierRow).filter(item=>item.name&&item.original>0);
  if(!items.length) throw new Error('A tabela não possui produtos válidos para salvar.');
  const tableId=text(input.id,100)||id('supplier_table');
  const previous=(data.tables||[]).find(item=>item.id===tableId);
  const table={
    id:tableId,
    supplier:text(input.supplier||'Fornecedor',160),
    name:text(input.name||input.supplier||'Tabela comercial',180),
    source:text(input.source||'manual',30),
    sourceFile:text(input.sourceFile,180),
    currency:['USD','BRL'].includes(input.currency)?input.currency:'USD',
    dollarBase:Math.max(0,num(input.dollarBase,input.dollarRate||0)),
    dollarAdd:Math.max(0,num(input.dollarAdd,0)),
    dollarRate:Math.max(0,num(input.dollarRate,0)),
    defaultImportRate:percentage(input.defaultImportRate),
    items,
    createdAt:previous?.createdAt||now(),updatedAt:now()
  };
  const others=(data.tables||[]).filter(item=>item.id!==tableId);
  data.tables=[table,...others].slice(0,100); writeJson(f.supplierTables,data); return table;
}
export function deleteSupplierTable(app,tableId){
  const f=ensureQuoteStorage(app); const data=readJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  const before=(data.tables||[]).length; data.tables=(data.tables||[]).filter(item=>item.id!==tableId);
  if(data.tables.length===before) throw new Error('Tabela não encontrada.'); writeJson(f.supplierTables,data); return true;
}
export function toggleSupplierFavorite(app,productName,favorite=true){
  const f=ensureQuoteStorage(app); const data=readJson(f.supplierTables,{version:1,tables:[],favorites:[]});
  const key=normalizeProductKey(productName); if(!key) throw new Error('Produto não identificado.');
  const set=new Set(data.favorites||[]); favorite?set.add(key):set.delete(key); data.favorites=[...set]; writeJson(f.supplierTables,data); return favorite;
}
export function compareSupplierTable(app,input={}){
  const current=(Array.isArray(input.items)?input.items:[]).map(cleanSupplierRow).filter(item=>item.name&&item.original>0);
  const tables=listSupplierTables(app).filter(table=>!input.currentId||table.id!==input.currentId);
  const sameSupplier=tables.find(table=>normalizeProductKey(table.supplier)===normalizeProductKey(input.supplier));
  if(!sameSupplier) return {previous:null,changes:[]};
  const previous=getSupplierTable(app,sameSupplier.id); const prevMap=new Map((previous.items||[]).map(item=>[normalizeProductKey(item.name),item]));
  const changes=current.map(item=>{const old=prevMap.get(normalizeProductKey(item.name)); if(!old) return {...item,status:'new',previousOriginal:null,difference:null}; const diff=money(item.original-old.original); return {...item,status:diff>0?'up':diff<0?'down':'same',previousOriginal:old.original,difference:diff};});
  return {previous:{id:previous.id,name:previous.name,updatedAt:previous.updatedAt},changes};
}
