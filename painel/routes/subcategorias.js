import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(file, fallback = { items: [] }){
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch (_) { return fallback; }
}
function writeJson(file, data){
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
function slugify(value){
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'subcategoria';
}
function uniqueSlug(base, items = [], excludeId = null){
  const clean = slugify(base);
  const used = new Set(items.filter(x => Number(x.id) !== Number(excludeId)).map(x => String(x.slug || '').toLowerCase()));
  let slug = clean, i = 2;
  while (used.has(slug)) slug = `${clean}-${i++}`;
  return slug;
}
function files(app){
  const content = P(app).CONTENT_DIR;
  return {
    subcategories: path.join(content, 'subcategories.json'),
    categories: path.join(content, 'categories.json'),
    products: path.join(content, 'products.json')
  };
}
function categories(app){ return readJson(files(app).categories).items || []; }
function validCategoryId(raw, cats){
  const id = Number(raw);
  return cats.some(c => Number(c.id) === id) ? id : null;
}
function sorted(items = []){
  return [...items].sort((a,b) => Number(a.order || 0)-Number(b.order || 0) || String(a.name||'').localeCompare(String(b.name||''), 'pt-BR'));
}

router.get('/', (req,res) => {
  const f = files(req.app);
  const data = readJson(f.subcategories);
  const cats = categories(req.app);
  const productItems = readJson(f.products).items || [];
  const usage = {};
  for (const p of productItems) {
    const slug = String(p.subcategory || p.subcategoria || '').trim();
    if (slug) usage[slug] = (usage[slug] || 0) + 1;
  }
  let flash = null;
  if (req.query.saved === '1') flash = '✅ Subcategoria salva com sucesso.';
  if (req.query.deleted === '1') flash = '🗑️ Subcategoria excluída com sucesso.';
  if (req.query.error === 'in_use') flash = '⚠️ Esta subcategoria está em uso e não pode ser excluída.';
  res.render('subcategorias', { items: sorted(data.items || []), categorias: sorted(cats), usage, flash });
});

router.post('/add', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), cats = categories(req.app);
  data.items = data.items || [];
  const name = String(req.body.name || '').trim();
  const categoryId = validCategoryId(req.body.categoryId, cats);
  if (!name || !categoryId) return res.redirect('/subcategorias?error=invalid');
  data.items.push({
    id: Date.now(), categoryId, name,
    slug: uniqueSlug(req.body.slug || name, data.items),
    order: Number(req.body.order || data.items.filter(x => Number(x.categoryId) === categoryId).length + 1),
    active: req.body.active !== 'false',
    showOnSite: req.body.showOnSite === 'true',
    description: String(req.body.description || '').trim()
  });
  writeJson(f.subcategories, data);
  res.redirect('/subcategorias?saved=1');
});

router.post('/update', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), cats = categories(req.app);
  data.items = data.items || [];
  const item = data.items.find(x => Number(x.id) === Number(req.body.id));
  if (!item) return res.redirect('/subcategorias?error=not_found');
  const categoryId = validCategoryId(req.body.categoryId, cats);
  const name = String(req.body.name || '').trim();
  if (!name || !categoryId) return res.redirect('/subcategorias?error=invalid');
  const oldSlug = item.slug;
  item.categoryId = categoryId;
  item.name = name;
  item.slug = uniqueSlug(req.body.slug || name, data.items, item.id);
  item.order = Number(req.body.order || item.order || 1);
  item.active = req.body.active === 'true';
  item.showOnSite = req.body.showOnSite === 'true';
  item.description = String(req.body.description || '').trim();
  writeJson(f.subcategories, data);

  if (oldSlug && oldSlug !== item.slug) {
    const products = readJson(f.products);
    let changed = false;
    for (const product of products.items || []) {
      if (String(product.subcategory || product.subcategoria || '') === oldSlug) {
        product.subcategory = item.slug;
        delete product.subcategoria;
        changed = true;
      }
    }
    if (changed) writeJson(f.products, products);
  }
  res.redirect('/subcategorias?saved=1');
});

router.post('/del', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), products = readJson(f.products);
  const id = Number(req.body.id);
  const item = (data.items || []).find(x => Number(x.id) === id);
  if (!item) return res.redirect('/subcategorias?error=not_found');
  const inUse = (products.items || []).some(p => String(p.subcategory || p.subcategoria || '') === String(item.slug || ''));
  if (inUse) return res.redirect('/subcategorias?error=in_use');
  data.items = (data.items || []).filter(x => Number(x.id) !== id);
  writeJson(f.subcategories, data);
  res.redirect('/subcategorias?deleted=1');
});

router.get('/api', (req,res) => {
  const data = readJson(files(req.app).subcategories);
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const items = sorted(data.items || []).filter(x => !categoryId || Number(x.categoryId) === categoryId);
  res.json({ items });
});

export default router;
