import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {items:[]}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }

function slugify(s){
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';
}

function uniqueSlug(base, items = [], excludeId = null){
  const cleanBase = slugify(base || 'categoria');
  let slug = cleanBase;
  let i = 2;
  const used = new Set(
    (items || [])
      .filter(it => Number(it.id) !== Number(excludeId))
      .map(it => String(it.slug || '').trim().toLowerCase())
      .filter(Boolean)
  );
  while (used.has(slug)) {
    slug = `${cleanBase}-${i}`;
    i++;
  }
  return slug;
}

function removeCategoryHtmlFiles(siteDir){
  try {
    if (!siteDir || !fs.existsSync(siteDir)) return 0;
    let removed = 0;
    for (const f of fs.readdirSync(siteDir)) {
      if (/^categoria[-_].+\.html$/i.test(f)) {
        fs.unlinkSync(path.join(siteDir, f));
        removed++;
      }
    }
    return removed;
  } catch (e) {
    console.warn(`⚠️ Falha ao remover arquivos antigos de categoria: ${e.message}`);
    return 0;
  }
}

function sortedCategories(items = []){
  return [...(items || [])].sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
}

function escapeAttr(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categorySeoTitle(cat){
  const name = String(cat?.name || cat?.slug || 'Categoria').trim();
  return String(cat?.seoTitle || `${name} – Quality Celulares`).trim();
}

function categorySeoDescription(cat){
  const name = String(cat?.name || cat?.slug || 'produtos').trim();
  return String(cat?.seoDescription || `Confira ${name} disponíveis na Quality Celulares. Atendimento pelo WhatsApp.`).trim();
}

function upsertHeadTag(html, regex, replacement){
  return regex.test(html) ? html.replace(regex, replacement) : html.replace('</head>', replacement + '\n</head>');
}

function generateIndividualCategoryPages(items = [], siteDir){
  try {
    const baseFile = path.join(siteDir, 'categoria.html');
    if (!fs.existsSync(baseFile)) return;
    const baseHtml = fs.readFileSync(baseFile, 'utf-8');
    sortedCategories(items).forEach(cat => {
      const slug = slugify(cat.slug || cat.name);
      if (!slug) return;
      const title = escapeAttr(categorySeoTitle(cat));
      const desc = escapeAttr(categorySeoDescription(cat));
      const url = `https://www.qualitycel.com.br/${slug}/`;
      let html = baseHtml;
      html = upsertHeadTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
      html = upsertHeadTag(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${desc}">`);
      html = upsertHeadTag(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}">`);
      html = upsertHeadTag(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${desc}">`);
      html = upsertHeadTag(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${url}">`);
      html = upsertHeadTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${url}">`);
      const dir = path.join(siteDir, slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
    });
  } catch (e) {
    console.warn(`⚠️ Falha ao gerar páginas SEO das categorias: ${e.message}`);
  }
}

function generateHeader(items = [], siteDir){
  const initialLinks = sortedCategories(items).map(cat => {
    const slug = slugify(cat.slug || cat.name);
    const name = String(cat.name || slug);
    const icon = String(cat.icon || '').trim();
    const iconHtml = icon ? `<i class="${icon}" aria-hidden="true"></i> ` : '';
    return `<a href="/${slug}/" class="cat-link">${iconHtml}${name}</a>`;
  }).join('');

  const html = `<header class="header">
  <div class="header-container">
    <a href="/site/view/index.html" class="logo-wrapper">
      <img src="/site/images/logo.png" alt="Quality Celulares" class="logo">
    </a>

    <nav class="nav-desktop" id="nav-desktop">
      <a href="/site/view/index.html">Início</a>
      ${initialLinks}
      <div class="search-wrapper">
        <input type="text" id="search-input" placeholder="Buscar...">
        <button id="search-button" aria-label="Buscar"><i class="fa fa-search"></i></button>
      </div>
    </nav>

    <button id="menu-toggle" class="menu-toggle" aria-label="Abrir menu">
      <i class="fa-solid fa-bars"></i>
    </button>
  </div>

  <div id="mobile-menu" class="mobile-menu" aria-hidden="true">
    <div class="mobile-menu-header">
      <a href="/site/view/index.html" class="logo-wrapper">
        <img src="/site/images/logo.png" alt="Quality Celulares" class="logo">
      </a>
      <button id="menu-close" class="menu-close" aria-label="Fechar menu">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="search-wrapper-mobile">
      <input type="text" id="search-input-mobile" placeholder="Buscar...">
      <button id="search-button-mobile" aria-label="Buscar"><i class="fa fa-search"></i></button>
    </div>

    <nav class="mobile-nav" id="nav-mobile">
      <a href="/site/view/index.html">Início</a>
      ${initialLinks}
    </nav>
  </div>

  <div id="menu-overlay" class="menu-overlay"></div>
</header>

<script>
(function(){
  function escapeHtml(value){
    return (value || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    fetch('/site/content/categories.json')
      .then(r => r.json())
      .then(data => {
        const categorias = data.items || [];
        const navDesktop = document.getElementById('nav-desktop');
        const navMobile = document.getElementById('nav-mobile');
        if (!navDesktop || !navMobile) return;

        navDesktop.querySelectorAll('a.cat-link').forEach(a => a.remove());
        navMobile.querySelectorAll('a.cat-link').forEach(a => a.remove());

        const searchWrapper = navDesktop.querySelector('.search-wrapper');

        categorias
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
          .forEach(cat => {
            const slug = encodeURIComponent(cat.slug || cat.name || 'categoria');
            const icon = (cat.icon || '').toString().trim();

            const linkD = document.createElement('a');
            linkD.href = '/' + slug + '/';
            linkD.className = 'cat-link';
            if (icon && icon.includes('fa-')) {
              const iconD = document.createElement('i');
              iconD.className = icon;
              iconD.setAttribute('aria-hidden', 'true');
              linkD.appendChild(iconD);
              linkD.appendChild(document.createTextNode(' '));
            }
            linkD.appendChild(document.createTextNode(cat.name || cat.slug || 'Categoria'));
            if (searchWrapper) navDesktop.insertBefore(linkD, searchWrapper);
            else navDesktop.appendChild(linkD);

            const linkM = document.createElement('a');
            linkM.href = '/' + slug + '/';
            linkM.className = 'cat-link';
            if (icon && icon.includes('fa-')) {
              const iconM = document.createElement('i');
              iconM.className = icon;
              iconM.setAttribute('aria-hidden', 'true');
              linkM.appendChild(iconM);
              linkM.appendChild(document.createTextNode(' '));
            }
            linkM.appendChild(document.createTextNode(cat.name || cat.slug || 'Categoria'));
            navMobile.appendChild(linkM);
          });
      })
      .catch(err => console.error('Erro ao carregar categorias:', err));
  });
})();
</script>`;

  fs.writeFileSync(path.join(siteDir, 'header.html'), html, 'utf-8');
}

function generateCategoryPage(siteDir){
  const html = `<!DOCTYPE html>
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
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-9HPD9XCELH"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-9HPD9XCELH');
  </script>
</head>
<body>
<div id="header"></div>

<main class="main">
  <h1 id="categoria-titulo" style="text-align:center;margin-top:30px;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;">Categoria</h1>
  <div id="produtos-container" class="products" style="margin-top:40px;"></div>
  <p id="no-results" class="em-breve" style="display:none;text-align:center;margin-top:20px;">Nenhum produto encontrado.</p>
</main>

<div id="footer"></div>
<script src="/js/main.js"></script>
<script>
(function(){
  function normalizeText(v){
    return (v || '').toString()
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .trim()
      .toLowerCase();
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

  function assetUrl(path){
    const p = (path || '').toString().trim();
    if (!p) return '/images/sem-imagem.png';
    if (/^https?:\\/\\//i.test(p)) return p;
    const clean = p.replace(/^\\/+/, '').replace(/^site\\//, '');
    const isLocalPreview = window.location.hostname === 'localhost' && window.location.port === '3000';
    return isLocalPreview ? '/site/' + clean : '/' + clean;
  }

  function fetchJson(paths){
    let lastError = null;
    return paths.reduce(function(promise, url){
      return promise.catch(function(){
        return fetch(url, { cache: 'no-store' }).then(function(res){
          if (!res.ok) throw new Error('Falha ao carregar ' + url);
          return res.json();
        }).catch(function(err){
          lastError = err;
          throw err;
        });
      });
    }, Promise.reject()).catch(function(){
      if (lastError) throw lastError;
      throw new Error('Arquivo JSON não encontrado.');
    });
  }

  function normalizeIcon(icon){
    icon = (icon || '').toString().trim();
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
    const noResults = document.getElementById('no-results');
    if (noResults) {
      noResults.textContent = text;
      noResults.style.display = 'block';
    }
  }

  function shouldShowVariationsOnCard(p){
    const raw = p.showVariationsOnCard ?? p.mostrarVariacoesNoCard ?? p.show_variations_on_card ?? false;
    if (raw === true) return true;
    const v = String(raw || '').toLowerCase();
    return v === 'sim' || v === 'yes' || v === 'true' || v === '1' || v === 'on';
  }

  function productVariationsCardHtml(p){
    if (!shouldShowVariationsOnCard(p)) return '';
    const v = p.variations || {};
    const lines = function(value){
      return Array.isArray(value)
        ? value.map(function(x){ return (x || '').toString().trim(); }).filter(Boolean)
        : (value || '').toString().split(/\\r?\\n|,/).map(function(x){ return x.trim(); }).filter(Boolean);
    };

    const colorItems = Array.isArray(v.colors)
      ? v.colors.map(function(c){ return { name: (c.name || '').trim(), hex: (c.hex || '').trim() }; }).filter(function(c){ return c.name; })
      : lines(v.colorsText).map(function(line){
          const parts = line.split('|').map(function(x){ return x.trim(); });
          return { name: parts[0] || '', hex: parts[1] || '' };
        }).filter(function(c){ return c.name; });

    const combos = Array.isArray(v.combinations)
      ? v.combinations
      : lines(v.combinationsText).map(function(line){
          const parts = line.split('|').map(function(x){ return x.trim(); });
          return { color: parts[0] || '', storage: parts[1] || '', ram: parts[2] || '', condition: parts[3] || '' };
        });

    const storage = (Array.isArray(v.storage) ? v.storage : lines(v.storageText)).concat(combos.map(function(c){ return c.storage || ''; })).filter(Boolean);
    const ram = (Array.isArray(v.ram) ? v.ram : lines(v.ramText)).concat(combos.map(function(c){ return c.ram || ''; })).filter(Boolean);

    const unique = function(arr){ return Array.from(new Set(arr.map(function(x){ return (x || '').toString().trim(); }).filter(Boolean))); };
    const colorNames = unique(colorItems.map(function(c){ return c.name; })).slice(0, 6);
    const colors = colorNames.map(function(name){ return colorItems.find(function(c){ return c.name === name; }); }).filter(Boolean);
    const tags = unique(storage.concat(ram)).slice(0, 6);

    if (!colors.length && !tags.length) return '';

    const dots = colors.length
      ? '<div class="product-card-variation-colors">' + colors.map(function(c){
          const hex = /^#?[0-9a-f]{3,8}$/i.test(c.hex || '') ? (c.hex.charAt(0) === '#' ? c.hex : '#' + c.hex) : '';
          const style = hex ? ' style="background:' + escapeHtml(hex) + '"' : '';
          return '<span class="product-card-color-dot"' + style + ' title="' + escapeHtml(c.name) + '"></span>';
        }).join('') + '</div>'
      : '';

    const chips = tags.length
      ? '<div class="product-card-variation-tags">' + tags.map(function(opt){ return '<span>' + escapeHtml(opt) + '</span>'; }).join('') + '</div>'
      : '';

    return '<div class="product-card-variations">' + dots + chips + '</div>';
  }

  const params = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const lastPath = normalizeText(pathParts[pathParts.length - 1] || '');
  const pathSlug = ['categoria.html', 'index.html', 'site', 'view'].includes(lastPath) ? '' : lastPath;
  const currentSlug = normalizeText(params.get('slug') || params.get('cat') || pathSlug);
  const titleEl = document.getElementById('categoria-titulo');

  if (!currentSlug) {
    setCategoryTitle(titleEl, 'Categoria não encontrada', '');
    showMessage('Nenhuma categoria foi informada.');
    return;
  }

  Promise.all([
    fetchJson(['/content/categories.json', '/site/content/categories.json']).catch(function(){ return { items: [] }; }),
    fetchJson(['/content/products.json', '/site/content/products.json']).catch(function(){ return { items: [] }; })
  ]).then(function(results){
    const categoriesData = results[0];
    const productsData = results[1];

    const categories = categoriesData.items || [];
    const category = categories.find(function(c){
      return normalizeText(c.slug) === currentSlug ||
        normalizeText(c.name) === currentSlug ||
        normalizeText(c.id) === currentSlug;
    });

    const categoryName = category ? (category.name || category.slug || currentSlug) : currentSlug;
    const categoryNameLower = normalizeText(categoryName);
    const categorySlugLower = normalizeText(category ? category.slug : currentSlug);
    const categoryIdLower = normalizeText(category ? category.id : '');

    setCategoryTitle(titleEl, categoryName, category ? category.icon : '');
    const seoTitleText = category && category.seoTitle ? String(category.seoTitle).trim() : categoryName + ' – Quality Celulares';
    document.title = seoTitleText;

    const metaDescriptionText = category && category.seoDescription
      ? String(category.seoDescription).trim()
      : 'Confira ' + categoryName + ' disponíveis na Quality Celulares. Atendimento pelo WhatsApp.';
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
    setOg('og:title', seoTitleText);
    setOg('og:description', metaDescriptionText);
    setOg('og:url', categoryUrl);
    setOg('og:image', window.location.origin + '/images/logo.png');

    const products = (productsData.items || []).filter(function(p){
      if (p.active === false) return false;
      const values = [
        p.category,
        p.categoria,
        p.categorySlug,
        p.categoriaSlug,
        p.categoryId,
        p.categoriaId
      ].map(function(v){ return normalizeText(v); });

      return values.includes(currentSlug) ||
        values.includes(categorySlugLower) ||
        values.includes(categoryNameLower) ||
        (categoryIdLower && values.includes(categoryIdLower));
    });

    const container = document.getElementById('produtos-container');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '';
      showMessage('Nenhum produto nesta categoria ainda.');
      return;
    }

    const noResults = document.getElementById('no-results');
    if (noResults) noResults.style.display = 'none';
    container.innerHTML = '';

    products.forEach(function(p){
      const priceStr = shouldShowPrice(p) ? formatPrice(p.price ?? p.preco) : '';
      const productName = p.name || p.nome || '';
      const productImage = p.image || p.imagem || '';
      const whatsappText = encodeURIComponent('Olá! Vim através do site e tenho interesse em ' + (productName || 'produto'));
      const hasGallery = Array.isArray(p.gallery) && p.gallery.filter(Boolean).length > 0;
      const hasVideo = !!(p.youtube || p.youtubeUrl || p.video || p.videoUrl);
      const hasDescription = !!(p.description || p.descricao || p.desc || p.descriptionShort || p.descriptionLong);
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
        '<img src="' + escapeHtml(assetUrl(productImage)) + '" alt="' + escapeHtml(productName) + '">' +
        '<h3>' + escapeHtml(productName) + '</h3>' +
        productVariationsCardHtml(p) +
        (priceStr ? '<p>' + escapeHtml(priceStr) + '</p>' : '') +
        detalhesHTML +
        '<a href="https://wa.me/5555991407824?text=' + whatsappText + '" class="btn btn-whatsapp" target="_blank">' +
        '<i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp</a>';

      container.appendChild(card);
    });
  }).catch(function(err){
    console.error('Erro ao carregar categoria:', err);
    setCategoryTitle(titleEl, 'Erro ao carregar categoria', '');
    showMessage('Não foi possível carregar os produtos desta categoria.');
  });
})();
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(siteDir, 'categoria.html'), html, 'utf-8');
}
function rebuildCategoryStructure(items, siteDir){
  // V7.7: não reescreve mais categoria.html automaticamente.
  // O categoria.html agora é um arquivo fixo do site, para não perder melhorias
  // como etiquetas, cards, filtros e ajustes de SEO ao criar/editar categorias.
  // Mantemos apenas o header.html atualizado como compatibilidade/preview.
  generateHeader(items || [], siteDir);
  generateIndividualCategoryPages(items || [], siteDir);
}

// ====== LISTAR ======
router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const msg = req.query.saved ? '✅ Categoria salva com sucesso!' : null;
  res.render('categorias', { items: data.items || [], flash: msg });
});

// ====== ADICIONAR ======
router.post('/add', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];

  const name = (req.body.name||'').trim();
  if (!name) return res.redirect('/categorias?error=name');

  const slug = uniqueSlug(req.body.slug || name, data.items);
  const order = Number(req.body.order || data.items.length + 1);
  const icon = (req.body.icon || '').trim();
  const seoDescription = (req.body.seoDescription || '').trim();
  const newCat = { id: Date.now(), name, slug, order, icon, seoDescription };
  data.items.push(newCat);
  writeJson(file, data);

  try {
    rebuildCategoryStructure(data.items, SITE_DIR);
    console.log(`✅ Categoria "${name}" criada com sucesso (slug: ${slug}).`);
  } catch (err) {
    console.error('Erro ao atualizar estrutura de categorias:', err);
  }

  res.redirect('/categorias?saved=1');
});

// ====== ATUALIZAR ======
router.post('/update', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  data.items = data.items || [];
  const id = Number(req.body.id);
  const it = data.items.find(c=> Number(c.id)===id);

  if (it) {
    const newName = (req.body.name || it.name || '').trim();
    const slugInput = (req.body.slug || '').trim();

    it.name = newName;
    it.slug = uniqueSlug(slugInput || newName || it.slug, data.items, it.id);
    it.order = Number(req.body.order || it.order || 1);
    it.icon = (req.body.icon || '').trim();
    it.seoDescription = (req.body.seoDescription || '').trim();
  }

  writeJson(file, data);
  try { rebuildCategoryStructure(data.items, SITE_DIR); } catch(e){ console.error('Erro ao atualizar header/categoria.html:', e); }
  res.redirect('/categorias?saved=1');
});

// ====== EXCLUIR ======
router.post('/del', (req,res)=>{
  const paths = P(req.app);
  const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
  const CONTENT_DIR = paths.CONTENT_DIR;
  const file = path.join(CONTENT_DIR, 'categories.json');
  const data = readJson(file);
  const id = Number(req.body.id);

  data.items = (data.items||[]).filter(c=> Number(c.id)!==id);
  writeJson(file, data);

  try { rebuildCategoryStructure(data.items, SITE_DIR); } catch(e){ console.error('Erro ao atualizar header/categoria.html:', e); }

  res.redirect('/categorias?saved=1');
});

// ====== LIMPAR CATEGORIAS ANTIGAS E RECRIAR PÁGINA ÚNICA ======
router.post('/limpar', (req, res) => {
  try {
    const paths = P(req.app);
    const CONTENT_DIR = paths.CONTENT_DIR;
    const SITE_DIR = paths.SITE_DIR || paths.SITE_WITH_CONTENT || paths.SITE || paths.PUBLIC_DIR;
    const data = readJson(path.join(CONTENT_DIR, 'categories.json'));

    const removed = removeCategoryHtmlFiles(SITE_DIR);
    rebuildCategoryStructure(data.items || [], SITE_DIR);

    res.json({ success: true, removed });
  } catch (err) {
    console.error('Erro ao limpar categorias:', err);
    res.status(500).json({ success: false, error: 'internal_error' });
  }
});

export default router;
