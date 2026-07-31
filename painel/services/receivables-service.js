import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const clean = value => String(value ?? '').trim();
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const onlyDigits = value => String(value || '').replace(/\D/g, '');

function addDays(dateValue, days) {
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export default class ReceivablesService {
  constructor({ dataDir, financeService, customerService, commerceService }) {
    this.dataDir = dataDir;
    this.financeService = financeService;
    this.customerService = customerService;
    this.commerceService = commerceService;
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensure();
  }
  file(name) { return path.join(this.dataDir, name); }
  read(name, fallback={ version:'0.16.7', items:[] }) {
    try { return JSON.parse(fs.readFileSync(this.file(name), 'utf8')); } catch (_) { return clone(fallback); }
  }
  write(name, data) {
    const target = this.file(name); const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(temp, target);
  }
  ensure() {
    for (const name of ['receivables.json','receivable-installments.json','receipts.json','receivable-events.json']) {
      if (!fs.existsSync(this.file(name))) this.write(name, { version:'0.16.7', items:[] });
    }
  }
  validateCustomer(customerId, { requireDocument=true } = {}) {
    const customer = this.customerService.getCustomer(customerId);
    if (!customer) throw new Error('Selecione um cliente cadastrado.');
    if (customer.active === false) throw new Error('O cliente selecionado está inativo.');
    const document = onlyDigits(customer.document);
    if (requireDocument && ![11,14].includes(document.length)) throw new Error('O cliente precisa possuir CPF ou CNPJ válido para esta operação.');
    if (/consumidor/i.test(clean(customer.name))) throw new Error('Consumidor não pode ser utilizado em crediário. Selecione um cliente identificado.');
    return customer;
  }
  list({ status='', customerId='', search='', paymentMethodId='', costCenterId='', accountId='', dueFrom='', dueTo='', duePreset='' } = {}) {
    const titles = this.read('receivables.json').items || [];
    const installments = this.read('receivable-installments.json').items || [];
    const term = clean(search).toLowerCase();
    const today = new Date().toISOString().slice(0,10);
    const monthStart = `${today.slice(0,7)}-01`;
    const monthEndDate = new Date(`${monthStart}T12:00:00`);
    monthEndDate.setMonth(monthEndDate.getMonth()+1);
    monthEndDate.setDate(0);
    const monthEnd = monthEndDate.toISOString().slice(0,10);
    const plusDays = days => addDays(today, days);
    return titles.filter(item => {
      if (status && item.status !== status) return false;
      if (customerId && item.customerId !== customerId) return false;
      if (paymentMethodId && item.paymentMethodId !== paymentMethodId) return false;
      if (costCenterId && item.costCenterId !== costCenterId) return false;
      if (accountId && item.accountId !== accountId) return false;
      const itemInstallments = installments.filter(i => i.receivableId === item.id);
      const openDueDates = itemInstallments.filter(i => Number(i.openBalance || 0) > 0).map(i => i.dueDate).filter(Boolean);
      const dueDates = openDueDates.length ? openDueDates : itemInstallments.map(i => i.dueDate).filter(Boolean);
      if (dueFrom && !dueDates.some(date => date >= dueFrom)) return false;
      if (dueTo && !dueDates.some(date => date <= dueTo)) return false;
      if (duePreset === 'today' && !openDueDates.includes(today)) return false;
      if (duePreset === 'overdue' && !openDueDates.some(date => date < today)) return false;
      if (duePreset === 'next7' && !openDueDates.some(date => date >= today && date <= plusDays(7))) return false;
      if (duePreset === 'month' && !openDueDates.some(date => date >= monthStart && date <= monthEnd)) return false;
      if (term && ![item.number,item.customerName,item.originLabel].some(v => clean(v).toLowerCase().includes(term))) return false;
      return true;
    }).map(title => ({ ...title, installments:installments.filter(i => i.receivableId === title.id) }))
      .sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  get(id) { return this.list().find(item => item.id === id) || null; }

  dashboardSummary(referenceDate='') {
    const today = clean(referenceDate) || new Date().toISOString().slice(0,10);
    const monthKey = today.slice(0,7);
    const titles = this.list();
    const active = titles.filter(item => !['cancelled','reversed'].includes(item.status));
    const open = active.filter(item => ['open','partial'].includes(item.status));
    const openInstallments = open.flatMap(title => (title.installments || []).filter(item => Number(item.openBalance || 0) > 0));
    const receipts = this.read('receipts.json').items || [];
    return {
      open: {
        count: open.length,
        value: amount(open.reduce((sum,item)=>sum+Number(item.openBalance||0),0))
      },
      dueToday: {
        count: openInstallments.filter(item => item.dueDate === today).length,
        value: amount(openInstallments.filter(item => item.dueDate === today).reduce((sum,item)=>sum+Number(item.openBalance||0),0))
      },
      overdue: {
        count: openInstallments.filter(item => item.dueDate && item.dueDate < today).length,
        value: amount(openInstallments.filter(item => item.dueDate && item.dueDate < today).reduce((sum,item)=>sum+Number(item.openBalance||0),0))
      },
      receivedMonth: {
        count: receipts.filter(item => clean(item.receivedAt).slice(0,7) === monthKey).length,
        value: amount(receipts.filter(item => clean(item.receivedAt).slice(0,7) === monthKey).reduce((sum,item)=>sum+Number(item.value||0),0))
      }
    };
  }
  customerCreditSummary(customerId='') {
    const titles=this.list({ customerId });
    const today=new Date().toISOString().slice(0,10);
    const installments=titles.flatMap(title=>(title.installments||[]).map(item=>({ ...item, receivableId:title.id, titleNumber:title.number })));
    const openInstallments=installments.filter(item=>Number(item.openBalance||0)>0 && !['cancelled','reversed'].includes(item.status));
    const overdue=openInstallments.filter(item=>item.dueDate && item.dueDate<today);
    const paid=titles.filter(item=>item.status==='paid');
    const titleIds=new Set(titles.map(item=>item.id));
    const customerReceipts=(this.read('receipts.json').items||[]).filter(item=>titleIds.has(item.receivableId));
    return {
      customerId,
      titleCount:titles.length,
      openTitleCount:titles.filter(item=>['open','partial'].includes(item.status)).length,
      paidTitleCount:paid.length,
      overdueInstallmentCount:overdue.length,
      totalGenerated:amount(titles.filter(item=>!['cancelled','reversed'].includes(item.status)).reduce((sum,item)=>sum+Number(item.netValue||0),0)),
      openBalance:amount(titles.reduce((sum,item)=>sum+Number(item.openBalance||0),0)),
      overdueBalance:amount(overdue.reduce((sum,item)=>sum+Number(item.openBalance||0),0)),
      lastTitleAt:titles[0]?.createdAt||null,
      oldestOverdueDate:overdue.sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))[0]?.dueDate||null,
      totalReceived:amount(customerReceipts.reduce((sum,item)=>sum+Number(item.value||0),0)),
      receiptCount:customerReceipts.length,
      lastReceiptAt:customerReceipts.sort((a,b)=>String(b.receivedDateTime||b.createdAt).localeCompare(String(a.receivedDateTime||a.createdAt)))[0]?.receivedDateTime||null,
      status:overdue.length?'overdue':openInstallments.length?'open':titles.length?'clear':'no_history',
      recentTitles:titles.slice(0,8).map(item=>({ id:item.id, number:item.number, originLabel:item.originLabel, netValue:item.netValue, openBalance:item.openBalance, status:item.status, issueDate:item.issueDate }))
    };
  }
  resolvePaymentMethod(payment={}) {
    const methods=this.financeService.listCatalog('paymentMethods').filter(item=>item.active!==false);
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidates=[payment.methodId,payment.paymentMethodId,payment.methodName,payment.name].map(normalize).filter(Boolean);
    const aliases={dinheiro:['pmdinheiro','dinheiro'],pix:['pmpix','pix'],cartaocredito:['pmcredito','cartaocredito','credito'],cartaodebito:['pmdebito','cartaodebito','debito'],boletocrediario:['pmboleto','boleto','crediario','boletocrediario']};
    return methods.find(method=>{ const values=[method.id,method.code,method.name].map(normalize); return candidates.some(candidate=>values.includes(candidate)||Object.entries(aliases).some(([key,list])=>list.includes(candidate)&&list.some(alias=>values.includes(alias)))); }) || null;
  }

  resolveCommercePaymentMethod(payment={}) {
    const methods=this.commerceService?.getSettings()?.paymentMethods || [];
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidates=[payment.paymentMethodId,payment.paymentMethodName].map(normalize).filter(Boolean);
    const aliases={pmdinheiro:['dinheiro'],pmpix:['pix'],pmcredito:['cartaocredito','credito'],pmdebito:['cartaodebito','debito'],pmboleto:['boletocrediario','boleto','crediario']};
    const expanded=new Set(candidates.flatMap(value=>[value,...(aliases[value]||[])]));
    return methods.find(method=>[method.id,method.name,method.kind].map(normalize).some(value=>expanded.has(value))) || null;
  }
  restoreSnapshots(snapshots=[]) {
    for (const snapshot of snapshots) {
      if (!snapshot?.file) continue;
      fs.writeFileSync(snapshot.file, snapshot.content, 'utf8');
    }
  }

  methodGeneratesReceivable(method={}) {
    // Compatibilidade com cadastros anteriores à v0.16.3.
    // O campo explícito sempre prevalece. Quando ele ainda não existe,
    // formas não liquidadas automaticamente e classificadas como título
    // ou recebível continuam gerando Contas a Receber.
    if (method.generatesReceivable === true) return true;
    if (method.generatesReceivable === false) return false;
    const eventType=clean(method.eventType).toLowerCase();
    return method.autoSettle !== true && ['title','receivable'].includes(eventType);
  }
  validateOperation(operation={}) {
    const receivablePayments=[];
    for (const payment of operation.payments || []) {
      if (amount(payment.amount)<=0) continue;
      const method=this.resolvePaymentMethod(payment);
      if (!method) continue;
      if (!this.methodGeneratesReceivable(method)) continue;
      const customer=this.validateCustomer(operation.customerId,{ requireDocument:method.requireValidDocument !== false });
      const count=Math.max(1,Math.round(Number(payment.installments||1)));
      if (count>Number(method.maxInstallments||1)) throw new Error(`${method.name}: máximo permitido de ${method.maxInstallments||1} parcela(s).`);
      const minimum=Number(method.minimumInstallmentValue||0);
      if (minimum>0 && amount(payment.amount/count)<minimum) throw new Error(`${method.name}: cada parcela deve ter no mínimo R$ ${minimum.toFixed(2).replace('.',',')}.`);
      receivablePayments.push({ payment, method, customer });
    }
    return receivablePayments;
  }
  createFromOperation(operation={}, actor='painel') {
    const rows=this.validateOperation(operation);
    return rows.map(({payment,method})=>this.create({
      customerId:operation.customerId, customerNameSnapshot:operation.customerNameSnapshot, paymentMethodId:method.id, grossValue:payment.amount, discount:0, addition:0,
      installmentCount:payment.installments||1, issueDate:(operation.dates?.finalizedAt||new Date().toISOString()).slice(0,10),
      firstDueDate:clean(payment.dueDate), installmentDueDates:Array.isArray(payment.dueDates)?payment.dueDates:[], installmentAmounts:Array.isArray(payment.installmentAmounts)?payment.installmentAmounts:[],
      origin:operation.type==='service_order'?'service_order':'sale',
      originLabel:`${operation.type==='service_order'?'O.S.':'Venda'} #${operation.number}`, originId:operation.id,
      originPaymentKey:clean(payment.id)||`${clean(payment.methodId)}-${payment.amount}-${payment.installments||1}`,
      costCenterId:operation.type==='service_order'?'CAT-SERVICOS':'CAT-VENDAS',
      accountId:operation.type==='service_order'?'ACC-SERVICOS':'ACC-VENDAS', notes:`Gerado automaticamente pelo PDV.`
    },actor,{ operational:true }));
  }
  reconcileOperations(operations=[], actor='sistema') {
    const result={ checked:0, created:0, existing:0, skipped:0, errors:[] };
    for (const operation of Array.isArray(operations)?operations:[]) {
      if (!operation || operation.status !== 'finalized') continue;
      result.checked += 1;
      try {
        const before=(this.read('receivables.json').items||[]).length;
        const generated=this.createFromOperation(operation,actor);
        const after=(this.read('receivables.json').items||[]).length;
        result.created += Math.max(0,after-before);
        result.existing += Math.max(0,generated.length-Math.max(0,after-before));
        if (!generated.length) result.skipped += 1;
      } catch (error) {
        result.errors.push({ operationId:operation.id, number:operation.number, message:error.message });
      }
    }
    return result;
  }
  create(payload={}, actor='painel', options={}) {
    if (options.operational !== true) throw new Error('Títulos não podem ser criados manualmente. Finalize uma Venda ou O.S. com forma de pagamento que gere Contas a Receber.');
    const paymentMethod = this.financeService.listCatalog('paymentMethods').find(item => item.id === payload.paymentMethodId && item.active !== false);
    if (!paymentMethod) throw new Error('Selecione uma forma de pagamento ativa.');
    const customer = (paymentMethod.requireIdentifiedCustomer === true || paymentMethod.requireValidDocument === true)
      ? this.validateCustomer(payload.customerId, { requireDocument:paymentMethod.requireValidDocument === true })
      : (this.customerService.getCustomer(payload.customerId) || { id:'', name:clean(payload.customerNameSnapshot)||'Consumidor final', document:'' });
    const grossValue = amount(payload.grossValue);
    const discount = amount(payload.discount);
    const addition = amount(payload.addition);
    const netValue = amount(grossValue - discount + addition);
    if (netValue <= 0) throw new Error('O valor líquido deve ser maior que zero.');
    const count = Math.max(1, Math.min(Number(payload.installmentCount || 1), Number(paymentMethod.maxInstallments || 1)));
    const issueDate = clean(payload.issueDate) || new Date().toISOString().slice(0,10);
    const firstDueDate = clean(payload.firstDueDate) || addDays(issueDate, paymentMethod.firstDueDays || 0);
    const customDueDates=(Array.isArray(payload.installmentDueDates)?payload.installmentDueDates:[]).map(clean).filter(Boolean);
    if(customDueDates.length && customDueDates.length!==count) throw new Error(`Configure os ${count} vencimentos do parcelamento.`);
    const customAmounts=(Array.isArray(payload.installmentAmounts)?payload.installmentAmounts:[]).map(amount);
    if(customAmounts.length && customAmounts.length!==count) throw new Error(`Configure os valores das ${count} parcelas.`);
    if(customAmounts.length && customAmounts.some(value=>value<=0)) throw new Error('Todas as parcelas precisam ter valor maior que zero.');
    if(customAmounts.length && Math.abs(amount(customAmounts.reduce((sum,value)=>sum+value,0))-netValue)>=0.01) throw new Error('A soma dos valores das parcelas precisa ser igual ao valor do título.');
    const db = this.read('receivables.json');
    const existing=(db.items||[]).find(item=>item.originId===clean(payload.originId)&&item.originPaymentKey===clean(payload.originPaymentKey));
    if(existing) return this.get(existing.id);
    const id = `REC-${crypto.randomUUID()}`;
    const seq = Number(db.nextNumber || 1);
    const title = {
      id, number:String(seq).padStart(6,'0'), customerId:customer.id, customerName:customer.name,
      customerDocument:onlyDigits(customer.document), origin:clean(payload.origin)||'manual', originLabel:clean(payload.originLabel)||'Lançamento manual',
      originId:clean(payload.originId), originPaymentKey:clean(payload.originPaymentKey), costCenterId:clean(payload.costCenterId), accountId:clean(payload.accountId), paymentMethodId:paymentMethod.id,
      grossValue, discount, addition, netValue, openBalance:netValue, status:'open', issueDate,
      competenceDate:clean(payload.competenceDate)||issueDate, firstDueDate, notes:clean(payload.notes),
      installmentCount:count, createdAt:now(), createdBy:actor, updatedAt:now(), updatedBy:actor
    };
    db.nextNumber = seq + 1; db.items = db.items || []; db.items.unshift(title); this.write('receivables.json', db);
    const installmentDb = this.read('receivable-installments.json'); installmentDb.items = installmentDb.items || [];
    const base = Math.floor((netValue * 100) / count) / 100; let allocated = 0;
    for (let index=1; index<=count; index += 1) {
      const value = customAmounts.length ? customAmounts[index-1] : (index === count ? amount(netValue - allocated) : base); allocated = amount(allocated + value);
      installmentDb.items.push({ id:`RIN-${crypto.randomUUID()}`, receivableId:id, number:index, total:count, dueDate:customDueDates[index-1]||addDays(firstDueDate, (index-1)*Number(paymentMethod.installmentIntervalDays||30)), originalValue:value, openBalance:value, paidValue:0, status:'open', createdAt:now() });
    }
    this.write('receivable-installments.json', installmentDb);
    this.event(id, 'created', actor, { title });
    return this.get(id);
  }
  receive(id, payload={}, actor='painel') {
    if (!this.commerceService) throw new Error('Integração com o Caixa não está disponível.');
    const requestKey = clean(payload.requestKey || payload.idempotencyKey);
    const receiptDbBefore = this.read('receipts.json');
    if (requestKey) {
      const existingReceipt=(receiptDbBefore.items||[]).find(item=>item.requestKey===requestKey);
      if(existingReceipt) return { item:this.get(existingReceipt.receivableId), receipt:existingReceipt, duplicated:true };
    }

    const actorName=clean(actor)||'painel';
    const openCash = this.commerceService.findOpenSessionForUser(actorName, clean(payload.cashboxId));
    if (!openCash?.session) throw new Error('Não existe caixa aberto para este usuário. Abra o Caixa antes de confirmar o recebimento.');

    const titleDb = this.read('receivables.json');
    const title = (titleDb.items || []).find(i => i.id === id);
    if (!title) throw new Error('Título não encontrado.');
    if (['cancelled','reversed','paid'].includes(title.status)) throw new Error('Este título não permite novo recebimento.');

    const paymentMethods = this.financeService.listCatalog('paymentMethods').filter(item => item.active !== false);
    const requestedPayments = Array.isArray(payload.payments) && payload.payments.length
      ? payload.payments
      : [{ paymentMethodId:payload.paymentMethodId || title.paymentMethodId, value:payload.value }];
    const payments = requestedPayments.map((payment, index) => {
      const paymentMethodId = clean(payment.paymentMethodId || payment.methodId);
      const method = paymentMethods.find(item => item.id === paymentMethodId);
      if (!method) throw new Error(`Selecione uma forma de pagamento ativa no pagamento ${index + 1}.`);
      const value = amount(payment.value ?? payment.amount);
      if (value <= 0) throw new Error(`Informe um valor maior que zero no pagamento ${index + 1}.`);
      const commerceMethod=this.resolveCommercePaymentMethod({ paymentMethodId, paymentMethodName:method.name });
      if(!commerceMethod) throw new Error(`A forma ${method.name} não possui correspondência ativa no Caixa.`);
      return { paymentMethodId, paymentMethodName:method.name, commerceMethodId:commerceMethod.id, value };
    });
    const value = amount(payments.reduce((sum, payment) => sum + payment.value, 0));
    const interest = amount(payload.interest);
    const fine = amount(payload.fine);
    const discount = amount(payload.discount);
    const appliedToPrincipal = amount(value - interest - fine + discount);
    if (appliedToPrincipal <= 0) throw new Error('O valor aplicado ao saldo precisa ser maior que zero.');

    const installmentsDb = this.read('receivable-installments.json');
    const allOpenInstallments = (installmentsDb.items || [])
      .filter(i => i.receivableId === id && Number(i.openBalance || 0) > 0)
      .sort((a,b)=>a.number-b.number);
    const selectedInstallmentId = clean(payload.installmentId);
    const selectedInstallment = selectedInstallmentId ? allOpenInstallments.find(item => item.id === selectedInstallmentId) : null;
    if (selectedInstallmentId && !selectedInstallment) throw new Error('A parcela selecionada não está mais disponível para recebimento.');

    const maximumPrincipal = selectedInstallment ? amount(selectedInstallment.openBalance) : amount(title.openBalance);
    if (appliedToPrincipal > maximumPrincipal) throw new Error('O recebimento é maior que o saldo selecionado.');

    const snapshotFiles=[
      this.file('receivables.json'),this.file('receivable-installments.json'),this.file('receipts.json'),this.file('receivable-events.json'),
      this.financeService.file('entries.json'),this.financeService.file('payments.json'),this.financeService.file('movements.json'),this.financeService.file('audit.json'),
      this.commerceService.movementsFile
    ];
    const snapshots=snapshotFiles.map(file=>({file,content:fs.readFileSync(file,'utf8')}));

    try {
      const installments = selectedInstallment ? [selectedInstallment] : allOpenInstallments;
      let remaining = appliedToPrincipal;
      const allocations = [];
      for (const installment of installments) {
        const used = Math.min(remaining, amount(installment.openBalance));
        if (used <= 0) continue;
        installment.openBalance = amount(installment.openBalance - used);
        installment.paidValue = amount((installment.paidValue||0)+used);
        installment.status = installment.openBalance <= 0 ? 'paid' : 'partial';
        allocations.push({ installmentId:installment.id, number:installment.number, value:used, balanceAfter:installment.openBalance });
        remaining = amount(remaining-used);
        if (remaining <= 0) break;
      }

      title.openBalance = amount(title.openBalance - appliedToPrincipal);
      title.status = title.openBalance <= 0 ? 'paid' : 'partial';
      title.updatedAt=now(); title.updatedBy=actorName;

      const receiptDb = this.read('receipts.json'); receiptDb.items = receiptDb.items || [];
      const receiptId=`RCP-${crypto.randomUUID()}`;
      const receipt = {
        id:receiptId, requestKey:requestKey || receiptId, receiptNumber:String(Number(receiptDb.nextNumber || 1)).padStart(6,'0'), receivableId:id,
        installmentId:selectedInstallmentId || '', allocations, payments,
        value, principalValue:appliedToPrincipal, interest, fine, discount,
        paymentMethodId:payments[0]?.paymentMethodId || title.paymentMethodId,
        receivedAt:clean(payload.receivedAt)||new Date().toISOString().slice(0,10),
        receivedDateTime:now(), notes:clean(payload.notes), balanceAfter:title.openBalance,
        cashboxId:openCash.cashbox.id, cashboxName:openCash.cashbox.name, cashSessionId:openCash.session.id,
        operationId:title.originId || '', operationType:title.origin || '', customerId:title.customerId,
        reversible:true, reversalStatus:'available', createdAt:now(), createdBy:actorName
      };

      this.write('receivable-installments.json', installmentsDb);
      this.write('receivables.json', titleDb);
      receiptDb.nextNumber = Number(receiptDb.nextNumber || 1) + 1;
      receiptDb.items.unshift(receipt); this.write('receipts.json', receiptDb);

      const cashMovements=[];
      for (const [index,payment] of payments.entries()) {
        cashMovements.push(this.commerceService.addCashMovement({
          cashboxId:openCash.cashbox.id, type:'receivable_receipt', amount:payment.value,
          methodId:payment.commerceMethodId,
          description:`Recebimento ${receipt.receiptNumber} · Título ${title.number} · ${title.customerName}`,
          referenceType:'receivable_receipt', referenceId:receipt.id, createdBy:actorName,
          idempotencyKey:`${receipt.requestKey}:cash:${index+1}`,
          metadata:{ receiptId:receipt.id, receivableId:title.id, installmentId:selectedInstallmentId, operationId:title.originId || '', customerId:title.customerId, financePaymentMethodId:payment.paymentMethodId }
        }));
      }
      receipt.cashMovementIds=cashMovements.map(item=>item.id);

      const operation=title.originId ? this.commerceService.getOperation(title.originId) : null;
      const financial=this.financeService.registerReceivableReceipt({ receipt, title, installment:selectedInstallment, operation, cashSession:openCash.session, cashboxId:openCash.cashbox.id, actor:actorName });
      receipt.financeEntryIds=financial.entries.map(item=>item.id);
      receipt.financePaymentIds=financial.payments.map(item=>item.id);
      receipt.financeMovementIds=financial.movements.map(item=>item.id);
      this.write('receipts.json', receiptDb);

      this.event(id,'received',actorName,{ receiptId:receipt.id, receiptNumber:receipt.receiptNumber, value, principalValue:appliedToPrincipal, balanceAfter:title.openBalance, allocations, cashboxId:openCash.cashbox.id, cashSessionId:openCash.session.id, cashMovementIds:receipt.cashMovementIds, financeMovementIds:receipt.financeMovementIds });
      return { item:this.get(id), receipt, cashMovements, financial, duplicated:false };
    } catch (error) {
      this.restoreSnapshots(snapshots);
      throw error;
    }
  }
  cancel(id, reason='', actor='painel') {
    const db=this.read('receivables.json'); const item=(db.items||[]).find(i=>i.id===id); if(!item) throw new Error('Título não encontrado.');
    if (item.status === 'paid') throw new Error('Título recebido não pode ser cancelado. Use estorno.');
    item.status='cancelled'; item.cancelReason=clean(reason); item.cancelledAt=now(); item.cancelledBy=actor; item.updatedAt=now(); this.write('receivables.json',db); this.event(id,'cancelled',actor,{reason:clean(reason)}); return this.get(id);
  }
  event(receivableId, action, actor, details={}) { const db=this.read('receivable-events.json'); db.items=db.items||[]; db.items.unshift({ id:`REV-${crypto.randomUUID()}`, receivableId, action, actor, at:now(), ...details }); this.write('receivable-events.json',db); }
  events(id) { return (this.read('receivable-events.json').items||[]).filter(i=>i.receivableId===id); }
  receipts(id) { return (this.read('receipts.json').items||[]).filter(i=>i.receivableId===id); }
  calculateLateCharges({ installmentValue, dueDate, paymentDate, paymentMethodId }) {
    const method=this.financeService.listCatalog('paymentMethods').find(i=>i.id===paymentMethodId)||{};
    const due=new Date(`${dueDate}T12:00:00`), paid=new Date(`${paymentDate}T12:00:00`);
    const days=Math.max(0,Math.floor((paid-due)/86400000)-Number(method.lateGraceDays||0));
    if(days<=0) return { daysLate:0, fine:0, interest:0, updatedValue:amount(installmentValue) };
    const base=amount(installmentValue); const fine=amount(Number(method.lateFineFixed||0)+(base*Number(method.lateFinePercent||0)/100));
    const rate=Number(method.lateInterestPercent||0)/100; const periods=method.lateInterestPeriod==='monthly' ? days/30 : days;
    const interest=method.lateInterestType==='compound' ? amount(base*(Math.pow(1+rate,periods)-1)) : amount(base*rate*periods);
    return { daysLate:days, fine, interest, updatedValue:amount(base+fine+interest) };
  }
}
