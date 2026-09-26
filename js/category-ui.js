(function(){
  'use strict';

  if (window.__qualityCategoryUIGeneratorFix1) return;
  window.__qualityCategoryUIGeneratorFix1 = true;

  function normalizeSearch(value){
    return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function compactSearch(value){ return normalizeSearch(value).replace(/[^a-z0-9]+/g,''); }
  function searchTokens(value){ return normalizeSearch(value).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean); }
  function editDistance(a,b){
    a=String(a||'');b=String(b||'');if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
    var prev=Array.from({length:b.length+1},function(_,i){return i;});
    for(var i=1;i<=a.length;i++){var left=i,diag=i-1;for(var j=1;j<=b.length;j++){var up=prev[j],cost=a[i-1]===b[j-1]?0:1,next=Math.min(up+1,left+1,diag+cost);diag=up;prev[j]=next;left=next;}}
    return prev[b.length];
  }
  function fuzzySearchScore(textValue,query){
    var hay=normalizeSearch(textValue),term=normalizeSearch(query);if(!hay||!term)return 0;if(hay===term)return 1000;if(hay.indexOf(term)!==-1)return 820;
    var ch=compactSearch(hay),ct=compactSearch(term);if(ct&&ch.indexOf(ct)!==-1)return 790;
    var qt=searchTokens(term),ht=searchTokens(hay),total=0,matched=0;
    qt.forEach(function(q){var best=0;ht.forEach(function(h){if(q===h)best=Math.max(best,120);else if(h.indexOf(q)===0||q.indexOf(h)===0)best=Math.max(best,100);else if(h.indexOf(q)!==-1||q.indexOf(h)!==-1)best=Math.max(best,82);else if(q.length>=4&&h.length>=4){var d=editDistance(q,h);if(d===1)best=Math.max(best,72);else if(d===2&&Math.max(q.length,h.length)>=6)best=Math.max(best,56);}});if(best){matched++;total+=best;}});
    var coverage=qt.length?matched/qt.length:0;return coverage>=.6?Math.round(total*coverage+(matched===qt.length?80:0)):0;
  }
  function bestSearchMatch(items,query,getText,minScore){var winner=null,best=0;(items||[]).forEach(function(item){var score=fuzzySearchScore(getText(item),query);if(score>best){winner=item;best=score;}});return best>=(minScore||90)?winner:null;}

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
      var title = titleNode ? titleNode.textContent : '';
      var match = fuzzySearchScore(title,term) >= 90;
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
      var product = bestSearchMatch(products.filter(function(item){return item && item.active !== false;}),term,function(item){return [item.name,item.nome,item.slug,item.brand,item.category,item.categoria,item.descriptionShort].filter(Boolean).join(' ');},90);
      if (product) {
        var slug = product.slug || product.id;
        if (slug) window.location.assign('/produto/' + encodeURIComponent(slug) + '/');
        return;
      }
      var category = bestSearchMatch(categories,term,function(item){return [item.name,item.nome,item.slug,item.id].filter(Boolean).join(' ');},95);
      if (category && category.slug) { window.location.assign('/' + encodeURIComponent(category.slug) + '/'); return; }
      showSearchMessage('Nenhum produto encontrado.');
      if (window.QualityAnalytics && typeof window.QualityAnalytics.searchNoResult === 'function') {
        window.QualityAnalytics.searchNoResult(term);
      } else if (window.QualityAnalyticsTrack) {
        window.QualityAnalyticsTrack('search_no_result', {term:term, searchStatus:'sem_resultado', resultCount:0});
      }
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
   * GENERATORFIX1: category links stay native; this script only opens/closes menu and handles search.
   * Nenhum listener é registrado nos links de categoria/subcategoria/produto.
   * Isso é intencional: href do navegador é a fonte única de navegação.
   */
  function bindMenu(){
    var toggle=document.getElementById('menu-toggle'), close=document.getElementById('menu-close'), menu=document.getElementById('mobile-menu'), overlay=document.getElementById('menu-overlay');
    if(!toggle||!close||!menu||!overlay) return;
    function setOpen(open){
      if(!open && document.activeElement && menu.contains(document.activeElement)){ try{document.activeElement.blur();}catch(_){} }
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

// Quality Storefront Experience V1 - filtros, busca e lista de interesse nas categorias físicas.
(function loadQualityStorefrontExperienceV1(){
  if (window.__qualityStorefrontLoaderV1) return;
  window.__qualityStorefrontLoaderV1 = true;
  var script = document.createElement('script');
  script.src = '/js/storefront-enhancements.js?v=20260926-compare9';
  script.defer = true;
  document.head.appendChild(script);
})();
