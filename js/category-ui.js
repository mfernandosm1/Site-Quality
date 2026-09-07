(function(){
  'use strict';

  if (window.__qualityCategoryUIV4) return;
  window.__qualityCategoryUIV4 = true;

  function closest(target, selector){
    return target && target.closest ? target.closest(selector) : null;
  }

  /*
   * O menu mobile das categorias é controlado por CSS/checkbox no HTML.
   * Não registramos listeners de abrir/fechar aqui: isso elimina diferenças
   * de click/pointer entre Safari e navegadores Chromium no iPhone.
   */

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
      var titleNode = card.querySelector('h3');
      var title = normalizeSearch(titleNode ? titleNode.textContent : '');
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
        if (slug) window.location.assign('/produto/' + encodeURIComponent(slug) + '/');
        return;
      }
      var category = categories.find(function(c){
        return normalizeSearch(c.name || c.nome || '').indexOf(term) !== -1 ||
               normalizeSearch(c.slug || '').indexOf(term) !== -1;
      });
      if (category && category.slug) {
        window.location.assign('/' + encodeURIComponent(category.slug) + '/');
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
      });
      mobileInput.addEventListener('keydown', function(ev){
        if (ev.key === 'Enter') doSearch(mobileInput.value);
      });
    }
  }

  /*
   * Fallback defensivo para navegação interna nas categorias.
   * Não substitui o comportamento nativo do <a>. Apenas garante que um toque
   * válido em logo/categoria/produto navegue mesmo se outro script cancelar o click.
   */
  var touchNav = null;
  var NAV_SELECTOR = [
    'a[data-home-link]',
    '#nav-desktop a.cat-link',
    '#nav-desktop a.cat-sub-link',
    '#nav-mobile a.cat-link',
    '#nav-mobile a.cat-sub-link',
    'a.btn-details[href*="/produto/"]',
    'a.quality-card-image-link[href*="/produto/"]'
  ].join(',');

  function safeInternalUrl(anchor){
    if (!anchor) return '';
    var raw = anchor.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || /^javascript:/i.test(raw)) return '';
    try {
      var url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  }

  function navAnchorFromTarget(target){
    return closest(target, NAV_SELECTOR);
  }

  function bindNavigationFallback(){
    document.addEventListener('pointerdown', function(ev){
      if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return;
      var anchor = navAnchorFromTarget(ev.target);
      var url = safeInternalUrl(anchor);
      if (!url) return;
      touchNav = {
        pointerId: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        url: url,
        moved: false
      };
    }, true);

    document.addEventListener('pointermove', function(ev){
      if (!touchNav || touchNav.pointerId !== ev.pointerId) return;
      if (Math.abs(ev.clientX - touchNav.x) > 12 || Math.abs(ev.clientY - touchNav.y) > 12) {
        touchNav.moved = true;
      }
    }, true);

    document.addEventListener('pointercancel', function(ev){
      if (touchNav && touchNav.pointerId === ev.pointerId) touchNav = null;
    }, true);

    document.addEventListener('pointerup', function(ev){
      if (!touchNav || touchNav.pointerId !== ev.pointerId) return;
      var pending = touchNav;
      touchNav = null;
      if (pending.moved) return;

      var anchor = navAnchorFromTarget(ev.target);
      var url = safeInternalUrl(anchor);
      if (!url || url !== pending.url) return;

      // Navega no pointerup para não depender do click sintetizado do navegador.
      ev.preventDefault();
      window.location.assign(url);
    }, true);

    document.addEventListener('click', function(ev){
      if (ev.defaultPrevented) {
        var preventedAnchor = navAnchorFromTarget(ev.target);
        var preventedUrl = safeInternalUrl(preventedAnchor);
        if (preventedUrl) window.location.assign(preventedUrl);
        return;
      }

      var anchor = navAnchorFromTarget(ev.target);
      var url = safeInternalUrl(anchor);
      if (!url) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      // O link nativo continua responsável pela navegação. Se algum listener
      // cancelar o evento depois deste ponto, o microtask de segurança assume.
      var before = window.location.href;
      setTimeout(function(){
        if (window.location.href === before) window.location.assign(url);
      }, 0);
    }, true);
  }

  function init(){
    bindSearch();
    bindNavigationFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

})();
