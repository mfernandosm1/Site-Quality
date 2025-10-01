// Aguarda DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("header.html")
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
        initHeaderEvents(); // ativa eventos assim que header carrega
      });
  }

  // Carregar footer
  const footerContainer = document.getElementById("footer");
  if (footerContainer) {
    fetch("footer.html")
      .then(res => res.text())
      .then(data => {
        footerContainer.innerHTML = data;
      });
  }

  // Iniciar carrossel de banners
  initSwiper();
});

// ----------------------------
// Funções de abrir/fechar menu
// ----------------------------
function openMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenu) {
    mobileMenu.classList.add("open");
    mobileMenu.setAttribute("aria-hidden", "false");
  }
}

function closeMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  if (mobileMenu) {
    mobileMenu.classList.remove("open");
    mobileMenu.setAttribute("aria-hidden", "true");
  }
}

// ----------------------------
// Eventos do Header
// ----------------------------
function initHeaderEvents() {
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mobile-menu");

  if (!menuToggle || !menuClose || !mobileMenu) {
    console.warn("⚠️ Elementos do menu mobile não encontrados ainda.");
    return;
  }

  // abrir/fechar menu
  menuToggle.addEventListener("click", openMenu);
  menuClose.addEventListener("click", closeMenu);

  // fechar ao clicar em qualquer link
  document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  // busca desktop
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-button");
  searchBtn?.addEventListener("click", () => {
    doSearch(searchInput.value);
  });
  searchInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      doSearch(searchInput.value);
    }
  });

  // busca mobile
  const searchInputMob = document.getElementById("search-input-mobile");
  const searchBtnMob = document.getElementById("search-button-mobile");
  searchBtnMob?.addEventListener("click", () => {
    doSearch(searchInputMob.value);
    closeMenu();
  });
  searchInputMob?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      doSearch(searchInputMob.value);
      closeMenu();
    }
  });

  console.log("✅ Eventos do header inicializados");
}

// ----------------------------
// Lógica de busca simples
// ----------------------------
function doSearch(query) {
  const products = document.querySelectorAll(".product-card");
  const noResults = document.getElementById("no-results");

  if (!query || query.trim() === "") {
    products.forEach(p => (p.style.display = "flex"));
    noResults.style.display = "none";
    return;
  }

  let found = false;
  products.forEach(card => {
    const title = card.querySelector("h3").textContent.toLowerCase();
    if (title.includes(query.toLowerCase())) {
      card.style.display = "flex";
      found = true;
    } else {
      card.style.display = "none";
    }
  });

  noResults.style.display = found ? "none" : "block";
}

// ----------------------------
// Swiper - Carrossel de Banners
// ----------------------------
function initSwiper() {
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
