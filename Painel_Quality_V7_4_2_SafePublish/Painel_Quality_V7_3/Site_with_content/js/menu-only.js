/* js/menu-only.js (v2) — delegação + pointer/touch + ARIA */
(function(){
  if (window.__MENU_ONLY_BOUND__) return;
  window.__MENU_ONLY_BOUND__ = true;

  function get(id){ return document.getElementById(id); }
  function isOpen(){ const m=get('mobile-menu'); return m && m.classList.contains('open'); }
  function openMenu(){
    const m=get('mobile-menu'), o=get('menu-overlay');
    if (!m) return;
    m.classList.add('open'); m.setAttribute('aria-hidden','false');
    o && o.classList.add('active');
    document.body.classList.add('menu-open');
  }
  function closeMenu(){
    const m=get('mobile-menu'), o=get('menu-overlay');
    if (!m) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden','true');
    o && o.classList.remove('active');
    document.body.classList.remove('menu-open');
  }
  function toggleMenu(){ isOpen() ? closeMenu() : openMenu(); }

  function handler(ev){
    const t = ev.target;
    const wantsToggle = t.closest && t.closest('#menu-toggle');
    const wantsClose  = t.closest && (t.closest('#menu-close') || t.closest('#menu-overlay') || t.closest('.mobile-nav a'));
    if (wantsToggle){ ev.preventDefault(); toggleMenu(); }
    if (wantsClose){ ev.preventDefault(); closeMenu(); }
  }

  ['pointerup','touchend','click'].forEach(evt=>{
    document.addEventListener(evt, handler, {passive:false});
  });

  document.addEventListener('keydown', e => { if (e.key==='Escape') closeMenu(); });
  window.addEventListener('hashchange', () => closeMenu());

  // Diagnóstico rápido
  setTimeout(()=> {
    ['menu-toggle','mobile-menu','menu-overlay','menu-close'].forEach(id=>{
      console.log('[menu-only]', id, !!get(id));
    });
  }, 100);
})();
