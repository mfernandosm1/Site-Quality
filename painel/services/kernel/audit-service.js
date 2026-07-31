import JsonStore from './json-store.js';
export default class AuditService {
  constructor({ file, ids }) { this.store = new JsonStore(file); this.ids = ids; }
  record(payload = {}) {
    return this.store.append({ id: this.ids.next('AUD', 8), at: new Date().toISOString(),
      module: payload.module || 'system', action: payload.action || 'UPDATE', actor: payload.actor || 'painel',
      entityType: payload.entityType || '', entityId: payload.entityId || '', documentId: payload.documentId || '',
      reason: payload.reason || '', before: payload.before ?? null, after: payload.after ?? null,
      ip: payload.ip || '', requestId: payload.requestId || '' });
  }
  list(limit = 200) { return this.store.read().items.slice().reverse().slice(0, Math.min(Number(limit) || 200, 2000)); }
}
