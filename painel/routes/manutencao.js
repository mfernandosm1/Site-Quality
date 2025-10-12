import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
router.post('/ativar',(req,res)=>{
  const f = path.join(P(req.app).CONTENT_DIR, 'maintenance.json');
  fs.writeFileSync(f, JSON.stringify({active:true,since:new Date().toISOString()},null,2),'utf-8');
  const to = req.query.from || '/';
  res.redirect(to+'?flash='+encodeURIComponent('Modo manutenção ativado.'));
});
router.post('/desativar',(req,res)=>{
  const f = path.join(P(req.app).CONTENT_DIR, 'maintenance.json');
  fs.writeFileSync(f, JSON.stringify({active:false,since:null},null,2),'utf-8');
  const to = req.query.from || '/';
  res.redirect(to+'?flash='+encodeURIComponent('Modo manutenção desativado.'));
});
export default router;
