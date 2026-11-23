(function(){
  // Consentimento explícito compartilhado apenas entre os subdomínios da Quality.
  function qaChoice(){
    var hit=document.cookie.match(/(?:^|;\s*)quality_analytics_consent=(yes|no)(?:;|$)/);
    if(hit)return hit[1];
    try{return localStorage.getItem('quality_analytics_consent')||'';}catch(e){return '';}
  }
  function qaSave(choice){
    try{
      localStorage.setItem('quality_analytics_consent',choice);
      // Revogação: apaga os identificadores analíticos antigos, não os dados
      // comerciais do cliente (carrinho/favoritos/autenticação).
      if(choice!=='yes'){
        localStorage.removeItem('quality-analytics-visitor-v2');
        localStorage.removeItem('quality-analytics-session-v2');
        sessionStorage.removeItem('quality-analytics-geo-v2');
        sessionStorage.removeItem('quality-analytics-search-submit-v1');
        sessionStorage.removeItem('quality-analytics-search-results-v1');
      }
    }catch(e){}
    var domain=/(^|\.)qualitycel\.com\.br$/.test(location.hostname)?'; Domain=.qualitycel.com.br':'';
    document.cookie='quality_analytics_consent='+choice+'; Path=/; Max-Age=15552000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')+domain;
  }
  function qaChoices(){
    if(document.getElementById('qa-consent-prompt'))return;
    if(!document.getElementById('quality-cookie-banner-styles')){
      var style=document.createElement('style');style.id='quality-cookie-banner-styles';
      style.textContent="#qa-consent-prompt{position:fixed;z-index:2147483000;right:0;bottom:0;left:0;box-sizing:border-box;padding:14px 22px calc(14px + env(safe-area-inset-bottom, 0px));background:#fff;color:#303030;border-top:1px solid #e4e4e4;box-shadow:0 -3px 18px rgba(0,0,0,.12);font:14px/1.5 Arial,system-ui,sans-serif;text-align:left}\n#qa-consent-prompt,#qa-consent-prompt *{box-sizing:border-box}\n#qa-consent-prompt .qcookie-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px}\n#qa-consent-prompt .qcookie-copy{margin:0;min-width:0;flex:1 1 auto;color:#3b3b3b;font:inherit}\n#qa-consent-prompt .qcookie-copy a{color:#ba0000;text-decoration:underline;text-underline-offset:2px;font-weight:600}\n#qa-consent-prompt .qcookie-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex:0 0 auto}\n#qa-consent-prompt .qcookie-actions button{appearance:none;min-width:106px;min-height:40px;padding:8px 16px;border:1px solid #c50000;border-radius:6px;background:#c50000;color:#fff;cursor:pointer;font:600 13px/1.3 Arial,system-ui,sans-serif;box-shadow:none;white-space:nowrap}\n#qa-consent-prompt .qcookie-actions button[data-choice=\"no\"]{background:#fff;color:#4a4a4a;border-color:#bfc0c4}\n#qa-consent-prompt .qcookie-actions button:hover{filter:brightness(.96)}\n#qa-consent-prompt .qcookie-actions button:focus-visible,#qa-consent-prompt .qcookie-copy a:focus-visible{outline:3px solid #222;outline-offset:3px}\n@media(max-width:760px){#qa-consent-prompt{padding:12px 16px calc(12px + env(safe-area-inset-bottom, 0px));font-size:13px}#qa-consent-prompt .qcookie-inner{display:block}#qa-consent-prompt .qcookie-actions{justify-content:flex-end;margin-top:10px}#qa-consent-prompt .qcookie-actions button{flex:1 1 auto;min-width:0;max-width:200px}}";
      document.head.appendChild(style);
    }
    var el=document.createElement('section');el.id='qa-consent-prompt';
    el.setAttribute('role','region');el.setAttribute('aria-label','Aviso sobre cookies');
    var inner=document.createElement('div');inner.className='qcookie-inner';
    var message=document.createElement('p');message.className='qcookie-copy';
    message.appendChild(document.createTextNode('Usamos estatísticas básicas de acesso sem identificadores de visitantes. Se você aceitar, ativamos análise detalhada com cookies e Google Analytics. Saiba mais em nossa '));
    var policy=document.createElement('a');policy.href="/privacidade-clientes.html";policy.textContent='Política de Privacidade';
    message.appendChild(policy);message.appendChild(document.createTextNode('.'));
    inner.appendChild(message);
    var actions=document.createElement('div');actions.className='qcookie-actions';
    [['Aceitar','yes'],['Recusar','no']].forEach(function(choice){
      var button=document.createElement('button');button.type='button';button.textContent=choice[0];
      button.setAttribute('data-choice',choice[1]);
      button.addEventListener('click',function(){qaSave(choice[1]);el.remove();location.reload();});
      actions.appendChild(button);
    });
    inner.appendChild(actions);el.appendChild(inner);document.body.appendChild(el);
  }
  function qaPrivacyFooter(){
    // O rodapé é carregado de forma assíncrona em #footer pelo main.js.
    // O controle nunca deve ser colocado diretamente no body (faixa branca fora do rodapé).
    function mount(){
      var footer=document.querySelector('#footer footer, footer.footer, footer');
      if(!footer)return false;
      var nav=footer.querySelector('.footer-nav-quality')||footer.querySelector('.footer-container')||footer;
      var button=document.getElementById('qa-consent-reopen');
      if(button&&button.parentNode!==nav){button.remove();button=null;}
      if(!button){
        button=document.createElement('button');button.type='button';button.id='qa-consent-reopen';
        button.textContent='Preferências de privacidade';
        button.style.cssText='display:block;margin:7px 0 0;padding:0;border:0;background:transparent;color:#cbd5e1;font:12px/1.5 system-ui,Arial,sans-serif;text-align:left;cursor:pointer';
        button.addEventListener('click',qaChoices);
        nav.appendChild(button);
      }
      return true;
    }
    var slot=document.getElementById('footer');
    if(slot){
      // Se o main.js substituir o conteúdo do slot, reinserir o controle no rodapé novo.
      var observer=new MutationObserver(function(){mount();});
      observer.observe(slot,{childList:true,subtree:true});
      mount();
    }else if(!mount()){
      // Páginas que injetam o footer sem #footer: aguardar apenas até ele surgir.
      var later=new MutationObserver(function(){if(mount())later.disconnect();});
      later.observe(document.body,{childList:true,subtree:true});
    }
    if(!qaChoice())qaChoices();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',qaPrivacyFooter,{once:true});else qaPrivacyFooter();
  // A coleta básica não depende de consentimento; a identificação de visitantes,
  // geolocalização por IP e serviços de terceiros dependem de aceite explícito.
  // GA4 carrega apenas depois do consentimento; o ID vem do SEO configurado.
  function qaStartGa(){
    fetch('/content/seo.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null}).then(function(cfg){
      var id=cfg&&typeof cfg.analyticsId==='string'?cfg.analyticsId:'G-9HPD9XCELH';
      if(!/^G-[A-Z0-9]+$/i.test(id)||document.querySelector('script[data-quality-consented-ga]'))return;
      window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
      window.gtag('js',new Date());window.gtag('config',id,{send_page_view:false,page_location:location.origin+location.pathname,anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});window.gtag('event','page_view',{page_location:location.origin+location.pathname,page_title:document.title.slice(0,120)});
      var s=document.createElement('script');s.async=true;s.dataset.qualityConsentedGa='1';s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(s);
    });
  }
  if(qaChoice()==='yes')qaStartGa();
  if(window.__qualitySiteAnalyticsV15) return;
  window.__qualitySiteAnalyticsV15 = true;

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
  var GEO_KEY = 'quality-analytics-geo-v2';
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var SEARCH_MARKER_KEY = 'quality-analytics-search-submit-v1';
  var SEARCH_RESULTS_KEY = 'quality-analytics-search-results-v1';
  var GEO_RETRY_MS = 30 * 1000;
  var GEO_PROVIDER_TIMEOUT_MS = 5500;
  var GEO_MAX_ATTEMPTS_PER_SESSION = 3;
  var geoState = null;
  var geoPromise = null;
  function randomAnalyticsId(prefix){
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function safeStorageGet(key){
    try { var value=localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch(e){ return null; }
  }
  function safeStorageSet(key,value){ try { localStorage.setItem(key,JSON.stringify(value)); } catch(e){} }
  function safeSessionGet(key){
    try { var value=sessionStorage.getItem(key); return value ? JSON.parse(value) : null; } catch(e){ return null; }
  }
  function safeSessionSet(key,value){ try { sessionStorage.setItem(key,JSON.stringify(value)); } catch(e){} }
  function campaignFromUrl(){
    var result={utmSource:'',utmMedium:'',utmCampaign:'',utmContent:'',utmTerm:''};
    try{
      var params=new URLSearchParams(window.location.search||'');
      result.utmSource=clean(params.get('utm_source')||'',100);
      result.utmMedium=clean(params.get('utm_medium')||'',100);
      result.utmCampaign=clean(params.get('utm_campaign')||'',160);
      result.utmContent=clean(params.get('utm_content')||'',160);
      result.utmTerm=clean(params.get('utm_term')||'',160);
    }catch(e){}
    return result;
  }
  function ensureAudienceState(){
    var nowMs=Date.now();
    var visitor=safeStorageGet(VISITOR_KEY);
    if(!visitor || !visitor.id){ visitor={id:randomAnalyticsId('v'),firstSeen:nowMs,lastSeen:nowMs,sessionCount:0}; }
    var session=safeStorageGet(SESSION_KEY);
    var expired=!session || !session.id || session.visitorId!==visitor.id || !session.lastActivity || (nowMs-Number(session.lastActivity))>SESSION_TIMEOUT_MS;
    if(expired){
      visitor.sessionCount=Math.max(0,Number(visitor.sessionCount)||0)+1;
      var campaign=campaignFromUrl();
      session={
        id:randomAnalyticsId('s'),visitorId:visitor.id,startedAt:nowMs,lastActivity:nowMs,number:visitor.sessionCount,
        landingPage:clean(window.location.href||'',500),sessionReferrer:clean(document.referrer||'',500),campaign:campaign
      };
    } else {
      session.lastActivity=nowMs;
      if(!session.number) session.number=Math.max(1,Number(visitor.sessionCount)||1);
      if(!session.landingPage) session.landingPage=clean(window.location.href||'',500);
      if(!session.sessionReferrer) session.sessionReferrer=clean(document.referrer||'',500);
      if(!session.campaign) session.campaign=campaignFromUrl();
      visitor.sessionCount=Math.max(Number(visitor.sessionCount)||0,Number(session.number)||1);
    }
    visitor.lastSeen=nowMs;
    safeStorageSet(VISITOR_KEY,visitor); safeStorageSet(SESSION_KEY,session);
    return {visitor:visitor,session:session};
  }
  // Sem aceite: não ler/criar visitorId, sessionId, cookies ou storage analítico.
  var audienceState = qaChoice()==='yes' ? ensureAudienceState() : null;
  function touchAudienceState(){
    if(qaChoice()!=='yes')return {visitor:{},session:{}};
    audienceState=ensureAudienceState();return audienceState;
  }
  var perfState = { lcp:0, cls:0, clsSessionValue:0, clsSessionStart:0, clsSessionLast:0, interactions:Object.create(null) };
  var perfLastSignature = '';

  function clean(v, max){ return String(v == null ? '' : v).trim().slice(0, max || 300); }
  function normalize(v){ return clean(v,160).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function isLocal(){ var h=String(window.location.hostname||''); return /^(localhost|127\.)/i.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h)||String(window.location.pathname||'').indexOf('/site/')===0; }
  function deviceName(){ return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ? 'mobile' : 'desktop'; }
  function viewport(){ return String(window.innerWidth || 0) + 'x' + String(window.innerHeight || 0); }
  function currentProductSlug(){
    var m = String(window.location.pathname || '').match(/\/produto\/([^/?#]+)/i);
    if(m) return decodeURIComponent(m[1]);
    try { return clean(new URLSearchParams(window.location.search).get('slug') || new URLSearchParams(window.location.search).get('id') || '',120); }
    catch(e){ return ''; }
  }
  function currentCategorySlug(){
    var pathname = String(window.location.pathname || '');
    var normalizedPath = pathname.toLowerCase();
    // Produto antigo usa produto.html?slug=...; esse slug nunca é categoria.
    if(/\/produto\//i.test(pathname) || /(?:^|\/)produto\.html$/i.test(normalizedPath)) return '';
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('cat') || params.get('categoria');
      if(!q && /(?:^|\/)categoria\.html$/i.test(normalizedPath)) q = params.get('slug');
      if(q) return clean(q,120);
    } catch(e){}
    // Páginas de conteúdo e resultados de busca não são categorias.
    // A regra antiga classificava quality-club.html, sobre.html e outros HTMLs
    // como categorias, inflando indevidamente a métrica de category_view.
    var parts=pathname.split('/').filter(Boolean);
    if(parts[0]&&parts[0].toLowerCase()==='categoria'&&parts[1])return clean(parts[1],120);
    var first=(parts[0]||'').toLowerCase();
    if(/^(smartphones|acessorios|eletronicos)$/.test(first))return clean(first,120);
    return '';
  }
  function surface(){
    var p = String(window.location.pathname || '').toLowerCase();
    if(/comparar\.html/.test(p)) return 'Comparador';
    if(currentProductSlug() || /\/produto\//.test(p) || /produto\.html/.test(p)) return 'Página do produto';
    if(/(?:^|\/)categoria\.html$/.test(p)){
      try { if(new URLSearchParams(window.location.search).has('busca'))return 'Resultados de busca'; } catch(e){}
    }
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
    if(!catalogPromise) {
      var source = window.QualityPublicCatalog ? window.QualityPublicCatalog.load() : fetchFirstJson(['/content/catalog-public.json','/site/content/catalog-public.json']);
      catalogPromise = source.catch(function(){ catalogPromise = null; return {items:[]}; });
    }
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
    if(currentProductCache) return currentProductCache;
    // No celular o WhatsApp pode assumir a tela imediatamente após o clique.
    // Não dependemos de uma busca assíncrona no catálogo para registrar o evento:
    // a própria página já possui slug, nome e imagem suficientes.
    var currentSlug=currentProductSlug();
    return currentSlug ? productFromDom(currentSlug) : null;
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
    if(!product && (type === 'product_view' || type === 'favorite' || type === 'favorite_remove' || type === 'list_add' || type === 'list_remove' || type === 'whatsapp_click' || type === 'share_click')){
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
      errorLine: Number.isFinite(Number(payload.errorLine)) ? Math.max(0,Math.round(Number(payload.errorLine))) : undefined,
      errorColumn: Number.isFinite(Number(payload.errorColumn)) ? Math.max(0,Math.round(Number(payload.errorColumn))) : undefined,
      location: payload.location && typeof payload.location === 'object' ? {
        city:clean(payload.location.city||'',100), region:clean(payload.location.region||'',100), regionCode:clean(payload.location.regionCode||'',20),
        country:clean(payload.location.country||'',100), countryCode:clean(payload.location.countryCode||'',10), source:clean(payload.location.source||'',30)
      } : null,
      campaign: payload.campaign && typeof payload.campaign === 'object' ? payload.campaign : null,
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
    var errorKey = (type === 'client_error' || type === 'resource_error')
      ? [clean(data.errorMessage,120),clean(data.resourceUrl,180),clean(data.reason,50)].join('|')
      : '';
    return [type,clean(p.slug||p.id||p.name,120),clean(c.slug||c.name,120),data.term,data.searchStatus,comp,errorKey].join('|').toLowerCase();
  }
  function isDuplicate(type,data){
    if(type === 'page_engagement' || type === 'web_vitals') return false;
    var key = dedupeKey(type,data), t = Date.now(), last = Number(recent[key] || 0);
    recent[key] = t;
    // Duplo disparo de scripts deve ser filtrado, mas uma nova busca feita
    // intencionalmente logo em seguida continua contando.
    return last && (t-last) < (type==='search' ? 500 : 1800);
  }
  function errorCompatLabel(type,data){
    // O endpoint antigo do Sheets pode descartar Erro/Recurso/Motivo. Para não
    // perder o diagnóstico, replica um resumo técnico em Produto só nos erros.
    if(type === 'resource_error') return clean('__QAERR_RESOURCE__|' + clean(data.reason||'recurso',24) + '|' + clean(data.resourceUrl||'',100),140);
    if(type === 'client_error') return clean('__QAERR_JS__|' + clean(data.errorMessage||'Erro JavaScript',88) + '|' + clean(data.resourceUrl||'',40),140);
    return '';
  }
  function payloadObject(type,payload){
    var data = normalizePayload(type,payload), product=data.product||{}, category=data.category||{}, iso=new Date().toISOString();
    function noPersonal(v){return clean(v,300).replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,'[email]').replace(/(?:\d\D*){10,}/g,'[numero]');}
    data.errorMessage=noPersonal(data.errorMessage);
    data.resourceUrl=(function(){try{var u=new URL(data.resourceUrl,location.origin);return u.origin+u.pathname;}catch(e){return ''}})();
    var compatErrorName = errorCompatLabel(type,data);
    var aud=touchAudienceState(), visitor=aud.visitor||{}, session=aud.session||{};
    var visitorType=Number(session.number||1)>1?'recorrente':'novo';
    var location=data.location||geoState||{};
    var sessionCampaign=session.campaign&&typeof session.campaign==='object'?session.campaign:{};
    var campaign=data.campaign||{
      landingPage:clean(session.landingPage||'',500),sessionReferrer:clean(session.sessionReferrer||'',500),
      utmSource:clean(sessionCampaign.utmSource||'',100),utmMedium:clean(sessionCampaign.utmMedium||'',100),utmCampaign:clean(sessionCampaign.utmCampaign||'',160),
      utmContent:clean(sessionCampaign.utmContent||'',160),utmTerm:clean(sessionCampaign.utmTerm||'',160)
    };
    var timezone='';try{timezone=clean(Intl.DateTimeFormat().resolvedOptions().timeZone||'',80);}catch(e){}
    return {
      key:KEY, action:'track', type:type, event:type, Evento:type,
      at:iso, Data:iso, eventId:'qa-'+Date.now()+'-'+Math.random().toString(36).slice(2,10),
      product:data.product||undefined,
      slug:clean(product.slug||product.id||'',120), name:clean(product.name||compatErrorName,140),
      Produto:clean(product.name||compatErrorName,140), SlugProduto:clean(product.slug||product.id||'',120),
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
      location:location,
      city:clean(location.city||'',100), Cidade:clean(location.city||'',100),
      region:clean(location.region||'',100), Estado:clean(location.region||'',100),
      regionCode:clean(location.regionCode||'',20), UF:clean(location.regionCode||'',20),
      country:clean(location.country||'',100), Pais:clean(location.country||'',100),
      countryCode:clean(location.countryCode||'',10), PaisCodigo:clean(location.countryCode||'',10),
      geoSource:clean(location.source||'',30), FonteLocalizacao:clean(location.source||'',30),
      campaign:campaign,
      landingPage:clean(campaign.landingPage||'',500), LandingPage:clean(campaign.landingPage||'',500),
      sessionReferrer:clean(campaign.sessionReferrer||'',500), OrigemSessao:clean(campaign.sessionReferrer||'',500),
      utmSource:clean(campaign.utmSource||'',100), UTMSource:clean(campaign.utmSource||'',100),
      utmMedium:clean(campaign.utmMedium||'',100), UTMMedium:clean(campaign.utmMedium||'',100),
      utmCampaign:clean(campaign.utmCampaign||'',160), UTMCampaign:clean(campaign.utmCampaign||'',160),
      utmContent:clean(campaign.utmContent||'',160), UTMContent:clean(campaign.utmContent||'',160),
      utmTerm:clean(campaign.utmTerm||'',160), UTMTerm:clean(campaign.utmTerm||'',160),
      errorMessage:data.errorMessage, Erro:data.errorMessage, resourceUrl:data.resourceUrl, Recurso:data.resourceUrl,
      reason:data.reason, Motivo:data.reason, errorLine:data.errorLine, Linha:data.errorLine, errorColumn:data.errorColumn, Coluna:data.errorColumn,
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
      // URLs sem query ou hash para não registrar tokens de recuperação e dados sensíveis.
      url:window.location.origin+window.location.pathname, Pagina:window.location.origin+window.location.pathname,
      pageTitle:clean(document.title||'',220), TituloPagina:clean(document.title||'',220),
      path:clean(window.location.pathname||'/',300), Caminho:clean(window.location.pathname||'/',300),
      referrer:(function(){try{return document.referrer?new URL(document.referrer).origin:''}catch(e){return ''}})(), Origem:(function(){try{return document.referrer?new URL(document.referrer).origin:''}catch(e){return ''}})(),
      device:deviceName(), Dispositivo:deviceName(), language:navigator.language||'', Idioma:navigator.language||'',
      viewport:viewport(), Viewport:viewport(), timezone:timezone, Timezone:timezone
    };
  }
  // Estatística básica sem consentimento: somente eventos públicos, sem IDs,
  // busca digitada, cookies, sessão, fingerprint ou geolocalização por IP.
  // O Google Apps Script atua como operador dos eventos minimizados; não confundir
  // este modo com medição de pessoas/sessões ou anonimato da camada de transporte.
  var BASIC_EVENTS={page_view:1,product_view:1,category_view:1,search:1,
    search_no_result:1,whatsapp_click:1,share_click:1,favorite:1,
    favorite_remove:1,list_add:1,list_remove:1,page_engagement:1,web_vitals:1};
  function basicPublicPath(){
    var raw=String(window.location.pathname||'/');
    var path='';try{path=decodeURIComponent(raw);}catch(e){return '';}
    path=path.toLowerCase().replace(/\/{2,}/g,'/');
    if(/\/(?:conta|minha-conta|cadastro|completar-cadastro|entrar|login|checkout|pagamento|assinatura|perfil|pedido|recuperar-senha|admin|painel)(?:\/|\.|$)/.test(path))return '';
    if(path==='/'||path==='/index.html')return '/';
    if(/^\/(?:site\/)?(?:categoria|produto|comparar|sobre|formas-de-pagamento|seguranca|trabalhe-conosco|seja-nosso-fornecedor|quality-club|privacidade-clientes)\.html$/.test(path))return path;
    if(/^\/(?:smartphones|acessorios|eletronicos|assistencia-tecnica|quality-club)\/(?:index\.html)?$/.test(path))return path;
    if(/^\/produto\/[a-z0-9_-]{1,100}\/(?:index\.html)?$/.test(path))return path;
    if(/^\/categoria\/[a-z0-9_-]{1,100}\/(?:index\.html)?$/.test(path))return path;
    return '';
  }
  function basicReferrer(){
    try{
      var host=new URL(document.referrer).hostname.toLowerCase();
      if(/(^|\.)google\.[a-z.]+$/.test(host))return 'https://www.google.com/';
      if(/(^|\.)instagram\.com$/.test(host))return 'https://www.instagram.com/';
      if(/(^|\.)facebook\.com$/.test(host))return 'https://www.facebook.com/';
      if(host==='wa.me'||/(^|\.)whatsapp\.com$/.test(host))return 'https://www.whatsapp.com/';
    }catch(e){}
    return '';
  }
  function basicAnalyticsPayload(type,data){
    var path=basicPublicPath();
    if(!BASIC_EVENTS[type]||!path)return null;
    // Evita que caminhos, títulos e campos livres incluam dados de conta/busca.
    var prodSlug=clean(data.product&&(data.product.slug||data.product.id)||'',100).toLowerCase();
    var catSlug=clean(data.category&&data.category.slug||'',100).toLowerCase();
    if(!/^[a-z0-9_-]{1,100}$/.test(prodSlug))prodSlug='';
    if(!/^[a-z0-9_-]{1,100}$/.test(catSlug))catSlug='';
    // Arredondamento em intervalos de uma hora e nenhum identificador de página.
    var hour=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString();
    var source=basicReferrer();
    var obj={key:KEY,action:'track',type:type,event:type,Evento:type,
      at:hour,Data:hour,eventId:randomAnalyticsId('qa-basic'),
      privacyMode:'basic-no-identifiers',
      url:window.location.origin+path,Pagina:window.location.origin+path,
      path:path,Caminho:path,pageTitle:'Página pública',TituloPagina:'Página pública',
      context:surface(),Contexto:surface(),device:deviceName(),Dispositivo:deviceName(),
      referrer:source,Origem:source,
      // Campo de pesquisa intencionalmente ausente: até uma busca pode conter
      // CPF, dados de saúde ou nome pessoal.
      term:'',Busca:'',
      visitorId:'',VisitanteId:'',sessionId:'',SessaoId:'',
      pageVisitId:'',VisitaPagina:'',
      city:'',Cidade:'',region:'',Estado:'',regionCode:'',UF:'',
      country:'',Pais:'',campaign:null};
    if(prodSlug){obj.slug=prodSlug;obj.SlugProduto=prodSlug;}
    if(catSlug){obj.category={slug:catSlug};obj.Categoria=catSlug;}
    if(type==='page_engagement'){
      var seconds=Math.max(0,Number(data.durationSeconds)||0);
      obj.durationSeconds=Math.min(300,Math.ceil(seconds/15)*15);
      obj.TempoSegundos=obj.durationSeconds;
    }
    if(type==='web_vitals'){
      var perf=data.performance||{}, metrics={};
      ['lcpMs','inpMs','fcpMs','ttfbMs'].forEach(function(k){
        var value=Number(perf[k]);if(Number.isFinite(value)&&value>0)metrics[k]=Math.min(30000,Math.round(value/100)*100);
      });
      if(Number.isFinite(Number(perf.cls)))metrics.cls=Math.round(Number(perf.cls)*10)/10;
      obj.performance=metrics;
      obj.LCP=metrics.lcpMs;obj.INP=metrics.inpMs;obj.CLS=metrics.cls;
    }
    return obj;
  }
  function isCriticalEvent(type){
    return type === 'whatsapp_click' || type === 'product_view' || type === 'favorite' || type === 'list_add' || type === 'share_click' || type === 'search' || type === 'search_no_result';
  }
  function postAppsScript(obj,type){
    if(isLocal()) return Promise.resolve(false);
    var body='';
    try { body=JSON.stringify(obj); } catch(e) { return Promise.resolve(false); }

    // Cliques de intencao de compra precisam sobreviver a troca de aba/app.
    // sendBeacon entrega o POST ao navegador antes de abrir o WhatsApp; se o
    // navegador nao aceitar a fila, cai no fetch keepalive usado anteriormente.
    if(isCriticalEvent(type) && navigator.sendBeacon){
      try {
        if(navigator.sendBeacon(ENDPOINT, body)) return Promise.resolve(true);
      } catch(e){}
    }
    try {
      return fetch(ENDPOINT,{method:'POST',mode:'no-cors',credentials:'omit',redirect:'follow',cache:'no-store',keepalive:true,headers:{'Content-Type':'text/plain;charset=UTF-8'},body:body})
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
    type=clean(type,40);if(!type)return false;
    var granted=qaChoice()==='yes';
    // Em páginas privadas ou sem consentimento fora da lista pública, não mede.
    if(!granted && (!BASIC_EVENTS[type] || !basicPublicPath()))return false;
    var data=normalizePayload(type,payload||{});
    if(type==='search'&&data.term)lastSearchTerm=data.term;
    // Termo detalhado somente com consentimento, mesmo no caso de CPF/e-mail.
    if(granted&&(type==='search'||type==='search_no_result') &&
      (/@/.test(data.term||'')||/\d{3}\.?\d{3}\.?\d{3}[- ]?\d{2}/.test(data.term||'')||/(?:\d\D*){10,}/.test(data.term||'')))return false;
    if(isDuplicate(type,data))return false;
    var obj=granted?payloadObject(type,data):basicAnalyticsPayload(type,data);
    if(!obj)return false;
    // Não usar sessionStorage sem consentimento.
    if(granted && type==='search'&&data.term)safeSessionSet(SEARCH_MARKER_KEY,{term:data.term,at:Date.now()});
    postAppsScript(obj,type);
    postLocalhost(obj);
    if(granted && typeof window.gtag==='function'&&['site_signup_complete','whatsapp_click','search','product_view'].includes(type)){
      window.gtag('event',type==='site_signup_complete'?'sign_up':type,{page_location:location.origin+location.pathname,event_category:'quality_site'});
    }
    return true;
  }

  function normalizeGeoResponse(data,provider){
    if(!data || data.error || data.success === false) return null;
    provider=clean(provider||'',30).toLowerCase();
    var city=clean(data.city||'',100), region=clean(data.region||'',100), regionCode=clean(data.region_code||data.regionCode||'',20);
    var rawCountry=clean(data.country||'',100), rawCountryCode=clean(data.country_code||data.countryCode||'',10);
    var country='', countryCode='';
    if(provider === 'ipwho'){
      country=rawCountry;
      countryCode=rawCountryCode;
    } else {
      country=clean(data.country_name||data.countryName||((rawCountry.length>2)?rawCountry:''),100);
      countryCode=clean(rawCountryCode||((rawCountry.length===2)?rawCountry:''),10);
    }
    if(!city&&!region&&!country) return null;
    return {city:city,region:region,regionCode:regionCode,country:country,countryCode:countryCode,source:'ip-'+(provider||'aproximado')};
  }
  function fetchGeoProvider(provider,url){
    return new Promise(function(resolve,reject){
      var controller=typeof AbortController!=='undefined'?new AbortController():null;
      var finished=false;
      var timer=window.setTimeout(function(){
        if(finished)return;
        finished=true;
        try{if(controller)controller.abort();}catch(e){}
        reject(new Error('geo timeout '+provider));
      },GEO_PROVIDER_TIMEOUT_MS);
      fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:controller?controller.signal:undefined})
        .then(function(r){if(!r.ok)throw new Error('geo '+provider+' http '+r.status);return r.json();})
        .then(function(data){
          if(finished)return;
          var location=normalizeGeoResponse(data,provider);
          if(!location)throw new Error('geo '+provider+' sem dados');
          finished=true;window.clearTimeout(timer);resolve(location);
        })
        .catch(function(err){if(finished)return;finished=true;window.clearTimeout(timer);reject(err);});
    });
  }
  function resolveApproxLocation(){
    var providers=[
      {name:'ipwho',url:'https://ipwho.is/'},
      {name:'ipapi',url:'https://ipapi.co/json/'}
    ];
    function tryAt(index,lastError){
      if(index>=providers.length) return Promise.reject(lastError||new Error('geolocalização indisponível'));
      var item=providers[index];
      return fetchGeoProvider(item.name,item.url).catch(function(err){return tryAt(index+1,err);});
    }
    return tryAt(0,null);
  }
  function initApproxLocation(forceRetry){
    if(isLocal()) return Promise.resolve(null);
    var aud=touchAudienceState(), session=aud.session||{};
    var cached=safeSessionGet(GEO_KEY);
    if(cached&&cached.sessionId===session.id&&cached.location){
      geoState=cached.location;
      return Promise.resolve(geoState);
    }
    var attempts=(cached&&cached.sessionId===session.id)?Math.max(0,Number(cached.attempts)||0):0;
    if(!forceRetry&&cached&&cached.sessionId===session.id&&cached.failedAt&&(Date.now()-Number(cached.failedAt))<GEO_RETRY_MS) return Promise.resolve(null);
    if(attempts>=GEO_MAX_ATTEMPTS_PER_SESSION) return Promise.resolve(null);
    if(geoPromise) return geoPromise;
    geoPromise=resolveApproxLocation()
      .then(function(location){
        geoState=location;
        safeSessionSet(GEO_KEY,{sessionId:session.id,location:location,updatedAt:Date.now(),attempts:attempts+1});
        track('session_geo',{location:location,context:'Sessão'});
        return location;
      })
      .catch(function(){
        var nextAttempts=attempts+1;
        safeSessionSet(GEO_KEY,{sessionId:session.id,failedAt:Date.now(),attempts:nextAttempts});
        if(nextAttempts<GEO_MAX_ATTEMPTS_PER_SESSION){
          window.setTimeout(function(){initApproxLocation(true);},GEO_RETRY_MS+500);
        }
        return null;
      })
      .finally(function(){geoPromise=null;});
    return geoPromise;
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
    // A lista salva é a fonte da verdade. Ícones podem estar defasados.
    try {
      var items=JSON.parse(localStorage.getItem('quality_favoritos_v811')||'[]');
      if(!Array.isArray(items)) return false;
      var keys=[product&&product.slug,product&&product.id,product&&product.url,product&&product.name]
        .filter(Boolean).map(function(v){return String(v).trim().toLowerCase();});
      return items.some(function(item){
        return [item&&item.slug,item&&item.id,item&&item.url,item&&item.name,item&&item.nome]
          .some(function(v){return v && keys.indexOf(String(v).trim().toLowerCase())!==-1;});
      });
    } catch(e){return false;}
  }


  /* Minha lista: captura tanto botoes explicitos quanto listas persistidas no navegador.
     O scanner serve como fallback para o site legado, sem depender do nome exato do botao. */
  var interestListSnapshots = Object.create(null);
  var interestListTimer = null;

  function listProductKey(item){
    item = item && typeof item === 'object' ? item : {};
    var nested = item.product && typeof item.product === 'object' ? item.product : {};
    return clean(item.slug || item.productSlug || nested.slug || item.id || nested.id || item.url || nested.url || item.name || item.nome || nested.name || nested.nome || '',160).toLowerCase();
  }
  function listProductPayload(item){
    item = item && typeof item === 'object' ? item : {};
    var nested = item.product && typeof item.product === 'object' ? item.product : {};
    var slug = clean(item.slug || item.productSlug || nested.slug || item.id || nested.id || '',120);
    var url = clean(item.url || nested.url || (slug ? '/produto/' + encodeURIComponent(slug) + '/' : ''),300);
    return {
      id: clean(item.id || nested.id || '',120),
      slug: slug,
      name: clean(item.name || item.nome || item.productName || nested.name || nested.nome || slug || 'Produto',140),
      image: clean(item.image || item.imagem || nested.image || nested.imagem || '',260),
      url: url
    };
  }
  function isInterestListStorageKey(key){
    var normalized = normalize(key || '');
    if(!normalized) return false;
    if(/favorit|recent|analytics|compare|comparacao|session|visitor/.test(normalized)) return false;
    return /(?:^|[^a-z])(lista|list|wishlist|interesse|interest)(?:[^a-z]|$)/.test(normalized) || /minhalista|interestlist|wishlist/.test(normalized);
  }
  function storageListItems(storage,key){
    try{
      var raw = storage.getItem(key);
      if(!raw) return [];
      var parsed = JSON.parse(raw);
      var items = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.items) ? parsed.items : (parsed && Array.isArray(parsed.products) ? parsed.products : []));
      return items.filter(function(item){
        if(!item || typeof item !== 'object') return false;
        var nested = item.product && typeof item.product === 'object' ? item.product : {};
        var url = String(item.url || nested.url || '');
        return !!(item.slug || item.productSlug || nested.slug || /\/produto\//i.test(url));
      });
    }catch(e){ return []; }
  }
  function scanInterestStorage(storage,prefix,emit){
    if(!storage) return;
    try{
      for(var i=0;i<storage.length;i++){
        var key = storage.key(i);
        if(!isInterestListStorageKey(key)) continue;
        var items = storageListItems(storage,key);
        var current = Object.create(null);
        items.forEach(function(item){
          var itemKey = listProductKey(item);
          if(itemKey) current[itemKey] = listProductPayload(item);
        });
        var snapKey = prefix + ':' + key;
        var previous = interestListSnapshots[snapKey];
        if(emit && previous){
          Object.keys(current).forEach(function(itemKey){
            if(!previous[itemKey]) track('list_add',{product:current[itemKey],context:surface()});
          });
          Object.keys(previous).forEach(function(itemKey){
            if(!current[itemKey]) track('list_remove',{product:previous[itemKey],context:surface()});
          });
        }
        interestListSnapshots[snapKey] = current;
      }
    }catch(e){}
  }
  function scanInterestLists(emit){
    scanInterestStorage(window.localStorage,'local',emit);
    scanInterestStorage(window.sessionStorage,'session',emit);
  }
  function actionMarker(el){
    if(!el) return '';
    var parts = [
      el.id, el.className, el.getAttribute && el.getAttribute('data-action'),
      el.getAttribute && el.getAttribute('data-list-action'),
      el.getAttribute && el.getAttribute('data-interest-action'),
      el.getAttribute && el.getAttribute('aria-label'),
      el.getAttribute && el.getAttribute('title'),
      el.textContent
    ];
    return normalize(parts.filter(Boolean).join(' '));
  }
  function explicitListAction(target){
    var el = target && target.closest ? target.closest('button,a,[role="button"],input[type="button"],input[type="submit"]') : null;
    if(!el) return null;
    var marker = actionMarker(el);
    var listLike = /lista|wishlist|interesse|interest/.test(marker) ||
      !!el.closest('[data-quality-list],[data-quality-list-add],[data-quality-interest],[data-wishlist],.quality-list-action,.interest-list-action,.wishlist-action');
    if(!listLike) return null;
    if(/remov|exclu|delete|tirar/.test(marker)) return {type:'list_remove',el:el};
    var addLike = /adicion|incluir|salvar|guardar|\badd\b|wishlist|interesse/.test(marker);
    if(!addLike && el.closest('header,nav,.header,.navbar,.quality-header')) return null;
    if(!addLike && /^(minha )?lista$/.test(marker)) return null;
    return {type:'list_add',el:el};
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
        var image=type==='img'||/\.(?:png|jpe?g|webp|avif|gif|svg)(?:\?|$)/.test(name);
        var script=type==='script'||/\.js(?:\?|$)/.test(name);
        var style=type==='css'||type==='link'&&/\.css(?:\?|$)/.test(name)||/\.css(?:\?|$)/.test(name);
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
    // visibilitychange, pagehide e beforeunload podem ocorrer juntos.
    // Não enviar o mesmo pacote três vezes: evita inflar a planilha.
    if(signature===perfLastSignature) return false;
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
      // Registra imediatamente. Antes este evento esperava a leitura do catálogo;
      // em Safari/iPhone e em visitas rápidas o usuário podia abrir o WhatsApp
      // antes da Promise terminar e o product_view simplesmente se perdia.
      var immediateProduct=productFromDom(slug);
      if(immediateProduct){
        currentProductCache=immediateProduct;
        track('product_view',{product:immediateProduct,context:'Página do produto'});
      }
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
  function recoverDirectSearch(){
    // Sem consentimento, não usa sessionStorage nem registra a URL de busca;
    // o clique no botão é contado antes da navegação, sem guardar o termo.
    if(qaChoice()!=='yes')return;
    var pathname=String(window.location.pathname||'').toLowerCase();
    if(!/(?:^|\/)categoria\.html$/.test(pathname))return;
    var term='';try{term=clean(new URLSearchParams(window.location.search).get('busca')||'',100).toLowerCase();}catch(e){}
    if(!term)return;
    var nowMs=Date.now();
    var marker=safeSessionGet(SEARCH_MARKER_KEY);
    var seen=safeSessionGet(SEARCH_RESULTS_KEY);
    var searchUrl=pathname+'?busca='+term;
    // Se a busca já foi registrada na página anterior, não a conta novamente.
    if(marker&&marker.term===term&&nowMs-Number(marker.at||0)<10000){
      safeSessionSet(SEARCH_RESULTS_KEY,{url:searchUrl,at:nowMs});return;
    }
    // Refresh da mesma página de resultados não é uma nova pesquisa.
    if(seen&&seen.url===searchUrl&&nowMs-Number(seen.at||0)<10*60*1000)return;
    safeSessionSet(SEARCH_RESULTS_KEY,{url:searchUrl,at:nowMs});
    track('search',{term:term,context:'Resultados de busca'});
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

  // O listener da vitrine usa capture + stopPropagation. O evento deve ser
  // observado no window ANTES do handler da vitrine, nunca depois dele.
  window.addEventListener('click',function(ev){
    var fav=ev.target&&ev.target.closest&&ev.target.closest('[data-quality-fav]');
    if(!fav) return;
    var product=productFromButton(fav);
    var before=isFavoriteNow(fav,product);
    window.setTimeout(function(){
      var after=isFavoriteNow(fav,product);
      if(after===before) return; // Não registrar clique que não salvou favorito
      track(after?'favorite':'favorite_remove',{product:product,context:surface()});
    },0);
  },true);

  // O compartilhamento só conta após confirmação nativa ou cópia do link.
  window.addEventListener('quality:product-shared',function(ev){
    var detail=ev&&ev.detail||{};
    var product=detail.product;
    if(product) track('share_click',{product:product,context:surface()});
  });

  document.addEventListener('click',function(ev){
    var target=ev.target&&ev.target.closest?ev.target:null;
    if(!target) return;
    // Ações da vitrine usam um evento de sucesso, não contagem pelo clique.
    if(target.closest('[data-quality-fav],[data-quality-share]')) return;

    var listAction=explicitListAction(target);
    if(listAction){
      var lp=productFromElement(listAction.el);
      if(lp) track(listAction.type,{product:lp,context:surface()});
      else resolveCurrentProduct().then(function(p){ if(p) track(listAction.type,{product:p,context:surface()}); });
      window.setTimeout(function(){scanInterestLists(true);},120);
      return;
    }

    var share=target.closest('[data-quality-share],[data-share-product],.quality-share-btn,.btn-share,.share-product');
    if(!share){
      var clickable=target.closest('button,a,[role="button"]');
      if(clickable && /compartilh|share/.test(actionMarker(clickable))) share=clickable;
    }
    if(share){
      var sp=productFromElement(share) || productFromButton(share);
      if(sp) track('share_click',{product:sp,context:surface()});
      else resolveCurrentProduct().then(function(p){if(p)track('share_click',{product:p,context:surface()});});
      return;
    }

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
        if(String(target.tagName||'').toUpperCase()==='IMG' && target.dataset && target.dataset.qualityImageManaged==='1') return;
        var src=target.currentSrc||target.src||target.href||'';
        if(src) track('resource_error',{resourceUrl:src,errorMessage:'Falha ao carregar recurso',context:surface(),reason:String(target.tagName||'recurso').toLowerCase()});
        return;
      }
      var line=Number(ev&&ev.lineno||0), col=Number(ev&&ev.colno||0);
      var message=clean(ev&&ev.message||'Erro JavaScript',220);
      track('client_error',{errorMessage:message,resourceUrl:clean(ev&&ev.filename||'',300),errorLine:line||undefined,errorColumn:col||undefined,context:surface(),reason:'javascript'});
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

  function start(){
    trackInitial(); recoverDirectSearch(); observeNoResults(); initPerformanceObservers();
    if(qaChoice()==='yes'){
      initApproxLocation();
      scanInterestLists(false);
      if(!interestListTimer)interestListTimer=window.setInterval(function(){scanInterestLists(true);},700);
    }
    window.setTimeout(observeNoResults,600); window.setTimeout(observeNoResults,1600); window.setTimeout(function(){sendWebVitals('10s');},10000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();