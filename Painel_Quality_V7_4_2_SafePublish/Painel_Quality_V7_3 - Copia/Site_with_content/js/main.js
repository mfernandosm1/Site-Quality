// Quality Celulares - main.js (FINAL)

document.addEventListener("DOMContentLoaded", () => {
  // carrega header/footer se existir placeholder
  carregarHeader();
  carregarFooter();
  initSwiper();
  bindMenuDelegado(); // <- prende UMA vez e serve para todas as páginas
});

// ----------------------------
// Carregar Header / Footer
// ----------------------------
function carregarHeader() {
  const holder = document.getElementById("header");
  if (!holder) return;

  fetch("header.html", { cache: "no-store" })
    .then(r => r.text())
    .then(html => {
      holder.innerHTML = html;
      garantirOverlay(); // garante #menu-overlay presente
      console.log("✅ Header carregado");
    })
    .catch(err => console.error("❌ Erro ao carregar header:", err));
}

function carregarFooter() {
  const holder = document.getElementById("footer");
  if (!holder) return;

  fetch("footer.html", { cache: "no-store" })
    .then(r => r.text())
    .then(html => { holder.innerHTML = html; })
    .catch(err => console.error("❌ Erro ao carregar footer:", err));
}

// ----------------------------
// Delegação de eventos do menu (à prova de re-render)
// ----------------------------
let __menuBound = false;
function bindMenuDelegado() {
  if (__menuBound) return;
  __menuBound = true;

  garantirOverlay();

  document.addEventListener("click", (ev) => {
    const tgt = ev.target;

    // qualquer clique no botão hamburguer
    const abre = tgt.closest && tgt.closest("#menu-toggle");
    // clique no X, overlay, ou links do menu
    const fecha =
      (tgt.closest && (tgt.closest("#menu-close") || tgt.closest("#menu-overlay") || tgt.closest("#mobile-menu .mobile-nav a")));

    if (abre) {
      ev.preventDefault();
      openMenu();
    } else if (fecha) {
      ev.preventDefault();
      closeMenu();
    }
  });

  // ESC fecha
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  console.log("✅ Delegação do menu mobile ativa");
}

function el(id) { return document.getElementById(id); }

function openMenu() {
  const menu = el("mobile-menu");
  const overlay = el("menu-overlay");
  if (!menu) return;
  menu.classList.add("open");
  overlay && overlay.classList.add("active");
  document.body.classList.add("menu-open");
}

function closeMenu() {
  const menu = el("mobile-menu");
  const overlay = el("menu-overlay");
  if (!menu) return;
  menu.classList.remove("open");
  overlay && overlay.classList.remove("active");
  document.body.classList.remove("menu-open");
}

function garantirOverlay() {
  // garante que o #menu-overlay existe (algumas páginas podem não ter sido carregadas ainda)
  if (!el("menu-overlay")) {
    const ov = document.createElement("div");
    ov.id = "menu-overlay";
    ov.className = "menu-overlay";
    document.body.appendChild(ov);
  }
}

// ----------------------------
// Swiper - Banners
// ----------------------------
function initSwiper() {
  if (typeof Swiper === "undefined") return;
  new Swiper(".swiper", {
    loop: true,
    autoplay: { delay: 5000, disableOnInteraction: false },
    navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
    effect: "slide",
  });
}

// ----------------------------
// Busca simples (mantido)
// ----------------------------
function doSearch(query) {
  const cards = document.querySelectorAll(".product-card");
  const noResults = document.getElementById("no-results");
  if (!cards.length) return;

  if (!query || !query.trim()) {
    cards.forEach(c => c.style.display = "flex");
    if (noResults) noResults.style.display = "none";
    return;
  }

  let found = 0;
  const q = query.toLowerCase();
  cards.forEach(card => {
    const title = (card.querySelector("h3")?.textContent || "").toLowerCase();
    const ok = title.includes(q);
    card.style.display = ok ? "flex" : "none";
    if (ok) found++;
  });

  if (noResults) noResults.style.display = found ? "none" : "block";
}
