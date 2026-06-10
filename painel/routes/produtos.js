import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

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

function galleryFromBody(value, current = []) {
  if (value === undefined || value === null) return current || [];

  let list = [];

  if (Array.isArray(value)) {
    list = value;
  } else {
    list = value.toString().split(/\r?\n|,/);
  }

  return list
    .map(item => item.toString().trim())
    .filter(Boolean)
    .slice(0, 4);
}

function gerarSlug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugUnico(slugBase, items = [], ignoreId = null) {
  let base = slugBase || 'produto';
  let slug = base;
  let contador = 2;

  while (
    items.some(p =>
      p.slug === slug &&
      Number(p.id) !== Number(ignoreId)
    )
  ) {
    slug = `${base}-${contador}`;
    contador++;
  }

  return slug;
}

function loadCategories(app) {
  try {
    const file = path.join(P(app).CONTENT_DIR, 'categories.json');
    const data = readJson(file);
    return data.items || [];
  } catch (e) {
    return [];
  }
}

function normalizeCategoryValue(value, categories = []) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return '';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const found = (categories || []).find(c => {
    const id = (c.id ?? '').toString().trim();
    const slug = (c.slug ?? '').toString().trim();
    const name = (c.name ?? '').toString().trim();
    const slugNorm = gerarSlug(slug);
    const nameNorm = gerarSlug(name);
    return raw === id || raw === slug || raw === name || normalized === slugNorm || normalized === nameNorm;
  });

  return found ? (found.slug || gerarSlug(found.name) || raw).toString().trim() : gerarSlug(raw);
}

function productFromBody(body, current = {}) {
  const priceValue = body.price !== undefined && body.price !== ''
    ? Number(body.price)
    : null;

  return {
    name: (body.name || current.name || '').trim(),
    slug: gerarSlug(body.slug || current.slug || body.name || current.name || ''),
    price: priceValue,
    image: (body.image || current.image || '').trim(),
    gallery: galleryFromBody(body.gallery, current.gallery),
    category: (body.category ?? current.category ?? '').toString().trim(),
    showPrice: body.showPrice === true || body.showPrice === 'true',
    featured: body.featured === true || body.featured === 'true',
    active: body.active === true || body.active === 'true',
    detailsEnabled: body.detailsEnabled === true || body.detailsEnabled === 'true',
    descriptionShort: (body.descriptionShort ?? current.descriptionShort ?? '').toString().trim(),
    descriptionLong: (body.descriptionLong ?? current.descriptionLong ?? '').toString().trim()
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadDir = path.join(P(req.app).SITE_DIR, 'images', 'produtos');
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    cb(null, `${Date.now()}-${base || 'foto'}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: 8 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas.'));
    }
    cb(null, true);
  }
});

router.post('/upload-gallery', upload.array('galleryFiles', 4), (req, res) => {
  const files = (req.files || []).map(file => `images/produtos/${file.filename}`);

  return res.json({
    success: true,
    files
  });
});

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
  if (req.query.saved === 'details_on') flash = '✅ Detalhes ativados nos produtos selecionados.';
  if (req.query.saved === 'details_off') flash = '✅ Detalhes desativados nos produtos selecionados.';
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

  const categorias = loadCategories(req.app);
  const novo = productFromBody(req.body);
  novo.id = Date.now();
  novo.category = normalizeCategoryValue(novo.category, categorias);

  if (!novo.name) {
    return res.redirect('/produtos?error=name');
  }

  novo.slug = slugUnico(
    gerarSlug(req.body.slug || novo.slug || novo.name),
    data.items,
    novo.id
  );

  data.items.push(novo);

  writeJson(file, data);
  console.log(`✅ Produto "${novo.name}" adicionado com slug "${novo.slug}".`);
  res.redirect('/produtos?saved=produto');
});

router.post('/update', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const id = Number(req.body.id);
  const item = data.items.find(p => Number(p.id) === id);

  if (!item) {
    if (wantsJson(req)) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    return res.redirect('/produtos?error=not_found');
  }

  const categorias = loadCategories(req.app);
  Object.assign(item, productFromBody(req.body, item));
  item.category = normalizeCategoryValue(item.category, categorias);

  item.slug = slugUnico(
    gerarSlug(req.body.slug || item.slug || item.name),
    data.items,
    item.id
  );

  writeJson(file, data);
  console.log(`✏️ Produto atualizado: ${item.name || id} | slug: ${item.slug}`);

  if (wantsJson(req)) {
    return res.json({ success: true, message: '✅ Produto salvo com sucesso.', item });
  }

  res.redirect('/produtos?saved=produto');
});

router.post('/update-all', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const categorias = loadCategories(req.app);

  const ids = Array.isArray(req.body.id)
    ? req.body.id
    : req.body.id
      ? [req.body.id]
      : [];

  ids.forEach((rawId, index) => {
    const id = Number(rawId);
    const item = data.items.find(p => Number(p.id) === id);
    if (!item) return;

    const getField = (field) => {
      const value = req.body[field];
      return Array.isArray(value) ? value[index] : value;
    };

    const updated = productFromBody({
      name: getField('name'),
      slug: getField('slug'),
      price: getField('price'),
      image: getField('image'),
      gallery: getField('gallery'),
      category: getField('category'),
      showPrice: getField('showPrice'),
      featured: getField('featured'),
      active: getField('active'),
      detailsEnabled: getField('detailsEnabled'),
      descriptionShort: getField('descriptionShort'),
      descriptionLong: getField('descriptionLong')
    }, item);

    if (!updated.name) updated.name = item.name;

    Object.assign(item, updated);
    item.category = normalizeCategoryValue(item.category, categorias);

    item.slug = slugUnico(
      gerarSlug(getField('slug') || item.slug || item.name),
      data.items,
      item.id
    );
  });

  writeJson(file, data);
  console.log(`💾 Alterações em massa salvas: ${ids.length} produto(s).`);
  res.redirect('/produtos?saved=all');
});

router.post('/bulk-category', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const ids = Array.isArray(req.body.selectedIds)
    ? req.body.selectedIds
    : req.body.selectedIds
      ? [req.body.selectedIds]
      : [];

  const selectedIds = ids.map(Number);
  const categorias = loadCategories(req.app);
  const category = normalizeCategoryValue((req.body.bulkCategory ?? '').toString().trim(), categorias);

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

router.post('/bulk-details', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const ids = Array.isArray(req.body.selectedIds)
    ? req.body.selectedIds
    : req.body.selectedIds
      ? [req.body.selectedIds]
      : [];

  const selectedIds = ids.map(Number);
  const enable = req.body.detailsAction === 'enable';

  let updated = 0;

  data.items.forEach(item => {
    if (selectedIds.includes(Number(item.id))) {
      item.detailsEnabled = enable;
      updated++;
    }
  });

  writeJson(file, data);
  console.log(`${enable ? '✅' : '🚫'} Detalhes ${enable ? 'ativados' : 'desativados'} em ${updated} produto(s).`);
  res.redirect(`/produtos?saved=${enable ? 'details_on' : 'details_off'}`);
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