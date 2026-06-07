import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateCategoryPage, updateHeaderMenu } from './main_utils.js';

const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

function slugify(s){
  return (s||'').toString().trim()
    .toLowerCase()
    .replace(/\s+/g,'-')
    .replace(/[^\w-]/g,'');
}
function uniqueSlug(base, items, excludeId){
  let s = base || 'categoria';
  const used = new Set((items||[]).filter(it => Number(it.id)!==Number(excludeId)).map(it => (it.slug||'').trim()));
  if (!used.has(s)) return s;
  let i = 2;
  while (used.has(`${s}-${i}`)) i++;
  return `${s}-${i}`;
}

function removeCategoryHtmlFiles(siteDir){
  try {
    if (!siteDir || !fs.existsSync(siteDir)) return 0;
    let removed = 0;
    for (const f of fs.readdirSync(siteDir)) {
      if (/^categoria[-_].+\.html$/i.test(f)) {
        fs.unlinkSync(path.join(siteDir, f));
        removed++;
      }
    }
    return removed;
  } catch (e) {
    console.warn(`⚠️ Falha ao remover arquivos antigos de categoria: ${e.message}`);
    return 0;
  }
}

function rebuildCategoryStructure(items, siteDir){
  generateCategoryPage('', '', siteDir); // agora gera apenas categoria.html
  updateHeaderMenu(items || [], siteDir);
}

// ====== LISTAR ======
router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const msg = req.query.saved ? '✅ Categoria salva com sucesso!' : null;
  res.render('categorias', { items: data.items || [], flash: msg });
});

// ====== ADICIONAR ======
router.post('/add', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];

  const name = (req.body.name||'').trim();
  let slugIn = (req.body.slug||'').trim();
  let slug = slugIn || slugify(name);
  slug = uniqueSlug(slug, data.items);

  const order = Number(req.body.order || data.items.length + 1);
  const icon = (req.body.icon || '').trim();
  const newCat = { id: Date.now(), name, slug, order, icon };
  data.items.push(newCat);
  writeJson(file, data);

  try {
    rebuildCategoryStructure(data.items, SITE_DIR);
    console.log(`✅ Categoria "${name}" criada com sucesso (slug: ${slug}).`);
  } catch (err) {
    console.error('Erro ao atualizar estrutura de categorias:', err);
  }

  res.redirect('/categorias?saved=1');
});

// ====== ATUALIZAR ======
router.post('/update', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const it = (data.items||[]).find(c=> Number(c.id)===id);

  if (it) {
    const oldName = it.name;
    const oldSlug = (it.slug||'').trim();
    const newName = (req.body.name||oldName).trim();
    const slugInput = (req.body.slug||'').trim();
    const autoFromName = slugify(newName);
    let newSlug = slugInput && slugInput !== oldSlug ? slugInput : (newName !== oldName ? autoFromName : oldSlug);
    newSlug = uniqueSlug(newSlug, data.items, it.id);

    it.name = newName;
    it.slug = newSlug;
    it.order = Number(req.body.order || it.order || 1);
    it.icon = (req.body.icon || '').trim();
  }

  writeJson(file, data);
  try { rebuildCategoryStructure(data.items, SITE_DIR); } catch(e){ console.error('Erro ao atualizar header/categoria.html:', e); }
  res.redirect('/categorias?saved=1');
});

// ====== EXCLUIR ======
router.post('/del', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);

  data.items = (data.items||[]).filter(c=> Number(c.id)!==id);
  writeJson(file, data);

  try { rebuildCategoryStructure(data.items, SITE_DIR); } catch(e){ console.error('Erro ao atualizar header/categoria.html:', e); }

  res.redirect('/categorias?saved=1');
});

// ====== LIMPAR CATEGORIAS ANTIGAS E RECRIAR PÁGINA ÚNICA ======
router.post('/limpar', (req, res) => {
  try {
    const paths = P(req.app);
    const CONTENT_DIR = paths.CONTENT_DIR;
    const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
    const data = readJson(path.join(CONTENT_DIR, 'categories.json'));

    const removed = removeCategoryHtmlFiles(SITE_DIR);
    rebuildCategoryStructure(data.items || [], SITE_DIR);

    res.json({ success: true, removed });
  } catch (err) {
    console.error('Erro ao limpar categorias:', err);
    res.status(500).json({ success: false, error: 'internal_error' });
  }
});

export default router;
