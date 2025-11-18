// routes/banners.js
import express from 'express';
import fs from 'fs';
import path from 'path';

import {
  readFileUtf8,
  ensureDirSync,
  backupWriteJson,
  parseBannersFromIndex,
  buildSlidesFromCrud,
} from './main_utils.js';

const router = express.Router();
function P(app) { return app.locals.paths; }

// ---------------- helpers ----------------
function loadJsonSafe(p, fallback = {}) {
  try {
    if (!fs.existsSync(p)) return fallback;
    const txt = fs.readFileSync(p, 'utf-8');
    return JSON.parse(txt || '{}');
  } catch {
    return fallback;
  }
}

function saveJsonWithBackup(targetFile, data, backupsDir, label) {
  ensureDirSync(path.dirname(targetFile));
  backupWriteJson(targetFile, data, backupsDir, label);
}

function normalizeItem(raw = {}) {
  return {
    src: (raw.src ?? '').toString().trim(),
    mobileSrc: (raw.mobileSrc ?? '').toString().trim(),
    title: (raw.title ?? '').toString().trim(),
    href: (raw.href ?? raw.link ?? '').toString().trim(),
    order: Number.isFinite(+raw.order) ? +raw.order : 0,
  };
}

function uniqBySrc(list = []) {
  const seen = new Set();
  const out = [];
  for (const it of list) {
    const key = `${it.src}|${it.mobileSrc}`;
    if (it.src && !seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

// pequena função compartilhada para exclusão
async function deleteAtIndex(idx, siteDir, backupsDir) {
  const storeFile = path.join(siteDir, 'content', 'banners.json');
  const store = loadJsonSafe(storeFile, { items: [] });
  let items = Array.isArray(store.items) ? store.items : [];

  if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
    items.splice(idx, 1);
    items = items
      .map((it, i) => ({ ...it, order: Number.isFinite(+it.order) ? +it.order : i }))
      .sort((a, b) => a.order - b.order);

    saveJsonWithBackup(storeFile, { items }, backupsDir, 'banners.json');
    await buildSlidesFromCrud(siteDir);
    return true;
  }
  return false;
}

// ---------------- rotas ------------------

// GET /banners
router.get('/', async (req, res) => {
  const { SITE_DIR } = P(req.app);

  const storeFile = path.join(SITE_DIR, 'content', 'banners.json');
  const indexPath = path.join(SITE_DIR, 'index.html');

  const store = loadJsonSafe(storeFile, { items: [] });
  const items = Array.isArray(store.items) ? store.items : [];

  const indexHtml = readFileUtf8(indexPath);
  const detected = parseBannersFromIndex(indexHtml);

  // compat: algumas views usam 'flashes', outras 'flash'
  const flashes = [];
  if (req.query.saved)    flashes.push('Banner salvo com sucesso.');
  if (req.query.deleted)  flashes.push('Banner excluído com sucesso.');
  if (req.query.imported) flashes.push('Banners importados do index.html.');
  if (req.query.merged)   flashes.push('Banners detectados adicionados ao CRUD.');

  res.render('banners', {
    items,
    detected,
    flashes,
    flash: flashes[0] || '',
  });
});

// POST /banners/add
router.post('/add', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const storeFile = path.join(SITE_DIR, 'content', 'banners.json');

  const store = loadJsonSafe(storeFile, { items: [] });
  const items = Array.isArray(store.items) ? store.items : [];

  const payload = normalizeItem({
    src: req.body.src || req.body.imgDesktop || req.body.desktop,
    mobileSrc: req.body.mobileSrc || req.body.imgMobile || req.body.mobile,
    title: req.body.title,
    href: req.body.href || req.body.link,
    order: req.body.order,
  });

  items.push(payload);

  saveJsonWithBackup(storeFile, { items }, BACKUPS_DIR, 'banners.json');
  await buildSlidesFromCrud(SITE_DIR);

  res.redirect('/banners?saved=1');
});

// POST /banners/:idx/save
router.post('/:idx/save', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const storeFile = path.join(SITE_DIR, 'content', 'banners.json');

  const idx = Number(req.params.idx);
  const store = loadJsonSafe(storeFile, { items: [] });
  const items = Array.isArray(store.items) ? store.items : [];

  if (Number.isInteger(idx) && idx >= 0 && idx < items.length) {
    const current = items[idx] || {};
    const updated = normalizeItem({
      src: req.body.src ?? req.body.imgDesktop ?? current.src,
      mobileSrc: req.body.mobileSrc ?? req.body.imgMobile ?? current.mobileSrc,
      title: req.body.title ?? current.title,
      href: req.body.href ?? req.body.link ?? current.href,
      order: req.body.order ?? current.order,
    });
    items[idx] = updated;

    saveJsonWithBackup(storeFile, { items }, BACKUPS_DIR, 'banners.json');
    await buildSlidesFromCrud(SITE_DIR);
  }

  res.redirect('/banners?saved=1');
});

// ✅ DELETE – aceita POST em **/:idx/delete** (como antes)…
router.post('/:idx/delete', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const ok = await deleteAtIndex(Number(req.params.idx), SITE_DIR, BACKUPS_DIR);
  res.redirect(ok ? '/banners?deleted=1' : '/banners');
});

// ✅ …e também POST em **/delete/:idx** (forma que seu formulário está usando)
router.post('/delete/:idx', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const ok = await deleteAtIndex(Number(req.params.idx), SITE_DIR, BACKUPS_DIR);
  res.redirect(ok ? '/banners?deleted=1' : '/banners');
});

// (opcional) aceita GET em /delete/:idx para casos de link simples
router.get('/delete/:idx', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const ok = await deleteAtIndex(Number(req.params.idx), SITE_DIR, BACKUPS_DIR);
  res.redirect(ok ? '/banners?deleted=1' : '/banners');
});

// POST /banners/import/replace
router.post('/import/replace', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const storeFile = path.join(SITE_DIR, 'content', 'banners.json');
  const indexPath = path.join(SITE_DIR, 'index.html');

  const indexHtml = readFileUtf8(indexPath);
  const detected = parseBannersFromIndex(indexHtml);

  const items = detected
    .map(d => normalizeItem({
      src: d.src,
      mobileSrc: d.mobileSrc,
      title: d.title,
      href: d.href,
      order: d.order,
    }))
    .sort((a, b) => a.order - b.order);

  saveJsonWithBackup(storeFile, { items }, BACKUPS_DIR, 'banners.json');
  await buildSlidesFromCrud(SITE_DIR);

  res.redirect('/banners?imported=1');
});

// POST /banners/import/merge
router.post('/import/merge', async (req, res) => {
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const storeFile = path.join(SITE_DIR, 'content', 'banners.json');
  const indexPath = path.join(SITE_DIR, 'index.html');

  const store = loadJsonSafe(storeFile, { items: [] });
  const current = Array.isArray(store.items) ? store.items.map(normalizeItem) : [];

  const indexHtml = readFileUtf8(indexPath);
  const detected = parseBannersFromIndex(indexHtml).map(d => normalizeItem(d));

  const merged = uniqBySrc([...current, ...detected]).sort((a, b) => a.order - b.order);

  saveJsonWithBackup(storeFile, { items: merged }, BACKUPS_DIR, 'banners.json');
  await buildSlidesFromCrud(SITE_DIR);

  res.redirect('/banners?merged=1');
});

export default router;
