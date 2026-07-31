import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import InventoryService from '../services/inventory-service.js';
import CustomerService from '../services/customer-service.js';
import SupplierService from '../services/supplier-service.js';
import CompanyLookupService from '../services/company-lookup-service.js';
import CommerceService from '../services/commerce-service.js';
import OperationsCenterService from '../services/operations-center-service.js';
import ErpHistoryService from '../services/erp-history-service.js';
import FinanceService from '../services/finance-service.js';
import ReceivablesService from '../services/receivables-service.js';
import PayablesService from '../services/payables-service.js';
import PurchaseService from '../services/purchase-service.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');

function readJson(file, fallback = { items: [] }) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {
    return fallback;
  }
}


function writeJsonAtomic(file, data) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, file);
}

function userName(req) {
  return req.user?.name || req.user?.email || 'painel';
}

function getInventoryService(app) {
  if (app.locals.inventoryService) return app.locals.inventoryService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'inventory');
  app.locals.inventoryService = new InventoryService({ dataDir });
  console.log(`📦 Inventory Service: ${dataDir}`);
  return app.locals.inventoryService;
}

function getCustomerService(app) {
  if (app.locals.customerService) return app.locals.customerService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'customers');
  app.locals.customerService = new CustomerService({ dataDir });
  console.log(`👥 Customer Service: ${dataDir}`);
  return app.locals.customerService;
}

function getCompanyLookupService(app) {
  if (app.locals.companyLookupService) return app.locals.companyLookupService;
  app.locals.companyLookupService = new CompanyLookupService({ timeoutMs: 10000 });
  console.log('🏢 Company Lookup Service: BrasilAPI');
  return app.locals.companyLookupService;
}


function getCommerceService(app) {
  if (app.locals.commerceService) return app.locals.commerceService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'commerce');
  app.locals.commerceService = new CommerceService({ dataDir });
  console.log(`🛒 Commerce Service: ${dataDir}`);
  return app.locals.commerceService;
}



function getFinanceService(app) {
  if (app.locals.financeService) return app.locals.financeService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.financeService = new FinanceService({ dataDir });
  console.log(`💰 Finance Service: ${dataDir}`);
  return app.locals.financeService;
}

function getReceivablesService(app) {
  if (app.locals.receivablesService) return app.locals.receivablesService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.receivablesService = new ReceivablesService({
    dataDir,
    financeService: getFinanceService(app),
    customerService: getCustomerService(app),
    commerceService: getCommerceService(app)
  });
  console.log(`📥 Receivables Service: ${dataDir}`);
  return app.locals.receivablesService;
}


function getPayablesService(app) {
  if (app.locals.payablesService) return app.locals.payablesService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.payablesService = new PayablesService({
    dataDir,
    financeService:getFinanceService(app),
    supplierService:getSupplierService(app),
    commerceService:getCommerceService(app)
  });
  console.log(`📤 Payables Service: ${dataDir}`);
  return app.locals.payablesService;
}


function getPurchaseService(app) {
  if (app.locals.purchaseService) return app.locals.purchaseService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'purchases');
  const productsFile = path.join(app.locals.paths.CONTENT_DIR, 'products.json');
  app.locals.purchaseService = new PurchaseService({
    dataDir,
    productsFile,
    supplierService: getSupplierService(app),
    inventoryService: getInventoryService(app),
    payablesService: getPayablesService(app)
  });
  console.log(`🚚 Purchase Service: ${dataDir}`);
  return app.locals.purchaseService;
}

function getOperationsCenterService(app) {
  if (app.locals.operationsCenterService) return app.locals.operationsCenterService;
  app.locals.operationsCenterService = new OperationsCenterService({
    panelDir: PANEL_DIR,
    commerceService: getCommerceService(app),
    customerService: getCustomerService(app),
    commerceService: getCommerceService(app)
  });
  return app.locals.operationsCenterService;
}

function getErpHistoryService(app) {
  if (app.locals.erpHistoryService) return app.locals.erpHistoryService;
  app.locals.erpHistoryService = new ErpHistoryService({ kernelService: app.locals.kernelService });
  return app.locals.erpHistoryService;
}

function getSupplierService(app) {
  if (app.locals.supplierService) return app.locals.supplierService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'suppliers');
  app.locals.supplierService = new SupplierService({ dataDir });
  console.log(`🏭 Supplier Service: ${dataDir}`);
  return app.locals.supplierService;
}

function formatDocument(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits;
}

function formatPhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return digits;
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}


const MODULES = [
  { key: 'clientes', name: 'Clientes', icon: '👥', description: 'Cadastro mestre e histórico único do cliente.', status: 'ativo' },
  { key: 'produtos', name: 'Produtos', icon: '📦', description: 'Cadastro mestre integrado ao site, estoque, PDV e orçamentos.', status: 'planejado' },
  { key: 'fornecedores', name: 'Fornecedores', icon: '🏭', description: 'Cadastro mestre integrado a produtos, compras, estoque e financeiro.', status: 'ativo' },
  { key: 'ordens-servico', name: 'Ordens de Serviço', icon: '🛠️', description: 'Assistência, aparelhos, peças, garantias e financeiro.', status: 'planejado' },
  { key: 'orcamentos', name: 'Orçamentos', icon: '🧾', description: 'Propostas integradas a clientes, produtos, WhatsApp e vendas.', status: 'ativo' },
  { key: 'pdv', name: 'PDV', icon: '🛒', description: 'Vendas, O.S., pagamentos, estoque, caixa e operações em aberto.', status: 'ativo' },
  { key: 'centro-operacoes', name: 'Centro de Operações', icon: '🧭', description: 'Consulta unificada de vendas, O.S., pagamentos, caixa, estoque e histórico.', status: 'ativo' },
  { key: 'estoque', name: 'Estoque', icon: '📚', description: 'Saldos e movimentações rastreáveis por produto.', status: 'ativo' },
  { key: 'compras', name: 'Compras', icon: '🚚', description: 'Compras reais, entradas de estoque, fornecedores e títulos financeiros.', status: 'ativo' },
  { key: 'financeiro', name: 'Financeiro', icon: '💰', description: 'Fundação financeira, cadastros globais, competência, parcelas e movimentos.', status: 'ativo' },
  { key: 'fluxo-caixa', name: 'Fluxo de Caixa', icon: '📈', description: 'Movimentação financeira operacional e projeções.', status: 'planejado' },
  { key: 'dfc', name: 'DFC', icon: '📊', description: 'Demonstração dos fluxos de caixa.', status: 'planejado' },
  { key: 'dre', name: 'DRE', icon: '📉', description: 'Resultado por período, categoria e operação.', status: 'planejado' },
  { key: 'relatorios', name: 'Relatórios', icon: '📋', description: 'Visões consolidadas de todo o ecossistema.', status: 'planejado' }
];

router.get('/', (req, res) => {
  const manifestPath = path.join(req.app.locals.paths.PUBLIC_DIR, '..', 'data', 'erp', 'foundation.json');
  let foundation = { version: '0.10.2', status: 'fundacao', database: 'planejado' };
  try { foundation = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
  res.render('erp_dashboard', { flash: req.query.flash || null, modules: MODULES, foundation });
});


router.get('/clientes', (req, res) => {
  const service = getCustomerService(req.app);
  const classifications = service.listClassifications();
  const classificationMap = new Map(classifications.map(item => [String(item.id), item.name]));
  const customersRaw = service.listCustomers({ includeInactive: true });
  const now = new Date();
  const customers = customersRaw.map(customer => ({
    ...customer,
    active: customer.active !== false,
    classificationName: classificationMap.get(String(customer.classificationId || 'none')) || 'Nenhum',
    documentFormatted: formatDocument(customer.document),
    mobileFormatted: formatPhone(customer.mobile),
    phoneFormatted: formatPhone(customer.phone),
    searchText: normalizeText(`${customer.code} ${customer.name} ${customer.tradeName || ''} ${customer.document || ''} ${customer.mobile || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.city || ''}`)
  }));
  const summary = customersRaw.reduce((acc, customer) => {
    acc.total += 1;
    if (customer.active === false) acc.inactive += 1; else acc.active += 1;
    const created = new Date(customer.createdAt || 0);
    if (!Number.isNaN(created.getTime()) && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) acc.newThisMonth += 1;
    return acc;
  }, { total:0, active:0, inactive:0, newThisMonth:0 });
  res.render('clientes', { flash:req.query.flash || null, customers, customersRaw, classifications, summary });
});

router.get('/clientes/consulta-cnpj/:cnpj', async (req, res) => {
  try {
    const cnpj = String(req.params.cnpj || '').replace(/\D/g, '');
    const service = getCompanyLookupService(req.app);
    const company = await service.lookupCnpj(cnpj);

    return res.json({
      success: true,
      message: 'Dados da empresa localizados.',
      company
    });
  } catch (error) {
    const status = error.code === 'CNPJ_NOT_FOUND' ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Não foi possível consultar o CNPJ.',
      code: error.code || 'CNPJ_LOOKUP_FAILED'
    });
  }
});

router.post('/clientes', (req, res) => {
  try {
    const service = getCustomerService(req.app);
    const customer = service.createCustomer(req.body || {}, { createdBy:userName(req), allowDuplicate:req.body?.allowDuplicate === true });
    return res.json({ success:true, message:'Cliente cadastrado com sucesso.', customer });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível cadastrar o cliente.', code:error.code || '', duplicates:error.duplicates || [] });
  }
});

router.put('/clientes/:id', (req, res) => {
  try {
    const service = getCustomerService(req.app);
    const customer = service.updateCustomer(req.params.id, req.body || {}, { updatedBy:userName(req), allowDuplicate:req.body?.allowDuplicate === true });
    return res.json({ success:true, message:'Cliente atualizado com sucesso.', customer });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível atualizar o cliente.', code:error.code || '', duplicates:error.duplicates || [] });
  }
});

router.patch('/clientes/:id/situacao', (req, res) => {
  try {
    const service = getCustomerService(req.app);
    const customer = service.setActive(req.params.id, req.body?.active === true, userName(req));
    return res.json({ success:true, message:customer.active ? 'Cliente reativado.' : 'Cliente inativado.', customer });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível atualizar a situação.' });
  }
});


router.get('/fornecedores', (req, res) => {
  const service = getSupplierService(req.app);
  const suppliersRaw = service.listSuppliers({ includeInactive: true });
  const now = new Date();

  const suppliers = suppliersRaw.map(supplier => ({
    ...supplier,
    active: supplier.active !== false,
    documentFormatted: formatDocument(supplier.document),
    mobileFormatted: formatPhone(supplier.mobile),
    phoneFormatted: formatPhone(supplier.phone),
    searchText: normalizeText(`${supplier.code} ${supplier.name} ${supplier.tradeName || ''} ${supplier.document || ''} ${supplier.contactName || ''} ${supplier.mobile || ''} ${supplier.phone || ''} ${supplier.email || ''} ${supplier.city || ''}`)
  }));

  const summary = suppliersRaw.reduce((acc, supplier) => {
    acc.total += 1;
    if (supplier.active === false) acc.inactive += 1; else acc.active += 1;
    const created = new Date(supplier.createdAt || 0);
    if (!Number.isNaN(created.getTime()) && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) acc.newThisMonth += 1;
    return acc;
  }, { total: 0, active: 0, inactive: 0, newThisMonth: 0 });

  res.render('fornecedores', {
    flash: req.query.flash || null,
    suppliers,
    suppliersRaw,
    summary
  });
});

router.post('/fornecedores', (req, res) => {
  try {
    const service = getSupplierService(req.app);
    const supplier = service.createSupplier(req.body || {}, { createdBy: userName(req) });
    return res.json({ success: true, message: 'Fornecedor cadastrado com sucesso.', supplier });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Não foi possível cadastrar o fornecedor.',
      code: error.code || '',
      duplicates: error.duplicates || []
    });
  }
});

router.put('/fornecedores/:id', (req, res) => {
  try {
    const service = getSupplierService(req.app);
    const supplier = service.updateSupplier(req.params.id, req.body || {}, { updatedBy: userName(req) });
    return res.json({ success: true, message: 'Fornecedor atualizado com sucesso.', supplier });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Não foi possível atualizar o fornecedor.',
      code: error.code || '',
      duplicates: error.duplicates || []
    });
  }
});

router.patch('/fornecedores/:id/situacao', (req, res) => {
  try {
    const service = getSupplierService(req.app);
    const supplier = service.setActive(req.params.id, req.body?.active === true, userName(req));
    return res.json({
      success: true,
      message: supplier.active ? 'Fornecedor reativado.' : 'Fornecedor inativado.',
      supplier
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Não foi possível atualizar a situação.' });
  }
});

/*
 * Consulta de CNPJ dos fornecedores.
 * Reutiliza exatamente o mesmo CompanyLookupService já usado no cadastro de clientes,
 * mantendo o mesmo tratamento, normalização dos dados e comportamento de erro.
 */
router.get('/fornecedores/consultar-cnpj/:cnpj', async (req, res) => {
  try {
    const cnpj = String(req.params.cnpj || '').replace(/\D/g, '');
    const service = getCompanyLookupService(req.app);
    const company = await service.lookupCnpj(cnpj);

    return res.json({
      success: true,
      message: 'Dados da empresa localizados.',
      company
    });
  } catch (error) {
    const status = error.code === 'CNPJ_NOT_FOUND' ? 404 : 400;
    return res.status(status).json({
      success: false,
      message: error.message || 'Não foi possível consultar o CNPJ.',
      code: error.code || 'CNPJ_LOOKUP_FAILED'
    });
  }
});


router.get('/produtos', (req, res) => {
  res.redirect('/produtos?origem=erp');
});




router.get('/centro-operacoes', (req, res) => {
  const service = getOperationsCenterService(req.app);
  const filters = {
    query: req.query.q || '',
    type: req.query.tipo || 'all',
    status: req.query.situacao || 'all',
    dateFrom: req.query.de || '',
    dateTo: req.query.ate || '',
    seller: req.query.vendedor || '',
    cashboxId: req.query.caixa || 'all',
    sort: req.query.ordem || 'openedAt',
    direction: req.query.direcao === 'asc' ? 'asc' : 'desc'
  };
  const operations = service.list(filters);
  const summaryOperations = service.list({ ...filters, status: 'all' });
  const selectedOperation = req.query.operacao ? service.getDetails(req.query.operacao) : null;
  const summary = summaryOperations.reduce((acc, item) => {
    acc.total += 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { total: 0, open: 0, finalized: 0, cancelled: 0, value: 0 });
  summary.value = operations.reduce((total, item) => total + Number(item.total || 0), 0);
  return res.render('centro_operacoes', {
    flash: req.query.flash || null,
    filters,
    operations,
    selectedOperation,
    summary,
    cashboxes: getCommerceService(req.app).listCashboxes()
  });
});


router.get('/historico', (req, res) => {
  const service = getErpHistoryService(req.app);
  const filters = {
    search: req.query.q || '',
    module: req.query.modulo || '',
    source: req.query.tipo || '',
    result: req.query.resultado || '',
    actor: req.query.usuario || '',
    from: req.query.de || '',
    to: req.query.ate || '',
    page: req.query.pagina || 1,
    pageSize: 40
  };
  const result = service.query(filters);
  const selectedItem = req.query.registro ? service.get(req.query.registro) : null;
  return res.render('erp_historico', {
    flash: req.query.flash || null, filters, result, selectedItem, facets: service.facets()
  });
});

router.get('/pdv', (req, res) => {
  const paths = req.app.locals.paths;
  const productsFile = path.join(paths.CONTENT_DIR, 'products.json');
  const productsRaw = readJson(productsFile, { items: [] }).items || [];
  const inventory = getInventoryService(req.app);
  const customers = getCustomerService(req.app).listCustomers({ includeInactive: false });
  const commerce = getCommerceService(req.app);
  const cashboxes = commerce.listCashboxes();
  const selectedCashboxId = String(req.query.caixa || cashboxes[0]?.id || 'caixa-principal');
  const cashState = commerce.getCashboxState(selectedCashboxId, userName(req));
  const openSession = cashState.openSession;
  const cashBalance = cashState.balance;

  // Nova operação explícita: cria o rascunho no servidor antes de renderizar.
  // Assim Venda/O.S. já nasce com número real e exclusivo, inclusive com duas abas.
  if (!req.query.operacao && String(req.query.nova || '') === '1' && openSession) {
    try {
      const reservedOperation = commerce.saveOperation({
        type: 'sale',
        cashboxId: selectedCashboxId,
        items: [],
        payments: []
      }, userName(req));
      return res.redirect(`/erp/pdv?caixa=${encodeURIComponent(selectedCashboxId)}&operacao=${encodeURIComponent(reservedOperation.id)}`);
    } catch (error) {
      console.error('Não foi possível reservar a nova operação:', error);
      return res.redirect(`/erp/pdv?caixa=${encodeURIComponent(selectedCashboxId)}&flash=${encodeURIComponent(error.message || 'Não foi possível criar a nova operação.')}`);
    }
  }

  const current = req.query.operacao ? commerce.getOperation(String(req.query.operacao)) : null;

  const products = productsRaw
    .filter(product => (product.erp?.active !== undefined ? product.erp.active : product.active) !== false)
    .map(product => {
      const stockControlled = product?.inventory?.stockControlled === true && !!product?.inventory?.itemId;
      const balance = stockControlled ? inventory.consultarSaldo({ inventoryItemId: product.inventory.itemId }) : null;
      return {
        id: product.id,
        name: product.name || 'Produto sem nome',
        code: String(product.code || product.sku || product.codigo || ''),
        sku: String(product.sku || product.code || product.codigo || ''),
        barcode: String(product.barcode || product.gtin || product.ean || product.codigoBarras || ''),
        category: String(product.category || ''),
        inventoryItemId: String(product?.inventory?.itemId || ''),
        stockControlled,
        allowNegative: product?.inventory?.allowNegative === true,
        availableQuantity: balance?.availableQuantity ?? null,
        salePrice: Number(product?.commercial?.cashPrice ?? product?.commercial?.installmentPrice ?? product?.commercial?.erpPrice ?? product.price) || 0,
        unitCost: Number(product?.commercial?.costPrice) || 0
      };
    })
    .sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));

  const financeMethods = getReceivablesService(req.app);
  const paymentMethods = (commerce.getSettings().paymentMethods || []).map(method => {
    const configured = financeMethods.resolvePaymentMethod({ methodId:method.id, methodName:method.name }) || {};
    return { ...method, ...configured, id:method.id, name:method.name };
  });

  res.render('pdv', {
    flash: req.query.flash || null,
    products,
    customers,
    cashboxes,
    selectedCashboxId,
    openSession,
    cashBalance,
    cashState,
    current,
    operations: commerce.listOperations({ status: 'all' }),
    paymentMethods
  });
});


router.get('/pdv/caixa', (req, res) => {
  const commerce = getCommerceService(req.app);
  const cashboxes = commerce.listCashboxes();
  const selectedCashboxId = String(req.query.caixa || cashboxes[0]?.id || 'caixa-principal');
  try {
    const reconciliation=getPayablesService(req.app).reconcileCashMovements({ cashboxId:selectedCashboxId, actor:userName(req) });
    if (reconciliation.repaired>0) console.log(`🔄 Caixa: ${reconciliation.repaired} pagamento(s) do Contas a Pagar reconciliado(s).`);
  } catch (error) {
    console.warn(`⚠️ Reconciliação Contas a Pagar → Caixa: ${error.message}`);
  }

  const cashState = commerce.getCashboxState(selectedCashboxId, userName(req));
  const openSession = cashState.openSession;
  const paymentMethods = commerce.getSettings().paymentMethods || [];
  const closedSessions = commerce.listCashSessions({ cashboxId: selectedCashboxId, status: 'closed', limit: 100 });
  const selectedClosingId = String(req.query.fechamento || '').trim();
  const selectedClosing = selectedClosingId
    ? closedSessions.find(session => String(session.id) === selectedClosingId) || null
    : null;
  const viewedSession = selectedClosing || openSession;

  const filters = {
    type: String(req.query.tipo || 'all'),
    user: String(req.query.usuario || '').trim(),
    method: String(req.query.forma || 'all'),
    startDate: String(req.query.dataInicial || '').trim(),
    endDate: String(req.query.dataFinal || '').trim(),
    operationNumber: String(req.query.operacao || '').trim(),
    customer: String(req.query.cliente || '').trim(),
    quick: String(req.query.periodoRapido || '').trim()
  };

  // Ao abrir um fechamento histórico, isola automaticamente o período daquele turno.
  if (selectedClosing && !filters.startDate && !filters.endDate) {
    filters.startDate = String(selectedClosing.openedAt || '').slice(0, 10);
    filters.endDate = String(selectedClosing.closedAt || selectedClosing.openedAt || '').slice(0, 10);
  }

  const allMovements = viewedSession ? commerce.getSessionMovements(viewedSession.id) : [];
  const operationsById = new Map(commerce.listOperations({ status: 'all' }).map(op => [String(op.id), op]));
  const decorateMovement = movement => {
    const operation = movement.referenceId ? operationsById.get(String(movement.referenceId)) : null;
    const operationType = operation?.type || movement.referenceType || '';
    return {
      ...movement,
      operationNumber: operation?.number || null,
      operationType,
      operationLabel: operationType === 'service_order' ? 'O.S.' : operationType === 'sale' ? 'Venda' : '',
      customerName: operation?.customerNameSnapshot || movement.metadata?.customerName || '',
      operationId: operation?.id || ''
    };
  };
  let movements = allMovements.map(decorateMovement);

  const normalize = value => String(value || '').trim().toLowerCase();
  const startAt = filters.startDate ? new Date(`${filters.startDate}T00:00:00-03:00`) : null;
  const endAt = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999-03:00`) : null;

  if (filters.type !== 'all') {
    if (filters.type === 'sale') movements = movements.filter(m => m.type === 'sale_receipt' && m.operationType === 'sale');
    else if (filters.type === 'service_order') movements = movements.filter(m => m.type === 'sale_receipt' && m.operationType === 'service_order');
    else movements = movements.filter(m => m.type === filters.type);
  }
  if (filters.user) movements = movements.filter(m => normalize(m.createdBy).includes(normalize(filters.user)));
  if (filters.method !== 'all') movements = movements.filter(m => String(m.methodId || '') === filters.method);
  if (startAt && !Number.isNaN(startAt.getTime())) movements = movements.filter(m => new Date(m.createdAt) >= startAt);
  if (endAt && !Number.isNaN(endAt.getTime())) movements = movements.filter(m => new Date(m.createdAt) <= endAt);
  if (filters.operationNumber) movements = movements.filter(m => String(m.operationNumber || '').includes(filters.operationNumber.replace(/\D/g, '')));
  if (filters.customer) movements = movements.filter(m => normalize(m.customerName || m.description).includes(normalize(filters.customer)));

  const summarize = (session, selectedMovements) => {
    if (!session) return null;
    const byMethod = {};
    for (const movement of selectedMovements) {
      const key = String(movement.methodId || 'outros');
      if (!byMethod[key]) byMethod[key] = { methodId:key, entries:0, exits:0, total:0, count:0 };
      const signed = Number(movement.signedAmount || 0);
      byMethod[key].count += 1;
      byMethod[key].total = Math.round((byMethod[key].total + signed) * 100) / 100;
      if (signed >= 0) byMethod[key].entries += signed;
      else byMethod[key].exits += Math.abs(signed);
    }
    const openingBalance = Number(session.openingBalance || 0);
    const cashMovements = selectedMovements.filter(m => m.methodId === 'dinheiro');
    const cashEntries = cashMovements.filter(m => Number(m.signedAmount || 0) > 0).reduce((sum,m)=>sum+Number(m.signedAmount||0),0);
    const cashExits = cashMovements.filter(m => Number(m.signedAmount || 0) < 0).reduce((sum,m)=>sum+Math.abs(Number(m.signedAmount||0)),0);
    const supplies = selectedMovements.filter(m => m.type === 'supply' && m.methodId === 'dinheiro').reduce((sum,m)=>sum+Number(m.amount||0),0);
    const withdrawals = selectedMovements.filter(m => ['withdrawal','expense'].includes(m.type) && m.methodId === 'dinheiro').reduce((sum,m)=>sum+Number(m.amount||0),0);
    const receiptTypes = ['sale_receipt','receivable_receipt'];
    const cashReceived = selectedMovements.filter(m => receiptTypes.includes(m.type) && m.methodId === 'dinheiro' && Number(m.signedAmount||0)>0).reduce((sum,m)=>sum+Number(m.amount||0),0);
    const totalReceived = selectedMovements.filter(m => receiptTypes.includes(m.type) && Number(m.signedAmount||0)>0).reduce((sum,m)=>sum+Number(m.amount||0),0);
    return {
      session, openingBalance, cashEntries, cashExits, supplies, withdrawals,
      cashReceived, totalReceived, cashSales:cashReceived, salesTotal:totalReceived,
      expectedBalance:Math.round((openingBalance + cashEntries - cashExits) * 100) / 100,
      byMethod:Object.values(byMethod), movementCount:selectedMovements.length
    };
  };

  const summary = viewedSession ? summarize(viewedSession, movements) : null;
  const liveSummary = openSession ? commerce.getCashSessionSummary(openSession.id) : null;
  const users = [...new Set(allMovements.map(m => m.createdBy).filter(Boolean))].sort();
  const filtersActive = Boolean(filters.startDate || filters.endDate || filters.type !== 'all' || filters.method !== 'all' || filters.user || filters.operationNumber || filters.customer);

  return res.render('caixa', {
    cashboxes, selectedCashboxId, cashState, openSession, viewedSession, summary, liveSummary, movements,
    paymentMethods, users, filters, filtersActive, closedSessions, selectedClosing
  });
});

router.post('/pdv/caixa/abrir', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const hasOpeningBalance = req.body && Object.prototype.hasOwnProperty.call(req.body, 'openingBalance');
    const session = commerce.openCashbox({ cashboxId: String(req.body?.cashboxId || 'caixa-principal'), openingBalance: hasOpeningBalance ? req.body.openingBalance : null, openedBy: userName(req), allowAdditionalOpening: req.body?.allowAdditionalOpening === true });
    return res.json({ success: true, message: 'Caixa aberto com o saldo transportado.', session });
  } catch (error) { return res.status(400).json({ success:false, message:error.message, code:error.code || null }); }
});

router.post('/pdv/caixa/fechar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const cashboxId = String(req.body?.cashboxId || 'caixa-principal');
    const session = commerce.closeCashbox({ cashboxId, countedBalance: req.body?.countedBalance ?? null, notes: req.body?.notes || '', closedBy: userName(req) });
    const redirectUrl = `/erp/pdv/caixa?caixa=${encodeURIComponent(cashboxId)}&fechamento=${encodeURIComponent(session.id)}`;
    return res.json({ success: true, message: 'Caixa fechado com sucesso.', session, redirectUrl });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/pdv/caixa/movimentar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const movement = commerce.addCashMovement({ cashboxId:String(req.body?.cashboxId || 'caixa-principal'), type:String(req.body?.type || 'supply'), amount:req.body?.amount, methodId:String(req.body?.methodId || 'dinheiro'), description:req.body?.description || '', createdBy:userName(req) });
    return res.json({ success:true, message:'Movimentação registrada.', movement });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/pdv/operacoes', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const cashboxId = String(req.body?.cashboxId || 'caixa-principal');
    if (!commerce.getOpenSession(cashboxId)) throw new Error('Abra o caixa selecionado antes de iniciar ou alterar uma Venda/O.S.');
    const operation = commerce.saveOperation(req.body || {}, userName(req));
    return res.json({ success:true, message:'Operação salva em aberto.', operation });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null }); }
});

router.post('/pdv/operacoes/:id/finalizar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const operation = commerce.getOperation(String(req.params.id));
    if (!operation) throw new Error('Operação não encontrada.');
    const session = commerce.getOpenSession(operation.cashboxId);
    if (!session) throw new Error('Abra o caixa selecionado antes de finalizar a operação.');

    commerce.validateOperationForFinalization(operation);
    const receivables = getReceivablesService(req.app);
    const receivablePlan = receivables.validateOperation(operation);

    const productsFile = path.join(req.app.locals.paths.CONTENT_DIR, 'products.json');
    const productsData = readJson(productsFile, { items: [] });
    const inventory = getInventoryService(req.app);
    if (operation.inventoryPostedAt) throw new Error('Esta operação já teve o estoque processado. Use o recebimento futuro no módulo financeiro quando ele estiver disponível.');

    for (const item of operation.items || []) {
      if (!item.stockControlled || !item.inventoryItemId) continue;
      const product = (productsData.items || []).find(p => String(p.id) === String(item.productId));
      const balance = inventory.consultarSaldo({ inventoryItemId:item.inventoryItemId });
      if (!item.allowNegative && balance.availableQuantity < Number(item.quantity || 0)) {
        throw new Error(`Estoque insuficiente para ${item.name}. Disponível: ${balance.availableQuantity}.`);
      }
      if (!product) throw new Error(`Produto não encontrado: ${item.name}.`);
    }

    for (const item of operation.items || []) {
      if (!item.stockControlled || !item.inventoryItemId) continue;
      const product = (productsData.items || []).find(p => String(p.id) === String(item.productId));
      const result = inventory.registrarSaida({ inventoryItemId:item.inventoryItemId, quantity:item.quantity, reason:operation.type === 'service_order' ? 'Peça utilizada em O.S.' : 'Venda em balcão', reasonCode:'SALE', classification:'sale', createdBy:userName(req), referenceId:operation.id, allowNegative:item.allowNegative });
      if (product) product.stock = result.balance.physicalQuantity;
    }
    writeJsonAtomic(productsFile, productsData);

    const receivableMethodIds = new Set(receivablePlan.map(row => String(row.payment.methodId || '')));
    const paidPayments = (operation.payments || []).filter(p => p.status === 'paid' && !receivableMethodIds.has(String(p.methodId || '')));
    for (const payment of paidPayments) {
      commerce.addCashMovement({ cashboxId:operation.cashboxId, type:'sale_receipt', amount:payment.amount, methodId:payment.methodId, description:`${operation.type === 'service_order' ? 'O.S.' : 'Venda'} #${operation.number} — ${operation.customerNameSnapshot || operation.identifier || 'Consumidor final'}`, referenceType:operation.type, referenceId:operation.id, createdBy:userName(req) });
    }

    const generatedReceivables = receivables.createFromOperation(operation, userName(req));
    commerce.markOperationPosted(operation.id, { inventoryPostedAt: new Date().toISOString(), cashPostedAt: new Date().toISOString(), receivableIds:generatedReceivables.map(item=>item.id) }, userName(req));
    const finalized = commerce.finalizeOperation(operation.id, userName(req));
    return res.json({ success:true, message:generatedReceivables.length ? 'Operação finalizada e Contas a Receber geradas com sucesso.' : 'Operação finalizada com sucesso.', operation:finalized, receivables:generatedReceivables });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});


router.post('/pdv/operacoes/:id/cancelar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const operation = commerce.cancelOperation(String(req.params.id), { reason:req.body?.reason || '', expectedVersion:req.body?.version ?? null }, userName(req));
    return res.json({ success:true, message:'Operação cancelada com sucesso.', operation });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null }); }
});

router.post('/pdv/operacoes/:id/anexos', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const existing = commerce.getOperation(String(req.params.id));
    if (!existing || !commerce.getOpenSession(existing.cashboxId)) throw new Error('Abra o caixa da operação antes de adicionar fotos.');
    const operation = commerce.addOperationAttachment(String(req.params.id), { dataUrl:req.body?.dataUrl || '', name:req.body?.name || '', kind:req.body?.kind || 'general', expectedVersion:req.body?.version ?? null }, userName(req));
    return res.json({ success:true, message:'Foto adicionada e compactada com sucesso.', operation });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null }); }
});

router.delete('/pdv/operacoes/:id/anexos/:attachmentId', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const existing = commerce.getOperation(String(req.params.id));
    if (!existing || !commerce.getOpenSession(existing.cashboxId)) throw new Error('Abra o caixa da operação antes de remover fotos.');
    const operation = commerce.removeOperationAttachment(String(req.params.id), String(req.params.attachmentId), { expectedVersion:req.body?.version ?? null }, userName(req));
    return res.json({ success:true, message:'Foto removida.', operation });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null }); }
});

router.get('/pdv/operacoes/:id/anexos/:attachmentId', (req, res) => {
  try {
    const commerce = getCommerceService(req.app); const operation = commerce.getOperation(String(req.params.id));
    if (!operation) return res.status(404).send('Operação não encontrada.');
    const attachment = (operation.serviceOrder?.attachments || []).find(item => item.id === String(req.params.attachmentId));
    if (!attachment) return res.status(404).send('Foto não encontrada.');
    const file = path.join(PANEL_DIR, 'data', 'erp', 'commerce', 'attachments', operation.id, path.basename(attachment.filename || ''));
    if (!fs.existsSync(file)) return res.status(404).send('Arquivo não encontrado.');
    res.type(attachment.mime || 'image/webp'); return res.sendFile(file);
  } catch (_) { return res.status(404).send('Foto não encontrada.'); }
});

router.post('/pdv/operacoes/:id/imprimir', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const operation = commerce.registerPrint(String(req.params.id), { modelName:req.body?.modelName || 'Documento', expectedVersion:req.body?.version ?? null }, userName(req));
    return res.json({ success:true, message:'Impressão registrada no histórico.', operation });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null }); }
});

router.get('/estoque', (req, res) => {
  const paths = req.app.locals.paths;
  const productsFile = path.join(paths.CONTENT_DIR, 'products.json');
  const categoriesFile = path.join(paths.CONTENT_DIR, 'categories.json');
  const subcategoriesFile = path.join(paths.CONTENT_DIR, 'subcategories.json');

  const products = readJson(productsFile, { items: [] }).items || [];
  const categories = readJson(categoriesFile, { items: [] }).items || [];
  const subcategories = readJson(subcategoriesFile, { items: [] }).items || [];
  const service = getInventoryService(req.app);
  const purchaseService = getPurchaseService(req.app);
  try {
    const repaired = purchaseService.reconcileCompletedInventory(userName(req));
    if (repaired.repairedMovements) console.log(`📦 Compras reconciliadas no Estoque: ${repaired.repairedMovements} movimento(s).`);
  } catch (error) {
    console.warn(`⚠️ Reconciliação Compras → Estoque: ${error.message}`);
  }

  const categoryMap = new Map(categories.map((item) => [String(item.slug || item.id || ''), item]));
  const subcategoryMap = new Map(subcategories.map((item) => [String(item.slug || item.id || ''), item]));
  const sourceById = new Map(products.map(item => [String(item.id), item]));

  const inventoryProducts = purchaseService.productCatalog()
    .filter(item => item.active)
    .map((catalogItem) => {
      const product = sourceById.get(String(catalogItem.parentProductId)) || {};
      const controlled = catalogItem.stockControlled === true && !!catalogItem.inventoryItemId;
      const balance = controlled ? service.consultarSaldo({ inventoryItemId: catalogItem.inventoryItemId }) : null;
      const category = categoryMap.get(String(product.category || ''));
      const subcategory = subcategoryMap.get(String(product.subcategory || ''));
      const available = controlled ? Number(balance?.availableQuantity) || 0 : Number(catalogItem.availableStock) || 0;
      const minimum = controlled ? Math.max(0, Number(balance?.minimumQuantity ?? product?.inventory?.minimumQuantity) || 0) : 0;
      const status = !controlled ? 'uncontrolled' : (available <= 0 ? 'zero' : (available <= minimum ? 'low' : 'normal'));

      return {
        id: catalogItem.id,
        productId: catalogItem.parentProductId,
        inventoryItemId: catalogItem.inventoryItemId || '',
        name: catalogItem.name || 'Produto sem nome',
        image: product.image || '',
        categorySlug: product.category || '',
        categoryName: category?.name || product.category || 'Sem categoria',
        subcategorySlug: product.subcategory || '',
        subcategoryName: subcategory?.name || product.subcategory || 'Sem subcategoria',
        controlled,
        physicalQuantity: controlled ? Number(balance?.physicalQuantity) || 0 : Number(catalogItem.currentStock) || 0,
        reservedQuantity: controlled ? Number(balance?.reservedQuantity) || 0 : 0,
        availableQuantity: available,
        minimumQuantity: minimum,
        status,
        searchText: normalizeText(`${catalogItem.name} ${catalogItem.code || ''} ${category?.name || product.category || ''} ${subcategory?.name || product.subcategory || ''}`)
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const controlledProducts = inventoryProducts.filter(item => item.controlled);
  const summary = controlledProducts.reduce((acc, item) => {
    acc.controlled += 1;
    acc.availableUnits += item.availableQuantity;
    if (item.status === 'low') acc.low += 1;
    if (item.status === 'zero') acc.zero += 1;
    return acc;
  }, { controlled: 0, low: 0, zero: 0, availableUnits: 0 });

  const saleMovements = service.listarMovimentacoesPorClassificacao({ classification: 'sale', limit: 50000 });
  const salesByItem = new Map();
  for (const movement of saleMovements) {
    const itemId = String(movement.inventoryItemId || '');
    if (!itemId) continue;
    if (!salesByItem.has(itemId)) salesByItem.set(itemId, []);
    salesByItem.get(itemId).push({
      id: movement.id || '', quantity: Math.abs(Number(movement.signedQuantity ?? movement.quantity) || 0),
      createdAt: movement.createdAt || '', saleId: movement.saleId || movement.referenceSaleId || '',
      customerId: movement.customerId || '', customerName: movement.customerName || '', origin: movement.origin || '', referenceId: movement.referenceId || ''
    });
  }

  const giroProducts = controlledProducts.map((product) => {
    const sourceProduct = sourceById.get(String(product.productId)) || {};
    const brand = String(sourceProduct.brand || sourceProduct.marca || sourceProduct.manufacturer || sourceProduct.fabricante || '').trim();
    return { ...product, code: String(sourceProduct.code || sourceProduct.sku || sourceProduct.codigo || '').trim(), brand: brand || 'Sem marca definida', sales: salesByItem.get(String(product.inventoryItemId)) || [] };
  });

  res.render('estoque', {
    flash: req.query.flash || null,
    products: inventoryProducts,
    categories,
    subcategories,
    summary,
    giroProducts
  });
});

router.get('/estoque/:inventoryItemId/movimentos', (req, res) => {
  try {
    const service = getInventoryService(req.app);
    const inventoryItemId = String(req.params.inventoryItemId || '');
    const balance = service.consultarSaldo({ inventoryItemId });
    const movements = service.listarMovimentacoes({ inventoryItemId, limit: req.query.limit || 50 });
    return res.json({ success: true, balance, movements });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Não foi possível carregar o histórico.' });
  }
});

router.post('/estoque/movimentar', (req, res) => {
  try {
    const inventoryItemId = String(req.body?.inventoryItemId || '').trim();
    const operation = String(req.body?.operation || '').trim();
    const reason = String(req.body?.reason || '').trim();
    const reasonCode = String(req.body?.reasonCode || '').trim().toUpperCase();
    const classification = String(req.body?.classification || '').trim().toLowerCase();
    const quantity = Number(req.body?.quantity);
    if (!inventoryItemId) throw new Error('Item de estoque não informado.');
    if (!['entrada', 'saida', 'ajuste'].includes(operation)) throw new Error('Tipo de movimentação inválido.');
    if (!reason) throw new Error('O motivo da movimentação é obrigatório.');

    const productsFile = path.join(req.app.locals.paths.CONTENT_DIR, 'products.json');
    const data = readJson(productsFile, { items: [] });
    let selectedVariation = null;
    const product = (data.items || []).find(item => {
      if (String(item?.inventory?.itemId || '') === inventoryItemId) return true;
      const combo = (item?.variations?.combinations || []).find(row => String(row?.inventoryItemId || '') === inventoryItemId);
      if (combo) { selectedVariation = combo; return true; }
      return false;
    });
    if (!product) throw new Error('Produto ou variação não encontrado para este item de estoque.');
    if (product?.inventory?.stockControlled !== true) throw new Error('O controle de estoque deste produto está desativado.');

    const service = getInventoryService(req.app);
    const common = {
      inventoryItemId,
      reason,
      reasonCode,
      classification,
      createdBy: userName(req),
      referenceId: String(product.id || ''),
      allowNegative: product?.inventory?.allowNegative === true
    };

    let result;
    if (operation === 'entrada') result = service.registrarEntrada({ ...common, quantity });
    if (operation === 'saida') result = service.registrarSaida({ ...common, quantity });
    if (operation === 'ajuste') result = service.registrarAjuste({ ...common, newQuantity: quantity });

    if (selectedVariation) selectedVariation.stock = result.balance.physicalQuantity;
    else product.stock = result.balance.physicalQuantity;
    writeJsonAtomic(productsFile, data);

    return res.json({
      success: true,
      message: 'Movimentação registrada com sucesso.',
      product: { id: product.id, name: product.name },
      balance: result.balance,
      movement: result.movement,
      movements: service.listarMovimentacoes({ inventoryItemId, limit: 50 })
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Não foi possível registrar a movimentação.' });
  }
});



router.get('/compras', (req, res) => {
  const service = getPurchaseService(req.app);
  try {
    const repaired = service.reconcileCompletedInventory(userName(req));
    if (repaired.repairedMovements) console.log(`📦 Compras reconciliadas: ${repaired.repairedMovements} movimento(s) de estoque.`);
  } catch (error) {
    console.warn(`⚠️ Reconciliação de compras concluídas: ${error.message}`);
  }
  const finance = getFinanceService(req.app).getFoundation();
  const suppliers = getSupplierService(req.app).listSuppliers({ includeInactive:false });
  const commerce = getCommerceService(req.app);
  const cashboxes = commerce.listCashboxes().map(item => ({ ...item, isOpen: !!commerce.getCashboxState(item.id, userName(req)).openSession }));
  const purchases = service.list(req.query || {});
  return res.render('compras', {
    version:'0.19.5', flash:req.query.flash || null, purchases, suppliers,
    products:service.productCatalog().filter(item=>item.active), catalogs:finance.catalogs,
    cashboxes, defaultCashboxId:cashboxes.find(item=>item.isOpen)?.id || cashboxes[0]?.id || 'caixa-principal'
  });
});
router.get('/compras/api', (req,res)=>{try{const service=getPurchaseService(req.app);return res.json({success:true,items:service.list(req.query||{})});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/compras/api/produtos', (req,res)=>{try{return res.json({success:true,items:getPurchaseService(req.app).searchProducts(req.query.q||'')});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/conferir', express.json({limit:'8mb'}), (req,res)=>{try{const conference=getPurchaseService(req.app).parseXml(req.body?.xml||'');return res.json({success:true,conference});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/vinculos', (req,res)=>{try{const result=getPurchaseService(req.app).saveXmlLinks(req.body||{},userName(req));return res.json({success:true,message:'Vínculos do XML gravados para as próximas importações.',result});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/produtos/rapido', (req,res)=>{try{const product=getPurchaseService(req.app).createBasicProduct(req.body||{});return res.json({success:true,message:'Produto cadastrado e disponível na conferência.',product});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/compras/api/:id', (req,res)=>{try{const item=getPurchaseService(req.app).get(req.params.id);if(!item)return res.status(404).json({success:false,message:'Compra não encontrada.'});return res.json({success:true,item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api', (req,res)=>{try{const item=getPurchaseService(req.app).save(req.body||{},userName(req));return res.json({success:true,message:'Compra salva com sucesso.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/:id/concluir', (req,res)=>{try{const item=getPurchaseService(req.app).complete(req.params.id,userName(req));return res.json({success:true,message:'Compra concluída. Estoque, Contas a Pagar e pagamentos imediatos foram integrados.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/:id/estornar', (req,res)=>{try{const item=getPurchaseService(req.app).reverse(req.params.id,req.body?.reason,userName(req));return res.json({success:true,message:'Compra estornada com rastreabilidade.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.get('/financeiro', (req, res) => {
  const service = getFinanceService(req.app);
  const foundation = service.getFoundation();
  const { settings: financeSettings, ...viewData } = foundation;

  // Nunca enviar uma propriedade chamada "settings" para res.render().
  // O Express reserva essa chave para as configurações internas da view;
  // sobrescrevê-la faz o ejs-mate perder o caminho da pasta /views.
  res.render('financeiro_fundacao', {
    flash: req.query.flash || null,
    ...viewData,
    financeSettings
  });
});


router.get('/financeiro/contas-a-receber', (req, res) => {
  const finance = getFinanceService(req.app).getFoundation();
  const customers = getCustomerService(req.app).listCustomers({ includeInactive:false });
  const receivables = getReceivablesService(req.app);
  const reconciliation = receivables.reconcileOperations(getCommerceService(req.app).listOperations({ status:'all' }), 'sistema');
  const titles = receivables.list(req.query || {});
  const summary = receivables.dashboardSummary();
  res.render('contas_receber', { flash:req.query.flash || null, version:'0.17.2', catalogs:finance.catalogs, customers, titles, summary, reconciliation });
});

router.get('/financeiro/api/contas-a-receber', (req, res) => {
  try {
    const service=getReceivablesService(req.app);
    const reconciliation=service.reconcileOperations(getCommerceService(req.app).listOperations({ status:'all' }), 'sistema');
    return res.json({ success:true, items:service.list(req.query || {}), reconciliation });
  }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.get('/financeiro/api/contas-a-receber/:id', (req, res) => {
  try {
    const service=getReceivablesService(req.app); const item=service.get(req.params.id);
    if (!item) return res.status(404).json({ success:false, message:'Título não encontrado.' });
    const customer=getCustomerService(req.app).getCustomer(item.customerId);
    const operation=item.originId ? getCommerceService(req.app).getOperation(item.originId) : null;
    const creditSummary=service.customerCreditSummary(item.customerId);
    return res.json({
      success:true,
      item,
      customer,
      operation,
      creditSummary,
      receipts:service.receipts(req.params.id),
      events:service.events(req.params.id)
    });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/financeiro/api/contas-a-receber', (req, res) => {
  return res.status(405).json({ success:false, message:'Títulos são gerados exclusivamente por Vendas e O.S. finalizadas no PDV.' });
});

router.post('/financeiro/api/contas-a-receber/:id/receber', (req, res) => {
  try {
    const result=getReceivablesService(req.app).receive(req.params.id, req.body || {}, userName(req));
    const service=getReceivablesService(req.app);
    return res.json({
      success:true,
      message:Number(result.receipt?.balanceAfter||0)<=0 ? 'Recebimento registrado com sucesso. Parcela quitada.' : 'Recebimento parcial registrado com sucesso.',
      item:result.item,
      receipt:result.receipt,
      summary:service.dashboardSummary(),
      creditSummary:service.customerCreditSummary(result.item.customerId),
      financialDashboard:getFinanceService(req.app).financialDashboardSummary(),
      duplicated:result.duplicated === true
    });
  }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/financeiro/api/contas-a-receber/:id/cancelar', (req, res) => {
  try { const item=getReceivablesService(req.app).cancel(req.params.id, req.body?.reason, userName(req)); return res.json({ success:true, message:'Título cancelado.', item }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});


router.get('/financeiro/contas-a-pagar', (req, res) => {
  const finance=getFinanceService(req.app).getFoundation();
  const suppliers=getSupplierService(req.app).listSuppliers({includeInactive:false});
  const service=getPayablesService(req.app);
  const filters={...req.query,view:req.query.view||'active'};
  const viewCounts={
    active:service.list({view:'active'}).length,
    reversed:service.list({view:'reversed'}).length
  };
  const commerce=getCommerceService(req.app);
  const cashboxSettings=commerce.getSettings?.()||{};
  const cashboxes=commerce.listCashboxes().map(item=>({
    ...item,
    isOpen:Boolean(commerce.getOpenSession(item.id)),
    openSession:commerce.getOpenSession(item.id)||null
  }));
  const defaultCashboxId=cashboxes.find(item=>item.isOpen)?.id||cashboxSettings.defaultCashboxId||cashboxes[0]?.id||'caixa-principal';
  res.render('contas_pagar',{
    flash:req.query.flash||null,
    version:'0.18.8.2',
    catalogs:finance.catalogs,
    suppliers,
    cashboxes,
    defaultCashboxId,
    titles:service.list(filters),
    viewCounts,
    summary:service.dashboardSummary()
  });
});
router.get('/financeiro/api/contas-a-pagar',(req,res)=>{try{const service=getPayablesService(req.app);const filters=req.query||{};return res.json({success:true,items:service.list(filters),summary:service.dashboardSummary(),counts:{active:service.list({view:'active'}).length,reversed:service.list({view:'reversed'}).length}});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/financeiro/api/contas-a-pagar/:id',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.get(req.params.id);if(!item)return res.status(404).json({success:false,message:'Conta a pagar não encontrada.'});return res.json({success:true,item,supplier:item.supplierId?getSupplierService(req.app).getSupplier(item.supplierId):null,payments:service.payments(req.params.id),events:service.events(req.params.id)});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.create(req.body||{},userName(req));return res.json({success:true,message:'Conta a pagar cadastrada com sucesso.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/:installmentId/forma-pagamento',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.updateInstallmentPaymentMethod(req.params.id,req.params.installmentId,req.body?.paymentMethodId,userName(req));return res.json({success:true,message:'Forma de pagamento da parcela atualizada.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/pagar',(req,res)=>{try{const service=getPayablesService(req.app);const result=service.pay(req.params.id,req.body||{},userName(req));return res.json({success:true,message:Number(result.payment?.balanceAfter||0)<=0?'Pagamento registrado com sucesso. Parcela quitada.':'Pagamento parcial registrado com sucesso.',...result,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/estornar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.reverse(req.params.id,req.body?.reason,userName(req));return res.json({success:true,message:'Conta a pagar estornada.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/cancelar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.reverse(req.params.id,req.body?.reason,userName(req));return res.json({success:true,message:'Conta a pagar estornada.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.post('/financeiro/api/calcular-atraso', (req, res) => {
  try { return res.json({ success:true, calculation:getReceivablesService(req.app).calculateLateCharges(req.body || {}) }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.get('/financeiro/api/fundacao', (req, res) => {
  try { return res.json({ success:true, ...getFinanceService(req.app).getFoundation() }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/financeiro/api/catalogos/:catalogo', (req, res) => {
  try {
    const item = getFinanceService(req.app).saveCatalogItem(req.params.catalogo, req.body || {}, userName(req));
    return res.json({ success:true, message:'Cadastro financeiro salvo com sucesso.', item });
  } catch (error) { return res.status(400).json({ success:false, message:error.message || 'Não foi possível salvar.' }); }
});

router.patch('/financeiro/api/catalogos/:catalogo/:id/situacao', (req, res) => {
  try {
    const item = getFinanceService(req.app).setCatalogActive(req.params.catalogo, req.params.id, req.body?.active === true, userName(req));
    return res.json({ success:true, message:item.active ? 'Cadastro ativado.' : 'Cadastro inativado.', item });
  } catch (error) { return res.status(400).json({ success:false, message:error.message || 'Não foi possível atualizar.' }); }
});

router.get('/modulo/:key', (req, res) => {
  const module = MODULES.find((item) => item.key === req.params.key);
  if (!module) return res.status(404).send('Módulo ERP não encontrado.');
  if (module.key === 'clientes') return res.redirect('/erp/clientes');
  if (module.key === 'produtos') return res.redirect('/erp/produtos');
  if (module.key === 'fornecedores') return res.redirect('/erp/fornecedores');
  if (module.key === 'orcamentos') return res.redirect('/orcamentos');
  if (module.key === 'estoque') return res.redirect('/erp/estoque');
  if (module.key === 'pdv') return res.redirect('/erp/pdv');
  if (module.key === 'centro-operacoes') return res.redirect('/erp/centro-operacoes');
  if (module.key === 'financeiro') return res.redirect('/erp/financeiro');
  if (module.key === 'compras') return res.redirect('/erp/compras');
  res.render('erp_module_foundation', { flash: null, module });
});

export default router;
