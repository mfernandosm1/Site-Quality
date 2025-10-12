// main.js — robusto para index.html com delegação de eventos
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando carregamento global (index)...");

  // Detecta caminho base automaticamente
  const base = window.location.pathname.includes("/Site-Quality/")
    ? "/Site-Quality"
    : "";

  // Carregar HEADER no contêiner #header
  const headerContainer = document.getElementById("header");
  if (headerContainer && !document.querySelector('header.header')) {
    try {
      const res = await fetch(`${base}/header.html`, { cache: "no-store" });
      if (res.ok) {
        headerContainer.innerHTML = await res.text();
        console.log("✅ Header carregado (index)");
      }
    } catch (e) {
      console.error("❌ Erro ao carregar header:", e);
    }
  }

  // Delegação global — não depende do momento de injeção
  if (!window.__menuDelegatedBound){
    window.__menuDelegatedBound = true;
    document.addEventListener('click', function(ev){
      const t = ev.target;
      const toggle = t.closest && t.closest('#menu-toggle');
      const closeBtn = t.closest && (t.closest('#menu-close') || t.closest('#menu-overlay') || t.closest('.mobile-nav a'));
      const sidebar = document.getElementById('mobile-menu');
      const overlay = document.getElementById('menu-overlay');
      if (!sidebar) return;

      const open = () => { sidebar.classList.add('open'); overlay && overlay.classList.add('active'); document.body.classList.add('menu-open'); };
      const close = () => { sidebar.classList.remove('open'); overlay && overlay.classList.remove('active'); document.body.classList.remove('menu-open'); };

      if (toggle){ ev.preventDefault(); sidebar.classList.contains('open') ? close() : open(); }
      if (closeBtn){ ev.preventDefault(); close(); }
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        const sidebar = document.getElementById('mobile-menu');
        const overlay = document.getElementById('menu-overlay');
        if (sidebar && sidebar.classList.contains('open')){
          sidebar.classList.remove('open'); overlay && overlay.classList.remove('active'); document.body.classList.remove('menu-open');
        }
      }
    });
    console.log("✅ Delegação de eventos do menu ativa (index)");
  }

  // Carregar FOOTER
  const footerContainer = document.getElementById("footer");
  if (footerContainer && !document.querySelector('footer')) {
    try {
      const res = await fetch(`${base}/footer.html`, { cache: "no-store" });
      if (res.ok) {
        footerContainer.innerHTML = await res.text();
        console.log("✅ Footer carregado (index)");
      }
    } catch (e) {
      console.error("❌ Erro ao carregar footer:", e);
    }
  }

  // Inicializar Swiper (banners)
  if (typeof Swiper !== "undefined") {
    new Swiper(".swiper", {
      loop: true,
      autoplay: { delay: 5000, disableOnInteraction: false },
      navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
      effect: "slide",
    });
    console.log("✅ Swiper inicializado");
  }
});
