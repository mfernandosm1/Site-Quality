// ----------------------------
// Função utilitária: carrega fragmentos HTML
// ----------------------------
async function loadFragment(containerId, url, afterLoad) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const bust = `cb=${Date.now()}`;
    const sep = url.includes("?") ? "&" : "?";
    const finalUrl = `${url}${sep}${bust}`;

    console.log(`🛰️ Carregando: ${finalUrl}`);
    const res = await fetch(finalUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} retornou ${res.status}`);

    const html = await res.text();
    container.innerHTML = html;
    console.log(`✅ ${url} carregado em #${containerId}`);

    if (afterLoad) afterLoad(); // roda callback se houver
  } catch (err) {
    console.error(`❌ Erro ao carregar ${url}:`, err);
  }
}

// ----------------------------
// Inicialização principal
// ----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Header só ativa eventos DEPOIS do fetch
  loadFragment("header", "header.html", initHeaderEvents);
  loadFragment("footer", "footer.html");

  // Swiper banners
  initSwiper();
});

// ----------------------------
// Eventos do Header (menu/busca)
// ----------------------------
function initHeaderEvents() {
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileMenu = document.getElementById("mobile-menu");

  if (!menuToggle || !menuClose || !mobileMenu) {
    console.warn("⚠️ IDs do header não encontrados no DOM");
    return;
  }

  // abrir menu
  menuToggle.addEventListener("click", () => {
    mobileMenu.style.transform = "translateX(0)";
    mobileMenu.setAttribute("aria-hidden", "false");
  });

  // fechar menu
  menuClose.addEventListener("click", () => {
    mobileMenu.style.transform = "translateX(-100%)";
    mobileMenu.setAttribute("aria-hidden", "true");
  });

  // fechar ao clicar em link
  document.querySelectorAll("#mobile-menu .mobile-nav a").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.style.transform = "translateX(-100%)";
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
    mobileMenu.style.transform = "translateX(-100%)";
    mobileMenu.setAttribute("aria-hidden", "true");
  });

  console.log("✅ Eventos do header inicializados");
}

// ----------------------------
// Busca simples nos produtos
// ----------------------------
function doSearch(query) {
  const products = document.querySelectorAll(".product-card");
  const noResults = document.getElementById("no-results");
  const text = (query || "").trim().toLowerCase();

  if (!text) {
    products.forEach(p => (p.style.display = "flex"));
    if (noResults) noResults.style.display = "none";
    return;
  }

  let found = 0;
  products.forEach(card => {
    const title = (card.querySelector("h3")?.textContent || "").toLowerCase();
    const match = title.includes(text);
    card.style.display = match ? "flex" : "none";
    if (match) found++;
  });

  if (noResults) noResults.style.display = found ? "none" : "block";
}

// ----------------------------
// Swiper Banners
// ----------------------------
function initSwiper() {
  if (typeof Swiper === "undefined") {
    console.warn("⚠️ Swiper não encontrado");
    return;
  }
  new Swiper(".swiper", {
    loop: true,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
  });
}
