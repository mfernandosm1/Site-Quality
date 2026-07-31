import JsonStore from './json-store.js';

export default class IdService {
  constructor(file) { this.store = new JsonStore(file, { version: '0.15.0', counters: {} }); }
  next(prefix, width = 6) {
    const data = this.store.read();
    data.counters = data.counters || {};
    data.counters[prefix] = Number(data.counters[prefix] || 0) + 1;
    this.store.write(data);
    return `${prefix}-${String(data.counters[prefix]).padStart(width, '0')}`;
  }
}
