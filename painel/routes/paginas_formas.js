import express from 'express';
import fs from 'fs';
import path from 'path';
import { readFileUtf8, extractFormasFields, applyFormasFields } from './main_utils.js';

const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/', (req,res)=>{
  const t = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  const html = readFileUtf8(t);
  const fields = extractFormasFields(html);
  res.render('paginas_edit_formas', { ...fields, flash: null });
});

router.post('/save', (req,res)=>{
  const t = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  const html = readFileUtf8(t);
  const newHtml = applyFormasFields(html, {
    titulo: req.body.titulo ?? '',
    cartaoTitulo: req.body.cartaoTitulo ?? '',
    cartaoTexto: req.body.cartaoTexto ?? '',
    boletoTitulo: req.body.boletoTitulo ?? '',
    boletoTexto: req.body.boletoTexto ?? '',
    pixTitulo: req.body.pixTitulo ?? '',
    pixTexto: req.body.pixTexto ?? '',
    enviosTitulo: req.body.enviosTitulo ?? '',
    enviosLinha1: req.body.enviosLinha1 ?? '',
    enviosLinha2: req.body.enviosLinha2 ?? '',
  });
  fs.writeFileSync(t, newHtml, 'utf-8');
  res.redirect('/paginas-formas');
});

export default router;
