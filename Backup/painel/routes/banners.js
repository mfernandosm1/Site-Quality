import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'banners.json');
  const data = readJson(file);
  res.render('banners', { items: data.items || [], flash:null });
});

router.post('/add', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file);
  data.items = data.items || [];
  data.items.push({ image: req.body.image||'', link: req.body.link||'', title: req.body.title||'', subtitle: req.body.subtitle||'', order: Number(req.body.order||data.items.length+1) });
  writeJson(file, data); res.redirect('/banners');
});
router.post('/update', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file);
  const i = Number(req.body.index);
  if (data.items && data.items[i]){
    data.items[i].image = req.body.image || data.items[i].image;
    data.items[i].link = req.body.link || data.items[i].link;
    data.items[i].title = req.body.title || data.items[i].title;
    data.items[i].subtitle = req.body.subtitle || data.items[i].subtitle;
    data.items[i].order = Number(req.body.order || data.items[i].order || (i+1));
  }
  writeJson(file, data); res.redirect('/banners');
});
router.post('/del', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file);
  const i = Number(req.body.index);
  if (data.items && data.items[i]) data.items.splice(i,1);
  writeJson(file, data); res.redirect('/banners');
});
export default router;

router.post('/import',(req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file); data.items = data.items || [];
  try {
    const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf-8');
    // very naive: find big images near words banner/carousel or first hero image
    const re = /<img[^>]*src\s*=\s*"([^"]+)"[^>]*>/gi;
    let m, order = (data.items.length||0)+1, pushed=0;
    while ((m = re.exec(html)) !== null && pushed<5) {
      const src = m[1];
      if (src && !src.lower().endswith('.svg')){
        data.items.push({ image: src, link: '#', title: '', subtitle: '', order: order++ });
        pushed += 1;
      }
    }
    writeJson(file, data);
  } catch(e){}
  res.redirect('/banners');
});

// robust import
router.post('/import2',(req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'banners.json');
  const data = readJson(file); data.items = data.items || [];
  try {
    const html = fs.readFileSync(path.join(SITE_DIR,'index.html'),'utf-8');
    const blocks = [];
    const sections = html.match(/<section[\s\S]*?<\/section>/gi) || [];
    const divs = html.match(/<div[\s\S]*?<\/div>/gi) || [];
    (sections.concat(divs)).forEach(b=>{
      if (/(banner|hero|carousel|slider|swiper|slick)/i.test(b)) blocks.push(b);
    });
    const reImg = /<img[^>]*src\s*=\s*"([^"]+)"[^>]*alt\s*=\s*"([^"]*)"/gi;
    let m, order=(data.items.length||0)+1, pushed=0;
    for (const block of blocks){
      while ((m = reImg.exec(block)) !== null && pushed<10){
        const src=m[1], alt=m[2];
        data.items.push({ image: src, link:'#', title: alt||'', subtitle:'', order: order++ });
        pushed++;
      }
    }
    if (pushed===0){
      const reAnyImg = /<img[^>]*src\s*=\s*"([^"]+)"[^>]*>/gi; let mm;
      let count=0, order2=(data.items.length||0)+1;
      while ((mm = reAnyImg.exec(html)) !== null && count<5){
        const src=mm[1]; if (!/\.svg$/i.test(src)){
          data.items.push({ image: src, link:'#', title:'', subtitle:'', order: order2++ });
          count++;
        }
      }
    }
    writeJson(file, data);
  } catch(e){}
  res.redirect('/banners');
});
