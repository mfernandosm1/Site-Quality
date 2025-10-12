import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

function decodeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

router.get('/', (req,res)=>{
  const t = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  let c=''; try{ c = fs.readFileSync(t,'utf-8'); }catch(e){}
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(c);
  const body = m ? m[1] : c;
  res.render('editar_pagamentos', { html: body, flash: null });
});

router.post('/salvar', (req,res)=>{
  const SITE_DIR = P(req.app).SITE_DIR;
  const BACKUPS_DIR = P(req.app).BACKUPS_DIR;
  const file = path.join(SITE_DIR, 'formas-de-pagamento.html');
  const backup = path.join(BACKUPS_DIR, 'formas-de-pagamento.html.'+new Date().toISOString().replace(/[:.]/g,'-'));
  try{
    const prev = fs.existsSync(file)?fs.readFileSync(file,'utf-8'):'';
    fs.writeFileSync(backup, prev, 'utf-8');
  }catch(e){}
  let original=''; try{ original = fs.readFileSync(file,'utf-8'); }catch(e){}
  const safeHTML = decodeHTML(req.body.html || '');
  if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)) {
    const out = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${safeHTML}$2`);
    fs.writeFileSync(file, out, 'utf-8');
  } else {
    const out = `<!doctype html><html><head><meta charset="utf-8"></head><body>${safeHTML}</body></html>`;
    fs.writeFileSync(file, out, 'utf-8');
  }
  res.redirect('/pagamentos');
});

export default router;
