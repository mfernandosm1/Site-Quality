import express from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf-8')); }catch(e){ return { items: [] }; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'banners.json');
  const data = readJson(file);
  res.render('banners', { items: data.items || [] });
});

router.post('/add', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'banners.json');
  const data = readJson(file); data.items = data.items || [];
  data.items.push({ image: req.body.image||'', link: req.body.link||'#', title: req.body.title||'', subtitle: req.body.subtitle||'', order: (data.items.length||0)+1 });
  writeJson(file, data);
  res.redirect('/banners');
});

router.post('/delete', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR,'banners.json');
  const data = readJson(file); data.items = (data.items||[]).filter((_,i)=> String(i)!==String(req.body.idx));
  writeJson(file, data);
  res.redirect('/banners');
});

router.post('/import2', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file); data.items = data.items || [];
  try{
    const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf-8');
    const blocks = [];
    const sections = html.match(/<section[\s\S]*?<\/section>/gi) || [];
    const divs = html.match(/<div[\s\S]*?<\/div>/gi) || [];
    (sections.concat(divs)).forEach(b=>{ if (/(banner|hero|carousel|slider|swiper|slick)/i.test(b)) blocks.push(b); });
    const reImg = /<img[^>]*src\s*=\s*"([^"]+)"[^>]*alt\s*=\s*"([^"]*)"/gi;
    let m, order=(data.items.length||0)+1, pushed=0;
    for (const block of blocks){
      while ((m = reImg.exec(block)) !== null && pushed<10){
        const src=m[1], alt=m[2];
        data.items.push({ image: src, link:'#', title: alt||'', subtitle:'', order: order++ });
        pushed++;
      }
    }
    writeJson(file, data);
  }catch(e){}
  res.redirect('/banners');
});

export default router;
