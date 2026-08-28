import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone=value=>JSON.parse(JSON.stringify(value));
const amount=value=>Math.round((Number(value)||0)*100)/100;
const clean=value=>String(value??'').trim();

export default class CustomerWalletService {
  constructor({ dataDir, customerService }) {
    if (!dataDir || !customerService) throw new Error('CustomerWalletService: configuração incompleta.');
    this.dataDir=path.resolve(dataDir); this.customerService=customerService; this.file=path.join(this.dataDir,'customer-wallet.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.file)) this.write({version:'0.24.0',items:[]});
  }
  read(){ try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(_){return {version:'0.24.0',items:[]};} }
  write(data){const temp=`${this.file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,this.file);}
  list(customerId=''){const items=this.read().items||[];return items.filter(i=>!customerId||i.customerId===customerId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  summary(customerId){const items=this.list(customerId).filter(item=>item.status!=='reversed');return {customerId,balance:amount(items.reduce((s,i)=>s+Number(i.signedAmount||0),0)),count:items.length,items};}
  findReference(customerId,{referenceType='',referenceId='',type='',direction=''}={}){
    const wantedType=clean(referenceType),wantedId=clean(referenceId),wantedEntryType=clean(type),wantedDirection=clean(direction);
    if(!wantedType||!wantedId)return null;
    return this.list(customerId).find(item=>item.status!=='reversed'&&clean(item.referenceType)===wantedType&&clean(item.referenceId)===wantedId&&(!wantedEntryType||clean(item.type)===wantedEntryType)&&(!wantedDirection||clean(item.direction)===wantedDirection))||null;
  }
  create(customerId,payload={},actor='painel'){
    const customer=this.customerService.getCustomer(customerId);if(!customer)throw new Error('Cliente não encontrado.');
    const value=amount(payload.value);if(value<=0)throw new Error('Informe um valor maior que zero.');
    const direction=payload.direction==='debit'?'debit':'credit';
    const referenceType=clean(payload.referenceType),referenceId=clean(payload.referenceId),entryType=clean(payload.type)||'credit';
    if(payload.idempotent!==false&&referenceType&&referenceId){
      const existing=this.findReference(customerId,{referenceType,referenceId,type:entryType,direction});
      if(existing)return clone(existing);
    }
    const sign=direction==='debit'?-1:1;const before=this.summary(customerId).balance;const after=amount(before+(value*sign));if(after<0)throw new Error('O saldo da carteira do cliente não pode ficar negativo.');
    const data=this.read();const item={id:`CWL-${crypto.randomUUID()}`,customerId,customerNameSnapshot:customer.name,type:entryType,direction,value,signedAmount:value*sign,reason:clean(payload.reason),expiresAt:clean(payload.expiresAt),referenceType,referenceId,balanceBefore:before,balanceAfter:after,createdAt:new Date().toISOString(),createdBy:actor,status:'posted'};data.items.push(item);data.version='0.24.0';this.write(data);return clone(item);
  }
}
