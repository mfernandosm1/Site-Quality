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
  const newCat = { id: Date.now(), name, slug, order };
  data.items.push(newCat);
  writeJson(file, data);

  try {
    generateCategoryPage(name, slug, SITE_DIR);
    updateHeaderMenu(data.items, SITE_DIR);
    console.log(`✅ Categoria "${name}" criada com sucesso (slug: ${slug}).`);
  } catch (err) {
    console.error('Erro ao gerar categoria:', err);
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

    const oldFile = path.join(SITE_DIR, `categoria-${oldSlug}.html`);
    const newFile = path.join(SITE_DIR, `categoria-${newSlug}.html`);

    try {
      if (oldSlug !== newSlug && fs.existsSync(oldFile)) {
        fs.renameSync(oldFile, newFile);
        console.log(`🔄 Renomeado: categoria-${oldSlug}.html → categoria-${newSlug}.html`);
      } else if (oldSlug !== newSlug && !fs.existsSync(oldFile)) {
        generateCategoryPage(newName, newSlug, SITE_DIR);
        console.log(`📄 Gerado novo arquivo categoria-${newSlug}.html`);
      }
    } catch (err) {
      console.error('❌ Erro ao renomear/gerar arquivo da categoria:', err);
    }

    it.name = newName;
    it.slug = newSlug;
    it.order = Number(req.body.order || it.order || 1);
  }

  writeJson(file, data);
  try { updateHeaderMenu(data.items, SITE_DIR); } catch(e){}
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
  const cat = (data.items||[]).find(c=> Number(c.id)===id);

  data.items = (data.items||[]).filter(c=> Number(c.id)!==id);
  writeJson(file, data);
  try { updateHeaderMenu(data.items, SITE_DIR); } catch(e){}

  try {
    if (cat && cat.slug) {
      const fileSlug = `categoria-${cat.slug}.html`;
      const target = path.join(SITE_DIR, fileSlug);
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
        console.log(`🗑️ Categoria "${cat.name}" removida e arquivo ${fileSlug} excluído.`);
      }
    }
  } catch (err) {
    console.error('Erro ao remover arquivo da categoria:', err);
  }

  res.redirect('/categorias?saved=1');
});

// ====== LIMPAR E RECRIAR CATEGORIAS ======
router.post('/limpar', (req, res) => {
  try {
    const paths = P(req.app);
    const CONTENT_DIR = paths.CONTENT_DIR;
    const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
    const data = readJson(path.join(CONTENT_DIR, 'categories.json'));
    const ativos = new Set((data.items || []).map(c => `categoria-${c.slug}.html`));

    const files = fs.readdirSync(SITE_DIR);
    let removed = 0;
    for (const f of files) {
      if (/^categoria[-_].+\.html$/i.test(f) && !ativos.has(f)) {
        fs.unlinkSync(path.join(SITE_DIR, f));
        removed++;
      }
    }

    // 🆕 recria todos os arquivos com modelo atualizado
    (data.items || []).forEach(c => {
      try { generateCategoryPage(c.name, c.slug, SITE_DIR); }
      catch(e){ console.error('Erro ao recriar', c.slug, e); }
    });

    res.json({ success: true, removed });
  } catch (err) {
    console.error('Erro ao limpar categorias:', err);
    res.status(500).json({ success: false, error: 'internal_error' });
  }
});

export default router;
