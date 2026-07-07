/* Quality V8.3.5 - Analytics: coleta real no site
   Coleta silenciosa: visualizações, favoritos, WhatsApp, compartilhamento, buscas e categorias.
   Não altera layout nem comportamento do site. */
(function(){
  if (window.__qualityAnalyticsV835) return;
  window.__qualityAnalyticsV835 = true;

  // Em localhost, usa o endpoint relativo do painel Node.
  // No site publicado (GitHub Pages), envia para o Google Apps Script/Sheets.
  // Pode ser sobrescrito antes deste script, se necessário:
  // window.QUALITY_ANALYTICS_ENDPOINT = 'https://outro-endpoint/exec';
  var DEFAULT_PUBLIC_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var ENDPOINT = window.QUALITY_ANALYTICS_ENDPOINT || (IS_LOCAL ? '/analytics/track' : DEFAULT_PUBLIC_ENDPOINT);
  var ANALYTICS_KEY = window.QUALITY_ANALYTICS_KEY || 'quality-analytics-v1';
  var IS_APPS_SCRIPT = /script\.google\.com\/macros\/s\//i.test(ENDPOINT);

  function clean(v, max){
    return String(v == null ? '' : v).replace(/[<>]/g, '').trim().slice(0, max || 180);
  }

  function slugFromPath(){
    try {
      var parts = location.pathname.split('/').filter(Boolean);
      var i = parts.indexOf('produto');
      if (i >= 0 && parts[i + 1]) return decodeURIComponent(parts[i + 1]);
      return '';
    } catch(e){ return ''; }
  }

  function categoryFromPath(){
    try {
      var parts = location.pathname.split('/').filter(Boolean);
      if (!parts.length) return '';
      if (parts[0] === 'site') return '';
      if (parts[0] === 'produto') return '';
      if (parts[0].includes('.html')) return '';
      return decodeURIComponent(parts[0]);
    } catch(e){ return ''; }
  }

  function absUrl(url){
    try { return new URL(url || location.href, location.origin).href; }
    catch(e){ return location.href; }
  }

  function productFromButton(btn){
    if (!btn) return {};
    return {
      id: clean(btn.getAttribute('data-id') || '', 80),
      slug: clean(btn.getAttribute('data-slug') || '', 120),
      name: clean(btn.getAttribute('data-name') || btn.closest('.product-card,.produto-card,.produto-layout')?.querySelector('h1,h3,strong')?.textContent || 'Produto', 140),
      image: clean(btn.getAttribute('data-image') || '', 260),
      url: absUrl(btn.getAttribute('data-url') || location.href)
    };
  }

  function currentProduct(){
    var slug = slugFromPath();
    var title = document.querySelector('.produto-info h1, #produto-detalhe h1, h1, .product-card h3, .produto-card h3');
    var img = document.querySelector('#produto-detalhe img, .galeria-principal img, .product-card img, .produto-card img');
    return {
      slug: clean(slug, 120),
      name: clean(title ? title.textContent : (slug || document.title || 'Produto'), 140),
      image: clean(img ? (img.getAttribute('src') || '') : '', 260),
      url: location.href
    };
  }

  function payloadBase(extra){
    return Object.assign({
      url: location.href,
      referrer: document.referrer || '',
      language: navigator.language || '',
      viewport: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0),
      device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    }, extra || {});
  }

  function send(type, data){
    try {
      var payload = payloadBase(Object.assign({ type: type, key: ANALYTICS_KEY }, data || {}));
      var body = JSON.stringify(payload);

      // Google Apps Script funciona melhor como requisição simples, sem preflight CORS.
      if (IS_APPS_SCRIPT) {
        if (navigator.sendBeacon) {
          var blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
          if (navigator.sendBeacon(ENDPOINT, blob)) return;
        }
        fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body,
          keepalive: true,
          cache: 'no-store'
        }).catch(function(){});
        return;
      }

      // Painel local Node/Express.
      if (navigator.sendBeacon) {
        var localBlob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, localBlob)) return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        cache: 'no-store'
      }).catch(function(){});
    } catch(e){}
  }

  window.QualityAnalyticsTrack = send;

  function trackInitialPage(){
    send('page_view', {});

    var cat = categoryFromPath();
    if (cat) {
      send('category_view', { category: { slug: cat, name: cat, url: location.href }, slug: cat, name: cat });
    }

    if (slugFromPath()) {
      // Espera o produto carregar por JS antes de pegar nome/imagem.
      // Apenas um disparo para evitar duplicação de product_view.
      setTimeout(function(){ send('product_view', { product: currentProduct() }); }, 900);
    }
  }

  function bindClicks(){
    document.addEventListener('click', function(ev){
      var fav = ev.target.closest && ev.target.closest('[data-quality-fav]');
      if (fav) {
        send('favorite', { product: productFromButton(fav) });
        return;
      }

      var share = ev.target.closest && ev.target.closest('[data-quality-share]');
      if (share) {
        send('share_click', { product: productFromButton(share) });
        return;
      }

      var link = ev.target.closest && ev.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href') || '';

      if (/wa\.me|whatsapp\.com|api\.whatsapp\.com/i.test(href)) {
        var product = productFromButton(link);
        if (!product.name || product.name === 'Produto') product = currentProduct();
        try {
          var decoded = decodeURIComponent(href);
          var m = decoded.match(/interesse\s+em\s+([^\n&]+)/i);
          if (m && m[1]) product.name = clean(m[1], 140);
        } catch(e){}
        send('whatsapp_click', { product: product });
        return;
      }
    }, true);

    document.addEventListener('keydown', function(ev){
      if (ev.key !== 'Enter') return;
      var input = ev.target;
      if (!input || !/(search-input|search-input-mobile)/.test(input.id || '')) return;
      var term = clean(input.value || '', 100);
      if (term) send('search', { term: term, query: term });
    }, true);

    document.addEventListener('click', function(ev){
      var btn = ev.target.closest && ev.target.closest('#search-button,#search-button-mobile');
      if (!btn) return;
      var input = btn.id === 'search-button-mobile' ? document.getElementById('search-input-mobile') : document.getElementById('search-input');
      var term = clean(input && input.value || '', 100);
      if (term) send('search', { term: term, query: term });
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ bindClicks(); trackInitialPage(); });
  } else {
    bindClicks();
    trackInitialPage();
  }
})();
