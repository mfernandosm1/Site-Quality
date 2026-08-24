import fs from 'fs';
import path from 'path';

function readJson(file, fallback = { items: [] }) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return fallback; }
}
function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(temp, file);
}
function slugify(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function asBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no', 'inativa'].includes(String(value).toLowerCase());
}

export default class ErpCategoryService {
  constructor({ panelDir, contentDir }) {
    this.panelDir = panelDir;
    this.contentDir = contentDir;
    this.file = path.join(panelDir, 'data', 'erp', 'catalog', 'categories.json');
    this.productsFile = path.join(contentDir, 'products.json');
    this.siteCategoriesFile = path.join(contentDir, 'categories.json');
    this.siteSubcategoriesFile = path.join(contentDir, 'subcategories.json');
  }

  backupOnce(sourceFile, name) {
    if (!fs.existsSync(sourceFile)) return;
    const backupDir = path.join(this.panelDir, 'data', 'erp', 'backups', 'v0.25-categorias');
    const backupFile = path.join(backupDir, name);
    if (fs.existsSync(backupFile)) return;
    fs.mkdirSync(backupDir, { recursive: true });
    fs.copyFileSync(sourceFile, backupFile);
  }

  ensureMigration() {
    const existing = readJson(this.file, { version: '1.0', items: [] });
    const productsData = readJson(this.productsFile, { items: [] });
    const products = Array.isArray(productsData.items) ? productsData.items : [];
    let items = Array.isArray(existing.items) ? existing.items : [];
    let categoriesChanged = false;
    let productsChanged = false;

    if (!items.length) {
      const siteCategories = readJson(this.siteCategoriesFile, { items: [] }).items || [];
      const siteSubcategories = readJson(this.siteSubcategoriesFile, { items: [] }).items || [];
      const parentBySiteId = new Map();
      let sequence = 1;
      for (const cat of siteCategories) {
        const id = `ERP-CAT-${sequence++}`;
        parentBySiteId.set(String(cat.id), id);
        items.push({
          id, code: slugify(cat.slug || cat.name), name: String(cat.name || cat.slug || 'Categoria').trim(),
          description: '', type: 'product', parentId: null, active: cat.active !== false,
          source: { migratedFrom: 'site-category', legacyId: cat.id ?? null, legacySlug: cat.slug || '' },
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
      }
      for (const sub of siteSubcategories) {
        items.push({
          id: `ERP-CAT-${sequence++}`, code: slugify(sub.slug || sub.name), name: String(sub.name || sub.slug || 'Subcategoria').trim(),
          description: String(sub.description || '').trim(), type: 'product', parentId: parentBySiteId.get(String(sub.categoryId)) || null,
          active: sub.active !== false,
          source: { migratedFrom: 'site-subcategory', legacyId: sub.id ?? null, legacySlug: sub.slug || '' },
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
      }
      categoriesChanged = items.length > 0;
    }

    const byLegacy = new Map();
    for (const category of items) {
      [category.id, category.code, category.name, category.source?.legacySlug, category.source?.legacyId]
        .filter(v => v !== undefined && v !== null && String(v).trim())
        .forEach(v => byLegacy.set(slugify(v), category));
    }
    for (const product of products) {
      product.erp = product.erp && typeof product.erp === 'object' ? product.erp : {};
      if (product.erp.categoryId && items.some(item => item.id === product.erp.categoryId)) continue;
      const candidates = [product.erp.category, product.category, product.subcategory, product.subcategoria];
      const match = candidates.map(v => byLegacy.get(slugify(v))).find(Boolean);
      if (match) {
        product.erp.categoryId = match.id;
        product.erp.category = match.code;
        productsChanged = true;
      }
    }

    if (categoriesChanged) writeAtomic(this.file, { version: '1.0', migratedAt: new Date().toISOString(), items });
    if (productsChanged) {
      this.backupOnce(this.productsFile, 'products-pre-migration.json');
      writeAtomic(this.productsFile, productsData);
    }
    return { categoriesChanged, productsChanged, total: items.length };
  }

  list({ includeInactive = true } = {}) {
    this.ensureMigration();
    const data = readJson(this.file, { items: [] });
    const items = (data.items || []).filter(item => includeInactive || item.active !== false);
    return items.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
  }

  tree({ includeInactive = true } = {}) {
    const items = this.list({ includeInactive });
    const children = new Map();
    for (const item of items) {
      const key = item.parentId || '__root__';
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(item);
    }
    const walk = (parentId = null, depth = 0) => (children.get(parentId || '__root__') || []).flatMap(item => [
      { ...item, depth }, ...walk(item.id, depth + 1)
    ]);
    return walk();
  }

  usage() {
    const products = readJson(this.productsFile, { items: [] }).items || [];
    const result = {};
    for (const product of products) {
      const id = product?.erp?.categoryId;
      if (!id) continue;
      if (!result[id]) result[id] = { products: 0, lastUsedAt: null };
      result[id].products += 1;
      const date = product.updatedAt || product.createdAt || null;
      if (date && (!result[id].lastUsedAt || Date.parse(date) > Date.parse(result[id].lastUsedAt))) result[id].lastUsedAt = date;
    }
    return result;
  }

  save(input, id = null) {
    this.ensureMigration();
    const data = readJson(this.file, { version: '1.0', items: [] });
    const items = data.items || [];
    const name = String(input.name || '').trim();
    if (!name) throw new Error('Nome da categoria é obrigatório.');
    const parentId = String(input.parentId || '').trim() || null;
    if (parentId && !items.some(item => item.id === parentId)) throw new Error('Categoria superior inválida.');
    if (id && parentId === id) throw new Error('A categoria não pode ser superior dela mesma.');
    if (id && parentId) {
      const descendants = new Set([String(id)]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const row of items) {
          if (row.parentId && descendants.has(String(row.parentId)) && !descendants.has(String(row.id))) {
            descendants.add(String(row.id));
            changed = true;
          }
        }
      }
      if (descendants.has(String(parentId))) throw new Error('Uma subcategoria não pode ser escolhida como categoria superior.');
    }
    const duplicate = items.find(row => row.id !== id && String(row.name || '').trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR') && (row.parentId || null) === parentId);
    if (duplicate) throw new Error('Já existe uma categoria com esse nome neste nível.');
    const now = new Date().toISOString();
    let item = id ? items.find(row => row.id === id) : null;
    if (!item) {
      const max = items.reduce((acc, row) => Math.max(acc, Number(String(row.id).replace(/\D/g, '')) || 0), 0);
      item = { id: `ERP-CAT-${max + 1}`, createdAt: now };
      items.push(item);
    }
    Object.assign(item, {
      code: item.code || slugify(name), name, description: String(input.description || '').trim(),
      type: ['product', 'service', 'controlled_product'].includes(input.type) ? input.type : 'product',
      parentId, active: asBool(input.active, true), updatedAt: now
    });
    writeAtomic(this.file, { ...data, version: '1.0', items });
    return item;
  }

  remove(id) {
    this.ensureMigration();
    const data = readJson(this.file, { items: [] });
    const usage = this.usage()[id]?.products || 0;
    if (usage) throw new Error('Categoria vinculada a produtos não pode ser excluída. Inative-a.');
    if ((data.items || []).some(item => item.parentId === id)) throw new Error('Realoque as subcategorias antes de excluir.');
    data.items = (data.items || []).filter(item => item.id !== id);
    writeAtomic(this.file, data);
  }

  find(value) {
    const key = slugify(value);
    return this.list({ includeInactive: true }).find(item => item.id === value || slugify(item.code) === key || slugify(item.name) === key) || null;
  }
}
