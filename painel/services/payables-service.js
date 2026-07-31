import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const clean = value => String(value ?? '').trim();
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const dateOnly = value => clean(value) || now().slice(0, 10);
const entryTypeOf = item => {
  const explicit = clean(item?.entryType).toLowerCase();
  if (['purchase', 'compra'].includes(explicit)) return 'purchase';
  if (['expense', 'despesa'].includes(explicit)) return 'expense';
  const origin = clean(item?.origin).toLowerCase();
  return origin.includes('purchase') || origin.includes('compra') ? 'purchase' : 'expense';
};


function normalizeCompetencies(payload={}) {
  const source=Array.isArray(payload.competencies)?payload.competencies:[payload.competenceDate||payload.issueDate];
  const values=[];
  for (const raw of source) {
    const value=clean(raw);
    if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) continue;
    const month=value.slice(0,7);
    if (!values.includes(month)) values.push(month);
  }
  return values.length?values:[now().slice(0,7)];
}

function addDays(value, days) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function addMonths(value, months) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + Number(months || 0));
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

export default class PayablesService {
  constructor({ dataDir, financeService, supplierService, commerceService }) {
    this.dataDir = dataDir;
    this.financeService = financeService;
    this.supplierService = supplierService;
    this.commerceService = commerceService;
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensure();
  }
  file(name) { return path.join(this.dataDir, name); }
  read(name, fallback={ version:'0.18.0', items:[] }) {
    try { return JSON.parse(fs.readFileSync(this.file(name), 'utf8')); }
    catch (_) { return clone(fallback); }
  }
  write(name, data) {
    const target=this.file(name); const temp=`${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, target);
  }
  ensure() {
    for (const name of ['payables.json','payable-installments.json','payable-payments.json','payable-events.json','payable-attachments.json']) {
      if (!fs.existsSync(this.file(name))) this.write(name, { version:'0.18.0', items:[] });
    }
  }
  actor(value) { return clean(value) || 'painel'; }
  event(payableId, action, actor='painel', details={}) {
    const db=this.read('payable-events.json'); db.items=db.items||[];
    db.items.unshift({ id:`PEV-${crypto.randomUUID()}`, payableId, action, at:now(), actor:this.actor(actor), ...details });
    db.items=db.items.slice(0,5000); this.write('payable-events.json',db);
  }
  resolveSupplier(supplierId='') {
    if (!clean(supplierId)) return null;
    const supplier=this.supplierService.getSupplier(supplierId);
    if (!supplier) throw new Error('Fornecedor não encontrado.');
    if (supplier.active===false) throw new Error('O fornecedor selecionado está inativo.');
    return supplier;
  }
  nextNumber() {
    const items=this.read('payables.json').items||[];
    const next=items.reduce((max,item)=>Math.max(max,Number(String(item.number||'').replace(/\D/g,''))||0),0)+1;
    return `CP-${String(next).padStart(6,'0')}`;
  }
  list(filters={}) {
    const titles=this.read('payables.json').items||[];
    const installments=this.read('payable-installments.json').items||[];
    const term=clean(filters.search).toLowerCase();
    const today=now().slice(0,10);
    const monthStart=`${today.slice(0,7)}-01`;
    const monthEnd=new Date(`${monthStart}T12:00:00`); monthEnd.setMonth(monthEnd.getMonth()+1); monthEnd.setDate(0);
    return titles.filter(item=>{
      if (filters.status==='overdue') {
        if (['cancelled','reversed','paid'].includes(item.status)) return false;
      } else if (filters.status && item.status!==filters.status) return false;
      if (filters.view==='active' && ['cancelled','reversed'].includes(item.status)) return false;
      if (filters.view==='reversed' && !['cancelled','reversed'].includes(item.status)) return false;
      if (filters.type && entryTypeOf(item)!==filters.type) return false;
      if (filters.supplierId && item.supplierId!==filters.supplierId) return false;
      if (filters.paymentMethodId && item.paymentMethodId!==filters.paymentMethodId && !installments.some(row=>row.payableId===item.id&&row.paymentMethodId===filters.paymentMethodId)) return false;
      if (filters.costCenterId && item.costCenterId!==filters.costCenterId) return false;
      if (filters.accountId && item.accountId!==filters.accountId) return false;
      const rows=installments.filter(row=>row.payableId===item.id);
      const openDates=rows.filter(row=>Number(row.openBalance||0)>0).map(row=>row.dueDate).filter(Boolean);
      if (filters.status==='overdue' && !openDates.some(value=>value<today)) return false;
      if (filters.dueFrom && !openDates.some(value=>value>=filters.dueFrom)) return false;
      if (filters.dueTo && !openDates.some(value=>value<=filters.dueTo)) return false;
      if (filters.duePreset==='today' && !openDates.includes(today)) return false;
      if (filters.duePreset==='overdue' && !openDates.some(value=>value<today)) return false;
      if (filters.duePreset==='next7' && !openDates.some(value=>value>=today&&value<=addDays(today,7))) return false;
      if (filters.duePreset==='month' && !openDates.some(value=>value>=monthStart&&value<=monthEnd.toISOString().slice(0,10))) return false;
      if (filters.duePreset==='nextMonth') {
        const nextStart=new Date(`${monthStart}T12:00:00`); nextStart.setMonth(nextStart.getMonth()+1);
        const nextEnd=new Date(nextStart); nextEnd.setMonth(nextEnd.getMonth()+1); nextEnd.setDate(0);
        if (!openDates.some(value=>value>=nextStart.toISOString().slice(0,10)&&value<=nextEnd.toISOString().slice(0,10))) return false;
      }
      if (filters.duePreset==='future' && !openDates.some(value=>value>monthEnd.toISOString().slice(0,10))) return false;
      if (term && ![item.number,item.supplierName,item.description,item.documentNumber].some(value=>clean(value).toLowerCase().includes(term))) return false;
      return true;
    }).map(item=>({ ...item, installments:installments.filter(row=>row.payableId===item.id) }))
      .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  get(id) { return this.list().find(item=>item.id===id)||null; }
  payments(id) { return (this.read('payable-payments.json').items||[]).filter(item=>item.payableId===id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  events(id) { return (this.read('payable-events.json').items||[]).filter(item=>item.payableId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at))); }
  dashboardSummary(referenceDate='') {
    const today=clean(referenceDate)||now().slice(0,10); const month=today.slice(0,7);
    const titles=this.list().filter(item=>!['cancelled','reversed'].includes(item.status));
    const open=titles.filter(item=>['open','partial'].includes(item.status));
    const installments=open.flatMap(item=>item.installments.filter(row=>Number(row.openBalance||0)>0));
    const payments=this.read('payable-payments.json').items||[];
    const sum=items=>amount(items.reduce((total,item)=>total+Number(item.openBalance??item.value??0),0));
    return {
      open:{ count:open.length, value:sum(open) },
      dueToday:{ count:installments.filter(item=>item.dueDate===today).length, value:sum(installments.filter(item=>item.dueDate===today)) },
      overdue:{ count:installments.filter(item=>item.dueDate&&item.dueDate<today).length, value:sum(installments.filter(item=>item.dueDate&&item.dueDate<today)) },
      paidMonth:{ count:payments.filter(item=>clean(item.paidAt).slice(0,7)===month).length, value:amount(payments.filter(item=>clean(item.paidAt).slice(0,7)===month).reduce((total,item)=>total+Number(item.value||0),0)) }
    };
  }
  create(payload={}, actor='painel') {
    const description=clean(payload.description);
    const competenceItems=Array.isArray(payload.competenceItems)?payload.competenceItems.map(item=>({ competence:clean(item.competence).slice(0,7), value:amount(item.value), dueDate:dateOnly(item.dueDate) })).filter(item=>/^\d{4}-\d{2}$/.test(item.competence)&&item.value>0):[];
    const grossValue=amount(competenceItems.length?competenceItems.reduce((sum,item)=>sum+item.value,0):(payload.grossValue||payload.value));
    if (!description) throw new Error('Informe a descrição da conta.');
    if (grossValue<=0) throw new Error('Informe um valor maior que zero.');
    const supplier=this.resolveSupplier(payload.supplierId);
    const rawPlan=Array.isArray(payload.paymentPlan)?payload.paymentPlan:[];
    const paymentPlan=rawPlan.map((row,index)=>{
      const method=this.resolvePaymentMethod({ paymentMethodId:row.paymentMethodId });
      const value=amount(row.value);
      const installmentCount=Math.max(1,Math.min(120,Number(row.installmentCount||1)));
      const firstDueDate=dateOnly(row.firstDueDate||payload.firstDueDate||payload.dueDate||competenceItems[0]?.dueDate||payload.issueDate);
      if (!method) throw new Error(`Selecione uma forma de pagamento válida na composição ${index+1}.`);
      if (value<=0) throw new Error(`Informe um valor maior que zero na composição ${index+1}.`);
      return { id:`PPL-${crypto.randomUUID()}`, paymentMethodId:method.id, value, installmentCount, firstDueDate, intervalMonths:1 };
    });
    if (!paymentPlan.length) {
      const method=this.resolvePaymentMethod({ paymentMethodId:payload.paymentMethodId });
      if (!method) throw new Error('Selecione uma forma de pagamento prevista válida.');
      paymentPlan.push({ id:`PPL-${crypto.randomUUID()}`, paymentMethodId:method.id, value:grossValue, installmentCount:competenceItems.length||1, firstDueDate:dateOnly(payload.firstDueDate||payload.dueDate||competenceItems[0]?.dueDate||payload.issueDate), intervalMonths:1 });
    }
    const planTotal=amount(paymentPlan.reduce((sum,row)=>sum+row.value,0));
    if (Math.abs(planTotal-grossValue)>0.009) throw new Error(`A composição financeira deve totalizar exatamente R$ ${grossValue.toFixed(2).replace('.',',')}.`);
    const totalInstallments=paymentPlan.reduce((sum,row)=>sum+row.installmentCount,0);
    if (totalInstallments>120) throw new Error('A composição financeira não pode ultrapassar 120 parcelas.');
    const id=`PAY-${crypto.randomUUID()}`; const createdAt=now();
    const competencies=competenceItems.length?competenceItems.map(item=>item.competence):normalizeCompetencies(payload);
    const title={
      id, number:this.nextNumber(), supplierId:supplier?.id||'', supplierName:supplier?.name||clean(payload.supplierName)||'Despesa sem fornecedor',
      entryType:entryTypeOf(payload), supplierDocument:supplier?.document||'', description, documentNumber:clean(payload.documentNumber), origin:clean(payload.origin)||'manual', originId:clean(payload.originId),
      issueDate:dateOnly(payload.issueDate), competenceDate:`${competencies[0]}-01`, competencies, grossValue, discount:0, interest:0, fine:0,
      netValue:grossValue, paidValue:0, openBalance:grossValue, paymentMethodId:paymentPlan[0].paymentMethodId, paymentPlan, accountId:clean(payload.accountId),
      costCenterId:clean(payload.costCenterId), categoryId:clean(payload.categoryId), storeId:clean(payload.storeId), cashboxId:clean(payload.cashboxId)||'caixa-principal', status:'open', notes:clean(payload.notes),
      createdAt, createdBy:this.actor(actor), updatedAt:createdAt, updatedBy:this.actor(actor)
    };
    const installments=[];
    let globalNumber=1;
    for (const planRow of paymentPlan) {
      const cents=Math.round(planRow.value*100); const base=Math.floor(cents/planRow.installmentCount); let remainder=cents-(base*planRow.installmentCount);
      for (let index=0; index<planRow.installmentCount; index+=1) {
        const value=(base+(remainder-->0?1:0))/100;
        const dueDate=addMonths(planRow.firstDueDate,index);
        installments.push({ id:`PIN-${crypto.randomUUID()}`, payableId:id, paymentPlanId:planRow.id, number:globalNumber++, total:totalInstallments,
          planInstallmentNumber:index+1, planInstallmentTotal:planRow.installmentCount, competence:competencies[Math.min(index,competencies.length-1)]||competencies[0],
          dueDate, paymentMethodId:planRow.paymentMethodId, originalValue:value, paidValue:0, openBalance:value, status:'open', createdAt, createdBy:this.actor(actor) });
      }
    }
    const titlesDb=this.read('payables.json'); titlesDb.items=titlesDb.items||[]; titlesDb.items.unshift(title); this.write('payables.json',titlesDb);
    const installmentsDb=this.read('payable-installments.json'); installmentsDb.items=installmentsDb.items||[]; installmentsDb.items.push(...installments); this.write('payable-installments.json',installmentsDb);
    this.event(id,'created',actor,{ value:grossValue, installmentCount:totalInstallments, competencies, cashboxId:title.cashboxId, paymentPlan:paymentPlan.map(row=>({ paymentMethodId:row.paymentMethodId, value:row.value, installmentCount:row.installmentCount, firstDueDate:row.firstDueDate })) });
    return this.get(id);
  }

  updateInstallmentPaymentMethod(id, installmentId='', paymentMethodId='', actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível alterar a forma de pagamento de uma conta estornada.');
    const installment=(title.installments||[]).find(row=>row.id===installmentId);
    if (!installment) throw new Error('Parcela não encontrada.');
    if (Number(installment.openBalance||0)<=0) throw new Error('A parcela já está quitada e não possui saldo previsto para alterar.');
    const paymentMethod=this.resolvePaymentMethod({ paymentMethodId });
    if (!paymentMethod) throw new Error('Selecione uma forma de pagamento válida.');
    const db=this.read('payable-installments.json'); const item=db.items.find(row=>row.id===installmentId&&row.payableId===id);
    if (!item) throw new Error('Parcela não encontrada.');
    const previousPaymentMethodId=item.paymentMethodId||title.paymentMethodId||'';
    item.paymentMethodId=paymentMethod.id; item.updatedAt=now(); item.updatedBy=this.actor(actor); this.write('payable-installments.json',db);
    this.event(id,'installment_payment_method_updated',actor,{ installmentId, installmentNumber:item.number, previousPaymentMethodId, paymentMethodId:paymentMethod.id });
    return this.get(id);
  }

  paymentMethodDetails(paymentMethodId='') {
    return this.financeService.listCatalog('paymentMethods').find(item=>item.id===clean(paymentMethodId)) || null;
  }
  validateImmediatePaymentPlan(paymentPlan=[], cashboxId='caixa-principal') {
    const immediate=(Array.isArray(paymentPlan)?paymentPlan:[]).filter(row=>this.paymentMethodDetails(row.paymentMethodId)?.autoSettle===true);
    if (!immediate.length) return { immediate:[], session:null };
    if (!this.commerceService) throw new Error('Integração com Caixa indisponível.');
    const selectedCashbox=clean(cashboxId)||'caixa-principal';
    const session=this.commerceService.getOpenSession(selectedCashbox);
    if (!session) throw new Error('Abra o caixa selecionado antes de finalizar uma compra com pagamento imediato.');
    for (const row of immediate) {
      const method=this.paymentMethodDetails(row.paymentMethodId);
      const commerceMethod=this.resolveCommercePaymentMethod({ paymentMethodId:method?.id, paymentMethodName:method?.name });
      if (!commerceMethod) throw new Error(`A forma ${method?.name||row.paymentMethodId} não possui correspondência ativa no Caixa.`);
    }
    return { immediate, session };
  }
  payImmediatePlan(id, { cashboxId='caixa-principal', paidAt='', requestPrefix='' }={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    const results=[];
    for (const installment of title.installments||[]) {
      const method=this.paymentMethodDetails(installment.paymentMethodId);
      if (method?.autoSettle!==true || Number(installment.openBalance||0)<=0) continue;
      const requestKey=`${clean(requestPrefix)||`immediate-${id}`}-${installment.id}`;
      const result=this.pay(id,{ installmentId:installment.id, payments:[{ paymentMethodId:method.id, value:installment.openBalance }], cashboxId, paidAt:dateOnly(paidAt), requestKey, notes:'Pagamento imediato registrado na conclusão da compra.' },actor);
      results.push(result.payment);
    }
    return results;
  }
  resolvePaymentMethod(payment={}) {
    const methods=this.financeService.listCatalog('paymentMethods').filter(item=>item.active!==false);
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidate=normalize(payment.paymentMethodId||payment.methodId||payment.paymentMethodName);
    if (!candidate) return null;
    return methods.find(item=>[item.id,item.code,item.name].map(normalize).filter(Boolean).includes(candidate))||null;
  }
  resolveCommercePaymentMethod(payment={}) {
    const methods=this.commerceService?.getSettings()?.paymentMethods || [];
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidates=[payment.paymentMethodId,payment.paymentMethodName].map(normalize).filter(Boolean);
    const aliases={pmdinheiro:['dinheiro'],pmpix:['pix'],pmcredito:['cartaocredito','credito'],pmdebito:['cartaodebito','debito'],pmboleto:['boletocrediario','boleto','crediario']};
    const expanded=new Set(candidates.flatMap(value=>[value,...(aliases[value]||[])]));
    return methods.find(method=>method.active!==false&&[method.id,method.name,method.kind].map(normalize).some(value=>expanded.has(value))) || null;
  }
  pay(id, payload={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (!['open','partial'].includes(title.status)) throw new Error('Esta conta não está disponível para pagamento.');
    const installment=(title.installments||[]).find(item=>item.id===payload.installmentId)||title.installments.find(item=>Number(item.openBalance||0)>0);
    if (!installment) throw new Error('Selecione uma parcela em aberto.');
    const requestKey=clean(payload.requestKey)||`payable-${crypto.randomUUID()}`;
    const paymentsDb=this.read('payable-payments.json'); paymentsDb.items=paymentsDb.items||[];
    const duplicated=paymentsDb.items.find(item=>item.requestKey===requestKey);
    if (duplicated) return { duplicated:true, item:this.get(id), payment:duplicated };
    const rows=(payload.payments||[]).map((row,index)=>{ const method=this.resolvePaymentMethod(row); if(!method) throw new Error(`Selecione uma forma de pagamento ativa no pagamento ${index+1}.`); const commerceMethod=this.resolveCommercePaymentMethod({paymentMethodId:method.id,paymentMethodName:method.name}); if(!commerceMethod) throw new Error(`A forma ${method.name} não possui correspondência ativa no Caixa.`); return { paymentMethodId:method.id, paymentMethodName:method.name, commerceMethodId:commerceMethod.id, value:amount(row.value) }; }).filter(row=>row.value>0);
    if (!rows.length) throw new Error('Informe ao menos uma forma de pagamento.');
    if (rows.some(row=>!row.paymentMethodId)) throw new Error('Selecione a forma de pagamento.');
    const interest=amount(payload.interest), fine=amount(payload.fine), discount=amount(payload.discount);
    const paidTotal=amount(rows.reduce((sum,row)=>sum+row.value,0));
    const principal=amount(paidTotal-interest-fine+discount);
    if (principal<=0) throw new Error('O valor pago precisa cobrir juros e multa.');
    if (principal>Number(installment.openBalance||0)+0.001) throw new Error('O valor aplicado supera o saldo da parcela.');
    const cashboxId=clean(payload.cashboxId)||'caixa-principal'; const cashMovementIds=[];
    for (const [index,row] of rows.entries()) {
      const movementKey=`${requestKey}-${row.paymentMethodId}-${index}`;
      const movement=this.commerceService.addCashMovement({
        cashboxId, type:'expense', amount:row.value, methodId:row.commerceMethodId,
        description:`Pagamento ${title.number} · ${title.description}`,
        referenceType:'payable_payment', referenceId:requestKey, createdBy:this.actor(actor),
        idempotencyKey:movementKey,
        metadata:{ payableId:id, installmentId:installment.id, financePaymentMethodId:row.paymentMethodId }
      });
      const persisted=this.commerceService.findCashMovementByIdempotencyKey?.(movementKey);
      if (!persisted || persisted.cashboxId!==cashboxId || persisted.sessionId!==this.commerceService.getOpenSession(cashboxId)?.id) {
        throw new Error(`A saída de ${row.paymentMethodName} não foi confirmada no Caixa selecionado.`);
      }
      cashMovementIds.push(persisted.id||movement.id);
    }
    const payment={ id:`PYP-${crypto.randomUUID()}`, requestKey, paymentNumber:`PG-${String(paymentsDb.items.length+1).padStart(6,'0')}`, payableId:id, installmentId:installment.id,
      paidAt:dateOnly(payload.paidAt), value:paidTotal, principalValue:principal, interest, fine, discount, payments:rows, notes:clean(payload.notes), cashboxId, cashMovementIds,
      createdAt:now(), createdBy:this.actor(actor), balanceBefore:Number(installment.openBalance||0), balanceAfter:amount(Number(installment.openBalance||0)-principal) };
    const financial=this.financeService.registerPayablePayment({ payment, title, installment, actor:this.actor(actor) });
    payment.financeEntryIds=(financial.entries||[]).map(item=>item.id); payment.financePaymentIds=(financial.payments||[]).map(item=>item.id); payment.financeMovementIds=(financial.movements||[]).map(item=>item.id);
    paymentsDb.items.unshift(payment); this.write('payable-payments.json',paymentsDb);
    const installmentsDb=this.read('payable-installments.json'); const stored=installmentsDb.items.find(item=>item.id===installment.id);
    stored.paidValue=amount(Number(stored.paidValue||0)+principal); stored.openBalance=payment.balanceAfter; stored.status=stored.openBalance<=0?'paid':'partial'; stored.updatedAt=now(); stored.updatedBy=this.actor(actor); this.write('payable-installments.json',installmentsDb);
    const titlesDb=this.read('payables.json'); const storedTitle=titlesDb.items.find(item=>item.id===id);
    storedTitle.paidValue=amount(Number(storedTitle.paidValue||0)+principal); storedTitle.openBalance=amount(Number(storedTitle.openBalance||0)-principal);
    storedTitle.interest=amount(Number(storedTitle.interest||0)+interest); storedTitle.fine=amount(Number(storedTitle.fine||0)+fine); storedTitle.discount=amount(Number(storedTitle.discount||0)+discount);
    storedTitle.status=storedTitle.openBalance<=0?'paid':'partial'; storedTitle.updatedAt=now(); storedTitle.updatedBy=this.actor(actor); this.write('payables.json',titlesDb);
    this.event(id,storedTitle.status==='paid'?'paid':'partial_payment',actor,{ paymentId:payment.id, installmentId:installment.id, value:paidTotal, principalValue:principal, balanceAfter:storedTitle.openBalance });
    return { duplicated:false, item:this.get(id), payment };
  }
  reconcileCashMovements({ cashboxId='caixa-principal', actor='painel' }={}) {
    if (!this.commerceService) return { repaired:0, skipped:0, items:[] };
    const session=this.commerceService.getOpenSession(clean(cashboxId)||'caixa-principal');
    if (!session) return { repaired:0, skipped:0, items:[], reason:'cashbox_closed' };

    const paymentsDb=this.read('payable-payments.json'); paymentsDb.items=paymentsDb.items||[];
    const titles=new Map((this.read('payables.json').items||[]).map(item=>[item.id,item]));
    const repairedItems=[]; let changed=false; let skipped=0;

    for (const payment of paymentsDb.items) {
      const rows=Array.isArray(payment.payments)?payment.payments:[];
      if (!rows.length) { skipped+=1; continue; }
      const occurredAt=clean(payment.createdAt)||now();
      const targetCashboxId=clean(payment.cashboxId)||clean(cashboxId)||'caixa-principal';
      if (targetCashboxId!==session.cashboxId) { skipped+=1; continue; }
      const title=titles.get(payment.payableId);
      if (!title) { skipped+=1; continue; }

      const ids=new Set(Array.isArray(payment.cashMovementIds)?payment.cashMovementIds.filter(Boolean):[]);
      let repairedPayment=false;
      for (const [index,row] of rows.entries()) {
        const key=`${payment.requestKey}-${row.paymentMethodId}-${index}`;
        const existing=this.commerceService.findCashMovementByIdempotencyKey?.(key);
        if (existing && existing.cashboxId===session.cashboxId && existing.sessionId===session.id) { ids.add(existing.id); continue; }
        const method=this.resolveCommercePaymentMethod(row);
        if (!method || amount(row.value)<=0) { skipped+=1; continue; }
        const movement=this.commerceService.addCashMovement({
          cashboxId:targetCashboxId,
          type:'expense', amount:row.value, methodId:method.id,
          description:`Pagamento ${title.number} · ${title.description}`,
          referenceType:'payable_payment', referenceId:payment.requestKey,
          createdBy:this.actor(actor), idempotencyKey:key, occurredAt,
          metadata:{ payableId:payment.payableId, installmentId:payment.installmentId, payablePaymentId:payment.id, financePaymentMethodId:row.paymentMethodId, reconciled:true }
        });
        ids.add(movement.id); row.commerceMethodId=method.id; repairedPayment=true; changed=true;
      }
      payment.cashMovementIds=[...ids];
      if (repairedPayment) {
        payment.cashboxId=targetCashboxId;
        payment.cashReconciledAt=now(); payment.cashReconciledBy=this.actor(actor);
        repairedItems.push({ paymentId:payment.id, payableId:payment.payableId, cashMovementIds:[...ids] });
        this.event(payment.payableId,'cash_reconciled',actor,{ paymentId:payment.id, cashMovementIds:[...ids] });
      }
    }
    if (changed) this.write('payable-payments.json',paymentsDb);
    return { repaired:repairedItems.length, skipped, items:repairedItems };
  }

  reverse(id, reason='', actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (Number(title.paidValue||0)>0) throw new Error('Uma conta com pagamento registrado não pode ser estornada sem estornar os pagamentos primeiro.');
    const db=this.read('payables.json'); const item=db.items.find(row=>row.id===id); item.status='reversed'; item.reverseReason=clean(reason); item.reversedAt=now(); item.reversedBy=this.actor(actor); item.updatedAt=now(); item.updatedBy=this.actor(actor); this.write('payables.json',db);
    const installments=this.read('payable-installments.json'); installments.items.filter(row=>row.payableId===id).forEach(row=>{ row.status='reversed'; row.updatedAt=now(); row.updatedBy=this.actor(actor); }); this.write('payable-installments.json',installments);
    this.event(id,'reversed_action',actor,{ reason:item.reverseReason }); return this.get(id);
  }
  cancel(id, reason='', actor='painel') { return this.reverse(id, reason, actor); }
}
