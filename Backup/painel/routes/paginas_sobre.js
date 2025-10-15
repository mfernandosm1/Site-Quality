import express from 'express';
import fs from 'fs';
import path from 'path';
import { readFileUtf8, extractSobreFields, applySobreFields } from './main_utils.js';

const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const t = path.join(P(req.app).SITE_DIR, 'sobre.html');
  const html = readFileUtf8(t);
  const fields = extractSobreFields(html);
  res.render('paginas_edit_sobre', { ...fields, flash: null });
});

router.post('/save', (req,res)=>{
  const t = path.join(P(req.app).SITE_DIR, 'sobre.html');
  const html = readFileUtf8(t);
  const newHtml = applySobreFields(html, {
    titulo: req.body.titulo ?? '',
    intro: req.body.intro ?? '',
    missao: req.body.missao ?? '',
    visao: req.body.visao ?? '',
    valores: req.body.valores ?? '',
    difTitulo: req.body.difTitulo ?? '',
    difListaHTML: req.body.difListaHTML ?? '',
  });
  fs.writeFileSync(t, newHtml, 'utf-8');
  res.redirect('/paginas-sobre');
});

export default router;
