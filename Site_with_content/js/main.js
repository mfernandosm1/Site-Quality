// Aguarda DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("/header.html")
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
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
