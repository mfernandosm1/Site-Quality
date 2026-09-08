(function(){
  'use strict';

  if (window.__qualityCategorySharedHeaderV1) return;
  window.__qualityCategorySharedHeaderV1 = true;

  var HEADER_URL = '/header.html?v=20260908-menu3';

  function fixLocalPreviewLinks(root){
    var isLocalPreview = window.location.hostname === 'localhost' && window.location.port === '3000';
    if (!isLocalPreview || !root) return;
    root.querySelectorAll('[data-home-link]').forEach(function(link){
      link.setAttribute('href', '/site/view/index.html');
    });
  }

  function bindMenu(root){
    if (!root) return;

    var menuToggle = root.querySelector('#menu-toggle');
    var menuClose = root.querySelector('#menu-close');
    var mobileMenu = root.querySelector('#mobile-menu');
    var overlay = root.querySelector('#menu-overlay');

    if (!mobileMenu || !menuToggle) return;

    function setOpen(open){
      mobileMenu.classList.toggle('open', !!open);
      mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (overlay) {
        overlay.classList.toggle('active', !!open);
        overlay.classList.toggle('show', !!open);
        overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
    }

    // Mesma mecânica simples usada pela home: um controlador, sem pointer/touch
    // alternativo, sem MutationObserver e sem reconstrução do menu.
    menuToggle.addEventListener('click', function(){ setOpen(true); });
    if (menuClose) menuClose.addEventListener('click', function(){ setOpen(false); });
    if (overlay) overlay.addEventListener('click', function(){ setOpen(false); });

    root.querySelectorAll('#mobile-menu .mobile-nav a').forEach(function(link){
      link.addEventListener('click', function(){ setOpen(false); });
    });

    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape') setOpen(false);
    });

    window.addEventListener('resize', function(){
      if (window.innerWidth > 991) setOpen(false);
    });
  }

  function notifyReady(host){
    try {
      document.dispatchEvent(new CustomEvent('quality:category-header-ready', {detail:{host:host}}));
    } catch (_) {
      var ev = document.createEvent('Event');
      ev.initEvent('quality:category-header-ready', true, true);
      document.dispatchEvent(ev);
    }

    // O menu de favoritos pode ter tentado montar antes do header terminar de carregar.
    if (typeof window.qualityRefreshFavoritesMenu === 'function') {
      try { window.qualityRefreshFavoritesMenu(); } catch (_) {}
    }
  }

  function activate(host){
    fixLocalPreviewLinks(host);
    bindMenu(host);
    notifyReady(host);
  }

  function loadHeader(){
    var host = document.getElementById('header');
    if (!host) return;

    fetch(HEADER_URL, {cache:'no-store'})
      .then(function(response){
        if (!response.ok) throw new Error('Falha ao carregar header: HTTP ' + response.status);
        return response.text();
      })
      .then(function(html){
        host.innerHTML = html;
        activate(host);
      })
      .catch(function(err){
        console.error('[Quality] Não foi possível carregar o header compartilhado.', err);
        // Se algum template futuro trouxer um header fallback dentro do host,
        // ainda tentamos ativá-lo sem alterar o restante da página.
        activate(host);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHeader, {once:true});
  } else {
    loadHeader();
  }
})();
