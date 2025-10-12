import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf-8')); }catch(e){ return { items: [] }; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'products.json');
  const data = readJson(file);
  res.render('produtos', { items: data.items || [] });
});

router.post('/add', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'products.json');
  const data = readJson(file); data.items = data.items || [];
  data.items.push({ id: Date.now(), name: req.body.name||'', price: req.body.price||'', image: req.body.image||'', link: req.body.link||'#' });
  writeJson(file, data);
  res.redirect('/produtos');
});

router.post('/delete', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'products.json');
  const data = readJson(file); data.items = (data.items||[]).filter(x=> String(x.id)!==String(req.body.id));
  writeJson(file, data);
  res.redirect('/produtos');
});

router.post('/import', async (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const f = path.join(SITE_DIR, 'index.html');
  const file = path.join(CONTENT_DIR, 'products.json');
  const data = readJson(file); data.items = data.items || [];
  try{
    const html = await fsp.readFile(f, 'utf-8');
    const cardRe = /<div[^>]*(product|produto|card)[^>]*>([\s\S]*?)<\/div>/gi;
    const imgRe = /<img[^>]*src\s*=\s*"([^"]+)"[^>]*>/i;
    const nameRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/i;
    const priceRe = /(R\$\s*\d+[\.,]?\d*(?:[\.,]\d{2})?)/i;
    const aRe = /<a[^>]*href\s*=\s*"([^"]+)"[^>]*>/i;
    let m, count=0;
    while ((m = cardRe.exec(html)) !== null && count<100){
      const block = m[2];
      const img = (imgRe.exec(block)||[])[1] || '';
      const name = ((nameRe.exec(block)||[])[1]||'').replace(/<[^>]+>/g,'').trim();
      const price = ((priceRe.exec(block)||[])[1]||'').replace(/<[^>]+>/g,'').trim();
      const link = (aRe.exec(block)||[])[1] || '#';
      if (img || name){ data.items.push({ id: Date.now()+count, name, price, image: img, link }); count++; }
    }
    writeJson(file, data);
  }catch(e){}
  res.redirect('/produtos');
});
export default router;
