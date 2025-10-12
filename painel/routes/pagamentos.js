import express from 'express';
import fs from 'fs';
import path from 'path';
import { loadMainOnly, injectMainOnly } from './main_utils.js';
const router = express.Router();
function P(app){ return app.locals.paths; }

function decodeHTML(str) {
  if (!str) return '';
  return str.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).SITE_DIR, 'formas-de-pagamento.html');
  const { innerMain, area } = loadMainOnly(file);
  res.render('editar_pagamentos', { html: innerMain, flash:null, area });
});

router.post('/salvar', (req,res)=>{
  const SITE_DIR = P(req.app).SITE_DIR;
  const BACKUPS_DIR = P(req.app).BACKUPS_DIR;
  const file = path.join(SITE_DIR, 'formas-de-pagamento.html');
  const backup = path.join(BACKUPS_DIR, 'formas-de-pagamento.html.'+new Date().toISOString().replace(/[:.]/g,'-'));
  try {
    const prev = fs.existsSync(file)?fs.readFileSync(file,'utf-8'):'';
    fs.writeFileSync(backup, prev, 'utf-8');
  } catch(e){}
  const { htmlCompleto, area } = loadMainOnly(file);
  const safeHTML = decodeHTML(req.body.html || '');
  const result = injectMainOnly(htmlCompleto, area, safeHTML);
  fs.writeFileSync(file, result, 'utf-8');
  res.redirect('/pagamentos');
});

export default router;
