import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

/* =========================================================
   🧱 FUNÇÕES BASE GERAIS (usadas por paginas.js)
========================================================= */
export function readFileUtf8(p){
  try { return fs.readFileSync(p, 'utf-8'); }
  catch { return ''; }
}
export function writeFileUtf8(p, content){
  fs.writeFileSync(p, content, 'utf-8');
}
function load$(html){ return cheerio.load(html, { decodeEntities:false }); }

export function extractMain(html){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length) return $main.html() || '';
  return $('body').html() || '';
}
export function replaceMain(html, newMainInner){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length) {
    $main.html(newMainInner);
  } else {
    const $body = $('body').first();
    if ($body.length) $body.html(newMainInner);
  }
  return $.html();
}

/* =========================================================
   🏠 INDEX (mantém ids existentes)
========================================================= */
export function extractIndexFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const h2Smartphones = main.find('h2#smartphones').first().text().trim();
  const h2Acessorios  = main.find('h2#acessorios').first().text().trim();
  const emBreve = main.find('p.em-breve').first().text().trim();
  return { h2Smartphones, h2Acessorios, emBreve };
}
export function applyIndexFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  if (fields.h2Smartphones !== undefined){
    main.find('h2#smartphones').first().text(fields.h2Smartphones);
  }
  if (fields.h2Acessorios !== undefined){
    main.find('h2#acessorios').first().text(fields.h2Acessorios);
  }
  if (fields.emBreve !== undefined){
    main.find('p.em-breve').first().text(fields.emBreve);
  }
  return $.html();
}

/* =========================================================
   ℹ️ SOBRE
========================================================= */
export function extractSobreFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const sec0 = main.find('section').eq(0);
  const titulo = sec0.find('h1').first().text().trim();
  const intro  = sec0.find('p').first().text().trim();

  const cards  = main.find('section').eq(1).find('div').toArray();
  const missao = cards[0] ? $(cards[0]).find('p').first().text().trim() : '';
  const visao  = cards[1] ? $(cards[1]).find('p').first().text().trim() : '';
  const valores= cards[2] ? $(cards[2]).find('p').first().text().trim() : '';

  const difSec = main.find('section').eq(2);
  const difTitulo = difSec.find('h2').first().text().trim();
  const difUL = difSec.find('ul').first();
  const difListaHTML = difUL.length ? difUL.html() : '';

  return { titulo, intro, missao, visao, valores, difTitulo, difListaHTML };
}
export function applySobreFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  const sec0 = main.find('section').eq(0);
  if (fields.titulo !== undefined) sec0.find('h1').first().text(fields.titulo);
  if (fields.intro  !== undefined) sec0.find('p').first().text(fields.intro);

  const cards  = main.find('section').eq(1).find('div').toArray();
  if (fields.missao !== undefined && cards[0]) $(cards[0]).find('p').first().text(fields.missao);
  if (fields.visao  !== undefined && cards[1]) $(cards[1]).find('p').first().text(fields.visao);
  if (fields.valores!== undefined && cards[2]) $(cards[2]).find('p').first().text(fields.valores);

  const difSec = main.find('section').eq(2);
  if (fields.difTitulo !== undefined) difSec.find('h2').first().text(fields.difTitulo);
  if (fields.difListaHTML !== undefined){
    const difUL = difSec.find('ul').first();
    if (difUL.length) difUL.html(fields.difListaHTML);
  }
  return $.html();
}

/* =========================================================
   💳 FORMAS DE PAGAMENTO
========================================================= */
export function extractFormasFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const titulo = main.find('h1').first().text().trim();

  const gridCards = main.find('section').eq(0).find('div').toArray();
  const cartaoTitulo = gridCards[0] ? $(gridCards[0]).find('h2').first().text().trim() : '';
  const cartaoTexto  = gridCards[0] ? $(gridCards[0]).find('p').first().text().trim() : '';

  const boletoTitulo = gridCards[1] ? $(gridCards[1]).find('h2').first().text().trim() : '';
  const boletoTexto  = gridCards[1] ? $(gridCards[1]).find('p').first().text().trim() : '';

  const pixTitulo    = gridCards[2] ? $(gridCards[2]).find('h2').first().text().trim() : '';
  const pixTexto     = gridCards[2] ? $(gridCards[2]).find('p').first().text().trim() : '';

  const envSec = main.find('section').eq(1);
  const enviosTitulo = envSec.find('h2').first().text().trim();
  const enviosLinha1 = envSec.find('p').eq(0).text().trim();
  const enviosLinha2 = envSec.find('p').eq(1).text().trim();

  return { titulo, cartaoTitulo, cartaoTexto, boletoTitulo, boletoTexto, pixTitulo, pixTexto, enviosTitulo, enviosLinha1, enviosLinha2 };
}
export function applyFormasFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  if (fields.titulo !== undefined) main.find('h1').first().text(fields.titulo);

  const gridCards = main.find('section').eq(0).find('div').toArray();
  if (gridCards[0]){
    if (fields.cartaoTitulo !== undefined) $(gridCards[0]).find('h2').first().text(fields.cartaoTitulo);
    if (fields.cartaoTexto  !== undefined) $(gridCards[0]).find('p').first().text(fields.cartaoTexto);
  }
  if (gridCards[1]){
    if (fields.boletoTitulo !== undefined) $(gridCards[1]).find('h2').first().text(fields.boletoTitulo);
    if (fields.boletoTexto  !== undefined) $(gridCards[1]).find('p').first().text(fields.boletoTexto);
  }
  if (gridCards[2]){
    if (fields.pixTitulo !== undefined) $(gridCards[2]).find('h2').first().text(fields.pixTitulo);
    if (fields.pixTexto  !== undefined) $(gridCards[2]).find('p').first().text(fields.pixTexto);
  }

  const envSec = main.find('section').eq(1);
  if (fields.enviosTitulo !== undefined) envSec.find('h2').first().text(fields.enviosTitulo);
  if (fields.enviosLinha1 !== undefined) envSec.find('p').eq(0).text(fields.enviosLinha1);
  if (fields.enviosLinha2 !== undefined) envSec.find('p').eq(1).text(fields.enviosLinha2);

  return $.html();
}

/* =========================================================
   🆕 CATEGORIAS
========================================================= */
function categoryPageHtml(header, footer){
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Categorias – Quality Celulares</title>
  <meta name="description" content="Confira as categorias de produtos da Quality Celulares. Smartphones, acessórios e tecnologia com atendimento pelo WhatsApp.">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Categorias – Quality Celulares">
  <meta property="og:description" content="Confira as categorias de produtos da Quality Celulares. Smartphones, acessórios e tecnologia com atendimento pelo WhatsApp.">
  <meta property="og:image" content="https://www.qualitycel.com.br/images/logo.png">
  <meta property="og:url" content="https://www.qualitycel.com.br/categoria.html">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://www.qualitycel.com.br/categoria.html">
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/site/css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
${header}
<main class="main">
  <h1 id="categoria-titulo" style="text-align:center;margin-top:30px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;">Categoria</h1>
  <div id="produtos-container" class="products" style="margin-top:40px;"></div>
</main>
${footer}
<script>
(function(){
  function normalizeText(v){
    return (v || '').toString().trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
  }

  function shouldShowPrice(p){
    const raw = p.showPrice ?? p.mostrar_preco ?? p.show_price ?? p.mostrarPreco ?? p.priceVisible ?? false;
    if (raw === true) return true;
    const v = raw.toString().toLowerCase();
    return v === 'sim' || v === 'yes' || v === 'true' || v === '1' || v === 'on';
  }

  function formatPrice(value){
    const priceNum = (typeof value === 'number' ? value : Number(value || 0));
    if (isNaN(priceNum)) return '';
    return 'R$ ' + priceNum.toFixed(2).replace('.', ',');
  }

  function escapeHtml(value){
    return (value || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeIcon(icon){
    icon = (icon || '').toString().trim();
    if (!icon) return '';
    return icon.includes('fa-') ? icon : '';
  }

  function setCategoryTitle(titleEl, name, icon){
    if (!titleEl) return;
    titleEl.innerHTML = '';
    const iconClass = normalizeIcon(icon);
    if (iconClass) {
      const i = document.createElement('i');
      i.className = iconClass;
      i.setAttribute('aria-hidden', 'true');
      titleEl.appendChild(i);
    }
    titleEl.appendChild(document.createTextNode(name));
  }

  function showMessage(text){
    const container = document.getElementById('produtos-container');
    if (container) container.innerHTML = '<p class="em-breve" style="text-align:center;">' + escapeHtml(text) + '</p>';
  }

  function assetUrl(path){
    const p = (path || '').toString().trim();
    if (!p) return assetUrl('images/sem-imagem.png');
    if (/^https?:\\/\\//i.test(p)) return p;

    const clean = p.replace(/^\\/+/, '');
    const isLocalPreview = window.location.hostname === 'localhost' && window.location.port === '3000';

    if (isLocalPreview) {
      return clean.startsWith('site/') ? '/' + clean : '/site/' + clean;
    }

    return '/' + clean;
  }

  function imageFallback(path){
    const p = (path || '').toString().trim();
    if (!p) return '/site/images/sem-imagem.png';
    if (/^https?:\\/\\//i.test(p)) return p;
    const clean = p.replace(/^\\/+/, '').replace(/^site\\//, '');
    return '/site/' + clean;
  }

  async function fetchJson(paths){
    let lastError = null;
    for (const url of paths) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    throw new Error('Arquivo JSON não encontrado.');
  }

  const params = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const lastPath = normalizeText(pathParts[pathParts.length - 1] || '');
  const pathSlug = ['categoria.html', 'index.html'].includes(lastPath) ? '' : lastPath;
  const currentSlug = normalizeText(params.get('slug') || params.get('cat') || pathSlug);
  const titleEl = document.getElementById('categoria-titulo');

  if (!currentSlug) {
    setCategoryTitle(titleEl, 'Categoria não encontrada', '');
    showMessage('Nenhuma categoria foi informada.');
    return;
  }

  Promise.all([
    fetchJson(['/content/categories.json', '/site/content/categories.json']).catch(() => ({ items: [] })),
    fetchJson(['/content/products.json', '/site/content/products.json']).catch(() => ({ items: [] }))
  ]).then(([categoriesData, productsData]) => {
    const categories = categoriesData.items || [];
    const category = categories.find(c =>
      normalizeText(c.slug) === currentSlug ||
      normalizeText(c.name) === currentSlug ||
      normalizeText(c.id) === currentSlug
    );

    const categoryName = category ? (category.name || category.slug || currentSlug) : currentSlug;
    const categoryNameLower = normalizeText(categoryName);
    const categorySlugLower = normalizeText(category ? category.slug : currentSlug);
    const categoryIdLower = normalizeText(category ? category.id : '');

    setCategoryTitle(titleEl, categoryName, category ? category.icon : '');
    document.title = categoryName + ' – Quality Celulares';

    const metaDescriptionText = 'Confira ' + categoryName + ' disponíveis na Quality Celulares. Atendimento pelo WhatsApp.';
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', metaDescriptionText);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/' + encodeURIComponent(categorySlugLower || currentSlug) + '/');

    function setOg(property, content){
      let tag = document.querySelector('meta[property="' + property + '"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    }

    const categoryUrl = window.location.origin + '/' + encodeURIComponent(categorySlugLower || currentSlug) + '/';
    setOg('og:type', 'website');
    setOg('og:title', categoryName + ' – Quality Celulares');
    setOg('og:description', metaDescriptionText);
    setOg('og:url', categoryUrl);
    setOg('og:image', window.location.origin + '/images/logo.png');

    const products = (productsData.items || []).filter(p => {
      if (p.active === false) return false;
      const cat = normalizeText(p.category ?? p.categoria ?? p.categorySlug ?? p.categoriaSlug ?? p.categoryId ?? p.categoriaId);
      return cat === currentSlug || cat === categorySlugLower || cat === categoryNameLower || (categoryIdLower && cat === categoryIdLower);
    });

    if (products.length === 0) {
      showMessage('Nenhum produto nesta categoria ainda.');
      return;
    }

    const container = document.getElementById('produtos-container');
    container.innerHTML = '';
    products.forEach(p => {
      const priceStr = shouldShowPrice(p) ? formatPrice(p.price ?? p.preco) : '';
      const productName = p.name || p.nome || '';
      const productImageRaw = p.image || p.imagem || '';
      const productImage = assetUrl(productImageRaw);
      const productImageFallback = imageFallback(productImageRaw);
      const whatsappText = encodeURIComponent('Olá! Vim através do site e tenho interesse em ' + (productName || 'produto'));
      const hasGallery = Array.isArray(p.gallery) && p.gallery.filter(Boolean).length > 0;
      const hasVideo = !!(p.youtube || p.youtubeUrl || p.video || p.videoUrl);
      const hasDescription = !!(p.description || p.descricao || p.desc || p.descriptionLong || p.descriptionShort);
      const detailsRaw = p.detailsEnabled ?? p.detalhesAtivo ?? p.details_enabled ?? p.verDetalhes ?? p.showDetails;
      const detailsEnabled =
        detailsRaw === true ||
        String(detailsRaw || '').toLowerCase() === 'true' ||
        String(detailsRaw || '').toLowerCase() === 'sim' ||
        String(detailsRaw || '').toLowerCase() === '1' ||
        String(detailsRaw || '').toLowerCase() === 'on';
      const productId = p.id || p.slug || p._id || '';
      const productSlug = p.slug || productId;
      const detalhesHTML =
        (detailsEnabled || hasGallery || hasVideo || hasDescription) && productSlug
          ? '<a href="/produto/' + encodeURIComponent(productSlug) + '/" class="btn btn-details">Ver detalhes</a>'
          : '';

      const card = document.createElement('div');
      card.className = 'produto-card product-card';
      card.innerHTML =
        '<img src="' + escapeHtml(productImage) + '" onerror="this.onerror=null;this.src=\\'' + escapeHtml(productImageFallback) + '\\';" alt="' + escapeHtml(productName) + '">' +
        '<h3>' + escapeHtml(productName) + '</h3>' +
        (priceStr ? '<p>' + escapeHtml(priceStr) + '</p>' : '') +
        detalhesHTML +
        '<a href="https://wa.me/5555991407824?text=' + whatsappText + '" class="btn btn-whatsapp" target="_blank">' +
        '<i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp</a>';
      container.appendChild(card);
    });
  }).catch(() => {
    setCategoryTitle(titleEl, 'Erro ao carregar categoria', '');
    showMessage('Não foi possível carregar os produtos desta categoria.');
  });
})();
</script>
</body>
</html>`;
}


export function generateCategoryPage(name, slug, siteDir) {
  const header = readFileUtf8(path.join(siteDir, 'header.html'));
  const footer = readFileUtf8(path.join(siteDir, 'footer.html'));
  const target = path.join(siteDir, 'categoria.html');
  writeFileUtf8(target, categoryPageHtml(header, footer));
  console.log('✅ Página única categoria.html atualizada.');
}

function fixHeaderCategoryScript(headerHtml){
  let html = headerHtml || '';

  // Corrige o JS antigo do header para apontar para a página única.
  html = html
    .replace(/linkD\.href\s*=\s*`categoria-\$\{cat\.slug\}\.html`;?/g, "linkD.href = `/${encodeURIComponent(cat.slug)}/`;")
    .replace(/linkM\.href\s*=\s*`categoria-\$\{cat\.slug\}\.html`;?/g, "linkM.href = `/${encodeURIComponent(cat.slug)}/`;");

  // Corrige o JS antigo do header para montar ícone + texto sem usar innerHTML.
  html = html
    .replace(/linkD\.textContent\s*=\s*cat\.name;?/g, `if (cat.icon) {\n                  const iconD = document.createElement("i");\n                  iconD.className = cat.icon;\n                  iconD.setAttribute("aria-hidden", "true");\n                  linkD.appendChild(iconD);\n                  linkD.appendChild(document.createTextNode(" "));\n                }\n                linkD.appendChild(document.createTextNode(cat.name));`)
    .replace(/linkM\.textContent\s*=\s*cat\.name;?/g, `if (cat.icon) {\n                  const iconM = document.createElement("i");\n                  iconM.className = cat.icon;\n                  iconM.setAttribute("aria-hidden", "true");\n                  linkM.appendChild(iconM);\n                  linkM.appendChild(document.createTextNode(" "));\n                }\n                linkM.appendChild(document.createTextNode(cat.name));`);

  return html;
}

function escapeAttr(value){
  return (value || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(value){
  return (value || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function iconHtml(icon){
  const cls = (icon || '').toString().trim();
  if (!cls || !cls.includes('fa-')) return '';
  return `<i class="${escapeAttr(cls)}" aria-hidden="true"></i> `;
}

export function updateHeaderMenu(categories, siteDir) {
  const headerPath = path.join(siteDir, 'header.html');
  const sorted = [...(categories || [])].sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)));

  const catLinksDesktop = sorted.map(c => {
    const slug = (c.slug || c.name || '').toString().trim();
    const name = (c.name || slug).toString().trim();
    const icon = (c.icon || '').toString().trim();
    if (!slug || !name) return '';
    return `          <a href="/${encodeURIComponent(slug)}/" class="cat-link">${iconHtml(icon)}${escapeText(name)}</a>`;
  }).filter(Boolean).join('\n');

  const catLinksMobile = sorted.map(c => {
    const slug = (c.slug || c.name || '').toString().trim();
    const name = (c.name || slug).toString().trim();
    const icon = (c.icon || '').toString().trim();
    if (!slug || !name) return '';
    return `          <a href="/${encodeURIComponent(slug)}/" class="cat-link">${iconHtml(icon)}${escapeText(name)}</a>`;
  }).filter(Boolean).join('\n');

  const headerHtml = `<header class="header">
  <div class="header-container">
    <a href="/" class="logo-wrapper" data-home-link>
      <img src="/images/logo.png" onerror="this.onerror=null;this.src='/site/images/logo.png';" alt="Quality Celulares" class="logo">
    </a>

    <nav class="nav-desktop" id="nav-desktop">
      <a href="/" data-home-link>Início</a>
${catLinksDesktop}
      <div class="search-wrapper">
        <input type="text" id="search-input" placeholder="Buscar...">
        <button id="search-button" aria-label="Buscar">
          <i class="fa fa-search"></i>
        </button>
      </div>
    </nav>

    <button id="menu-toggle" class="menu-toggle" aria-label="Abrir menu">
      <i class="fa-solid fa-bars"></i>
    </button>
  </div>

  <div id="mobile-menu" class="mobile-menu" aria-hidden="true">
    <div class="mobile-menu-header">
      <a href="/" class="logo-wrapper" data-home-link>
        <img src="/images/logo.png" onerror="this.onerror=null;this.src='/site/images/logo.png';" alt="Quality Celulares" class="logo">
      </a>
      <button id="menu-close" class="menu-close" aria-label="Fechar menu">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="search-wrapper-mobile">
      <input type="text" id="search-input-mobile" placeholder="Buscar...">
      <button id="search-button-mobile" aria-label="Buscar">
        <i class="fa fa-search"></i>
      </button>
    </div>

    <nav class="mobile-nav" id="nav-mobile">
      <a href="/" data-home-link>Início</a>
${catLinksMobile}
    </nav>
  </div>

  <div id="menu-overlay" class="menu-overlay"></div>
</header>
<script>
(function(){
  var isLocalPreview = window.location.hostname === 'localhost' && window.location.port === '3000';
  if (isLocalPreview) {
    document.querySelectorAll('[data-home-link]').forEach(function(a){
      a.setAttribute('href', '/site/view/index.html');
    });
  }
})();
</script>`;

  writeFileUtf8(headerPath, headerHtml);
  console.log(`✅ Header atualizado com ${sorted.length} categorias.`);
}


export function convertOldCategoryFiles(siteDir) {
  if (!fs.existsSync(siteDir)) return;
  const files = fs.readdirSync(siteDir).filter(f => /^categoria[_-].+\.html$/i.test(f));
  let removed = 0;
  for (const file of files) {
    const fullPath = path.join(siteDir, file);
    try {
      fs.unlinkSync(fullPath);
      removed++;
    } catch (e) {
      console.warn(`⚠️ Não foi possível remover ${file}: ${e.message}`);
    }
  }
  console.log(removed > 0
    ? `🧹 Removidos ${removed} arquivos antigos de categoria.`
    : '✅ Nenhum arquivo antigo de categoria encontrado.');
}


/* =========================================================
   🔎 SEO AVANÇADO: Config, Sitemap, Robots e Schema Base
========================================================= */
const DEFAULT_SITE_BASE_URL = 'https://www.qualitycel.com.br';

export function defaultSeoConfig(){
  return {
    siteTitle: 'Quality Celulares',
    siteDescription: 'Loja especializada em smartphones, acessórios, notebooks, games e eletrônicos com atendimento pelo WhatsApp.',
    siteUrl: DEFAULT_SITE_BASE_URL,
    analyticsId: 'G-9HPD9XCELH',
    searchConsoleVerification: '',
    defaultOgImage: 'images/logo.png',
    enableSitemap: true,
    enableRobots: true,
    enableSchemaProducts: true,
    enableSchemaOrganization: true,
    enableOpenGraph: true,
    enableCanonical: true,
    enableBreadcrumbs: true
  };
}

export function loadSeoConfig(siteDir){
  const fallback = defaultSeoConfig();

  try {
    const seoPath = path.join(siteDir, 'content', 'seo.json');
    if (!fs.existsSync(seoPath)) return fallback;

    const data = JSON.parse(fs.readFileSync(seoPath, 'utf-8'));
    const seo = { ...fallback, ...data };

    seo.siteUrl = cleanBaseUrl(seo.siteUrl || fallback.siteUrl);
    return seo;
  } catch {
    return fallback;
  }
}

function xmlEscape(value){
  return (value || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanBaseUrl(url){
  return (url || DEFAULT_SITE_BASE_URL).toString().trim().replace(/\/+$/, '');
}

function normalizeUrlPath(pathname){
  return (pathname || '').toString().replace(/^\//, '');
}

function makeAbsoluteUrl(pathname, baseUrl = DEFAULT_SITE_BASE_URL){
  return `${cleanBaseUrl(baseUrl)}/${normalizeUrlPath(pathname)}`;
}

function readJsonSafe(file, fallback = { items: [] }){
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}

function productHasDetails(p){
  const truthy = v => {
    if (v === true) return true;
    if (v === false || v === null || v === undefined) return false;
    const s = v.toString().trim().toLowerCase();
    return s === 'sim' || s === 'yes' || s === 'true' || s === '1' || s === 'on';
  };

  return truthy(p.detailsEnabled) ||
    (Array.isArray(p.gallery) && p.gallery.filter(Boolean).length > 0) ||
    !!(p.youtube || p.youtubeUrl || p.video || p.videoUrl) ||
    !!(p.description || p.descricao || p.desc || p.descriptionLong || p.descriptionShort);
}

function imageAbsoluteUrl(image, baseUrl){
  const img = (image || '').toString().trim() || 'images/logo.png';
  if (/^https?:\/\//i.test(img)) return img;
  return makeAbsoluteUrl(img, baseUrl);
}

export function generateSeoFiles(siteDir, seoConfig = null) {
  try {
    const seo = seoConfig || loadSeoConfig(siteDir);
    const baseUrl = cleanBaseUrl(seo.siteUrl);

    const contentDir = path.join(siteDir, 'content');
    const categories = readJsonSafe(path.join(contentDir, 'categories.json'), { items: [] }).items || [];
    const products = readJsonSafe(path.join(contentDir, 'products.json'), { items: [] }).items || [];
    const now = new Date().toISOString().split('T')[0];

    const urls = [];

    function addUrl(loc, priority = '0.7', changefreq = 'weekly'){
      if (!loc) return;
      urls.push({ loc, priority, changefreq });
    }

    addUrl(`${baseUrl}/`, '1.0', 'weekly');
    addUrl(makeAbsoluteUrl('index.html', baseUrl), '1.0', 'weekly');
    addUrl(makeAbsoluteUrl('sobre.html', baseUrl), '0.5', 'monthly');
    addUrl(makeAbsoluteUrl('formas-de-pagamento.html', baseUrl), '0.5', 'monthly');

    categories
      .filter(c => c && c.slug)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach(c => {
        addUrl(`${baseUrl}/${encodeURIComponent(c.slug)}/`, '0.8', 'weekly');
      });

    products
      .filter(p => p && p.active !== false && (p.slug || p.id))
      .forEach(p => {
        const productSlug = p.slug || p.id;
        addUrl(`${baseUrl}/produto/${encodeURIComponent(productSlug)}/`, '0.75', 'weekly');
      });

    const uniqueUrls = [];
    const seen = new Set();
    urls.forEach(u => {
      if (seen.has(u.loc)) return;
      seen.add(u.loc);
      uniqueUrls.push(u);
    });

    if (seo.enableSitemap !== false) {
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(u => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

      writeFileUtf8(path.join(siteDir, 'sitemap.xml'), sitemap);
    }

    if (seo.enableRobots !== false) {
      const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

      writeFileUtf8(path.join(siteDir, 'robots.txt'), robots);
    }

    if (seo.enableSchemaOrganization !== false) {
      const organizationSchema = {
        '@context': 'https://schema.org',
        '@type': 'Store',
        name: seo.siteTitle || 'Quality Celulares',
        url: baseUrl,
        logo: imageAbsoluteUrl(seo.defaultOgImage || 'images/logo.png', baseUrl),
        description: seo.siteDescription || 'Loja especializada em smartphones e acessórios.',
        sameAs: []
      };

      writeFileUtf8(
        path.join(siteDir, 'content', 'organization.schema.json'),
        JSON.stringify(organizationSchema, null, 2)
      );
    }

    console.log(`✅ SEO atualizado: sitemap/robots gerados com ${uniqueUrls.length} URL(s).`);
  } catch (e) {
    console.warn(`⚠️ Falha ao gerar SEO: ${e.message}`);
  }
}

/* =========================================================
   🖼️ BANNERS
========================================================= */
export function ensureDirSync(dir){
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}
export function backupWriteJson(targetFile, data, backupsDir, label){
  try {
    const prev = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf-8') : '';
    if (prev) {
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const bakName = `${label}.${ts}.bak.json`;
      if (backupsDir) ensureDirSync(backupsDir);
      fs.writeFileSync(path.join(backupsDir, bakName), prev, 'utf-8');
    }
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}
function norm(v){ return (v||'').toString().trim(); }
function firstFromSrcset(v){
  if (!v) return '';
  const t = v.split(',')[0].trim();
  return t.split(/\s+/)[0];
}
function deriveMobile(desktop){
  if (!desktop) return '';
  if (/-mob(?:ile)?\.[a-z0-9]+$/i.test(desktop)) return desktop;
  return desktop.replace(/(\.[a-z0-9]+)$/i, '-mob$1');
}
/** Prefixa 'images/' quando o valor parece só um nome de arquivo (ex.: desk1.png). */
function normalizeBannerPath(p){
  const x = norm(p);
  if (!x) return '';
  if (/^https?:\/\//i.test(x)) return x;
  if (x.startsWith('/')) return x;
  // se não tem barra, assume pasta images/
  if (!x.includes('/')) return `images/${x}`;
  return x;
}

/** Lê banners no index.html e retorna objetos: { src, mobileSrc, alt, href, title, text, order } */
export function parseBannersFromIndex(indexHtml){
  if (!indexHtml) return [];
  const $ = cheerio.load(indexHtml, { decodeEntities:false });

  const items = [];

  // Caso principal do seu site: section.banner > .swiper > .swiper-wrapper > .swiper-slide > picture > source/img
  $('section.banner .swiper-slide picture').each((i, pic)=>{
    const $pic = $(pic);
    const $img = $pic.find('img').first();
    if (!$img.length) return;

    const desktop = normalizeBannerPath($img.attr('data-src') || $img.attr('src'));
    const $srcMobile = $pic.find('source[media*="max-width"][srcset]').first().length
      ? $pic.find('source[media*="max-width"][srcset]').first()
      : $pic.find('source[srcset]').first();
    let mobile = $srcMobile.length ? normalizeBannerPath(firstFromSrcset($srcMobile.attr('srcset'))) : '';
    if (!mobile) mobile = normalizeBannerPath($img.attr('data-src-mobile') || $img.attr('data-mobile'));
    if (!mobile) mobile = normalizeBannerPath(deriveMobile(desktop));
    if (!desktop) return;

    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm($img.attr('alt')),
      href: '',
      title: norm($img.attr('title') || $pic.attr('title')),
      text: '',
      order: items.length
    });
  });

  // Fallback: <img> direto
  $('section.banner .swiper-slide img').each((i, img)=>{
    const $img = $(img);
    const desktop = normalizeBannerPath($img.attr('data-src') || $img.attr('src'));
    if (!desktop) return;
    if (items.some(it => it.src === desktop)) return;
    let mobile = normalizeBannerPath(it.mobileSrc || it.mobile || '');

// ⚠️ Só usa fallback automático se NÃO vier do CRUD
if (!mobile && !it.mobileSrc) {
  mobile = '';
}
    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm($img.attr('alt')),
      href: '',
      title: norm($img.attr('title')),
      text: '',
      order: items.length
    });
  });

  // Fallback adicional: elementos com background
  $('.swiper-slide, .carousel-item, .banner, [class*="hero"], [class*="slide"], [class*="banner"]').each((i, el)=>{
    const s = norm($(el).attr('style'));
    const m = /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i.exec(s);
    const desktop = m && m[1] ? normalizeBannerPath(m[1]) : '';
    if (!desktop) return;
    if (items.some(it => it.src === desktop)) return;
    const mobileData = $(el).attr('data-bg-mobile') || $(el).attr('data-background-mobile');
    const mobile = normalizeBannerPath(mobileData || deriveMobile(desktop));
    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: '',
      href: '',
      title: norm($(el).attr('title')),
      text: '',
      order: items.length
    });
  });

  // Dedup por src
  const seen = new Set();
  const out = [];
  for (const it of items){
    if (it.src && !seen.has(it.src)){ seen.add(it.src); out.push(it); }
  }
  return out;
}

/** Reescreve os slides do index.html com base em content/banners.json (CRUD). */
export function buildSlidesFromCrud(siteDir){
  const idxPath = path.join(siteDir, 'index.html');
  const jsonPath= path.join(siteDir, 'content', 'banners.json');
  const html    = readFileUtf8(idxPath);
  if (!html) return;

  const $ = cheerio.load(html, { decodeEntities:false });
  const $wrap = $('section.banner .swiper .swiper-wrapper').first();
  if (!$wrap.length) return;

  let items = [];
  try {
    const raw = JSON.parse(readFileUtf8(jsonPath) || '{}');
    items = Array.isArray(raw.items) ? raw.items : [];
  } catch { items = []; }

  // Normaliza e ordena
  const normItems = items.map((it, i) => {
    const desktop = normalizeBannerPath(it.src || it.image || '');
    let mobile = normalizeBannerPath(it.mobileSrc || it.mobile || '');
    if (!mobile) mobile = normalizeBannerPath(deriveMobile(desktop));
    return {
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm(it.alt),
      href: norm(it.link || it.href),
      title: norm(it.title || it.text),
      order: Number(it.order ?? i) || 0
    };
  }).sort((a,b)=>a.order-b.order);

  // Reescreve o conteúdo
  $wrap.empty();
  normItems.forEach(it=>{
    const slide = `
      <div class="swiper-slide">
        <picture>
          ${it.mobileSrc ? `<source media="(max-width: 767px)" srcset="${it.mobileSrc}">` : ''}
          <img src="${it.src}" alt="${it.alt || ''}" class="banner-img">
        </picture>
      </div>`;
    $wrap.append(slide);
  });

  writeFileUtf8(idxPath, $.html());
  console.log(`🖼️ index.html atualizado com ${normItems.length} banner(s).`);
}


/* =========================================================
   🔗 URLS AMIGÁVEIS (GitHub Pages): categorias e produtos
========================================================= */
function ensureCleanDir(dir){
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    console.warn(`⚠️ Falha ao preparar pasta ${dir}: ${e.message}`);
  }
}

function injectBaseHref(html){
  if (!html || html.includes('<base href="/">')) return html;
  return html.replace(/<head(.*?)>/i, '<head$1>\n  <base href="/">');
}

function patchProdutoHtmlForFriendlyUrls(html){
  let out = injectBaseHref(html || '');

  out = out
    .replace(/fetch\('content\/products\.json'\)/g, "fetch('/content/products.json')")
    .replace(/fetch\('content\/seo\.json'\)/g, "fetch('/content/seo.json')")
    .replace(/<link rel="canonical" href="https:\/\/www\.qualitycel\.com\.br\/produto\.html">/g, '<link rel="canonical" href="https://www.qualitycel.com.br/produto/">')
    .replace(/<meta property="og:url" content="https:\/\/www\.qualitycel\.com\.br\/produto\.html">/g, '<meta property="og:url" content="https://www.qualitycel.com.br/produto/">');

  out = out.replace(
`const canonicalUrl = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(product.id);`,
`const productSlug = product.slug || product.id;
    const canonicalUrl = window.location.origin + '/produto/' + encodeURIComponent(productSlug) + '/';`
  );

  out = out.replace(
`item: window.location.origin + '/categoria.html?slug=' + encodeURIComponent(category)`,
`item: window.location.origin + '/' + encodeURIComponent(category) + '/'`
  );

  out = out.replace(
`const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const box = document.getElementById('produto-detalhe');`,
`const params = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const lastPath = pathParts[pathParts.length - 1] || '';
  const pathSlug = ['produto.html', 'index.html', 'produto'].includes(lastPath.toLowerCase()) ? '' : lastPath;
  const id = params.get('id') || params.get('slug') || pathSlug;
  const box = document.getElementById('produto-detalhe');`
  );

  out = out.replace(
`const product = (data.items || []).find(p => String(p.id) === String(id));`,
`const product = (data.items || []).find(p => String(p.id) === String(id) || String(p.slug || '') === String(id));`
  );

  return out;
}

function patchIndexFriendlyLinks(siteDir){
  const indexPath = path.join(siteDir, 'index.html');
  if (!fs.existsSync(indexPath)) return;

  let html = readFileUtf8(indexPath);
  html = html.replace(
    /<a href="produto\.html\?id=\$\{encodeURIComponent\(p\.id\)\}" class="btn btn-details">Ver detalhes<\/a>/g,
    '<a href="/produto/${encodeURIComponent(p.slug || p.id)}/" class="btn btn-details">Ver detalhes</a>'
  );

  writeFileUtf8(indexPath, html);
  console.log('✅ index.html atualizado para links de produtos amigáveis.');
}

export function generateFriendlyUrlPages(siteDir){
  try {
    const contentDir = path.join(siteDir, 'content');
    const categories = readJsonSafe(path.join(contentDir, 'categories.json'), { items: [] }).items || [];
    const products = readJsonSafe(path.join(contentDir, 'products.json'), { items: [] }).items || [];

    const header = readFileUtf8(path.join(siteDir, 'header.html'));
    const footer = readFileUtf8(path.join(siteDir, 'footer.html'));
    const produtoTemplate = patchProdutoHtmlForFriendlyUrls(readFileUtf8(path.join(siteDir, 'produto.html')));

    // Gera páginas físicas de categoria: /smartphones/index.html, /acessorios/index.html...
    categories
      .filter(c => c && c.slug)
      .forEach(c => {
        const slug = c.slug.toString().trim();
        if (!slug) return;

        const dir = path.join(siteDir, slug);
        ensureCleanDir(dir);
        let html = injectBaseHref(categoryPageHtml(header, footer));
        html = html.replace('<title>Categorias – Quality Celulares</title>', `<title>${escapeText(c.name || slug)} – Quality Celulares</title>`);
        html = html.replace('content="https://www.qualitycel.com.br/categoria.html"', `content="https://www.qualitycel.com.br/${encodeURIComponent(slug)}/"`);
        html = html.replace('href="https://www.qualitycel.com.br/categoria.html"', `href="https://www.qualitycel.com.br/${encodeURIComponent(slug)}/"`);
        writeFileUtf8(path.join(dir, 'index.html'), html);
      });

    // Gera páginas físicas de produto: /produto/slug/index.html
    const productRoot = path.join(siteDir, 'produto');
    if (!fs.existsSync(productRoot)) fs.mkdirSync(productRoot, { recursive: true });

    products
      .filter(p => p && p.active !== false && (p.slug || p.id))
      .forEach(p => {
        const slug = (p.slug || p.id).toString().trim();
        if (!slug) return;

        const dir = path.join(productRoot, slug);
        ensureCleanDir(dir);
        writeFileUtf8(path.join(dir, 'index.html'), produtoTemplate);
      });

    patchIndexFriendlyLinks(siteDir);

    console.log(`✅ URLs amigáveis geradas: ${categories.filter(c => c && c.slug).length} categoria(s) e ${products.filter(p => p && p.active !== false && (p.slug || p.id)).length} produto(s).`);
  } catch (e) {
    console.warn(`⚠️ Falha ao gerar URLs amigáveis: ${e.message}`);
  }
}
