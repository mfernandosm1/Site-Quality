import { matchesSearchText } from '../utils/search.js';
function text(value = '') {
  return String(value ?? '').trim();
}

function normalize(value = '') {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseDateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceLabel(source) {
  return ({ log:'Atividade', timeline:'Timeline', audit:'Auditoria' })[source] || source;
}

function moduleLabel(module = '') {
  const labels = {
    pdv:'PDV', caixa:'Caixa', financeiro:'Financeiro', 'contas-receber':'Contas a Receber',
    clientes:'Clientes', produtos:'Produtos', fornecedores:'Fornecedores', estoque:'Estoque',
    'centro-operacoes':'Centro de Operações', erp:'ERP', configuracoes:'Configurações',
    kernel:'Kernel', system:'Sistema', dashboard:'Dashboard'
  };
  return labels[module] || text(module).replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) || 'Sistema';
}

function iconFor(item) {
  const module = normalize(item.module);
  const action = normalize(item.action || item.event);
  if (module.includes('finance') || module.includes('receber') || action.includes('payment') || action.includes('receipt')) return '💰';
  if (module.includes('pdv') || action.includes('sale') || action.includes('operation')) return '🛒';
  if (module.includes('caixa') || action.includes('cash')) return '🏦';
  if (module.includes('estoque') || module.includes('produto') || action.includes('stock') || action.includes('inventory')) return '📦';
  if (module.includes('cliente')) return '👥';
  if (module.includes('fornecedor')) return '🏭';
  if (item.source === 'audit') return '🛡️';
  if (item.result === 'error') return '⚠️';
  return '🧭';
}

function buildTitle(item) {
  const label = text(item.label || item.reason);
  if (label && !['Página acessada', 'Operação executada'].includes(label)) return label;
  const action = text(item.action || item.event || 'ATIVIDADE').replace(/[_-]+/g, ' ').toLowerCase();
  return action.replace(/\b\w/g, letter => letter.toUpperCase());
}

function baseItem(source, item) {
  const action = text(item.action || item.event || 'UPDATE');
  const entityId = text(item.entityId);
  const documentId = text(item.documentId);
  return {
    id: `${source}:${item.id}`,
    rawId: item.id,
    source,
    sourceLabel: sourceLabel(source),
    at: item.at,
    module: text(item.module || 'system'),
    moduleLabel: moduleLabel(item.module || 'system'),
    action,
    title: buildTitle(item),
    actor: text(item.actor || 'painel'),
    result: text(item.result || 'success'),
    category: text(item.category || (source === 'audit' ? 'audit' : 'timeline')),
    entityType: text(item.entityType),
    entityId,
    documentId,
    route: text(item.route),
    method: text(item.method),
    statusCode: Number(item.statusCode || 0),
    durationMs: Number(item.durationMs || 0),
    ip: text(item.ip),
    icon: iconFor({ ...item, source }),
    details: item.details ?? null,
    before: source === 'audit' ? item.before ?? null : null,
    after: source === 'audit' ? item.after ?? null : null,
    reason: source === 'audit' ? text(item.reason) : ''
  };
}

export default class ErpHistoryService {
  constructor({ kernelService }) {
    if (!kernelService) throw new Error('ErpHistoryService: Kernel não informado.');
    this.kernel = kernelService;
  }

  allItems() {
    const logs = this.kernel.logs.store.read().items.map(item => baseItem('log', item));
    const timelines = this.kernel.timelines.store.read().items.map(item => baseItem('timeline', item));
    const audits = this.kernel.audits.store.read().items.map(item => baseItem('audit', item));
    return [...logs, ...timelines, ...audits].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }

  query(filters = {}) {
    const search = normalize(filters.search);
    const module = text(filters.module);
    const source = text(filters.source);
    const result = text(filters.result);
    const actor = text(filters.actor);
    const from = parseDateBoundary(filters.from);
    const to = parseDateBoundary(filters.to, true);
    const pageSize = Math.min(Math.max(Number(filters.pageSize) || 40, 10), 100);
    const requestedPage = Math.max(Number(filters.page) || 1, 1);

    const filtered = this.allItems().filter(item => {
      const at = new Date(item.at);
      if (module && item.module !== module) return false;
      if (source && item.source !== source) return false;
      if (result && item.result !== result) return false;
      if (actor && item.actor !== actor) return false;
      if (from && at < from) return false;
      if (to && at > to) return false;
      if (search) {
        const haystack = normalize([
          item.rawId, item.title, item.module, item.moduleLabel, item.action, item.actor,
          item.result, item.category, item.entityType, item.entityId, item.documentId,
          item.route, item.ip, JSON.stringify(item.details || ''), JSON.stringify(item.before || ''), JSON.stringify(item.after || '')
        ].join(' '));
        if (!matchesSearchText(haystack, search)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const pages = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(requestedPage, pages);
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const todayKey = new Date().toLocaleDateString('en-CA');
    const today = filtered.filter(item => new Date(item.at).toLocaleDateString('en-CA') === todayKey).length;
    const errors = filtered.filter(item => item.result === 'error').length;
    const critical = filtered.filter(item => item.source === 'audit').length;

    return { items, total, pages, page, pageSize, summary:{ today, errors, critical, actors:new Set(filtered.map(item => item.actor)).size } };
  }

  facets() {
    const items = this.allItems();
    const unique = key => [...new Set(items.map(item => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return { modules:unique('module'), actors:unique('actor'), results:unique('result') };
  }

  get(compositeId = '') {
    return this.allItems().find(item => item.id === compositeId) || null;
  }
}
