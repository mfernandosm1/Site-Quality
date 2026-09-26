(function(){
  if(window.__qualitySiteAnalyticsV11) return;
  window.__qualitySiteAnalyticsV11 = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
  var KEY = 'quality-analytics-v1';
  var recent = Object.create(null);
  var catalogPromise = null;
  var categoriesPromise = null;
  var currentProductCache = null;
  var lastSearchTerm = '';
  var lastNoResultTerm = '';
  var engagementVisibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
  var engagementPendingMs = 0;
  var pageVisitId = 'pv-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
  var VISITOR_KEY = 'quality-analytics-visitor-v2';
  var SESSION_KEY = 'quality-analytics-session-v2';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  function randomAnalyticsId(prefix){
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function safeStorageGet(key){
    try { var value=localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch(e){ return null; }
  }
  function safeStorageSet(key,value){ try { localStorage.setItem(key,JSON.stringify(value)); } catch(e){} }
  function ensureAudienceState(){
    var nowMs=Date.now();
    var visitor=safeStorageGet(VISITOR_KEY);
    if(!visitor || !visitor.id){ visitor={id:randomAnalyticsId('v'),firstSeen:nowMs,lastSeen:nowMs,sessionCount:0}; }
    var session=safeStorageGet(SESSION_KEY);
    var expired=!session || !session.id || session.visitorId!==visitor.id || !session.lastActivity || (nowMs-Number(session.lastActivity))>SESSION_TIMEOUT_MS;
    if(expired){
      visitor.sessionCount=Math.max(0,Number(visitor.sessionCount)||0)+1;
      session={id:randomAnalyticsId('s'),visitorId:visitor.id,startedAt:nowMs,lastActivity:nowMs,number:visitor.sessionCount};
    } else {
      session.lastActivity=nowMs;
      if(!session.number) session.number=Math.max(1,Number(visitor.sessionCount)||1);
      visitor.sessionCount=Math.max(Number(visitor.sessionCount)||0,Number(session.number)||1);
    }
    visitor.lastSeen=nowMs;
    safeStorageSet(VISITOR_KEY,visitor); safeStorageSet(SESSION_KEY,session);
    return {visitor:visitor,session:session};
  }
  var audienceState = ensureAudienceState();
  function touchAudienceState(){ audienceState=ensureAudienceState(); return audienceState; }
  var perfState = { lcp:0, cls:0, clsSessionValue:0, clsSessionStart:0, clsSessionLast:0, interactions:Object.create(null) };
  var perfLastSignature = '';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function normalize(v){ return clean(v,160).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
  function isLocal(){ return /^(localhost|127.0.0.1)$/i.test(window.location.hostname || ''); }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function viewport(){ return String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0); }
  function currentProductSlug(){
    var m = String(window.location.pathname || '').match(//produto/([^/?#]+)/i);
    if(m) return decodeURIComponent(m[1]);
    try { return clean(new URLSearchParams(window.location.search).get('slug') || new URLSearchParams(window.location.search).get('id') || '',120); }
    catch(e){ return ''; }
  }
  function currentCategorySlug(){
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('slug') || params.get('cat') || params.get('categoria');
      if(q) return clean(q,120);
    } catch(e){}
    var path = String(window.location.pathname || '').replace(/^/+|/+$/g,'');
    var first = path.split('/')[0] || '';
    if(!first || /^(site|produto|index.html|categoria.html|comparar.html|sobre.html|formas-de-pagamento.html)$/i.test(first)) return '';
    return clean(first,120);
  }
  function surface(){
    var p = String(window.location.pathname || '').toLowerCase();
    if(/comparar.html/.test(p)) return 'Comparador';
    if(currentProductSlug() || //produto//.test(p) || /produto.html/.test(p)) return 'Página do produto';
    if(currentCategorySlug() || /categoria.html/.test(p)) return 'Categoria';
    if(p === '/' || /(?:^|/)index.html$/.test(p) || //site/view/?$/.test(p) || //site/view/index.html$/.test(p)) return 'Home';
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
        var m = String(link.getAttribute('href') || '').match(//produto/([^/?#]+)/i);
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
      name:clean((h1 && h1.textContent) || document.title.replace(/s*[–|-]s*Quality Celulares.*$/i,'') || slug,140),
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
    if(!product && (type === 'product_view' || type === 'favorite' || type === 'favorite_remove' || type === 'whatsapp_click' || type === 'share_click')){
      if(payload.slug || payload.name || payload.id) product = payload;
    }
    var category = payload.category && typeof payload.category === 'object' ? payload.category : null;
    var comparison = payload.comparison && typeof payload.comparison === 'object' ? payload.comparison : {};
    var performance = payload.performance && typeof payload.performance === 'object' ? payload.performance : {};
    function num(value){ var n=Number(value); return Number.isFinite(n) ? n : undefined; }
    var comparisonSlugs = Array.isArray(comparison.slugs) ? comparison.slugs.map(function(v){return clean(v,120);}).filter(Boolean).slice(0,3) : String(payload.comparisonSlugs || '').split(',').map(function(v){return clean(v,120);}).filter(Boolean).slice(0,3);
    var comparisonNames = Array.isArray(comparison.names) ? comparison.names.map(function(v){return clean(v,140);}).filter(Boolean).slice(0,3) : String(payload.comparisonNames || '').split('||').map(function(v){return clean(v,140);}).filter(Boolean).slice(0,3);
    return {
      product: product,
      category: category,
      term: clean(payload.term || payload.query || '',100).toLowerCase(),
      context: clean(payload.context || surface(),80),
      resultCount: Number.isFinite(Number(payload.resultCount)) ? Number(payload.resultCount) : undefined,
      searchStatus: clean(payload.searchStatus || '',40),
      durationSeconds: Number.isFinite(Number(payload.durationSeconds)) ? Math.max(0, Math.round(Number(payload.durationSeconds))) : undefined,
      pageVisitId: clean(payload.pageVisitId || pageVisitId || '',80),
      visitorId: clean(payload.visitorId || '',80),
      sessionId: clean(payload.sessionId || '',80),
      visitorType: clean(payload.visitorType || '',20),
      sessionNumber: Number.isFinite(Number(payload.sessionNumber)) ? Math.max(1,Math.round(Number(payload.sessionNumber))) : undefined,
      sessionStartedAt: Number.isFinite(Number(payload.sessionStartedAt)) ? Number(payload.sessionStartedAt) : undefined,
      errorMessage: clean(payload.errorMessage || '',220),
      resourceUrl: clean(payload.resourceUrl || '',300),
      reason: clean(payload.reason || '',80),
      comparison: {
        slugs: comparisonSlugs,
        names: comparisonNames,
        count: Math.max(0, Math.min(3, Number(comparison.count || payload.comparisonCount || comparisonSlugs.length || 0) || 0)),
        actionSlug: clean(comparison.actionSlug || payload.actionSlug || '',120)
      },
      performance: {
        lcpMs:num(performance.lcpMs ?? payload.lcpMs), inpMs:num(performance.inpMs ?? payload.inpMs), cls:num(performance.cls ?? payload.cls),
        fcpMs:num(performance.fcpMs ?? payload.fcpMs), ttfbMs:num(performance.ttfbMs ?? payload.ttfbMs), loadMs:num(performance.loadMs ?? payload.loadMs),
        domContentLoadedMs:num(performance.domContentLoadedMs ?? payload.domContentLoadedMs), transferKb:num(performance.transferKb ?? payload.transferKb),
        imageKb:num(performance.imageKb ?? payload.imageKb), jsKb:num(performance.jsKb ?? payload.jsKb), cssKb:num(performance.cssKb ?? payload.cssKb),
        heavyImages:num(performance.heavyImages ?? payload.heavyImages), heavyScripts:num(performance.heavyScripts ?? payload.heavyScripts), heavyStyles:num(performance.heavyStyles ?? payload.heavyStyles),
        resourceCount:num(performance.resourceCount ?? payload.resourceCount), connectionType:clean(performance.connectionType || payload.connectionType || '',30)
      }
    };
  }
  function dedupeKey(type,data){
    var p = data.product || {}, c = data.category || {};
    var comp=(data.comparison&&data.comparison.slugs||[]).join(',');
    return [type,clean(p.slug||p.id||p.name,120),clean(c.slug||c.name,120),data.term,data.searchStatus,comp].join('|').toLowerCase();
  }
  function isDuplicate(type,data){
    if(type === 'page_engagement' || type === 'web_vitals') return false;
    var key = dedupeKey(type,data), t = Date.now(), last = Number(recent[key] || 0);
    recent[key] = t;
    return last && (t-last) < 1800;
  }
  function payloadObject(type,payload){
    var data = normalizePayload(type,payload), product=data.product||{}, category=data.category||{}, iso=new Date().toISOString();
    var aud=touchAudienceState(), visitor=aud.visitor||{}, session=aud.session||{};
    var visitorType=Number(session.number||1)>1?'recorrente':'novo';
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
      durationSeconds:data.durationSeconds, TempoSegundos:data.durationSeconds,
      pageVisitId:data.pageVisitId, VisitaPagina:data.pageVisitId,
      visitorId:clean(visitor.id||data.visitorId||'',80), VisitanteId:clean(visitor.id||data.visitorId||'',80),
      sessionId:clean(session.id||data.sessionId||'',80), SessaoId:clean(session.id||data.sessionId||'',80),
      visitorType:visitorType, TipoVisitante:visitorType,
      sessionNumber:Number(session.number||data.sessionNumber||1), NumeroSessao:Number(session.number||data.sessionNumber||1),
      sessionStartedAt:Number(session.startedAt||data.sessionStartedAt||Date.now()), InicioSessao:Number(session.startedAt||data.sessionStartedAt||Date.now()),
      errorMessage:data.errorMessage, Erro:data.errorMessage, resourceUrl:data.resourceUrl, Recurso:data.resourceUrl,
      reason:data.reason, Motivo:data.reason,
      comparison:data.comparison,
      comparisonSlugs:(data.comparison.slugs||[]).join(','), ComparacaoSlugs:(data.comparison.slugs||[]).join(','),
      comparisonNames:(data.comparison.names||[]).join('||'), ComparacaoNomes:(data.comparison.names||[]).join('||'),
      comparisonCount:data.comparison.count, ComparacaoQuantidade:data.comparison.count,
      actionSlug:data.comparison.actionSlug, ComparacaoProduto:data.comparison.actionSlug,
      performance:data.performance,
      lcpMs:data.performance.lcpMs, LCP:data.performance.lcpMs,
      inpMs:data.performance.inpMs, INP:data.performance.inpMs,
      cls:data.performance.cls, CLS:data.performance.cls,
      fcpMs:data.performance.fcpMs, FCP:data.performance.fcpMs,
      ttfbMs:data.performance.ttfbMs, TTFB:data.performance.ttfbMs,
      loadMs:data.performance.loadMs, LoadMs:data.performance.loadMs,
      domContentLoadedMs:data.performance.domContentLoadedMs, DOMContentLoadedMs:data.performance.domContentLoadedMs,
      transferKb:data.performance.transferKb, TransferKB:data.performance.transferKb,
      imageKb:data.performance.imageKb, ImageKB:data.performance.imageKb,
      jsKb:data.performance.jsKb, JsKB:data.performance.jsKb,
      cssKb:data.performance.cssKb, CssKB:data.performance.cssKb,
      heavyImages:data.performance.heavyImages, ImagensPesadas:data.performance.heavyImages,
      heavyScripts:data.performance.heavyScripts, ScriptsPesados:data.performance.heavyScripts,
      heavyStyles:data.performance.heavyStyles, EstilosPesados:data.performance.heavyStyles,
      resourceCount:data.performance.resourceCount, Recursos:data.performance.resourceCount,
      connectionType:data.performance.connectionType, Conexao:data.performance.connectionType,
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
  window.QualityAnalytics.searchNoResult = function(term,context){
    term=clean(term||lastSearchTerm,100).toLowerCase();
    if(!term) return false;
    lastSearchTerm=term;
    lastNoResultTerm=term;
    return track('search_no_result',{term:term,searchStatus:'sem_resultado',resultCount:0,context:context||surface()});
  };

  function isFavoriteNow(btn,product){
    if(btn && btn.classList.contains('is-active')) return true;
    try {
      var items=JSON.parse(localStorage.getItem('quality_favoritos_v811')||'[]');
      var key=String(product && (product.slug||product.id||product.url||product.name)||'').trim().toLowerCase();
      return Array.isArray(items)&&items.some(function(item){var k=String(item&&(item.slug||item.id||item.url||item.name||item.nome)||'').trim().toLowerCase();return key&&k===key;});
    } catch(e){return false;}
  }

  function supportedPerfType(type){
    try { return !!(window.PerformanceObserver && PerformanceObserver.supportedEntryTypes && PerformanceObserver.supportedEntryTypes.indexOf(type) >= 0); }
    catch(e){ return false; }
  }
  function initPerformanceObservers(){
    if(!window.PerformanceObserver) return;
    try {
      if(supportedPerfType('largest-contentful-paint')) new PerformanceObserver(function(list){
        list.getEntries().forEach(function(entry){ perfState.lcp = Math.max(perfState.lcp, Number(entry.startTime || 0)); });
      }).observe({type:'largest-contentful-paint',buffered:true});
    } catch(e){}
    try {
      if(supportedPerfType('layout-shift')) new PerformanceObserver(function(list){
        list.getEntries().forEach(function(entry){
          if(entry.hadRecentInput) return;
          var t=Number(entry.startTime||0), value=Number(entry.value||0);
          if(!perfState.clsSessionStart || t-perfState.clsSessionLast>1000 || t-perfState.clsSessionStart>5000){ perfState.clsSessionStart=t; perfState.clsSessionValue=value; }
          else perfState.clsSessionValue += value;
          perfState.clsSessionLast=t;
          perfState.cls=Math.max(perfState.cls,perfState.clsSessionValue);
        });
      }).observe({type:'layout-shift',buffered:true});
    } catch(e){}
    try {
      if(supportedPerfType('event')) new PerformanceObserver(function(list){
        list.getEntries().forEach(function(entry){
          var id=Number(entry.interactionId||0); if(!id) return;
          perfState.interactions[id]=Math.max(Number(perfState.interactions[id]||0),Number(entry.duration||0));
        });
      }).observe({type:'event',buffered:true,durationThreshold:40});
    } catch(e){}
  }
  function currentInp(){
    var values=Object.keys(perfState.interactions).map(function(k){return Number(perfState.interactions[k]||0);}).filter(function(v){return v>0;}).sort(function(a,b){return b-a;});
    if(!values.length) return 0;
    var rank=Math.min(Math.floor(values.length/50),values.length-1);
    return Math.round(values[rank]);
  }
  function resourcePerformance(){
    var result={transferKb:0,imageKb:0,jsKb:0,cssKb:0,heavyImages:0,heavyScripts:0,heavyStyles:0,resourceCount:0};
    try {
      var entries=performance.getEntriesByType('resource')||[]; result.resourceCount=entries.length;
      entries.forEach(function(entry){
        var bytes=Number(entry.transferSize||entry.encodedBodySize||0); if(!bytes) return;
        var kb=bytes/1024; result.transferKb+=kb;
        var type=String(entry.initiatorType||'').toLowerCase();
        var name=String(entry.name||'').toLowerCase();
        var image=type==='img'||/.(?:png|jpe?g|webp|avif|gif|svg)(?:?|$)/.test(name);
        var script=type==='script'||/.js(?:?|$)/.test(name);
        var style=type==='css'||type==='link'&&/.css(?:?|$)/.test(name)||/.css(?:?|$)/.test(name);
        if(image){ result.imageKb+=kb; if(kb>=300) result.heavyImages+=1; }
        if(script){ result.jsKb+=kb; if(kb>=180) result.heavyScripts+=1; }
        if(style){ result.cssKb+=kb; if(kb>=120) result.heavyStyles+=1; }
      });
      Object.keys(result).forEach(function(key){ if(/Kb$/.test(key)) result[key]=Math.round(result[key]); });
    } catch(e){}
    return result;
  }
  function collectPerformancePayload(){
    var perf={lcpMs:Math.round(perfState.lcp||0),inpMs:currentInp(),cls:Math.round(Number(perfState.cls||0)*1000)/1000,fcpMs:0,ttfbMs:0,loadMs:0,domContentLoadedMs:0,connectionType:''};
    try { var fcp=(performance.getEntriesByName('first-contentful-paint')||[])[0]; if(fcp) perf.fcpMs=Math.round(fcp.startTime||0); } catch(e){}
    try { var nav=(performance.getEntriesByType('navigation')||[])[0]; if(nav){ perf.ttfbMs=Math.round(nav.responseStart||0); perf.loadMs=Math.round(nav.loadEventEnd||0); perf.domContentLoadedMs=Math.round(nav.domContentLoadedEventEnd||0); } } catch(e){}
    try { perf.connectionType=clean((navigator.connection&&navigator.connection.effectiveType)||'',30); } catch(e){}
    var resources=resourcePerformance(); Object.keys(resources).forEach(function(k){perf[k]=resources[k];});
    return perf;
  }
  function sendWebVitals(reason){
    if(!window.performance) return false;
    var perf=collectPerformancePayload();
    if(!perf.lcpMs && !perf.fcpMs && !perf.ttfbMs) return false;
    var signature=[perf.lcpMs,perf.inpMs,perf.cls,perf.transferKb,perf.resourceCount].join('|');
    if(signature===perfLastSignature && reason!=='pagehide') return false;
    perfLastSignature=signature;
    return track('web_vitals',{performance:perf,pageVisitId:pageVisitId,context:surface(),reason:reason||'sample'});
  }

  function accumulateEngagement(){
    if(engagementVisibleSince){
      engagementPendingMs += Math.max(0, Date.now() - engagementVisibleSince);
      engagementVisibleSince = 0;
    }
  }
  function resumeEngagement(){
    if(!engagementVisibleSince && document.visibilityState === 'visible') engagementVisibleSince = Date.now();
  }
  function flushEngagement(reason){
    accumulateEngagement();
    var seconds = Math.round(engagementPendingMs / 1000);
    engagementPendingMs = 0;
    if(seconds < 2) return false;
    return track('page_engagement',{durationSeconds:seconds,pageVisitId:pageVisitId,context:surface(),reason:reason||''});
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
      // O handler dos favoritos do site roda em capture e interrompe a propagacao.
      // Este listener tambem usa capture; apos o toggle, lemos o estado real salvo.
      window.setTimeout(function(){
        var active=isFavoriteNow(fav,fp);
        track(active?'favorite':'favorite_remove',{product:fp,context:surface()});
      },0);
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
  },true);

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

  window.addEventListener('error',function(ev){
    try{
      var target=ev&&ev.target;
      if(target&&target!==window&&target.tagName){
        var src=target.currentSrc||target.src||target.href||'';
        if(src) track('resource_error',{resourceUrl:src,errorMessage:'Falha ao carregar recurso',context:surface(),reason:String(target.tagName||'recurso').toLowerCase()});
        return;
      }
      var message=clean(ev&&ev.message||'Erro JavaScript',220);
      track('client_error',{errorMessage:message,resourceUrl:clean(ev&&ev.filename||'',300),context:surface(),reason:'javascript'});
    }catch(e){}
  },true);
  window.addEventListener('unhandledrejection',function(ev){
    try{
      var reason=ev&&ev.reason;var message=clean(reason&&reason.message||reason||'Promise rejeitada',220);
      track('client_error',{errorMessage:message,context:surface(),reason:'promise'});
    }catch(e){}
  });

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState === 'hidden'){ flushEngagement('hidden'); sendWebVitals('hidden'); } else resumeEngagement();
  });
  window.addEventListener('pagehide',function(){ flushEngagement('pagehide'); sendWebVitals('pagehide'); });
  window.addEventListener('beforeunload',function(){ flushEngagement('beforeunload'); sendWebVitals('beforeunload'); });

  function start(){ trackInitial(); observeNoResults(); initPerformanceObservers(); window.setTimeout(observeNoResults,600); window.setTimeout(observeNoResults,1600); window.setTimeout(function(){sendWebVitals('10s');},10000); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
