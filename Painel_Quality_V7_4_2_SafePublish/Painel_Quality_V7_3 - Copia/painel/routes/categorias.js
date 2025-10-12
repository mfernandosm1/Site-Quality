import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  res.render('categorias', { items: data.items || [], flash:null });
});
router.post('/add', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];
  data.items.push({ id: Date.now(), name:req.body.name||'', slug:req.body.slug||'', order:Number(req.body.order||data.items.length+1) });
  writeJson(file, data); res.redirect('/categorias');
});
router.post('/update', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const it = (data.items||[]).find(c=> Number(c.id)===id);
  if (it){
    it.name = req.body.name || it.name;
    it.slug = req.body.slug || it.slug;
    it.order = Number(req.body.order || it.order || 1);
  }
  writeJson(file, data); res.redirect('/categorias');
});
router.post('/del', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  data.items = (data.items||[]).filter(c=> Number(c.id)!==id);
  writeJson(file, data); res.redirect('/categorias');
});
export default router;

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
