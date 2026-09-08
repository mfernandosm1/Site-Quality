(function(){
  'use strict';
  if (window.__qualityHeaderMenuStableV1) return;
  window.__qualityHeaderMenuStableV1 = true;

  function getParts(){
    return {
      toggle: document.getElementById('menu-toggle'),
      close: document.getElementById('menu-close'),
      menu: document.getElementById('mobile-menu'),
      overlay: document.getElementById('menu-overlay')
    };
  }

  function setOpen(open){
    var p = getParts();
    if (!p.menu) return;
    p.menu.classList.toggle('open', open);
    p.menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (p.overlay) {
      p.overlay.classList.toggle('active', open);
      p.overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    if (p.toggle) p.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('quality-mobile-menu-open', open);
  }

  document.addEventListener('click', function(ev){
    var target = ev.target && ev.target.closest ? ev.target : null;
    if (!target) return;

    if (target.closest('#menu-toggle')) {
      ev.preventDefault();
      var menu = document.getElementById('mobile-menu');
      setOpen(!(menu && menu.classList.contains('open')));
      return;
    }

    if (target.closest('#menu-close') || target.closest('#menu-overlay')) {
      ev.preventDefault();
      setOpen(false);
      return;
    }

    // Fecha depois do toque em uma opção, sem cancelar a navegação nativa do link.
    if (target.closest('#mobile-menu .mobile-nav a')) {
      setOpen(false);
    }
  }, false);

  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function(){
    if (window.innerWidth > 991) setOpen(false);
  });
})();
