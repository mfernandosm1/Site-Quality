import fs from 'fs';
import path from 'path';

export default class JsonStore {
  constructor(file, initialData = { version: '0.15.0', items: [] }) {
    this.file = path.resolve(file);
    this.initialData = initialData;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (!fs.existsSync(this.file)) this.write(initialData);
  }

  read() {
    try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); }
    catch (_) { return JSON.parse(JSON.stringify(this.initialData)); }
  }

  write(data) {
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, this.file);
  }

  append(item, { maxItems = 50000 } = {}) {
    const data = this.read();
    data.items = Array.isArray(data.items) ? data.items : [];
    data.items.push(item);
    if (data.items.length > maxItems) data.items = data.items.slice(-maxItems);
    data.updatedAt = new Date().toISOString();
    this.write(data);
    return item;
  }
}
