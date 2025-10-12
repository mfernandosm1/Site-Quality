import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).SITE_DIR, 'sobre.html');
  let html=''; try { html = fs.readFileSync(file,'utf-8'); } catch(e){}
  const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const body = m ? m[1] : html;
  res.render('editar_sobre', { html: body, flash:null });
});
router.post('/salvar', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(SITE_DIR, 'sobre.html');
  const backup = path.join(BACKUPS_DIR, 'sobre.html.'+new Date().toISOString().replace(/[:.]/g,'-'));
  try { const prev = fs.existsSync(file)?fs.readFileSync(file,'utf-8'):''; fs.writeFileSync(backup, prev, 'utf-8'); } catch(e){}
  let original=''; try{ original = fs.readFileSync(file,'utf-8'); }catch(e){}
  if (/<body[^>]*>[\s\S]*?<\/body>/i.test(original)){
    const out = original.replace(/(<body[^>]*>)[\s\S]*?(<\/body>)/i, `$1${req.body.html||''}$2`);
    fs.writeFileSync(file, out, 'utf-8');
  } else {
    const out = `<!doctype html><html><head><meta charset="utf-8"></head><body>${req.body.html||''}</body></html>`;
    fs.writeFileSync(file, out, 'utf-8');
  }
  res.redirect('/sobre');
});
export default router;
