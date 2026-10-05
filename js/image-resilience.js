/*
 * Quality Image Resilience V1.0.0 - 2026-10-05
 * Recupera falhas transitórias de imagens de produtos sem exigir F5.
 * Escopo conservador: cards de produto/relacionados/favoritos.
 */
(function(){
  'use strict';
  if (window.__qualityImageResilienceV1) return;
  window.__qualityImageResilienceV1 = true;

  var SELECTOR = '.produto-card img, .product-card img, .produto-relacionado-card img, .quality-favorites-panel-item img';
  var FALLBACK = '/images/sem-imagem.png';
  var MAX_RETRIES = 2;
  var RETRY_DELAYS = [350, 1200];
  var priorityBudget = 2;
  var telemetryQueue = [];
  var telemetryTimer = null;
  var observer = null;

  function eligible(img){
    return !!(img && img.tagName === 'IMG' && img.matches && img.matches(SELECTOR));
  }

  function cleanUrl(value){
    try { return new URL(String(value || ''), window.location.href).href; }
    catch (_) { return String(value || ''); }
  }

  function isFallback(value){
    var url = cleanUrl(value);
    return /\/images\/sem-imagem\.png(?:[?#]|$)/i.test(url);
  }

  function baseSource(img){
    var saved = img.getAttribute('data-quality-original-src');
    if (saved) return saved;
    var raw = img.getAttribute('src') || img.currentSrc || '';
    if (!raw || isFallback(raw)) return raw;
    img.setAttribute('data-quality-original-src', raw);
    return raw;
  }

  function productPayload(img){
    try {
      var card = img.closest('.produto-card, .product-card, .produto-relacionado-card, .quality-favorites-panel-item');
      if (!card) return undefined;
      var link = card.querySelector('a[href*="/produto/"]');
      var href = link ? String(link.getAttribute('href') || '') : '';
      var slug = '';
      if (href) {
        var parsed = new URL(href, window.location.href);
        var match = parsed.pathname.match(/\/produto\/([^/]+)/i);
        if (match) slug = decodeURIComponent(match[1]);
      }
      var title = card.querySelector('h3, .quality-favorites-panel-name, .produto-relacionado-title, .product-title');
      return {
        slug: slug,
        name: String((title && title.textContent) || img.getAttribute('alt') || '').trim().slice(0, 140),
        image: baseSource(img) || ''
      };
    } catch (_) { return undefined; }
  }

  function analyticsFn(){
    return window.qualityAnalyticsTrack || window.QualityAnalyticsTrack || (window.QualityAnalytics && window.QualityAnalytics.track);
  }

  function flushTelemetry(){
    var fn = analyticsFn();
    if (typeof fn !== 'function') return false;
    while (telemetryQueue.length) {
      var item = telemetryQueue.shift();
      try { fn(item.type, item.payload); } catch (_) {}
    }
    if (telemetryTimer) { clearInterval(telemetryTimer); telemetryTimer = null; }
    return true;
  }

  function emit(type, img, reason){
    var payload = {
      product: productPayload(img),
      resourceUrl: cleanUrl(baseSource(img) || img.currentSrc || img.src || ''),
      context: 'Imagem de produto',
      reason: String(reason || '').slice(0, 80)
    };
    var fn = analyticsFn();
    if (typeof fn === 'function') {
      try { fn(type, payload); return; } catch (_) {}
    }
    telemetryQueue.push({type:type, payload:payload});
    if (telemetryQueue.length > 30) telemetryQueue.shift();
    if (!telemetryTimer) telemetryTimer = setInterval(flushTelemetry, 800);
  }

  function withRetryParam(raw, attempt){
    if (!raw || /^data:|^blob:/i.test(raw)) return raw;
    try {
      var url = new URL(raw, window.location.href);
      url.searchParams.set('_qir', String(attempt) + '-' + Date.now());
      return url.href;
    } catch (_) {
      return raw + (raw.indexOf('?') >= 0 ? '&' : '?') + '_qir=' + attempt + '-' + Date.now();
    }
  }

  function setFallback(img){
    if (!img || img.dataset.qualityImageFallback === '1') return;
    img.dataset.qualityImageFallback = '1';
    img.dataset.qualityImageRetryPending = '0';
    img.removeAttribute('srcset');
    img.src = FALLBACK;
  }

  function scheduleRetry(img){
    if (!eligible(img) || img.dataset.qualityImageFallback === '1') return;
    var original = baseSource(img);
    if (!original || isFallback(original)) { setFallback(img); return; }

    if (navigator.onLine === false) {
      img.dataset.qualityImageRetryPending = 'offline';
      return;
    }

    var attempt = Number(img.dataset.qualityImageRetryCount || 0);
    if (attempt >= MAX_RETRIES) {
      if (img.dataset.qualityImageFailedTracked !== '1') {
        img.dataset.qualityImageFailedTracked = '1';
        emit('image_failed', img, 'retries_exhausted');
      }
      setFallback(img);
      return;
    }

    attempt += 1;
    img.dataset.qualityImageRetryCount = String(attempt);
    img.dataset.qualityImageRetryPending = '1';
    emit('image_retry', img, 'retry_' + attempt);

    window.setTimeout(function(){
      if (!img.isConnected || img.dataset.qualityImageFallback === '1') return;
      if (navigator.onLine === false) {
        img.dataset.qualityImageRetryPending = 'offline';
        return;
      }
      img.dataset.qualityImageRetryPending = '0';
      img.loading = 'eager';
      img.removeAttribute('srcset');
      img.src = withRetryParam(original, attempt);
    }, RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)]);
  }

  function prepare(img){
    if (!eligible(img) || img.dataset.qualityImageManaged === '1') return;
    img.dataset.qualityImageManaged = '1';
    baseSource(img);
    if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');

    try {
      var rect = img.getBoundingClientRect();
      var nearViewport = rect.bottom >= -80 && rect.top <= (window.innerHeight || 800) * 1.20;
      if (nearViewport) {
        img.loading = 'eager';
        if (priorityBudget > 0 && rect.top < (window.innerHeight || 800)) {
          img.setAttribute('fetchpriority', 'high');
          priorityBudget -= 1;
        } else if (!img.getAttribute('fetchpriority')) {
          img.setAttribute('fetchpriority', 'auto');
        }
      } else if (!img.getAttribute('loading')) {
        img.loading = 'lazy';
      }
    } catch (_) {}

    // O fallback inline antigo impediria o retry. A partir daqui esta rotina assume o tratamento.
    try { img.onerror = null; } catch (_) {}
  }

  function scan(root){
    var base = root && root.querySelectorAll ? root : document;
    if (root && root.nodeType === 1 && root.matches && root.matches(SELECTOR)) prepare(root);
    base.querySelectorAll(SELECTOR).forEach(prepare);
  }

  document.addEventListener('error', function(ev){
    var img = ev && ev.target;
    if (!eligible(img)) return;
    prepare(img);
    try { img.onerror = null; } catch (_) {}
    scheduleRetry(img);
  }, true);

  document.addEventListener('load', function(ev){
    var img = ev && ev.target;
    if (!eligible(img)) return;
    prepare(img);
    var attempts = Number(img.dataset.qualityImageRetryCount || 0);
    if (attempts > 0 && !isFallback(img.currentSrc || img.src) && img.dataset.qualityImageRecoveredTracked !== '1') {
      img.dataset.qualityImageRecoveredTracked = '1';
      img.dataset.qualityImageRetryPending = '0';
      emit('image_recovered', img, 'retry_' + attempts);
    }
  }, true);

  window.addEventListener('online', function(){
    document.querySelectorAll(SELECTOR).forEach(function(img){
      if (img.dataset.qualityImageRetryPending === 'offline') scheduleRetry(img);
    });
  });

  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState !== 'visible') return;
    document.querySelectorAll(SELECTOR).forEach(function(img){
      if (img.dataset.qualityImageRetryPending === 'offline' && navigator.onLine !== false) scheduleRetry(img);
    });
  });

  function start(){
    scan(document);
    if (window.MutationObserver) {
      observer = new MutationObserver(function(mutations){
        mutations.forEach(function(mutation){
          mutation.addedNodes.forEach(function(node){ if (node && node.nodeType === 1) scan(node); });
        });
      });
      observer.observe(document.documentElement, {childList:true, subtree:true});
    }
    flushTelemetry();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
