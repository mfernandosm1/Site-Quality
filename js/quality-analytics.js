(function(){
  if(window.__qualitySiteAnalyticsFavoriteV1) return;
  window.__qualitySiteAnalyticsFavoriteV1 = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var KEY = 'quality-analytics-v1';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function productFromButton(btn){
    return {
      id: clean(btn.getAttribute('data-id') || '',120),
      slug: clean(btn.getAttribute('data-slug') || btn.getAttribute('data-id') || '',120),
      name: clean(btn.getAttribute('data-name') || 'Produto',140),
      image: clean(btn.getAttribute('data-image') || '',260),
      url: clean(btn.getAttribute('data-url') || window.location.href,300)
    };
  }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function directPost(type, product){
    var body = JSON.stringify({
      key:KEY, action:'track', type:type, event:type, Evento:type,
      at:new Date().toISOString(), Data:new Date().toISOString(),
      product:product,
      slug:product.slug, name:product.name,
      Produto:product.name, SlugProduto:product.slug,
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
        if(navigator.sendBeacon(ENDPOINT, blob)) return;
      }
    } catch(e){}
    try {
      fetch(ENDPOINT, {method:'POST', mode:'no-cors', keepalive:true, headers:{'Content-Type':'text/plain;charset=UTF-8'}, body:body});
    } catch(e){}
  }
  function track(type, product){
    try {
      if(typeof window.qualityAnalyticsTrack === 'function'){
        window.qualityAnalyticsTrack(type, {product:product});
        return;
      }
      if(window.QualityAnalytics && typeof window.QualityAnalytics.track === 'function'){
        window.QualityAnalytics.track(type, {product:product});
        return;
      }
    } catch(e){}
    directPost(type, product);
  }
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

  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest ? ev.target.closest('[data-quality-fav]') : null;
    if(!btn) return;
    var product = productFromButton(btn);
    window.setTimeout(function(){
      if(!isFavoriteNow(btn, product)) return; // remoção não vira novo evento
      var stamp = Number(btn.getAttribute('data-quality-analytics-fav-at') || 0);
      var now = Date.now();
      if(stamp && now - stamp < 1500) return;
      btn.setAttribute('data-quality-analytics-fav-at', String(now));
      track('favorite', product);
    }, 0);
  }, false);
})();