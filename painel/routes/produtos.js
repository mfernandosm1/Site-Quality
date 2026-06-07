import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function P(app) {
  return app.locals.paths;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return { items: [] };
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function getAllImages(baseDir, prefix = '') {
  let results = [];
  if (!fs.existsSync(baseDir)) return results;
  const files = fs.readdirSync(baseDir);

  for (const file of files) {
    const full = path.join(baseDir, file);
    const rel = prefix ? `${prefix}/${file}` : file;

    if (fs.statSync(full).isDirectory()) {
      results = results.concat(getAllImages(full, rel));
    } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(file)) {
      results.push(rel);
    }
  }

  return results;
}

function wantsJson(req) {
  return req.xhr || (req.headers.accept || '').includes('application/json');
}

function productFromBody(body, current = {}) {
  return {
    name: (body.name || current.name || '').trim(),
    price: body.price ? Number(body.price) : null,
    image: (body.image || current.image || '').trim(),
    category: (body.category ?? current.category ?? '').toString().trim(),
    showPrice: body.showPrice === true || body.showPrice === 'true',
    featured: body.featured === true || body.featured === 'true',
    active: body.active === true || body.active === 'true'
  };
}

router.get('/', (req, res) => {
  const contentDir = P(req.app).CONTENT_DIR;
  const file = path.join(contentDir, 'products.json');
  const data = readJson(file);

  const catsFile = path.join(contentDir, 'categories.json');
  const cats = readJson(catsFile);

  const imagesDir = path.join(P(req.app).SITE_DIR, 'images');
  const imagens = getAllImages(imagesDir);

  let flash = null;
  if (req.query.saved === 'produto') flash = '✅ Produto salvo com sucesso.';
  if (req.query.saved === 'all') flash = '✅ Alterações salvas com sucesso.';
  if (req.query.saved === 'bulk') flash = '✅ Categoria aplicada nos produtos selecionados.';
  if (req.query.deleted === '1') flash = '🗑️ Produto excluído com sucesso.';

  res.render('produtos', {
    items: data.items || [],
    categorias: cats.items || [],
    imagens,
    flash
  });
});

router.post('/add', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const novo = productFromBody(req.body);
  novo.id = Date.now();

  data.items.push(novo);

  writeJson(file, data);
  console.log(`✅ Produto "${novo.name}" adicionado.`);
  res.redirect('/produtos?saved=produto');
});

router.post('/update', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const item = (data.items || []).find(p => Number(p.id) === id);

  if (!item) {
    if (wantsJson(req)) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    return res.redirect('/produtos?error=not_found');
  }

  Object.assign(item, productFromBody(req.body, item));

  writeJson(file, data);
  console.log(`✏️ Produto atualizado: ${item.name || id}`);

  if (wantsJson(req)) {
    return res.json({ success: true, message: '✅ Produto salvo com sucesso.', item });
  }

  res.redirect('/produtos?saved=produto');
});

router.post('/update-all', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const ids = Array.isArray(req.body.id) ? req.body.id : (req.body.id ? [req.body.id] : []);

  ids.forEach((rawId, index) => {
    const id = Number(rawId);
    const item = data.items.find(p => Number(p.id) === id);
    if (!item) return;

    const getField = (field) => {
      const value = req.body[field];
      return Array.isArray(value) ? value[index] : value;
    };

    Object.assign(item, productFromBody({
      name: getField('name'),
      price: getField('price'),
      image: getField('image'),
      category: getField('category'),
      showPrice: getField('showPrice'),
      featured: getField('featured'),
      active: getField('active')
    }, item));
  });

  writeJson(file, data);
  console.log(`💾 Alterações em massa salvas: ${ids.length} produto(s).`);
  res.redirect('/produtos?saved=all');
});

router.post('/bulk-category', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const ids = Array.isArray(req.body.selectedIds) ? req.body.selectedIds : (req.body.selectedIds ? [req.body.selectedIds] : []);
  const selectedIds = ids.map(Number);
  const category = (req.body.bulkCategory ?? '').toString().trim();

  let updated = 0;
  data.items.forEach(item => {
    if (selectedIds.includes(Number(item.id))) {
      item.category = category;
      updated++;
    }
  });

  writeJson(file, data);
  console.log(`⚡ Categoria aplicada em massa: ${updated} produto(s).`);
  res.redirect('/produtos?saved=bulk');
});

router.post('/del', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);

  data.items = (data.items || []).filter(p => Number(p.id) !== id);
  writeJson(file, data);

  console.log(`🗑️ Produto ${id} excluído.`);
  res.redirect('/produtos?deleted=1');
});

export default router;
