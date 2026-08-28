import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function text(value=''){ return String(value ?? '').trim(); }
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function nowIso(){ return new Date().toISOString(); }
function hashCode(code='',salt=''){ return crypto.createHash('sha256').update(`${text(code)}|${text(salt)}`).digest('hex'); }

export default class DiscountApprovalService {
  constructor({ dataDir }={}){
    this.dataDir=path.resolve(dataDir);
    this.file=path.join(this.dataDir,'discount-approval-tokens.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.file)) this.write({version:'1.0',items:[]});
  }
  read(){
    try{
      const data=JSON.parse(fs.readFileSync(this.file,'utf8'));
      return {version:data?.version||'1.0',items:Array.isArray(data?.items)?data.items:[]};
    }catch(_){ return {version:'1.0',items:[]}; }
  }
  write(data){
    fs.mkdirSync(path.dirname(this.file),{recursive:true});
    const temp=`${this.file}.tmp`;
    fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');
    fs.renameSync(temp,this.file);
  }
  cleanup(data=this.read()){
    const cutoff=Date.now()-(24*60*60*1000);
    data.items=(data.items||[]).filter(item=>{
      const expires=Date.parse(item.expiresAt||'');
      const used=Date.parse(item.usedAt||'');
      return (Number.isFinite(expires)&&expires>Date.now()) || (Number.isFinite(used)&&used>cutoff);
    });
    return data;
  }
  issue({ issuer, ttlMinutes=5, cashboxId='' }={}){
    if(!issuer?.id) throw new Error('Usuário supervisor não identificado.');
    const ttl=Math.min(30,Math.max(1,Math.round(Number(ttlMinutes)||5)));
    const code=String(crypto.randomInt(100000,1000000));
    const salt=crypto.randomBytes(12).toString('hex');
    const issuedAt=new Date();
    const token={
      id:`DAP-${crypto.randomUUID()}`,
      codeHash:hashCode(code,salt),salt,
      issuerId:String(issuer.id),issuerName:text(issuer.displayName||issuer.name||issuer.username),
      cashboxId:text(cashboxId),issuedAt:issuedAt.toISOString(),expiresAt:new Date(issuedAt.getTime()+ttl*60000).toISOString(),
      usedAt:null,usedById:null,usedByName:null,operationId:null,requestedPercent:null
    };
    const data=this.cleanup(); data.items.push(token); this.write(data);
    return {id:token.id,code,issuerName:token.issuerName,issuedAt:token.issuedAt,expiresAt:token.expiresAt,ttlMinutes:ttl};
  }
  verifyAndConsume(code='',context={}){
    const clean=text(code).replace(/\D/g,'');
    if(!/^\d{6}$/.test(clean)) throw new Error('Informe uma chave de autorização válida com 6 dígitos.');
    const data=this.cleanup();
    const now=Date.now();
    let token=null;
    for(const item of data.items||[]){
      if(item.usedAt) continue;
      const expires=Date.parse(item.expiresAt||'');
      if(!Number.isFinite(expires)||expires<now) continue;
      if(item.cashboxId && context.cashboxId && String(item.cashboxId)!==String(context.cashboxId)) continue;
      if(hashCode(clean,item.salt)===item.codeHash){ token=item; break; }
    }
    if(!token) throw new Error('Chave inválida, já utilizada ou expirada. Gere uma nova autorização.');
    token.usedAt=nowIso();
    token.usedById=text(context.user?.id);
    token.usedByName=text(context.user?.displayName||context.user?.name||context.user?.username);
    token.operationId=text(context.operationId);
    token.requestedPercent=Number(context.requestedPercent||0);
    this.write(data);
    return clone({id:token.id,issuerId:token.issuerId,issuerName:token.issuerName,issuedAt:token.issuedAt,expiresAt:token.expiresAt,usedAt:token.usedAt,usedById:token.usedById,usedByName:token.usedByName,requestedPercent:token.requestedPercent});
  }
}
