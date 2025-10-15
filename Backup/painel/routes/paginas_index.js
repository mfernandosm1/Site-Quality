import express from 'express';
import fs from 'fs';
import path from 'path';
import { readFileUtf8, extractIndexFields, applyIndexFields } from './main_utils.js';

const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req, res) => {
  const t = path.join(P(req.app).SITE_DIR, 'index.html');
  const html = readFileUtf8(t);
  const fields = extractIndexFields(html);
  const flash = req.query.saved === '1' ? 'Salvo com sucesso!' : null; // apenas quando saved=1
  res.render('paginas_edit_index', { ...fields, flash });
});

router.post('/save', (req, res) => {
  const t = path.join(P(req.app).SITE_DIR, 'index.html');
  const html = readFileUtf8(t);
  const newHtml = applyIndexFields(html, {
    h2Smartphones: req.body.h2Smartphones || '',
    h2Acessorios:  req.body.h2Acessorios  || '',
    emBreve:       req.body.emBreve       || '',
  });
  fs.writeFileSync(t, newHtml, 'utf-8');
  return res.redirect('/paginas-index?saved=1'); // define a flag UMA vez
});

export default router;
