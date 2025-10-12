import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  let html = ''; try { html = fs.readFileSync(file, 'utf-8'); } catch(e){}
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = m ? m[1] : html;
  const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(body);
  let cleaned = (mainMatch ? mainMatch[1] : body);
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi,'');
  cleaned = cleaned.replace(/<div[^>]+id=["']header["'][^>]*>[\s\S]*?<\/div>/i,'');
  cleaned = cleaned.replace(/<div[^>]+id=["']footer["'][^>]*>[\s\S]*?<\/div>/i,'');
  res.render('editar_pagamentos', { html: cleaned, flash: null });
});

router.post('/', express.urlencoded({extended:true}), (req,res)=>{
  const file = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  let original = ''; try { original = fs.readFileSync(file, 'utf-8'); } catch(e){}
  let out = original;
  if (/<main[^>]*>[\s\S]*?<\/main>/i.test(original)){
    out = original.replace(/(<main[^>]*>)[\s\S]*?(<\/main>)/i, `$1${req.body.html||''}$2`);
  } else if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)){
    out = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${req.body.html||''}$2`);
  } else {
    out = `<!doctype html><html><head><meta charset="utf-8"></head><body>${req.body.html||''}</body></html>`;
  }
  fs.writeFileSync(file, out, 'utf-8');
  res.redirect('/pagamentos?ok=1');
});

export default router;
