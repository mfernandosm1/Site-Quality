import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import XLSX from 'xlsx';
import { ensureQuoteStorage,getQuoteSettings,saveQuoteSettings,listQuotes,getQuote,saveQuote,deleteQuote,calculateQuote,buildQuoteMessage,listSupplierTables,getSupplierTable,saveSupplierTable,deleteSupplierTable,toggleSupplierFavorite,compareSupplierTable } from '../services/erp_quotes.js';
import { listCustomers } from '../services/erp_customers.js';
import { listWhatsAppConversations,sendWhatsAppTextToConversation } from './automacao_whatsapp.js';

const router=express.Router();

const ROUTE_DIR=path.dirname(fileURLToPath(import.meta.url));
const MESSAGE_TEMPLATES_FILE=path.join(ROUTE_DIR,'..','data','erp','quote-message-templates.json');
function ensureMessageTemplateStorage(){
  fs.mkdirSync(path.dirname(MESSAGE_TEMPLATES_FILE),{recursive:true});
  if(!fs.existsSync(MESSAGE_TEMPLATES_FILE))fs.writeFileSync(MESSAGE_TEMPLATES_FILE,'[]','utf8');
}
function normalizeTemplate(item={}){
  const legacyContent=safe(item.content||item.message||'',12000);
  return {
    id:safe(item.id,100)||templateId(),
    name:safe(item.name,120)||'Modelo comercial',
    category:safe(item.category||'Geral',80)||'Geral',
    header:safe(item.header,300),
    offerTitle:safe(item.offerTitle,300),
    validUntil:safe(item.validUntil,180),
    warranty:safe(item.warranty,300),
    shipping:safe(item.shipping,300),
    footer:safe(item.footer,600),
    emojis:{
      product:safe(item.emojis?.product||item.productEmoji||'📲',20),
      installment:safe(item.emojis?.installment||item.installmentEmoji||'💳',20),
      cash:safe(item.emojis?.cash||item.cashEmoji||'🔥',20)
    },
    defaultMessage:safe(item.defaultMessage||legacyContent,12000),
    notes:safe(item.notes,2000),
    isDefault:Boolean(item.isDefault),
    createdAt:item.createdAt||new Date().toISOString(),
    updatedAt:item.updatedAt||new Date().toISOString()
  };
}
function listMessageTemplates(){
  ensureMessageTemplateStorage();
  try{
    const raw=JSON.parse(fs.readFileSync(MESSAGE_TEMPLATES_FILE,'utf8'));
    const normalized=(Array.isArray(raw)?raw:[]).map(normalizeTemplate);
    if(JSON.stringify(raw)!==JSON.stringify(normalized))writeMessageTemplates(normalized);
    return normalized;
  }catch{return [];}
}
function writeMessageTemplates(list){
  ensureMessageTemplateStorage();
  const temp=MESSAGE_TEMPLATES_FILE+'.tmp';
  fs.writeFileSync(temp,JSON.stringify((list||[]).map(normalizeTemplate),null,2),'utf8');
  fs.renameSync(temp,MESSAGE_TEMPLATES_FILE);
}
function templateId(){return 'msg_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);}

const excelUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024,files:1},fileFilter(req,file,cb){
  const ext=path.extname(file.originalname||'').toLowerCase();
  if(!['.xls','.xlsx','.xlsm','.csv'].includes(ext)) return cb(new Error('Envie uma planilha .xls, .xlsx, .xlsm ou .csv.'));
  cb(null,true);
}});
function safe(value,max=4000){return String(value??'').replace(/[<>]/g,'').trim().slice(0,max);}
function parsePayload(req){if(req.body?.payload){try{return JSON.parse(req.body.payload);}catch{throw new Error('Os dados do orçamento estão inválidos.');}}return req.body||{};}
function loadProducts(app){const file=path.join(app.locals.paths.CONTENT_DIR,'products.json');try{const raw=JSON.parse(fs.readFileSync(file,'utf8'));const list=Array.isArray(raw)?raw:(raw.products||raw.items||[]);return list.map((p,index)=>({id:String(p.id||p.slug||index),name:String(p.name||p.nome||p.title||p.titulo||'Produto'),cost:Number(p.cost||p.custo||p.purchasePrice||0)||0,price:Number(p.price||p.preco||p.valor||0)||0}));}catch{return [];}}
function normalizeMatrix(rows){
  // Importa todas as linhas legíveis da planilha.
  // O limite anterior de 2.500 linhas fazia produtos localizados mais abaixo desaparecerem.
  // Mantemos somente o limite de 40 colunas por linha para evitar dados acidentais muito largos.
  return (rows||[]).map(row=>
    (Array.isArray(row)?row:[])
      .slice(0,40)
      .map(value=>value==null?'':String(value).trim())
  );
}
function quoteItemLimit(settings,input={}){return Math.max(1,Math.min(300,Number(settings?.limits?.maxItems||settings?.maxQuoteItems||input?.maxItems||100)||100));}
function validateQuoteItems(input,settings){const count=Array.isArray(input?.items)?input.items.length:0,limit=quoteItemLimit(settings,input);if(count>limit)throw new Error(`O orçamento possui ${count} produtos. O limite configurado é ${limit}. Reduza a seleção para evitar travamentos e mensagens longas.`);return limit;}

function brl(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function applyRate(base,rate,mode){const n=Number(rate||0);if(mode==='gross-up')return n>=100?base:base/(1-n/100);return base*(1+n/100);}
function commercialRound(value){const n=Number(value||0);if(n<=0)return n;return Math.round((Math.ceil(((n+0.01)-1e-9)/10)*10-0.01)*100)/100;}
function buildDynamicQuoteMessage(input,calculation,settings){
  const message=settings?.message||{};
  const terms=Array.isArray(settings?.displayInstallments)?[...new Set(settings.displayInstallments.map(Number).filter(n=>n>=1&&n<=18))]:[];
  const showCash=input?.showCash!==false;
  const channel=input?.paymentChannel==='credit'?'credit':'card';
  const labels=message.paymentLabels||{};
  const channelLabel=channel==='credit'?(labels.credit||'no boleto/crediário'):(labels.card||'no cartão');
  const cashMode=input?.cashMode==='withFee'?'withFee':'noFee';
  const cashLabel=labels.cashWithFee||'à vista no Pix ou dinheiro';
  const lines=[];
  const title=safe(message.offerTitle||message.header||'Orçamento Quality Celulares ✨',200);
  if(title)lines.push(title);
  if(message.validUntil)lines.push(`Válido até ${safe(message.validUntil,120)}`);
  if(message.warranty)lines.push(safe(message.warranty,250));
  if(message.shipping)lines.push(safe(message.shipping,250));
  if(lines.length)lines.push('');
  const productEmoji=safe(message.productEmoji||'📲',10), installmentEmoji=safe(message.installmentEmoji||'💳',10), cashEmoji=safe(message.cashEmoji||'🔥',10);
  const calcItems=Array.isArray(calculation?.items)?calculation.items:[];
  const entry=Math.max(0,Number(input.entry||0));
  const tradeValue=Math.max(0,Number(input.trade?.value||0));
  const tradeName=safe(input.trade?.name||'',250);
  const discount=entry+tradeValue;
  (input.items||[]).forEach((item,index)=>{
    const quantity=Math.max(1,Number(item.quantity||1));
    const base=Number(calcItems[index]?.total ?? ((Number(item.cost||0)*(1+Number(item.importRate||0)/100)+Number(item.profit||0))*quantity));
    const remaining=Math.max(0,base-discount);
    lines.push(`${productEmoji} ${safe(item.name||'Produto',300)}`);
    const conditions=[];
    if(tradeName||tradeValue>0){let text=`Recebendo ${tradeName||'seu aparelho'} na troca`;if(tradeValue>0)text+=` por ${brl(tradeValue)}`;conditions.push(text);}
    if(entry>0)conditions.push(`${brl(entry)} de entrada em dinheiro ou Pix`);
    if(conditions.length)lines.push(conditions.join(' + ')+' e o restante em:');
    let cashValue=cashMode==='withFee'?applyRate(remaining,settings?.rates?.pix||0,settings?.calculationMode):remaining;
    if(input?.roundCash&&cashMode==='withFee'&&settings?.pricing?.roundToNine99!==false)cashValue=commercialRound(cashValue);
    terms.forEach(term=>{
      const rate=Number(settings?.rates?.[channel]?.[term]||0);
      const total=input?.pricingContext==='table'?cashValue*(1+rate/100):applyRate(remaining,rate,settings?.calculationMode);
      lines.push(`${installmentEmoji} ${term}x de ${brl(total/term)} ${channelLabel}`);
    });
    if(showCash)lines.push(`${cashEmoji} ${brl(cashValue)} ${cashLabel}`);
    lines.push('');
  });
  if(input.notes)lines.push(safe(input.notes,500));
  if(message.footer)lines.push(safe(message.footer,500));
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}

router.get('/',(req,res)=>{ensureQuoteStorage(req.app);const editId=safe(req.query.edit,100);const quote=editId?getQuote(req.app,editId):null;res.render('orcamentos',{flash:req.query.flash||null,error:req.query.error||null,quote,quotes:listQuotes(req.app),quoteSettings:getQuoteSettings(req.app),customers:listCustomers(req.app),conversations:listWhatsAppConversations(req.app),products:loadProducts(req.app),supplierTables:listSupplierTables(req.app),messageTemplates:listMessageTemplates()});});

router.get('/cotacao-dolar',async(req,res)=>{try{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  const end=new Date(); const start=new Date(end); start.setDate(start.getDate()-15);
  const fmt=d=>String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'-'+d.getFullYear();
  const periodUrl=`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${fmt(start)}'&@dataFinalCotacao='${fmt(end)}'&$orderby=dataHoraCotacao%20desc&$top=200&$format=json`;
  let rows=[];
  try{
    const response=await fetch(periodUrl,{headers:{Accept:'application/json'},signal:controller.signal});
    if(response.ok){const data=await response.json(); rows=Array.isArray(data?.value)?data.value:[];}
  }catch{}
  let latest=rows.find(x=>Number(x.cotacaoVenda)>0);
  if(!latest){
    for(let offset=0;offset<10&&!latest;offset++){
      const day=new Date(end); day.setDate(day.getDate()-offset);
      const url=`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${fmt(day)}'&$orderby=dataHoraCotacao%20desc&$format=json`;
      try{
        const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});
        if(!response.ok)continue;
        const data=await response.json();
        latest=(Array.isArray(data?.value)?data.value:[]).find(x=>Number(x.cotacaoVenda)>0);
      }catch{}
    }
  }
  clearTimeout(timeout);
  if(!latest)throw new Error('Nenhuma cotação recente foi encontrada. Você pode preencher a PTAX manualmente.');
  res.json({success:true,rate:Number(latest.cotacaoVenda),purchase:Number(latest.cotacaoCompra||0),date:latest.dataHoraCotacao,source:'Banco Central do Brasil — PTAX'});
}catch(error){res.status(502).json({success:false,message:error.name==='AbortError'?'Tempo esgotado ao consultar o Banco Central. Digite a PTAX manualmente.':(error.message||'Falha ao consultar o Banco Central.')});}});

router.post('/importar-excel',(req,res)=>{excelUpload.single('arquivo')(req,res,error=>{if(error)return res.status(400).json({success:false,message:error.message});try{if(!req.file)throw new Error('Selecione uma planilha.');const workbook=XLSX.read(req.file.buffer,{type:'buffer',cellDates:false,raw:false});const sheets=workbook.SheetNames.map(name=>{const matrix=normalizeMatrix(XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,defval:'',blankrows:false,raw:false}));return {name,rows:matrix};}).filter(sheet=>sheet.rows.length);if(!sheets.length)throw new Error('A planilha não possui dados legíveis.');res.json({success:true,filename:safe(req.file.originalname,180),sheets});}catch(err){res.status(400).json({success:false,message:err.message||'Não foi possível ler a planilha.'});}});});


router.get('/mensagens-prontas',(req,res)=>{try{res.json({success:true,templates:listMessageTemplates()});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao carregar mensagens prontas.'});}});
router.post('/mensagens-prontas/salvar',(req,res)=>{try{
  const input=parsePayload(req),id=safe(input.id,100),name=safe(input.name,120);
  if(!name)throw new Error('Informe um nome para o modelo comercial.');
  const list=listMessageTemplates(),now=new Date().toISOString();
  let template=list.find(item=>item.id===id);
  const data=normalizeTemplate({...input,id:template?.id||'',name,isDefault:template?.isDefault||false,createdAt:template?.createdAt||now,updatedAt:now});
  if(template)Object.assign(template,data);else{template=data;list.push(template);}
  writeMessageTemplates(list);
  res.json({success:true,template,templates:list,message:input.id?'Modelo comercial atualizado.':'Novo modelo comercial criado.'});
}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao salvar modelo comercial.'});}});
router.post('/mensagens-prontas/excluir',(req,res)=>{try{
  const id=safe(req.body?.id||parsePayload(req).id,100);let list=listMessageTemplates();
  if(!list.some(item=>item.id===id))throw new Error('Mensagem pronta não encontrada.');
  list=list.filter(item=>item.id!==id);writeMessageTemplates(list);
  res.json({success:true,templates:list,message:'Mensagem pronta excluída.'});
}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao excluir mensagem pronta.'});}});
router.post('/mensagens-prontas/duplicar',(req,res)=>{try{
  const input=parsePayload(req),id=safe(input.id,100),list=listMessageTemplates(),source=list.find(item=>item.id===id);
  if(!source)throw new Error('Mensagem pronta não encontrada.');
  const now=new Date().toISOString(),copy=normalizeTemplate({...source,id:templateId(),name:safe(input.name||source.name+' — cópia',120),isDefault:false,createdAt:now,updatedAt:now});
  list.push(copy);writeMessageTemplates(list);res.json({success:true,template:copy,templates:list,message:'Mensagem duplicada.'});
}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao duplicar mensagem pronta.'});}});
router.post('/mensagens-prontas/padrao',(req,res)=>{try{
  const input=parsePayload(req),id=safe(input.id,100),list=listMessageTemplates();
  if(id&&!list.some(item=>item.id===id))throw new Error('Mensagem pronta não encontrada.');
  list.forEach(item=>item.isDefault=item.id===id);writeMessageTemplates(list);
  res.json({success:true,templates:list,message:id?'Mensagem definida como padrão.':'Mensagem padrão removida.'});
}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao definir mensagem padrão.'});}});

router.get('/tabelas/:id',(req,res)=>{try{const table=getSupplierTable(req.app,safe(req.params.id,100));if(!table)return res.status(404).json({success:false,message:'Tabela não encontrada.'});res.json({success:true,table});}catch(error){res.status(400).json({success:false,message:error.message});}});
router.post('/tabelas/salvar',(req,res)=>{try{const table=saveSupplierTable(req.app,parsePayload(req));res.json({success:true,table,message:'Tabela do fornecedor salva.'});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao salvar tabela.'});}});
router.post('/tabelas/excluir',(req,res)=>{try{deleteSupplierTable(req.app,safe(req.body?.id,100));res.json({success:true,message:'Tabela excluída.'});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao excluir tabela.'});}});
router.post('/tabelas/favorito',(req,res)=>{try{const favorite=toggleSupplierFavorite(req.app,req.body?.name,req.body?.favorite!==false);res.json({success:true,favorite});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao atualizar favorito.'});}});
router.post('/tabelas/comparar',(req,res)=>{try{res.json({success:true,...compareSupplierTable(req.app,parsePayload(req))});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao comparar tabela.'});}});

router.post('/salvar',(req,res)=>{try{const input=parsePayload(req);input.type=input.type==='table'?'table':'manual';const settings=getQuoteSettings(req.app);validateQuoteItems(input,settings);const quote=saveQuote(req.app,input);res.json({success:true,quote});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao salvar orçamento.'});}});
router.post('/previsualizar',(req,res)=>{try{const input=parsePayload(req);const baseSettings=getQuoteSettings(req.app);const settings={...baseSettings,displayInstallments:Array.isArray(input.displayInstallments)?input.displayInstallments:baseSettings.displayInstallments};validateQuoteItems(input,settings);const calculation=calculateQuote(input,settings);res.json({success:true,calculation,message:buildDynamicQuoteMessage(input,calculation,settings)});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao calcular orçamento.'});}});
router.post('/enviar-whatsapp',async(req,res)=>{try{const input=parsePayload(req);const baseSettings=getQuoteSettings(req.app);const settings={...baseSettings,displayInstallments:Array.isArray(input.displayInstallments)?input.displayInstallments:baseSettings.displayInstallments};validateQuoteItems(input,settings);const calculation=calculateQuote(input,settings);const message=safe(input.message||buildDynamicQuoteMessage(input,calculation,settings),4000);if(!input.conversationId)throw new Error('Selecione a conversa do cliente no WhatsApp.');await sendWhatsAppTextToConversation(req.app,input.conversationId,message);res.json({success:true,message:'Orçamento enviado para a conversa selecionada.'});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao enviar orçamento.'});}});
router.post('/excluir',(req,res)=>{try{const input=parsePayload(req);deleteQuote(req.app,safe(input.id,100));res.json({success:true,message:'Orçamento excluído.'});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao excluir orçamento.'});}});
router.post('/configuracoes',(req,res)=>{try{const settings=saveQuoteSettings(req.app,parsePayload(req));res.json({success:true,message:'Configurações salvas.',settings});}catch(error){res.status(400).json({success:false,message:error.message||'Falha ao salvar configurações.'});}});
export default router;
