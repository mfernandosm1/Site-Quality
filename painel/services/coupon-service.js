import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone=v=>JSON.parse(JSON.stringify(v));
const clean=v=>String(v??'').trim();
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const now=()=>new Date().toISOString();

export default class CouponService {
  constructor({dataDir}={}){
    if(!dataDir) throw new Error('CouponService: dataDir não informado.');
    this.dataDir=path.resolve(dataDir);this.file=path.join(this.dataDir,'coupons.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.file)) this.write({version:'0.23.5',items:[]});
  }
  read(){try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(_){return {version:'0.23.5',items:[]};}}
  write(data){const temp=`${this.file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,this.file);}
  list({includeInactive=true}={}){const items=this.read().items||[];return clone(items.filter(i=>includeInactive||i.active!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name),'pt-BR')));}
  get(id){return clone((this.read().items||[]).find(i=>String(i.id)===String(id))||null);}
  findByCode(code){const key=clean(code).toUpperCase();return clone((this.read().items||[]).find(i=>clean(i.code).toUpperCase()===key)||null);}
  save(payload={},actor='painel'){
    const data=this.read();let item=payload.id?(data.items||[]).find(i=>String(i.id)===String(payload.id)):null;
    const code=clean(payload.code).toUpperCase().replace(/\s+/g,'');if(!code)throw new Error('Informe o código do cupom.');
    if((data.items||[]).some(i=>String(i.id)!==String(payload.id||'')&&clean(i.code).toUpperCase()===code))throw new Error('Já existe um cupom com este código.');
    const type=payload.type==='percent'?'percent':'fixed';const value=Math.max(0,num(payload.value));if(value<=0)throw new Error('Informe um valor de desconto maior que zero.');if(type==='percent'&&value>100)throw new Error('O percentual não pode ultrapassar 100%.');
    const stamp=now();
    if(!item){item={id:`CPN-${crypto.randomUUID()}`,createdAt:stamp,createdBy:actor,uses:0};data.items.push(item);}
    Object.assign(item,{code,name:clean(payload.name)||code,description:clean(payload.description),type,value,minimumTotal:Math.max(0,num(payload.minimumTotal)),maximumDiscount:Math.max(0,num(payload.maximumDiscount)),startsAt:clean(payload.startsAt),endsAt:clean(payload.endsAt),maxUses:Math.max(0,Math.round(num(payload.maxUses))),active:payload.active!==false&&String(payload.active)!=='false',updatedAt:stamp,updatedBy:actor});
    this.write(data);return clone(item);
  }
  validate(code,subtotal,{customerId=''}={}){
    const item=this.findByCode(code);if(!item)throw new Error('Cupom não encontrado.');if(item.active===false)throw new Error('Este cupom está inativo.');
    const today=new Date();if(item.startsAt&&today<new Date(`${item.startsAt}T00:00:00`))throw new Error('Este cupom ainda não está válido.');if(item.endsAt&&today>new Date(`${item.endsAt}T23:59:59`))throw new Error('Este cupom está vencido.');if(item.maxUses>0&&Number(item.uses||0)>=item.maxUses)throw new Error('Este cupom atingiu o limite de utilizações.');
    const base=Math.max(0,num(subtotal));if(base<Number(item.minimumTotal||0))throw new Error(`Compra mínima para este cupom: ${Number(item.minimumTotal||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
    let discount=item.type==='percent'?base*(Number(item.value||0)/100):Number(item.value||0);if(Number(item.maximumDiscount||0)>0)discount=Math.min(discount,Number(item.maximumDiscount));discount=Math.min(base,Math.round(discount*100)/100);
    if(discount<=0)throw new Error('Este cupom não gera desconto para a operação atual.');
    return {id:item.id,code:item.code,name:item.name,type:item.type,value:item.value,discount,minimumTotal:item.minimumTotal||0,maximumDiscount:item.maximumDiscount||0,customerId:clean(customerId),appliedAt:now()};
  }
  markUsed(couponId,operationId,actor='painel'){
    if(!couponId)return null;const data=this.read();const item=(data.items||[]).find(i=>String(i.id)===String(couponId));if(!item)return null;
    item.usageLog=Array.isArray(item.usageLog)?item.usageLog:[];if(item.usageLog.some(x=>String(x.operationId)===String(operationId)))return clone(item);
    item.uses=Number(item.uses||0)+1;item.usageLog.push({operationId,at:now(),actor});item.updatedAt=now();this.write(data);return clone(item);
  }
}
