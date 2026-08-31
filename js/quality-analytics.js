(function(){
  if(window.__qualitySiteAnalyticsV2) return;
  window.__qualitySiteAnalyticsV2 = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var KEY = 'quality-analytics-v1';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function currentProductSlug(){
    var m = String(window.location.pathname || '').match(//produto/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : '';
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
  function productFromPageFallback(slug){
    var h1 = document.querySelector('h1');
    var name = clean(h1 && h1.textContent || document.title.replace(/s*[–|-]s*Quality Celulares.*$/i,'') || slug, 140);
    var img = document.querySelector('.product-main-image img, .product-image img, main img');
    return {
      id: '',
      slug: clean(slug,120),
      name: name || clean(slug,140),
      image: clean(img && img.getAttribute('src') || '',260),
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
  function directPost(type, payload){
    var data = normalizePayload(type, payload);
    var product = data.product || {};
    var category = data.category || {};
    var body = JSON.stringify({
      key:KEY, action:'track', type:type, event:type, Evento:type,
      at:new Date().toISOString(), Data:new Date().toISOString(),
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
    try {
      if(navigator.sendBeacon){
        var blob = new Blob([body], {type:'text/plain;charset=UTF-8'});
        if(navigator.sendBeacon(ENDPOINT, blob)) return true;
      }
    } catch(e){}
    try {
      fetch(ENDPOINT, {method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=UTF-8'}, body:body});
      return true;
    } catch(e){}
    return false;
  }
  function track(type, payload){
    if(!type) return false;
    return directPost(clean(type,40), payload || {});
  }

  // Compatibilidade com os nomes já usados em outras partes do site.
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
    // Uma abertura real de página deve gerar exatamente um page_view por carregamento.
    track('page_view', {});

    var slug = currentProductSlug();
    if(!slug || window.__qualityProductViewTrackedV2) return;
    window.__qualityProductViewTrackedV2 = true;

    var fallback = productFromPageFallback(slug);
    try {
      fetch('/content/products.json?qa=' + Date.now(), {cache:'no-store'})
        .then(function(r){ if(!r.ok) throw new Error('products'); return r.json(); })
        .then(function(data){
          var items = Array.isArray(data) ? data : (Array.isArray(data && data.items) ? data.items : []);
          var found = items.find(function(p){ return String(p && (p.slug || p.id) || '') === slug; });
          if(!found){ track('product_view', {product:fallback}); return; }
          track('product_view', {product:{
            id: clean(found.id || found.code || '',120),
            slug: clean(found.slug || slug,120),
            name: clean((found.virtualStore && found.virtualStore.name) || found.name || fallback.name,140),
            image: clean(found.image || fallback.image,260),
            url: clean(window.location.href,300)
          }});
        })
        .catch(function(){ track('product_view', {product:fallback}); });
    } catch(e){
      track('product_view', {product:fallback});
    }
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