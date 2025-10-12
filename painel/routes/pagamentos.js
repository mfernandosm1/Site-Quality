import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

function extractBetweenMarkers(fullText, markerName='main') {
  const re = new RegExp(`<!--\\s*PANEL:BEGIN\\s*editable="${markerName}"\\s*-->[\\r\\n]*([\\s\\S]*?)[\\r\\n]*<!--\\s*PANEL:END\\s*editable="${markerName}"\\s*-->`);
  const m = re.exec(fullText);
  return m ? m[1] : null;
}
function replaceBetweenMarkers(fullText, newInner, markerName='main') {
  const re = new RegExp(`(<!--\\s*PANEL:BEGIN\\s*editable="${markerName}"\\s*-->)[\\r\\n]*([\\s\\S]*?)[\\r\\n]*(<!--\\s*PANEL:END\\s*editable="${markerName}"\\s*-->)`);
  if (!re.test(fullText)) return null;
  return fullText.replace(re, `$1\n${newInner}\n$3`);
}

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  let html=''; try { html = fs.readFileSync(file,'utf-8'); } catch(e){}
  let inner = extractBetweenMarkers(html, 'main');
  if (inner === null) {
    const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    inner = m ? m[1] : html;
  }
  res.render('editar_pagamentos', { html: inner, flash:null });
});
router.post('/salvar', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(SITE_DIR, 'formas-de-pagamento.html');
  const backup = path.join(BACKUPS_DIR, 'formas-de-pagamento.html.'+new Date().toISOString().replace(/[:.]/g,'-'));
  let original=''; try{ original = fs.readFileSync(file,'utf-8'); }catch(e){ original=''; }
  try { fs.writeFileSync(backup, original, 'utf-8'); } catch(e){}
  const newInner = req.body.html || '';
  let replaced = replaceBetweenMarkers(original, newInner, 'main');
  if (replaced === null) {
    if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)){ replaced = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${newInner}$2`); }
    else { replaced = `<!doctype html><html><head><meta charset="utf-8"></head><body>${newInner}</body></html>`; }
  }
  fs.writeFileSync(file, replaced, 'utf-8');
  res.redirect('/pagamentos');
});
export default router;
