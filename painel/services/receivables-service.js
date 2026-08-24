import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { matchesSearchText } from '../utils/search.js';

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const clean = value => String(value ?? '').trim();
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const onlyDigits = value => String(value || '').replace(/\D/g, '');
function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  } catch (_) {
    return date.toISOString().slice(0,10);
  }
}

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
    this._jsonCache = new Map();
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensure();
  }
  file(name) { return path.join(this.dataDir, name); }
  read(name, fallback={ version:'0.16.7', items:[] }) {
    const target=this.file(name);
    try {
      const stat=fs.statSync(target),cached=this._jsonCache.get(target);
      if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
      const data=JSON.parse(fs.readFileSync(target,'utf8'));
      this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});
      return data;
    } catch (_) { return clone(fallback); }
  }
  write(name, data) {
    const target = this.file(name); const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(temp, target);
    try{const stat=fs.statSync(target);this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){this._jsonCache.delete(target);}
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
    const term = clean(search);
    const today = new Date().toISOString().slice(0,10);
    const monthStart = `${today.slice(0,7)}-01`;
    const monthEndDate = new Date(`${monthStart}T12:00:00`);
    monthEndDate.setMonth(monthEndDate.getMonth()+1);
    monthEndDate.setDate(0);
    const monthEnd = monthEndDate.toISOString().slice(0,10);
    const plusDays = days => addDays(today, days);
    const currentCustomers = new Map((this.customerService?.listCustomers({ includeInactive:true }) || []).map(customer => [String(customer.id), customer]));
    return titles.map(item => {
      const customer = currentCustomers.get(String(item.customerId || ''));
      return customer ? { ...item, customerName:item.customerNameSnapshot || item.customerName, customerNameSnapshot:item.customerNameSnapshot || item.customerName, customerNameCurrent:customer.name, customerName:customer.name, customerDocument:customer.document || item.customerDocument } : item;
    }).filter(item => {
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
      if (!matchesSearchText([item.number,item.customerName,item.originLabel].join(' '), term)) return false;
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
    const receipts = (this.read('receipts.json').items || []).filter(item=>item.status!=='reversed'&&item.reversalStatus!=='reversed');
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
  customerCreditSummaries(customerIds=[]) {
    const ids=new Set((customerIds||[]).map(String).filter(Boolean));
    if(!ids.size)return {};
    const titles=(this.read('receivables.json').items||[]).filter(item=>ids.has(String(item.customerId||''))).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    const titleIds=new Set(titles.map(item=>item.id));
    const installments=(this.read('receivable-installments.json').items||[]).filter(item=>titleIds.has(item.receivableId));
    const receipts=(this.read('receipts.json').items||[]).filter(item=>titleIds.has(item.receivableId)&&item.status!=='reversed'&&item.reversalStatus!=='reversed');
    const installmentsByTitle=new Map();
    for(const item of installments){const list=installmentsByTitle.get(item.receivableId)||[];list.push(item);installmentsByTitle.set(item.receivableId,list)}
    const titlesByCustomer=new Map();
    for(const item of titles){const key=String(item.customerId||'');const list=titlesByCustomer.get(key)||[];list.push({...item,installments:installmentsByTitle.get(item.id)||[]});titlesByCustomer.set(key,list)}
    const receiptsByTitle=new Map();
    for(const item of receipts){const list=receiptsByTitle.get(item.receivableId)||[];list.push(item);receiptsByTitle.set(item.receivableId,list)}
    const today=new Date().toISOString().slice(0,10), result={};
    for(const customerId of ids){
      const customerTitles=titlesByCustomer.get(customerId)||[];
      const customerInstallments=customerTitles.flatMap(title=>(title.installments||[]).map(item=>({...item,receivableId:title.id,titleNumber:title.number})));
      const openInstallments=customerInstallments.filter(item=>Number(item.openBalance||0)>0&&!['cancelled','reversed'].includes(item.status));
      const overdue=openInstallments.filter(item=>item.dueDate&&item.dueDate<today);
      const customerReceipts=customerTitles.flatMap(title=>receiptsByTitle.get(title.id)||[]);
      result[customerId]={customerId,titleCount:customerTitles.length,openTitleCount:customerTitles.filter(item=>['open','partial'].includes(item.status)).length,paidTitleCount:customerTitles.filter(item=>item.status==='paid').length,overdueInstallmentCount:overdue.length,totalGenerated:amount(customerTitles.filter(item=>!['cancelled','reversed'].includes(item.status)).reduce((sum,item)=>sum+Number(item.netValue||0),0)),openBalance:amount(customerTitles.reduce((sum,item)=>sum+Number(item.openBalance||0),0)),overdueBalance:amount(overdue.reduce((sum,item)=>sum+Number(item.openBalance||0),0)),lastTitleAt:customerTitles[0]?.createdAt||null,oldestOverdueDate:[...overdue].sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))[0]?.dueDate||null,totalReceived:amount(customerReceipts.reduce((sum,item)=>sum+Number(item.value||0),0)),receiptCount:customerReceipts.length,lastReceiptAt:[...customerReceipts].sort((a,b)=>String(b.receivedDateTime||b.createdAt).localeCompare(String(a.receivedDateTime||a.createdAt)))[0]?.receivedDateTime||null,status:overdue.length?'overdue':openInstallments.length?'open':customerTitles.length?'clear':'no_history',recentTitles:customerTitles.slice(0,8).map(item=>({id:item.id,number:item.number,originLabel:item.originLabel,netValue:item.netValue,openBalance:item.openBalance,status:item.status,issueDate:item.issueDate}))};
    }
    return result;
  }
  customerCreditSummary(customerId='') {
    const batch=this.customerCreditSummaries([customerId]);
    if(batch[String(customerId)])return batch[String(customerId)];
    const titles=this.list({ customerId });
    const today=new Date().toISOString().slice(0,10);
    const installments=titles.flatMap(title=>(title.installments||[]).map(item=>({ ...item, receivableId:title.id, titleNumber:title.number })));
    const openInstallments=installments.filter(item=>Number(item.openBalance||0)>0 && !['cancelled','reversed'].includes(item.status));
    const overdue=openInstallments.filter(item=>item.dueDate && item.dueDate<today);
    const paid=titles.filter(item=>item.status==='paid');
    const titleIds=new Set(titles.map(item=>item.id));
    const customerReceipts=(this.read('receipts.json').items||[]).filter(item=>titleIds.has(item.receivableId)&&item.status!=='reversed'&&item.reversalStatus!=='reversed');
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
    const salesPaid = method.salesPaid !== undefined ? method.salesPaid === true : method.autoSettle === true;
    return salesPaid !== true && ['title','receivable'].includes(eventType);
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
      // PDV: uma venda/O.S. nunca pode criar título com vencimento retroativo.
      // A data-base é o dia corrente da operação no fuso da loja (São Paulo).
      const saleDate=localDateKey();
      const dueDates=(Array.isArray(payment.dueDates)?payment.dueDates:[]).map(clean).filter(Boolean);
      if (!dueDates.length && clean(payment.dueDate)) dueDates.push(clean(payment.dueDate));
      const retroactive=dueDates.find(dueDate=>/^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate < saleDate);
      if (retroactive) throw new Error(`${method.name}: o vencimento ${retroactive.split('-').reverse().join('/')} é anterior à data da venda. Use hoje ou uma data futura.`);
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
    const result={ checked:0, created:0, existing:0, skipped:0, cancelled:0, pendingReceiptReversal:0, errors:[] };
    for (const operation of Array.isArray(operations)?operations:[]) {
      if (!operation) continue;

      if (operation.status === 'finalized') {
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
        continue;
      }

      if (!['cancelled','reversed'].includes(operation.status)) continue;
      const operationReceivableIds=new Set((operation.receivableIds||[]).map(String));
      // Use a base bruta para que filtros, cadastro do cliente ou saldos antigos não
      // impeçam a reconciliação de títulos ligados a operações canceladas/estornadas.
      const linkedTitles=(this.read('receivables.json').items||[]).filter(title=>operationReceivableIds.has(String(title.id))||String(title.originId||'')===String(operation.id));
      for (const title of linkedTitles) {
        if (['cancelled','reversed'].includes(title.status) && Number(title.openBalance||0)===0) continue;
        const activeReceipts=this.receipts(title.id).filter(receipt=>receipt.status!=='reversed'&&receipt.reversalStatus!=='reversed');
        if (activeReceipts.length) {
          result.pendingReceiptReversal += activeReceipts.length;
          result.errors.push({
            operationId:operation.id,
            number:operation.number,
            receivableId:title.id,
            message:`O título ${title.number||title.id} ainda possui ${activeReceipts.length} recebimento(s) ativo(s) e precisa ser estornado pelo fluxo da operação.`
          });
          continue;
        }
        try {
          this.cancel(title.id, `${operation.status==='reversed'?'Estorno':'Cancelamento'} reconciliado da operação #${operation.number}`, actor);
          result.cancelled += 1;
        } catch (error) {
          result.errors.push({ operationId:operation.id, number:operation.number, receivableId:title.id, message:error.message });
        }
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
    if(options?.operational===true){
      const retroactive=[firstDueDate,...customDueDates].filter(Boolean).find(dueDate=>/^\d{4}-\d{2}-\d{2}$/.test(dueDate)&&dueDate<issueDate);
      if(retroactive) throw new Error(`Vencimento retroativo não permitido no PDV: ${retroactive.split('-').reverse().join('/')} é anterior à venda de ${issueDate.split('-').reverse().join('/')}.`);
    }
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
      const creditCash=method.creditCashOnSale!==false;
      const commerceMethod=creditCash?this.resolveCommercePaymentMethod({ paymentMethodId, paymentMethodName:method.name }):null;
      if(creditCash&&!commerceMethod) throw new Error(`A forma ${method.name} não possui correspondência ativa no Caixa.`);
      const requestedInstallments=Math.max(1,Math.round(Number(payment.installments||1)||1));
      const maxInstallments=Math.max(1,Number(method.maxInstallments||1));
      const allowsInstallments=Boolean(method.allowInstallments) && maxInstallments>1;
      if(!allowsInstallments && requestedInstallments>1) throw new Error(`${method.name} não permite parcelamento.`);
      if(requestedInstallments>maxInstallments) throw new Error(`${method.name}: máximo permitido de ${maxInstallments} parcela(s).`);
      const installments=allowsInstallments?requestedInstallments:1;
      return { paymentMethodId, paymentMethodName:method.name, commerceMethodId:commerceMethod?.id||method.name, creditCash, value, installments };
    });
    const requiresCash=payments.some(payment=>payment.creditCash!==false);
    const openCash=requiresCash?this.commerceService.findOpenSessionForUser(actorName, clean(payload.cashboxId)):null;
    if (requiresCash&&!openCash?.session) throw new Error('Não existe caixa aberto para este usuário. Abra o Caixa antes de confirmar um recebimento configurado para creditar no Caixa.');
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
        cashboxId:openCash?.cashbox?.id||'', cashboxName:openCash?.cashbox?.name||'', cashSessionId:openCash?.session?.id||'',
        operationId:title.originId || '', operationType:title.origin || '', customerId:title.customerId,
        reversible:true, reversalStatus:'available', createdAt:now(), createdBy:actorName
      };

      this.write('receivable-installments.json', installmentsDb);
      this.write('receivables.json', titleDb);
      receiptDb.nextNumber = Number(receiptDb.nextNumber || 1) + 1;
      receiptDb.items.unshift(receipt); this.write('receipts.json', receiptDb);

      const cashMovements=[];
      for (const [index,payment] of payments.entries()) {
        if(payment.creditCash===false) continue;
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
      const financial=this.financeService.registerReceivableReceipt({ receipt, title, installment:selectedInstallment, operation, cashSession:openCash?.session||null, cashboxId:openCash?.cashbox?.id||'', actor:actorName });
      receipt.financeEntryIds=financial.entries.map(item=>item.id);
      receipt.financePaymentIds=financial.payments.map(item=>item.id);
      receipt.financeMovementIds=financial.movements.map(item=>item.id);
      this.write('receipts.json', receiptDb);

      this.event(id,'received',actorName,{ receiptId:receipt.id, receiptNumber:receipt.receiptNumber, value, principalValue:appliedToPrincipal, balanceAfter:title.openBalance, allocations, cashboxId:openCash?.cashbox?.id||'', cashSessionId:openCash?.session?.id||'', cashMovementIds:receipt.cashMovementIds, financeMovementIds:receipt.financeMovementIds });
      return { item:this.get(id), receipt, cashMovements, financial, duplicated:false };
    } catch (error) {
      this.restoreSnapshots(snapshots);
      throw error;
    }
  }

  reverseReceipt(id, receiptId, reason='', actor='painel') {
    const why=clean(reason); if(!why) throw new Error('Informe o motivo do estorno.');
    const actorName=clean(actor)||'painel';
    const titleDb=this.read('receivables.json'); const title=(titleDb.items||[]).find(item=>item.id===id);
    if(!title) throw new Error('Título não encontrado.');
    const receiptDb=this.read('receipts.json'); receiptDb.items=receiptDb.items||[];
    const receipt=receiptDb.items.find(item=>item.id===receiptId&&item.receivableId===id);
    if(!receipt) throw new Error('Recebimento não encontrado.');
    if(receipt.status==='reversed'||receipt.reversalStatus==='reversed') throw new Error('Este recebimento já foi estornado.');
    const cashPayments=(receipt.payments||[]).filter(payment=>payment.creditCash!==false);
    const openCash=cashPayments.length?this.commerceService.findOpenSessionForUser(actorName,receipt.cashboxId):null;
    if(cashPayments.length&&!openCash?.session) throw new Error(`Abra o caixa ${receipt.cashboxName||receipt.cashboxId||''} antes de estornar o recebimento.`);
    const installmentsDb=this.read('receivable-installments.json');
    const linkedOperation=title.originId ? this.commerceService.getOperation(title.originId) : null;
    const operationReference=linkedOperation?.number ? ` · ${linkedOperation.type==='service_order'?'O.S.':'Venda'} #${linkedOperation.number}` : '';
    const reversalMovementIds=[];
    for(const [index,payment] of (receipt.payments||[]).entries()) {
      if(payment.creditCash===false) continue;
      const method=this.resolveCommercePaymentMethod(payment);
      if(!method) throw new Error(`A forma ${payment.paymentMethodName||payment.paymentMethodId} não possui correspondência ativa no Caixa.`);
      const movement=this.commerceService.addCashMovement({
        cashboxId:openCash.cashbox.id,type:'refund',amount:payment.value,methodId:method.id,
        description:`Estorno recebimento ${receipt.receiptNumber} · Título ${title.number}${operationReference} · ${why}`,
        referenceType:'receivable_receipt_reversal',referenceId:receipt.id,createdBy:actorName,
        idempotencyKey:`reverse-receipt-${receipt.id}-${index}`,
        metadata:{receiptId:receipt.id,receivableId:id,originalReceiptId:receipt.id,reason:why,operationId:title.originId||'',operationNumber:linkedOperation?.number||null,customerId:title.customerId||'',customerName:title.customerName||'',cashboxId:openCash.cashbox.id}
      });
      reversalMovementIds.push(movement.id);
    }
    this.financeService.reverseReceivableReceipt({receipt,title,reason:why,actor:actorName});
    const principal=amount(receipt.principalValue||0);
    for(const allocation of (receipt.allocations||[])) {
      const installment=installmentsDb.items.find(item=>item.id===allocation.installmentId&&item.receivableId===id);
      if(!installment) continue;
      installment.paidValue=amount(Math.max(0,Number(installment.paidValue||0)-Number(allocation.value||0)));
      installment.openBalance=amount(Number(installment.openBalance||0)+Number(allocation.value||0));
      installment.status=installment.paidValue>0?'partial':'open'; installment.updatedAt=now(); installment.updatedBy=actorName;
    }
    title.openBalance=amount(Number(title.openBalance||0)+principal);
    const remainingReceipts=receiptDb.items.filter(item=>item.receivableId===id&&item.id!==receipt.id&&item.status!=='reversed'&&item.reversalStatus!=='reversed');
    const operationIsClosed=['cancelled','reversed'].includes(linkedOperation?.status);

    if (operationIsClosed) {
      const cancelledAt=now();
      title.cancelledOpenBalance=amount(title.openBalance||0);
      title.openBalance=0;
      title.status='cancelled';
      title.cancelReason=`${linkedOperation.status==='reversed'?'Estorno':'Cancelamento'} da operação #${linkedOperation.number||title.originId}`;
      title.cancelledAt=title.cancelledAt||cancelledAt;
      title.cancelledBy=title.cancelledBy||actorName;
      for (const installment of installmentsDb.items||[]) {
        if (installment.receivableId!==id) continue;
        installment.cancelledOpenBalance=amount(installment.openBalance||0);
        installment.openBalance=0;
        installment.status='cancelled';
        installment.cancelledAt=installment.cancelledAt||cancelledAt;
        installment.cancelledBy=installment.cancelledBy||actorName;
        installment.updatedAt=cancelledAt;
        installment.updatedBy=actorName;
      }
    } else {
      title.status=remainingReceipts.length?'partial':'open';
    }
    title.updatedAt=now(); title.updatedBy=actorName;
    this.write('receivable-installments.json',installmentsDb);
    this.write('receivables.json',titleDb);
    receipt.cashboxId=receipt.cashboxId||openCash?.cashbox?.id||''; receipt.cashboxName=receipt.cashboxName||openCash?.cashbox?.name||''; receipt.status='reversed'; receipt.reversalStatus='reversed'; receipt.reversedAt=now(); receipt.reversedBy=actorName; receipt.reverseReason=why; receipt.cashReversalMovementIds=reversalMovementIds;
    this.write('receipts.json',receiptDb);
    this.event(id,'receipt_reversed',actorName,{receiptId:receipt.id,receiptNumber:receipt.receiptNumber,value:receipt.value,principalValue:principal,reason:why,balanceAfter:title.openBalance,cashReversalMovementIds:reversalMovementIds});
    return {item:this.get(id),receipt};
  }

  cancel(id, reason='', actor='painel') {
    const db=this.read('receivables.json'); const item=(db.items||[]).find(i=>i.id===id); if(!item) throw new Error('Título não encontrado.');
    if (['cancelled','reversed'].includes(item.status)) return this.get(id);
    const activeReceipts=this.receipts(id).filter(receipt=>receipt.status!=='reversed'&&receipt.reversalStatus!=='reversed');
    if (activeReceipts.length) throw new Error('Título com recebimento não pode ser cancelado. Estorne os recebimentos primeiro.');

    const cancelledAt=now();
    const previousOpenBalance=amount(item.openBalance||0);
    item.status='cancelled'; item.cancelReason=clean(reason); item.cancelledAt=cancelledAt; item.cancelledBy=actor;
    item.cancelledOpenBalance=previousOpenBalance; item.openBalance=0; item.updatedAt=cancelledAt; item.updatedBy=actor;
    this.write('receivables.json',db);

    const installmentsDb=this.read('receivable-installments.json');
    for (const installment of installmentsDb.items||[]) {
      if (installment.receivableId!==id || ['cancelled','reversed'].includes(installment.status)) continue;
      installment.cancelledOpenBalance=amount(installment.openBalance||0);
      installment.openBalance=0;
      installment.status='cancelled';
      installment.cancelledAt=cancelledAt;
      installment.cancelledBy=actor;
      installment.updatedAt=cancelledAt;
      installment.updatedBy=actor;
    }
    this.write('receivable-installments.json',installmentsDb);
    this.event(id,'cancelled',actor,{reason:clean(reason),cancelledOpenBalance:previousOpenBalance});
    return this.get(id);
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
