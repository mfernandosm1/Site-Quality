import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();

// Funções utilitárias
function P(app) { return app.locals.paths; }
function extractBetweenMarkers(fullText, markerName = 'main') {
  const re = new RegExp(`<!--\\s*PANEL:BEGIN\\s*editable="${markerName}"\\s*-->[\\r\\n]*([\\s\\S]*?)[\\r\\n]*<!--\\s*PANEL:END\\s*editable="${markerName}"\\s*-->`);
  const m = re.exec(fullText);
  return m ? m[1] : null;
}
function replaceBetweenMarkers(fullText, newInner, markerName = 'main') {
  const re = new RegExp(`(<!--\\s*PANEL:BEGIN\\s*editable="${markerName}"\\s*-->)[\\r\\n]*([\\s\\S]*?)[\\r\\n]*(<!--\\s*PANEL:END\\s*editable="${markerName}"\\s*-->)`);
  if (!re.test(fullText)) return null;
  return fullText.replace(re, `$1\n${newInner}\n$3`);
}

// Lista de páginas
router.get('/', (req, res) => {
  const dir = P(req.app).SITE_DIR;
  const pages = ['index.html', 'sobre.html', 'formas-de-pagamento.html']
    .filter(f => fs.existsSync(path.join(dir, f)));
  res.render('paginas_list', { pages, flash: null });
});

// Edição de página
router.get('/edit', (req, res) => {
  const { SITE_DIR } = P(req.app);
  const file = req.query.file || 'index.html';
  const full = path.join(SITE_DIR, file);

  let html = '';
  try { html = fs.readFileSync(full, 'utf-8'); } catch (e) { }

  let inner = extractBetweenMarkers(html, 'main');
  if (inner === null) {
    const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    inner = m ? m[1] : html;
  }

  res.render('paginas_edit', { file, content: inner, flash: null });
});

// Salvamento seguro
router.post('/save', (req, res) => {
  const { SITE_DIR } = P(req.app);
  const file = req.body.file || 'index.html';
  const full = path.join(SITE_DIR, file);

  const backupDir = path.join(SITE_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${file}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`);

  let original = '';
  try { original = fs.readFileSync(full, 'utf-8'); } catch { }
  fs.writeFileSync(backupPath, original, 'utf-8');

  const newInner = req.body.content || '';
  let replaced = replaceBetweenMarkers(original, newInner, 'main');
  if (replaced === null) {
    const bodyMatch = /(<body[^>]*>)[\s\S]*?(<\/body>)/i.exec(original);
    replaced = bodyMatch ? original.replace(bodyMatch[0], `$1${newInner}$2`) : newInner;
  }

  fs.writeFileSync(full, replaced, 'utf-8');
  res.redirect(`/paginas/edit?file=${encodeURIComponent(file)}`);
});

export default router;
