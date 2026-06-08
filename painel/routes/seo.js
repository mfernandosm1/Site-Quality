import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateSeoFiles } from './main_utils.js';

const router = express.Router();

function P(app){ return app.locals.paths; }

function ensureDir(dir){
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(file, fallback){
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJsonSafe(file, data){
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function defaultSeo(){
  return {
    siteTitle: 'Quality Celulares',
    siteDescription: 'Loja especializada em smartphones, acessórios, notebooks, games e eletrônicos.',
    siteUrl: 'https://www.qualitycel.com.br',
    analyticsId: 'G-9HPD9XCELH',
    searchConsoleVerification: '',
    defaultOgImage: 'images/logo.png',
    enableSitemap: true,
    enableRobots: true,
    enableSchemaProducts: true,
    enableSchemaOrganization: true,
    enableOpenGraph: true
  };
}

function normalizeSeo(body){
  const base = defaultSeo();

  const siteUrl = (body.siteUrl || base.siteUrl).trim().replace(/\/+$/, '');

  return {
    siteTitle: (body.siteTitle || base.siteTitle).trim(),
    siteDescription: (body.siteDescription || base.siteDescription).trim(),
    siteUrl,
    analyticsId: (body.analyticsId || '').trim(),
    searchConsoleVerification: (body.searchConsoleVerification || '').trim(),
    defaultOgImage: (body.defaultOgImage || base.defaultOgImage).trim(),
    enableSitemap: body.enableSitemap === 'on',
    enableRobots: body.enableRobots === 'on',
    enableSchemaProducts: body.enableSchemaProducts === 'on',
    enableSchemaOrganization: body.enableSchemaOrganization === 'on',
    enableOpenGraph: body.enableOpenGraph === 'on'
  };
}

router.get('/', (req, res) => {
  const { CONTENT_DIR } = P(req.app);
  const seoPath = path.join(CONTENT_DIR, 'seo.json');
  const seo = { ...defaultSeo(), ...readJsonSafe(seoPath, {}) };

  res.render('seo', {
    flash: req.query.saved ? '✅ Configurações de SEO salvas com sucesso!' : (req.query.generated ? '✅ sitemap.xml e robots.txt gerados com sucesso!' : null),
    seo
  });
});

router.post('/save', (req, res) => {
  const { CONTENT_DIR } = P(req.app);
  const seoPath = path.join(CONTENT_DIR, 'seo.json');
  const seo = normalizeSeo(req.body);

  writeJsonSafe(seoPath, seo);

  res.redirect('/seo?saved=1');
});

router.post('/generate', (req, res) => {
  try {
    const paths = P(req.app);
    const CONTENT_DIR = paths.CONTENT_DIR;
    const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;

    const seoPath = path.join(CONTENT_DIR, 'seo.json');
    const seo = { ...defaultSeo(), ...readJsonSafe(seoPath, {}) };

    generateSeoFiles(SITE_DIR, seo);
    res.redirect('/seo?generated=1');
  } catch (err) {
    console.error('Erro ao gerar SEO:', err);
    res.redirect('/seo?error=1');
  }
});

export default router;
