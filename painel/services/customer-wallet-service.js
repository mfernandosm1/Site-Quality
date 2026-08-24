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
    if(!fs.existsSync(this.file)) this.write({version:'0.23.2',items:[]});
  }
  read(){ try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(_){return {version:'0.23.2',items:[]};} }
  write(data){const temp=`${this.file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,this.file);}
  list(customerId=''){const items=this.read().items||[];return items.filter(i=>!customerId||i.customerId===customerId).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  summary(customerId){const items=this.list(customerId);return {customerId,balance:amount(items.reduce((s,i)=>s+Number(i.signedAmount||0),0)),count:items.length,items};}
  create(customerId,payload={},actor='painel'){const customer=this.customerService.getCustomer(customerId);if(!customer)throw new Error('Cliente não encontrado.');const value=amount(payload.value);if(value<=0)throw new Error('Informe um valor maior que zero.');const direction=payload.direction==='debit'?-1:1;const before=this.summary(customerId).balance;const after=amount(before+(value*direction));if(after<0)throw new Error('O saldo da carteira do cliente não pode ficar negativo.');const data=this.read();const item={id:`CWL-${crypto.randomUUID()}`,customerId,customerNameSnapshot:customer.name,type:clean(payload.type)||'credit',direction:direction>0?'credit':'debit',value,signedAmount:value*direction,reason:clean(payload.reason),expiresAt:clean(payload.expiresAt),referenceType:clean(payload.referenceType),referenceId:clean(payload.referenceId),balanceBefore:before,balanceAfter:after,createdAt:new Date().toISOString(),createdBy:actor,status:'posted'};data.items.push(item);this.write(data);return clone(item);}
}
