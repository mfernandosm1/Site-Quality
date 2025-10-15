import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();

function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

// ====== LISTAR ======
router.get('/', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const prodFile = path.join(CONTENT_DIR, 'products.json');
  const catFile = path.join(CONTENT_DIR, 'categories.json');
  const prodData = readJson(prodFile);
  const catData = readJson(catFile);

  res.render('produtos', { 
    items: prodData.items || [], 
    categorias: catData.items || [], 
    flash:null 
  });
});

// ====== ADICIONAR ======
router.post('/add', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const prodFile = path.join(CONTENT_DIR, 'products.json');
  const data = readJson(prodFile);
  data.items = data.items || [];

  const name = (req.body.name || '').trim();
  const price = Number(req.body.price || 0);
  const image = (req.body.image || '').trim();
  const category = (req.body.category || '').trim(); // deve ser o slug da categoria
  const active = req.body.active === 'true';

  if (!category) {
    console.warn('❌ Produto precisa de uma categoria válida (slug).');
    return res.redirect('/produtos');
  }

  const id = Date.now();
  data.items.push({ id, name, price, image, category, active });

  writeJson(prodFile, data);
  console.log(`✅ Produto "${name}" adicionado (categoria: ${category}).`);
  res.redirect('/produtos');
});

// ====== ATUALIZAR ======
router.post('/update', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const prodFile = path.join(CONTENT_DIR, 'products.json');
  const data = readJson(prodFile);
  const id = Number(req.body.id);

  const it = (data.items||[]).find(p=> Number(p.id)===id);
  if (it){
    it.name = (req.body.name || it.name).trim();
    it.price = Number(req.body.price || it.price || 0);
    it.image = (req.body.image || it.image).trim();
    it.category = (req.body.category || it.category).trim();
    it.active = (req.body.active === 'true');
  }

  writeJson(prodFile, data);
  console.log(`✏️ Produto #${id} atualizado.`);
  res.redirect('/produtos');
});

// ====== EXCLUIR ======
router.post('/del', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const prodFile = path.join(CONTENT_DIR, 'products.json');
  const data = readJson(prodFile);
  const id = Number(req.body.id);

  data.items = (data.items||[]).filter(p=> Number(p.id)!==id);
  writeJson(prodFile, data);
  console.log(`🗑️ Produto #${id} excluído.`);
  res.redirect('/produtos');
});

export default router;
