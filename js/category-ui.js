(function(){
  'use strict';

  if (window.__qualityCategoryUIV5) return;
  window.__qualityCategoryUIV5 = true;

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

    function fetchFirstJson(urls){
      var index = 0;
      function next(){
        if (index >= urls.length) return Promise.resolve({items:[]});
        var url = urls[index++];
        return fetch(url, {cache:'no-store'}).then(function(r){
          if (!r.ok) throw new Error('Falha ao carregar ' + url);
          return r.json();
        }).catch(next);
      }
      return next();
    }

    Promise.all([
      fetchFirstJson(['/content/catalog-public.json', '/site/content/catalog-public.json', '/content/products.json', '/site/content/products.json']),
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

  // Links de logo, categorias e produtos usam navegação nativa do navegador.

  function init(){
    bindSearch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

})();
