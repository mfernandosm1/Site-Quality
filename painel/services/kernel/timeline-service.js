import JsonStore from './json-store.js';
export default class TimelineService {
  constructor({ file, ids }) { this.store = new JsonStore(file); this.ids = ids; }
  add(payload = {}) {
    return this.store.append({ id: this.ids.next('TML', 8), at: new Date().toISOString(),
      entityType: payload.entityType || 'system', entityId: payload.entityId || 'global', module: payload.module || 'system',
      event: payload.event || 'UPDATE', label: payload.label || '', actor: payload.actor || 'painel',
      documentId: payload.documentId || '', details: payload.details || null });
  }
  list({ entityType = '', entityId = '', limit = 200 } = {}) {
    return this.store.read().items.slice().reverse().filter(x => (!entityType || x.entityType === entityType) && (!entityId || x.entityId === entityId)).slice(0, Math.min(Number(limit) || 200, 2000));
  }
}
