import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FinanceService from '../services/finance-service.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');

function getFinanceService(app) {
  if (app.locals.financeService) return app.locals.financeService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'finance');
  app.locals.financeService = new FinanceService({ dataDir });
  return app.locals.financeService;
}

function getProfilePath(req) {
  return path.join(req.app.locals.paths.PUBLIC_DIR, '..', 'data', 'platform', 'company.json');
}

router.get('/', (req, res) => {
  let company = {};
  try { company = JSON.parse(fs.readFileSync(getProfilePath(req), 'utf8')); } catch (_) {}
  res.render('configuracoes', { flash: req.query.flash || null, company });
});

router.get('/financeiro', (req, res) => {
  const foundation = getFinanceService(req.app).getFoundation();
  const { settings: financeSettings, ...viewData } = foundation;
  res.render('configuracoes_financeiro', { flash: req.query.flash || null, ...viewData, financeSettings });
});

export default router;
