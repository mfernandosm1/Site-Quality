// Aguarda DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
  console.log("📂 DOM carregado, iniciando fetch de header/footer...");

  // Carregar header
  const headerContainer = document.getElementById("header");
  if (headerContainer) {
    fetch("header.html")
      .then(res => {
        console.log("🔎 Resposta header:", res);
        if (!res.ok) throw new Error("Não conseguiu carregar header.html");
        return res.text();
      })
      .then(data => {
        headerContainer.innerHTML = data;
        console.log("✅ Header carregado com sucesso");
        initHeaderEvents(); // ativa eventos assim que header carrega
      })
      .catch(err => console.error("❌ Erro ao carregar header:", err));
  }

  // Carregar footer
  const footerContainer = document.getElementById("footer");
  if (footerContainer) {
    fetch("footer.html")
      .then(res => {
        console.log("🔎 Resposta footer:", res);
        if (!res.ok) throw new Error("Não conseguiu carregar footer.html");
        return res.text();
      })
      .then(data => {
        footerContainer.innerHTML = data;
        console.log("✅ Footer carregado com sucesso");
      })
      .catch(err => console.error("❌ Erro ao carregar footer:", err));
  }

  // Iniciar carrossel de banners
  initSwiper();
});

// ----------------------------
// Eventos do Header
// ----------------------------
function initHeaderEvents() {
  // dá um pequeno atraso para garantir que os elementos foram injetados
  setTimeout(() => {
    const menuToggle = document.getElementById("menu-toggle");
    const menuClose = document.getElementById("menu-close");
    const mobileMenu = document.getElementById("mobile-menu");

    if (!menuToggle || !menuClose || !mobileMenu) {
      console.warn("⚠️ Elementos do menu mobile não encontrados ainda.");
      return;
    }

    console.log("✅ Eventos do header inicializados");

    // abrir menu
    menuToggle.addEventListener("click", () => {
      console.log("👉 Clicou para abrir o menu mobile");
      mobileMenu.style.transform = "translateX(0)";
      mobileMenu.setAttribute("aria-hidden", "false");
    });

    // fechar menu
    menuClose.addEventListener("click", () => {
      console.log("👉 Clicou para fechar o menu mobile");
      mobileMenu.style.transform = "translateX(-100%)";
      mobileMenu.setAttribute("aria-hidden", "true");
    });

    // fechar ao clicar em qualquer link
    document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
      link.addEventListener("click", () => {
        console.log("👉 Clicou em um link, fechando menu mobile");
        mobileMenu.style.transform = "translateX(-100%)";
        mobileMenu.setAttribute("aria-hidden", "true");
      });
    });

    // busca desktop
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-button");
    searchBtn?.addEventListener("click", () => {
      console.log("🔍 Busca desktop:", searchInput.value);
      doSearch(searchInput.value);
    });

    // busca mobile
    const searchInputMob = document.getElementById("search-input-mobile");
    const searchBtnMob = document.getElementById("search-button-mobile");
    searchBtnMob?.addEventListener("click", () => {
      console.log("🔍 Busca mobile:", searchInputMob.value);
      doSearch(searchInputMob.value);
      mobileMenu.style.transform = "translateX(-100%)";
      mobileMenu.setAttribute("aria-hidden", "true");
    });
  }, 100);
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
