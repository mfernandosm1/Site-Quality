import JsonStore from './json-store.js';
const PREFIXES = { sale:'VEN', service_order:'OS', quote:'ORC', purchase:'COM', receipt:'REC', payment:'PAG', customer:'CLI', supplier:'FOR', product:'PRO', warranty:'GAR', return:'DEV', cash_session:'CX' };
export default class DocumentService {
  constructor({ file, ids }) { this.store = new JsonStore(file); this.ids = ids; }
  create(payload = {}) {
    const type = payload.type || 'document';
    const id = payload.id || this.ids.next(PREFIXES[type] || 'DOC', 6);
    const item = { id, type, status: payload.status || 'open', title: payload.title || '',
      entityType: payload.entityType || '', entityId: payload.entityId || '', customerId: payload.customerId || '',
      value: Number(payload.value || 0), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      createdBy: payload.actor || 'painel', related: Array.isArray(payload.related) ? payload.related : [], metadata: payload.metadata || null };
    this.store.append(item); return item;
  }
  list(limit = 200) { return this.store.read().items.slice().reverse().slice(0, Math.min(Number(limit) || 200, 2000)); }
  get(id) { return this.store.read().items.find(x => x.id === id) || null; }
}
