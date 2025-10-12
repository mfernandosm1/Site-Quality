import express from 'express';
import fs from 'fs';
import path from 'path';
import { extractMain, replaceMain, readFileUtf8 } from './main_utils.js';

const router = express.Router();
function P(app){ return app.locals.paths; }

function decodeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

router.get('/', (req,res)=>{
  const pages = ['index.html','sobre.html','formas-de-pagamento.html','header.html','footer.html'];
  res.render('paginas_list', { pages, flash: null });
});

// Generic editor for any page except index.html (edits only <main> inner HTML)
router.get('/edit', (req,res)=>{
  const f = req.query.file || 'index.html';
  const t = path.join(P(req.app).SITE_DIR, f);
  const html = readFileUtf8(t);

  if (f === 'index.html'){
    // Redirect to a special editor for index
    return res.redirect('/paginas/edit-index');
  }

  const mainInner = extractMain(html);
  res.render('paginas_edit', { file:f, content: mainInner, flash: null });
});

router.get('/edit-index', (req,res)=>{
  // This page shows a link to go to the structured fields editor
  res.render('paginas_edit_index_intro', { flash: null });
});

export default router;
