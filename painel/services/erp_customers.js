import fs from 'fs';
import path from 'path';

function root(app){ return path.join(app.locals.paths.CONTENT_DIR, 'erp'); }
function files(app){ const r=root(app); return { root:r, customers:path.join(r,'customers.json'), labels:path.join(r,'labels.json'), notes:path.join(r,'customer_notes.json') }; }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function readJson(file,fallback){ try{ return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf-8')):fallback; }catch{return fallback;} }
function writeJson(file,data){ ensureDir(path.dirname(file)); const temp=file+'.tmp'; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf-8'); fs.renameSync(temp,file); }
function now(){ return new Date().toISOString(); }
function safe(value,max=500){ return String(value??'').replace(/[<>]/g,'').trim().slice(0,max); }
function digits(value=''){ return String(value).replace(/\D/g,''); }
function id(prefix){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }

const DEFAULT_LABELS=[
  {id:'label_vip',name:'Cliente VIP',color:'#16a34a'},
  {id:'label_garantia',name:'Garantia',color:'#eab308'},
  {id:'label_orcamento',name:'Orçamento',color:'#2563eb'},
  {id:'label_pos_venda',name:'Pós-venda',color:'#9333ea'},
  {id:'label_assistencia',name:'Assistência',color:'#f97316'}
];

export function ensureErpStorage(app){
  const f=files(app); ensureDir(f.root);
  if(!fs.existsSync(f.customers)) writeJson(f.customers,{version:1,customers:[]});
  if(!fs.existsSync(f.labels)) writeJson(f.labels,{version:1,labels:DEFAULT_LABELS});
  if(!fs.existsSync(f.notes)) writeJson(f.notes,{version:1,notes:[]});
  return f;
}

export function ensureCustomerForConversation(app,conversation){
  if(!conversation || conversation.conversationType==='group') return null;
  const f=ensureErpStorage(app);
  const data=readJson(f.customers,{version:1,customers:[]});
  const phone=digits(conversation.phone||'');
  let customer=data.customers.find(c => (phone && (c.phones||[]).some(p=>digits(p.number)===phone)) || (conversation.whatsappId && (c.channels||[]).some(ch=>ch.type==='whatsapp' && ch.externalId===conversation.whatsappId)));
  if(!customer){
    customer={
      id:id('customer'), type:'person', name:safe(conversation.name||phone,160), tradeName:'', email:'', document:{cpf:'',cnpj:''},
      phones:phone?[{number:phone,type:'whatsapp',primary:true}]:[], addresses:[],
      channels:[{type:'whatsapp',externalId:safe(conversation.whatsappId,120),conversationId:safe(conversation.id,100)}],
      labels:[], commercialStage:safe(conversation.commercialStatus||'new',40), interestProduct:safe(conversation.interestProduct||'',220), assignedTo:'',
      createdAt:now(), updatedAt:now()
    };
    data.customers.push(customer); writeJson(f.customers,data);
  } else {
    let changed=false;
    if(phone && !(customer.phones||[]).some(p=>digits(p.number)===phone)){ customer.phones=customer.phones||[]; customer.phones.push({number:phone,type:'whatsapp',primary:customer.phones.length===0}); changed=true; }
    if(conversation.whatsappId && !(customer.channels||[]).some(ch=>ch.type==='whatsapp'&&ch.externalId===conversation.whatsappId)){ customer.channels=customer.channels||[]; customer.channels.push({type:'whatsapp',externalId:conversation.whatsappId,conversationId:conversation.id}); changed=true; }
    if(changed){ customer.updatedAt=now(); writeJson(f.customers,data); }
  }
  return customer;
}

export function getCustomerContext(app,conversation){
  const customer=ensureCustomerForConversation(app,conversation);
  if(!customer) return {customer:null,labels:[],notes:[]};
  const f=ensureErpStorage(app);
  const labels=readJson(f.labels,{labels:[]}).labels||[];
  const notes=(readJson(f.notes,{notes:[]}).notes||[]).filter(n=>n.customerId===customer.id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  return {customer,labels,notes};
}

export function updateCustomer(app,customerId,input={}){
  const f=ensureErpStorage(app); const data=readJson(f.customers,{version:1,customers:[]}); const customer=data.customers.find(c=>c.id===customerId); if(!customer) throw new Error('Cliente não encontrado.');
  customer.name=safe(input.name||customer.name,160); customer.email=safe(input.email,180); customer.document=customer.document||{}; customer.document.cpf=safe(input.cpf,20); customer.document.cnpj=safe(input.cnpj,24);
  customer.commercialStage=safe(input.commercialStage||customer.commercialStage||'new',40); customer.interestProduct=safe(input.interestProduct,220); customer.assignedTo=safe(input.assignedTo,120);
  if(Array.isArray(input.labels)) customer.labels=[...new Set(input.labels.map(v=>safe(v,80)).filter(Boolean))];
  customer.updatedAt=now(); writeJson(f.customers,data); return customer;
}

export function addCustomerNote(app,customerId,text){
  const clean=safe(text,2000); if(!clean) throw new Error('Digite a nota interna.');
  const f=ensureErpStorage(app); const data=readJson(f.notes,{version:1,notes:[]}); const note={id:id('note'),customerId,text:clean,createdAt:now(),createdBy:'local'}; data.notes.push(note); writeJson(f.notes,data); return note;
}

export function createCustomerLabel(app,{name,color}){
  const clean=safe(name,80); if(!clean) throw new Error('Informe o nome da etiqueta.');
  const f=ensureErpStorage(app); const data=readJson(f.labels,{version:1,labels:[]});
  const existing=data.labels.find(l=>l.name.toLowerCase()===clean.toLowerCase()); if(existing) return existing;
  const label={id:id('label'),name:clean,color:/^#[0-9a-f]{6}$/i.test(String(color||''))?String(color):'#64748b'}; data.labels.push(label); writeJson(f.labels,data); return label;
}

export function listCustomers(app){
  const f=ensureErpStorage(app);
  return (readJson(f.customers,{version:1,customers:[]}).customers||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
}
