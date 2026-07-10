import express from 'express';
import fs from 'fs';
import path from 'path';
import { generateSeoFiles } from './main_utils.js';

const router = express.Router();

function P(app){ return app.locals.paths; }
function ensureDir(dir){ if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function readJsonSafe(file, fallback){ try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; } }
function writeJsonSafe(file, data){ ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8'); }
function clean(value){ return String(value || '').trim(); }
function escapeAttr(value){
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
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
    enableOpenGraph: true,

    homeTitle: 'Quality Celulares',
    homeDescription: 'Celulares, eletrônicos, videogames e acessórios com ótimos preços. Parcelamento em até 60x no boleto e frete grátis no RS acima de R$120.',
    homeOgTitle: 'Quality Celulares',
    homeOgDescription: 'Celulares, eletrônicos, videogames e acessórios com ótimos preços. Parcelamento em até 60x no boleto e frete grátis no RS acima de R$120.',
    homeOgImage: 'images/logo.png',

    aboutTitle: 'Quality Celulares | Celulares, Assistência Técnica e Eletrônicos em Saldanha Marinho',
    aboutDescription: 'A Quality Celulares é especializada em celulares, iPhones, notebooks, assistência técnica e eletrônicos em Saldanha Marinho (RS). Produtos com garantia e atendimento especializado.',
    aboutOgTitle: 'Sobre a Quality Celulares',
    aboutOgDescription: 'Conheça a Quality Celulares, loja de celulares, notebooks, eletrônicos e assistência técnica em Saldanha Marinho (RS).',
    aboutOgImage: 'images/logo.png'
  };
}

function normalizeSeo(body){
  const base = defaultSeo();
  const siteUrl = clean(body.siteUrl || base.siteUrl).replace(/\/+$/, '');
  return {
    siteTitle: clean(body.siteTitle || base.siteTitle),
    siteDescription: clean(body.siteDescription || base.siteDescription),
    siteUrl,
    analyticsId: clean(body.analyticsId),
    searchConsoleVerification: clean(body.searchConsoleVerification),
    defaultOgImage: clean(body.defaultOgImage || base.defaultOgImage),
    enableSitemap: body.enableSitemap === 'on',
    enableRobots: body.enableRobots === 'on',
    enableSchemaProducts: body.enableSchemaProducts === 'on',
    enableSchemaOrganization: body.enableSchemaOrganization === 'on',
    enableOpenGraph: body.enableOpenGraph === 'on',

    homeTitle: clean(body.homeTitle || base.homeTitle),
    homeDescription: clean(body.homeDescription || base.homeDescription),
    homeOgTitle: clean(body.homeOgTitle || body.homeTitle || base.homeOgTitle),
    homeOgDescription: clean(body.homeOgDescription || body.homeDescription || base.homeOgDescription),
    homeOgImage: clean(body.homeOgImage || body.defaultOgImage || base.homeOgImage),

    aboutTitle: clean(body.aboutTitle || base.aboutTitle),
    aboutDescription: clean(body.aboutDescription || base.aboutDescription),
    aboutOgTitle: clean(body.aboutOgTitle || body.aboutTitle || base.aboutOgTitle),
    aboutOgDescription: clean(body.aboutOgDescription || body.aboutDescription || base.aboutOgDescription),
    aboutOgImage: clean(body.aboutOgImage || body.defaultOgImage || base.aboutOgImage)
  };
}

function absoluteImage(value, siteUrl){
  const raw = clean(value) || 'images/logo.png';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${siteUrl}/${raw.replace(/^\/+/, '')}`;
}

function upsertHeadTag(html, pattern, tag){
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function patchPageSeo(filePath, data){
  if (!filePath || !fs.existsSync(filePath)) return false;
  let html = fs.readFileSync(filePath, 'utf-8');
  const title = escapeAttr(data.title);
  const description = escapeAttr(data.description);
  const ogTitle = escapeAttr(data.ogTitle || data.title);
  const ogDescription = escapeAttr(data.ogDescription || data.description);
  const ogImage = escapeAttr(data.ogImage);
  const canonical = escapeAttr(data.canonical);

  html = upsertHeadTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = upsertHeadTag(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
  html = upsertHeadTag(html, /<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="website">`);
  html = upsertHeadTag(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${ogTitle}">`);
  html = upsertHeadTag(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${ogDescription}">`);
  html = upsertHeadTag(html, /<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${ogImage}">`);
  html = upsertHeadTag(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonical}">`);
  html = upsertHeadTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  html = upsertHeadTag(html, /<meta\s+name=["']twitter:card["'][^>]*>/i, `<meta name="twitter:card" content="summary_large_image">`);

  fs.writeFileSync(filePath, html, 'utf-8');
  return true;
}

function applyPageSeo(paths, seo){
  const siteDir = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  if (!siteDir) return;
  const base = seo.siteUrl.replace(/\/+$/, '');

  patchPageSeo(path.join(siteDir, 'index.html'), {
    title: seo.homeTitle,
    description: seo.homeDescription,
    ogTitle: seo.homeOgTitle,
    ogDescription: seo.homeOgDescription,
    ogImage: absoluteImage(seo.homeOgImage, base),
    canonical: `${base}/`
  });

  patchPageSeo(path.join(siteDir, 'sobre.html'), {
    title: seo.aboutTitle,
    description: seo.aboutDescription,
    ogTitle: seo.aboutOgTitle,
    ogDescription: seo.aboutOgDescription,
    ogImage: absoluteImage(seo.aboutOgImage, base),
    canonical: `${base}/sobre.html`
  });
}

router.get('/', (req, res) => {
  const { CONTENT_DIR } = P(req.app);
  const seoPath = path.join(CONTENT_DIR, 'seo.json');
  const seo = { ...defaultSeo(), ...readJsonSafe(seoPath, {}) };
  res.render('seo', {
    flash: req.query.saved ? '✅ SEO salvo e aplicado na Home e no Sobre!' : (req.query.generated ? '✅ sitemap.xml e robots.txt gerados com sucesso!' : null),
    seo
  });
});

router.post('/save', (req, res) => {
  try {
    const paths = P(req.app);
    const seoPath = path.join(paths.CONTENT_DIR, 'seo.json');
    const seo = normalizeSeo(req.body);
    writeJsonSafe(seoPath, seo);
    applyPageSeo(paths, seo);
    res.redirect('/seo?saved=1');
  } catch (err) {
    console.error('Erro ao salvar SEO:', err);
    res.redirect('/seo?error=1');
  }
});

router.post('/generate', (req, res) => {
  try {
    const paths = P(req.app);
    const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
    const seoPath = path.join(paths.CONTENT_DIR, 'seo.json');
    const seo = { ...defaultSeo(), ...readJsonSafe(seoPath, {}) };
    generateSeoFiles(SITE_DIR, seo);
    res.redirect('/seo?generated=1');
  } catch (err) {
    console.error('Erro ao gerar SEO:', err);
    res.redirect('/seo?error=1');
  }
});

export default router;
