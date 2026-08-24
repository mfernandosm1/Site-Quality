import fs from 'fs';
import path from 'path';
import JsonStore from './json-store.js';
import { matchesSearchText } from '../../utils/search.js';

function normalize(value){ return String(value || '').trim().toLowerCase(); }

/**
 * LogService v0.28.0
 *
 * Antes cada clique/page view lia e regravava todo logs.json de forma síncrona.
 * Com dezenas de milhares de registros isso bloqueava o Node por mais de 1s.
 * Agora os logs ficam em memória, são limitados aos 5.000 mais recentes e a
 * persistência é agrupada/assíncrona. O histórico operacional continua disponível
 * sem travar a navegação do ERP.
 */
export default class LogService {
  constructor({ file, ids }) {
    this.store = new JsonStore(file);
    this.ids = ids;
    this.maxItems = 5000;
    this.persistTimer = null;
    this.persistChain = Promise.resolve();
    this.data = this.store.read();
    this.data.items = Array.isArray(this.data.items) ? this.data.items : [];
    if (this.data.items.length > this.maxItems) {
      this.data.items = this.data.items.slice(-this.maxItems);
      this.data.updatedAt = new Date().toISOString();
      // Compacta o arquivo grande uma única vez na inicialização.
      this.store.write(this.data);
    }
  }

  _snapshotJson() {
    return JSON.stringify(this.data);
  }

  _persistNow() {
    const payload = this._snapshotJson();
    const target = this.store.file;
    const temp = `${target}.tmp`;
    this.persistChain = this.persistChain
      .catch(() => {})
      .then(async () => {
        await fs.promises.mkdir(path.dirname(target), { recursive:true });
        await fs.promises.writeFile(temp, payload, 'utf8');
        await fs.promises.rename(temp, target);
      })
      .catch(error => console.warn('Não foi possível persistir logs do Kernel:', error?.message || error));
    return this.persistChain;
  }

  _schedulePersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this._persistNow();
    }, 300);
  }

  async flush() {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
      await this._persistNow();
    }
    await this.persistChain.catch(() => {});
  }

  record(payload = {}) {
    const item = {
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
    };
    this.data.items.push(item);
    if (this.data.items.length > this.maxItems) this.data.items.splice(0, this.data.items.length - this.maxItems);
    this.data.updatedAt = new Date().toISOString();
    this._schedulePersist();
    return item;
  }

  query(params = {}) {
    const page = Math.max(Number(params.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(params.pageSize || params.limit) || 50, 10), 200);
    const search = normalize(params.search);
    const from = params.from ? new Date(`${params.from}T00:00:00`) : null;
    const to = params.to ? new Date(`${params.to}T23:59:59.999`) : null;
    const filtered = this.data.items.slice().reverse().filter(item => {
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
        if (!matchesSearchText(haystack, search)) return false;
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
  get(id) { return this.data.items.find(x => x.id === id) || null; }
  facets() {
    const items = this.data.items;
    const unique = key => [...new Set(items.map(x => x[key]).filter(Boolean))].sort();
    return { modules:unique('module'), actions:unique('action'), actors:unique('actor'), results:unique('result'), categories:unique('category') };
  }
}
