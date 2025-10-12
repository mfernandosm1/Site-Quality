import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  let maint = {active:false,since:null}, publish = {last_publish:null};
  try { maint = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR,'maintenance.json'),'utf-8')); } catch(e){}
  try { publish = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR,'publish.json'),'utf-8')); } catch(e){}
  res.render('index', { flash: req.query.flash || null, maint, publish });
});
export default router;
