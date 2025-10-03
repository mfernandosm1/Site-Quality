// js/main.js

// ----------------------------
// Boot
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("header.html")
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
        initHeaderEvents();
        loadSettings(); // aplica logo, menu, cores
      })
      .catch(err => console.warn("Não foi possível carregar header.html:", err));
  }

  // Carregar footer
  const footerContainer = document.getElementById("footer");
  if (footerContainer) {
    fetch("footer.html")
      .then(res => res.text())
      .then(data => {
        footerContainer.innerHTML = data;
        loadSettings(); // aplica footer dinâmico
      })
      .catch(err => console.warn("Não foi possível carregar footer.html:", err));
  }

  // Banners (apenas se a estrutura existir na página)
  if (document.getElementById("banner-slides")) {
    loadBanners();
  }

  // Vitrine do index (apenas se existir o container)
  if (document.getElementById("products-destaque")) {
    loadDestaques();
  }
});

// ----------------------------
// Eventos do Header / Mobile
// ----------------------------
function initHeaderEvents() {
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mobile-menu");
  const overlay = document.getElementById("menu-overlay");

  if (!menuToggle || !menuClose || !mobileMenu) return;

  const openMenu = () => {
    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
    if (overlay) overlay.classList.add("active");
  };

  const closeMenu = () => {
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
    if (overlay) overlay.classList.remove("active");
  };

  menuToggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);

  // Fecha ao clicar em link do menu mobile
  document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // Busca (se existir no header)
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-button");
  searchBtn?.addEventListener("click", () => doSearch(searchInput?.value || ""));
  searchInput?.addEventListener("keypress", e => {
    if (e.key === "Enter") doSearch(searchInput.value);
  });

  // Busca mobile (se existir)
  const searchInputMob = document.getElementById("search-input-mobile");
  const searchBtnMob = document.getElementById("search-button-mobile");
  searchBtnMob?.addEventListener("click", () => {
    doSearch(searchInputMob?.value || "");
    closeMenu();
  });
  searchInputMob?.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      doSearch(searchInputMob.value);
      closeMenu();
    }
  });
}

// ----------------------------
// Settings (cores, header, footer, banners)
// ----------------------------
function loadSettings() {
  fetch("data/settings.json")
    .then(res => res.json())
    .then(settings => {
      if (!settings) return;

      // Variáveis de cor (se quiser usar no CSS via var(--cor-...))
      const root = document.documentElement;
      if (settings.cores) {
        root.style.setProperty("--cor-primaria", settings.cores.primaria || "#c90000");
        root.style.setProperty("--cor-secundaria", settings.cores.secundaria || "#222222");
        root.style.setProperty("--cor-fundo", settings.cores.fundo || "#ffffff");
        root.style.setProperty("--cor-texto", settings.cores.texto || "#000000");
      }

      // Logo
      const siteLogo = document.getElementById("site-logo");
      const siteLogoMobile = document.getElementById("site-logo-mobile");
      if (siteLogo && settings.logo) siteLogo.src = settings.logo;
      if (siteLogoMobile && settings.logo) siteLogoMobile.src = settings.logo;

      // Header: cor de fundo
      const headerEl = document.querySelector(".header");
      if (headerEl && settings.cores?.primaria) {
        headerEl.style.backgroundColor = settings.cores.primaria;
      }

      // Menu Desktop & Mobile
      const navDesktop = document.getElementById("nav-desktop");
      const navMobile = document.getElementById("nav-mobile");
      if (settings.menu && Array.isArray(settings.menu)) {
        const buildMenuHtml = (arr) =>
          arr.map(item => `<a href="${item.link}">${item.texto}</a>`).join("");
        if (navDesktop) navDesktop.innerHTML = buildMenuHtml(settings.menu);
        if (navMobile) navMobile.innerHTML = buildMenuHtml(settings.menu);
      }

      // Footer (texto, cnpj, links, ícones)
      const footerTexto = document.getElementById("footer-texto");
      const footerCnpj = document.getElementById("footer-cnpj");
      const footerSocials = document.getElementById("footer-socials");
      const footerLinks = document.getElementById("footer-links");

      if (footerTexto && settings.footer?.texto) footerTexto.textContent = settings.footer.texto;
      if (footerCnpj && settings.footer?.cnpj) footerCnpj.textContent = "CNPJ: " + settings.footer.cnpj;

      // Links do footer
      if (footerLinks && settings.footer?.links && Array.isArray(settings.footer.links)) {
        footerLinks.innerHTML = settings.footer.links
          .map(l => `<a href="${l.link}">${l.texto}</a>`)
          .join("");
      }

      // Ícones sociais do footer
      if (footerSocials && settings.footer?.icones) {
        const iconMap = {
          facebook: "fa-brands fa-facebook-f",
          instagram: "fa-brands fa-instagram",
          tiktok: "fa-brands fa-tiktok",
          whatsapp: "fa-brands fa-whatsapp",
          location: "fa-solid fa-location-dot"
        };
        footerSocials.innerHTML = "";
        Object.entries(settings.footer.icones).forEach(([nome, url]) => {
          if (!url || !url.trim()) return;
          const iconClass = iconMap[nome] || "fa-solid fa-link";
          const extraClass = nome; // para hovers específicos no seu CSS (ex.: .facebook, .instagram)
          footerSocials.innerHTML += `
            <a href="${url}" class="${extraClass}" aria-label="${nome}" target="_blank">
              <i class="${iconClass}"></i>
            </a>
          `;
        });
      }
    })
    .catch(err => console.warn("Erro ao carregar data/settings.json:", err));
}

// ----------------------------
// Páginas estáticas (Sobre, Formas, etc.)
// ----------------------------
function loadStaticPage(pageKey) {
  fetch("data/settings.json")
    .then(res => res.json())
    .then(settings => {
      const page = settings?.paginas?.[pageKey];
      const titleEl = document.getElementById("page-title");
      const contentEl = document.getElementById("page-content");

      if (!page) {
        if (titleEl) titleEl.textContent = "Conteúdo indisponível";
        if (contentEl) contentEl.innerHTML = "<p>Não foi possível carregar esta página.</p>";
        return;
      }
      if (titleEl) titleEl.textContent = page.titulo || "";
      if (contentEl) contentEl.innerHTML = page.conteudo || "";
    })
    .catch(err => {
      console.error("Erro ao carregar settings.json:", err);
      const c = document.getElementById("page-content");
      if (c) c.innerHTML = "<p>Não foi possível carregar o conteúdo.</p>";
    });
}

// ----------------------------
// Banners (Home)
// ----------------------------
function loadBanners() {
  fetch("data/settings.json")
    .then(res => res.json())
    .then(settings => {
      const slidesEl = document.getElementById("banner-slides");
      if (!slidesEl || !settings?.banners) return;

      slidesEl.innerHTML = settings.banners.map(b => `
        <div class="swiper-slide">
          <picture>
            <source media="(max-width: 767px)" srcset="${b.mobile}"/>
            <img src="${b.desktop}" alt="Banner" class="banner-img"/>
          </picture>
        </div>
      `).join("");

      // Inicia Swiper
      new Swiper(".swiper", {
        loop: true,
        autoplay: { delay: 5000, disableOnInteraction: false },
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev",
        },
        effect: "slide",
      });
    })
    .catch(err => console.warn("Erro ao carregar banners de settings.json:", err));
}

// ----------------------------
// Produtos em destaque (Home)
// ----------------------------
function loadDestaques() {
  fetch("data/products.json")
    .then(res => res.json())
    .then(products => {
      const container = document.getElementById("products-destaque");
      const noResults = document.getElementById("no-results-destaque");
      if (!container) return;

      const destaques = products.filter(p => p.destaque === true);
      if (!destaques.length) {
        if (noResults) noResults.style.display = "block";
        return;
      }

      container.innerHTML = destaques.map(p => `
        <div class="product-card">
          <img src="${(p.imagens && p.imagens[0]) || 'images/placeholder.png'}" alt="${p.nome}" />
          <h3>${p.nome}</h3>
          <a href="produto.html?id=${p.id}" class="btn-whatsapp">
            <i class="fa fa-eye"></i> Ver detalhes
          </a>
        </div>
      `).join("");
    })
    .catch(err => console.warn("Erro ao carregar data/products.json:", err));
}

// ----------------------------
// Listagem por categoria (usado por categoria.html)
// ----------------------------
function loadProducts(categoria, containerId, noResultsId) {
  fetch("data/products.json")
    .then(res => res.json())
    .then(products => {
      const container = document.getElementById(containerId);
      const noResults = document.getElementById(noResultsId);
      if (!container) return;

      const filtered = products.filter(p => p.categoria === categoria);
      if (!filtered.length) {
        if (noResults) noResults.style.display = "block";
        return;
      }

      container.innerHTML = filtered.map(p => `
        <div class="product-card">
          <img src="${(p.imagens && p.imagens[0]) || 'images/placeholder.png'}" alt="${p.nome}" />
          <h3>${p.nome}</h3>
          <a href="produto.html?id=${p.id}" class="btn-whatsapp">
            <i class="fa fa-eye"></i> Ver detalhes
          </a>
        </div>
      `).join("");
    })
    .catch(err => console.warn("Erro ao carregar data/products.json:", err));
}

// ----------------------------
// Busca simples (filtra cards já renderizados)
// ----------------------------
function doSearch(query) {
  const products = document.querySelectorAll(".product-card");
  const noResultsEls = [
    document.getElementById("no-results"),
    document.getElementById("no-results-destaque"),
    document.getElementById("no-results-smartphones"),
    document.getElementById("no-results-acessorios"),
    document.getElementById("no-results-categoria")
  ].filter(Boolean);

  if (!products.length) return;

  const q = (query || "").trim().toLowerCase();
  if (!q) {
    products.forEach(p => (p.style.display = "flex"));
    noResultsEls.forEach(el => (el.style.display = "none"));
    return;
  }

  let found = 0;
  products.forEach(card => {
    const title = (card.querySelector("h3")?.textContent || "").toLowerCase();
    if (title.includes(q)) {
      card.style.display = "flex";
      found++;
    } else {
      card.style.display = "none";
    }
  });

  noResultsEls.forEach(el => (el.style.display = found ? "none" : "block"));
}
