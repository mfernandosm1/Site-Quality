import JsonStore from './json-store.js';

function normalize(value){ return String(value || '').trim().toLowerCase(); }

export default class LogService {
  constructor({ file, ids }) { this.store = new JsonStore(file); this.ids = ids; }
  record(payload = {}) {
    return this.store.append({
      id: this.ids.next('LOG', 8), at: new Date().toISOString(),
      level: payload.level || 'info', category: payload.category || 'operational',
      module: payload.module || 'system', action: payload.action || 'UNKNOWN',
      actor: payload.actor || 'painel', result: payload.result || 'success',
      entityType: payload.entityType || '', entityId: payload.entityId || '',
      documentId: payload.documentId || '', requestId: payload.requestId || '',
      ip: payload.ip || '', device: payload.device || '', route: payload.route || '',
      method: payload.method || '', statusCode: Number(payload.statusCode || 0),
      durationMs: Number(payload.durationMs || 0), label: payload.label || '',
      details: payload.details || null
    });
  }
  query(params = {}) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || params.limit) || 50, 10), 200);
    const search = normalize(params.search);
    const from = params.from ? new Date(`${params.from}T00:00:00`) : null;
    const to = params.to ? new Date(`${params.to}T23:59:59.999`) : null;
    const filtered = this.store.read().items.slice().reverse().filter(item => {
      const at = new Date(item.at);
      if (params.module && item.module !== params.module) return false;
      if (params.action && item.action !== params.action) return false;
      if (params.actor && item.actor !== params.actor) return false;
      if (params.result && item.result !== params.result) return false;
      if (params.category && item.category !== params.category) return false;
      if (from && at < from) return false;
      if (to && at > to) return false;
      if (search) {
        const haystack = normalize([item.id,item.module,item.action,item.actor,item.result,item.label,item.route,item.documentId,item.entityId,item.ip].join(' '));
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    const total = filtered.length;
    const pages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * pageSize;
    return { items: filtered.slice(start, start + pageSize), total, page: safePage, pageSize, pages };
  }
  list(params = {}) { return this.query(params).items; }
  get(id) { return this.store.read().items.find(x => x.id === id) || null; }
  facets() {
    const items = this.store.read().items;
    const unique = key => [...new Set(items.map(x => x[key]).filter(Boolean))].sort();
    return { modules:unique('module'), actions:unique('action'), actors:unique('actor'), results:unique('result'), categories:unique('category') };
  }
}
