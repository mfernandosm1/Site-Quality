import express from 'express';
import fs from 'fs';
import path from 'path';
import { updateHeaderMenu, generateCategoryPage, generateFriendlyUrlPages } from './main_utils.js';

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

function syncSiteNavigation(app){
  try {
    const paths = P(app);
    const siteDir = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
    if (!siteDir) return;
    const cats = categories(app);
    const subs = readJson(files(app).subcategories).items || [];
    updateHeaderMenu(cats, siteDir, subs);
    // A rota pública /smartphones/ serve categoria.html diretamente.
    // Regera a página-base para que o header e o filtro de subcategoria fiquem atuais.
    generateCategoryPage('', '', siteDir);
    try { generateFriendlyUrlPages(siteDir); } catch (e) { console.warn(`⚠️ Falha ao atualizar páginas após subcategoria: ${e.message}`); }
  } catch (e) {
    console.warn(`⚠️ Falha ao sincronizar subcategorias com o site: ${e.message}`);
  }
}
function sorted(items = []){
  return [...items].sort((a,b) => Number(a.order || 0)-Number(b.order || 0) || String(a.name||'').localeCompare(String(b.name||''), 'pt-BR'));
}

router.get('/', (req,res) => {
  res.redirect('/categorias');
});

router.post('/add', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), cats = categories(req.app);
  data.items = data.items || [];
  const name = String(req.body.name || '').trim();
  const categoryId = validCategoryId(req.body.categoryId, cats);
  if (!name || !categoryId) return res.redirect('/categorias?error=invalid_subcategory');
  data.items.push({
    id: Date.now(), categoryId, name,
    slug: uniqueSlug(req.body.slug || name, data.items),
    order: Number(req.body.order || data.items.filter(x => Number(x.categoryId) === categoryId).length + 1),
    active: req.body.active !== 'false',
    showOnSite: req.body.showOnSite === 'true',
    description: String(req.body.description || '').trim()
  });
  writeJson(f.subcategories, data);
  syncSiteNavigation(req.app);
  res.redirect('/categorias?subsaved=1');
});

router.post('/update', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), cats = categories(req.app);
  data.items = data.items || [];
  const item = data.items.find(x => Number(x.id) === Number(req.body.id));
  if (!item) return res.redirect('/categorias?error=invalid_subcategory');
  const categoryId = validCategoryId(req.body.categoryId, cats);
  const name = String(req.body.name || '').trim();
  if (!name || !categoryId) return res.redirect('/categorias?error=invalid_subcategory');
  const oldSlug = item.slug;
  item.categoryId = categoryId;
  item.name = name;
  item.slug = uniqueSlug(req.body.slug || name, data.items, item.id);
  item.order = Number(req.body.order || item.order || 1);
  item.active = req.body.active === 'true';
  item.showOnSite = req.body.showOnSite === 'true';
  item.description = String(req.body.description || '').trim();
  writeJson(f.subcategories, data);
  syncSiteNavigation(req.app);

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
  res.redirect('/categorias?subsaved=1');
});

router.post('/del', (req,res) => {
  const f = files(req.app), data = readJson(f.subcategories), products = readJson(f.products);
  const id = Number(req.body.id);
  const item = (data.items || []).find(x => Number(x.id) === id);
  if (!item) return res.redirect('/categorias?error=invalid_subcategory');
  const inUse = (products.items || []).some(p => String(p.subcategory || p.subcategoria || '') === String(item.slug || ''));
  if (inUse) return res.redirect('/categorias?error=sub_in_use');
  data.items = (data.items || []).filter(x => Number(x.id) !== id);
  writeJson(f.subcategories, data);
  syncSiteNavigation(req.app);
  res.redirect('/categorias?subdeleted=1');
});

router.get('/api', (req,res) => {
  const data = readJson(files(req.app).subcategories);
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const items = sorted(data.items || []).filter(x => !categoryId || Number(x.categoryId) === categoryId);
  res.json({ items });
});

export default router;
