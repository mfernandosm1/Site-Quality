import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateCategoryPage, updateHeaderMenu } from './main_utils.js'; // ✅ mesmo diretório

const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

// ====== LISTAR ======
router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  res.render('categorias', { items: data.items || [], flash:null });
});

// ====== ADICIONAR ======
router.post('/add', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];

  const name = req.body.name?.trim() || '';
  const slug = (req.body.slug?.trim() || name.toLowerCase().replace(/\s+/g,'-').replace(/[^\w-]/g,''));
  const order = Number(req.body.order || data.items.length + 1);

  const newCat = { id: Date.now(), name, slug, order };
  data.items.push(newCat);
  writeJson(file, data);

  // === GERAÇÃO AUTOMÁTICA ===
  try {
    generateCategoryPage(name, slug, SITE_DIR);
    updateHeaderMenu(data.items, SITE_DIR);
    console.log(`✅ Categoria "${name}" criada com sucesso.`);
  } catch (err) {
    console.error('Erro ao gerar categoria:', err);
  }

  res.redirect('/categorias');
});

// ====== ATUALIZAR ======
router.post('/update', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const it = (data.items||[]).find(c=> Number(c.id)===id);
  if (it){
    it.name = req.body.name || it.name;
    it.slug = req.body.slug || it.slug;
    it.order = Number(req.body.order || it.order || 1);
  }
  writeJson(file, data);
  try { updateHeaderMenu(data.items, SITE_DIR); } catch(e){}
  res.redirect('/categorias');
});

// ====== EXCLUIR ======
router.post('/del', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const cat = (data.items||[]).find(c=> Number(c.id)===id);

  // Remove do JSON
  data.items = (data.items||[]).filter(c=> Number(c.id)!==id);
  writeJson(file, data);

  // Atualiza o menu do header
  try { updateHeaderMenu(data.items, SITE_DIR); } catch(e){}

  // Remove o arquivo HTML da categoria (sem tocar nos produtos)
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

  res.redirect('/categorias');
});

// ====== IMPORTAR MENU DO HEADER ======
router.post('/import', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];
  try {
    const html = fs.readFileSync(path.join(SITE_DIR,'header.html'), 'utf-8');
    const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
    const source = navMatch ? navMatch[0] : html;
    const re = /<a[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m, order = (data.items.length||0)+1;
    while ((m = re.exec(source)) !== null) {
      const href = m[1];
      const label = (m[2]||'').replace(/<[^>]+>/g,'').trim();
      if (label){
        data.items.push({ id: Date.now()+order, name: label, slug: href || label.toLowerCase().replace(/\s+/g,'-'), order: order++ });
      }
    }
    writeJson(file, data);
  } catch(e){}
  res.redirect('/categorias');
});

// ====== IMPORTAR HEADER + FOOTER ======
router.post('/import2', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];
  try {
    const header = fs.readFileSync(path.join(SITE_DIR,'header.html'), 'utf-8');
    const footer = fs.readFileSync(path.join(SITE_DIR,'footer.html'), 'utf-8');
    const both = header + "\n" + footer;
    const re = /<a[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m, order = (data.items.length||0)+1;
    while ((m = re.exec(both)) !== null){
      const href = m[1];
      const label = (m[2]||'').replace(/<[^>]+>/g,'').trim();
      if (label && !/^#/.test(href)){
        data.items.push({ id: Date.now()+order, name: label, slug: href || label.toLowerCase().replace(/\s+/g,'-'), order: order++ });
      }
    }
    writeJson(file, data);
  } catch(e){}
  res.redirect('/categorias');
});

export default router;
