import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import InventoryService from '../services/inventory-service.js';
import StockCountService from '../services/stock-count-service.js';
import ErpCategoryService from '../services/erp-category-service.js';
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
import CustomerWalletService from '../services/customer-wallet-service.js';
import CouponService from '../services/coupon-service.js';
import CashFlowService from '../services/cash-flow-service.js';
import DreService from '../services/dre-service.js';
import ReportService from '../services/report-service.js';
import Wm10CustomerImportService from '../services/wm10-customer-import-service.js';
import UserService from '../services/user-service.js';
import CommissionService from '../services/commission-service.js';
import DiscountApprovalService from '../services/discount-approval-service.js';
import CarrierService from '../services/carrier-service.js';
import PricingService from '../services/pricing-service.js';
import ReturnService, { RETURN_REASONS } from '../services/return-service.js';
import { listWhatsAppConversations, sendWhatsAppMediaToConversation } from './automacao_whatsapp.js';
import { matchesSearchText } from '../utils/search.js';
import { listTasks, getTask, createTask, updateTask, completeTask, deleteTask, getTaskOverview, listTaskOwners, listAgendaOwners, createAgendaOwner, deleteAgendaOwner, listAgendaTypes, createAgendaType, deleteAgendaType, getAgendaAnalytics } from '../services/erp_tasks.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');
const ERP_SETTINGS_DIR = path.join(PANEL_DIR, 'data', 'erp', 'settings');
const OPERATION_STATUSES_FILE = path.join(ERP_SETTINGS_DIR, 'operation-statuses.json');
const PRINT_SETTINGS_FILE = path.join(ERP_SETTINGS_DIR, 'print-settings.json');
const PRINT_MODELS_FILE = path.join(ERP_SETTINGS_DIR, 'print-models.json');
const PRINT_LOGO_DIR = path.join(PANEL_DIR, 'public', 'uploads', 'erp', 'print');
const printLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, ['image/png','image/jpeg','image/webp'].includes(file.mimetype))
});


function escapeXml(value=''){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));}
function receiptLines(item,receipt,customer){
  const methods=(receipt.payments||receipt.methods||[]).map(row=>`${row.paymentMethodName||row.methodName||row.paymentMethodId||'Pagamento'}: ${Number(row.value||row.amount||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`);
  return [`QUALITY CELULARES`,`COMPROVANTE DE RECEBIMENTO`,`Comprovante: ${String(receipt.receiptNumber||receipt.number||receipt.id||'')}`,`Cliente: ${customer?.name||item.customerName||'—'}`,`CPF/CNPJ: ${customer?.document||item.customerDocument||'—'}`,`Título: ${String(item.number||'—')}`,`Origem: ${item.originLabel||'—'}`,`Recebido: ${Number(receipt.value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`,`Saldo restante: ${Number(receipt.balanceAfter||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`,...methods,`Operador: ${receipt.createdBy||receipt.userName||'painel'}`];
}
function receiptSvgBuffer(lines){const rows=lines.map((line,index)=>`<text x="42" y="${58+index*31}" font-family="Arial" font-size="${index<2?22:16}" font-weight="${index<2?'700':'400'}" fill="#111">${escapeXml(line)}</text>`).join('');const height=Math.max(620,90+lines.length*31);return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}" viewBox="0 0 900 ${height}"><rect width="100%" height="100%" fill="white"/><rect x="20" y="20" width="860" height="${height-40}" rx="12" fill="none" stroke="#555"/>${rows}<text x="450" y="${height-42}" text-anchor="middle" font-family="Arial" font-size="14" fill="#444">Obrigado pela preferência.</text></svg>`,'utf8');}
function pdfEscape(value=''){return String(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');}
function receiptPdfBuffer(lines){const content=['BT','/F1 16 Tf','50 790 Td'];lines.forEach((line,index)=>{if(index){content.push('0 -28 Td');}content.push(`(${pdfEscape(line)}) Tj`);});content.push('ET');const stream=content.join('\n');const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];let out='%PDF-1.4\n',offsets=[0];for(let i=1;i<objects.length;i++){offsets[i]=Buffer.byteLength(out);out+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(out);out+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out,'binary');}

const routeJsonCache = new Map();
function readJson(file, fallback = { items: [] }) {
  try {
    const stat=fs.statSync(file),cached=routeJsonCache.get(file);
    if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    routeJsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});
    return data;
  } catch (_) {
    return fallback;
  }
}


function writeJsonAtomic(file, data) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, file);
  try{const stat=fs.statSync(file);routeJsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){routeJsonCache.delete(file);}
}


function escapePrintHtml(value='') {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function nativePrintModels(printSettings = {}) {
  const company = escapePrintHtml(printSettings.companyName || 'QUALITY CELULARES');
  const saleTitle = escapePrintHtml(printSettings.saleTitle || 'COMPROVANTE NÃO FISCAL');
  const entryTitle = escapePrintHtml(printSettings.osEntryTitle || 'COMPROVANTE DE ENTRADA - O.S.');
  const exitTitle = escapePrintHtml(printSettings.osExitTitle || 'COMPROVANTE DE SAÍDA - O.S.');
  const entryTerms = escapePrintHtml(printSettings.osEntryTerms || '').replace(/\r?\n/g, '<br>');
  const exitTerms = escapePrintHtml(printSettings.osExitTerms || '').replace(/\r?\n/g, '<br>');
  const saleFooterTitle = escapePrintHtml(printSettings.saleFooterTitle || 'Foi um prazer lhe atender. Volte sempre!');
  const saleFooterWarranty = escapePrintHtml(printSettings.saleFooterWarranty || 'Se remover os lacres do produto, perde a garantia.');
  return [
    {
      id:'sale-receipt', name:'Venda — Padrão', type:'sale', paper:'thermal', active:true,
      system:true, nativeKind:'sale', icon:'🧾', editorDriven:true,
      content:`<div class="doc-header">{{empresa_logo}}<strong class="doc-company">${company}</strong><span>${saleTitle}</span><b class="doc-status">{{status}}</b></div><hr><div><b>Operação:</b> {{numero}}<br><b>Data:</b> {{data}}<br><b>Cliente:</b> {{cliente}}<br><b>CPF/CNPJ:</b> {{cpf}}<br><b>Telefone:</b> {{telefone}}<br><b>Endereço:</b> {{endereco}}<br><b>Identificador:</b> {{identificador}}<br><b>Vendedor:</b> {{vendedor}}</div><hr><h3>DESCRIÇÃO DO PRODUTO</h3>{{itens_tabela}}<div class="doc-total"><b>TOTAL</b><strong>{{total}}</strong></div><hr><h3>PAGAMENTOS</h3>{{pagamentos}}<div class="sale-footer"><strong>${saleFooterTitle}</strong><span>${saleFooterWarranty}</span></div>`
    },
    {
      id:'credit-book', name:'Carnê de Crediário — Padrão', type:'credit_book', paper:'thermal', active:true,
      system:true, nativeKind:'credit_book', icon:'📄', editorDriven:true,
      content:`<div class="doc-header">{{empresa_logo}}<strong class="doc-company">${company}</strong><span>CARNÊ / COMPROVANTE DE CREDIÁRIO</span></div><hr><div style="text-align:center;font-size:10.5px;line-height:1.35"><b>{{empresa_razao}}</b><br>CNPJ: {{empresa_cnpj}}<br>{{empresa_endereco}}<br>{{empresa_cidade}}<br>Celular: {{empresa_telefone}} · {{empresa_email}}</div><hr><div><b>Venda:</b> #{{numero}}<br><b>Data:</b> {{data}}<br><b>Cliente:</b> {{cliente}}<br><b>CPF/CNPJ:</b> {{cpf}}<br><b>Telefone:</b> {{telefone}}<br><b>Endereço:</b> {{endereco}}<br><b>Total no crediário:</b> {{crediario_total}}<br><b>Parcelas:</b> {{crediario_quantidade}}</div><hr><section><h3>ITENS DA VENDA</h3>{{crediario_itens}}</section><hr><div style="font-size:11px;text-align:center">Declaro estar ciente dos valores e vencimentos informados e comprometo-me com o pagamento das parcelas nas respectivas datas.</div><hr><section><h3>OBSERVAÇÕES IMPORTANTES</h3><div>Confira seu carnê, nele consta todas as parcelas de sua compra.<br>Contas em dia não impedem novas compras e evita negativações e protestos.</div></section><div style="margin-top:12px;text-align:center"><b>Visite nossa loja virtual:</b><br>{{empresa_site}}</div><div style="margin-top:12px;text-align:center">É um privilégio ter você como nosso cliente =)<br>Quality Celulares agradece a preferência!</div><div style="margin-top:22px;text-align:center">Assinatura do cliente<br><br>__________________________________<br>{{cliente}}</div>{{crediario_canhoes}}`
    },
    {
      id:'return-receipt', name:'Troca / Devolução — Termo com assinatura', type:'return', paper:'a4', active:true,
      system:true, nativeKind:null, icon:'↩️', editorDriven:true,
      content:`<div class="doc-header">{{empresa_logo}}<strong class="doc-company">{{empresa}}</strong><span>TERMO DE {{devolucao_tipo}}</span><b class="doc-status">{{devolucao_numero}}</b></div><hr><div class="doc-grid"><span><b>Data:</b> {{devolucao_data}}</span><span><b>Venda original:</b> {{venda_original}}</span><span><b>Cliente:</b> {{cliente}}</span><span><b>CPF/CNPJ:</b> {{cpf}}</span><span><b>Telefone:</b> {{telefone}}</span><span><b>E-mail:</b> {{cliente_email}}</span></div><div style="margin-top:5px"><b>Endereço:</b> {{endereco}}</div><hr><h3>MOTIVO DA {{devolucao_tipo}}</h3><div><b>Classificação:</b> {{devolucao_motivo}}<br><b>Relato:</b> {{devolucao_motivo_detalhes}}</div><hr><h3>ITENS ENVOLVIDOS</h3>{{devolucao_itens}}<div class="doc-total"><b>VALOR DO CRÉDITO / RESTITUIÇÃO</b><strong>{{devolucao_total}}</strong></div><hr><h3>DESTINAÇÃO FINANCEIRA</h3>{{devolucao_financeiro}}<hr><div style="font-size:12px;line-height:1.55">Declaro que conferi os itens, valores e informações acima e que recebi ciência sobre a forma de crédito, abatimento ou restituição registrada neste termo.</div><div style="margin-top:38px;display:grid;grid-template-columns:1fr 1fr;gap:28px;text-align:center"><div>__________________________________<br><b>{{cliente}}</b><br>Assinatura do cliente</div><div>__________________________________<br><b>{{devolucao_operador}}</b><br>Responsável pelo atendimento</div></div>`
    },
    {
      id:'os-entry', name:'O.S. Entrada — Padrão', type:'service_order', paper:'thermal', active:true,
      system:true, nativeKind:'os_entry', icon:'📥', editorDriven:true,
      content:`<div class="doc-header">{{empresa_logo}}<strong class="doc-company">${company}</strong><span>${entryTitle} Nº {{numero}}</span><b class="doc-status">{{status}}</b></div><hr><div class="doc-grid"><span><b>Cliente:</b> {{cliente}}</span><span><b>Equipamento:</b> {{os_aparelho}}</span><span><b>Celular:</b> {{telefone}}</span><span><b>Abertura:</b> {{os_abertura}}</span><span><b>Técnico:</b> {{os_tecnico}}</span></div>{{os_problema_bloco}}{{os_acessorios_bloco}}<hr><h3>PRODUTOS / SERVIÇOS</h3><div class="receipt-items os-receipt-items">{{itens_tabela}}</div><div class="doc-total"><b>TOTAL</b><strong>{{total}}</strong></div><hr><h3>CONDIÇÕES DE SERVIÇO</h3><div>${entryTerms}</div>{{senhas_desenho}}<div class="signature">Assinatura: ________________________________</div>`
    },
    {
      id:'os-exit', name:'O.S. Saída — Padrão', type:'service_order', paper:'thermal', active:true,
      system:true, nativeKind:'os_exit', icon:'📤', editorDriven:true,
      content:`<div class="doc-header">{{empresa_logo}}<strong class="doc-company">${company}</strong><span>${exitTitle} Nº {{numero}}</span><b class="doc-status">{{status}}</b></div><hr><div class="doc-grid"><span><b>Cliente:</b> {{cliente}}</span><span><b>Equipamento:</b> {{os_aparelho}}</span><span><b>Celular:</b> {{telefone}}</span><span><b>Abertura:</b> {{os_abertura}}</span><span><b>Técnico:</b> {{os_tecnico}}</span><span><b>Saída:</b> {{os_saida}}</span></div><hr><h3>PROBLEMA INFORMADO</h3>{{os_problema_conteudo}}<hr><h3>SERVIÇO EXECUTADO</h3>{{os_servico_conteudo}}<hr><h3>PRODUTOS / SERVIÇOS</h3><div class="receipt-items os-receipt-items">{{itens_tabela}}</div><div class="doc-total"><b>TOTAL</b><strong>{{total}}</strong></div><hr><h3>PAGAMENTOS</h3>{{pagamentos}}<hr><h3>CONDIÇÕES DE GARANTIA E RETIRADA</h3><div>${exitTerms}</div><div class="signature">Assinatura: ________________________________</div>`
    }
  ];
}

function ensureNativePrintModels() {
  const settings = readJson(PRINT_SETTINGS_FILE, {});
  const data = readJson(PRINT_MODELS_FILE, { version:'2.0', items:[] });
  const items = Array.isArray(data.items) ? data.items : [];
  const defaults = nativePrintModels(settings);
  let changed = false;
  for (const model of defaults) {
    const index = items.findIndex(item => String(item.id) === model.id);
    if (index < 0) { items.unshift(model); changed = true; }
    else {
      const current = items[index];
      const merged = { ...model, ...current, system:true, nativeKind:model.nativeKind, editorDriven:true };
      // Migra somente o carnê padrão antigo (sem editor visual salvo) para o novo conteúdo.
      // Modelos já personalizados/salvos permanecem intactos.
      if (model.id === 'credit-book' && !current.visualConfig && !String(current.content || '').includes('{{empresa_cnpj}}')) {
        merged.content = model.content;
      }
      // Evolução do carnê padrão: inclui os itens da venda sem apagar modelos já personalizados.
      // Só migra o modelo do sistema sem editor visual salvo e que ainda não possua o novo bloco.
      if (model.id === 'credit-book' && !current.visualConfig && !String(current.content || '').includes('{{crediario_itens}}')) {
        const currentContent = String(current.content || model.content);
        const detailsEnd = '<b>Parcelas:</b> {{crediario_quantidade}}</div>';
        merged.content = currentContent.includes(detailsEnd)
          ? currentContent.replace(detailsEnd, `${detailsEnd}<hr><section><h3>ITENS DA VENDA</h3>{{crediario_itens}}</section>`)
          : model.content;
      }
      if (JSON.stringify(merged) !== JSON.stringify(current)) { items[index] = merged; changed = true; }
    }
  }
  if (changed) {
    fs.mkdirSync(ERP_SETTINGS_DIR, { recursive:true });
    writeJsonAtomic(PRINT_MODELS_FILE, { version:'2.0', items });
  }
  return items;
}

function userName(req) {
  return req.user?.displayName || req.user?.name || req.user?.email || 'painel';
}

function getErpCategoryService(app) {
  if (app.locals.erpCategoryService) return app.locals.erpCategoryService;
  app.locals.erpCategoryService = new ErpCategoryService({
    panelDir: PANEL_DIR,
    contentDir: app.locals.paths.CONTENT_DIR
  });
  return app.locals.erpCategoryService;
}

function getInventoryService(app) {
  if (app.locals.inventoryService) return app.locals.inventoryService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'inventory');
  app.locals.inventoryService = new InventoryService({ dataDir });
  console.log(`📦 Inventory Service: ${dataDir}`);
  return app.locals.inventoryService;
}

function getStockCountService(app) {
  if (app.locals.stockCountService) return app.locals.stockCountService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'inventory');
  app.locals.stockCountService = new StockCountService({ dataDir, inventoryService:getInventoryService(app) });
  console.log(`📋 Stock Count Service: ${dataDir}`);
  return app.locals.stockCountService;
}

function getCustomerService(app) {
  if (app.locals.customerService) return app.locals.customerService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'customers');
  app.locals.customerService = new CustomerService({ dataDir });
  console.log(`👥 Customer Service: ${dataDir}`);
  return app.locals.customerService;
}

function getUserService(app) {
  if (app.locals.userService) return app.locals.userService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'users');
  app.locals.userService = new UserService({ dataDir });
  return app.locals.userService;
}

function getCarrierService(app) {
  if (app.locals.carrierService) return app.locals.carrierService;
  app.locals.carrierService = new CarrierService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'carriers') });
  return app.locals.carrierService;
}

function getDiscountApprovalService(app) {
  if (app.locals.discountApprovalService) return app.locals.discountApprovalService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'security');
  app.locals.discountApprovalService = new DiscountApprovalService({ dataDir });
  return app.locals.discountApprovalService;
}

function discountAssessment(items=[]) {
  const rows=(Array.isArray(items)?items:[]).map(item=>{
    const gross=Math.max(0,Number(item.quantity||0)*Number(item.unitPrice||0));
    const discount=Math.max(0,Number(item.discount||0));
    const percent=gross>0 ? (discount/gross)*100 : 0;
    return {name:String(item.name||'Produto'),gross,discount,percent};
  });
  const gross=rows.reduce((sum,row)=>sum+row.gross,0);
  const discount=rows.reduce((sum,row)=>sum+row.discount,0);
  return {
    gross,discount,
    percent:gross>0?(discount/gross)*100:0,
    maxItemPercent:rows.reduce((max,row)=>Math.max(max,row.percent),0),
    rows
  };
}

function getWm10CustomerImportService(app) {
  if (app.locals.wm10CustomerImportService) return app.locals.wm10CustomerImportService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'customers');
  app.locals.wm10CustomerImportService = new Wm10CustomerImportService({ dataDir, customerService:getCustomerService(app) });
  console.log('🔄 Importador de clientes WM10 preparado.');
  return app.locals.wm10CustomerImportService;
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




function getCouponService(app) {
  if (app.locals.couponService) return app.locals.couponService;
  app.locals.couponService = new CouponService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'coupons') });
  return app.locals.couponService;
}

function getCashFlowService(app) {
  if (app.locals.cashFlowService) return app.locals.cashFlowService;
  app.locals.cashFlowService = new CashFlowService({ panelDir:PANEL_DIR, financeService:getFinanceService(app), commerceService:getCommerceService(app) });
  return app.locals.cashFlowService;
}

function getDreService(app) {
  if (app.locals.dreService) return app.locals.dreService;
  app.locals.dreService = new DreService({ dataDir:path.join(PANEL_DIR, 'data', 'erp', 'finance') });
  return app.locals.dreService;
}

function getReportService(app) {
  if (app.locals.reportService) return app.locals.reportService;
  app.locals.reportService = new ReportService({
    panelDir:PANEL_DIR,
    contentDir:app.locals.paths.CONTENT_DIR,
    commerceService:getCommerceService(app),
    inventoryService:getInventoryService(app),
    purchaseService:getPurchaseService(app),
    payablesService:getPayablesService(app),
    dreService:getDreService(app),
    returnService:getReturnService(app)
  });
  return app.locals.reportService;
}

function getCommissionService(app) {
  if (app.locals.commissionService) return app.locals.commissionService;
  app.locals.commissionService = new CommissionService({
    dataDir:path.join(PANEL_DIR, 'data', 'erp', 'commissions'),
    contentDir:app.locals.paths.CONTENT_DIR,
    commerceService:getCommerceService(app),
    receivablesService:getReceivablesService(app),
    payablesService:getPayablesService(app),
    financeService:getFinanceService(app),
    userService:getUserService(app)
  });
  return app.locals.commissionService;
}

function getFinanceService(app) {
  if (app.locals.financeService) return app.locals.financeService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.financeService = new FinanceService({ dataDir });
  console.log(`💰 Finance Service: ${dataDir}`);
  return app.locals.financeService;
}

function getPdvPaymentMethods(app) {
  const finance = getFinanceService(app);
  const methods = finance.listCatalog('paymentMethods', { includeInactive:true })
    .filter(method => method.active !== false && method.modules?.pdv !== false)
    .map(method => ({
      ...method,
      kind: method.eventType === 'cash' ? 'cash' : method.eventType === 'bank' ? 'instant' : method.eventType === 'title' ? 'receivable' : 'other'
    }));
  // Financeiro é a fonte de verdade. Sincroniza somente a configuração operacional
  // do Commerce para validação/filtros, sem manter um segundo cadastro divergente.
  getCommerceService(app).setPaymentMethodsCatalog(methods);
  return methods;
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


function getCustomerWalletService(app) {
  if (app.locals.customerWalletService) return app.locals.customerWalletService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'customers');
  app.locals.customerWalletService = new CustomerWalletService({ dataDir, customerService:getCustomerService(app) });
  return app.locals.customerWalletService;
}

function getReturnService(app) {
  if (app.locals.returnService) return app.locals.returnService;
  app.locals.returnService = new ReturnService({
    dataDir:path.join(PANEL_DIR,'data','erp','returns'),
    productsFile:path.join(app.locals.paths.CONTENT_DIR,'products.json'),
    commerceService:getCommerceService(app),
    inventoryService:getInventoryService(app),
    receivablesService:getReceivablesService(app),
    walletService:getCustomerWalletService(app),
    customerService:getCustomerService(app),
    purchaseService:getPurchaseService(app)
  });
  return app.locals.returnService;
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


function getPricingService(app) {
  if (app.locals.pricingService) return app.locals.pricingService;
  const productsFile = path.join(app.locals.paths.CONTENT_DIR, 'products.json');
  app.locals.pricingService = new PricingService({
    panelDir:PANEL_DIR,
    productsFile,
    categoryService:getErpCategoryService(app)
  });
  return app.locals.pricingService;
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
    payablesService: getPayablesService(app),
    pricingService: getPricingService(app)
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
  { key: 'precificacao', name: 'Precificação Inteligente', icon: '🏷️', description: 'Margens por categoria, produto e variação com simulação de preço.', status: 'ativo' },
  { key: 'categorias', name: 'Categorias ERP', icon: '🗂️', description: 'Categorias internas para produtos, estoque, compras, PDV, relatórios e financeiro.', status: 'ativo' },
  { key: 'fornecedores', name: 'Fornecedores', icon: '🏭', description: 'Cadastro mestre integrado a produtos, compras, estoque e financeiro.', status: 'ativo' },
  { key: 'ordens-servico', name: 'Ordens de Serviço', icon: '🛠️', description: 'Assistência, aparelhos, peças, garantias e financeiro.', status: 'planejado' },
  { key: 'orcamentos', name: 'Orçamentos', icon: '🧾', description: 'Propostas integradas a clientes, produtos, WhatsApp e vendas.', status: 'ativo' },
  { key: 'pdv', name: 'PDV', icon: '🛒', description: 'Vendas, O.S., pagamentos, estoque, caixa e operações em aberto.', status: 'ativo' },
  { key: 'centro-operacoes', name: 'Centro de Operações', icon: '🧭', description: 'Consulta unificada de vendas, O.S., pagamentos, caixa, estoque e histórico.', status: 'ativo' },
  { key: 'estoque', name: 'Estoque', icon: '📚', description: 'Saldos e movimentações rastreáveis por produto.', status: 'ativo' },
  { key: 'compras', name: 'Compras', icon: '🚚', description: 'Compras reais, entradas de estoque, fornecedores e títulos financeiros.', status: 'ativo' },
  { key: 'financeiro', name: 'Financeiro', icon: '💰', description: 'Fundação financeira, cadastros globais, competência, parcelas e movimentos.', status: 'ativo' },
  { key: 'fluxo-caixa', name: 'Fluxo de Caixa', icon: '📈', description: 'Extrato financeiro inteligente com realizado e projeções.', status: 'ativo' },
  { key: 'dfc', name: 'DFC', icon: '📊', description: 'Demonstração dos fluxos de caixa.', status: 'planejado' },
  { key: 'dre', name: 'DRE Inteligente', icon: '📈', description: 'Resultado gerencial por período, Grupo DRE, plano de conta e centro de custo.', status: 'ativo' },
  { key: 'relatorios', name: 'Relatórios', icon: '📋', description: 'Vendas, lucratividade, giro, estoque, descontos, compras e desempenho.', status: 'ativo' },
  { key: 'metas-comissoes', name: 'Metas e Comissões', icon: '🎯', description: 'Metas da loja e vendedores, regras de comissão, apuração e lançamento no financeiro.', status: 'ativo' }
];

router.get('/', (req, res) => {
  const manifestPath = path.join(req.app.locals.paths.PUBLIC_DIR, '..', 'data', 'erp', 'foundation.json');
  let foundation = { version: '0.10.2', status: 'fundacao', database: 'planejado' };
  try { foundation = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
  res.render('erp_dashboard', { flash: req.query.flash || null, modules: MODULES, foundation });
});



const addressSuggestionCache = new Map();
const ADDRESS_SUGGESTION_TTL_MS = 15 * 60 * 1000;

function addressSuggestionKey(uf, city, query, cep) {
  return `${String(uf || '').trim().toUpperCase()}|${normalizeText(city)}|${String(cep || '').replace(/\D/g, '')}|${normalizeText(query)}`;
}

function normalizeCep(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits : '';
}

function addressTypeInfo(value = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const typeMatch = raw.match(/^(rua|r\.?|avenida|av\.?|travessa|tv\.?|alameda|al\.?|rodovia|rod\.?|estrada|est\.?|linha|viela|largo|praça|praca)(?:\s+|$)/i);
  const stripped = raw.replace(/^(rua|r\.?|avenida|av\.?|travessa|tv\.?|alameda|al\.?|rodovia|rod\.?|estrada|est\.?|linha|viela|largo|praça|praca)(?:\s+|$)/i, '').trim();
  return { raw, type: typeMatch ? normalizeText(typeMatch[1]).replace(/\.$/, '') : '', stripped, typeOnly:Boolean(typeMatch && !stripped) };
}

function addressStreetMatches(street = '', query = '') {
  const hay = normalizeText(street);
  const needle = normalizeText(query);
  if (!needle) return true;
  if (hay.includes(needle)) return true;
  const hayWords = hay.split(/\s+/).filter(Boolean);
  return needle.split(/\s+/).filter(Boolean).every(word => hayWords.some(candidate => candidate.startsWith(word)));
}

function addressLooksLikeType(street = '', type = '') {
  if (!type) return true;
  const hay = normalizeText(street);
  if (['r','rua'].includes(type)) return hay.startsWith('rua ');
  if (['av','avenida'].includes(type)) return hay.startsWith('av ') || hay.startsWith('avenida ');
  if (['tv','travessa'].includes(type)) return hay.startsWith('tv ') || hay.startsWith('travessa ');
  if (['al','alameda'].includes(type)) return hay.startsWith('al ') || hay.startsWith('alameda ');
  if (['rod','rodovia'].includes(type)) return hay.startsWith('rod ') || hay.startsWith('rodovia ');
  if (['est','estrada'].includes(type)) return hay.startsWith('est ') || hay.startsWith('estrada ');
  return hay.startsWith(`${type} `);
}

function canonicalAddressType(type = '') {
  const value = normalizeText(type).replace(/\.$/, '');
  if (['r','rua'].includes(value)) return 'Rua';
  if (['av','avenida'].includes(value)) return 'Avenida';
  if (['tv','travessa'].includes(value)) return 'Travessa';
  if (['al','alameda'].includes(value)) return 'Alameda';
  if (['rod','rodovia'].includes(value)) return 'Rodovia';
  if (['est','estrada'].includes(value)) return 'Estrada';
  if (value === 'linha') return 'Linha';
  if (value === 'viela') return 'Viela';
  if (value === 'largo') return 'Largo';
  if (['praca','praça'].includes(value)) return 'Praça';
  return String(type || '').trim();
}

function normalizeStreetKey(street = '') {
  return normalizeText(street)
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.,;:]+/g, ' ')
    .replace(/^r\s+/, 'rua ')
    .replace(/^av\s+/, 'avenida ')
    .replace(/^tv\s+/, 'travessa ')
    .replace(/^al\s+/, 'alameda ')
    .replace(/^rod\s+/, 'rodovia ')
    .replace(/^est\s+/, 'estrada ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanExternalStreet(value = '') {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—,.;:\s]+|[-–—,.;:\s]+$/g, '')
    .trim();
}

function addressRowScore(row = {}, requestedCep = '') {
  let score = 0;
  if (row.source === 'viacep') score += 40;
  else if (row.source === 'osm') score += 25;
  else if (row.source === 'overpass') score += 15;
  if (row.district) score += 10;
  if (requestedCep && normalizeCep(row.cep) === requestedCep) score += 15;
  if (row.cep) score += 3;
  return score;
}

function mergeExternalAddress(map, row, requestedCep = '') {
  const street = cleanExternalStreet(row?.street);
  if (!street) return;
  const normalizedCep = normalizeCep(row?.cep);
  const key = `${normalizeStreetKey(street)}|${requestedCep || normalizedCep || normalizeText(row?.city)}|${String(row?.state || '').trim().toUpperCase()}`;
  const candidate = {
    cep:String(row?.cep || '').trim(),
    street,
    district:String(row?.district || '').trim(),
    city:String(row?.city || '').trim(),
    state:String(row?.state || '').trim().toUpperCase(),
    source:String(row?.source || 'external')
  };
  const previous = map.get(key);
  if (!previous || addressRowScore(candidate, requestedCep) > addressRowScore(previous, requestedCep)) {
    map.set(key, candidate);
  } else if (previous && !previous.district && candidate.district) {
    previous.district = candidate.district;
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = 4500, headers = {}, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method:options.method || 'GET',
      headers:{ Accept:'application/json', ...headers },
      body:options.body,
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`Consulta respondeu ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const addressAreaCache = new Map();
const ADDRESS_AREA_TTL_MS = 12 * 60 * 60 * 1000;

async function resolveOsmAreaId(city, uf) {
  const cacheKey = `${normalizeText(city)}|${String(uf || '').trim().toUpperCase()}`;
  const cached = addressAreaCache.get(cacheKey);
  if (cached && Date.now() - cached.at < ADDRESS_AREA_TTL_MS) return cached.areaId;
  const q = [city, uf, 'Brasil'].filter(Boolean).join(', ');
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=8&q=${encodeURIComponent(q)}`;
  const rows = await fetchJsonWithTimeout(url, 4500, { 'User-Agent':'QualityERP/1.0 (address autocomplete)' });
  const wantedCity = normalizeText(city);
  const candidate = (Array.isArray(rows) ? rows : []).find(item => {
    const a = item?.address || {};
    const place = String(a.city || a.town || a.village || a.municipality || item?.name || '').trim();
    if (wantedCity && normalizeText(place) !== wantedCity) return false;
    return item?.osm_type === 'relation' || item?.osm_type === 'way';
  }) || (Array.isArray(rows) ? rows : []).find(item => item?.osm_type === 'relation' || item?.osm_type === 'way');
  let areaId = null;
  const osmId = Number(candidate?.osm_id || 0);
  if (osmId > 0 && candidate?.osm_type === 'relation') areaId = 3600000000 + osmId;
  else if (osmId > 0 && candidate?.osm_type === 'way') areaId = 2400000000 + osmId;
  addressAreaCache.set(cacheKey, { at:Date.now(), areaId });
  if (addressAreaCache.size > 120) addressAreaCache.delete(addressAreaCache.keys().next().value);
  return areaId;
}

function escapeOverpassRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80);
}

async function searchOverpassStreets(city, uf, queryInfo, requestedCep) {
  if (!city || !uf) return [];
  const areaId = await resolveOsmAreaId(city, uf);
  if (!areaId) return [];
  const significant = String(queryInfo.stripped || '').trim();
  const type = canonicalAddressType(queryInfo.type);
  let pattern = significant ? escapeOverpassRegex(significant) : escapeOverpassRegex(type || queryInfo.raw);
  if (!pattern || pattern.length < 2) return [];
  if (queryInfo.typeOnly && type) pattern = `^${escapeOverpassRegex(type)}\\s`;
  const ql = `[out:json][timeout:7];area(${areaId})->.a;(way(area.a)["highway"]["name"~"${pattern}",i];relation(area.a)["highway"]["name"~"${pattern}",i];);out tags 120;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`;
  const data = await fetchJsonWithTimeout(url, 7500, { 'User-Agent':'QualityERP/1.0 (address autocomplete)' });
  const out = [];
  const seen = new Set();
  for (const element of (Array.isArray(data?.elements) ? data.elements : [])) {
    const street = cleanExternalStreet(element?.tags?.name);
    const key = normalizeStreetKey(street);
    if (!street || !key || seen.has(key)) continue;
    if (queryInfo.typeOnly) {
      if (!addressLooksLikeType(street, queryInfo.type)) continue;
    } else if (significant && !addressStreetMatches(street, significant)) continue;
    seen.add(key);
    out.push({ cep:requestedCep || '', street, district:'', city, state:uf, source:'overpass' });
    if (out.length >= 30) break;
  }
  return out;
}

const addressCityStreetCache = new Map();
const addressCityStreetPromises = new Map();
const addressCepInfoCache = new Map();
const ADDRESS_CITY_STREET_TTL_MS = 12 * 60 * 60 * 1000;
const ADDRESS_CEP_INFO_TTL_MS = 12 * 60 * 60 * 1000;

function addressCityKey(city, uf) {
  return `${normalizeText(city)}|${String(uf || '').trim().toUpperCase()}`;
}

async function resolveCepInfoCached(cep) {
  const clean = normalizeCep(cep);
  if (!clean) return null;
  const cached = addressCepInfoCache.get(clean);
  if (cached && Date.now() - cached.at < ADDRESS_CEP_INFO_TTL_MS) return cached.value;
  try {
    const data = await fetchJsonWithTimeout(`https://viacep.com.br/ws/${clean}/json/`, 1600);
    const value = data && !data.erro ? {
      cep: clean,
      street: cleanExternalStreet(data.logradouro),
      district: String(data.bairro || '').trim(),
      city: String(data.localidade || '').trim(),
      state: String(data.uf || '').trim().toUpperCase()
    } : null;
    addressCepInfoCache.set(clean, { at:Date.now(), value });
    if (addressCepInfoCache.size > 400) addressCepInfoCache.delete(addressCepInfoCache.keys().next().value);
    return value;
  } catch (_) {
    return null;
  }
}

function addressQueryCandidates(queryInfo = {}) {
  const stripped = String(queryInfo.stripped || '').trim();
  const raw = String(queryInfo.raw || '').trim();
  const canonical = canonicalAddressType(queryInfo.type);
  const abbreviationMap = { Rua:'R.', Avenida:'Av.', Travessa:'Tv.', Alameda:'Al.', Rodovia:'Rod.', Estrada:'Est.' };
  const out = [raw, stripped];
  if (stripped && canonical) {
    out.push(`${canonical} ${stripped}`);
    if (abbreviationMap[canonical]) out.push(`${abbreviationMap[canonical]} ${stripped}`);
  }
  return [...new Set(out.map(value => String(value || '').replace(/\s+/g, ' ').trim()).filter(value => value.length >= 2))];
}

function filterCityStreetIndex(rows = [], queryInfo = {}, requestedCep = '') {
  const significant = normalizeText(queryInfo.stripped || (queryInfo.typeOnly ? '' : queryInfo.raw));
  const list = [];
  for (const row of rows) {
    const street = cleanExternalStreet(row?.street);
    if (!street) continue;
    if (queryInfo.typeOnly) {
      if (!addressLooksLikeType(street, queryInfo.type)) continue;
    } else if (significant && !addressStreetMatches(street, significant)) continue;
    list.push({ ...row, cep: requestedCep || row.cep || '' });
    if (list.length >= 30) break;
  }
  return list;
}

async function warmAddressCityStreetIndex(city, uf) {
  const cleanCity = String(city || '').trim();
  const cleanUf = String(uf || '').trim().toUpperCase();
  if (!cleanCity || !/^[A-Z]{2}$/.test(cleanUf)) return [];
  const key = addressCityKey(cleanCity, cleanUf);
  const cached = addressCityStreetCache.get(key);
  if (cached && Date.now() - cached.at < ADDRESS_CITY_STREET_TTL_MS) return cached.rows;
  if (addressCityStreetPromises.has(key)) return addressCityStreetPromises.get(key);

  const promise = (async () => {
    try {
      const areaId = await resolveOsmAreaId(cleanCity, cleanUf);
      if (!areaId) return [];
      // Índice municipal leve: somente nome + tipo da via. Ele é montado em segundo plano
      // depois do CEP e deixa as pesquisas seguintes praticamente instantâneas.
      const ql = `[out:json][timeout:10];area(${areaId})->.a;(way(area.a)["highway"]["name"];relation(area.a)["highway"]["name"];);out tags 3500;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(ql)}`;
      const data = await fetchJsonWithTimeout(url, 10500, { 'User-Agent':'QualityERP/1.0 (address autocomplete warmup)' });
      const rows = [];
      const seen = new Set();
      for (const element of (Array.isArray(data?.elements) ? data.elements : [])) {
        const street = cleanExternalStreet(element?.tags?.name);
        const normalized = normalizeStreetKey(street);
        if (!street || !normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        rows.push({ cep:'', street, district:'', city:cleanCity, state:cleanUf, source:'overpass-cache' });
      }
      rows.sort((a,b) => normalizeStreetKey(a.street).localeCompare(normalizeStreetKey(b.street), 'pt-BR'));
      addressCityStreetCache.set(key, { at:Date.now(), rows:rows.slice(0, 5000) });
      if (addressCityStreetCache.size > 40) addressCityStreetCache.delete(addressCityStreetCache.keys().next().value);
      return rows;
    } catch (_) {
      return [];
    } finally {
      addressCityStreetPromises.delete(key);
    }
  })();
  addressCityStreetPromises.set(key, promise);
  return promise;
}

function startAddressWarmup(city, uf) {
  if (!city || !uf) return;
  warmAddressCityStreetIndex(city, uf).catch(() => {});
}

router.get('/endereco/aquecer', (req, res) => {
  const cep = normalizeCep(req.query.cep);
  let city = String(req.query.cidade || '').trim();
  let uf = String(req.query.uf || '').trim().toUpperCase();
  // Não segura a tela esperando o provedor externo. A resposta sai imediatamente e o
  // índice é preparado em background enquanto o usuário preenche o cadastro.
  (async () => {
    if (cep && (!city || !uf)) {
      const info = await resolveCepInfoCached(cep);
      city = info?.city || city;
      uf = info?.state || uf;
    }
    if (city && uf) await warmAddressCityStreetIndex(city, uf);
  })().catch(() => {});
  res.json({ success:true, warming:true });
});

router.get('/endereco/sugestoes', async (req, res) => {
  let uf = String(req.query.uf || '').trim().toUpperCase();
  let city = String(req.query.cidade || '').trim();
  const query = String(req.query.q || '').trim();
  const cep = normalizeCep(req.query.cep);
  if (query.length < 2) return res.json({ success:true, items:[] });

  const key = addressSuggestionKey(uf, city, query, cep);
  const cached = addressSuggestionCache.get(key);
  if (cached && (Date.now() - cached.at) < ADDRESS_SUGGESTION_TTL_MS) {
    return res.json({ success:true, items:cached.items, cached:true });
  }

  try {
    const rowsByKey = new Map();
    const queryInfo = addressTypeInfo(query);
    const canonicalType = canonicalAddressType(queryInfo.type);
    const significantQuery = normalizeText(queryInfo.stripped || (queryInfo.typeOnly ? '' : queryInfo.raw));
    const candidates = addressQueryCandidates(queryInfo);

    // O CEP é resolvido em paralelo; se a tela já informou cidade/UF, não precisamos
    // bloquear a busca aguardando esta consulta.
    const cepPromise = cep ? resolveCepInfoCached(cep) : Promise.resolve(null);
    let cepInfo = null;
    if (cep) {
      // O aquecimento iniciado ao digitar o CEP normalmente já deixou esta resposta em
      // memória. Consultamos antes do índice municipal para nunca misturar uma rua de
      // outro CEP quando o CEP digitado é específico.
      cepInfo = await cepPromise;
      city = cepInfo?.city || city;
      uf = cepInfo?.state || uf;
    }
    const cepIsSpecific = Boolean(cepInfo?.street);

    const cityKey = addressCityKey(city, uf);
    const cityCache = addressCityStreetCache.get(cityKey);
    const freshCityRows = cityCache && Date.now() - cityCache.at < ADDRESS_CITY_STREET_TTL_MS ? cityCache.rows : [];

    // Quando o CEP é geral (ou não foi informado) e o índice municipal já está aquecido,
    // a resposta vem da memória em poucos ms. CEP específico jamais usa esta lista ampla.
    if (!cepIsSpecific && freshCityRows.length) {
      for (const row of filterCityStreetIndex(freshCityRows, queryInfo, cep)) mergeExternalAddress(rowsByKey, row, cep);
      if (rowsByKey.size >= 5) {
        let items = [...rowsByKey.values()].slice(0, 20);
        addressSuggestionCache.set(key, { at:Date.now(), items });
        return res.json({ success:true, items, cachedCity:true });
      }
    }

    // Descobre se o CEP aponta para um logradouro específico e já aproveita esse endereço.
    if (cepInfo?.city) city = cepInfo.city;
    if (cepInfo?.state) uf = cepInfo.state;
    if (cepInfo?.street) {
      const compatible = queryInfo.typeOnly
        ? addressLooksLikeType(cepInfo.street, queryInfo.type)
        : addressStreetMatches(cepInfo.street, significantQuery || queryInfo.raw);
      if (compatible) mergeExternalAddress(rowsByKey, {
        cep, street:cepInfo.street, district:cepInfo.district, city:cepInfo.city, state:cepInfo.state, source:'viacep'
      }, cep);
    }

    // Em CEP geral, começa a preparar todas as vias do município para as próximas teclas.
    if (!cepIsSpecific && city && uf) startAddressWarmup(city, uf);

    // O fallback do mapa municipal já começa junto com os provedores rápidos. Assim,
    // quando ele for necessário, normalmente já terminou — sem somar mais alguns segundos
    // depois do ViaCEP/Nominatim.
    const overpassPromise = (!cepIsSpecific && city && uf)
      ? Promise.race([
          searchOverpassStreets(city, uf, queryInfo, cep),
          new Promise(resolve => setTimeout(() => resolve([]), 2400))
        ]).catch(() => [])
      : Promise.resolve([]);

    const providerJobs = [];
    if (/^[A-Z]{2}$/.test(uf) && city.length >= 2) {
      // ViaCEP é ótimo quando a cidade tem CEP por logradouro. Usamos no máximo duas
      // formas da busca e fazemos tudo em paralelo para não somar vários timeouts.
      for (const candidate of candidates.slice(0, 2)) {
        providerJobs.push((async () => {
          try {
            const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(candidate)}/json/`;
            const data = await fetchJsonWithTimeout(url, 1700);
            return { kind:'viacep', rows:Array.isArray(data) ? data.slice(0, 120) : [] };
          } catch (_) { return { kind:'viacep', rows:[] }; }
        })());
      }

      // Nominatim complementa abreviações como "R. Alexandre da Motta" e cidades com
      // CEP único. Consulta o nome sem o tipo e também a forma digitada.
      const osmCandidates = [];
      const addOsmCandidate = value => {
        const clean = String(value || '').replace(/\s+/g, ' ').trim();
        if (clean.length >= 2 && !osmCandidates.some(item => normalizeText(item) === normalizeText(clean))) osmCandidates.push(clean);
      };
      addOsmCandidate(queryInfo.raw);
      // Alguns mapas guardam o tipo abreviado (ex.: “R. Alexandre da Motta”).
      // Colocamos essa forma cedo na fila em vez de depender apenas da grafia digitada.
      const canonicalForOsm = canonicalAddressType(queryInfo.type);
      const osmAbbreviations = { Rua:'R.', Avenida:'Av.', Travessa:'Tv.', Alameda:'Al.', Rodovia:'Rod.', Estrada:'Est.' };
      if (queryInfo.stripped && osmAbbreviations[canonicalForOsm]) addOsmCandidate(`${osmAbbreviations[canonicalForOsm]} ${queryInfo.stripped}`);
      addOsmCandidate(queryInfo.stripped);
      for (const candidate of osmCandidates.slice(0, 3)) {
        providerJobs.push((async () => {
          try {
            const q = [candidate, city, uf, 'Brasil'].filter(Boolean).join(', ');
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=28&q=${encodeURIComponent(q)}`;
            const data = await fetchJsonWithTimeout(url, 1900, { 'User-Agent':'QualityERP/1.0 (address autocomplete)' });
            return { kind:'osm', rows:Array.isArray(data) ? data : [] };
          } catch (_) { return { kind:'osm', rows:[] }; }
        })());
      }
    }

    const results = await Promise.all(providerJobs);
    for (const result of results) {
      if (result.kind === 'viacep') {
        for (const item of result.rows) {
          const street = cleanExternalStreet(item?.logradouro);
          const rowCep = normalizeCep(item?.cep);
          if (!street) continue;
          // CEP específico é rígido. CEP geral da cidade pode receber ruas que hoje possuem
          // CEP por logradouro, desde que continuem na mesma cidade/UF.
          if (cep && cepIsSpecific && rowCep && rowCep !== cep) continue;
          if (queryInfo.typeOnly) {
            if (!addressLooksLikeType(street, queryInfo.type)) continue;
          } else if (significantQuery && !addressStreetMatches(street, significantQuery)) continue;
          mergeExternalAddress(rowsByKey, {
            cep:cep || String(item?.cep || '').trim(), street, district:String(item?.bairro || '').trim(),
            city:String(item?.localidade || city).trim(), state:String(item?.uf || uf).trim().toUpperCase(), source:'viacep'
          }, cep);
        }
      } else if (result.kind === 'osm') {
        for (const item of result.rows) {
          const a = item?.address || {};
          const street = cleanExternalStreet(a.road || a.pedestrian || a.residential || a.path || a.footway || a.cycleway || item?.name || '');
          const resultCity = String(a.city || a.town || a.village || a.municipality || a.city_district || city || '').trim();
          const resultState = String(a['ISO3166-2-lvl4'] || '').split('-').pop() || uf;
          const resultCep = normalizeCep(a.postcode || '');
          if (!street) continue;
          if (city && normalizeText(resultCity) !== normalizeText(city)) continue;
          if (uf && resultState && String(resultState).toUpperCase() !== uf) continue;
          if (cep && cepIsSpecific && resultCep && resultCep !== cep) continue;
          if (cep && cepIsSpecific && !resultCep) continue;
          if (queryInfo.typeOnly) {
            if (!addressLooksLikeType(street, queryInfo.type)) continue;
          } else if (significantQuery && !addressStreetMatches(street, significantQuery)) continue;
          mergeExternalAddress(rowsByKey, {
            cep:cep || String(a.postcode || '').trim(), street,
            district:String(a.suburb || a.neighbourhood || a.quarter || a.city_district || '').trim(),
            city:resultCity, state:String(resultState || '').trim().toUpperCase(), source:'osm'
          }, cep);
        }
      }
    }

    // Só quando os provedores rápidos não acharam nada, uma consulta curta no mapa municipal tenta
    // o trecho digitado. Ela não usa nenhum endereço existente no banco do ERP.
    if (rowsByKey.size === 0 && city && uf && !cepIsSpecific) {
      try {
        const overpassRows = await overpassPromise;
        for (const row of overpassRows) mergeExternalAddress(rowsByKey, row, cep);
      } catch (_) {}
    }

    // O aquecimento pode ter terminado enquanto os provedores respondiam.
    const warmed = addressCityStreetCache.get(addressCityKey(city, uf));
    if (!cepIsSpecific && warmed && Date.now() - warmed.at < ADDRESS_CITY_STREET_TTL_MS) {
      for (const row of filterCityStreetIndex(warmed.rows, queryInfo, cep)) mergeExternalAddress(rowsByKey, row, cep);
    }

    let items = [...rowsByKey.values()];
    items.sort((a, b) => {
      const aa = normalizeStreetKey(a.street);
      const bb = normalizeStreetKey(b.street);
      const needle = significantQuery || normalizeText(canonicalType || queryInfo.raw);
      const ap = needle && aa.includes(needle) ? (aa.startsWith(needle) ? 0 : 1) : 2;
      const bp = needle && bb.includes(needle) ? (bb.startsWith(needle) ? 0 : 1) : 2;
      return ap - bp || addressRowScore(b, cep) - addressRowScore(a, cep) || aa.localeCompare(bb, 'pt-BR');
    });
    items = items.slice(0, 20);

    addressSuggestionCache.set(key, { at:Date.now(), items });
    if (addressSuggestionCache.size > 250) addressSuggestionCache.delete(addressSuggestionCache.keys().next().value);
    return res.json({ success:true, items });
  } catch (error) {
    if (error?.name === 'AbortError') return res.status(504).json({ success:false, message:'A consulta de endereços demorou demais.' });
    return res.status(502).json({ success:false, message:'Não foi possível consultar endereços agora.' });
  }
});

router.get('/clientes', (req, res) => {
  const service = getCustomerService(req.app);
  const classifications = service.listClassifications();
  const classificationMap = new Map(classifications.map(item => [String(item.id), item.name]));
  const allCustomers = service.listCustomers({ includeInactive: true });
  const now = new Date();
  const summary = allCustomers.reduce((acc, customer) => {
    acc.total += 1;
    if (customer.active === false) acc.inactive += 1; else acc.active += 1;
    const created = new Date(customer.createdAt || 0);
    if (!Number.isNaN(created.getTime()) && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()) acc.newThisMonth += 1;
    return acc;
  }, { total:0, active:0, inactive:0, newThisMonth:0 });

  const filters = {
    search: String(req.query.q || '').trim(),
    status: ['active', 'inactive'].includes(String(req.query.status || '')) ? String(req.query.status) : '',
    type: ['pf', 'pj'].includes(String(req.query.type || '')) ? String(req.query.type) : '',
    classification: String(req.query.classification || '').trim(),
    registration: ['recent', 'oldest', 'last7'].includes(String(req.query.registration || '')) ? String(req.query.registration) : 'all'
  };
  const normalizedSearch = normalizeText(filters.search);
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const createdTimestamp = customer => {
    const value = Date.parse(customer.createdAt || customer.registeredAt || customer.updatedAt || '');
    return Number.isFinite(value) ? value : 0;
  };

  let filteredCustomers = allCustomers.filter(customer => {
    const active = customer.active !== false;
    if (filters.status === 'active' && !active) return false;
    if (filters.status === 'inactive' && active) return false;
    if (filters.type && String(customer.personType || '') !== filters.type) return false;
    if (filters.classification && String(customer.classificationId || 'none') !== filters.classification) return false;
    if (filters.registration === 'last7' && createdTimestamp(customer) < sevenDaysAgo) return false;
    if (normalizedSearch) {
      const haystack = normalizeText(`${customer.code} ${customer.name} ${customer.tradeName || ''} ${customer.document || ''} ${customer.mobile || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.city || ''}`);
      if (!matchesSearchText(haystack, filters.search)) return false;
    }
    return true;
  });

  const sortDirection = filters.registration === 'oldest' ? 1 : -1;
  filteredCustomers = filteredCustomers.sort((a, b) => {
    const byDate = (createdTimestamp(a) - createdTimestamp(b)) * sortDirection;
    if (byDate) return byDate;
    return String(a.code || a.id || '').localeCompare(String(b.code || b.id || ''), undefined, { numeric:true }) * sortDirection;
  });

  const requestedPageSize = Number.parseInt(req.query.pageSize, 10);
  const pageSize = [20, 50, 100, 300].includes(requestedPageSize) ? requestedPageSize : 20;
  const totalFiltered = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const requestedPage = Number.parseInt(req.query.page, 10) || 1;
  const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const customersRaw = filteredCustomers.slice(startIndex, startIndex + pageSize);
  const customers = customersRaw.map(customer => ({
    ...customer,
    active: customer.active !== false,
    classificationName: classificationMap.get(String(customer.classificationId || 'none')) || 'Nenhum',
    documentFormatted: formatDocument(customer.document),
    mobileFormatted: formatPhone(customer.mobile),
    phoneFormatted: formatPhone(customer.phone),
    searchText: normalizeText(`${customer.code} ${customer.name} ${customer.tradeName || ''} ${customer.document || ''} ${customer.mobile || ''} ${customer.phone || ''} ${customer.email || ''} ${customer.city || ''}`)
  }));
  const receivables = getReceivablesService(req.app);
  const customerFinancialSummaries = receivables.customerCreditSummaries(customersRaw.map(customer => customer.id));
  const pagination = {
    currentPage,
    totalPages,
    pageSize,
    totalFiltered,
    start: totalFiltered ? startIndex + 1 : 0,
    end: Math.min(startIndex + pageSize, totalFiltered)
  };
  res.render('clientes', {
    flash:req.query.flash || null,
    customers,
    customersRaw,
    classifications,
    summary,
    filters,
    pagination,
    customerFieldSettings: service.getFieldSettings(),
    customerFinancialSummaries
  });
});

const WM10_MANUAL_RECEIVABLES = [
  {
    key:'wm10-sale-22106-credit-open', customerDocument:'03972715064', customerName:'Thassia Mariana Rodrigues', originId:'22106', originLabel:'WM10 · Venda #22106', reference:'Venda WM10 #22106', issueDate:'2026-07-11', originalTotal:405, openBalance:205,
    installments:[{number:1,total:1,dueDate:'2026-07-15',value:205}],
    items:['Smartphone Motorola Moto e22 64GB usado · R$ 405,00'],
    notes:'Importação WM10. Venda total R$ 405,00. R$ 200,00 já pagos via PIX no WM10; saldo do crediário importado: R$ 205,00.'
  },
  {
    key:'wm10-sale-22123-credit-open', customerDocument:'06442611027', customerName:'Arthur de Almeida', originId:'22123', originLabel:'WM10 · Venda #22123', reference:'Venda WM10 #22123', issueDate:'2026-07-15', originalTotal:139.99, openBalance:139.99,
    installments:[{number:1,total:1,dueDate:'2026-07-15',value:139.99}],
    items:['Adaptador USB Wi-Fi TP-Link TL-WN823N · R$ 139,99'],
    notes:'Importação WM10. Venda total R$ 139,99; saldo integral do crediário em aberto.'
  },
  {
    key:'wm10-sale-21898-credit-open', customerDocument:'92021697053', customerName:'Marino Martins', originId:'21898', originLabel:'WM10 · Venda #21898', reference:'Venda WM10 #21898', issueDate:'2026-05-25', originalTotal:180, openBalance:120,
    installments:[{number:1,total:1,dueDate:'2026-06-15',value:120}],
    items:['Capa Samsung Galaxy A07 Anti Impacto transp · R$ 50,00','Serviços diversos · R$ 80,00','Película Samsung A06 3D · R$ 50,00'],
    notes:'Importação WM10. Venda total R$ 180,00. R$ 60,00 já pagos no WM10; saldo do crediário importado: R$ 120,00.'
  },
  {
    key:'wm10-sale-21652-credit-open', customerDocument:'94670692020', customerName:'Gil Rovane Ficagna', originId:'21652', originLabel:'WM10 · Venda #21652', reference:'Venda WM10 #21652', issueDate:'2026-03-26', originalTotal:100, openBalance:100,
    installments:[{number:1,total:1,dueDate:'2026-04-01',value:100}],
    items:['Serviços diversos · R$ 100,00'],
    notes:'Importação WM10. Venda total R$ 100,00; saldo integral do crediário em aberto.'
  },
  {
    key:'wm10-sale-7705-credit-open', customerDocument:'98293540087', customerName:'Luciana dos Santos', originId:'7705', originLabel:'WM10 · Venda #7705', reference:'Venda WM10 #7705', issueDate:'2024-05-28', originalTotal:1629.99, openBalance:399.99,
    installments:[
      {number:2,total:4,dueDate:'2024-07-10',value:100},
      {number:3,total:4,dueDate:'2024-08-10',value:150},
      {number:4,total:4,dueDate:'2024-09-10',value:149.99}
    ],
    items:['Película Samsung A03 CORE VIDRO · R$ 29,99','Smartphone Xiaomi Redmi Note 12 128GB cinza · R$ 1.600,00'],
    notes:'Importação WM10. Venda total R$ 1.629,99. Crediário original em 4x totalizando R$ 599,99; parte já paga no WM10. Saldos importados: 2/4 R$ 100,00, 3/4 R$ 150,00 e 4/4 R$ 149,99. Saldo total R$ 399,99.'
  },
  {
    key:'wm10-manual-diecili-20260826', customerDocument:'03765797065', customerName:'Diecili Fernanda Dickel', originId:'manual-diecili', originLabel:'WM10 · Crediário importado', reference:'Crediário WM10 informado manualmente', issueDate:'', originalTotal:59.98, openBalance:59.98,
    installments:[{number:1,total:1,dueDate:'',value:59.98}],
    items:['2x Cabo USB Kapbom V8 1M · R$ 29,99 cada'],
    notes:'Importação WM10 informada manualmente. Total R$ 59,98. Vencimento original não informado; mantido sem vencimento para não inventar data.'
  },
  {
    key:'wm10-manual-samara-20260826', customerDocument:'05116845095', customerName:'Samara de Paula', originId:'manual-samara', originLabel:'WM10 · Crediário importado', reference:'Crediário WM10 informado manualmente', issueDate:'', originalTotal:4992.91, openBalance:710,
    installments:[{number:1,total:1,dueDate:'',value:710}],
    items:['iPhone 11 novo 64GB preto'],
    notes:'Importação WM10 informada manualmente. Venda original R$ 4.992,91. Saldo ainda devido: R$ 710,00. Vencimento original não informado; mantido sem vencimento para não inventar data.'
  },
  {
    key:'wm10-manual-maikel-20260826', customerDocument:'02331850038', customerName:'Maikel Ervino Kipper', originId:'manual-maikel', originLabel:'WM10 · Crediário importado', reference:'Crediário WM10 informado manualmente', issueDate:'', originalTotal:910.96, openBalance:600.96,
    installments:[{number:1,total:1,dueDate:'',value:600.96}],
    items:['Bebidas · total original R$ 910,96'],
    notes:'Importação WM10 informada manualmente. Valor original R$ 910,96 em bebidas. Saldo ainda devido: R$ 600,96. Vencimento original não informado; mantido sem vencimento para não inventar data.'
  }
];

function wm10ManualReceivablesStatus(app){
  const receivables=getReceivablesService(app).list({});
  const customers=getCustomerService(app).listCustomers({includeInactive:true});
  const digits=value=>String(value||'').replace(/\D/g,'');
  return WM10_MANUAL_RECEIVABLES.map(row=>{
    const customer=customers.find(item=>digits(item.document)===digits(row.customerDocument));
    const existing=receivables.find(item=>item.origin==='wm10_legacy_receivable'&&item.originPaymentKey===row.key);
    return {...row,customerId:customer?.id||'',customerFound:Boolean(customer),customerCurrentName:customer?.name||'',imported:Boolean(existing),receivableId:existing?.id||'',receivableNumber:existing?.number||''};
  });
}

router.get('/clientes/importar-wm10', (req, res) => {
  const service = getWm10CustomerImportService(req.app);
  return res.render('clientes_importar_wm10', {
    wm10Settings:service.getSettings(),
    cacheInfo:service.getCacheInfo(),
    legacyInfo:service.getLegacyInfo(),
    archiveInfo:service.getArchiveInfo(),
    lastReport:service.getLastReport(),
    flash:req.query.flash || null
  });
});

router.get('/clientes/importar-wm10/arquivo-historico/status', (req,res) => {
  try { return res.json({ success:true, info:getWm10CustomerImportService(req.app).getArchiveInfo() }); }
  catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/clientes/importar-wm10/arquivo-historico/preparar', (req,res) => {
  try { return res.json({ success:true, info:getWm10CustomerImportService(req.app).initializeArchive({force:Boolean(req.body?.force)}) }); }
  catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/clientes/importar-wm10/arquivo-historico/proximo', async (req,res) => {
  try { return res.json({ success:true, info:await getWm10CustomerImportService(req.app).processNextArchiveTask() }); }
  catch(error){ return res.status(400).json({success:false,message:error.message, info:getWm10CustomerImportService(req.app).getArchiveInfo()}); }
});

router.post('/clientes/importar-wm10/arquivo-historico/repetir-erros', (req,res) => {
  try { return res.json({ success:true, info:getWm10CustomerImportService(req.app).retryArchiveErrors() }); }
  catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/clientes/importar-wm10/configuracao', (req, res) => {
  try {
    const settings = getWm10CustomerImportService(req.app).saveSettings(req.body || {});
    return res.json({ success:true, message:'Configuração WM10 salva com segurança.', settings });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/clientes/importar-wm10/atualizar', async (req, res) => {
  try {
    const service = getWm10CustomerImportService(req.app);
    const cacheInfo = await service.refreshSourceCache();
    return res.json({ success:true, message:`Snapshot local atualizado com ${cacheInfo.rows} cliente(s).`, cacheInfo });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/clientes/importar-wm10/simular', async (req, res) => {
  try {
    const report = await getWm10CustomerImportService(req.app).simulate({ normalizeIndividualNames:req.body?.normalizeIndividualNames !== false });
    return res.json({ success:true, report });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/clientes/importar-wm10/legado/preparar', (req, res) => {
  try {
    const info = getWm10CustomerImportService(req.app).prepareHistoryMigration({ user:userName(req) });
    return res.json({ success:true, info });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/clientes/importar-wm10/legado/proximo', async (req, res) => {
  try {
    const info = await getWm10CustomerImportService(req.app).processNextHistoryBatch({ user:userName(req) });
    return res.json({ success:true, info });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.get('/clientes/importar-wm10/crediarios/status', (req,res) => {
  try {
    const items=wm10ManualReceivablesStatus(req.app);
    return res.json({success:true,items,summary:{total:items.length,ready:items.filter(x=>x.customerFound).length,imported:items.filter(x=>x.imported).length,pending:items.filter(x=>x.customerFound&&!x.imported).length,openValue:items.reduce((sum,x)=>sum+Number(x.openBalance||0),0)}});
  } catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/clientes/importar-wm10/crediarios/importar', (req,res) => {
  try {
    const service=getReceivablesService(req.app);
    const status=wm10ManualReceivablesStatus(req.app);
    const missing=status.filter(item=>!item.customerFound);
    if(missing.length) return res.status(400).json({success:false,message:`Importação bloqueada: ${missing.map(item=>item.customerName).join(', ')} não foram localizados no cadastro de clientes.`});
    const results=[];
    for(const row of WM10_MANUAL_RECEIVABLES){
      const result=service.importLegacyReceivable({
        customerDocument:row.customerDocument,originId:row.originId,originLabel:row.originLabel,originPaymentKey:row.key,
        reference:row.reference,issueDate:row.issueDate,originalTotal:row.originalTotal,openBalance:row.openBalance,
        installments:row.installments,items:row.items,notes:row.notes
      },userName(req));
      results.push({key:row.key,name:row.customerName,created:result.created,id:result.item?.id||'',number:result.item?.number||''});
    }
    const items=wm10ManualReceivablesStatus(req.app);
    return res.json({success:true,message:`Crediários WM10 processados. ${results.filter(x=>x.created).length} título(s) criado(s); ${results.filter(x=>!x.created).length} já existiam e não foram duplicados.`,results,items});
  } catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/clientes/importar-wm10/diagnosticar', async (req, res) => {
  try {
    const diagnostic = await getWm10CustomerImportService(req.app).diagnoseRecord(req.body?.customerCode);
    return res.json({ success:true, diagnostic });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/clientes/importar-wm10/executar', async (req, res) => {
  try {
    const mode = String(req.body?.mode || 'new-only');
    if (mode !== 'new-only') return res.status(400).json({ success:false, message:'Modo de importação não permitido. Use somente a importação de novos clientes.' });
    const report = await getWm10CustomerImportService(req.app).importNewOnly({
      user:userName(req),
      normalizeIndividualNames:req.body?.normalizeIndividualNames !== false,
      expectedNewCodes:Array.isArray(req.body?.expectedNewCodes) ? req.body.expectedNewCodes : []
    });
    return res.json({ success:true, message:'Novos clientes importados com segurança. Clientes existentes não foram alterados.', report });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
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

router.patch('/clientes/situacao/lote', (req, res) => {
  try {
    const service = getCustomerService(req.app);
    const result = service.setActiveMany(req.body?.ids, req.body?.active === true, userName(req));
    return res.json({
      success:true,
      message:`${result.changed} cliente(s) ${result.active ? 'reativado(s)' : 'inativado(s)'} com sucesso.`,
      result
    });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível atualizar os clientes selecionados.' });
  }
});


function customerLiveOperation(operation, customer) {
  return { ...operation, displayCustomer:customer?.name || operation.customerNameSnapshot || 'Consumidor final' };
}

router.get('/clientes/:id/ficha', (req,res) => {
  const customer=getCustomerService(req.app).getCustomer(req.params.id);
  if(!customer) return res.status(404).send('Cliente não encontrado.');
  const credit=getReceivablesService(req.app).customerCreditSummary(customer.id);
  const wallet=getCustomerWalletService(req.app).summary(customer.id);
  return res.render('cliente_ficha', { customer, credit, wallet, printedAt:new Date().toISOString() });
});

router.get('/clientes/:id/api/wm10-legado', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const legacy=getWm10CustomerImportService(req.app).getLegacyForCustomer(customer.id);
    return res.json({success:true,customer:{id:customer.id,name:customer.name},legacy});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/clientes/:id/api/historico', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const page=Math.max(1,Number(req.query.page)||1), pageSize=Math.min(50,Math.max(5,Number(req.query.pageSize)||10));
    const type=String(req.query.type||'all'), status=String(req.query.status||'all');
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    let items=getCommerceService(req.app).listOperations({status:'all'}).filter(op=>String(op.customerId||'')===String(customer.id)||(!op.customerId&&normalize(op.customerNameSnapshot)===normalize(customer.name)));
    items=items.map(op=>customerLiveOperation(op,customer)).map(op=>({...op,origin:op.origin||'quality',legacy:false,readOnly:false}));
    const wm10Items=getWm10CustomerImportService(req.app).getHistoryForCustomer(customer.id).map(op=>({...op,displayCustomer:customer.name}));
    items=[...items,...wm10Items];
    if(type!=='all') items=items.filter(op=>op.type===type);
    if(status!=='all') items=items.filter(op=>op.status===status);
    const operationDate=op=>Date.parse(op?.dates?.finalizedAt||op?.dates?.openedAt||op?.createdAt||'')||0;
    items.sort((a,b)=>operationDate(b)-operationDate(a));
    const total=items.length, pages=Math.max(1,Math.ceil(total/pageSize));
    const currentPage=Math.min(page,pages);
    return res.json({success:true,customer,page:currentPage,pages,total,items:items.slice((currentPage-1)*pageSize,currentPage*pageSize)});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/clientes/:id/api/operacoes/:operationId', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const wm10Details=getWm10CustomerImportService(req.app).getHistoryOperation(customer.id,req.params.operationId);
    if(wm10Details) return res.json({success:true,customer,operation:{...wm10Details,displayCustomer:customer.name},receivables:[]});
    const details=getOperationsCenterService(req.app).getDetails(req.params.operationId);
    if(!details) return res.status(404).json({success:false,message:'Operação não encontrada.'});
    const linked=String(details.customerId||'')===String(customer.id)||String(details.customerNameSnapshot||'').trim().toLowerCase()===String(customer.name||'').trim().toLowerCase();
    if(!linked) return res.status(403).json({success:false,message:'A operação não pertence a este cliente.'});
    const receivables=getReceivablesService(req.app).list({customerId:customer.id}).filter(item=>String(item.operationId||item.originId||item.referenceId||'')===String(details.id)||String(item.originLabel||'').includes(`#${details.number}`));
    return res.json({success:true,customer,operation:{...details,origin:details.origin||'quality',legacy:false,readOnly:false,displayCustomer:customer.name},receivables});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.post('/clientes/:id/api/operacoes/:operationId/detalhes', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const operation=getCommerceService(req.app).getOperation(req.params.operationId);
    if(!operation) return res.status(404).json({success:false,message:'Operação não encontrada.'});
    const linked=String(operation.customerId||'')===String(customer.id)||String(operation.customerNameSnapshot||'').trim().toLowerCase()===String(customer.name||'').trim().toLowerCase();
    if(!linked) return res.status(403).json({success:false,message:'A operação não pertence a este cliente.'});
    const result=getCommerceService(req.app).appendOperationNote(req.params.operationId,req.body?.details,userName(req),'customer_record_legacy_route');
    return res.json({success:true,message:'Observação adicionada ao histórico.',...result});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.post('/clientes/:id/api/operacoes/:operationId/observacoes', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const operation=getCommerceService(req.app).getOperation(req.params.operationId);
    if(!operation) return res.status(404).json({success:false,message:'Operação não encontrada.'});
    const linked=String(operation.customerId||'')===String(customer.id)||String(operation.customerNameSnapshot||'').trim().toLowerCase()===String(customer.name||'').trim().toLowerCase();
    if(!linked) return res.status(403).json({success:false,message:'A operação não pertence a este cliente.'});
    const result=getCommerceService(req.app).appendOperationNote(req.params.operationId,req.body?.note,userName(req),'customer_record');
    return res.json({success:true,message:'Observação adicionada ao histórico.',...result});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/clientes/:id/api/crediario', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const service=getReceivablesService(req.app);
    const titles=service.list({customerId:customer.id});
    const summary=service.customerCreditSummary(customer.id);
    const limit=Number(customer.creditLimit||0), available=limit>0?Math.max(0,limit-Number(summary.openBalance||0)):null;
    return res.json({success:true,customer,summary:{...summary,creditLimit:limit,availableCredit:available},titles});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/clientes/:id/api/analise-credito', (req,res) => {
  try {
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    if(!customer) return res.status(404).json({success:false,message:'Cliente não encontrado.'});
    const commerce=getCommerceService(req.app);
    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const operations=commerce.listOperations({status:'all'}).filter(op=>(String(op.customerId||'')===String(customer.id)||(!op.customerId&&normalize(op.customerNameSnapshot)===normalize(customer.name)))&&op.status==='finalized');
    const receivables=getReceivablesService(req.app); const credit=receivables.customerCreditSummary(customer.id);
    const titles=receivables.list({customerId:customer.id}); const installments=titles.flatMap(t=>(t.installments||[]).map(i=>({...i,title:t})));
    const today=new Date().toISOString().slice(0,10);
    const activeInstallments=installments.filter(i=>!['cancelled','reversed'].includes(i.status));
    const paid=activeInstallments.filter(i=>Number(i.openBalance||0)<=0);
    const open=activeInstallments.filter(i=>Number(i.openBalance||0)>0);
    const overdue=open.filter(i=>i.dueDate&&i.dueDate<today);
    const delays=paid.map(i=>{const paidDate=String(i.paidAt||i.receivedAt||i.updatedAt||'').slice(0,10);if(!paidDate||!i.dueDate)return 0;return Math.max(0,Math.round((new Date(paidDate)-new Date(i.dueDate))/86400000));});
    const totals=operations.map(op=>Number(op.total||0)); const totalSales=totals.reduce((a,b)=>a+b,0);
    const creditOperationIds=new Set(titles.map(t=>String(t.operationId||t.originId||t.referenceId||'')));
    const creditSales=operations.filter(op=>creditOperationIds.has(String(op.id))||titles.some(t=>String(t.originLabel||'').includes(`#${op.number}`)));
    const totalCreditSales=creditSales.reduce((sum,op)=>sum+Number(op.total||0),0);
    const lastPurchaseAt=operations.map(op=>op.dates?.finalizedAt||op.dates?.openedAt||op.createdAt).filter(Boolean).sort().pop()||null;
    const maxDelay=Math.max(0,...delays), avgDelay=delays.length?delays.reduce((a,b)=>a+b,0)/delays.length:0;
    const rating=Number(credit.overdueBalance||0)>0?'inadimplente':maxDelay>15||avgDelay>7?'atencao':titles.length||operations.length?'regular':'sem_historico';
    const profitabilityByMonth=new Map();
    let totalKnownCost=0, totalProfit=0, itemsWithoutCost=0;
    for(const op of operations){
      const at=String(op.dates?.finalizedAt||op.dates?.openedAt||op.createdAt||'');
      const month=at.slice(0,7)||'sem-data';
      if(!profitabilityByMonth.has(month)) profitabilityByMonth.set(month,{month,revenue:0,cost:0,profit:0,itemsWithoutCost:0});
      const row=profitabilityByMonth.get(month);
      for(const item of (op.items||[])){
        const qty=Number(item.quantity||0), revenue=Math.max(0,qty*Number(item.unitPrice||0)-Number(item.discount||0));
        const unitCost=Number(item.unitCost||0), cost=unitCost>0?qty*unitCost:0;
        row.revenue+=revenue;
        if(unitCost>0){row.cost+=cost;row.profit+=revenue-cost;totalKnownCost+=cost;totalProfit+=revenue-cost;}else if(revenue>0){row.itemsWithoutCost+=1;itemsWithoutCost+=1;}
      }
    }
    const profitability=Array.from(profitabilityByMonth.values()).sort((a,b)=>String(a.month).localeCompare(String(b.month))).map(row=>({...row,profitPercent:row.cost>0?(row.profit/row.cost)*100:null,markup:row.cost>0?row.profit/row.cost:null}));
    return res.json({success:true,customer,analysis:{...credit,rating,operationCount:operations.length,totalSales,totalCreditSales,largestSale:Math.max(0,...totals),averageTicket:operations.length?totalSales/operations.length:0,paidInstallmentCount:paid.length,openInstallmentCount:open.length,overdueInstallmentCount:overdue.length,maxDelayDays:maxDelay,averageDelayDays:avgDelay,firstCreditAt:titles.slice().sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)))[0]?.createdAt||null,lastPurchaseAt,knownCost:totalKnownCost,grossProfit:totalProfit,profitPercent:totalKnownCost>0?(totalProfit/totalKnownCost)*100:null,markup:totalKnownCost>0?totalProfit/totalKnownCost:null,itemsWithoutCost,profitability}});
  } catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/clientes/:id/api/carteira', (req,res) => { try{return res.json({success:true,...getCustomerWalletService(req.app).summary(req.params.id)});}catch(error){return res.status(400).json({success:false,message:error.message});} });
router.post('/clientes/:id/api/carteira', (req,res) => {
  try{
    const wallet=getCustomerWalletService(req.app);
    const item=wallet.create(req.params.id,req.body||{},userName(req));
    const summary=wallet.summary(req.params.id);
    const customer=getCustomerService(req.app).getCustomer(req.params.id);
    const isDebit=item.direction==='debit';
    req.app.locals.kernelService?.logs?.record?.({
      ...(req.kernelContext||{}),module:'clientes',action:isDebit?'CREDITO_CLIENTE_UTILIZADO':'CREDITO_CLIENTE_ADICIONADO',category:'operational',result:'success',
      entityType:'customer_wallet',entityId:item.id,documentId:String(customer?.document||''),route:req.originalUrl.split('?')[0],method:req.method,statusCode:200,
      label:`${isDebit?'Débito':'Crédito'} de ${Number(item.value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} na carteira de ${customer?.name||item.customerNameSnapshot||'cliente'}`,
      details:{customerId:req.params.id,customerName:customer?.name||item.customerNameSnapshot||'',value:item.value,direction:item.direction,reason:item.reason||'',balanceAfter:summary.balance}
    });
    req.kernelSemanticLogged=true;
    return res.json({success:true,message:'Lançamento registrado na carteira do cliente.',item,summary});
  }catch(error){return res.status(400).json({success:false,message:error.message});}
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
    summary,
    supplierFieldSettings: service.getFieldSettings()
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




router.get('/agenda', (req, res) => {
  const loggedOwner = userName(req);
  const requestedOwner = String(req.query.responsavel || 'all').trim();
  const ownerFilter = requestedOwner && requestedOwner !== 'all' ? requestedOwner : '';
  const overview = getTaskOverview(req.app, { owner: ownerFilter });
  const customers = getCustomerService(req.app).listCustomers({ includeInactive:false });
  const registeredOwners = listAgendaOwners(req.app);
  const taskOwners = registeredOwners.map(item => item.name);
  const agendaTypes = listAgendaTypes(req.app);
  const analytics = getAgendaAnalytics(req.app);
  return res.render('agenda', {
    flash:req.query.flash || null,
    owner:loggedOwner,
    selectedOwner:requestedOwner || 'all',
    taskOwners,
    registeredOwners,
    agendaTypes,
    analytics,
    overview,
    customers,
    filter:String(req.query.filtro || 'open')
  });
});

function agendaJsonRequested(req){
  return String(req.get('accept') || '').toLowerCase().includes('application/json');
}
function agendaSuccess(req,res,message){
  if(agendaJsonRequested(req)) return res.json({ success:true, message });
  return res.redirect('/erp/agenda?flash=' + encodeURIComponent(message));
}
function agendaFailure(req,res,error,fallback){
  const message=error?.message || fallback;
  if(agendaJsonRequested(req)) return res.status(400).json({ success:false, message });
  return res.redirect('/erp/agenda?flash=' + encodeURIComponent(message));
}

router.post('/agenda', (req, res) => {
  try {
    const customerId = String(req.body?.customerId || '').trim();
    const customer = customerId ? getCustomerService(req.app).getCustomer(customerId) : null;
    const task=createTask(req.app, {
      title:req.body?.title,
      description:req.body?.description,
      dueAt:req.body?.dueAt,
      priority:req.body?.priority,
      type:req.body?.type,
      customerId:customer?.id || '',
      customerName:customer?.name || '',
      owner:String(req.body?.owner || '').trim() || userName(req)
    }, userName(req));
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'agenda',action:'TASK_CREATED',entityType:'agenda_task',entityId:task.id,after:task,ip:req.ip||''});
    return agendaSuccess(req,res,'Item adicionado.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível criar a tarefa.');
  }
});

router.post('/agenda/:id/editar', (req,res) => {
  try {
    const customerId=String(req.body?.customerId||'').trim();
    const customer=customerId?getCustomerService(req.app).getCustomer(customerId):null;
    const result=updateTask(req.app,req.params.id,{title:req.body?.title,description:req.body?.description,dueAt:req.body?.dueAt,priority:req.body?.priority,type:req.body?.type,customerId:customer?.id||'',customerName:customer?.name||'',owner:String(req.body?.owner||'').trim()||userName(req)},userName(req));
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'agenda',action:'TASK_UPDATED',entityType:'agenda_task',entityId:req.params.id,before:result.before,after:result.after,ip:req.ip||''});
    return agendaSuccess(req,res,'Tarefa atualizada.');
  } catch(error) { return agendaFailure(req,res,error,'Não foi possível editar a tarefa.'); }
});

router.post('/agenda/responsaveis', (req, res) => {
  try {
    createAgendaOwner(req.app, { name:req.body?.name, color:req.body?.color });
    return agendaSuccess(req,res,'Responsável cadastrado.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível cadastrar o responsável.');
  }
});

router.post('/agenda/responsaveis/:id/excluir', (req, res) => {
  try {
    deleteAgendaOwner(req.app, req.params.id);
    return agendaSuccess(req,res,'Responsável removido da lista. As tarefas antigas foram preservadas.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível remover o responsável.');
  }
});

router.post('/agenda/tipos', (req, res) => {
  try {
    createAgendaType(req.app, { name:req.body?.name, dueMode:req.body?.dueMode });
    return agendaSuccess(req,res,'Tipo cadastrado.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível cadastrar o tipo.');
  }
});

router.post('/agenda/tipos/:id/excluir', (req, res) => {
  try {
    deleteAgendaType(req.app, req.params.id);
    return agendaSuccess(req,res,'Tipo removido.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível remover o tipo.');
  }
});

router.post('/agenda/:id/concluir', (req, res) => {
  try {
    const before=getTask(req.app,req.params.id);
    const task=completeTask(req.app, req.params.id, userName(req));
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'agenda',action:'TASK_COMPLETED',entityType:'agenda_task',entityId:req.params.id,before,after:task,ip:req.ip||''});
    return agendaSuccess(req,res,'Item concluído.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível concluir.');
  }
});

router.post('/agenda/:id/excluir', (req, res) => {
  try {
    const task=deleteTask(req.app, req.params.id);
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'agenda',action:'TASK_DELETED',entityType:'agenda_task',entityId:req.params.id,before:task,after:null,ip:req.ip||''});
    return agendaSuccess(req,res,'Item removido.');
  } catch (error) {
    return agendaFailure(req,res,error,'Não foi possível excluir.');
  }
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
    sort: req.query.ordem || (req.query.situacao === 'finalized' ? 'finalizedAt' : req.query.situacao === 'all' ? 'activityAt' : 'openedAt'),
    direction: req.query.direcao === 'asc' ? 'asc' : 'desc'
  };
  const operations = service.list(filters);
  const summaryOperations = service.list({ ...filters, status: 'all' });
  const selectedOperation = req.query.operacao ? service.getDetails(req.query.operacao) : null;
  const summary = summaryOperations.reduce((acc, item) => {
    acc.total += 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { total: 0, open: 0, finalized: 0, cancelled: 0, reversed: 0, value: 0 });
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


router.get('/configuracoes/caixa-pdv', (req, res) => {
  const commerce = getCommerceService(req.app);
  const cashboxes = commerce.listCashboxes();
  const requestedCashboxId = String(req.query.caixa || '').trim();
  const selectedCashbox = cashboxes.find(item => item.id === requestedCashboxId) || cashboxes[0] || { id:'caixa-principal', name:'Caixa principal' };
  const selectedCashboxId = selectedCashbox.id;
  const cashboxConfig = commerce.getCashboxSettings(selectedCashboxId);
  const settings = commerce.getSettings();
  const paymentMethods = getPdvPaymentMethods(req.app);

  const erpUsers=getUserService(req.app).list({includeInactive:false});
  return res.render('configuracoes_caixa_pdv', {
    flash: req.query.flash || null,
    cashboxes,
    selectedCashboxId,
    cashboxConfig,
    paymentMethods,
    erpUsers,
    sellerUsers:erpUsers.filter(user=>user.seller===true),
    technicianUsers:erpUsers.filter(user=>user.technician===true)
  });
});

router.post('/configuracoes/caixa-pdv', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const cashboxId = String(req.body?.cashboxId || '').trim();
    const cashbox = commerce.listCashboxes().find(item => item.id === cashboxId);
    if (!cashbox) return res.status(400).json({ success:false, message:'Caixa inválido ou inativo.' });

    const settings = commerce.saveCashboxSettings(cashboxId, req.body || {}, userName(req));
    return res.json({ success:true, message:'Configurações do Caixa / PDV salvas.', settings });
  } catch (error) {
    console.error('Erro ao salvar configurações do Caixa / PDV:', error);
    return res.status(500).json({ success:false, message:error.message || 'Não foi possível salvar as configurações.' });
  }
});

router.get('/configuracoes/status-operacoes', (req, res) => {
  const settings = readJson(OPERATION_STATUSES_FILE, { version:'1.0', items:[] });
  res.render('configuracoes_status_operacoes', { flash:req.query.flash || null, statuses:settings.items || [] });
});
router.post('/configuracoes/status-operacoes', express.urlencoded({extended:true}), (req, res) => {
  const names = Array.isArray(req.body.name) ? req.body.name : [req.body.name].filter(Boolean);
  const ids = Array.isArray(req.body.id) ? req.body.id : [req.body.id].filter(Boolean);
  const active = new Set([].concat(req.body.active || []));
  const defaultSale = String(req.body.defaultSale || '');
  const defaultOs = String(req.body.defaultOs || '');
  const items = names.map((name,index)=>({
    id:String(ids[index] || `status-${Date.now()}-${index}`).trim(), name:String(name||'').trim(),
    active:active.has(String(index)), defaultSale:defaultSale===String(index), defaultOs:defaultOs===String(index)
  })).filter(item=>item.name);
  fs.mkdirSync(ERP_SETTINGS_DIR,{recursive:true}); writeJsonAtomic(OPERATION_STATUSES_FILE,{version:'1.0',items});
  res.redirect('/erp/configuracoes/status-operacoes?flash='+encodeURIComponent('Status das operações salvos.'));
});
router.get('/configuracoes/comprovantes/preview-real', (req, res) => {
  try {
    const number = Number(String(req.query.number || '').trim());
    const type = String(req.query.type || '').trim();
    if (!Number.isInteger(number) || number <= 0) return res.status(400).json({ success:false, message:'Informe um número válido.' });
    if (!['sale','service_order'].includes(type)) return res.status(400).json({ success:false, message:'Tipo de comprovante inválido.' });

    const operation = getCommerceService(req.app).listOperations({ status:'all' })
      .find(item => Number(item.number) === number && item.type === type);
    if (!operation) return res.status(404).json({ success:false, message:type === 'sale' ? `Venda nº ${number} não encontrada.` : `O.S. nº ${number} não encontrada.` });

    const customer = operation.customerId ? getCustomerService(req.app).getCustomer(operation.customerId) : null;
    return res.json({ success:true, operation, customer });
  } catch (error) {
    console.error('Erro ao carregar dados reais do comprovante:', error);
    return res.status(500).json({ success:false, message:'Não foi possível carregar os dados reais do comprovante.' });
  }
});

router.get('/configuracoes/comprovantes', (req, res) => {
  const printSettings = readJson(PRINT_SETTINGS_FILE, {});
  const printModels = ensureNativePrintModels();
  if (printSettings.logoUrl && printSettings.logoUrl.startsWith('/uploads/')) printSettings.logoUrl = `/public${printSettings.logoUrl}`;
  res.render('configuracoes_comprovantes', { flash:req.query.flash || null, printSettings, printModels });
});
router.post('/configuracoes/comprovantes', printLogoUpload.single('logo'), (req, res) => {
  const previous = readJson(PRINT_SETTINGS_FILE, {});
  let logoUrl = previous.logoUrl || '';
  if (req.body.removeLogo === '1') logoUrl = '';
  if (req.file) {
    fs.mkdirSync(PRINT_LOGO_DIR, { recursive:true });
    const ext = req.file.mimetype === 'image/png' ? '.png' : req.file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    const fileName = `logo-comprovante${ext}`;
    for (const candidate of ['logo-comprovante.png','logo-comprovante.jpg','logo-comprovante.webp']) { const oldFile=path.join(PRINT_LOGO_DIR,candidate); if(fs.existsSync(oldFile)) fs.unlinkSync(oldFile); }
    fs.writeFileSync(path.join(PRINT_LOGO_DIR, fileName), req.file.buffer);
    logoUrl = `/public/uploads/erp/print/${fileName}`;
  }
  const printSettings={
    version:'2.1', logoUrl, logoVersion:req.file?Date.now():(previous.logoVersion||1),
    logoWidthPercent:Math.min(100,Math.max(25,Number(req.body.logoWidthPercent||previous.logoWidthPercent||72))),
    logoAlign:['left','center','right'].includes(req.body.logoAlign)?req.body.logoAlign:(previous.logoAlign||'center'),
    logoMarginTop:Math.min(30,Math.max(0,Number(req.body.logoMarginTop??previous.logoMarginTop??0))),
    logoMarginBottom:Math.min(30,Math.max(0,Number(req.body.logoMarginBottom??previous.logoMarginBottom??7))),
    companyName:String(req.body.companyName||previous.companyName||'QUALITY CELULARES').trim(),
    companyLegalName:String(req.body.companyLegalName||previous.companyLegalName||'Rede Quality Celulares LTDA').trim(),
    companyDocument:String(req.body.companyDocument||previous.companyDocument||'20.375.910/0001-66').trim(),
    companyAddress:String(req.body.companyAddress||previous.companyAddress||'Prestes Guimarães, 1477, Centro').trim(),
    companyCity:String(req.body.companyCity||previous.companyCity||'Saldanha Marinho/RS').trim(),
    companyPhone:String(req.body.companyPhone||previous.companyPhone||'(55) 99140-7824').trim(),
    companyEmail:String(req.body.companyEmail||previous.companyEmail||'sac.quality2@gmail.com').trim(),
    companyWebsite:String(req.body.companyWebsite||previous.companyWebsite||'www.qualitycel.com.br').trim(),
    saleTitle:String(req.body.saleTitle||previous.saleTitle||'COMPROVANTE NÃO FISCAL').trim(),
    saleFooterTitle:String(req.body.saleFooterTitle||'Foi um prazer lhe atender. Volte sempre!').trim(),
    saleFooterWarranty:String(req.body.saleFooterWarranty||'Se remover os lacres do produto, perde a garantia.').trim(),
    footerText:'', defaultPaper:req.body.defaultPaper==='a4'?'a4':'thermal',
    showCustomerDocument:req.body.showCustomerDocument==='on', showCustomerPhone:req.body.showCustomerPhone==='on', showCustomerAddress:req.body.showCustomerAddress==='on',
    saleSignature:false, osSignature:req.body.osSignature==='on',
    osEntryTitle:String(req.body.osEntryTitle||'COMPROVANTE DE ENTRADA - O.S.').trim(), osExitTitle:String(req.body.osExitTitle||'COMPROVANTE DE SAÍDA - O.S.').trim(),
    osEntryTerms:String(req.body.osEntryTerms||'').trim(), osExitTerms:String(req.body.osExitTerms||'').trim(), osShowPasswordGrid:req.body.osShowPasswordGrid==='on', osPasswordGridSize:3
  };
  fs.mkdirSync(ERP_SETTINGS_DIR,{recursive:true}); writeJsonAtomic(PRINT_SETTINGS_FILE,printSettings);
  res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent('Configurações de impressão salvas.'));
});
router.post('/configuracoes/comprovantes/modelos', express.urlencoded({extended:true}), (req,res)=>{
  const items=ensureNativePrintModels();
  const action=String(req.body.action||'save'); const id=String(req.body.id||'').trim();
  const existing=items.find(x=>String(x.id)===id);
  if(action==='delete'&&id){
    if(existing?.system) return res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent('Modelos do sistema não podem ser excluídos. Use Restaurar padrão quando necessário.'));
    writeJsonAtomic(PRINT_MODELS_FILE,{version:'2.0',items:items.filter(x=>String(x.id)!==id)});
    return res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent('Modelo excluído.'));
  }
  if(action==='restore'&&id&&existing?.system){
    const original=nativePrintModels(readJson(PRINT_SETTINGS_FILE,{})).find(model=>model.id===id);
    const index=items.findIndex(x=>String(x.id)===id); items[index]={...original,history:existing.history||[]};
    writeJsonAtomic(PRINT_MODELS_FILE,{version:'2.0',items});
    return res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent('Modelo do sistema restaurado.'));
  }
  if(action==='duplicate'&&id){
    if(existing){items.push({...existing,id:`modelo-${Date.now()}`,name:`${existing.name} - Cópia`,system:false,nativeKind:null,editorDriven:true,history:[]});writeJsonAtomic(PRINT_MODELS_FILE,{version:'2.0',items});}
    return res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent('Modelo duplicado.'));
  }
  let visualConfig = null;
  if (req.body.visualConfig) {
    try { const parsed=JSON.parse(String(req.body.visualConfig)); if(parsed&&typeof parsed==='object') visualConfig=parsed; } catch (_) {}
  }
  const model={id:id||`modelo-${Date.now()}`,name:String(req.body.name||'Novo modelo').trim(),type:['sale','service_order','credit_book','return','all'].includes(req.body.type)?req.body.type:'all',paper:req.body.paper==='thermal'?'thermal':'a4',content:String(req.body.content||'').trim(),active:req.body.active==='on',visualConfig};
  const index=items.findIndex(x=>String(x.id)===model.id);
  if(index>=0){
    const previous=items[index];
    const history=Array.isArray(previous.history)?previous.history:[];
    if(previous.content!==model.content) history.unshift({at:new Date().toISOString(),content:previous.content,name:previous.name});
    items[index]={...previous,...model,system:Boolean(previous.system),nativeKind:previous.nativeKind||null,editorDriven:true,history:history.slice(0,10)};
  } else items.push({...model,system:false,editorDriven:true,history:[]});
  writeJsonAtomic(PRINT_MODELS_FILE,{version:'2.0',items});
  res.redirect('/erp/configuracoes/comprovantes?flash='+encodeURIComponent(existing?.system?'Modelo do sistema atualizado.':'Modelo personalizado salvo.'));
});

function buildPdvProductCatalog(app) {
  const purchaseCatalog = getPurchaseService(app).productCatalog();
  return purchaseCatalog
    .filter(item => item.active)
    .map(item => ({
      id: item.selectionId || item.id,
      productId: item.parentProductId || item.productId || item.id,
      name: item.name || 'Produto sem nome',
      searchAlias: [item.baseName, item.variationLabel, item.reference, item.wm10Code].filter(Boolean).join(' '),
      code: String(item.code || item.sku || item.wm10Code || ''),
      sku: String(item.sku || item.code || ''),
      barcode: String(item.barcode || ''),
      category: String(item.category || ''),
      inventoryItemId: String(item.inventoryItemId || ''),
      stockControlled: item.stockControlled === true,
      allowNegative: item.allowNegative === true,
      availableQuantity: item.stockControlled === true ? Number(item.availableStock || 0) : null,
      salePrice: Number(item.salePrice || 0),
      unitCost: Number(item.currentCost || 0),
      variationLabel: String(item.variationLabel || ''),
      baseName: String(item.baseName || '')
    }))
    .sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
}

router.get('/pdv/catalogo', (req, res) => {
  try {
    return res.json({ success:true, products:buildPdvProductCatalog(req.app), updatedAt:new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success:false, message:error.message || 'Não foi possível atualizar o catálogo do PDV.' });
  }
});

function pdvOperationHasUserContent(operation = {}) {
  const hasText = value => String(value ?? '').trim().length > 0;
  const hasArray = value => Array.isArray(value) && value.length > 0;
  const hasMeaningfulObject = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value).some(entry => {
      if (Array.isArray(entry)) return entry.length > 0;
      if (entry && typeof entry === 'object') return hasMeaningfulObject(entry);
      if (typeof entry === 'boolean') return entry === true;
      if (typeof entry === 'number') return entry !== 0;
      return hasText(entry);
    });
  };

  return Boolean(
    hasText(operation.customerId) ||
    hasText(operation.customerNameSnapshot) ||
    hasText(operation.identifier) ||
    hasText(operation.sellerId) ||
    hasText(operation.sellerNameSnapshot) ||
    hasText(operation.notes) ||
    hasText(operation.details) ||
    hasArray(operation.items) ||
    hasArray(operation.payments) ||
    hasMeaningfulObject(operation.coupon) ||
    hasMeaningfulObject(operation.serviceOrder)
  );
}

function findEmptyOpenPdvSale(commerce, cashboxId = '') {
  return commerce.listOperations({ status: 'open' })
    .find(operation =>
      operation.type === 'sale' &&
      (!cashboxId || String(operation.cashboxId || '') === String(cashboxId)) &&
      !pdvOperationHasUserContent(operation)
    ) || null;
}

router.get('/pdv', (req, res) => {
  const printOnly = String(req.query.somenteImpressao || '') === '1';
  const requestedPrintReturnUrl = String(req.query.voltar || '/erp/centro-operacoes');
  const printReturnUrl = requestedPrintReturnUrl.startsWith('/erp/centro-operacoes') ? requestedPrintReturnUrl : '/erp/centro-operacoes';
  const paths = req.app.locals.paths;
  const productsFile = path.join(paths.CONTENT_DIR, 'products.json');
  const productsRaw = readJson(productsFile, { items: [] }).items || [];
  const erpCategories = getErpCategoryService(req.app).list({ includeInactive: true });
  const erpCategoryById = new Map(erpCategories.map(category => [String(category.id), category]));
  const inventory = getInventoryService(req.app);
  const customerService = getCustomerService(req.app);
  const customers = customerService.listCustomers({ includeInactive: false });
  const customerClassifications = customerService.listClassifications();
  const customerFieldSettings = customerService.getFieldSettings();
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
      const forceNew = String(req.query.forcarNova || '') === '1';
      const selectedCustomerId = String(req.query.cliente || '');
      const exchangeReturnId = String(req.query.troca || '').trim();
      const selectedCustomer = selectedCustomerId ? customerService.getCustomer(selectedCustomerId) : null;
      const reusableEmptyOperation = forceNew ? null : findEmptyOpenPdvSale(commerce, selectedCashboxId);
      if (reusableEmptyOperation) {
        let operationToOpen = reusableEmptyOperation;
        // Ao voltar de troca/devolução, reaproveita a venda vazia já aberta e apenas
        // vincula o cliente. Evita criar vários rascunhos vazios no PDV.
        if (selectedCustomer) {
          operationToOpen = commerce.saveOperation({
            id:reusableEmptyOperation.id, version:reusableEmptyOperation.version, type:'sale', cashboxId:selectedCashboxId,
            customerId:selectedCustomer.id, customerNameSnapshot:selectedCustomer.name, items:[], payments:[]
          }, userName(req));
        }
        return res.redirect(`/erp/pdv?caixa=${encodeURIComponent(selectedCashboxId)}&operacao=${encodeURIComponent(operationToOpen.id)}&rascunhoVazio=1${exchangeReturnId ? `&troca=${encodeURIComponent(exchangeReturnId)}` : ''}`);
      }
      const reservedOperation = commerce.saveOperation({
        type: 'sale',
        cashboxId: selectedCashboxId,
        customerId:selectedCustomer?.id || '',
        customerNameSnapshot:selectedCustomer?.name || '',
        items: [],
        payments: []
      }, userName(req));
      return res.redirect(`/erp/pdv?caixa=${encodeURIComponent(selectedCashboxId)}&operacao=${encodeURIComponent(reservedOperation.id)}${exchangeReturnId ? `&troca=${encodeURIComponent(exchangeReturnId)}` : ''}`);
    } catch (error) {
      console.error('Não foi possível reservar a nova operação:', error);
      return res.redirect(`/erp/pdv?caixa=${encodeURIComponent(selectedCashboxId)}&flash=${encodeURIComponent(error.message || 'Não foi possível criar a nova operação.')}`);
    }
  }

  const current = req.query.operacao ? commerce.getOperation(String(req.query.operacao)) : null;

  const products = buildPdvProductCatalog(req.app);

  const financeMethods = getReceivablesService(req.app);
  const currentReceivables = current ? financeMethods.list().filter(title =>
    (Array.isArray(current.receivableIds) && current.receivableIds.map(String).includes(String(title.id))) ||
    String(title.originId || '') === String(current.id)
  ) : [];
  const paymentMethods = getPdvPaymentMethods(req.app).map(method => {
    const configured = financeMethods.resolvePaymentMethod({ methodId:method.id, methodName:method.name }) || {};
    return { ...method, ...configured, id:method.id, name:method.name };
  });

  const printSettings = readJson(PRINT_SETTINGS_FILE,{});
  const printModels = ensureNativePrintModels();
  if (printSettings.logoUrl && printSettings.logoUrl.startsWith('/uploads/')) printSettings.logoUrl = `/public${printSettings.logoUrl}`;

  const cashboxSettings = commerce.getCashboxSettings(selectedCashboxId);
  const erpUsers = getUserService(req.app).list({ includeInactive:false });
  const carriers = getCarrierService(req.app).list({ includeInactive:false });
  const sellerUsers = erpUsers.filter(user => user.seller === true);
  const technicianUsers = erpUsers.filter(user => user.technician === true);
  const loggedUserName = req.user?.displayName || req.user?.name || req.user?.email || '';
  const canApproveDiscount = !req.app.locals.authService || req.app.locals.authService.can(req.user,'pdv.discount.approve');
  const canDiscount = !req.app.locals.authService || req.app.locals.authService.can(req.user,'pdv.discount') || canApproveDiscount;
  const canReturns = !req.app.locals.authService || req.app.locals.authService.can(req.user,'pdv.returns');
  const discountLimitPercent = Math.min(100,Math.max(0,Number(req.user?.pdvPolicy?.maxDiscountPercent||0)));
  const allowedSellers = Array.isArray(cashboxSettings.allowedSellers) ? cashboxSettings.allowedSellers : [];
  const loggedUserAliases=[req.user?.displayName,req.user?.name,req.user?.username].filter(Boolean).map(value=>String(value).trim().toLowerCase());
  const loggedUserAllowedAsSeller = !!loggedUserName && (!allowedSellers.length || allowedSellers.some(name => loggedUserAliases.includes(String(name).trim().toLowerCase())));
  const operationAlreadyHasSeller = !!String(current?.sellerNameSnapshot || '').trim();
  const automaticSeller = !operationAlreadyHasSeller && cashboxSettings.useLoggedUserAsSeller !== false && loggedUserAllowedAsSeller
    ? loggedUserName
    : (!operationAlreadyHasSeller ? String(cashboxSettings.defaultSeller || '') : '');

  const emptyOpenSale = findEmptyOpenPdvSale(commerce, selectedCashboxId);

  let exchangeContext = null;
  const exchangeReturnId = String(req.query.troca || '').trim();
  if (exchangeReturnId && current) {
    try {
      const returnRecord = getReturnService(req.app).get(exchangeReturnId);
      if (returnRecord && String(returnRecord.customerId || '') === String(current.customerId || '')) {
        exchangeContext = {
          record: returnRecord,
          wallet: getCustomerWalletService(req.app).summary(returnRecord.customerId)
        };
      }
    } catch (_) {}
  }

  res.render('pdv', {
    flash: req.query.flash || null,
    products,
    customers,
    customerClassifications,
    customerFieldSettings,
    cashboxes,
    selectedCashboxId,
    openSession,
    cashBalance,
    cashState,
    current,
    currentReceivables,
    operations: commerce.listOperations({ status: 'open' }),
    emptyOpenSale,
    paymentMethods,
    cashboxSettings,
    erpUsers,
    sellerUsers,
    technicianUsers,
    carriers,
    loggedUserName,
    automaticSeller,
    canDiscount,
    canApproveDiscount,
    canReturns,
    exchangeContext,
    discountLimitPercent,
    selectedCustomerId: String(req.query.cliente || ''),
    coupons: getCouponService(req.app).list({includeInactive:false}),
    operationStatuses: readJson(OPERATION_STATUSES_FILE,{items:[]}).items || [],
    printSettings,
    printModels,
    printOnly,
    printReturnUrl,
    pageClass: printOnly ? 'pdv-print-only' : ''
  });
});


router.get('/pdv/trocas-devolucoes', (req,res) => {
  try {
    const commerce=getCommerceService(req.app),returns=getReturnService(req.app),customerService=getCustomerService(req.app);
    const q=String(req.query.q||'').trim(),selectedId=String(req.query.venda||'').trim();
    const sales=commerce.listOperations({status:'finalized'}).filter(operation=>operation.type==='sale').filter(operation=>{
      if(!q)return true;
      return matchesSearchText([operation.number,operation.customerNameSnapshot,operation.identifier,...(operation.items||[]).flatMap(item=>[item.name,item.code,item.sku])].join(' '),q);
    }).slice(0,80);
    let selected=null;
    if(selectedId){
      const preview=returns.operationPreview(selectedId);
      selected={...preview,customer:preview.operation.customerId?customerService.getCustomer(preview.operation.customerId):null};
    }
    return res.render('trocas_devolucoes',{flash:req.query.flash||null,q,sales,selected,customers:customerService.listCustomers({includeInactive:false}),reasons:RETURN_REASONS,recentReturns:returns.list({}).slice(0,30)});
  } catch(error){
    return res.status(400).render('trocas_devolucoes',{flash:error.message||'Não foi possível abrir Trocas e Devoluções.',q:String(req.query.q||''),sales:[],selected:null,customers:[],reasons:RETURN_REASONS,recentReturns:[]});
  }
});


router.get('/pdv/trocas-devolucoes/:id/imprimir', (req,res) => {
  try {
    const returns=getReturnService(req.app),record=returns.get(String(req.params.id||'').trim());
    if(!record) return res.status(404).send('Troca/devolução não encontrada.');
    const customer=record.customerId?getCustomerService(req.app).getCustomer(record.customerId):null;
    const printSettings=readJson(PRINT_SETTINGS_FILE,{}),models=ensureNativePrintModels();
    const requestedModelId=String(req.query.modelo||'').trim();
    const requestedModel=requestedModelId?models.find(model=>String(model.id)===requestedModelId&&model.type==='return'&&model.active!==false):null;
    const model=requestedModel||models.find(model=>model.type==='return'&&model.active!==false)||nativePrintModels(printSettings).find(model=>model.id==='return-receipt');
    if(!model) return res.status(500).send('Modelo de impressão de troca/devolução não encontrado.');

    const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const date=value=>{const parsed=new Date(value||'');return Number.isNaN(parsed.getTime())?String(value||'—'):parsed.toLocaleString('pt-BR');};
    const safe=value=>escapePrintHtml(value||'—');
    const customerAddress=[customer?.address?.street||customer?.street,customer?.address?.number||customer?.number,customer?.address?.complement||customer?.complement,customer?.address?.district||customer?.district,customer?.address?.city||customer?.city,customer?.address?.state||customer?.state,customer?.address?.zipCode||customer?.zipCode||customer?.postalCode].filter(Boolean).join(', ')||'—';
    const dispositions={sellable:'Retorno ao estoque vendável',quarantine:'Quarentena / análise',discarded:'Descartado / sem retorno ao estoque',none:'Sem movimentação de estoque'};
    const itemRows=(record.items||[]).map(item=>`<tr><td>${safe(String(item.code||'').replace(/^PRD-/i,'')||'—')}</td><td>${safe(item.name)}</td><td>${safe(item.quantity)}</td><td>${money(item.unitCredit)}</td><td>${safe(dispositions[item.disposition]||item.disposition||'—')}</td><td>${money(item.totalCredit)}</td></tr>`).join('')||'<tr><td colspan="6">Nenhum item registrado.</td></tr>';
    const itemsTable=`<table class="document-items"><thead><tr><th>Cód.</th><th>Produto</th><th>Qtd.</th><th>Crédito un.</th><th>Destino</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>`;
    const financialRows=[];
    if(Number(record.financial?.receivableApplied||0)>0) financialRows.push(`<div class="document-row"><span>Abatimento em contas a receber</span><b>${money(record.financial.receivableApplied)}</b></div>`);
    if(Number(record.financial?.walletCredit||0)>0) financialRows.push(`<div class="document-row"><span>Crédito na carteira do cliente</span><b>${money(record.financial.walletCredit)}</b></div>`);
    for(const adjustment of record.financial?.receivableAdjustments||[]) financialRows.push(`<div class="document-row" style="font-size:11px;margin-left:12px"><span>Título ${safe(adjustment.number||adjustment.receivableId||'—')}</span><b>${money(adjustment.value)}</b></div>`);
    if(!financialRows.length) financialRows.push('<div class="document-row"><span>Registro financeiro</span><b>Sem movimentação financeira vinculada</b></div>');
    let logoUrl=String(printSettings.logoUrl||'');if(logoUrl.startsWith('/uploads/'))logoUrl=`/public${logoUrl}`;
    const logoWidth=Math.min(100,Math.max(25,Number(printSettings.logoWidthPercent||72))),logoTop=Math.min(30,Math.max(0,Number(printSettings.logoMarginTop||0))),logoBottom=Math.min(30,Math.max(0,Number(printSettings.logoMarginBottom??7))),logoAlign=['left','center','right'].includes(printSettings.logoAlign)?printSettings.logoAlign:'center';
    const logoMargin=logoAlign==='left'?`${logoTop}px auto ${logoBottom}px 0`:logoAlign==='right'?`${logoTop}px 0 ${logoBottom}px auto`:`${logoTop}px auto ${logoBottom}px auto`;
    const logo=logoUrl?`<img class="document-logo" style="width:${logoWidth}%;margin:${logoMargin}" src="${escapePrintHtml(logoUrl)}" alt="Logo">`:'';
    const variables={
      empresa:safe(printSettings.companyName||'QUALITY CELULARES'),empresa_razao:safe(printSettings.companyLegalName||printSettings.companyName||'QUALITY CELULARES'),empresa_cnpj:safe(printSettings.companyDocument),empresa_endereco:safe(printSettings.companyAddress),empresa_cidade:safe(printSettings.companyCity),empresa_telefone:safe(printSettings.companyPhone),empresa_email:safe(printSettings.companyEmail),empresa_site:safe(printSettings.companyWebsite),empresa_logo:logo,
      cliente:safe(customer?.name||record.customerName||'Consumidor final'),cpf:safe(customer?.documentFormatted||formatDocument(customer?.document||customer?.cpfCnpj||customer?.cpf||customer?.cnpj||'')),telefone:safe(customer?.mobileFormatted||customer?.mobile||customer?.phoneFormatted||formatPhone(customer?.phone||'')),endereco:safe(customerAddress),cliente_email:safe(customer?.email),
      devolucao_numero:safe(record.number),devolucao_tipo:safe(record.type==='exchange'?'TROCA':'DEVOLUÇÃO'),devolucao_data:safe(date(record.createdAt)),data:safe(date(record.createdAt)),venda_original:safe(`#${record.originalOperationNumber||record.originalOperationId||'—'}`),devolucao_motivo:safe(record.reasonLabel||record.reasonCode),devolucao_motivo_detalhes:safe([record.reason,record.notes].filter(Boolean).join(' — ')||'—'),devolucao_itens:itemsTable,devolucao_total:money(record.totalCredit),devolucao_financeiro:financialRows.join(''),devolucao_operador:safe(record.createdBy||'painel')
    };
    return res.render('troca_devolucao_impressao',{model,variables});
  } catch(error) {
    console.error('Erro ao imprimir troca/devolução:',error);
    return res.status(500).send(error.message||'Não foi possível gerar a impressão da troca/devolução.');
  }
});

router.post('/pdv/trocas-devolucoes', express.json(), (req,res) => {
  try {
    const record=getReturnService(req.app).create(req.body||{},userName(req));
    const kind=record.type==='exchange'?'Troca':'Devolução';
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'pdv',action:record.type==='exchange'?'EXCHANGE_COMPLETED':'RETURN_COMPLETED',entityType:'return',entityId:record.id,label:`${kind} ${record.number} registrada`,after:record,ip:req.ip||''});
    req.app.locals.kernelService?.logs?.record?.({
      ...(req.kernelContext||{}),module:'pdv',action:record.type==='exchange'?'TROCA_REGISTRADA':'DEVOLUCAO_REGISTRADA',category:'operational',result:'success',
      entityType:'return',entityId:record.id,documentId:record.number,route:req.originalUrl.split('?')[0],method:req.method,statusCode:200,
      label:`${kind} ${record.number} registrada · Venda #${record.originalOperationNumber} · ${record.customerName}`,
      details:{type:record.type,originalOperationId:record.originalOperationId,originalOperationNumber:record.originalOperationNumber,customerId:record.customerId,customerName:record.customerName,totalCredit:record.totalCredit,reason:record.reason,items:(record.items||[]).map(item=>({name:item.name,quantity:item.quantity}))}
    });
    req.kernelSemanticLogged=true;
    return res.json({success:true,message:`${kind} registrada com sucesso.`,record,wallet:getCustomerWalletService(req.app).summary(record.customerId)});
  } catch(error){return res.status(400).json({success:false,message:error.message||'Não foi possível registrar a troca/devolução.'});}
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
  const paymentMethods = getPdvPaymentMethods(req.app);
  // Movimentos antigos de Contas a Pagar podem guardar o ID financeiro (PAY-...).
  // Incluímos essas formas na tabela de nomes do Caixa para que o histórico mostre
  // "Debitado da conta" (ou outro nome amigável) sem alterar o vínculo interno.
  const financialPaymentMethods = getFinanceService(req.app).listCatalog('paymentMethods', { includeInactive:true });
  const knownMethodIds = new Set(paymentMethods.map(item => String(item.id)));
  for (const method of financialPaymentMethods) {
    if (!method?.id || knownMethodIds.has(String(method.id))) continue;
    paymentMethods.push({ id:String(method.id), name:String(method.name || method.code || method.id), active:method.active !== false, kind:'finance' });
    knownMethodIds.add(String(method.id));
  }
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
  const allOperations = commerce.listOperations({ status: 'all' });
  const operationsById = new Map(allOperations.map(op => [String(op.id), op]));
  const customersById = new Map(getCustomerService(req.app).listCustomers({includeInactive:true}).map(c=>[String(c.id),c]));
  const decorateMovement = movement => {
    const operation = movement.referenceId ? operationsById.get(String(movement.referenceId)) : null;
    const operationType = operation?.type || movement.referenceType || '';
    return {
      ...movement,
      operationNumber: operation?.number || null,
      operationType,
      operationLabel: operationType === 'service_order' ? 'O.S.' : operationType === 'sale' ? 'Venda' : '',
      customerName: customersById.get(String(operation?.customerId || movement.metadata?.customerId || ''))?.name || operation?.customerNameSnapshot || movement.metadata?.customerName || '',
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
    const receiptTypes = new Set(['sale_receipt','receivable_receipt']);
    for (const movement of selectedMovements) {
      const signed = Number(movement.signedAmount || 0);
      const isReceipt = receiptTypes.has(movement.type) && signed > 0;
      const isReversal = movement.type === 'refund' && signed < 0;
      if (!isReceipt && !isReversal) continue;
      const key = String(movement.methodId || 'outros');
      if (!byMethod[key]) byMethod[key] = { methodId:key, entries:0, exits:0, total:0, count:0, reversals:0 };
      byMethod[key].total = Math.round((byMethod[key].total + signed) * 100) / 100;
      if (isReceipt) { byMethod[key].entries += signed; byMethod[key].count += 1; }
      if (isReversal) { byMethod[key].exits += Math.abs(signed); byMethod[key].reversals += 1; }
    }
    const openingBalance = Number(session.openingBalance || 0);
    const cashMovements = selectedMovements.filter(m => commerce.isCashMethod(m.methodId));
    const cashEntries = cashMovements.filter(m => Number(m.signedAmount || 0) > 0).reduce((sum,m)=>sum+Number(m.signedAmount||0),0);
    const cashExits = cashMovements.filter(m => Number(m.signedAmount || 0) < 0).reduce((sum,m)=>sum+Math.abs(Number(m.signedAmount||0)),0);
    const supplies = selectedMovements.filter(m => m.type === 'supply' && commerce.isCashMethod(m.methodId)).reduce((sum,m)=>sum+Number(m.amount||0),0);
    const withdrawals = selectedMovements.filter(m => ['withdrawal','expense'].includes(m.type) && commerce.isCashMethod(m.methodId)).reduce((sum,m)=>sum+Number(m.amount||0),0);
    const receiptTypeList = ['sale_receipt','receivable_receipt'];
    const cashReceived = selectedMovements.filter(m => receiptTypeList.includes(m.type) && commerce.isCashMethod(m.methodId) && Number(m.signedAmount||0)>0).reduce((sum,m)=>sum+Number(m.amount||0),0);
    const totalReceived = selectedMovements.filter(m => receiptTypeList.includes(m.type) && Number(m.signedAmount||0)>0).reduce((sum,m)=>sum+Number(m.amount||0),0);
    return {
      session, openingBalance, cashEntries, cashExits, supplies, withdrawals,
      cashReceived, totalReceived, cashSales:cashReceived, salesTotal:totalReceived,
      expectedBalance:Math.round((openingBalance + cashEntries - cashExits) * 100) / 100,
      byMethod:Object.values(byMethod), movementCount:selectedMovements.length
    };
  };

  const summary = viewedSession ? summarize(viewedSession, movements) : null;
  const liveSummary = openSession ? commerce.getCashSessionSummary(openSession.id) : null;
  const dailySummary = typeof commerce.getCashboxDailySummary === 'function'
    ? commerce.getCashboxDailySummary(selectedCashboxId)
    : { receivedToday: 0, exitsToday: 0, reversalsToday: 0, netReceivedToday: 0 };
  const users = [...new Set(allMovements.map(m => m.createdBy).filter(Boolean))].sort();
  const filtersActive = Boolean(filters.startDate || filters.endDate || filters.type !== 'all' || filters.method !== 'all' || filters.user || filters.operationNumber || filters.customer);
  const methodBalances = typeof commerce.getCashboxMethodBalances === 'function' ? commerce.getCashboxMethodBalances(selectedCashboxId) : (openSession && typeof commerce.getSessionMethodBalances === 'function' ? commerce.getSessionMethodBalances(openSession.id) : []);
  const canVerifyMovements = String(req.user?.profileId || '') === 'administrator';

  return res.render('caixa', {
    cashboxes, selectedCashboxId, cashState, openSession, viewedSession, summary, liveSummary, movements,
    paymentMethods, users, filters, filtersActive, closedSessions, selectedClosing, dailySummary, methodBalances, canVerifyMovements
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

router.post('/pdv/caixa/movimentacoes/:movementId/verificar', (req, res) => {
  try {
    if (String(req.user?.profileId || '') !== 'administrator') return res.status(403).json({success:false,message:'Somente administradores podem marcar movimentações como conferidas.'});
    const commerce=getCommerceService(req.app);
    const verified=req.body?.verified !== false;
    const movement=commerce.setCashMovementVerified(req.params.movementId,{verified,verifiedBy:userName(req)});
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'cash',action:verified?'CASH_MOVEMENT_VERIFIED':'CASH_MOVEMENT_UNVERIFIED',entityType:'cash_movement',entityId:movement.id,label:`Movimentação do caixa ${verified?'conferida':'desmarcada'} por ${userName(req)}`,details:{cashboxId:movement.cashboxId,type:movement.type,amount:movement.amount,methodId:movement.methodId}});
    return res.json({success:true,message:verified?'Movimentação marcada como conferida.':'Conferência removida.',movement});
  } catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível atualizar a conferência.'}); }
});

router.post('/pdv/descontos/chave', express.json(), (req, res) => {
  try {
    const auth=req.app.locals.authService;
    if(auth && !auth.can(req.user,'pdv.discount.approve')) return res.status(403).json({success:false,code:'PDV_DISCOUNT_APPROVAL_FORBIDDEN',message:'Seu usuário não pode gerar autorizações de desconto.'});
    const cashboxId=String(req.body?.cashboxId||'').trim();
    const settings=getCommerceService(req.app).getCashboxSettings(cashboxId||'caixa-principal');
    if(settings.discountApprovalEnabled===false) throw new Error('A autorização por chave temporária está desativada neste caixa.');
    const token=getDiscountApprovalService(req.app).issue({issuer:req.user,ttlMinutes:settings.discountApprovalTtlMinutes||5,cashboxId});
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'pdv',action:'DISCOUNT_APPROVAL_KEY_CREATED',entityType:'discount_approval',entityId:token.id,label:`Chave temporária de desconto gerada por ${userName(req)}`,after:{...token,code:'******'}});
    return res.json({success:true,message:`Chave gerada. Ela expira em ${token.ttlMinutes} minuto(s) e só pode ser usada uma vez.`,token});
  } catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível gerar a chave.'}); }
});


router.post('/pdv/descontos/autorizar-supervisor', express.json(), (req, res) => {
  try {
    const login=String(req.body?.login||'').trim();
    const password=String(req.body?.password||'');
    if(!login || !password) return res.status(400).json({success:false,message:'Informe o usuário e a senha do supervisor.'});
    const userService=getUserService(req.app);
    const supervisor=userService.authenticate(login,password);
    if(!supervisor) return res.status(401).json({success:false,code:'SUPERVISOR_AUTH_INVALID',message:'Usuário ou senha do supervisor inválidos.'});
    const auth=req.app.locals.authService;
    const access=auth?.accessStatus?.(supervisor,req);
    if(access && !access.allowed) return res.status(403).json({success:false,code:access.code,message:`O supervisor informado não pode autorizar neste momento. ${access.message}`});
    if(auth && !auth.can(supervisor,'pdv.discount.approve')) return res.status(403).json({success:false,code:'SUPERVISOR_DISCOUNT_FORBIDDEN',message:'Este usuário não possui permissão para autorizar descontos acima do limite.'});
    const cashboxId=String(req.body?.cashboxId||'').trim();
    const settings=getCommerceService(req.app).getCashboxSettings(cashboxId||'caixa-principal');
    if(settings.discountApprovalEnabled===false) throw new Error('A autorização acima do limite está desativada neste caixa.');
    const token=getDiscountApprovalService(req.app).issue({issuer:supervisor,ttlMinutes:Math.min(2,settings.discountApprovalTtlMinutes||5),cashboxId});
    req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'pdv',action:'DISCOUNT_SUPERVISOR_CREDENTIAL_AUTH',entityType:'discount_approval',entityId:token.id,label:`Supervisor ${supervisor.displayName||supervisor.name} autorizou desconto para ${userName(req)}`,details:{supervisorId:supervisor.id,operatorId:req.user?.id||'',cashboxId}});
    return res.json({success:true,message:`Autorizado por ${supervisor.displayName||supervisor.name}.`,approvalCode:token.code,authorizedBy:supervisor.displayName||supervisor.name});
  } catch(error){ return res.status(400).json({success:false,message:error.message||'Não foi possível validar o supervisor.'}); }
});

router.post('/pdv/operacoes', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const cashboxId = String(req.body?.cashboxId || 'caixa-principal');
    if (!commerce.getOpenSession(cashboxId)) throw new Error('Abra o caixa selecionado antes de iniciar ou alterar uma Venda/O.S.');
    const payload = { ...(req.body || {}) };
    const existingOperation=payload.id ? commerce.getOperation(String(payload.id)) : null;
    const requestedAssessment=discountAssessment(payload.items);
    const previousAssessment=discountAssessment(existingOperation?.items);
    const requestedDiscount=requestedAssessment.discount;
    const previousDiscount=previousAssessment.discount;
    let discountAuthorization=null;
    if(requestedDiscount>previousDiscount+0.009 && req.app.locals.authService) {
      const auth=req.app.locals.authService;
      const canApprove=auth.can(req.user,'pdv.discount.approve');
      const canDiscount=auth.can(req.user,'pdv.discount') || canApprove;
      const allowedPercent=Math.min(100,Math.max(0,Number(req.user?.pdvPolicy?.maxDiscountPercent||0)));
      if(!canDiscount && requestedDiscount>0.009){
        const error=new Error('Seu perfil não permite conceder descontos no PDV.'); error.status=403; error.code='PDV_DISCOUNT_FORBIDDEN'; throw error;
      }
      const exceeds=requestedAssessment.rows.find(row=>row.discount>0.009 && row.percent>allowedPercent+0.0001);
      if(exceeds){
        const settings=commerce.getCashboxSettings(cashboxId);
        if(settings.discountApprovalEnabled===false){
          const error=new Error(`Seu limite é ${allowedPercent.toFixed(2).replace('.',',')}%. O item “${exceeds.name}” está com ${exceeds.percent.toFixed(2).replace('.',',')}% de desconto e a autorização acima do limite está desativada neste caixa.`); error.status=403; error.code='PDV_DISCOUNT_LIMIT_EXCEEDED'; throw error;
        }
        const approvalCode=String(payload.discountApprovalCode||'').trim();
        if(!approvalCode){
          const error=new Error(`Seu limite é ${allowedPercent.toFixed(2).replace('.',',')}%. O item “${exceeds.name}” está com ${exceeds.percent.toFixed(2).replace('.',',')}%. Informe uma chave temporária de supervisor para continuar.`);
          error.status=428; error.code='PDV_DISCOUNT_APPROVAL_REQUIRED'; error.details={allowedPercent,requestedPercent:exceeds.percent,itemName:exceeds.name}; throw error;
        }
        discountAuthorization=getDiscountApprovalService(req.app).verifyAndConsume(approvalCode,{user:req.user,operationId:existingOperation?.id||'',cashboxId,requestedPercent:exceeds.percent});
      }
    }
    delete payload.discountApprovalCode;
    const itemBase = (Array.isArray(payload.items)?payload.items:[]).reduce((sum,item)=>sum+(Number(item.quantity||0)*Number(item.unitPrice||0)-Number(item.discount||0)),0);
    if (String(payload.couponCode || '').trim()) payload.coupon = getCouponService(req.app).validate(payload.couponCode,itemBase,{customerId:payload.customerId});
    else payload.coupon = null;
    const operation = commerce.saveOperation(payload, userName(req));
    if(discountAuthorization){
      req.app.locals.kernelService?.audits?.record?.({actor:userName(req),module:'pdv',action:'DISCOUNT_ABOVE_LIMIT_AUTHORIZED',entityType:'operation',entityId:operation.id,label:`Desconto acima do limite autorizado na operação #${operation.number}`,details:{authorizationId:discountAuthorization.id,authorizedBy:discountAuthorization.issuerName,operator:userName(req),requestedPercent:discountAuthorization.requestedPercent}});
    }
    return res.json({ success:true, message:discountAuthorization?'Operação salva com desconto autorizado por chave temporária.':'Operação salva em aberto.', operation, discountAuthorization:discountAuthorization?{authorizedBy:discountAuthorization.issuerName}:null });
  } catch (error) { return res.status(error.status || 400).json({ success:false, message:error.message, code:error.code || null, current:error.current || null, details:error.details || null }); }
});

router.post('/pdv/operacoes/:id/finalizar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    getPdvPaymentMethods(req.app);
    const operation = commerce.getOperation(String(req.params.id));
    if (!operation) throw new Error('Operação não encontrada.');
    const session = commerce.getOpenSession(operation.cashboxId);
    if (!session) throw new Error('Abra o caixa selecionado antes de finalizar a operação.');

    commerce.validateOperationForFinalization(operation);
    const receivables = getReceivablesService(req.app);
    const receivablePlan = receivables.validateOperation(operation);
    const walletPaymentTotal = Math.round((operation.payments || []).filter(payment => String(payment.methodId || '') === 'PM-CARTEIRA').reduce((sum,payment)=>sum+Number(payment.amount||0),0)*100)/100;
    let walletPaymentEntry = null;
    if (walletPaymentTotal > 0) {
      if (!operation.customerId) throw new Error('Selecione um cliente cadastrado para utilizar crédito de troca/devolução.');
      const walletSummary=getCustomerWalletService(req.app).summary(operation.customerId);
      if (Number(walletSummary.balance||0)+0.009 < walletPaymentTotal) {
        const error=new Error(`Crédito do cliente insuficiente. Disponível: ${Number(walletSummary.balance||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
        error.code='CUSTOMER_WALLET_INSUFFICIENT';throw error;
      }
    }
    if (receivablePlan.length) {
      const customer = getCustomerService(req.app).getCustomer(operation.customerId);
      const creditLimit = Number(customer?.creditLimit || 0);
      const requestedCredit = receivablePlan.reduce((sum, row) => sum + Number(row.payment?.amount || 0), 0);
      if (creditLimit > 0) {
        const creditSummary = receivables.customerCreditSummary(operation.customerId);
        const availableCredit = Math.max(0, creditLimit - Number(creditSummary.openBalance || 0));
        if (requestedCredit > availableCredit + 0.009) {
          const error = new Error(`Limite de crédito insuficiente. Disponível: ${availableCredit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}. Solicitado no crediário: ${requestedCredit.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}.`);
          error.code = 'CUSTOMER_CREDIT_LIMIT_EXCEEDED';
          throw error;
        }
      }
    }

    const blockingCount = getStockCountService(req.app).getActiveBlockingCount();
    if (blockingCount) {
      const error = new Error(`Contagem de estoque ${blockingCount.id} em andamento. O PDV está bloqueado até concluir ou cancelar o inventário.`);
      error.code = 'STOCK_COUNT_PDV_BLOCKED';
      throw error;
    }

    const productsFile = path.join(req.app.locals.paths.CONTENT_DIR, 'products.json');
    const productsData = readJson(productsFile, { items: [] });
    const erpCategories = getErpCategoryService(req.app).list({ includeInactive: true });
    const erpCategoryById = new Map(erpCategories.map(category => [String(category.id), category]));
    const inventory = getInventoryService(req.app);
    if (operation.inventoryPostedAt) throw new Error('Esta operação já teve o estoque processado. Use o recebimento futuro no módulo financeiro quando ele estiver disponível.');

    const resolveOperationProduct = (item = {}) => {
      const items = productsData.items || [];
      const direct = items.find(p => String(p.id) === String(item.productId));
      if (direct) return direct;
      // Compatibilidade com rascunhos criados antes do ajuste de variações no PDV:
      // alguns itens antigos gravaram o selectionId da variação em productId.
      // O inventoryItemId é a identidade física confiável da combinação.
      const inventoryItemId = String(item.inventoryItemId || '');
      if (!inventoryItemId) return null;
      return items.find(p =>
        String(p?.inventory?.itemId || '') === inventoryItemId ||
        (p?.variations?.combinations || []).some(combo => String(combo?.inventoryItemId || '') === inventoryItemId)
      ) || null;
    };

    for (const item of operation.items || []) {
      const product = resolveOperationProduct(item);
      if (!product) throw new Error(`Produto não encontrado: ${item.name}.`);

      // Categoria ERP do tipo Serviço prevalece sobre flags antigas do produto
      // ou do item salvo na operação.
      const erpCategory = erpCategoryById.get(String(product?.erp?.categoryId || ''));
      const isService = erpCategory?.type === 'service';
      const selectedVariation = (product?.variations?.combinations || []).find(combo => String(combo?.inventoryItemId || '') === String(item.inventoryItemId || '')) || null;
      // Compatibilidade de estoque legado: operações antigas podem ter gravado
      // o próprio productId como inventoryItemId (ex.: 178... em vez de PRD-178...).
      // Para produto simples, a identidade atual do cadastro é a fonte de verdade.
      // Em variações, preserva a identidade física da combinação selecionada.
      const inventoryItemId = String(selectedVariation?.inventoryItemId || product?.inventory?.itemId || item.inventoryItemId || '');
      const stockControlledNow = !isService && product?.inventory?.stockControlled === true && !!inventoryItemId;
      if (stockControlledNow && item.inventoryItemId !== inventoryItemId) {
        item.inventoryItemId = inventoryItemId;
        item.stockControlled = true;
      }
      if (!stockControlledNow) continue;

      const allowNegative = product?.inventory?.allowNegative === true || item.allowNegative === true;
      const balance = inventory.consultarSaldo({ inventoryItemId });
      if (!allowNegative && balance.availableQuantity < Number(item.quantity || 0)) {
        throw new Error(`Estoque insuficiente para ${item.name}. Disponível: ${balance.availableQuantity}.`);
      }
    }

    for (const item of operation.items || []) {
      const product = resolveOperationProduct(item);
      if (!product) continue;

      const erpCategory = erpCategoryById.get(String(product?.erp?.categoryId || ''));
      const isService = erpCategory?.type === 'service';
      const selectedVariation = (product?.variations?.combinations || []).find(combo => String(combo?.inventoryItemId || '') === String(item.inventoryItemId || '')) || null;
      // Compatibilidade de estoque legado: operações antigas podem ter gravado
      // o próprio productId como inventoryItemId (ex.: 178... em vez de PRD-178...).
      // Para produto simples, a identidade atual do cadastro é a fonte de verdade.
      // Em variações, preserva a identidade física da combinação selecionada.
      const inventoryItemId = String(selectedVariation?.inventoryItemId || product?.inventory?.itemId || item.inventoryItemId || '');
      const stockControlledNow = !isService && product?.inventory?.stockControlled === true && !!inventoryItemId;
      if (stockControlledNow && item.inventoryItemId !== inventoryItemId) {
        item.inventoryItemId = inventoryItemId;
        item.stockControlled = true;
      }
      if (!stockControlledNow) continue;

      const allowNegative = product?.inventory?.allowNegative === true || item.allowNegative === true;
      const result = inventory.registrarSaida({ inventoryItemId, quantity:item.quantity, reason:operation.type === 'service_order' ? 'Peça utilizada em O.S.' : 'Venda em balcão', reasonCode:'SALE', classification:'sale', createdBy:userName(req), referenceId:operation.id, allowNegative });
      if (selectedVariation) { selectedVariation.stock = result.balance.physicalQuantity; refreshDerivedVariationStock(product); }
      else product.stock = result.balance.physicalQuantity;
    }
    writeJsonAtomic(productsFile, productsData);

    const receivableMethodIds = new Set(receivablePlan.map(row => String(row.payment.methodId || '')));
    const financePaymentMethods = getFinanceService(req.app).listCatalog('paymentMethods', { includeInactive:true });
    const financeMethodById = new Map(financePaymentMethods.map(method => [String(method.id), method]));
    const paidPayments = (operation.payments || []).filter(p => p.status === 'paid' && !receivableMethodIds.has(String(p.methodId || '')));
    for (const payment of paidPayments) {
      const methodConfig=financeMethodById.get(String(payment.methodId||''));
      if (methodConfig?.creditCashOnSale===false) continue;
      commerce.addCashMovement({ cashboxId:operation.cashboxId, type:'sale_receipt', amount:payment.amount, methodId:payment.methodId, description:`${operation.type === 'service_order' ? 'O.S.' : 'Venda'} #${operation.number} — ${operation.customerNameSnapshot || operation.identifier || 'Consumidor final'}`, referenceType:operation.type, referenceId:operation.id, createdBy:userName(req), metadata:{customerId:operation.customerId||'',customerName:operation.customerNameSnapshot||'',coupon:operation.coupon||null} });
    }

    const generatedReceivables = receivables.createFromOperation(operation, userName(req));
    if (walletPaymentTotal > 0) {
      walletPaymentEntry=getCustomerWalletService(req.app).create(operation.customerId,{direction:'debit',value:walletPaymentTotal,type:'sale_payment',reason:`Crédito utilizado na ${operation.type === 'service_order' ? 'O.S.' : 'Venda'} #${operation.number}`,referenceType:'operation',referenceId:operation.id},userName(req));
    }
    commerce.markOperationPosted(operation.id, {
      // Persiste eventuais correções de identidade de estoque feitas acima.
      // Assim um futuro estorno devolve para o mesmo item físico utilizado na venda.
      items: operation.items,
      inventoryPostedAt: new Date().toISOString(),
      cashPostedAt: new Date().toISOString(),
      receivableIds:generatedReceivables.map(item=>item.id),
      walletEntryIds:walletPaymentEntry?[walletPaymentEntry.id]:[]
    }, userName(req));
    const finalized = commerce.finalizeOperation(operation.id, userName(req));
    if(finalized.coupon?.id) getCouponService(req.app).markUsed(finalized.coupon.id, finalized.id, userName(req));
    const operationKind=finalized.type==='service_order'?'O.S.':'Venda';
    req.app.locals.kernelService?.logs?.record?.({
      ...(req.kernelContext||{}),module:'pdv',action:finalized.type==='service_order'?'OS_FINALIZADA':'VENDA_FINALIZADA',category:'operational',result:'success',
      entityType:'operation',entityId:finalized.id,documentId:String(finalized.number||''),route:req.originalUrl.split('?')[0],method:req.method,statusCode:200,
      label:`${operationKind} #${finalized.number} finalizada${finalized.customerNameSnapshot?` · ${finalized.customerNameSnapshot}`:''} · ${Number(finalized.total||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}`,
      details:{type:finalized.type,customerId:finalized.customerId||'',customerName:finalized.customerNameSnapshot||'',total:finalized.total,items:(finalized.items||[]).map(item=>({name:item.name,quantity:item.quantity,subtotal:Number(item.quantity||0)*Number(item.unitPrice||0)})),paymentMethods:(finalized.payments||[]).map(payment=>payment.methodName||payment.methodId)}
    });
    req.kernelSemanticLogged=true;
    return res.json({ success:true, message:generatedReceivables.length ? 'Operação finalizada e Contas a Receber geradas com sucesso.' : 'Operação finalizada com sucesso.', operation:finalized, receivables:generatedReceivables });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});


router.post('/pdv/operacoes/juntar', (req, res) => {
  try {
    const commerce=getCommerceService(req.app);
    const sourceIds=Array.isArray(req.body?.sourceIds)?req.body.sourceIds:[];
    const sources=sourceIds.map(id=>commerce.getOperation(String(id))).filter(Boolean);
    if(sources.length!==sourceIds.length) throw new Error('Uma das vendas selecionadas não foi encontrada.');
    const cashboxId=String(sources[0]?.cashboxId||'');
    if(!cashboxId||!commerce.getOpenSession(cashboxId)) throw new Error('Abra o caixa das vendas antes de realizar a junção.');
    const operation=commerce.mergeOpenSales(sourceIds,{customerSourceId:req.body?.customerSourceId,identifierSourceId:req.body?.identifierSourceId},userName(req));
    return res.json({success:true,message:`Vendas juntadas com sucesso na nova venda #${operation.number}.`,operation,redirectUrl:`/erp/pdv?caixa=${encodeURIComponent(operation.cashboxId)}&operacao=${encodeURIComponent(operation.id)}`});
  } catch(error){ return res.status(400).json({success:false,message:error.message}); }
});

router.post('/pdv/operacoes/:id/duplicar', (req, res) => {
  try {
    const commerce = getCommerceService(req.app);
    const source = commerce.getOperation(String(req.params.id));
    if (!source) throw new Error('Operação não encontrada.');
    if (!commerce.getOpenSession(source.cashboxId)) throw new Error('Abra o caixa da operação antes de duplicá-la.');
    const operation = commerce.duplicateOperation(source.id, userName(req));
    return res.json({ success:true, message:'Operação duplicada em aberto.', operation, redirectUrl:`/erp/pdv?caixa=${encodeURIComponent(operation.cashboxId)}&operacao=${encodeURIComponent(operation.id)}` });
  } catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.post('/pdv/operacoes/:id/estornar', (req, res) => {
  const commerce = getCommerceService(req.app);
  const operationId = String(req.params.id);
  const operation = commerce.getOperation(operationId);
  if (!operation) return res.status(404).json({ success:false, message:'Operação não encontrada.' });
  if (operation.status === 'reversed' || operation.reversedAt) return res.status(409).json({ success:false, message:'Esta operação já foi estornada.' });
  if (operation.status !== 'finalized') return res.status(400).json({ success:false, message:'Somente operações concluídas podem ser estornadas.' });
  if (!commerce.getOpenSession(operation.cashboxId)) return res.status(400).json({ success:false, message:'Abra o caixa vinculado antes de estornar a operação.' });

  const reason = String(req.body?.reason || '').trim();
  const actor = userName(req);
  const receivables = getReceivablesService(req.app);
  const receivableIds = new Set((operation.receivableIds || []).map(String));
  const linkedReceivables = receivables.list()
    .filter(title => receivableIds.has(String(title.id)) || String(title.originId || '') === operation.id);

  const productsFile = path.join(req.app.locals.paths.CONTENT_DIR, 'products.json');
  const filesToBackup = [
    path.join(PANEL_DIR,'data','erp','commerce','operations.json'),
    path.join(PANEL_DIR,'data','erp','commerce','cash-movements.json'),
    path.join(PANEL_DIR,'data','erp','inventory','stock.json'),
    path.join(PANEL_DIR,'data','erp','inventory','movements.json'),
    path.join(PANEL_DIR,'data','erp','finance','receivables.json'),
    path.join(PANEL_DIR,'data','erp','finance','receivable-installments.json'),
    path.join(PANEL_DIR,'data','erp','finance','receipts.json'),
    path.join(PANEL_DIR,'data','erp','finance','receivable-events.json'),
    path.join(PANEL_DIR,'data','erp','finance','entries.json'),
    path.join(PANEL_DIR,'data','erp','finance','payments.json'),
    path.join(PANEL_DIR,'data','erp','finance','movements.json'),
    path.join(PANEL_DIR,'data','erp','finance','audit.json'),
    productsFile
  ];
  const snapshots = new Map(filesToBackup.filter(fs.existsSync).map(file => [file, fs.readFileSync(file)]));
  try {
    const inventory = getInventoryService(req.app);
    const productsData = readJson(productsFile, { items:[] });
    const effects = { inventoryMovementIds:[], cashMovementIds:[], receivableIds:[], receivableReceiptIds:[] };

    for (const item of operation.items || []) {
      if (!item.stockControlled || !item.inventoryItemId) continue;

      let product = null;
      let stockTarget = null;
      for (const row of productsData.items || []) {
        if (String(row?.inventory?.itemId || '') === String(item.inventoryItemId)) {
          product = row;
          stockTarget = row;
          break;
        }
        const combination = (row?.variations?.combinations || []).find(variation => String(variation?.inventoryItemId || '') === String(item.inventoryItemId));
        if (combination) {
          product = row;
          stockTarget = combination;
          break;
        }
      }
      if (!product) product = (productsData.items || []).find(row => String(row.id) === String(item.productId)) || null;

      // Usa a configuração atual do cadastro. Operações antigas podem ter sido
      // gravadas antes da permissão de estoque negativo ser ativada no produto
      // ou com o productId legado no lugar do inventoryItemId atual.
      const currentVariation = (product?.variations?.combinations || []).find(variation => String(variation?.inventoryItemId || '') === String(item.inventoryItemId || '')) || null;
      const canonicalInventoryItemId = String(currentVariation?.inventoryItemId || product?.inventory?.itemId || item.inventoryItemId || '');
      const allowNegative = product?.inventory?.allowNegative === true || item.allowNegative === true;
      const result = inventory.registrarEntrada({
        inventoryItemId:canonicalInventoryItemId,
        quantity:item.quantity,
        reason:`Estorno da ${operation.type==='service_order'?'O.S.':'venda'} #${operation.number}`,
        reasonCode:'SALE_REVERSAL',
        classification:'reversal',
        createdBy:actor,
        referenceId:operation.id,
        allowNegative
      });
      effects.inventoryMovementIds.push(result.movement.id);
      if (currentVariation) { currentVariation.stock = result.balance.physicalQuantity; refreshDerivedVariationStock(product); }
      else if (stockTarget && stockTarget !== product) { stockTarget.stock = result.balance.physicalQuantity; refreshDerivedVariationStock(product); }
      else if (product) product.stock = result.balance.physicalQuantity;
    }
    writeJsonAtomic(productsFile, productsData);

    const originalCash = readJson(path.join(PANEL_DIR,'data','erp','commerce','cash-movements.json'), {items:[]}).items
      .filter(row => String(row.referenceId || '') === operation.id && row.status !== 'reversed' && Number(row.signedAmount || 0) > 0);
    for (const movement of originalCash) {
      const reversed = commerce.addCashMovement({ cashboxId:operation.cashboxId, type:'refund', amount:movement.amount, methodId:movement.methodId, description:`Estorno da ${operation.type==='service_order'?'O.S.':'venda'} #${operation.number}`, referenceType:'operation_reversal', referenceId:operation.id, createdBy:actor, idempotencyKey:`operation-reversal:${operation.id}:${movement.id}`, metadata:{ originalMovementId:movement.id, reason } });
      effects.cashMovementIds.push(reversed.id);
    }

    for (const title of linkedReceivables) {
      const activeReceipts = receivables.receipts(title.id)
        .filter(receipt => receipt.status !== 'reversed' && receipt.reversalStatus !== 'reversed');

      for (const receipt of activeReceipts) {
        receivables.reverseReceipt(
          title.id,
          receipt.id,
          `Estorno automático da operação #${operation.number}${reason ? `: ${reason}` : ''}`,
          actor
        );
        effects.receivableReceiptIds.push(receipt.id);
      }

      const refreshedTitle = receivables.get(title.id);
      if (refreshedTitle && !['cancelled','reversed'].includes(refreshedTitle.status)) {
        receivables.cancel(
          refreshedTitle.id,
          `Estorno da operação #${operation.number}${reason ? `: ${reason}` : ''}`,
          actor
        );
      }
      effects.receivableIds.push(title.id);
    }

    const reversedOperation = commerce.reverseOperation(operation.id, { reason, effects }, actor);
    return res.json({ success:true, message:'Operação estornada com estoque, Caixa e financeiro revertidos.', operation:reversedOperation });
  } catch (error) {
    for (const [file, content] of snapshots) fs.writeFileSync(file, content);
    return res.status(400).json({ success:false, message:`Não foi possível concluir o estorno: ${error.message}` });
  }
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

function refreshDerivedVariationStock(product = {}) {
  const combinations = Array.isArray(product?.variations?.combinations) ? product.variations.combinations : [];
  if (!combinations.length) return Number(product?.stock) || 0;
  const total = combinations.reduce((sum, combo) => sum + Math.max(0, Number(combo?.stock) || 0), 0);
  product.stock = total;
  return total;
}

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
  const categoryMap = new Map(categories.map((item) => [String(item.slug || item.id || ''), item]));
  const subcategoryMap = new Map(subcategories.map((item) => [String(item.slug || item.id || ''), item]));
  const sourceById = new Map(products.map(item => [String(item.id), item]));

  const activeCatalog = purchaseService.productCatalog().filter(item => item.active);
  const balanceMap = service.consultarSaldosEmLote({ inventoryItemIds: activeCatalog.filter(item => item.stockControlled && item.inventoryItemId).map(item => item.inventoryItemId) });
  const inventoryProducts = activeCatalog
    .map((catalogItem) => {
      const product = sourceById.get(String(catalogItem.parentProductId)) || {};
      const controlled = catalogItem.stockControlled === true && !!catalogItem.inventoryItemId;
      const balance = controlled ? balanceMap.get(String(catalogItem.inventoryItemId)) : null;
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
        searchText: normalizeText(`${catalogItem.name} ${catalogItem.code || ''} ${catalogItem.sku || ''} ${catalogItem.barcode || ''} ${catalogItem.reference || ''} ${catalogItem.brand || ''} ${catalogItem.model || ''} ${category?.name || product.category || ''} ${subcategory?.name || product.subcategory || ''}`)
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


router.get('/estoque/contagens', (req, res) => {
  const service=getStockCountService(req.app);
  return res.render('estoque_contagens',{counts:service.list(),blockingCount:service.getActiveBlockingCount(),flash:req.query.flash||null});
});

router.post('/estoque/contagens', (req,res)=>{
  try{
    const catalog=getPurchaseService(req.app).productCatalog().filter(p=>p.active&&p.stockControlled&&p.inventoryItemId);
    const balances=getInventoryService(req.app).consultarSaldosEmLote({inventoryItemIds:catalog.map(p=>p.inventoryItemId)});
    const snapshotItems=catalog.map(p=>({inventoryItemId:p.inventoryItemId,productId:p.parentProductId,name:p.name,quantity:Number((balances.get(String(p.inventoryItemId))||{}).physicalQuantity)||0}));
    const count=getStockCountService(req.app).create({type:req.body?.type,blockPdv:req.body?.blockPdv===true,notes:req.body?.notes,createdBy:userName(req),snapshotItems});
    return res.json({success:true,message:'Contagem iniciada.',count,redirectUrl:`/erp/estoque/contagens/${encodeURIComponent(count.id)}`});
  }catch(error){return res.status(400).json({success:false,message:error.message,code:error.code||null});}
});

router.get('/estoque/contagens/:id', (req,res)=>{
  try{const service=getStockCountService(req.app);const count=service.get(req.params.id);if(!count)return res.status(404).send('Contagem não encontrada.');return res.render('estoque_contagem',{count,conference:service.conference(req.params.id)});}catch(error){return res.status(400).send(error.message);}
});

router.get('/estoque/contagens/:id/api', (req,res)=>{try{return res.json({success:true,...getStockCountService(req.app).conference(req.params.id)});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.get('/estoque/contagens/:id/produtos', (req,res)=>{
  try{
    const q=String(req.query.q||'').trim();const catalog=getPurchaseService(req.app).searchProducts(q).filter(p=>p.active&&p.stockControlled&&p.inventoryItemId).slice(0,40);
    const balances=getInventoryService(req.app).consultarSaldosEmLote({inventoryItemIds:catalog.map(p=>p.inventoryItemId)});
    const exactNormalized=normalizeText(q);
    const exactCompact=exactNormalized.replace(/[^a-z0-9]/g,'');
    const exactDigits=/^\d+$/.test(exactNormalized)?exactNormalized:'';
    const isExactIdentifier=(value)=>{
      const normalized=normalizeText(value);
      if(!normalized)return false;
      if(normalized===exactNormalized)return true;
      const compact=normalized.replace(/[^a-z0-9]/g,'');
      if(exactCompact&&compact===exactCompact)return true;
      // Atalho operacional: ao digitar somente o número do código interno,
      // "123" deve reconhecer códigos como "PRD-123" sem exigir o prefixo.
      if(exactDigits){
        const trailingDigits=(normalized.match(/(\d+)$/)||[])[1]||'';
        if(trailingDigits===exactDigits && /[a-z_-]/i.test(normalized))return true;
      }
      return false;
    };
    const items=catalog.map(p=>({id:p.id,selectionId:p.selectionId,productId:p.parentProductId,inventoryItemId:p.inventoryItemId,name:p.name,code:p.code||'',sku:p.sku||'',barcode:p.barcode||'',variationLabel:p.variationLabel||'',systemQuantity:Number((balances.get(String(p.inventoryItemId))||{}).physicalQuantity)||0,exact:[p.barcode,p.code,p.sku,p.reference].some(isExactIdentifier)})).sort((a,b)=>Number(b.exact)-Number(a.exact)||a.name.localeCompare(b.name,'pt-BR'));
    return res.json({success:true,items});
  }catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.get('/estoque/contagens/:id/catalogo', (req,res)=>{
  try{
    const count=getStockCountService(req.app).get(req.params.id);
    if(!count)return res.status(404).json({success:false,message:'Contagem não encontrada.'});
    const q=String(req.query.q||'').trim();
    const allowedLimits=[50,100,200,300];
    const requestedLimit=Number(req.query.limit)||50;
    const limit=allowedLimits.includes(requestedLimit)?requestedLimit:50;
    const page=Math.max(1,Number(req.query.page)||1);
    let catalog=(q?getPurchaseService(req.app).searchProducts(q):getPurchaseService(req.app).productCatalog())
      .filter(p=>p.active&&p.stockControlled&&p.inventoryItemId);
    catalog.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
    const total=catalog.length;
    const totalPages=Math.max(1,Math.ceil(total/limit));
    const safePage=Math.min(page,totalPages);
    const start=(safePage-1)*limit;
    const countedMap=new Map((count.items||[]).map(i=>[String(i.inventoryItemId),Number(i.countedQuantity)||0]));
    const pageItems=catalog.slice(start,start+limit);
    const balances=getInventoryService(req.app).consultarSaldosEmLote({inventoryItemIds:pageItems.map(p=>p.inventoryItemId)});
    const items=pageItems.map(p=>({
      id:p.id,selectionId:p.selectionId,productId:p.parentProductId,inventoryItemId:p.inventoryItemId,
      name:p.name,code:p.code||'',sku:p.sku||'',barcode:p.barcode||'',variationLabel:p.variationLabel||'',
      systemQuantity:Number((balances.get(String(p.inventoryItemId))||{}).physicalQuantity)||0,
      countedQuantity:countedMap.get(String(p.inventoryItemId))??null
    }));
    return res.json({success:true,items,pagination:{page:safePage,limit,total,totalPages}});
  }catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.post('/estoque/contagens/:id/itens', (req,res)=>{
  try{
    const catalog=getPurchaseService(req.app).productCatalog();const inventoryItemId=String(req.body?.inventoryItemId||'');const product=catalog.find(p=>String(p.inventoryItemId)===inventoryItemId&&p.stockControlled);
    if(!product)throw new Error('Produto controlado não encontrado.');
    const service=getStockCountService(req.app);
    const item=service.saveItem(req.params.id,{product,delta:req.body?.delta,quantity:req.body?.quantity,actor:userName(req)});
    const conference=service.conference(req.params.id);
    return res.json({success:true,message:'Contagem salva.',item,conference});
  }catch(error){return res.status(400).json({success:false,message:error.message});}
});

router.delete('/estoque/contagens/:id/itens/:inventoryItemId', (req,res)=>{try{getStockCountService(req.app).removeItem(req.params.id,req.params.inventoryItemId,userName(req));return res.json({success:true,message:'Item removido da contagem.'});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.post('/estoque/contagens/:id/cancelar', (req,res)=>{try{const count=getStockCountService(req.app).cancel(req.params.id,{actor:userName(req),reason:req.body?.reason});return res.json({success:true,message:'Contagem cancelada e mantida no histórico.',count});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.post('/estoque/contagens/:id/concluir', (req,res)=>{
  const countId=String(req.params.id||'');
  const tag=`[StockCount ${countId}]`;
  let rollback=null;
  try{
    console.log(`${tag} início da conclusão`);
    const inventory=getInventoryService(req.app);
    const stockCount=getStockCountService(req.app);
    const productsFile=path.join(req.app.locals.paths.CONTENT_DIR,'products.json');
    const productsData=readJson(productsFile,{items:[]});

    // Índice único de produtos/variações por inventoryItemId e productId.
    // Evita procurar os mesmos milhares de produtos novamente para cada divergência.
    const byProductId=new Map();
    const byInventoryItemId=new Map();
    for(const product of productsData.items||[]){
      byProductId.set(String(product.id||''),{product,selectedVariation:null});
      const ownItemId=String(product?.inventory?.itemId||'');
      if(ownItemId)byInventoryItemId.set(ownItemId,{product,selectedVariation:null});
      for(const combination of product?.variations?.combinations||[]){
        const variationItemId=String(combination?.inventoryItemId||'');
        if(variationItemId)byInventoryItemId.set(variationItemId,{product,selectedVariation:combination});
      }
    }
    // O inventário é a fonte oficial do saldo. O catálogo é apenas sincronizado quando
    // conseguimos localizar o produto correspondente. Um item contado não pode impedir
    // a conclusão só porque seu cadastro foi removido/recriado/teve o ID alterado depois.
    const normalizeLookup=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
    const byCode=new Map(),bySku=new Map(),byBarcode=new Map(),byName=new Map();
    for(const product of productsData.items||[]){
      const entry={product,selectedVariation:null};
      const code=normalizeLookup(product?.code);if(code&&!byCode.has(code))byCode.set(code,entry);
      const sku=normalizeLookup(product?.sku);if(sku&&!bySku.has(sku))bySku.set(sku,entry);
      const barcode=normalizeLookup(product?.barcode);if(barcode&&!byBarcode.has(barcode))byBarcode.set(barcode,entry);
      const name=normalizeLookup(product?.name);if(name&&!byName.has(name))byName.set(name,entry);
    }
    const resolveProduct=({inventoryItemId,productId,code,sku,barcode,name})=>
      byInventoryItemId.get(String(inventoryItemId))||byProductId.get(String(productId))||
      byCode.get(normalizeLookup(code))||bySku.get(normalizeLookup(sku))||
      byBarcode.get(normalizeLookup(barcode))||byName.get(normalizeLookup(name))||null;

    // Snapshot transacional em memória. Se qualquer etapa após o ajuste falhar,
    // estoque, movimentos, produtos e a própria contagem voltam exatamente ao estado anterior.
    const snapshotFiles=[inventory.stockFile,inventory.movementsFile,productsFile,stockCount.file];
    const snapshots=new Map(snapshotFiles.map(file=>[file,fs.existsSync(file)?fs.readFileSync(file):null]));
    rollback=()=>{for(const [file,content] of snapshots){try{if(content===null){if(fs.existsSync(file))fs.unlinkSync(file);}else fs.writeFileSync(file,content);}catch(error){console.error(`${tag} falha no rollback de ${file}:`,error);}}};

    const applyAdjustments=(plans=[])=>{
      console.log(`${tag} ${plans.length} ajuste(s) planejado(s); validando catálogo`);
      const resolved=plans.map(plan=>({plan,catalog:resolveProduct(plan)}));
      const missingCatalog=resolved.filter(x=>!x.catalog);
      if(missingCatalog.length){
        console.warn(`${tag} ${missingCatalog.length} item(ns) não existem mais no catálogo atual. O saldo oficial será ajustado normalmente pelo inventoryItemId; apenas a cópia de estoque do cadastro ausente não será sincronizada.`);
        for(const x of missingCatalog.slice(0,20))console.warn(`${tag} catálogo ausente: ${x.plan.name||x.plan.inventoryItemId} [${x.plan.inventoryItemId}]`);
      }
      console.log(`${tag} catálogo conferido; aplicando estoque em lote`);
      const results=inventory.ajustarEstoquesEmLote({
        adjustments:resolved.map(x=>({inventoryItemId:x.plan.inventoryItemId,newQuantity:x.plan.newQuantity,referenceId:x.plan.countId})),
        origin:'inventory_count',referenceType:'inventory_count',reason:`Correção de inventário · ${countId}`,
        reasonCode:'INVENTORY',classification:'inventory',createdBy:userName(req),allowNegative:false
      });
      const byItem=new Map(results.map(result=>[String(result.inventoryItemId),result]));
      for(const item of resolved){
        const result=byItem.get(String(item.plan.inventoryItemId));if(!result||!item.catalog)continue;
        if(item.catalog.selectedVariation){item.catalog.selectedVariation.stock=result.balance.physicalQuantity;refreshDerivedVariationStock(item.catalog.product);}
        else item.catalog.product.stock=result.balance.physicalQuantity;
      }
      console.log(`${tag} estoque aplicado; salvando catálogo`);
      writeJsonAtomic(productsFile,productsData);
      return results;
    };

    const count=stockCount.complete(countId,{actor:userName(req),confirmUncountedAsZero:req.body?.confirmUncountedAsZero===true,applyAdjustments});
    rollback=null;
    console.log(`${tag} concluída com sucesso; ${count.adjustmentMovementIds?.length||0} movimentação(ões) criada(s)`);
    return res.json({success:true,message:'Contagem concluída. As divergências foram aplicadas ao estoque e registradas no histórico.',count,redirectUrl:'/erp/estoque/contagens'});
  }catch(error){
    if(rollback){console.error(`${tag} erro durante conclusão; executando rollback seguro:`,error);rollback();}
    else console.error(`${tag} erro antes dos ajustes:`,error);
    return res.status(400).json({success:false,message:error.message,code:error.code||null,uncounted:error.uncounted||0});
  }
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

    if (selectedVariation) { selectedVariation.stock = result.balance.physicalQuantity; refreshDerivedVariationStock(product); }
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



router.get('/precificacao', (req,res) => {
  try {
    const service=getPricingService(req.app);
    const data=service.overview({q:req.query.q||'',categoryId:req.query.categoryId||''});
    return res.render('precificacao',{version:'1.0.0',flash:req.query.flash||null,filters:{q:req.query.q||'',categoryId:req.query.categoryId||''},...data});
  } catch(error) { return res.status(500).send(error.message||'Não foi possível abrir a precificação.'); }
});
router.post('/api/precificacao/global',(req,res)=>{try{return res.json({success:true,message:'Regra geral de precificação atualizada.',item:getPricingService(req.app).saveGlobal(req.body||{},userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/api/precificacao/categorias/:id',(req,res)=>{try{return res.json({success:true,message:'Margem padrão da categoria atualizada.',item:getPricingService(req.app).saveCategory(req.params.id,req.body?.marginPercent,userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/api/precificacao/produtos/bulk',(req,res)=>{try{return res.json({success:true,message:'Margem dos produtos atualizada.',...getPricingService(req.app).setProductMargins(req.body?.productIds||[],req.body?.marginPercent,userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/api/precificacao/produtos/:id',(req,res)=>{try{return res.json({success:true,message:'Margem própria do produto atualizada.',...getPricingService(req.app).setProductMargins([req.params.id],req.body?.marginPercent,userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/api/precificacao/variacoes',(req,res)=>{try{return res.json({success:true,message:'Margem própria da variação atualizada.',item:getPricingService(req.app).setVariationMargin(req.body?.productId,req.body?.inventoryItemId,req.body?.marginPercent,userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/api/precificacao/aplicar',(req,res)=>{try{return res.json({success:true,message:'Preços sugeridos aplicados.',...getPricingService(req.app).applySuggested(req.body?.keys||[],userName(req))});}catch(error){return res.status(400).json({success:false,message:error.message});}});

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
  const erpCategories = getErpCategoryService(req.app).tree({ includeInactive:false })
    .filter(item => item.type !== 'service');
  return res.render('compras', {
    version:'0.19.6', flash:req.query.flash || null, purchases, suppliers,
    products:service.productCatalog().filter(item=>item.active), erpCategories, catalogs:finance.catalogs, pricingRules:getPricingService(req.app).rules(),
    cashboxes, defaultCashboxId:cashboxes.find(item=>item.isOpen)?.id || cashboxes[0]?.id || 'caixa-principal'
  });
});
router.get('/compras/api', (req,res)=>{try{const service=getPurchaseService(req.app);return res.json({success:true,items:service.list(req.query||{})});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/compras/api/produtos', (req,res)=>{try{return res.json({success:true,items:getPurchaseService(req.app).searchProducts(req.query.q||'')});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/conferir', express.json({limit:'8mb'}), (req,res)=>{try{const conference=getPurchaseService(req.app).parseXml(req.body?.xml||'');return res.json({success:true,conference});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/vinculos', (req,res)=>{try{const result=getPurchaseService(req.app).saveXmlLinks(req.body||{},userName(req));return res.json({success:true,message:'Vínculos do XML gravados para as próximas importações.',result});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/vinculos/esquecer', (req,res)=>{try{const result=getPurchaseService(req.app).forgetXmlLink(req.body||{});return res.json({success:true,message:result.removed?'Vínculo aprendido removido.':'Nenhum vínculo aprendido foi encontrado para este item.',result});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/xml/sugestoes/rejeitar', (req,res)=>{try{const result=getPurchaseService(req.app).rejectXmlSuggestion(req.body||{});return res.json({success:true,message:'Sugestão descartada. O ERP não sugerirá novamente este mesmo produto para este item do XML.',result});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/produtos/rapido', (req,res)=>{try{const categoryId=String(req.body?.categoryId||'').trim();const category=getErpCategoryService(req.app).list({includeInactive:false}).find(item=>String(item.id)===categoryId&&item.type!=='service');if(!category)return res.status(400).json({success:false,message:'Selecione uma categoria ERP válida para cadastrar o produto.'});const product=getPurchaseService(req.app).createBasicProduct({...req.body,categoryId:category.id,categoryCode:category.code||'',categoryName:category.name||''});return res.json({success:true,message:'Produto cadastrado com categoria e disponível na conferência.',product});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/compras/api/:id', (req,res)=>{try{const item=getPurchaseService(req.app).get(req.params.id);if(!item)return res.status(404).json({success:false,message:'Compra não encontrada.'});return res.json({success:true,item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api', (req,res)=>{try{const item=getPurchaseService(req.app).save(req.body||{},userName(req));return res.json({success:true,message:'Compra salva com sucesso.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/:id/concluir', (req,res)=>{try{const item=getPurchaseService(req.app).complete(req.params.id,userName(req));return res.json({success:true,message:'Compra concluída. Estoque, Contas a Pagar e pagamentos imediatos foram integrados.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/:id/excluir', (req,res)=>{try{const item=getPurchaseService(req.app).deleteOpen(req.params.id,userName(req));return res.json({success:true,message:`Compra ${item.number} excluída com sucesso.`,item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/compras/api/:id/estornar', (req,res)=>{try{const item=getPurchaseService(req.app).reverse(req.params.id,req.body?.reason,userName(req));return res.json({success:true,message:'Compra estornada com rastreabilidade.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.get('/financeiro', (req, res) => {
  const foundation = getFinanceService(req.app).getFoundation() || {};
  const { settings: financeSettings = {}, dashboard: foundationDashboard = {}, ...viewData } = foundation;
  // Os cards do topo são OPERACIONAIS: usam o Caixa como fonte da verdade para
  // Vendas/O.S. e saídas efetivamente registradas. O dashboard financeiro interno
  // continua sendo usado para compromissos/vencimentos.
  const operationalDashboard = getCommerceService(req.app).getOperationalFinancialSummary();
  const dashboard = {
    today: {
      income: Number(operationalDashboard?.today?.income || 0),
      expense: Number(operationalDashboard?.today?.expense || 0)
    },
    month: {
      income: Number(operationalDashboard?.month?.income || 0),
      expense: Number(operationalDashboard?.month?.expense || 0)
    },
    balance: Number(operationalDashboard?.balance || 0),
    commitments: foundationDashboard?.commitments || {},
    movementCount: Number(operationalDashboard?.movementCount || 0),
    updatedAt: operationalDashboard?.updatedAt || null,
    source: 'commerce_cash_movements'
  };

  // Nunca enviar uma propriedade chamada "settings" para res.render().
  // O Express reserva essa chave para as configurações internas da view.
  res.render('financeiro_fundacao', {
    flash: req.query.flash || null,
    ...viewData,
    dashboard,
    financeSettings
  });
});




router.get('/relatorios', (req,res) => {
  const defaults=getReportService(req.app).defaultFilters();
  return res.render('relatorios', { flash:req.query.flash || null, reportDefaults:defaults });
});

router.get('/api/relatorios/:view', (req,res) => {
  try {
    res.set('Cache-Control','no-store');
    return res.json({ success:true, ...getReportService(req.app).query(req.params.view, req.query || {}) });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível gerar o relatório.' });
  }
});

router.get('/metas-comissoes', (req,res) => {
  const service=getCommissionService(req.app);
  const periodicity=req.query.periodicidade==='weekly'?'weekly':'monthly';
  const periodKey=service.normalizePeriodKey(periodicity,req.query.periodo||'');
  const finance=getFinanceService(req.app);
  let stores=[];
  let paymentMethods=[];
  try { stores=finance.listCatalog('stores',{includeInactive:false}).filter(item=>item.active!==false); } catch(error) { console.warn('Metas/Comissões: lojas financeiras indisponíveis:',error?.message||error); }
  try { paymentMethods=finance.listCatalog('paymentMethods',{includeInactive:false}).filter(item=>item.active!==false && (item.modules?.finance!==false || item.modules?.purchases!==false)); } catch(error) { console.warn('Metas/Comissões: formas de pagamento indisponíveis:',error?.message||error); }
  if(!stores.length) stores=[{id:'STORE-MAIN',name:'Loja principal',active:true}];
  const categories=getErpCategoryService(req.app).list({includeInactive:false});
  return res.render('metas_comissoes',{flash:req.query.flash||null,boot:{periodicity,periodKey,stores,paymentMethods,categories}});
});

router.get('/api/metas-comissoes/config', (req,res) => {
  try {
    const service=getCommissionService(req.app);
    const periodicity=req.query.periodicity==='weekly'?'weekly':'monthly';
    const periodKey=service.normalizePeriodKey(periodicity,req.query.periodKey||'');
    const storeId=String(req.query.storeId||'STORE-MAIN');
    const result=service.config({periodicity,periodKey,storeId});
    const canManage=!req.app.locals.authService || req.app.locals.authService.can(req.user,'commissions.manage');
    if(!canManage && req.user?.id){
      result.users=(result.users||[]).filter(user=>String(user.id)===String(req.user.id));
      result.rules=(result.rules||[]).filter(rule=>String(rule.userId)===String(req.user.id));
      if(result.goals?.userGoals) result.goals.userGoals=Object.fromEntries(Object.entries(result.goals.userGoals||{}).filter(([userId])=>String(userId)===String(req.user.id)));
      result.settlements=(result.settlements||[]).filter(row=>String(row.userId)===String(req.user.id));
      result.readOnly=true;
    }
    return res.json({success:true,...result});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível carregar metas e comissões.'}); }
});

router.get('/api/metas-comissoes/summary', (req,res) => {
  try {
    const service=getCommissionService(req.app);
    const periodicity=req.query.periodicity==='weekly'?'weekly':'monthly';
    const periodKey=service.normalizePeriodKey(periodicity,req.query.periodKey||'');
    const storeId=String(req.query.storeId||'STORE-MAIN');
    const result=service.summary({periodicity,periodKey,storeId});
    const canManage=!req.app.locals.authService || req.app.locals.authService.can(req.user,'commissions.manage');
    if(!canManage && req.user?.id){
      result.rows=(result.rows||[]).filter(row=>String(row.user?.id||row.userId||'')===String(req.user.id));
      result.totals={sellers:result.rows.length,commission:result.rows.reduce((sum,row)=>sum+Number(row.commission||row.totals?.commission||0),0),closed:result.rows.filter(row=>row.settlement).length,posted:result.rows.filter(row=>row.settlement?.status==='posted').length};
      result.readOnly=true;
    }
    return res.json({success:true,...result});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível apurar as comissões.'}); }
});

router.get('/api/metas-comissoes/users/:userId', (req,res) => {
  try {
    const service=getCommissionService(req.app);
    const canManage=!req.app.locals.authService || req.app.locals.authService.can(req.user,'commissions.manage');
    if(!canManage && String(req.user?.id||'')!==String(req.params.userId)) return res.status(403).json({success:false,message:'Você só pode consultar a própria apuração de comissão.'});
    const rule=service.getRule(req.params.userId);
    const periodicity=req.query.periodicity==='weekly'?'weekly':(req.query.periodicity||rule.periodicity||'monthly');
    const periodKey=service.normalizePeriodKey(periodicity,req.query.periodKey||'');
    const storeId=String(req.query.storeId||rule.storeId||'STORE-MAIN');
    return res.json({success:true,calculation:service.calculation({userId:req.params.userId,periodicity,periodKey,storeId})});
  } catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível detalhar a comissão.'}); }
});

router.post('/api/metas-comissoes/goals', (req,res) => {
  try { const result=getCommissionService(req.app).saveGoals(req.body||{},userName(req)); return res.json({success:true,message:'Metas salvas com sucesso.',...result}); }
  catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível salvar as metas.'}); }
});

router.post('/api/metas-comissoes/rules/:userId', (req,res) => {
  try { const rule=getCommissionService(req.app).saveRule(req.params.userId,req.body||{},userName(req)); return res.json({success:true,message:'Regra de comissão salva.',rule}); }
  catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível salvar a regra.'}); }
});

router.post('/api/metas-comissoes/settlements/close', (req,res) => {
  try { const settlement=getCommissionService(req.app).closeSettlement(req.body||{},userName(req)); return res.json({success:true,message:'Apuração fechada. As regras e valores deste período foram congelados.',settlement}); }
  catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível fechar a apuração.'}); }
});

router.post('/api/metas-comissoes/settlements/:id/reopen', (req,res) => {
  try { const result=getCommissionService(req.app).reopenSettlement(req.params.id,userName(req)); return res.json({success:true,message:'Apuração reaberta. Ela voltará a usar as regras atuais.',result}); }
  catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível reabrir a apuração.'}); }
});

router.post('/api/metas-comissoes/settlements/:id/finance', (req,res) => {
  try { const result=getCommissionService(req.app).postToFinance(req.params.id,req.body||{},userName(req)); return res.json({success:true,message:result.duplicated?'Esta comissão já estava lançada no Financeiro.':'Comissão lançada em Contas a Pagar.',...result}); }
  catch(error) { return res.status(400).json({success:false,message:error.message||'Não foi possível lançar a comissão no Financeiro.'}); }
});

router.get('/financeiro/dre', (req,res) => {
  const service=getDreService(req.app); const result=service.query(req.query||{}); const catalogs=service.catalogs();
  res.render('dre',{flash:req.query.flash||null,version:'0.30.3',result,filters:result.filters,catalogs});
});
router.get('/financeiro/api/dre',(req,res)=>{try{return res.json({success:true,...getDreService(req.app).query(req.query||{})});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.get('/financeiro/fluxo-de-caixa', (req,res) => {
  const today=new Date(); const start=String(req.query.start||new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10)); const end=String(req.query.end||new Date(today.getFullYear(),today.getMonth()+1,0).toISOString().slice(0,10));
  const asList=value=>Array.isArray(value)?value.map(String).filter(Boolean):(String(value||'').trim()?[String(value).trim()]:[]);
  const classifications=asList(req.query.classification);
  const legacyCostCenterIds=asList(req.query.costCenterId); const legacyAccountIds=asList(req.query.accountId);
  const filters={start,end,mode:String(req.query.mode||'ambos'),paymentMethodId:asList(req.query.paymentMethodId),origin:asList(req.query.origin),classification:classifications.length?classifications:[...legacyCostCenterIds.map(id=>`cost:${id}`),...legacyAccountIds.map(id=>`account:${id}`)],includeCashAdjustments:['1','true','on','yes','sim'].includes(String(req.query.includeCashAdjustments||'').toLowerCase())};
  const service=getCashFlowService(req.app); const result=service.query(filters); const catalogs=service.catalogs();
  const origins=[...new Set([...service.allActual({includeCashAdjustments:filters.includeCashAdjustments}),...service.allForecast()].map(x=>x.origin).filter(Boolean))].sort();
  res.render('fluxo_caixa',{flash:req.query.flash||null,version:'0.26.2',filters,result,catalogs,origins});
});
router.get('/financeiro/api/fluxo-de-caixa',(req,res)=>{try{return res.json({success:true,...getCashFlowService(req.app).query(req.query||{})});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.get('/financeiro/contas-a-receber', (req, res) => {
  const finance = getFinanceService(req.app).getFoundation();
  const customers = getCustomerService(req.app).listCustomers({ includeInactive:false });
  const receivables = getReceivablesService(req.app);
  const reconciliation = receivables.reconcileOperations(getCommerceService(req.app).listOperations({ status:'all' }), 'sistema');
  const titles = receivables.list(req.query || {});
  const summary = receivables.dashboardSummary();
  const commerce=getCommerceService(req.app); const cashboxes=commerce.listCashboxes().map(item=>({...item,isOpen:!!commerce.getOpenSession(item.id)}));
  res.render('contas_receber', { flash:req.query.flash || null, version:'0.23.6', catalogs:finance.catalogs, customers, titles, summary, reconciliation, cashboxes, conversations:listWhatsAppConversations(req.app), initialCustomerId:req.query.customerId || req.query.cliente || '', initialTitleId:req.query.titulo || '' });
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
    const service=getReceivablesService(req.app);
    // Reconciliar também na abertura do detalhe evita exibir um título antigo como
    // aberto quando a operação de origem já foi cancelada ou estornada.
    service.reconcileOperations(getCommerceService(req.app).listOperations({ status:'all' }), 'sistema');
    const item=service.get(req.params.id);
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



router.post('/financeiro/api/contas-a-receber/:id/recebimentos/:receiptId/whatsapp', async (req,res) => {
  try{
    const service=getReceivablesService(req.app); const item=service.get(req.params.id);
    if(!item) return res.status(404).json({success:false,message:'Título não encontrado.'});
    const receipt=service.receipts(req.params.id).find(row=>String(row.id)===String(req.params.receiptId));
    if(!receipt) return res.status(404).json({success:false,message:'Recebimento não encontrado.'});
    const customer=getCustomerService(req.app).getCustomer(item.customerId);
    const lines=receiptLines(item,receipt,customer); const format=req.body?.format==='pdf'?'pdf':'image';
    const buffer=format==='pdf'?receiptPdfBuffer(lines):receiptSvgBuffer(lines);
    const mimetype=format==='pdf'?'application/pdf':'image/svg+xml'; const filename=`comprovante-${String(receipt.receiptNumber||receipt.id)}.${format==='pdf'?'pdf':'svg'}`;
    await sendWhatsAppMediaToConversation(req.app,req.body?.conversationId,{buffer,mimetype,filename,caption:`Comprovante de recebimento ${String(receipt.receiptNumber||'')}`});
    return res.json({success:true,message:`Comprovante enviado como ${format==='pdf'?'PDF':'imagem'}.`});
  }catch(error){return res.status(400).json({success:false,message:error.message||'Não foi possível enviar o comprovante.'});}
});

router.post('/financeiro/api/contas-a-receber/:id/recebimentos/:receiptId/estornar', (req,res) => {
  try {
    const service=getReceivablesService(req.app);
    const result=service.reverseReceipt(req.params.id,req.params.receiptId,req.body?.reason,userName(req));
    return res.json({success:true,message:'Recebimento estornado com Caixa, saldo e histórico atualizados.',...result,summary:service.dashboardSummary(),creditSummary:service.customerCreditSummary(result.item.customerId),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});
  } catch(error) { return res.status(400).json({success:false,message:error.message}); }
});

router.post('/financeiro/api/contas-a-receber/:id/cancelar', (req, res) => {
  try { const item=getReceivablesService(req.app).cancel(req.params.id, req.body?.reason, userName(req)); return res.json({ success:true, message:'Título cancelado.', item }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});


router.get('/financeiro/contas-a-pagar', (req, res) => {
  const finance=getFinanceService(req.app).getFoundation();
  const suppliers=getSupplierService(req.app).listSuppliers({includeInactive:false});
  try {
    const reconciliation=getPurchaseService(req.app).reconcileReversedFinancials(userName(req));
    if(reconciliation.repaired) console.log(`💳 Estornos de compras reconciliados: ${reconciliation.repaired} conta(s) a pagar.`);
  } catch (error) {
    console.warn(`⚠️ Reconciliação financeira de compras estornadas: ${error.message}`);
  }
  const service=getPayablesService(req.app);
  const filters={...req.query,view:req.query.view||'active'};
  const viewCounts={
    all:service.list({view:'all'}).length,
    active:service.list({view:'active'}).length,
    paid:service.list({view:'paid'}).length,
    reversed:service.list({view:'reversed'}).length
  };
  const commerce=getCommerceService(req.app);
  const commerceSettings=typeof commerce.getSettings==='function' ? (commerce.getSettings()||{}) : {};
  const cashboxes=commerce.listCashboxes().map(item=>({
    ...item,
    isOpen:Boolean(commerce.getOpenSession(item.id)),
    openSession:commerce.getOpenSession(item.id)||null
  }));
  const defaultCashboxId=cashboxes.find(item=>item.isOpen)?.id||commerceSettings.defaultCashboxId||cashboxes[0]?.id||'caixa-principal';
  const payableCatalogs={
    ...finance.catalogs,
    costCenters:(finance.catalogs.costCenters||[]).filter(item=>item.active!==false&&item.nature!=='receita'&&item.hiddenFromCatalog!==true),
    accounts:(finance.catalogs.accounts||[]).filter(item=>item.active!==false&&item.type!=='receita'&&item.hiddenFromCatalog!==true)
  };
  res.render('contas_pagar',{
    flash:req.query.flash||null,
    version:'0.18.8.4',
    catalogs:payableCatalogs,
    suppliers,
    cashboxes,
    defaultCashboxId,
    titles:service.list(filters),
    viewCounts,
    summary:service.dashboardSummary(filters)
  });
});
router.get('/financeiro/api/contas-a-pagar',(req,res)=>{try{const reconciliation=getPurchaseService(req.app).reconcileReversedFinancials(userName(req));const service=getPayablesService(req.app);const filters=req.query||{};return res.json({success:true,items:service.list(filters),summary:service.dashboardSummary(filters),counts:{all:service.list({view:'all'}).length,active:service.list({view:'active'}).length,paid:service.list({view:'paid'}).length,reversed:service.list({view:'reversed'}).length},reconciliation});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/financeiro/api/contas-a-pagar/sugestao-classificacao',(req,res)=>{try{const suggestion=getPayablesService(req.app).suggestClassification({supplierId:req.query.supplierId,description:req.query.description});return res.json({success:true,suggestion});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.get('/financeiro/api/contas-a-pagar/:id',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.get(req.params.id);if(!item)return res.status(404).json({success:false,message:'Conta a pagar não encontrada.'});return res.json({success:true,item,supplier:item.supplierId?getSupplierService(req.app).getSupplier(item.supplierId):null,payments:service.payments(req.params.id),events:service.events(req.params.id)});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar',(req,res)=>{try{const service=getPayablesService(req.app);const payload=req.body||{};const paymentPlan=Array.isArray(payload.paymentPlan)&&payload.paymentPlan.length?payload.paymentPlan:[{paymentMethodId:payload.paymentMethodId}];const cashboxId=String(payload.cashboxId||'caixa-principal');service.validateImmediatePaymentPlan(paymentPlan,cashboxId);const created=service.create(payload,userName(req));const immediatePayments=service.payImmediatePlan(created.id,{cashboxId,paidAt:payload.paidAt||payload.issueDate||new Date().toISOString().slice(0,10),requestPrefix:`manual-payable-${created.id}`},userName(req));const item=service.get(created.id);const immediateTotal=immediatePayments.reduce((sum,payment)=>sum+Number(payment.value||payment.principalValue||0),0);return res.json({success:true,message:immediatePayments.length?`Conta a pagar cadastrada e baixada automaticamente${immediateTotal>0?` (R$ ${immediateTotal.toFixed(2).replace('.',',')})`:''}.`:'Conta a pagar cadastrada com sucesso.',item,immediatePayments,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/classificacao',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.updateClassification(req.params.id,req.body||{},userName(req));return res.json({success:true,message:'Classificação atualizada.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/:installmentId/forma-pagamento',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.updateInstallmentPaymentMethod(req.params.id,req.params.installmentId,req.body?.paymentMethodId,userName(req));return res.json({success:true,message:'Forma de pagamento da parcela atualizada.',item});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/atualizar-em-massa',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.updateInstallmentsBulk(req.params.id,req.body||{},userName(req));return res.json({success:true,message:'Parcelas atualizadas em massa.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/:installmentId/atualizar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.updateInstallment(req.params.id,req.params.installmentId,req.body||{},userName(req));return res.json({success:true,message:'Parcela atualizada.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/:installmentId/quebrar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.splitInstallment(req.params.id,req.params.installmentId,req.body?.value,userName(req));return res.json({success:true,message:'Parcela quebrada com sucesso.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/parcelas/juntar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.joinInstallments(req.params.id,req.body?.installmentIds||[],userName(req));return res.json({success:true,message:'Parcelas juntadas com sucesso.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/pagar-em-lote',(req,res)=>{try{const service=getPayablesService(req.app);const result=service.payMany(req.body||{},userName(req));const partial=result.failures.length>0&&result.results.length>0;return res.status(result.failures.length?(partial?207:400):200).json({success:result.failures.length===0,partial,message:result.failures.length?(partial?'Alguns pagamentos foram concluídos e outros precisam de atenção.':result.failures[0]?.message||'Não foi possível concluir os pagamentos.'):`${result.results.length} pagamento(s) registrado(s) com sucesso.`,...result,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,partial:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/pagar',(req,res)=>{try{const service=getPayablesService(req.app);const result=service.pay(req.params.id,req.body||{},userName(req));return res.json({success:true,message:Number(result.payment?.balanceAfter||0)<=0?'Pagamento registrado com sucesso. Parcela quitada.':'Pagamento parcial registrado com sucesso.',...result,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/pagamentos/:paymentId/estornar',(req,res)=>{try{const service=getPayablesService(req.app);const result=service.reversePayment(req.params.id,req.params.paymentId,req.body?.reason,userName(req));return res.json({success:true,message:'Pagamento estornado e reflexos financeiros revertidos.',...result,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/estornar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.reverse(req.params.id,req.body?.reason,userName(req),{reversePayments:req.body?.reversePayments===true});return res.json({success:true,message:'Conta a pagar estornada.',item,summary:service.dashboardSummary(),financialDashboard:getFinanceService(req.app).financialDashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});
router.post('/financeiro/api/contas-a-pagar/:id/cancelar',(req,res)=>{try{const service=getPayablesService(req.app);const item=service.reverse(req.params.id,req.body?.reason,userName(req),{reversePayments:req.body?.reversePayments===true});return res.json({success:true,message:'Conta a pagar estornada.',item,summary:service.dashboardSummary()});}catch(error){return res.status(400).json({success:false,message:error.message});}});

router.post('/financeiro/api/calcular-atraso', (req, res) => {
  try { return res.json({ success:true, calculation:getReceivablesService(req.app).calculateLateCharges(req.body || {}) }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.get('/financeiro/api/fundacao', (req, res) => {
  try { return res.json({ success:true, ...getFinanceService(req.app).getFoundation() }); }
  catch (error) { return res.status(400).json({ success:false, message:error.message }); }
});

router.get('/financeiro/api/catalogos/:catalogo', (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || '').toLowerCase() === 'true';
    const items = getFinanceService(req.app).listCatalog(req.params.catalogo, { includeInactive });
    return res.json({ success:true, items });
  } catch (error) { return res.status(400).json({ success:false, message:error.message || 'Não foi possível carregar o cadastro.' }); }
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

router.get('/modulo/categorias', (req, res) => res.redirect('/erp/categorias'));

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
  if (module.key === 'fluxo-caixa') return res.redirect('/erp/financeiro/fluxo-de-caixa');
  if (module.key === 'dre') return res.redirect('/erp/financeiro/dre');
  if (module.key === 'compras') return res.redirect('/erp/compras');
  if (module.key === 'relatorios') return res.redirect('/erp/relatorios');
  if (module.key === 'metas-comissoes') return res.redirect('/erp/metas-comissoes');
  res.render('erp_module_foundation', { flash: null, module });
});

export default router;
