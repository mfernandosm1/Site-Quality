import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf-8')); }catch(e){ return { items: [] }; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'categories.json');
  const data = readJson(file);
  res.render('categorias', { items: data.items || [] });
});

router.post('/add', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'categories.json');
  const data = readJson(file); data.items = data.items || [];
  data.items.push({ id: Date.now(), name: req.body.name||'', slug: req.body.slug||'', order: (data.items.length||0)+1 });
  writeJson(file, data);
  res.redirect('/categorias');
});

router.post('/delete', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'categories.json');
  const data = readJson(file); data.items = (data.items||[]).filter(x=> String(x.id)!==String(req.body.id));
  writeJson(file, data);
  res.redirect('/categorias');
});

router.post('/import2', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file); data.items = data.items || [];
  try {
    const header = fs.readFileSync(path.join(SITE_DIR,'header.html'), 'utf-8');
    const footer = fs.readFileSync(path.join(SITE_DIR,'footer.html'), 'utf-8');
    const both = header + "\n" + footer;
    const re = /<a[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m, order = (data.items.length||0)+1;
    while ((m = re.exec(both)) !== null){
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
export default router;
