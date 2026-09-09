(function(){
  'use strict';

  if (window.__qualityCategoryUIV16) return;
  window.__qualityCategoryUIV16 = true;

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
      var product = products.find(function(item){
        if (!item || item.active === false) return false;
        return normalizeSearch(item.name || item.nome || '').indexOf(term) !== -1 || normalizeSearch(item.slug || '').indexOf(term) !== -1;
      });
      if (product) {
        var slug = product.slug || product.id;
        if (slug) window.location.assign('/produto/' + encodeURIComponent(slug) + '/');
        return;
      }
      var category = categories.find(function(item){
        return normalizeSearch(item.name || item.nome || '').indexOf(term) !== -1 || normalizeSearch(item.slug || '').indexOf(term) !== -1;
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

  /*
   * V15: o menu usa somente os eventos nativos que já funcionam no index.
   * Nenhum listener é registrado nos links de categoria/subcategoria/produto.
   * Isso é intencional: href do navegador é a fonte única de navegação.
   */
  function bindMenu(){
    var toggle=document.getElementById('menu-toggle'), close=document.getElementById('menu-close'), menu=document.getElementById('mobile-menu'), overlay=document.getElementById('menu-overlay');
    if(!toggle||!close||!menu||!overlay) return;
    function setOpen(open){
      menu.classList.toggle('open',open); overlay.classList.toggle('active',open);
      menu.setAttribute('aria-hidden',open?'false':'true'); overlay.setAttribute('aria-hidden',open?'false':'true'); toggle.setAttribute('aria-expanded',open?'true':'false');
    }
    setOpen(false);
    toggle.addEventListener('click',function(){setOpen(true)});
    close.addEventListener('click',function(){setOpen(false)});
    overlay.addEventListener('click',function(){setOpen(false)});
    document.addEventListener('keydown',function(ev){if(ev.key==='Escape')setOpen(false)});
    window.addEventListener('pageshow',function(){setOpen(false)});
  }

  function init(){
    bindMenu();
    bindSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
