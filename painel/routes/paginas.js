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
  const dir = P(req.app).SITE_DIR;
  const pages = ['index.html','sobre.html','formas-de-pagamento.html'].filter(f=>fs.existsSync(path.join(dir,f)));
  res.render('paginas_list', { pages, flash:null });
});
router.get('/edit', (req,res)=>{
  const { SITE_DIR } = P(req.app);
  const file = req.query.file || 'index.html';
  const full = path.join(SITE_DIR, file);
  let html=''; try { html = fs.readFileSync(full,'utf-8'); } catch(e){}
  let inner = extractBetweenMarkers(html, 'main');
  if (inner === null) {
    const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    inner = m ? m[1] : html;
  }
  res.render('paginas_edit', { file, content: inner, flash:null });
});
router.post('/save', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const file = req.body.file || 'index.html';
  const full = path.join(SITE_DIR, file);
  const backup = path.join(BACKUPS_DIR, file.replace(/[\/]/g,'_')+'.'+new Date().toISOString().replace(/[:.]/g,'-'));
  let original=''; try{ original = fs.existsSync(full)?fs.readFileSync(full,'utf-8'):''; }catch(e){ original=''; }
  try { fs.writeFileSync(backup, original, 'utf-8'); } catch(e){}
  const newInner = req.body.content || '';
  let replaced = replaceBetweenMarkers(original, newInner, 'main');
  if (replaced === null) {
    if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)){
      replaced = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${newInner}$2`);
    } else {
      replaced = `<!doctype html><html><head><meta charset="utf-8"></head><body>${newInner}</body></html>`;
    }
  }
  fs.writeFileSync(full, replaced, 'utf-8');
  res.redirect('/paginas/edit?file=' + encodeURIComponent(file));
});
export default router;
