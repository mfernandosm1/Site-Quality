import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const text=v=>String(v??'').trim();
const digits=v=>text(v).replace(/\D/g,'');
const bool=(v,def=true)=>v===undefined?def:!(v===false||v==='false'||v==='0'||v===0||v==='não'||v==='nao');
const validCnpj=value=>{
  const n=digits(value); if(n.length!==14||/^(\d)\1{13}$/.test(n)) return false;
  const calc=base=>{ let sum=0, weight=base.length-7; for(const ch of base){ sum+=Number(ch)*weight--; if(weight<2)weight=9; } const r=sum%11; return r<2?0:11-r; };
  return calc(n.slice(0,12))===Number(n[12]) && calc(n.slice(0,13))===Number(n[13]);
};

export default class CarrierService{
  constructor({dataDir}){ this.dataDir=dataDir; this.file=path.join(dataDir,'carriers.json'); fs.mkdirSync(dataDir,{recursive:true}); }
  read(){ try{ const v=JSON.parse(fs.readFileSync(this.file,'utf8')); return Array.isArray(v)?v:[]; }catch(_){ return []; } }
  write(rows){ const tmp=`${this.file}.tmp`; fs.mkdirSync(path.dirname(this.file),{recursive:true}); fs.writeFileSync(tmp,JSON.stringify(rows,null,2),'utf8'); fs.renameSync(tmp,this.file); }
  list({includeInactive=false}={}){ return this.read().filter(x=>includeInactive||x.active!==false).sort((a,b)=>text(a.name).localeCompare(text(b.name),'pt-BR')); }
  get(id){ return this.read().find(x=>String(x.id)===String(id))||null; }
  sanitize(input={},current={}){
    const name=text(input.name||current.name); if(!name) throw new Error('Informe o nome da transportadora / método de entrega.');
    const type=['carrier','correios','motoboy','own','pickup','bus','air','other'].includes(text(input.type))?text(input.type):(current.type||'carrier');
    const document=digits(input.document??current.document);
    if(document.length===14 && !validCnpj(document)) throw new Error('CNPJ inválido. Confira os números informados.');
    return {...current,id:current.id||text(input.id)||crypto.randomUUID(),name,type,document,legalName:text(input.legalName??current.legalName),tradeName:text(input.tradeName??current.tradeName),stateRegistration:text(input.stateRegistration??current.stateRegistration),zip:digits(input.zip??current.zip).slice(0,8),address:text(input.address??current.address),neighborhood:text(input.neighborhood??current.neighborhood),city:text(input.city??current.city),state:text(input.state??current.state).toUpperCase().slice(0,2),phone:text(input.phone??current.phone),email:text(input.email??current.email).toLowerCase(),registrationStatus:text(input.registrationStatus??current.registrationStatus),plate:text(input.plate??current.plate).toUpperCase(),plateState:text(input.plateState??current.plateState).toUpperCase().slice(0,2),notes:text(input.notes??current.notes),active:bool(input.active,current.active!==false),updatedAt:new Date().toISOString()};
  }
  save(input={},actor='painel'){
    const rows=this.read(); const idx=rows.findIndex(x=>String(x.id)===String(input.id||'')); const current=idx>=0?rows[idx]:{}; const item=this.sanitize(input,current);
    const duplicate=rows.find(x=>String(x.id)!==String(item.id)&&text(x.name).toLowerCase()===item.name.toLowerCase()); if(duplicate) throw new Error('Já existe uma transportadora / método com este nome.');
    if(item.document){ const sameDocument=rows.find(x=>String(x.id)!==String(item.id)&&digits(x.document)===item.document); if(sameDocument) throw new Error(`Este CNPJ/CPF já está cadastrado em ${sameDocument.name}.`); }
    item.updatedBy=actor; if(!item.createdAt)item.createdAt=new Date().toISOString(); if(idx>=0)rows[idx]=item;else rows.push(item); this.write(rows); return item;
  }
  remove(id){ const rows=this.read(); const next=rows.filter(x=>String(x.id)!==String(id)); if(next.length===rows.length)throw new Error('Cadastro não encontrado.'); this.write(next); return true; }
}
