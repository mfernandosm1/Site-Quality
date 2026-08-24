import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CATALOGS = {
  accounts: 'chart-of-accounts.json',
  dreGroups: 'dre-groups.json',
  categories: 'categories.json',
  natures: 'natures.json',
  costCenters: 'cost-centers.json',
  statuses: 'statuses.json',
  origins: 'origins.json',
  paymentMethods: 'payment-methods.json'
};

const DEFAULTS = {
  dreGroups: [{"id":"DRE-RB","code":"01","name":"Receita Bruta","kind":"income","operation":"add","order":10,"active":true,"system":true},{"id":"DRE-DED","code":"02","name":"Deduções da Receita","kind":"deduction","operation":"subtract","order":20,"active":true,"system":true},{"id":"DRE-CMV","code":"03","name":"Custos das Vendas (CMV)","kind":"cost","operation":"subtract","order":30,"active":true,"system":true},{"id":"DRE-DO","code":"04","name":"Despesas Operacionais","kind":"expense","operation":"subtract","order":40,"active":true,"system":true},{"id":"DRE-RF","code":"05","name":"Receitas Financeiras","kind":"income","operation":"add","order":50,"active":true,"system":true},{"id":"DRE-DF","code":"06","name":"Despesas Financeiras","kind":"expense","operation":"subtract","order":60,"active":true,"system":true},{"id":"DRE-OR","code":"07","name":"Outras Receitas","kind":"income","operation":"add","order":70,"active":true,"system":true},{"id":"DRE-OD","code":"08","name":"Outras Despesas","kind":"expense","operation":"subtract","order":80,"active":true,"system":true}],
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
    { id:'PM-DINHEIRO', name:'Dinheiro', code:'DIN', active:true, salesPaid:true, purchasePaid:true, creditCashOnSale:true, debitCashOnPurchase:true, autoSettle:true, eventType:'cash', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:0, system:true },
    { id:'PM-PIX', name:'PIX', code:'PIX', active:true, salesPaid:true, purchasePaid:true, creditCashOnSale:true, debitCashOnPurchase:true, autoSettle:true, eventType:'bank', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:0, system:true },
    { id:'PM-CREDITO', name:'Cartão de crédito', code:'CRED', active:true, salesPaid:false, purchasePaid:false, creditCashOnSale:true, debitCashOnPurchase:true, autoSettle:false, eventType:'receivable', modules:{ sales:true, purchases:false, pdv:true, serviceOrders:true, finance:true }, allowInstallments:true, maxInstallments:18, settlementDays:30, system:true },
    { id:'PM-DEBITO', name:'Cartão de débito', code:'DEB', active:true, salesPaid:false, purchasePaid:false, creditCashOnSale:true, debitCashOnPurchase:true, autoSettle:false, eventType:'receivable', modules:{ sales:true, purchases:false, pdv:true, serviceOrders:true, finance:true }, allowInstallments:false, maxInstallments:1, settlementDays:1, system:true },
    { id:'PM-BOLETO', name:'Boleto / crediário', code:'BOL', active:true, salesPaid:false, purchasePaid:false, creditCashOnSale:true, debitCashOnPurchase:true, autoSettle:false, eventType:'title', modules:{ sales:true, purchases:true, pdv:true, serviceOrders:true, finance:true }, allowInstallments:true, maxInstallments:36, settlementDays:0, firstDueDays:30, installmentIntervalDays:30, generatesReceivable:true, requireIdentifiedCustomer:true, requireValidDocument:true, requireCreditReceipt:true, system:true }
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
    this._jsonCache = new Map();
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensureFoundation();
    this.migrateFoundation();
  }

  file(name) { return path.join(this.dataDir, name); }
  readFile(name, fallback = { items:[] }) {
    const target=this.file(name);
    try{
      const stat=fs.statSync(target),cached=this._jsonCache.get(target);
      if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
      const data=JSON.parse(fs.readFileSync(target,'utf8'));
      this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});
      return data;
    }catch(_){return clone(fallback);}
  }
  writeFile(name, data) {
    const target = this.file(name);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, target);
    try{const stat=fs.statSync(target);this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){this._jsonCache.delete(target);}
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

    // O Grupo DRE pertence à estrutura do Centro de Custo. Os planos de conta
    // herdam essa classificação e o operador não precisa escolher a mesma regra
    // novamente em cada plano. Para bases antigas, preservamos o grupo já usado
    // pelos planos filhos e gravamos essa informação no centro.
    const centersDb = this.readFile(CATALOGS.costCenters, { items:[] });
    let centersChanged = false;
    for (const center of centersDb.items || []) {
      if (center.dreGroupId) continue;
      const childGroups = accounts
        .filter(account => clean(account.costCenterId || account.categoryId) === clean(center.id) && clean(account.dreGroupId))
        .map(account => clean(account.dreGroupId));
      const counts = childGroups.reduce((map,id) => map.set(id,(map.get(id)||0)+1), new Map());
      const inherited = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
      center.dreGroupId = inherited || (center.nature === 'receita' ? 'DRE-RB' : center.id === 'CC-CMV' || center.id === 'CC-VEICULOS' ? 'DRE-CMV' : center.id === 'CC-FINANCEIRO' ? 'DRE-DF' : 'DRE-DO');
      centersChanged = true;
    }
    if (centersChanged) { centersDb.updatedAt=now(); this.writeFile(CATALOGS.costCenters, centersDb); }

    // Completa automaticamente códigos ausentes em Planos de Conta legados/recém-criados.
    // Faz isso depois de carregar os Centros para manter a numeração por grupo.
    let accountCodesChanged = false;
    const centerByIdForCodes = new Map((centersDb.items || []).map(center => [clean(center.id), center]));
    for (const account of accounts) {
      if (clean(account.code)) continue;
      const center = centerByIdForCodes.get(clean(account.costCenterId || account.categoryId));
      if (!center) continue;
      account.code = this.nextAccountCode(center, accounts.filter(item => item.id !== account.id));
      accountCodesChanged = true;
    }
    if (accountCodesChanged) { accountsDb.items = accounts; accountsDb.updatedAt = now(); this.writeFile(CATALOGS.accounts, accountsDb); }

    const methodsDb = this.readFile(CATALOGS.paymentMethods, { items:[] });
    let methodsChanged = false;
    for (const method of methodsDb.items || []) {
      // V17: parâmetros independentes para Venda e para Compras/Contas a Pagar.
      // `autoSettle` permanece apenas como alias legado de "Pago na venda".
      if (method.salesPaid === undefined) {
        method.salesPaid = method.autoSettle === true;
        methodsChanged = true;
      }
      if (method.purchasePaid === undefined) {
        // Migração conservadora: evita que cartões usados como pagos no PDV
        // sejam tratados como despesas automaticamente pagas.
        method.purchasePaid = method.autoSettle === true
          && method.modules?.purchases === true
          && method.allowInstallments !== true;
        methodsChanged = true;
      }
      if (method.creditCashOnSale === undefined) {
        method.creditCashOnSale = true;
        methodsChanged = true;
      }
      if (method.debitCashOnPurchase === undefined) {
        method.debitCashOnPurchase = true;
        methodsChanged = true;
      }
      if (method.autoSettle !== method.salesPaid) {
        method.autoSettle = method.salesPaid === true;
        methodsChanged = true;
      }
      const marker = clean(`${method.id} ${method.code} ${method.name}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const isCashMoney = method.id === 'PM-DINHEIRO' || clean(method.code).toUpperCase() === 'DIN' || clean(method.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() === 'dinheiro';
      if (isCashMoney && (method.salesPaid !== true || method.purchasePaid !== true || method.autoSettle !== true)) {
        method.salesPaid = true;
        method.purchasePaid = true;
        method.autoSettle = true;
        methodsChanged = true;
      }
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
  nextAccountCode(costCenter, accounts=[]) {
    const centerCode = clean(costCenter?.code).replace(/^0+(?=\d)/, '') || clean(costCenter?.code) || '0';
    const isIncome = clean(costCenter?.nature) === 'receita';
    const prefix = isIncome ? '1.' : `2.${centerCode}.`;
    const numbers = (accounts || []).map(item => clean(item.code)).filter(code => code.startsWith(prefix)).map(code => {
      const tail = code.slice(prefix.length).split('.')[0];
      return /^\d+$/.test(tail) ? Number(tail) : 0;
    }).filter(Boolean);
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return isIncome ? `1.${String(next).padStart(2,'0')}` : `${prefix}${String(next).padStart(2,'0')}`;
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
    if (catalog === 'costCenters') {
      base.nature = clean(payload.nature || existing.nature) || 'despesa';
      if (!clean(base.dreGroupId)) {
        const childGroups=this.listCatalog('accounts').filter(account=>clean(account.costCenterId||account.categoryId)===id&&clean(account.dreGroupId)).map(account=>clean(account.dreGroupId));
        const counts=childGroups.reduce((map,groupId)=>map.set(groupId,(map.get(groupId)||0)+1),new Map());
        const marker=clean(`${base.id} ${base.code} ${base.name}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const automaticGroup=base.nature==='receita'?'DRE-RB':(marker.includes('financeir')||marker.includes('bancar'))?'DRE-DF':(marker.includes('cmv')||marker.includes('mercadoria vendida')||marker.includes('revenda'))?'DRE-CMV':'DRE-DO';
        base.dreGroupId=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0] || automaticGroup;
      }
    }
    if (catalog === 'accounts') {
      base.costCenterId = clean(payload.costCenterId || payload.categoryId || existing.costCenterId || existing.categoryId) || null;
      base.categoryId = base.costCenterId; // compatibilidade com cadastros anteriores à v0.25.6
      base.parentId = null;
      if (!base.costCenterId) throw new Error('Selecione o Centro de Custo do Plano de Conta.');
      const costCenter = this.listCatalog('costCenters').find(item => item.id === base.costCenterId);
      if (!costCenter) throw new Error('Centro de Custo não encontrado.');
      // Código de Plano de Conta é responsabilidade do sistema. Em novos planos,
      // gera o próximo código dentro do Centro de Custo (ex.: 2.40.17).
      // Em edições, preserva o código já existente.
      if (!clean(existing.code)) base.code = this.nextAccountCode(costCenter, items.filter(item => item.id !== id));
      else base.code = clean(existing.code);
      base.type = costCenter.nature || payload.type || existing.type || 'despesa';
      // Centro de Custo + Plano de Conta formam uma única classificação operacional.
      // O Grupo DRE é herdado do Centro de Custo e deixa de ser uma escolha manual
      // repetida em cada plano.
      const centerMarker=clean(`${costCenter.id} ${costCenter.code} ${costCenter.name}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const automaticGroup=base.type==='receita'?'DRE-RB':(centerMarker.includes('financeir')||centerMarker.includes('bancar'))?'DRE-DF':(centerMarker.includes('cmv')||centerMarker.includes('mercadoria vendida')||centerMarker.includes('revenda'))?'DRE-CMV':'DRE-DO';
      base.dreGroupId = clean(costCenter.dreGroupId || existing.dreGroupId) || automaticGroup;
    }
    if (catalog === 'paymentMethods') {
      const isCashMoney = existing.id === 'PM-DINHEIRO' || clean(payload.code ?? existing.code).toUpperCase() === 'DIN' || clean(payload.name ?? existing.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() === 'dinheiro';
      base.salesPaid = isCashMoney ? true : bool(payload.salesPaid, existing.salesPaid ?? existing.autoSettle === true);
      base.purchasePaid = isCashMoney ? true : bool(payload.purchasePaid, existing.purchasePaid === true);
      base.creditCashOnSale = bool(payload.creditCashOnSale, existing.creditCashOnSale !== false);
      base.debitCashOnPurchase = bool(payload.debitCashOnPurchase, existing.debitCashOnPurchase !== false);
      // Compatibilidade: autoSettle representa somente o comportamento da venda.
      base.autoSettle = base.salesPaid === true;
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
      base.eventType = existing.eventType || (base.salesPaid ? (base.settlementDays > 0 ? 'bank' : 'cash') : (base.allowInstallments ? 'title' : 'receivable'));
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
        installments:Math.max(1,Number(payment.installments||1)||1),
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


  reverseReceivableReceipt({ receipt, title, reason='', actor='painel' } = {}) {
    if (!receipt?.id || !title?.id) throw new Error('Dados do recebimento para estorno incompletos.');
    const reversedAt=now();
    const mark=(fileName)=>{
      const db=this.readFile(fileName,{version:'0.23.6',items:[]}); db.items=db.items||[];
      let changed=0;
      for (const item of db.items) {
        if (item.receiptId!==receipt.id || item.status==='reversed') continue;
        item.status='reversed'; item.reversedAt=reversedAt; item.reversedBy=clean(actor)||'painel'; item.reverseReason=clean(reason); changed+=1;
      }
      if (changed) this.writeFile(fileName,db);
      return changed;
    };
    const result={entries:mark('entries.json'),payments:mark('payments.json'),movements:mark('movements.json')};
    this.audit('receivable_receipt_reversed',{receiptId:receipt.id,receivableId:title.id,reason:clean(reason),actor:clean(actor)||'painel',...result});
    return result;
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


  reversePayablePayment({ payment, title, reason='', actor='painel' } = {}) {
    if (!payment?.id || !title?.id) throw new Error('Dados do pagamento para estorno incompletos.');
    const reversedAt=now();
    const mark=(fileName)=>{
      const db=this.readFile(fileName,{version:'0.18.0',items:[]}); db.items=db.items||[];
      let changed=0;
      for (const item of db.items) {
        if (item.payablePaymentId!==payment.id || item.status==='reversed') continue;
        item.status='reversed'; item.reversedAt=reversedAt; item.reversedBy=clean(actor)||'painel'; item.reverseReason=clean(reason); changed+=1;
      }
      if (changed) this.writeFile(fileName,db);
      return changed;
    };
    const result={ entries:mark('entries.json'), payments:mark('payments.json'), movements:mark('movements.json') };
    this.audit('payable_payment_reversed',{payablePaymentId:payment.id,payableId:title.id,reason:clean(reason),actor:clean(actor)||'painel',...result});
    return result;
  }

  financialDashboardSummary(referenceDate='') {
    const date = clean(referenceDate) || new Date().toISOString().slice(0,10);
    const month = date.slice(0,7);
    const movements = (this.readFile('movements.json', { items:[] }).items || []).filter(item => !['reversed','cancelled','void'].includes(clean(item.status).toLowerCase()) && clean(item.reversalStatus).toLowerCase() !== 'reversed');
    const income = movements.filter(item => item.direction === 'entrada');
    const expense = movements.filter(item => item.direction === 'saida');
    const sum = items => Math.round(items.reduce((total,item)=>total+Number(item.openBalance ?? item.value ?? 0),0)*100)/100;
    const addDays = (value, days) => { const d = new Date(`${value}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };
    const current = new Date(`${date}T12:00:00`);
    const mondayOffset = (current.getDay()+6)%7;
    const weekStart = addDays(date, -mondayOffset);
    const weekEnd = addDays(weekStart, 6);
    const nextWeekStart = addDays(weekStart, 7);
    const nextWeekEnd = addDays(weekStart, 13);
    const payables = (this.readFile('payables.json', { items:[] }).items || []).filter(item => !['cancelled','reversed'].includes(item.status));
    const payableIds = new Set(payables.map(item=>item.id));
    const installments = (this.readFile('payable-installments.json', { items:[] }).items || []).filter(item => payableIds.has(item.payableId) && Number(item.openBalance || 0) > 0 && !['paid','cancelled','reversed'].includes(item.status));
    const commitment = (from,to) => { const rows=installments.filter(item=>item.dueDate>=from && item.dueDate<=to); return { count:rows.length, value:sum(rows), from, to }; };
    const overdueRows = installments.filter(item=>item.dueDate && item.dueDate<date);
    const next30End = addDays(date,30);
    const todayIncome=sum(income.filter(item=>item.movementDate===date));
    const todayExpense=sum(expense.filter(item=>item.movementDate===date));
    const monthIncome=sum(income.filter(item=>clean(item.movementDate).slice(0,7)===month));
    const monthExpense=sum(expense.filter(item=>clean(item.movementDate).slice(0,7)===month));
    const totalIncome=sum(income);
    const totalExpense=sum(expense);
    return {
      today:{ income:todayIncome, expense:todayExpense, balance:Math.round((todayIncome-todayExpense)*100)/100 },
      month:{ income:monthIncome, expense:monthExpense, balance:Math.round((monthIncome-monthExpense)*100)/100 },
      balance:Math.round((totalIncome-totalExpense)*100)/100,
      commitments:{
        overdue:{ count:overdueRows.length, value:sum(overdueRows) },
        thisWeek:commitment(date, weekEnd),
        nextWeek:commitment(nextWeekStart, nextWeekEnd),
        next30Days:commitment(date, next30End)
      },
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
