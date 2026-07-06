// Aguarda DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("/header.html")
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
        corrigirLinksHomePreview();
        carregarCategoriasNoHeader();
        initHeaderEvents();
      });
  } else {
    // Em páginas geradas fisicamente, como /smartphones/ e /acessorios/,
    // o header já vem pronto no HTML. Então precisamos apenas ativar os eventos.
    initHeaderEvents();
  }

  // Carregar footer
  const footerContainer = document.getElementById("footer");
  if (footerContainer) {
    fetch("/footer.html")
      .then(res => res.text())
      .then(data => {
        footerContainer.innerHTML = data;
      });
  }

  // Iniciar carrossel de banners somente se existir Swiper na página
  initSwiper();
});

// ----------------------------
// Corrige links do preview local
// ----------------------------
function corrigirLinksHomePreview() {
  const isLocalPreview =
    window.location.hostname === "localhost" &&
    window.location.port === "3000";

  if (!isLocalPreview) return;

  document.querySelectorAll("[data-home-link]").forEach(link => {
    link.setAttribute("href", "/site/view/index.html");
  });
}

// ----------------------------
// Categorias dinâmicas no Header
// ----------------------------
function carregarCategoriasNoHeader() {
  fetch("/content/categories.json")
    .then(r => r.json())
    .then(data => {
      const categorias = data.items || [];
      const navDesktop = document.getElementById("nav-desktop");
      const navMobile = document.getElementById("nav-mobile");
      if (!navDesktop || !navMobile) return;

      navDesktop.querySelectorAll("a.cat-link").forEach(a => a.remove());
      navMobile.querySelectorAll("a.cat-link").forEach(a => a.remove());

      const searchWrapper = navDesktop.querySelector(".search-wrapper");

      categorias
        .filter(cat => cat && cat.slug)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .forEach(cat => {
          const nome = cat.name || cat.nome || cat.slug;
          const slug = encodeURIComponent(cat.slug);

          const linkD = document.createElement("a");
          linkD.href = `/${slug}/`;
          linkD.className = "cat-link";
          if (cat.icon && String(cat.icon).includes("fa-")) {
            const iconD = document.createElement("i");
            iconD.className = cat.icon;
            iconD.setAttribute("aria-hidden", "true");
            linkD.appendChild(iconD);
            linkD.appendChild(document.createTextNode(" "));
          }
          linkD.appendChild(document.createTextNode(nome));

          if (searchWrapper) navDesktop.insertBefore(linkD, searchWrapper);
          else navDesktop.appendChild(linkD);

          const linkM = document.createElement("a");
          linkM.href = `/${slug}/`;
          linkM.className = "cat-link";
          if (cat.icon && String(cat.icon).includes("fa-")) {
            const iconM = document.createElement("i");
            iconM.className = cat.icon;
            iconM.setAttribute("aria-hidden", "true");
            linkM.appendChild(iconM);
            linkM.appendChild(document.createTextNode(" "));
          }
          linkM.appendChild(document.createTextNode(nome));
          navMobile.appendChild(linkM);
        });
    })
    .catch(err => console.error("Erro ao carregar categorias:", err));
}

// ----------------------------
// Eventos do Header
// ----------------------------
function initHeaderEvents() {
  if (window.__qualityHeaderEventsReady) return;
  window.__qualityHeaderEventsReady = true;

  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("menu-overlay");

  const openMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
    overlay?.classList.add("active");
    overlay?.classList.add("show");
  };

  const closeMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    overlay?.classList.remove("active");
    overlay?.classList.remove("show");
  };

  menuToggle?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);

  document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // Busca desktop
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-button");

  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => doSearch(searchInput.value));
    searchInput.addEventListener("keypress", e => {
      if (e.key === "Enter") doSearch(searchInput.value);
    });
  }

  // Busca mobile
  const searchInputMob = document.getElementById("search-input-mobile");
  const searchBtnMob = document.getElementById("search-button-mobile");

  if (searchBtnMob && searchInputMob) {
    searchBtnMob.addEventListener("click", () => {
      doSearch(searchInputMob.value);
      closeMenu();
    });
    searchInputMob.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        doSearch(searchInputMob.value);
        closeMenu();
      }
    });
  }

  console.log("✅ Eventos do header inicializados");
}

// ----------------------------
// Busca no catálogo inteiro
// ----------------------------
function normalizeSearch(value) {
  return (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function showSearchMessage(text) {
  const noResults = document.getElementById("no-results");
  if (noResults) {
    noResults.textContent = text;
    noResults.style.display = "block";
  } else {
    alert(text);
  }
}

function doSearch(query) {
  const termo = normalizeSearch(query);
  if (termo && window.QualityAnalyticsTrack) window.QualityAnalyticsTrack("search", { term: termo });
  const productsOnPage = document.querySelectorAll(".product-card");
  const noResults = document.getElementById("no-results");

  if (!termo) {
    productsOnPage.forEach(p => (p.style.display = "flex"));
    if (noResults) noResults.style.display = "none";
    return;
  }

  // Primeiro tenta filtrar os produtos que já estão na tela atual
  let foundOnPage = false;
  if (productsOnPage.length) {
    productsOnPage.forEach(card => {
      const title = normalizeSearch(card.querySelector("h3")?.textContent || "");
      if (title.includes(termo)) {
        card.style.display = "flex";
        foundOnPage = true;
      } else {
        card.style.display = "none";
      }
    });

    if (foundOnPage) {
      if (noResults) noResults.style.display = "none";
      return;
    }
  }

  // Se não encontrou na página, procura no catálogo inteiro e redireciona
  Promise.all([
    fetch("/content/products.json").then(r => r.json()).catch(() => ({ items: [] })),
    fetch("/content/categories.json").then(r => r.json()).catch(() => ({ items: [] }))
  ]).then(([productsData, categoriesData]) => {
    const produtos = productsData.items || [];
    const categorias = categoriesData.items || [];

    const produto = produtos.find(p => {
      if (!p || p.active === false) return false;
      const name = normalizeSearch(p.name || p.nome || "");
      const slug = normalizeSearch(p.slug || "");
      return name.includes(termo) || slug.includes(termo);
    });

    if (produto) {
      const slug = produto.slug || produto.id;
      window.location.href = `/produto/${encodeURIComponent(slug)}/`;
      return;
    }

    const categoria = categorias.find(c => {
      const name = normalizeSearch(c.name || c.nome || "");
      const slug = normalizeSearch(c.slug || "");
      return name.includes(termo) || slug.includes(termo);
    });

    if (categoria && categoria.slug) {
      window.location.href = `/${encodeURIComponent(categoria.slug)}/`;
      return;
    }

    showSearchMessage("Nenhum produto encontrado.");
  }).catch(() => {
    showSearchMessage("Erro ao buscar produto.");
  });
}

// ----------------------------
// Swiper - Carrossel de Banners
// ----------------------------
function initSwiper() {
  if (typeof Swiper === "undefined") return;
  if (!document.querySelector(".swiper")) return;

  new Swiper(".swiper", {
    loop: true,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
    effect: "slide",
  });
}


/* =========================================================
   Quality V8.3.2 - Analytics Lite (coleta real no site)
   Registra: páginas, categorias, produtos, favoritos,
   WhatsApp, compartilhar e buscas.
========================================================= */
(function(){
  if (window.__qualityAnalyticsLiteReady) return;
  window.__qualityAnalyticsLiteReady = true;

  const TRACK_URL = '/analytics/track';
  const sentOnce = new Set();

  function safeText(value, max){
    return String(value || '').trim().slice(0, max || 180);
  }

  function normalizeSlug(value){
    return safeText(value, 140)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getDevice(){
    const w = window.innerWidth || 0;
    if (w <= 767) return 'mobile';
    if (w <= 1024) return 'tablet';
    return 'desktop';
  }

  function basePayload(extra){
    return Object.assign({
      url: window.location.href,
      referrer: document.referrer || '',
      device: getDevice(),
      viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
      language: navigator.language || ''
    }, extra || {});
  }

  function track(type, payload, options){
    try {
      if (!type) return;
      const body = basePayload(Object.assign({ type }, payload || {}));
      const dedupeKey = options && options.once ? type + ':' + JSON.stringify(payload || {}) : '';
      if (dedupeKey) {
        if (sentOnce.has(dedupeKey)) return;
        sentOnce.add(dedupeKey);
      }

      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function(){});
    } catch (_) {}
  }

  window.QualityAnalyticsTrack = track;

  function productFromElement(el){
    const holder = el && el.closest ? (el.closest('[data-quality-fav], [data-quality-share], .produto-card, .product-card, .quality-product-card, #produto-detalhe, .produto-info') || el) : document;
    const btn = el && el.getAttribute ? el : null;
    const slug =
      btn?.getAttribute('data-slug') ||
      holder?.getAttribute?.('data-slug') ||
      normalizeSlug((window.location.pathname.match(/\/produto\/([^/]+)/) || [])[1] || '');
    const id =
      btn?.getAttribute('data-id') ||
      holder?.getAttribute?.('data-id') ||
      slug;
    const name =
      btn?.getAttribute('data-name') ||
      holder?.getAttribute?.('data-name') ||
      holder?.querySelector?.('h1,h2,h3')?.textContent ||
      document.querySelector('#produto-detalhe h1, .produto-info h1, h1, h3')?.textContent ||
      slug ||
      'Produto';
    const image =
      btn?.getAttribute('data-image') ||
      holder?.getAttribute?.('data-image') ||
      holder?.querySelector?.('img')?.getAttribute('src') ||
      document.querySelector('#produto-detalhe img, .produto-card img, .product-card img')?.getAttribute('src') ||
      '';
    const url =
      btn?.getAttribute('data-url') ||
      holder?.getAttribute?.('data-url') ||
      (slug ? ('/produto/' + encodeURIComponent(slug) + '/') : window.location.href);

    return { id: safeText(id,120), slug: safeText(slug || id,120), name: safeText(name,140), image: safeText(image,260), url: safeText(url,300) };
  }

  function detectInitialPage(){
    const path = window.location.pathname;

    track('page_view', {}, { once: true });

    const productMatch = path.match(/\/produto\/([^/]+)/);
    if (productMatch) {
      setTimeout(function(){
        const product = productFromElement(document.querySelector('#produto-detalhe') || document.body);
        product.slug = product.slug || normalizeSlug(productMatch[1]);
        track('product_view', { product, slug: product.slug, name: product.name }, { once: true });
      }, 900);
      return;
    }

    const ignored = new Set(['', 'site', 'view', 'index.html', 'header.html', 'footer.html', 'content', 'images', 'js', 'css']);
    const clean = path.replace(/^\/+|\/+$/g, '');
    const first = clean.split('/')[0] || '';
    if (first && !ignored.has(first) && !path.includes('.')) {
      const title = document.querySelector('#categoria-titulo, h1')?.textContent || first;
      track('category_view', {
        slug: normalizeSlug(first),
        category: { slug: normalizeSlug(first), name: safeText(title,100), url: window.location.href }
      }, { once: true });
    }
  }

  document.addEventListener('click', function(ev){
    const fav = ev.target.closest && ev.target.closest('[data-quality-fav], .quality-favorite-btn');
    if (fav) {
      const product = productFromElement(fav);
      setTimeout(function(){
        track('favorite', { product, slug: product.slug, name: product.name });
      }, 80);
      return;
    }

    const share = ev.target.closest && ev.target.closest('[data-quality-share], .quality-share-btn');
    if (share) {
      const product = productFromElement(share);
      track('share_click', { product, slug: product.slug, name: product.name });
      return;
    }

    const link = ev.target.closest && ev.target.closest('a[href]');
    if (link) {
      const href = link.getAttribute('href') || '';
      if (/wa\.me|api\.whatsapp\.com|whatsapp/i.test(href)) {
        const product = productFromElement(link);
        track('whatsapp_click', { product, slug: product.slug, name: product.name });
      }
    }
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectInitialPage);
  } else {
    detectInitialPage();
  }
})();
