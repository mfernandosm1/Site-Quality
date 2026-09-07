(function(){
  'use strict';

  if (window.__qualityCategoryUIV1) return;
  window.__qualityCategoryUIV1 = true;

  function closest(target, selector){
    return target && target.closest ? target.closest(selector) : null;
  }

  function getMenuParts(){
    return {
      menu: document.getElementById('mobile-menu'),
      overlay: document.getElementById('menu-overlay')
    };
  }

  function openMenu(){
    var parts = getMenuParts();
    if (!parts.menu) return;
    parts.menu.classList.add('open');
    parts.menu.setAttribute('aria-hidden', 'false');
    if (parts.overlay) {
      parts.overlay.classList.add('active');
      parts.overlay.classList.add('show');
    }
  }

  function closeMenu(){
    var parts = getMenuParts();
    if (!parts.menu) return;
    parts.menu.classList.remove('open');
    parts.menu.setAttribute('aria-hidden', 'true');
    if (parts.overlay) {
      parts.overlay.classList.remove('active');
      parts.overlay.classList.remove('show');
    }
  }

  var lastPointerHandledAt = 0;
  var lastPointerTarget = null;

  function menuActionFromTarget(target){
    if (closest(target, '#menu-toggle')) return 'open';
    if (closest(target, '#menu-close')) return 'close';
    if (closest(target, '#menu-overlay')) return 'close';
    if (closest(target, '#mobile-menu a')) return 'link';
    return '';
  }

  function runMenuAction(action){
    if (action === 'open') openMenu();
    else if (action === 'close' || action === 'link') closeMenu();
  }

  // Pointerup responde imediatamente ao toque em Chrome/Opera mobile.
  // O click continua como fallback para teclado e navegadores sem Pointer Events.
  document.addEventListener('pointerup', function(ev){
    var action = menuActionFromTarget(ev.target);
    if (!action) return;
    lastPointerHandledAt = Date.now();
    lastPointerTarget = ev.target;
    runMenuAction(action);
    if (action === 'open' || action === 'close') ev.preventDefault();
  }, false);

  document.addEventListener('click', function(ev){
    var action = menuActionFromTarget(ev.target);
    if (!action) return;

    // Evita executar duas vezes quando o mesmo toque já foi tratado em pointerup.
    if (lastPointerTarget && Date.now() - lastPointerHandledAt < 700) {
      if (action === 'open' || action === 'close') ev.preventDefault();
      lastPointerTarget = null;
      return;
    }

    runMenuAction(action);
    if (action === 'open' || action === 'close') ev.preventDefault();
  }, false);

  // Escape fecha o menu em desktop/teclado e não interfere no mobile.
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape') closeMenu();
  });

  function normalizeSearch(value){
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function showSearchMessage(text){
    var message = document.getElementById('no-results');
    if (message) {
      message.textContent = text;
      message.style.display = 'block';
    } else {
      window.alert(text);
    }
  }

  function doSearch(query){
    var term = normalizeSearch(query);
    if (term && window.QualityAnalyticsTrack) {
      try { window.QualityAnalyticsTrack('search', {term: term}); } catch (_) {}
    }
    var cards = document.querySelectorAll('.product-card');
    var message = document.getElementById('no-results');

    if (!term) {
      cards.forEach(function(card){ card.style.display = 'flex'; });
      if (message) message.style.display = 'none';
      return;
    }

    var found = false;
    cards.forEach(function(card){
      var title = normalizeSearch((card.querySelector('h3') || {}).textContent || '');
      var match = title.indexOf(term) !== -1;
      card.style.display = match ? 'flex' : 'none';
      if (match) found = true;
    });

    if (found) {
      if (message) message.style.display = 'none';
      return;
    }

    Promise.all([
      fetch('/content/products.json', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : {items:[]}; }).catch(function(){ return {items:[]}; }),
      fetch('/content/categories.json', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : {items:[]}; }).catch(function(){ return {items:[]}; })
    ]).then(function(all){
      var products = all[0].items || [];
      var categories = all[1].items || [];
      var product = products.find(function(p){
        if (!p || p.active === false) return false;
        return normalizeSearch(p.name || p.nome || '').indexOf(term) !== -1 ||
               normalizeSearch(p.slug || '').indexOf(term) !== -1;
      });
      if (product) {
        var slug = product.slug || product.id;
        if (slug) window.location.href = '/produto/' + encodeURIComponent(slug) + '/';
        return;
      }
      var category = categories.find(function(c){
        return normalizeSearch(c.name || c.nome || '').indexOf(term) !== -1 ||
               normalizeSearch(c.slug || '').indexOf(term) !== -1;
      });
      if (category && category.slug) {
        window.location.href = '/' + encodeURIComponent(category.slug) + '/';
        return;
      }
      showSearchMessage('Nenhum produto encontrado.');
    }).catch(function(){
      showSearchMessage('Erro ao buscar produto.');
    });
  }

  function bindSearch(){
    var desktopInput = document.getElementById('search-input');
    var desktopButton = document.getElementById('search-button');
    var mobileInput = document.getElementById('search-input-mobile');
    var mobileButton = document.getElementById('search-button-mobile');

    if (desktopButton && desktopInput) {
      desktopButton.addEventListener('click', function(){ doSearch(desktopInput.value); });
      desktopInput.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter') doSearch(desktopInput.value);
      });
    }

    if (mobileButton && mobileInput) {
      mobileButton.addEventListener('click', function(){
        doSearch(mobileInput.value);
        closeMenu();
      });
      mobileInput.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter') {
          doSearch(mobileInput.value);
          closeMenu();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindSearch, {once:true});
  } else {
    bindSearch();
  }

  window.qualityCategoryCloseMenu = closeMenu;
})();
