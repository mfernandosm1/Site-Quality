import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
router.get('/', (req,res)=>{
  const p = path.join(P(req.app).SITE_DIR,'css','style.css');
  let css=''; try{ css=fs.readFileSync(p,'utf-8'); }catch(e){}
  res.render('css',{ css, flash:null });
});
router.post('/salvar', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const p = path.join(SITE_DIR,'css','style.css');
  const b = path.join(BACKUPS_DIR,'style.css.'+new Date().toISOString().replace(/[:.]/g,'-'));
  try{ const prev = fs.existsSync(p)?fs.readFileSync(p,'utf-8'):''; fs.writeFileSync(b, prev,'utf-8'); }catch(e){}
  fs.writeFileSync(p, req.body.css || '', 'utf-8');
  res.redirect('/css');
});
export default router;
