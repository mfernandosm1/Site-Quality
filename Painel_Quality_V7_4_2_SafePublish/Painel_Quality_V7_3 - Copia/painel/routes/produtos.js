import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  res.render('produtos', { items: data.items || [], flash:null });
});
router.post('/add', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];
  data.items.push({ id: Date.now(), name:req.body.name||'', price: Number(req.body.price||0), image:req.body.image||'', category:req.body.category||'', active: req.body.active==='true' });
  writeJson(file, data); res.redirect('/produtos');
});
router.post('/update', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  const it = (data.items||[]).find(p=> Number(p.id)===id);
  if (it){
    it.name = req.body.name || it.name;
    it.price = Number(req.body.price || it.price || 0);
    it.image = req.body.image || it.image;
    it.category = req.body.category || it.category;
    it.active = (req.body.active === 'true');
  }
  writeJson(file, data); res.redirect('/produtos');
});
router.post('/del', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);
  data.items = (data.items||[]).filter(p=> Number(p.id)!==id);
  writeJson(file, data); res.redirect('/produtos');
});
export default router;
