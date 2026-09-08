(function(){
  'use strict';

  if (window.__qualityCategoryUIV10) return;
  window.__qualityCategoryUIV10 = true;

  function normalizeSearch(value){
    return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function showSearchMessage(text){
    var message = document.getElementById('no-results');
    if (message) { message.textContent = text; message.style.display = 'block'; }
    else window.alert(text);
  }

  function fetchFirstJson(urls){
    var index = 0;
    function next(){
      if (index >= urls.length) return Promise.resolve({items:[]});
      var url = urls[index++];
      return fetch(url, {cache:'no-store'}).then(function(r){
        if (!r.ok) throw new Error('Falha ao carregar ' + url);
        var type = String(r.headers.get('content-type') || '').toLowerCase();
        if (type && type.indexOf('json') < 0) throw new Error('Resposta não JSON em ' + url);
        return r.json();
      }).catch(next);
    }
    return next();
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
    if (found) { if (message) message.style.display = 'none'; return; }

    Promise.all([
      fetchFirstJson(['/content/catalog-public.json', '/site/content/catalog-public.json', '/content/products.json', '/site/content/products.json']),
      fetch('/content/categories.json', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : {items:[]}; }).catch(function(){ return {items:[]}; })
    ]).then(function(all){
      var products = all[0].items || [];
      var categories = all[1].items || [];
      var product = products.find(function(p){
        if (!p || p.active === false) return false;
        return normalizeSearch(p.name || p.nome || '').indexOf(term) !== -1 || normalizeSearch(p.slug || '').indexOf(term) !== -1;
      });
      if (product) {
        var slug = product.slug || product.id;
        if (slug) window.location.assign('/produto/' + encodeURIComponent(slug) + '/');
        return;
      }
      var category = categories.find(function(c){
        return normalizeSearch(c.name || c.nome || '').indexOf(term) !== -1 || normalizeSearch(c.slug || '').indexOf(term) !== -1;
      });
      if (category && category.slug) { window.location.assign('/' + encodeURIComponent(category.slug) + '/'); return; }
      showSearchMessage('Nenhum produto encontrado.');
    }).catch(function(){ showSearchMessage('Erro ao buscar produto.'); });
  }

  function bindPair(input, button){
    if (!input || !button || button.dataset.qualityCategorySearchBound === '1') return;
    button.dataset.qualityCategorySearchBound = '1';
    button.addEventListener('click', function(){ doSearch(input.value); });
    input.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') doSearch(input.value); });
  }

  function bindSearch(){
    bindPair(document.getElementById('search-input'), document.getElementById('search-button'));
    bindPair(document.getElementById('search-input-mobile'), document.getElementById('search-button-mobile'));
  }

  function menuEls(){
    return {
      toggle: document.getElementById('menu-toggle'),
      close: document.getElementById('menu-close'),
      menu: document.getElementById('mobile-menu'),
      overlay: document.getElementById('menu-overlay')
    };
  }

  function setMenuOpen(open){
    var e = menuEls();
    if (!e.menu || !e.overlay || !e.toggle) return;
    open = !!open;
    e.menu.classList.toggle('open', open);
    e.menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    e.overlay.classList.toggle('active', open);
    e.overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    e.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('quality-category-menu-open', open);
  }

  /* Mesmo padrão simples usado pelo index: click nativo, sem pointerup e sem preventDefault. */
  function bindMenu(){
    var e = menuEls();
    if (!e.toggle || !e.close || !e.menu || !e.overlay) return;

    setMenuOpen(false);
    e.toggle.addEventListener('click', function(){ setMenuOpen(true); });
    e.close.addEventListener('click', function(){ setMenuOpen(false); });
    e.overlay.addEventListener('click', function(){ setMenuOpen(false); });

    var nav = document.getElementById('nav-mobile');
    if (nav) {
      nav.querySelectorAll('a[href]').forEach(function(link){
        link.addEventListener('click', function(){
          /* Não cancelar o click: o próprio <a href> faz a navegação. */
          setMenuOpen(false);
        });
      });
    }

    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') setMenuOpen(false); });
    window.addEventListener('pageshow', function(){ setMenuOpen(false); });
  }

  function init(){
    bindMenu();
    bindSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
