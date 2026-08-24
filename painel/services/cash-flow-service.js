import fs from 'fs';
import path from 'path';

const readJson=(file,fallback={items:[]})=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){return fallback;}};
const text=v=>String(v??'').trim();
const num=v=>Math.round((Number(v)||0)*100)/100;
const day=v=>text(v).slice(0,10);
const ts=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:0;};
const bool=v=>['1','true','on','yes','sim'].includes(text(v).toLowerCase());
const list=v=>Array.isArray(v)?v.map(text).filter(Boolean):text(v)?text(v).split(',').map(text).filter(Boolean):[];
const reversalKind=x=>{
  const marker=text(`${x?.origin||''} ${x?.raw?.type||''} ${x?.raw?.referenceType||''} ${x?.source||''}`).toLowerCase();
  if(!marker.includes('reversal')&&!marker.includes('estorno'))return '';
  if(marker.includes('payable')||marker.includes('payment_reversal'))return 'expense';
  if(marker.includes('receivable')||marker.includes('receipt_reversal'))return 'income';
  // Fallback seguro: um estorno que entra no caixa desfaz uma saída;
  // um estorno que sai do caixa desfaz uma entrada.
  return x?.direction==='entrada'?'expense':'income';
};
const isReversal=x=>Boolean(reversalKind(x));
const effectiveSignedValue=x=>isReversal(x)?0:num(x?.signedValue);
const netActualTotals=items=>{
  // Estorno permanece visível no histórico para auditoria, mas não compõe os
  // cards nem o saldo do Fluxo de Caixa. A movimentação originalmente paga
  // continua sendo a saída realizada do período; o estorno não vira entrada.
  let income=0,expense=0;
  for(const item of items){
    if(isReversal(item)) continue;
    const value=Math.abs(num(item?.value));
    if(item?.direction==='entrada')income+=value; else expense+=value;
  }
  return {income:num(income),expense:num(expense),balance:num(income-expense)};
};
const CASH_ADJUSTMENT_TYPES=new Set(['supply','withdrawal']);

export default class CashFlowService {
  constructor({panelDir,financeService,commerceService}){
    this.panelDir=panelDir; this.financeService=financeService; this.commerceService=commerceService;
    this.financeDir=path.join(panelDir,'data','erp','finance');
  }
  file(name){return path.join(this.financeDir,name);}
  catalogs(){return this.financeService.getFoundation().catalogs||{};}
  allActual(options={}){
    const includeCashAdjustments=bool(options.includeCashAdjustments);
    const catalogs=this.catalogs();
    const methodMap=new Map((catalogs.paymentMethods||[]).map(x=>[text(x.id),x]));
    const payables=new Map((readJson(this.file('payables.json')).items||[]).map(x=>[text(x.id),x]));
    const receivables=new Map((readJson(this.file('receivables.json')).items||[]).map(x=>[text(x.id),x]));
    const cash=(readJson(path.join(this.panelDir,'data','erp','commerce','cash-movements.json')).items||[])
      .filter(x=>x.status!=='void'&&x.status!=='reversed')
      .filter(x=>includeCashAdjustments||!CASH_ADJUSTMENT_TYPES.has(text(x.type).toLowerCase()))
      .map(x=>{const method=methodMap.get(text(x.methodId));const payable=payables.get(text(x.metadata?.payableId))||{};const receivable=receivables.get(text(x.metadata?.receivableId))||{};return {id:x.id,dateTime:x.createdAt,date:day(x.createdAt),direction:num(x.signedAmount)>=0?'entrada':'saida',value:Math.abs(num(x.signedAmount)),signedValue:num(x.signedAmount),status:'realizado',origin:x.referenceType||x.type||'caixa',originId:x.referenceId||'',party:x.metadata?.customerName||receivable.customerName||x.metadata?.supplierName||payable.supplierName||'',partyDocument:x.metadata?.customerDocument||receivable.customerDocument||x.metadata?.supplierDocument||payable.supplierDocument||'',reference:x.description||payable.description||receivable.description||x.referenceId||x.id,paymentMethodId:x.methodId||'',paymentMethodName:method?.name||x.methodName||x.methodId||'',costCenterId:x.metadata?.costCenterId||payable.costCenterId||receivable.costCenterId||'',accountId:x.metadata?.accountId||payable.accountId||receivable.accountId||'',notes:x.metadata?.notes||payable.notes||receivable.notes||'',source:'commerce',raw:{...x,parent:Object.keys(payable).length?payable:(Object.keys(receivable).length?receivable:undefined)}};});
    const cashKeys=new Set();
    for(const x of cash){ if(x.raw?.idempotencyKey)cashKeys.add(x.raw.idempotencyKey); if(x.originId)cashKeys.add(x.originId); }
    const finance=(readJson(this.file('movements.json')).items||[])
      .filter(x=>x.status!=='reversed')
      .filter(x=>!cashKeys.has(x.idempotencyKey)&&!cashKeys.has(x.payablePaymentId)&&!cashKeys.has(x.receiptId))
      .map(x=>{const payable=payables.get(text(x.payableId))||{};const receivable=receivables.get(text(x.receivableId))||{};const method=methodMap.get(text(x.paymentMethodId));return {id:x.id,dateTime:x.occurredAt||x.createdAt,date:day(x.movementDate||x.occurredAt||x.createdAt),direction:x.direction==='saida'?'saida':'entrada',value:Math.abs(num(x.value||x.signedValue)),signedValue:x.direction==='saida'?-Math.abs(num(x.value||x.signedValue)):Math.abs(num(x.value||x.signedValue)),status:'realizado',origin:x.source||'financeiro',originId:x.payableId||x.receivableId||x.entryId||'',party:x.supplierName||payable.supplierName||x.customerName||receivable.customerName||'',partyDocument:x.supplierDocument||payable.supplierDocument||x.customerDocument||receivable.customerDocument||'',reference:x.description||payable.description||receivable.description||x.id,paymentMethodId:x.paymentMethodId||'',paymentMethodName:x.paymentMethodName||method?.name||'',costCenterId:x.costCenterId||payable.costCenterId||receivable.costCenterId||'',accountId:x.accountId||payable.accountId||receivable.accountId||'',notes:x.notes||payable.notes||receivable.notes||'',source:'finance',raw:{...x,parent:Object.keys(payable).length?payable:(Object.keys(receivable).length?receivable:undefined)}};});
    return [...cash,...finance];
  }
  allForecast(){
    const payables=new Map((readJson(this.file('payables.json')).items||[]).map(x=>[x.id,x]));
    const outgoing=(readJson(this.file('payable-installments.json')).items||[]).filter(x=>!['paid','cancelled','reversed'].includes(x.status)&&num(x.openBalance)>0).map(x=>{const p=payables.get(x.payableId)||{};return {id:`forecast-${x.id}`,dateTime:`${x.dueDate}T12:00:00`,date:x.dueDate,direction:'saida',value:num(x.openBalance),signedValue:-num(x.openBalance),status:'previsto',origin:p.origin||'contas_a_pagar',originId:p.id||'',party:p.supplierName||'',reference:`${p.number||'Conta a pagar'} · Parcela ${x.number||1}/${x.total||1}`,paymentMethodId:x.paymentMethodId||p.paymentMethodId||'',paymentMethodName:'',costCenterId:p.costCenterId||'',accountId:p.accountId||'',notes:x.notes||p.notes||'',source:'payable',raw:{...x,parent:p}};});
    const receivables=new Map((readJson(this.file('receivables.json')).items||[]).map(x=>[x.id,x]));
    const incoming=(readJson(this.file('receivable-installments.json')).items||[]).filter(x=>!['paid','cancelled','reversed'].includes(x.status)&&num(x.openBalance)>0).map(x=>{const p=receivables.get(x.receivableId)||{};return {id:`forecast-${x.id}`,dateTime:`${x.dueDate}T12:00:00`,date:x.dueDate,direction:'entrada',value:num(x.openBalance),signedValue:num(x.openBalance),status:'previsto',origin:p.origin||'contas_a_receber',originId:p.id||'',party:p.customerName||'',reference:`${p.number||'Conta a receber'} · Parcela ${x.number||1}/${x.total||1}`,paymentMethodId:x.paymentMethodId||p.paymentMethodId||'',paymentMethodName:'',costCenterId:p.costCenterId||'',accountId:p.accountId||'',notes:x.notes||p.notes||'',source:'receivable',raw:{...x,parent:p}};});
    return [...outgoing,...incoming];
  }
  query(filters={}){
    const start=day(filters.start),end=day(filters.end); const mode=['realizado','previsto','ambos'].includes(filters.mode)?filters.mode:'realizado';
    const includeCashAdjustments=bool(filters.includeCashAdjustments);
    const paymentMethodIds=list(filters.paymentMethodId||filters.paymentMethodIds);
    const origins=list(filters.origin||filters.origins);
    const classifications=list(filters.classification||filters.classifications);
    const costCenterIds=[...list(filters.costCenterId),...classifications.filter(x=>x.startsWith('cost:')).map(x=>x.slice(5))];
    const accountIds=[...list(filters.accountId),...classifications.filter(x=>x.startsWith('account:')).map(x=>x.slice(8))];
    const actualOptions={includeCashAdjustments};
    const all=[...(mode!=='previsto'?this.allActual(actualOptions):[]),...(mode!=='realizado'?this.allForecast():[])];
    const filtered=all.filter(x=>(!start||x.date>=start)&&(!end||x.date<=end)&&(!paymentMethodIds.length||paymentMethodIds.includes(text(x.paymentMethodId)))&&(!origins.length||origins.includes(text(x.origin)))&&(!costCenterIds.length&&!accountIds.length||costCenterIds.includes(text(x.costCenterId))||accountIds.includes(text(x.accountId))));
    filtered.sort((a,b)=>ts(a.dateTime)-ts(b.dateTime)||String(a.id).localeCompare(String(b.id)));
    const opening=this.allActual(actualOptions).filter(x=>!start||x.date<start).reduce((s,x)=>s+effectiveSignedValue(x),0);
    let running=opening; filtered.forEach(x=>{running=num(running+effectiveSignedValue(x));x.runningBalance=running;});
    const realized=filtered.filter(x=>x.status==='realizado'),forecast=filtered.filter(x=>x.status==='previsto');
    const netRealized=netActualTotals(realized);
    const summary={openingBalance:num(opening),realizedIncome:netRealized.income,realizedExpense:netRealized.expense,forecastIncome:num(forecast.filter(x=>x.direction==='entrada').reduce((s,x)=>s+x.value,0)),forecastExpense:num(forecast.filter(x=>x.direction==='saida').reduce((s,x)=>s+x.value,0))};
    // Regra do Fluxo: estorno é informativo/auditável, sem alterar os cards ou
    // o saldo. Assim, Entradas realizadas - Saídas realizadas = saldo do período.
    summary.periodBalance=netRealized.balance;
    summary.currentBalance=num(summary.openingBalance+summary.periodBalance);
    summary.projectedBalance=num(summary.currentBalance+summary.forecastIncome-summary.forecastExpense);
    const groups=[]; for(const item of filtered){
      let g=groups.at(-1);if(!g||g.date!==item.date){g={date:item.date,items:[],income:0,expense:0,balance:0};groups.push(g);}
      g.items.push(item);
      if(item.status==='realizado'){
        if(!isReversal(item)){
          if(item.direction==='entrada')g.income=num(g.income+item.value);
          else g.expense=num(g.expense+item.value);
        }
      } else if(item.direction==='entrada')g.income=num(g.income+item.value); else g.expense=num(g.expense+item.value);
      g.balance=num(g.income-g.expense);
    }
    return {items:filtered,groups,summary};
  }
}

