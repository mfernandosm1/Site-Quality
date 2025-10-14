import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const pages = ['index.html','sobre.html','formas-de-pagamento.html','header.html','footer.html'];
  res.render('paginas_list', { pages, flash:null });
});
router.get('/edit', (req,res)=>{
  const f = req.query.file || 'index.html';
  const t = path.join(P(req.app).SITE_DIR, f);
  let c=''; try{ c = fs.readFileSync(t,'utf-8'); }catch(e){}
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(c);
  const body = m ? m[1] : c;
  res.render('paginas_edit', { file: f, content: body, flash:null });
});
router.post('/save', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const f = req.body.file || 'index.html';
  const t = path.join(SITE_DIR, f);
  const b = path.join(BACKUPS_DIR, f.replace(/[\/]/g,'_')+'-'+new Date().toISOString().replace(/[:.]/g,'-'));
  try{ const prev = fs.existsSync(t) ? fs.readFileSync(t,'utf-8') : ''; fs.writeFileSync(b, prev,'utf-8'); }catch(e){}
  let original=''; try{ original = fs.readFileSync(t,'utf-8'); }catch(e){}
  if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)){
    const out = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${req.body.content||''}$2`);
    fs.writeFileSync(t, out, 'utf-8');
  } else {
    const out = `<!doctype html><html><head><meta charset="utf-8"></head><body>${req.body.content||''}</body></html>`;
    fs.writeFileSync(t, out, 'utf-8');
  }
  res.redirect('/paginas/edit?file='+encodeURIComponent(f));
});
export default router;
