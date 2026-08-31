(function(){
  if(window.__qualitySiteAnalyticsV3) return;
  window.__qualitySiteAnalyticsV3 = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var KEY = 'quality-analytics-v1';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function currentProductSlug(){
    var m = String(window.location.pathname || '').match(/\/produto\/([^/?#]+)/i);
    if(m) return decodeURIComponent(m[1]);
    try { return clean(new URLSearchParams(window.location.search).get('slug') || new URLSearchParams(window.location.search).get('id') || '',120); }
    catch(e){ return ''; }
  }
  function productFromButton(btn){
    return {
      id: clean(btn.getAttribute('data-id') || '',120),
      slug: clean(btn.getAttribute('data-slug') || btn.getAttribute('data-id') || '',120),
      name: clean(btn.getAttribute('data-name') || 'Produto',140),
      image: clean(btn.getAttribute('data-image') || '',260),
      url: clean(btn.getAttribute('data-url') || window.location.href,300)
    };
  }
  function productFromPage(slug){
    var h1 = document.querySelector('h1');
    var name = clean((h1 && h1.textContent) || document.title.replace(/\s*[–|-]\s*Quality Celulares.*$/i,'') || slug, 140);
    var img = document.querySelector('.product-main-image img, .product-image img, .main-image img, main img');
    return {
      id: '',
      slug: clean(slug,120),
      name: name || clean(slug,140),
      image: clean(img && (img.currentSrc || img.getAttribute('src')) || '',260),
      url: clean(window.location.href,300)
    };
  }
  function normalizePayload(type, payload){
    payload = payload && typeof payload === 'object' ? payload : {};
    var product = payload.product && typeof payload.product === 'object' ? payload.product : null;
    if(!product && (type === 'product_view' || type === 'favorite' || type === 'whatsapp_click' || type === 'share_click')){
      if(payload.slug || payload.name || payload.id) product = payload;
    }
    return {
      product: product,
      category: payload.category && typeof payload.category === 'object' ? payload.category : null,
      term: clean(payload.term || payload.query || '',100)
    };
  }
  function buildBody(type, payload){
    var data = normalizePayload(type, payload);
    var product = data.product || {};
    var category = data.category || {};
    var iso = new Date().toISOString();
    return JSON.stringify({
      key:KEY, action:'track', type:type, event:type, Evento:type,
      at:iso, Data:iso,
      eventId:'qa-' + Date.now() + '-' + Math.random().toString(36).slice(2,10),
      product:data.product || undefined,
      slug:clean(product.slug || product.id || '',120),
      name:clean(product.name || '',140),
      Produto:clean(product.name || '',140),
      SlugProduto:clean(product.slug || product.id || '',120),
      category:data.category || undefined,
      Categoria:clean(category.name || category.slug || '',100),
      term:data.term,
      Busca:data.term,
      url:window.location.href, Pagina:window.location.href,
      referrer:document.referrer || '', Origem:document.referrer || '',
      device:deviceName(), Dispositivo:deviceName(),
      language:navigator.language || '', Idioma:navigator.language || '',
      viewport:String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0),
      Viewport:String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0)
    });
  }
  function postAppsScript(body){
    // Apps Script responde por redirecionamento. fetch/no-cors lida com isso de
    // forma mais confiável que sendBeacon, que podia aceitar a fila e perder o POST.
    try {
      return fetch(ENDPOINT, {
        method:'POST',
        mode:'no-cors',
        credentials:'omit',
        redirect:'follow',
        cache:'no-store',
        keepalive:true,
        headers:{'Content-Type':'text/plain;charset=UTF-8'},
        body:body
      }).then(function(){ return true; }).catch(function(){ return false; });
    } catch(e){ return Promise.resolve(false); }
  }
  function postLocalhost(type, payload){
    if(!/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname || '')) return;
    try {
      var data = normalizePayload(type,payload);
      fetch('/analytics/track', {
        method:'POST',
        credentials:'same-origin',
        keepalive:true,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:type,
          product:data.product || undefined,
          category:data.category || undefined,
          term:data.term,
          url:window.location.href,
          referrer:document.referrer || '',
          device:deviceName(),
          language:navigator.language || '',
          viewport:String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0)
        })
      }).catch(function(){});
    } catch(e){}
  }
  function track(type, payload){
    type = clean(type,40);
    if(!type) return false;
    var body = buildBody(type, payload || {});
    postAppsScript(body);
    postLocalhost(type, payload || {});
    return true;
  }

  window.qualityAnalyticsTrack = track;
  window.QualityAnalyticsTrack = track;
  window.QualityAnalytics = window.QualityAnalytics || {};
  window.QualityAnalytics.track = track;

  function isFavoriteNow(btn, product){
    if(btn.classList.contains('is-active')) return true;
    try {
      var items = JSON.parse(localStorage.getItem('quality_favoritos_v811') || '[]');
      var key = String(product.slug || product.id || product.url || product.name || '').trim().toLowerCase();
      return Array.isArray(items) && items.some(function(item){
        var itemKey = String((item && (item.slug || item.id || item.url || item.name || item.nome)) || '').trim().toLowerCase();
        return key && itemKey === key;
      });
    } catch(e){ return false; }
  }

  function trackPageAndProduct(){
    if(!window.__qualityPageViewTrackedV3){
      window.__qualityPageViewTrackedV3 = true;
      track('page_view', {});
    }

    var slug = currentProductSlug();
    if(!slug || window.__qualityProductViewTrackedV3) return;
    window.__qualityProductViewTrackedV3 = true;

    // Não espera products.json. A própria página já possui nome, slug e imagem.
    // Assim product_view é disparado imediatamente em desktop e mobile.
    track('product_view', {product:productFromPage(slug)});
  }

  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-quality-fav]') : null;
    if(!btn) return;
    var product = productFromButton(btn);
    window.setTimeout(function(){
      if(!isFavoriteNow(btn, product)) return;
      var stamp = Number(btn.getAttribute('data-quality-analytics-fav-at') || 0);
      var now = Date.now();
      if(stamp && now - stamp < 1500) return;
      btn.setAttribute('data-quality-analytics-fav-at', String(now));
      track('favorite', {product:product});
    }, 0);
  }, false);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', trackPageAndProduct, {once:true});
  else trackPageAndProduct();
})();