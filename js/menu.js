/* js/menu.js (v4) — robusto, DOM pronto, pointer/touch/click + ARIA */
(function(){
  if (window.__MENU_BOUND__) return; window.__MENU_BOUND__ = true;
  function ready(fn){ document.readyState!=='loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    function get(id){ return document.getElementById(id); }
    function isOpen(){ const m=get('mobile-menu'); return m && m.classList.contains('open'); }
    function openMenu(){
      const m=get('mobile-menu'), o=get('menu-overlay'), t=get('menu-toggle');
      if (!m) return; m.classList.add('open'); m.setAttribute('aria-hidden','false');
      o && o.classList.add('active'); t && t.setAttribute('aria-expanded','true');
      document.body.classList.add('menu-open');
    }
    function closeMenu(){
      const m=get('mobile-menu'), o=get('menu-overlay'), t=get('menu-toggle');
      if (!m) return; m.classList.remove('open'); m.setAttribute('aria-hidden','true');
      o && o.classList.remove('active'); t && t.setAttribute('aria-expanded','false');
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

    // Diagnóstico
    setTimeout(()=>{
      console.log('[menu.js v4] IDs', {
        toggle: !!get('menu-toggle'),
        menu: !!get('mobile-menu'),
        overlay: !!get('menu-overlay'),
        close: !!get('menu-close')
      });
    }, 200);
  });
})();