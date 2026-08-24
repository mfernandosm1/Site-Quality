import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import ErpCategoryService from '../services/erp-category-service.js';

const router = express.Router();
const PANEL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function service(req) { return new ErpCategoryService({ panelDir: PANEL_DIR, contentDir: req.app.locals.paths.CONTENT_DIR }); }

router.get('/', (req, res) => {
  const svc = service(req);
  const migration = svc.ensureMigration();
  res.render('erp_categories', {
    flash: req.query.saved ? '✅ Categoria ERP salva com sucesso.' : req.query.deleted ? '🗑️ Categoria ERP excluída.' : null,
    error: req.query.error || null,
    items: svc.list({ includeInactive: true }), tree: svc.tree({ includeInactive: true }), usage: svc.usage(), migration
  });
});
router.post('/save', (req, res) => {
  try { service(req).save(req.body, String(req.body.id || '').trim() || null); res.redirect('/erp/categorias?saved=1'); }
  catch (error) { res.redirect(`/erp/categorias?error=${encodeURIComponent(error.message)}`); }
});
router.post('/delete', (req, res) => {
  try { service(req).remove(String(req.body.id || '')); res.redirect('/erp/categorias?deleted=1'); }
  catch (error) { res.redirect(`/erp/categorias?error=${encodeURIComponent(error.message)}`); }
});
router.get('/export.csv', (req, res) => {
  const svc = service(req); const usage = svc.usage();
  const rows = [['ID','Nome','Tipo','Categoria superior','Produtos vinculados','Status','Última utilização']];
  const all = svc.list({ includeInactive: true }); const names = new Map(all.map(item => [item.id, item.name]));
  all.forEach(item => rows.push([item.id,item.name,item.type,names.get(item.parentId)||'',usage[item.id]?.products||0,item.active!==false?'Ativa':'Inativa',usage[item.id]?.lastUsedAt||'']));
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(';')).join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="categorias-erp.csv"'); res.send(`\uFEFF${csv}`);
});
export default router;
