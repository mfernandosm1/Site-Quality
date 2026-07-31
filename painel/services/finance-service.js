import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CATALOGS = {
  accounts: 'chart-of-accounts.json',
  categories: 'categories.json',
  natures: 'natures.json',
  costCenters: 'cost-centers.json',
  statuses: 'statuses.json',
  origins: 'origins.json',
  paymentMethods: 'payment-methods.json'
};

const DEFAULTS = {
  accounts: [
    { id:'ACC-RECEITAS', code:'1', name:'Receitas', type:'receita', parentId:null, active:true, system:true },
    { id:'ACC-VENDAS', code:'1.01', name:'Vendas de mercadorias', type:'receita', parentId:'ACC-RECEITAS', active:true, system:true },
    { id:'ACC-SERVICOS', code:'1.02', name:'Serviços e assistência técnica', type:'receita', parentId:'ACC-RECEITAS', active:true, system:true },
    { id:'ACC-DESPESAS', code:'2', name:'Despesas', type:'despesa', parentId:null, active:true, system:true },
    { id:'ACC-CMV', code:'2.01', name:'Custo das mercadorias vendidas', type:'despesa', parentId:'ACC-DESPESAS', active:true, system:true },
    { id:'ACC-OPERACIONAIS', code:'2.02', name:'Despesas operacionais', type:'despesa', parentId:'ACC-DESPESAS', active:true, system:true },
    { id:'ACC-FINANCEIRAS', code:'2.03', name:'Despesas financeiras', type:'despesa', parentId:'ACC-DESPESAS', active:true, system:true }
  ],
  categories: [
    { id:'CAT-VENDAS', name:'Vendas', nature:'receita', active:true, system:true },
    { id:'CAT-SERVICOS', name:'Serviços', nature:'receita', active:true, system:true },
    { id:'CAT-FORNECEDORES', name:'Fornecedores', nature:'despesa', active:true, system:true },
    { id:'CAT-OPERACIONAL', name:'Operacional', nature:'despesa', active:true, system:true }
  ],
  natures: [
    { id:'NAT-RECEITA', name:'Receita', direction:'entrada', active:true, system:true },
    { id:'NAT-DESPESA', name:'Despesa', direction:'saida', active:true, system:true },
    { id:'NAT-TRANSFERENCIA', name:'Transferência', direction:'neutra', active:true, system:true },
    { id:'NAT-AJUSTE', name:'Ajuste', direction:'neutra', active:true, system:true },
    { id:'NAT-ESTORNO', name:'Estorno', direction:'neutra', active:true, system:true }
  ],
  costCenters: [
    { id:'CC-GERAL', code:'01', name:'Operação geral', parentId:null, active:true, system:true },
    { id:'CC-LOJA', code:'01.01', name:'Loja', parentId:'CC-GERAL', active:true, system:true },
    { id:'CC-ASSISTENCIA', code:'01.02', name:'Assistência técnica', parentId:'CC-GERAL', active:true, system:true }
  ],
  statuses: [
    { id:'STS-ABERTO', name:'Em aberto', key:'open', active:true, system:true },
    { id:'STS-PARCIAL', name:'Pago parcialmente', key:'partial', active:true, system:true },
    { id:'STS-PAGO', name:'Pago', key:'paid', active:true, system:true },
    { id:'STS-VENCIDO', name:'Vencido', key:'overdue', active:true, system:true },
    { id:'STS-CANCELADO', name:'Cancelado', key:'cancelled', active:true, system:true },
    { id:'STS-ESTORNADO', name:'Estornado', key:'reversed', active:true, system:true },
    { id:'STS-PROCESSANDO', name:'Em processamento', key:'processing', active:true, system:true }
  ],
  origins: [
    { id:'ORG-MANUAL', name:'Lançamento manual', module:'financeiro', active:true, system:true },
    { id:'ORG-PDV', name:'PDV', module:'pdv', active:true, system:true },
    { id:'ORG-OS', name:'Ordem de serviço', module:'os', active:true, system:true },
    { id:'ORG-COMPRA', name:'Compra', module:'compras', active:true, system:true },
    { id:'ORG-CAIXA', name:'Caixa', module:'caixa', active:true, system:true },
    { id:'ORG-IMPORTACAO', name:'Importação', module:'importacao', active:true, system:true }
  ],
  paymentMethods: [
    { id:'PM-DINHEIRO', name:'Dinheiro', code:'DIN', active:true, autoSettle:true, eventType:'cash', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:0, system:true },
    { id:'PM-PIX', name:'PIX', code:'PIX', active:true, autoSettle:true, eventType:'bank', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:0, system:true },
    { id:'PM-CREDITO', name:'Cartão de crédito', code:'CRED', active:true, autoSettle:false, eventType:'receivable', modules:{ sales:true, purchases:false, pdv:true, serviceOrders:true, finance:true }, allowInstallments:true, maxInstallments:18, settlementDays:30, system:true },
    { id:'PM-DEBITO', name:'Cartão de débito', code:'DEB', active:true, autoSettle:false, eventType:'receivable', modules:{ sales:true, purchases:false, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:1, system:true },
    { id:'PM-BOLETO', name:'Boleto / crediário', code:'BOL', active:true, autoSettle:false, eventType:'title', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:true, maxInstallments:36, settlementDays:0, firstDueDays:30, installmentIntervalDays:30, generatesReceivable:true, requireIdentifiedCustomer:true, requireValidDocument:true, requireCreditReceipt:true, system:true }
  ],
  stores: [
    { id:'STORE-MAIN', name:'Loja principal', code:'MATRIZ', active:true, system:true }
  ]
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function now() { return new Date().toISOString(); }
function clean(value) { return String(value ?? '').trim(); }
function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === '1' || value === 1 || value === 'on';
}

export default class FinanceService {
  constructor({ dataDir }) {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensureFoundation();
    this.migrateFoundation();
  }

  file(name) { return path.join(this.dataDir, name); }
  readFile(name, fallback = { items:[] }) {
    try { return JSON.parse(fs.readFileSync(this.file(name), 'utf8')); } catch (_) { return clone(fallback); }
  }
  writeFile(name, data) {
    const target = this.file(name);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, target);
  }
  ensureFoundation() {
    for (const [catalog, filename] of Object.entries(CATALOGS)) {
      if (!fs.existsSync(this.file(filename))) this.writeFile(filename, { version:'0.16.2', items:clone(DEFAULTS[catalog]) });
    }
    for (const filename of ['entries.json','installments.json','payments.json','movements.json','audit.json','receivables.json','receivable-events.json','receivable-installments.json','receipts.json']) {
      if (!fs.existsSync(this.file(filename))) this.writeFile(filename, { version:'0.16.2', items:[] });
    }
    if (!fs.existsSync(this.file('settings.json'))) this.writeFile('settings.json', {
      version:'0.16.2', currency:'BRL', defaultStoreId:'STORE-MAIN', multiStoreReady:true,
      competenceRequired:true, cashFlowSource:'movements', updatedAt:now()
    });
  }
  migrateFoundation() {
    const categories = this.readFile(CATALOGS.categories, { items:[] }).items || [];
    const accountsDb = this.readFile(CATALOGS.accounts, { items:[] });
    const accounts = accountsDb.items || [];
    const categoryById = new Map(categories.map(item => [item.id, item]));
    const mapping = {
      'ACC-RECEITAS':'CAT-VENDAS', 'ACC-VENDAS':'CAT-VENDAS', 'ACC-SERVICOS':'CAT-SERVICOS',
      'ACC-DESPESAS':'CAT-OPERACIONAL', 'ACC-CMV':'CAT-FORNECEDORES',
      'ACC-OPERACIONAIS':'CAT-OPERACIONAL', 'ACC-FINANCEIRAS':'CAT-OPERACIONAL'
    };
    let changed = false;
    for (const account of accounts) {
      if (!account.categoryId) {
        account.categoryId = mapping[account.id] || (account.type === 'receita' ? 'CAT-VENDAS' : 'CAT-OPERACIONAL');
        changed = true;
      }
      const category = categoryById.get(account.categoryId);
      if (category?.nature && account.type !== category.nature) { account.type = category.nature; changed = true; }
      if (account.parentId) { account.parentId = null; changed = true; }
    }
    if (changed) { accountsDb.items = accounts; accountsDb.updatedAt = now(); this.writeFile(CATALOGS.accounts, accountsDb); }

    const methodsDb = this.readFile(CATALOGS.paymentMethods, { items:[] });
    let methodsChanged = false;
    for (const method of methodsDb.items || []) {
      const marker = clean(`${method.id} ${method.code} ${method.name}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if ((marker.includes('boleto') || marker.includes('crediario')) && method.system === true) {
        const defaults = { generatesReceivable:true, requireIdentifiedCustomer:true, requireValidDocument:true, requireCreditReceipt:true, firstDueDays:30, installmentIntervalDays:30 };
        for (const [key,value] of Object.entries(defaults)) if (method[key] === undefined) { method[key]=value; methodsChanged=true; }
      }
    }
    if (methodsChanged) { methodsDb.updatedAt=now(); this.writeFile(CATALOGS.paymentMethods, methodsDb); }
  }
  listCatalog(catalog, { includeInactive=true } = {}) {
    const filename = CATALOGS[catalog];
    if (!filename) throw new Error('Cadastro financeiro inválido.');
    const items = this.readFile(filename).items || [];
    return items.filter(item => includeInactive || item.active !== false)
      .sort((a,b) => clean(a.code || a.name).localeCompare(clean(b.code || b.name), 'pt-BR', { numeric:true }));
  }
  saveCatalogItem(catalog, payload={}, actor='painel') {
    const filename = CATALOGS[catalog];
    if (!filename) throw new Error('Cadastro financeiro inválido.');
    const db = this.readFile(filename);
    const items = db.items || [];
    const id = clean(payload.id) || `${catalog.slice(0,3).toUpperCase()}-${crypto.randomUUID()}`;
    const index = items.findIndex(item => item.id === id);
    const existing = index >= 0 ? items[index] : {};
    const name = clean(payload.name);
    if (!name) throw new Error('Informe o nome.');
    const duplicate = items.find(item => item.id !== id && clean(item.name).toLowerCase() === name.toLowerCase());
    if (duplicate) throw new Error('Já existe um cadastro com este nome.');

    const base = {
      ...existing, ...payload, id, name,
      code: clean(payload.code || existing.code),
      active: bool(payload.active, existing.active !== false),
      parentId: clean(payload.parentId || existing.parentId) || null,
      updatedAt:now(), updatedBy:actor
    };
    if (!existing.createdAt) { base.createdAt = now(); base.createdBy = actor; }
    if (catalog === 'accounts') {
      base.categoryId = clean(payload.categoryId || existing.categoryId) || null;
      base.parentId = null; // v0.16.2: planos ficam diretamente dentro do centro de custo
      if (!base.categoryId) throw new Error('Selecione o Centro de Custo do Plano de Conta.');
      const category = this.listCatalog('categories').find(item => item.id === base.categoryId);
      if (!category) throw new Error('Centro de Custo não encontrado.');
      base.type = category.nature || payload.type || existing.type || 'despesa';
    }
    if (catalog === 'paymentMethods') {
      base.autoSettle = bool(payload.autoSettle, existing.autoSettle === true);
      base.allowInstallments = bool(payload.allowInstallments, existing.allowInstallments === true);
      base.maxInstallments = Math.max(1, Number(payload.maxInstallments || existing.maxInstallments || 1));
      base.settlementDays = Math.max(0, Number(payload.settlementDays ?? existing.settlementDays ?? 0));
      base.minimumInstallmentValue = Math.max(0, Number(payload.minimumInstallmentValue ?? existing.minimumInstallmentValue ?? 0));
      base.feePercent = Math.max(0, Number(payload.feePercent ?? existing.feePercent ?? 0));
      base.monthlyInterestPercent = Math.max(0, Number(payload.monthlyInterestPercent ?? existing.monthlyInterestPercent ?? 0));
      base.firstDueDays = Math.max(0, Number(payload.firstDueDays ?? existing.firstDueDays ?? 0));
      base.passInterestToCustomer = bool(payload.passInterestToCustomer, existing.passInterestToCustomer === true);
      base.changeAllowed = bool(payload.changeAllowed, existing.changeAllowed === true);
      base.nfcePaymentCode = clean(payload.nfcePaymentCode ?? existing.nfcePaymentCode);
      base.fiscalType = clean(payload.fiscalType ?? existing.fiscalType) || 'other';
      base.acquirerCode = clean(payload.acquirerCode ?? existing.acquirerCode);
      base.cardBrandRequired = bool(payload.cardBrandRequired, existing.cardBrandRequired === true);
      base.generatesReceivable = bool(payload.generatesReceivable, existing.generatesReceivable === true);
      base.requireIdentifiedCustomer = bool(payload.requireIdentifiedCustomer, existing.requireIdentifiedCustomer === true);
      base.requireValidDocument = bool(payload.requireValidDocument, existing.requireValidDocument === true);
      base.requireCreditReceipt = bool(payload.requireCreditReceipt, existing.requireCreditReceipt === true);
      base.installmentIntervalDays = Math.max(1, Number(payload.installmentIntervalDays ?? existing.installmentIntervalDays ?? 30));
      base.lateGraceDays = Math.max(0, Number(payload.lateGraceDays ?? existing.lateGraceDays ?? 0));
      base.lateFineFixed = Math.max(0, Number(payload.lateFineFixed ?? existing.lateFineFixed ?? 0));
      base.lateFinePercent = Math.max(0, Number(payload.lateFinePercent ?? existing.lateFinePercent ?? 0));
      base.lateInterestPercent = Math.max(0, Number(payload.lateInterestPercent ?? existing.lateInterestPercent ?? 0));
      base.lateInterestPeriod = ['daily','monthly'].includes(payload.lateInterestPeriod) ? payload.lateInterestPeriod : (existing.lateInterestPeriod || 'daily');
      base.lateInterestType = ['simple','compound'].includes(payload.lateInterestType) ? payload.lateInterestType : (existing.lateInterestType || 'simple');
      base.lateAdministrativeFeePercent = Math.max(0, Number(payload.lateAdministrativeFeePercent ?? existing.lateAdministrativeFeePercent ?? 0));
      const installmentRates = Array.isArray(payload.installmentRates) ? payload.installmentRates : (existing.installmentRates || []);
      base.installmentRates = installmentRates.map(row => ({
        installments:Math.max(1, Number(row.installments || 1)),
        fixedFee:Math.max(0, Number(row.fixedFee || 0)),
        feePercent:Math.max(0, Number(row.feePercent || 0)),
        customerInterestPercent:Math.max(0, Number(row.customerInterestPercent || 0)),
        active:bool(row.active, true)
      })).filter((row,index,array) => array.findIndex(item => item.installments === row.installments) === index)
        .sort((a,b) => a.installments-b.installments);
      // Regra interna: a interface não expõe termos técnicos como "evento gerado".
      // O FinanceService infere o comportamento conforme baixa e prazo.
      base.eventType = existing.eventType || (base.autoSettle ? (base.settlementDays > 0 ? 'bank' : 'cash') : (base.allowInstallments ? 'title' : 'receivable'));
      const modules = payload.modules || {};
      base.modules = {
        sales:bool(modules.sales), purchases:bool(modules.purchases), pdv:bool(modules.pdv),
        serviceOrders:bool(modules.serviceOrders), finance:bool(modules.finance)
      };
    }
    if (index >= 0) items[index] = base; else items.push(base);
    db.items = items;
    this.writeFile(filename, db);
    this.audit('catalog_saved', { catalog, itemId:id, actor, after:base });
    return base;
  }
  setCatalogActive(catalog, id, active, actor='painel') {
    const filename = CATALOGS[catalog];
    if (!filename) throw new Error('Cadastro financeiro inválido.');
    const db = this.readFile(filename);
    const item = (db.items || []).find(row => row.id === id);
    if (!item) throw new Error('Registro não encontrado.');
    item.active = !!active; item.updatedAt = now(); item.updatedBy = actor;
    this.writeFile(filename, db);
    this.audit('catalog_status_changed', { catalog, itemId:id, active:!!active, actor });
    return item;
  }
  getFoundation() {
    const catalogs = {};
    for (const key of Object.keys(CATALOGS)) catalogs[key] = this.listCatalog(key);
    return { version:'0.17.1', catalogs, settings:this.readFile('settings.json', {}), summary:this.summary(), dashboard:this.financialDashboardSummary() };
  }
  summary() {
    const result = {};
    for (const key of Object.keys(CATALOGS)) {
      const items = this.listCatalog(key);
      result[key] = { total:items.length, active:items.filter(item => item.active !== false).length };
    }
    result.entries = (this.readFile('entries.json').items || []).length;
    result.installments = (this.readFile('installments.json').items || []).length;
    result.payments = (this.readFile('payments.json').items || []).length;
    result.movements = (this.readFile('movements.json').items || []).length;
    result.receivables = (this.readFile('receivables.json').items || []).length;
    result.receivableEvents = (this.readFile('receivable-events.json').items || []).length;
    return result;
  }

  registerReceivableReceipt({ receipt, title, installment=null, operation=null, cashSession=null, cashboxId='', actor='painel' } = {}) {
    if (!receipt?.id || !title?.id) throw new Error('Dados do recebimento financeiro incompletos.');
    const requestKey = clean(receipt.requestKey || receipt.id);
    const movementsDb = this.readFile('movements.json', { version:'0.17.1', items:[] });
    const existingMovements = (movementsDb.items || []).filter(item => item.receiptId === receipt.id || (requestKey && item.idempotencyKey === requestKey));
    if (existingMovements.length) {
      const entries = (this.readFile('entries.json', { items:[] }).items || []).filter(item => item.receiptId === receipt.id || item.idempotencyKey === requestKey);
      const payments = (this.readFile('payments.json', { items:[] }).items || []).filter(item => item.receiptId === receipt.id || item.idempotencyKey === requestKey);
      return { duplicated:true, entries, payments, movements:existingMovements };
    }

    const receivedAt = clean(receipt.receivedAt) || now().slice(0,10);
    const common = {
      receiptId:receipt.id, receiptNumber:receipt.receiptNumber, receivableId:title.id,
      installmentId:clean(receipt.installmentId), operationId:clean(title.originId),
      operationType:clean(title.origin), customerId:title.customerId, customerName:title.customerName,
      cashSessionId:cashSession?.id || '', cashboxId:clean(cashboxId), operator:clean(actor) || 'painel',
      idempotencyKey:requestKey, occurredAt:receipt.receivedDateTime || receipt.createdAt || now(),
      movementDate:receivedAt, competenceDate:title.competenceDate || title.issueDate || receivedAt,
      status:'posted', source:'receivable_receipt', reversible:true
    };
    const entriesDb = this.readFile('entries.json', { version:'0.17.1', items:[] });
    const paymentsDb = this.readFile('payments.json', { version:'0.17.1', items:[] });
    entriesDb.items = entriesDb.items || [];
    paymentsDb.items = paymentsDb.items || [];
    movementsDb.items = movementsDb.items || [];

    const entry = {
      id:`FEN-${crypto.randomUUID()}`, ...common, type:'income', natureId:'NAT-RECEITA',
      originId:title.origin === 'service_order' ? 'ORG-OS' : 'ORG-PDV',
      accountId:title.accountId || (title.origin === 'service_order' ? 'ACC-SERVICOS' : 'ACC-VENDAS'),
      costCenterId:title.costCenterId || (title.origin === 'service_order' ? 'CC-ASSISTENCIA' : 'CC-LOJA'),
      description:`Recebimento ${receipt.receiptNumber} · Título ${title.number} · ${title.customerName}`,
      grossValue:Number(receipt.value || 0), principalValue:Number(receipt.principalValue || 0),
      interest:Number(receipt.interest || 0), fine:Number(receipt.fine || 0), discount:Number(receipt.discount || 0),
      balanceAfter:Number(receipt.balanceAfter || 0), createdAt:now(), createdBy:clean(actor) || 'painel'
    };
    entriesDb.items.unshift(entry);

    const financePayments=[];
    const financeMovements=[];
    for (const [index, payment] of (receipt.payments || []).entries()) {
      const paymentRecord = {
        id:`FPY-${crypto.randomUUID()}`, ...common, entryId:entry.id, sequence:index+1,
        paymentMethodId:payment.paymentMethodId, paymentMethodName:payment.paymentMethodName,
        value:Number(payment.value || 0), createdAt:now(), createdBy:clean(actor) || 'painel'
      };
      const movement = {
        id:`FMV-${crypto.randomUUID()}`, ...common, entryId:entry.id, financePaymentId:paymentRecord.id,
        direction:'entrada', type:'receipt', natureId:'NAT-RECEITA',
        paymentMethodId:payment.paymentMethodId, paymentMethodName:payment.paymentMethodName,
        value:Number(payment.value || 0), signedValue:Number(payment.value || 0),
        description:`${payment.paymentMethodName} · Recebimento ${receipt.receiptNumber} · Título ${title.number}`,
        createdAt:now(), createdBy:clean(actor) || 'painel'
      };
      paymentsDb.items.unshift(paymentRecord);
      movementsDb.items.unshift(movement);
      financePayments.push(paymentRecord);
      financeMovements.push(movement);
    }

    entriesDb.version='0.17.1'; paymentsDb.version='0.17.1'; movementsDb.version='0.17.1';
    this.writeFile('entries.json', entriesDb);
    this.writeFile('payments.json', paymentsDb);
    this.writeFile('movements.json', movementsDb);
    this.audit('receivable_receipt_posted', { receiptId:receipt.id, receivableId:title.id, entryId:entry.id, movementIds:financeMovements.map(item=>item.id), actor });
    return { duplicated:false, entries:[entry], payments:financePayments, movements:financeMovements };
  }


  registerPayablePayment({ payment, title, installment=null, actor='painel' } = {}) {
    if (!payment?.id || !title?.id) throw new Error('Dados do pagamento financeiro incompletos.');
    const requestKey = clean(payment.requestKey || payment.id);
    const movementsDb = this.readFile('movements.json', { version:'0.18.0', items:[] });
    const existingMovements = (movementsDb.items || []).filter(item => item.payablePaymentId === payment.id || (requestKey && item.idempotencyKey === requestKey));
    if (existingMovements.length) {
      const entries = (this.readFile('entries.json', { items:[] }).items || []).filter(item => item.payablePaymentId === payment.id || item.idempotencyKey === requestKey);
      const payments = (this.readFile('payments.json', { items:[] }).items || []).filter(item => item.payablePaymentId === payment.id || item.idempotencyKey === requestKey);
      return { duplicated:true, entries, payments, movements:existingMovements };
    }
    const paidAt=clean(payment.paidAt)||now().slice(0,10);
    const common={ payablePaymentId:payment.id, payableId:title.id, installmentId:clean(payment.installmentId), supplierId:clean(title.supplierId), supplierName:title.supplierName,
      idempotencyKey:requestKey, occurredAt:payment.createdAt||now(), movementDate:paidAt, competenceDate:title.competenceDate||title.issueDate||paidAt,
      status:'posted', source:'payable_payment', reversible:true, operator:clean(actor)||'painel' };
    const entriesDb=this.readFile('entries.json',{version:'0.18.0',items:[]});
    const paymentsDb=this.readFile('payments.json',{version:'0.18.0',items:[]});
    entriesDb.items=entriesDb.items||[]; paymentsDb.items=paymentsDb.items||[]; movementsDb.items=movementsDb.items||[];
    const entry={ id:`FEN-${crypto.randomUUID()}`,...common,type:'expense',natureId:'NAT-DESPESA',originId:'ORG-MANUAL',accountId:title.accountId||'',costCenterId:title.costCenterId||'',
      description:`Pagamento ${payment.paymentNumber} · ${title.number} · ${title.description}`,grossValue:Number(payment.value||0),principalValue:Number(payment.principalValue||0),interest:Number(payment.interest||0),fine:Number(payment.fine||0),discount:Number(payment.discount||0),balanceAfter:Number(payment.balanceAfter||0),createdAt:now(),createdBy:clean(actor)||'painel' };
    entriesDb.items.unshift(entry);
    const financePayments=[]; const financeMovements=[];
    for (const [index,row] of (payment.payments||[]).entries()) {
      const paymentRecord={ id:`FPY-${crypto.randomUUID()}`,...common,entryId:entry.id,sequence:index+1,paymentMethodId:row.paymentMethodId,paymentMethodName:row.paymentMethodName,value:Number(row.value||0),createdAt:now(),createdBy:clean(actor)||'painel' };
      const movement={ id:`FMV-${crypto.randomUUID()}`,...common,entryId:entry.id,financePaymentId:paymentRecord.id,direction:'saida',type:'payment',natureId:'NAT-DESPESA',paymentMethodId:row.paymentMethodId,paymentMethodName:row.paymentMethodName,value:Number(row.value||0),signedValue:-Math.abs(Number(row.value||0)),description:`${row.paymentMethodName} · Pagamento ${payment.paymentNumber} · ${title.number}`,createdAt:now(),createdBy:clean(actor)||'painel' };
      paymentsDb.items.unshift(paymentRecord); movementsDb.items.unshift(movement); financePayments.push(paymentRecord); financeMovements.push(movement);
    }
    entriesDb.version='0.18.0'; paymentsDb.version='0.18.0'; movementsDb.version='0.18.0';
    this.writeFile('entries.json',entriesDb); this.writeFile('payments.json',paymentsDb); this.writeFile('movements.json',movementsDb);
    this.audit('payable_payment_posted',{payablePaymentId:payment.id,payableId:title.id,entryId:entry.id,movementIds:financeMovements.map(item=>item.id),actor});
    return {duplicated:false,entries:[entry],payments:financePayments,movements:financeMovements};
  }

  financialDashboardSummary(referenceDate='') {
    const date = clean(referenceDate) || new Date().toISOString().slice(0,10);
    const month = date.slice(0,7);
    const movements = (this.readFile('movements.json', { items:[] }).items || []).filter(item => item.status !== 'reversed');
    const income = movements.filter(item => item.direction === 'entrada');
    const expense = movements.filter(item => item.direction === 'saida');
    const sum = items => Math.round(items.reduce((total,item)=>total+Number(item.value || 0),0)*100)/100;
    return {
      today:{ income:sum(income.filter(item=>item.movementDate===date)), expense:sum(expense.filter(item=>item.movementDate===date)) },
      month:{ income:sum(income.filter(item=>clean(item.movementDate).slice(0,7)===month)), expense:sum(expense.filter(item=>clean(item.movementDate).slice(0,7)===month)) },
      balance:Math.round((sum(income)-sum(expense))*100)/100,
      movementCount:movements.length,
      updatedAt:now()
    };
  }

  audit(action, data={}) {
    const db = this.readFile('audit.json');
    db.items = db.items || [];
    db.items.unshift({ id:`AUD-${crypto.randomUUID()}`, action, at:now(), ...data });
    db.items = db.items.slice(0, 5000);
    this.writeFile('audit.json', db);
  }
}
