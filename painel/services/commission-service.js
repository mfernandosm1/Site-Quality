import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { businessDate, addBusinessDays, businessMonthEnd } from '../utils/date-time.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const text=value=>String(value ?? '').trim();
const norm=value=>text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0;};
const money=value=>Math.round((num(value)+Number.EPSILON)*100)/100;
const now=()=>new Date().toISOString();
const bool=(value,fallback=false)=>{
  if(value===undefined||value===null||value==='')return fallback;
  if(typeof value==='boolean')return value;
  return ['1','true','on','yes','sim'].includes(norm(value));
};
const dateOnly=value=>businessDate(value);
const inRange=(date,from,to)=>date&&date>=from&&date<=to;

function mondayOf(value){
  const raw=/^\d{4}-\d{2}-\d{2}$/.test(text(value))?text(value):businessDate();
  const [year,month,day]=raw.split('-').map(Number);
  const weekday=new Date(Date.UTC(year,month-1,day,12)).getUTCDay();
  const delta=weekday===0?-6:1-weekday;
  return addBusinessDays(raw,delta);
}
function addDays(value,days){return addBusinessDays(value,days);}
function lastDayOfMonth(month){return businessMonthEnd(`${month}-01`);}

export default class CommissionService {
  constructor({dataDir,contentDir,commerceService,receivablesService,payablesService,financeService,userService}={}){
    this.dataDir=path.resolve(dataDir||'.');
    this.contentDir=path.resolve(contentDir||'.');
    this.commerceService=commerceService;
    this.receivablesService=receivablesService;
    this.payablesService=payablesService;
    this.financeService=financeService;
    this.userService=userService;
    fs.mkdirSync(this.dataDir,{recursive:true});
    this.ensure('rules.json',{version:'1.0',items:[]});
    this.ensure('goals.json',{version:'1.0',items:[]});
    this.ensure('settlements.json',{version:'1.0',items:[]});
  }

  file(name){return path.join(this.dataDir,name);}
  ensure(name,fallback){if(!fs.existsSync(this.file(name)))this.write(name,fallback);}
  read(name,fallback={version:'1.0',items:[]}){try{return JSON.parse(fs.readFileSync(this.file(name),'utf8'));}catch(_){return clone(fallback);}}
  write(name,data){const target=this.file(name),tmp=`${target}.tmp`;fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8');fs.renameSync(tmp,target);}
  actor(value){return text(value)||'painel';}
  id(prefix){return `${prefix}-${crypto.randomUUID()}`;}

  sellerUsers({includeInactive=false}={}){
    return (this.userService?.list?.({includeInactive:true})||[])
      .filter(user=>user.seller===true && (includeInactive||user.active!==false))
      .sort((a,b)=>text(a.name).localeCompare(text(b.name),'pt-BR'));
  }

  normalizePeriodicity(value='monthly'){return text(value)==='weekly'?'weekly':'monthly';}
  normalizePeriodKey(periodicity,key=''){
    const mode=this.normalizePeriodicity(periodicity);
    const raw=text(key);
    if(mode==='monthly'){
      if(/^\d{4}-\d{2}$/.test(raw))return raw;
      if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw.slice(0,7);
      return businessDate().slice(0,7);
    }
    return mondayOf(raw||businessDate());
  }
  periodBounds(periodicity,key=''){
    const mode=this.normalizePeriodicity(periodicity),periodKey=this.normalizePeriodKey(mode,key);
    if(mode==='monthly')return {periodicity:mode,periodKey,from:`${periodKey}-01`,to:lastDayOfMonth(periodKey)};
    return {periodicity:mode,periodKey,from:periodKey,to:addDays(periodKey,6)};
  }
  periodLabel(periodicity,key=''){
    const p=this.periodBounds(periodicity,key);
    if(p.periodicity==='monthly'){const [y,m]=p.periodKey.split('-');return `${m}/${y}`;}
    return `${p.from.split('-').reverse().join('/')} a ${p.to.split('-').reverse().join('/')}`;
  }

  defaultRule(userId=''){
    return {id:'',userId:text(userId),active:false,periodicity:'monthly',basis:'sale',scope:'own_sales',storeId:'STORE-MAIN',includeSales:true,includeServiceOrders:true,tiers:[{id:'default',minValue:0,remunerationType:'percent',value:0}],categoryRules:[],updatedAt:null,updatedBy:''};
  }
  normalizeTiers(rows=[]){
    const result=(Array.isArray(rows)?rows:[]).map((row,index)=>({
      id:text(row.id)||this.id('TIER'),
      minValue:Math.max(0,money(row.minValue)),
      remunerationType:text(row.remunerationType)==='fixed'?'fixed':'percent',
      value:Math.max(0,money(row.value)),
      order:index
    })).sort((a,b)=>a.minValue-b.minValue||a.order-b.order);
    return result.length?result:[{id:this.id('TIER'),minValue:0,remunerationType:'percent',value:0,order:0}];
  }
  normalizeCategoryRules(rows=[]){
    const seen=new Set(),result=[];
    for(const row of Array.isArray(rows)?rows:[]){
      const categoryId=text(row.categoryId);if(!categoryId||seen.has(categoryId))continue;seen.add(categoryId);
      result.push({categoryId,percent:Math.max(0,money(row.percent)),active:bool(row.active,true)});
    }
    return result;
  }
  listRules(){return this.read('rules.json').items||[];}
  getRule(userId=''){
    const found=this.listRules().find(row=>text(row.userId)===text(userId));
    return found?clone(found):this.defaultRule(userId);
  }
  saveRule(userId,payload={},actor='painel'){
    const user=this.sellerUsers({includeInactive:true}).find(row=>text(row.id)===text(userId));
    if(!user)throw new Error('Vendedor/usuário não encontrado. Marque o usuário como Vendedor antes de configurar comissão.');
    const db=this.read('rules.json');db.items=db.items||[];
    const index=db.items.findIndex(row=>text(row.userId)===text(userId));
    const current=index>=0?db.items[index]:this.defaultRule(userId);
    const rule={...current,
      id:current.id||this.id('CRL'),userId:text(userId),active:bool(payload.active,current.active===true),
      periodicity:this.normalizePeriodicity(payload.periodicity||current.periodicity),
      basis:text(payload.basis)==='received'?'received':'sale',
      scope:['own_sales','store_sales','own_sales_if_store_goal'].includes(text(payload.scope))?text(payload.scope):'own_sales',
      storeId:text(payload.storeId)||text(current.storeId)||'STORE-MAIN',
      includeSales:bool(payload.includeSales,current.includeSales!==false),
      includeServiceOrders:bool(payload.includeServiceOrders,current.includeServiceOrders!==false),
      tiers:this.normalizeTiers(payload.tiers),categoryRules:this.normalizeCategoryRules(payload.categoryRules),
      updatedAt:now(),updatedBy:this.actor(actor)
    };
    if(!rule.includeSales&&!rule.includeServiceOrders)throw new Error('A regra precisa considerar Venda, O.S. ou ambos.');
    if(index>=0)db.items[index]=rule;else db.items.push(rule);this.write('rules.json',db);return clone(rule);
  }

  goalKey({kind,userId='',periodicity,periodKey,storeId}){return [kind,text(userId),this.normalizePeriodicity(periodicity),this.normalizePeriodKey(periodicity,periodKey),text(storeId)||'STORE-MAIN'].join('|');}
  listGoals(){return this.read('goals.json').items||[];}
  goalsFor({periodicity='monthly',periodKey='',storeId='STORE-MAIN'}={}){
    const p=this.periodBounds(periodicity,periodKey),store=text(storeId)||'STORE-MAIN';
    const rows=this.listGoals().filter(row=>row.periodicity===p.periodicity&&row.periodKey===p.periodKey&&text(row.storeId)===store);
    const storeGoal=rows.find(row=>row.kind==='store')||{id:'',kind:'store',storeId:store,periodicity:p.periodicity,periodKey:p.periodKey,target:0,basis:'sale'};
    const userGoals={};rows.filter(row=>row.kind==='user'&&row.userId).forEach(row=>{userGoals[row.userId]=row;});
    return {period:p,storeGoal:clone(storeGoal),userGoals:clone(userGoals)};
  }
  saveGoals(payload={},actor='painel'){
    const periodicity=this.normalizePeriodicity(payload.periodicity),periodKey=this.normalizePeriodKey(periodicity,payload.periodKey),storeId=text(payload.storeId)||'STORE-MAIN';
    const db=this.read('goals.json');db.items=db.items||[];const stamp=now(),byKey=new Map(db.items.map((row,index)=>[this.goalKey(row),{row,index}]));
    const upsert=row=>{
      const key=this.goalKey(row),existing=byKey.get(key);const item={...(existing?.row||{}),...row,id:existing?.row?.id||this.id('GOAL'),updatedAt:stamp,updatedBy:this.actor(actor)};
      if(!existing){item.createdAt=stamp;item.createdBy=this.actor(actor);db.items.push(item);byKey.set(key,{row:item,index:db.items.length-1});}else db.items[existing.index]=item;
      return item;
    };
    const storeGoal=upsert({kind:'store',userId:'',periodicity,periodKey,storeId,target:Math.max(0,money(payload.storeTarget)),basis:text(payload.storeBasis)==='received'?'received':'sale'});
    const savedUsers=[];
    for(const row of Array.isArray(payload.userGoals)?payload.userGoals:[]){
      const userId=text(row.userId);if(!userId)continue;
      savedUsers.push(upsert({kind:'user',userId,periodicity,periodKey,storeId,target:Math.max(0,money(row.target)),basis:'rule'}));
    }
    this.write('goals.json',db);return {period:this.periodBounds(periodicity,periodKey),storeGoal,userGoals:savedUsers};
  }

  productMeta(){
    let products=[];try{const raw=JSON.parse(fs.readFileSync(path.join(this.contentDir,'products.json'),'utf8'));products=Array.isArray(raw)?raw:(raw.items||[]);}catch(_){}
    const byProduct=new Map(),byInventory=new Map();
    for(const product of products){
      const categoryId=text(product?.erp?.categoryId)||text(product?.erp?.category)||text(product?.categoryId)||text(product?.category);
      const categoryName=text(product?.erp?.categoryName)||text(product?.categoryName)||text(product?.category)||'';
      const base={productId:text(product.id),categoryId,categoryName};if(base.productId)byProduct.set(base.productId,base);
      const combos=Array.isArray(product?.variations?.combinations)?product.variations.combinations:[];
      if(combos.length){for(const combo of combos){const inventoryItemId=text(combo.inventoryItemId);if(inventoryItemId)byInventory.set(inventoryItemId,base);}}
      const inventoryItemId=text(product?.inventory?.itemId);if(inventoryItemId)byInventory.set(inventoryItemId,base);
    }
    return {byProduct,byInventory};
  }

  operationDate(operation){return dateOnly(operation?.dates?.finalizedAt||operation?.snapshot?.createdAt||operation?.updatedAt||operation?.createdAt);}
  operationItemRows(operation,meta=this.productMeta()){
    const items=Array.isArray(operation?.snapshot?.items)&&operation.snapshot.items.length?operation.snapshot.items:(operation?.items||[]);
    const subtotal=items.reduce((sum,item)=>sum+(num(item.quantity)||1)*num(item.unitPrice),0);
    const itemDiscountTotal=items.reduce((sum,item)=>sum+Math.max(0,num(item.discount)),0);
    const couponDiscount=Math.max(0,num(operation?.snapshot?.totals?.couponDiscount ?? operation?.couponDiscount ?? operation?.coupon?.discount));
    const distributable=Math.max(0,subtotal-itemDiscountTotal);
    return items.map((item,index)=>{
      const quantity=Math.max(.001,num(item.quantity)||1),gross=money(quantity*num(item.unitPrice)),itemDiscount=Math.min(gross,Math.max(0,money(item.discount))),after=Math.max(0,gross-itemDiscount);
      const couponShare=money(distributable>0?couponDiscount*(after/distributable):(index===0?couponDiscount:0)),base=money(Math.max(0,gross-itemDiscount-couponShare));
      const sellerId=text(item.sellerId)||text(operation?.snapshot?.seller?.id)||text(operation?.sellerId),sellerName=text(item.sellerNameSnapshot)||text(operation?.snapshot?.seller?.name)||text(operation?.sellerNameSnapshot)||'Sem vendedor';
      const productId=text(item.productId),inventoryItemId=text(item.inventoryItemId),productMeta=meta.byInventory.get(inventoryItemId)||meta.byProduct.get(productId)||{};
      return {operationId:operation.id,operationNumber:operation.number,operationType:operation.type,operationDate:this.operationDate(operation),customer:text(operation?.snapshot?.customer?.name)||text(operation.customerNameSnapshot)||'Consumidor final',itemId:text(item.id),productId,inventoryItemId,code:text(item.code)||text(item.sku),product:text(item.name)||'Item',quantity,gross,discount:money(itemDiscount+couponShare),base,sellerId,sellerName,categoryId:text(productMeta.categoryId),categoryName:text(productMeta.categoryName)};
    });
  }

  finalizedOperations(rule={}){
    return (this.commerceService?.listOperations?.({status:'finalized'})||[]).filter(op=>{
      if(op.type==='sale'&&rule.includeSales===false)return false;
      if(op.type==='service_order'&&rule.includeServiceOrders===false)return false;
      return ['sale','service_order'].includes(op.type);
    });
  }

  activeReceivables(){return this.receivablesService?.list?.({})||[];}
  activeReceipts(){
    try{return (this.receivablesService?.read?.('receipts.json')?.items||[]).filter(row=>row.status!=='reversed'&&row.reversalStatus!=='reversed');}catch(_){return [];}
  }

  eventsForRule(rule={},basis='sale'){
    const meta=this.productMeta(),operations=this.finalizedOperations(rule),events=[];
    if(basis!=='received'){
      for(const op of operations){for(const row of this.operationItemRows(op,meta))events.push({...row,eventDate:row.operationDate,source:'sale',sourceId:op.id,base:row.base});}
      return events;
    }
    const receivables=this.activeReceivables().filter(row=>!['cancelled','reversed'].includes(text(row.status).toLowerCase()));
    const receipts=this.activeReceipts(),receivablesByOperation=new Map(),receivableById=new Map(receivables.map(row=>[text(row.id),row]));
    for(const title of receivables){const key=text(title.originId);if(!key)continue;const list=receivablesByOperation.get(key)||[];list.push(title);receivablesByOperation.set(key,list);}
    const receiptsByOperation=new Map();
    for(const receipt of receipts){const title=receivableById.get(text(receipt.receivableId));const operationId=text(receipt.operationId)||text(title?.originId);if(!operationId)continue;const list=receiptsByOperation.get(operationId)||[];list.push(receipt);receiptsByOperation.set(operationId,list);}
    for(const op of operations){
      const rows=this.operationItemRows(op,meta),total=Math.max(.01,money(op?.snapshot?.totals?.total ?? op.total ?? rows.reduce((s,r)=>s+r.base,0)));
      const titles=receivablesByOperation.get(text(op.id))||[],receivableTotal=Math.min(total,money(titles.reduce((s,row)=>s+num(row.netValue),0))),immediate=Math.max(0,money(total-receivableTotal));
      if(immediate>0){const ratio=immediate/total;for(const row of rows){const base=money(row.base*ratio);if(base>0)events.push({...row,eventDate:row.operationDate,source:'sale_received',sourceId:op.id,base});}}
      for(const receipt of receiptsByOperation.get(text(op.id))||[]){
        const principal=Math.max(0,money(receipt.principalValue ?? receipt.value));if(principal<=0)continue;const ratio=Math.min(1,principal/total),eventDate=dateOnly(receipt.receivedAt||receipt.receivedDateTime||receipt.createdAt);
        for(const row of rows){const base=money(row.base*ratio);if(base>0)events.push({...row,eventDate,source:'receipt',sourceId:receipt.id,receiptNumber:text(receipt.receiptNumber),receivedValue:principal,base});}
      }
    }
    return events;
  }

  belongsToUser(row,user){
    if(text(row.sellerId))return text(row.sellerId)===text(user.id);
    const seller=norm(row.sellerName),aliases=[user.displayName,user.name,user.username].map(norm).filter(Boolean);return !!seller&&aliases.includes(seller);
  }
  currentTier(tiers=[],metric=0){return [...tiers].filter(row=>num(row.minValue)<=num(metric)+.0001).sort((a,b)=>num(b.minValue)-num(a.minValue))[0]||null;}
  nextTier(tiers=[],metric=0){return [...tiers].filter(row=>num(row.minValue)>num(metric)+.0001).sort((a,b)=>num(a.minValue)-num(b.minValue))[0]||null;}

  performanceFor({rule,basis,period,user=null,ownOnly=false}={}){
    const events=this.eventsForRule(rule,basis).filter(row=>inRange(row.eventDate,period.from,period.to));
    const rows=ownOnly&&user?events.filter(row=>this.belongsToUser(row,user)):events;
    return {events:rows,total:money(rows.reduce((sum,row)=>sum+num(row.base),0)),operations:new Set(rows.map(row=>row.operationId)).size,items:money(rows.reduce((sum,row)=>sum+num(row.quantity),0))};
  }

  calculation({userId,periodicity='',periodKey='',storeId='STORE-MAIN',ignoreSettlement=false}={}){
    const user=this.sellerUsers({includeInactive:true}).find(row=>text(row.id)===text(userId));if(!user)throw new Error('Vendedor não encontrado.');
    const rule=this.getRule(user.id),mode=this.normalizePeriodicity(periodicity||rule.periodicity),period=this.periodBounds(mode,periodKey),store=text(storeId)||text(rule.storeId)||'STORE-MAIN';
    const existing=this.findSettlement({userId:user.id,periodicity:mode,periodKey:period.periodKey,storeId:store});
    if(existing&&!ignoreSettlement)return {...clone(existing.snapshot),settlement:{id:existing.id,status:existing.status,financePayableId:existing.financePayableId||'',financePayableNumber:existing.financePayableNumber||'',closedAt:existing.closedAt,closedBy:existing.closedBy}};
    const goals=this.goalsFor({periodicity:mode,periodKey:period.periodKey,storeId:store}),storeBasis=goals.storeGoal?.basis==='received'?'received':'sale';
    const storePerf=this.performanceFor({rule:{includeSales:true,includeServiceOrders:true},basis:storeBasis,period});
    const storeTarget=Math.max(0,num(goals.storeGoal?.target)),storeReached=storeTarget>0&&storePerf.total+0.009>=storeTarget;
    const ownPerf=this.performanceFor({rule,basis:rule.basis,period,user,ownOnly:true});
    const allPerf=this.performanceFor({rule,basis:rule.basis,period,user,ownOnly:false});
    const eligible=rule.scope==='store_sales'?allPerf:ownPerf,metric=eligible.total,tiers=this.normalizeTiers(rule.tiers),tier=this.currentTier(tiers,metric),next=this.nextTier(tiers,metric),userGoal=goals.userGoals?.[user.id],userGoalTarget=Math.max(0,num(userGoal?.target));
    let allowed=rule.active===true;
    let blockedReason='';
    if(!rule.active){allowed=false;blockedReason='Regra de comissão inativa';}
    if(rule.scope==='own_sales_if_store_goal'){
      if(storeTarget<=0){allowed=false;blockedReason='Meta da loja não configurada';}
      else if(!storeReached){allowed=false;blockedReason='Meta da loja ainda não atingida';}
    }
    const categoryMap=new Map((rule.categoryRules||[]).filter(row=>row.active!==false&&num(row.percent)>=0).map(row=>[text(row.categoryId),num(row.percent)]));
    const details=eligible.events.map(row=>({...row,commissionRate:0,commission:0,categoryOverride:false}));
    let commission=0;
    if(allowed&&tier){
      if(tier.remunerationType==='fixed'){
        commission=Math.max(0,money(tier.value));const totalBase=Math.max(.01,eligible.total);
        let allocated=0;
        details.forEach((row,index)=>{const value=index===details.length-1?money(commission-allocated):money(commission*(row.base/totalBase));row.commission=value;row.commissionRate=null;allocated=money(allocated+value);});
      }else{
        const groups=new Map();
        for(const row of details){
          const useCategory=rule.scope!=='store_sales'&&row.categoryId&&categoryMap.has(row.categoryId),rate=useCategory?categoryMap.get(row.categoryId):num(tier.value);
          row.commissionRate=rate;row.categoryOverride=useCategory;row.commission=money(row.base*rate/100);
          const key=String(rate),group=groups.get(key)||{rate,rows:[],base:0};group.rows.push(row);group.base=money(group.base+row.base);groups.set(key,group);
        }
        for(const group of groups.values()){
          const expected=money(group.base*group.rate/100),calculated=money(group.rows.reduce((sum,row)=>sum+row.commission,0)),delta=money(expected-calculated);
          if(Math.abs(delta)>=.009&&group.rows.length)group.rows[group.rows.length-1].commission=money(group.rows[group.rows.length-1].commission+delta);
          commission=money(commission+expected);
        }
      }
    }
    const nextTarget=next?num(next.minValue):null;
    const result={
      user:{id:user.id,name:user.displayName||user.name,fullName:user.name,username:user.username||'',active:user.active!==false},rule:clone(rule),period:{...period,label:this.periodLabel(mode,period.periodKey)},storeId:store,
      storeGoal:{target:money(storeTarget),basis:storeBasis,achieved:storePerf.total,percent:storeTarget?money((storePerf.total/storeTarget)*100):0,remaining:money(Math.max(0,storeTarget-storePerf.total)),reached:storeReached},
      userGoal:{target:money(userGoalTarget),achieved:ownPerf.total,percent:userGoalTarget?money((ownPerf.total/userGoalTarget)*100):0,remaining:money(Math.max(0,userGoalTarget-ownPerf.total)),reached:userGoalTarget>0&&ownPerf.total+0.009>=userGoalTarget},
      totals:{ownSales:ownPerf.total,storeSales:allPerf.total,eligibleBase:eligible.total,operations:eligible.operations,items:eligible.items,commission:money(commission)},
      tier:tier?clone(tier):null,nextTier:next?clone(next):null,differenceToNext:nextTarget===null?0:money(Math.max(0,nextTarget-metric)),allowed,blockedReason,details,
      settlement:null
    };
    return result;
  }

  summary({periodicity='monthly',periodKey='',storeId='STORE-MAIN'}={}){
    const mode=this.normalizePeriodicity(periodicity),period=this.periodBounds(mode,periodKey),users=this.sellerUsers({includeInactive:false}),rows=[];
    for(const user of users){
      const rule=this.getRule(user.id);if(rule.periodicity!==mode)continue;
      const calc=this.calculation({userId:user.id,periodicity:mode,periodKey:period.periodKey,storeId});
      const {details,...compact}=calc; rows.push(compact);
    }
    const goals=this.goalsFor({periodicity:mode,periodKey:period.periodKey,storeId}),storeGoal=goals.storeGoal||{};
    const storePerf=this.performanceFor({rule:{includeSales:true,includeServiceOrders:true},basis:storeGoal.basis==='received'?'received':'sale',period});
    const totalCommission=money(rows.reduce((s,row)=>s+num(row.totals?.commission),0));
    return {period:{...period,label:this.periodLabel(mode,period.periodKey)},storeId:text(storeId)||'STORE-MAIN',storeGoal:{...storeGoal,target:money(storeGoal.target),achieved:storePerf.total,remaining:money(Math.max(0,num(storeGoal.target)-storePerf.total)),percent:num(storeGoal.target)?money(storePerf.total/num(storeGoal.target)*100):0,reached:num(storeGoal.target)>0&&storePerf.total+0.009>=num(storeGoal.target)},rows,totals:{sellers:rows.length,commission:totalCommission,closed:rows.filter(row=>row.settlement).length,posted:rows.filter(row=>row.settlement?.status==='posted').length}};
  }

  settlementKey({userId,periodicity,periodKey,storeId}){return [text(userId),this.normalizePeriodicity(periodicity),this.normalizePeriodKey(periodicity,periodKey),text(storeId)||'STORE-MAIN'].join('|');}
  settlements(){return this.read('settlements.json').items||[];}
  findSettlement(query={}){const key=this.settlementKey(query);return this.settlements().find(row=>row.key===key)||null;}
  closeSettlement(payload={},actor='painel'){
    const userId=text(payload.userId),periodicity=this.normalizePeriodicity(payload.periodicity),periodKey=this.normalizePeriodKey(periodicity,payload.periodKey),storeId=text(payload.storeId)||'STORE-MAIN',key=this.settlementKey({userId,periodicity,periodKey,storeId});
    const db=this.read('settlements.json');db.items=db.items||[];const existing=db.items.find(row=>row.key===key);if(existing)return clone(existing);
    const calculation=this.calculation({userId,periodicity,periodKey,storeId,ignoreSettlement:true});
    if(calculation.rule?.active!==true)throw new Error('Ative e configure a regra de comissão antes de fechar a apuração.');
    const settlement={id:this.id('COM'),key,userId,periodicity,periodKey,storeId,status:'closed',snapshot:clone(calculation),amount:money(calculation.totals?.commission),closedAt:now(),closedBy:this.actor(actor),financePayableId:'',financePayableNumber:'',createdAt:now(),createdBy:this.actor(actor)};
    db.items.unshift(settlement);this.write('settlements.json',db);return clone(settlement);
  }
  reopenSettlement(id,actor='painel'){
    const db=this.read('settlements.json');db.items=db.items||[];const index=db.items.findIndex(row=>row.id===id);if(index<0)throw new Error('Apuração não encontrada.');const item=db.items[index];
    if(item.financePayableId)throw new Error('Esta comissão já foi lançada no Financeiro e não pode ser reaberta por aqui.');
    db.items.splice(index,1);this.write('settlements.json',db);return {id,removed:true,updatedBy:this.actor(actor)};
  }

  commissionAccount(){
    const accounts=this.financeService?.listCatalog?.('accounts',{includeInactive:false})||[];
    return accounts.find(row=>row.active!==false&&norm(row.name).includes('comiss'))||accounts.find(row=>text(row.id)==='ACC-40-02')||null;
  }
  postToFinance(id,payload={},actor='painel'){
    const db=this.read('settlements.json');db.items=db.items||[];const index=db.items.findIndex(row=>row.id===id);if(index<0)throw new Error('Apuração não encontrada.');const settlement=db.items[index];
    if(settlement.financePayableId)return {settlement:clone(settlement),payable:this.payablesService?.get?.(settlement.financePayableId)||null,duplicated:true};
    const existingPayable=(this.payablesService?.list?.({view:'all'})||[]).find(row=>norm(row.origin)==='commission_settlement'&&text(row.originId)===text(settlement.id));
    if(existingPayable){
      settlement.status='posted';settlement.financePayableId=existingPayable.id;settlement.financePayableNumber=existingPayable.number||'';settlement.postedAt=settlement.postedAt||now();settlement.postedBy=settlement.postedBy||this.actor(actor);settlement.updatedAt=now();settlement.updatedBy=this.actor(actor);db.items[index]=settlement;this.write('settlements.json',db);
      return {settlement:clone(settlement),payable:clone(existingPayable),duplicated:true};
    }
    if(num(settlement.amount)<=0)throw new Error('A comissão desta apuração é zero. Não há despesa para lançar.');
    const user=this.sellerUsers({includeInactive:true}).find(row=>row.id===settlement.userId),account=this.commissionAccount();if(!account)throw new Error('Não encontrei uma conta ativa de “Comissões sobre vendas” no Plano de contas.');
    const dueDate=dateOnly(payload.dueDate);if(!dueDate)throw new Error('Informe o vencimento da comissão.');
    const paymentMethodId=text(payload.paymentMethodId);if(!paymentMethodId)throw new Error('Selecione a forma prevista de pagamento.');
    const period=this.periodBounds(settlement.periodicity,settlement.periodKey),description=`Comissão ${user?.name||settlement.snapshot?.user?.name||'Vendedor'} · ${this.periodLabel(settlement.periodicity,settlement.periodKey)}`;
    const payable=this.payablesService.create({
      description,supplierName:user?.name||settlement.snapshot?.user?.name||'Colaborador',entryType:'expense',origin:'commission_settlement',originId:settlement.id,
      issueDate:businessDate(),competenceDate:period.from,grossValue:settlement.amount,paymentMethodId,dueDate,firstDueDate:dueDate,accountId:account.id,costCenterId:account.costCenterId||account.categoryId||'',notes:`Apuração de comissão fechada em ${settlement.closedAt}. Regra e detalhamento preservados no módulo Metas e Comissões.`
    },this.actor(actor));
    settlement.status='posted';settlement.financePayableId=payable.id;settlement.financePayableNumber=payable.number||'';settlement.postedAt=now();settlement.postedBy=this.actor(actor);settlement.updatedAt=now();settlement.updatedBy=this.actor(actor);db.items[index]=settlement;this.write('settlements.json',db);
    return {settlement:clone(settlement),payable,duplicated:false};
  }

  config({periodicity='monthly',periodKey='',storeId='STORE-MAIN'}={}){
    const users=this.sellerUsers({includeInactive:false}),goals=this.goalsFor({periodicity,periodKey,storeId});
    return {users,rules:users.map(user=>this.getRule(user.id)),goals,settlements:this.settlements().filter(row=>row.periodicity===goals.period.periodicity&&row.periodKey===goals.period.periodKey&&row.storeId===text(storeId||'STORE-MAIN'))};
  }
}
