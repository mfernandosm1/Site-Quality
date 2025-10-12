import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();

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

// Página "Sobre"
router.get('/', (req, res) => {
  const file = path.join(P(req.app).SITE_DIR, 'sobre.html');
  let html = '';
  try { html = fs.readFileSync(file, 'utf-8'); } catch (e) { }

  let inner = extractBetweenMarkers(html, 'main');
  if (inner === null) {
    const m = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    inner = m ? m[1] : html;
  }

  res.render('editar_sobre', { html: inner, flash: null });
});

router.post('/salvar', (req, res) => {
  const { SITE_DIR } = P(req.app);
  const file = path.join(SITE_DIR, 'sobre.html');

  const backupDir = path.join(SITE_DIR, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `sobre.html.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`);

  let original = '';
  try { original = fs.readFileSync(file, 'utf-8'); } catch { }
  fs.writeFileSync(backupPath, original, 'utf-8');

  const newInner = req.body.html || '';
  let replaced = replaceBetweenMarkers(original, newInner, 'main');
  if (replaced === null) {
    const bodyMatch = /(<body[^>]*>)[\s\S]*?(<\/body>)/i.exec(original);
    replaced = bodyMatch ? original.replace(bodyMatch[0], `$1${newInner}$2`) : newInner;
  }

  fs.writeFileSync(file, replaced, 'utf-8');
  res.redirect('/sobre');
});

export default router;
