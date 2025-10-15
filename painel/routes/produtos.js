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

// ====== FUNÇÃO: Listar todas as imagens da pasta /site/images ======
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

// ====== LISTAR ======
router.get('/', (req, res) => {
  const contentDir = P(req.app).CONTENT_DIR;
  const file = path.join(contentDir, 'products.json');
  const data = readJson(file);

  const catsFile = path.join(contentDir, 'categories.json');
  const cats = readJson(catsFile);

  // Caminho da pasta de imagens dentro do site
  const imagesDir = path.join(P(req.app).SITE_DIR, 'images');
  const imagens = getAllImages(imagesDir);

  res.render('produtos', {
    items: data.items || [],
    categorias: cats.items || [],
    imagens,
    flash: null
  });
});

// ====== ADICIONAR ======
router.post('/add', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const name = (req.body.name || '').trim();
  const price = req.body.price ? Number(req.body.price) : null;
  const image = (req.body.image || '').trim();
  const category = (req.body.category || '').trim();
  const showPrice = req.body.showPrice === 'true';
  const featured = req.body.featured === 'true';
  const active = req.body.active === 'true';

  data.items.push({
    id: Date.now(),
    name,
    price,
    image,
    category,
    showPrice,
    featured,
    active
  });

  writeJson(file, data);
  console.log(`✅ Produto "${name}" adicionado.`);
  res.redirect('/produtos');
});

// ====== ATUALIZAR ======
router.post('/update', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const item = (data.items || []).find(p => Number(p.id) === id);

  if (item) {
    item.name = req.body.name || item.name;
    item.price = req.body.price ? Number(req.body.price) : null;
    item.image = req.body.image || item.image;
    item.category = req.body.category || item.category;
    item.showPrice = req.body.showPrice === 'true';
    item.featured = req.body.featured === 'true';
    item.active = req.body.active === 'true';
  }

  writeJson(file, data);
  console.log(`✏️ Produto atualizado: ${item?.name || id}`);
  res.redirect('/produtos');
});

// ====== EXCLUIR ======
router.post('/del', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);

  data.items = (data.items || []).filter(p => Number(p.id) !== id);
  writeJson(file, data);

  console.log(`🗑️ Produto ${id} excluído.`);
  res.redirect('/produtos');
});

export default router;
