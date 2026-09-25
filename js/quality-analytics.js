(function(){
  if(window.__qualitySiteAnalyticsV4) return;
  window.__qualitySiteAnalyticsV4 = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var KEY = 'quality-analytics-v1';
  var recent = Object.create(null);
  var catalogPromise = null;
  var categoriesPromise = null;
  var currentProductCache = null;
  var lastSearchTerm = '';
  var lastNoResultTerm = '';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function normalize(v){ return clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function isLocal(){ return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || ''); }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function viewport(){ return String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0); }
  function currentProductSlug(){
    var m = String(window.location.pathname || '').match(/\/produto\/([^/?#]+)/i);
    if(m) return decodeURIComponent(m[1]);
    try { return clean(new URLSearchParams(window.location.search).get('slug') || new URLSearchParams(window.location.search).get('id') || '',120); }
    catch(e){ return ''; }
  }
  function currentCategorySlug(){
    try {
      var q = new URLSearchParams(window.location.search).get('slug');
      if(q) return clean(q,120);
    } catch(e){}
    var path = String(window.location.pathname || '').replace(/^\/+|\/+$/g,'');
    var first = path.split('/')[0] || '';
    if(!first || /^(site|produto|index\.html|categoria\.html|sobre\.html|formas-de-pagamento\.html)$/i.test(first)) return '';
    return clean(first,120);
  }
  function surface(){
    var p = String(window.location.pathname || '').toLowerCase();
    if(currentProductSlug() || /\/produto\//.test(p) || /produto\.html/.test(p)) return 'Página do produto';
    if(currentCategorySlug() || /categoria\.html/.test(p)) return 'Categoria';
    if(p === '/' || /(?:^|\/)index\.html$/.test(p) || /\/site\/view\/?$/.test(p) || /\/site\/view\/index\.html$/.test(p)) return 'Home';
    return 'Outra página';
  }
  function fetchFirstJson(urls){
    var i = 0;
    function next(){
      if(i >= urls.length) return Promise.resolve({items:[]});
      var url = urls[i++];
      return fetch(url,{cache:'no-store'}).then(function(r){
        if(!r.ok) throw new Error('HTTP '+r.status);
        return r.json();
      }).catch(next);
    }
    return next();
  }
  function loadCatalog(){
    if(!catalogPromise) catalogPromise = fetchFirstJson(['/content/catalog-public.json','/site/content/catalog-public.json','/content/products.json','/site/content/products.json']);
    return catalogPromise;
  }
  function loadCategories(){
    if(!categoriesPromise) categoriesPromise = fetchFirstJson(['/content/categories.json','/site/content/categories.json']);
    return categoriesPromise;
  }
  function normalizeProduct(p, fallbackSlug){
    p = p || {};
    var vs = p.virtualStore || {};
    var slug = clean(p.slug || vs.slug || p.id || fallbackSlug || '',120);
    return {
      id: clean(p.id || '',120),
      slug: slug,
      name: clean(vs.name || p.name || p.nome || slug || 'Produto',140),
      image: clean(vs.image || p.image || p.imagem || '',260),
      url: clean('/produto/' + encodeURIComponent(slug) + '/',300)
    };
  }
  function productFromButton(btn){
    if(!btn) return null;
    return {
      id: clean(btn.getAttribute('data-id') || '',120),
      slug: clean(btn.getAttribute('data-slug') || btn.getAttribute('data-id') || '',120),
      name: clean(btn.getAttribute('data-name') || '',140),
      image: clean(btn.getAttribute('data-image') || '',260),
      url: clean(btn.getAttribute('data-url') || '',300)
    };
  }
  function productFromElement(el){
    if(!el) return currentProductCache;
    var holder = el.closest && el.closest('[data-quality-fav],[data-quality-share]');
    if(holder) return productFromButton(holder);
    var card = el.closest && el.closest('.produto-card,.product-card,.related-card,.quality-product-card');
    if(card){
      var data = card.querySelector('[data-quality-fav],[data-quality-share]');
      if(data) return productFromButton(data);
      var link = card.querySelector('a[href*="/produto/"]');
      if(link){
        var m = String(link.getAttribute('href') || '').match(/\/produto\/([^/?#]+)/i);
        var nameNode = card.querySelector('h3,.product-title');
        return {id:'',slug:m?decodeURIComponent(m[1]):'',name:clean(nameNode && nameNode.textContent || '',140),image:'',url:clean(link.getAttribute('href')||'',300)};
      }
    }
    return currentProductCache;
  }
  function productFromDom(slug){
    var h1 = document.querySelector('h1');
    var img = document.querySelector('.product-main-image img, .product-image img, .main-image img, #produto-detalhe img, main img');
    return {
      id:'', slug:clean(slug,120),
      name:clean((h1 && h1.textContent) || document.title.replace(/\s*[–|-]\s*Quality Celulares.*$/i,'') || slug,140),
      image:clean(img && (img.currentSrc || img.getAttribute('src')) || '',260),
      url:clean(window.location.href,300)
    };
  }
  function resolveCurrentProduct(){
    var slug = currentProductSlug();
    if(!slug) return Promise.resolve(null);
    if(currentProductCache && (currentProductCache.slug === slug || currentProductCache.id === slug)) return Promise.resolve(currentProductCache);
    return loadCatalog().then(function(data){
      var items = data && Array.isArray(data.items) ? data.items : [];
      var wanted = normalize(slug);
      var found = items.find(function(p){ return normalize(p && (p.slug || p.id)) === wanted; });
      currentProductCache = found ? normalizeProduct(found,slug) : productFromDom(slug);
      currentProductCache.url = clean(window.location.href,300);
      return currentProductCache;
    }).catch(function(){ currentProductCache = productFromDom(slug); return currentProductCache; });
  }
  function normalizePayload(type, payload){
    payload = payload && typeof payload === 'object' ? payload : {};
    var product = payload.product && typeof payload.product === 'object' ? payload.product : null;
    if(!product && (type === 'product_view' || type === 'favorite' || type === 'whatsapp_click' || type === 'share_click')){
      if(payload.slug || payload.name || payload.id) product = payload;
    }
    var category = payload.category && typeof payload.category === 'object' ? payload.category : null;
    return {
      product: product,
      category: category,
      term: clean(payload.term || payload.query || '',100).toLowerCase(),
      context: clean(payload.context || surface(),80),
      resultCount: Number.isFinite(Number(payload.resultCount)) ? Number(payload.resultCount) : undefined,
      searchStatus: clean(payload.searchStatus || '',40)
    };
  }
  function dedupeKey(type,data){
    var p = data.product || {}, c = data.category || {};
    return [type,clean(p.slug||p.id||p.name,120),clean(c.slug||c.name,120),data.term,data.searchStatus].join('|').toLowerCase();
  }
  function isDuplicate(type,data){
    var key = dedupeKey(type,data), t = Date.now(), last = Number(recent[key] || 0);
    recent[key] = t;
    return last && (t-last) < 1800;
  }
  function payloadObject(type,payload){
    var data = normalizePayload(type,payload), product=data.product||{}, category=data.category||{}, iso=new Date().toISOString();
    return {
      key:KEY, action:'track', type:type, event:type, Evento:type,
      at:iso, Data:iso, eventId:'qa-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),
      product:data.product||undefined,
      slug:clean(product.slug||product.id||'',120), name:clean(product.name||'',140),
      Produto:clean(product.name||'',140), SlugProduto:clean(product.slug||product.id||'',120),
      category:data.category||undefined, Categoria:clean(category.name||category.slug||'',100),
      term:data.term, Busca:data.term,
      context:data.context, Contexto:data.context,
      resultCount:data.resultCount, Resultados:data.resultCount,
      searchStatus:data.searchStatus, ResultadoBusca:data.searchStatus,
      url:window.location.href, Pagina:window.location.href,
      referrer:document.referrer||'', Origem:document.referrer||'',
      device:deviceName(), Dispositivo:deviceName(), language:navigator.language||'', Idioma:navigator.language||'',
      viewport:viewport(), Viewport:viewport()
    };
  }
  function postAppsScript(obj){
    if(isLocal()) return Promise.resolve(false);
    try {
      return fetch(ENDPOINT,{method:'POST',mode:'no-cors',credentials:'omit',redirect:'follow',cache:'no-store',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(obj)})
        .then(function(){return true;}).catch(function(){return false;});
    } catch(e){ return Promise.resolve(false); }
  }
  function postLocalhost(obj){
    if(!isLocal()) return;
    try {
      fetch('/analytics/track',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)}).catch(function(){});
    } catch(e){}
  }
  function track(type,payload){
    type = clean(type,40);
    if(!type) return false;
    var data = normalizePayload(type,payload||{});
    if(type === 'search' && data.term) lastSearchTerm = data.term;
    if(isDuplicate(type,data)) return false;
    var obj = payloadObject(type,data);
    postAppsScript(obj);
    postLocalhost(obj);
    return true;
  }

  window.qualityAnalyticsTrack = track;
  window.QualityAnalyticsTrack = track;
  window.QualityAnalytics = window.QualityAnalytics || {};
  window.QualityAnalytics.track = track;

  function isFavoriteNow(btn,product){
    if(btn && btn.classList.contains('is-active')) return true;
    try {
      var items=JSON.parse(localStorage.getItem('quality_favoritos_v811')||'[]');
      var key=String(product && (product.slug||product.id||product.url||product.name)||'').trim().toLowerCase();
      return Array.isArray(items)&&items.some(function(item){var k=String(item&&(item.slug||item.id||item.url||item.name||item.nome)||'').trim().toLowerCase();return key&&k===key;});
    } catch(e){return false;}
  }
  function trackInitial(){
    if(!window.__qualityPageViewTrackedV4){ window.__qualityPageViewTrackedV4=true; track('page_view',{context:surface()}); }
    var slug=currentProductSlug();
    if(slug && !window.__qualityProductViewTrackedV4){
      window.__qualityProductViewTrackedV4=true;
      resolveCurrentProduct().then(function(product){ if(product) track('product_view',{product:product,context:'Página do produto'}); });
    }
    var catSlug=currentCategorySlug();
    if(catSlug && !window.__qualityCategoryViewTrackedV4){
      window.__qualityCategoryViewTrackedV4=true;
      loadCategories().then(function(data){
        var items=data&&Array.isArray(data.items)?data.items:[];
        var found=items.find(function(c){return normalize(c&&(c.slug||c.name))===normalize(catSlug);});
        track('category_view',{category:{slug:catSlug,name:clean(found&&(found.name||found.nome)||catSlug,100),url:window.location.href},context:'Categoria'});
      }).catch(function(){track('category_view',{category:{slug:catSlug,name:catSlug,url:window.location.href},context:'Categoria'});});
    }
  }
  function searchTermForControl(control){
    if(!control) return '';
    var id=control.id||'';
    var mobile=/mobile/i.test(id);
    var input=document.getElementById(mobile?'search-input-mobile':'search-input') || document.getElementById('search-input') || document.getElementById('search-input-mobile');
    return clean(input&&input.value||'',100).toLowerCase();
  }
  function checkNoResults(){
    var node=document.getElementById('no-results');
    if(!node||!lastSearchTerm) return;
    var visible = node.style.display !== 'none' && window.getComputedStyle(node).display !== 'none';
    var text=normalize(node.textContent||'');
    if(visible && text.indexOf('nenhum produto')>=0 && lastNoResultTerm!==lastSearchTerm){
      lastNoResultTerm=lastSearchTerm;
      track('search_no_result',{term:lastSearchTerm,searchStatus:'sem_resultado',resultCount:0,context:surface()});
    }
  }

  document.addEventListener('click',function(ev){
    var target=ev.target&&ev.target.closest?ev.target:null;
    if(!target) return;

    var fav=target.closest('[data-quality-fav]');
    if(fav){
      var fp=productFromButton(fav);
      window.setTimeout(function(){if(isFavoriteNow(fav,fp)) track('favorite',{product:fp,context:surface()});},0);
      return;
    }

    var share=target.closest('[data-quality-share]');
    if(share){ track('share_click',{product:productFromButton(share),context:surface()}); return; }

    var wa=target.closest('a.btn-whatsapp,a[href*="wa.me"],a[href*="api.whatsapp.com"]');
    if(wa){
      var wp=productFromElement(wa);
      if(wp) track('whatsapp_click',{product:wp,context:surface()});
      else resolveCurrentProduct().then(function(p){track('whatsapp_click',{product:p||undefined,context:surface()});});
      return;
    }

    var sb=target.closest('#search-button,#search-button-mobile');
    if(sb){ var term=searchTermForControl(sb); if(term) track('search',{term:term,context:surface()}); window.setTimeout(checkNoResults,450); window.setTimeout(checkNoResults,1100); }
  },false);

  document.addEventListener('keydown',function(ev){
    if(ev.key!=='Enter') return;
    var input=ev.target&&ev.target.closest?ev.target.closest('#search-input,#search-input-mobile'):null;
    if(!input) return;
    var term=clean(input.value||'',100).toLowerCase();
    if(term) track('search',{term:term,context:surface()});
    window.setTimeout(checkNoResults,450); window.setTimeout(checkNoResults,1100);
  },false);

  function observeNoResults(){
    var node=document.getElementById('no-results');
    if(!node||node.__qualityAnalyticsObserved) return;
    node.__qualityAnalyticsObserved=true;
    try{ new MutationObserver(function(){window.setTimeout(checkNoResults,20);}).observe(node,{attributes:true,childList:true,subtree:true,characterData:true}); }catch(e){}
  }

  function start(){ trackInitial(); observeNoResults(); window.setTimeout(observeNoResults,600); window.setTimeout(observeNoResults,1600); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();