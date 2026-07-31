import JsonStore from './json-store.js';
export default class EventService {
  constructor({ file, ids }) { this.store = new JsonStore(file); this.ids = ids; }
  publish(payload = {}) {
    return this.store.append({ id: this.ids.next('EVT', 8), at: new Date().toISOString(),
      name: payload.name || 'SYSTEM_EVENT', module: payload.module || 'system', actor: payload.actor || 'painel',
      entityType: payload.entityType || '', entityId: payload.entityId || '', documentId: payload.documentId || '',
      correlationId: payload.correlationId || '', data: payload.data || null });
  }
  list(limit = 200) { return this.store.read().items.slice().reverse().slice(0, Math.min(Number(limit) || 200, 2000)); }
}
