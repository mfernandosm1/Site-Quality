// Aguarda DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("header.html")
      .then(res => res.text())
      .then(data => {
        headerContainer.innerHTML = data;
        initHeaderEvents(); // ativa eventos depois que header carrega
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
// Eventos do Header
// ----------------------------
function initHeaderEvents() {
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mobile-menu");

  // abrir menu
  menuToggle?.addEventListener("click", () => {
    mobileMenu.style.transform = "translateX(0)";
    mobileMenu.setAttribute("aria-hidden", "false");
  });

  // fechar menu
  menuClose?.addEventListener("click", () => {
    mobileMenu.style.transform = "translateX(100%)";
    mobileMenu.setAttribute("aria-hidden", "true");
  });

  // fechar ao clicar em qualquer link
  document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.style.transform = "translateX(100%)";
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  });

  // busca desktop
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-button");
  searchBtn?.addEventListener("click", () => {
    doSearch(searchInput.value);
  });

  // busca mobile
  const searchInputMob = document.getElementById("search-input-mobile");
  const searchBtnMob = document.getElementById("search-button-mobile");
  searchBtnMob?.addEventListener("click", () => {
    doSearch(searchInputMob.value);
    mobileMenu.style.transform = "translateX(100%)";
    mobileMenu.setAttribute("aria-hidden", "true");
  });
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
