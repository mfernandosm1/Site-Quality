/*
 * Quality Storefront Experience V1.2.1 - 2026-10-06
 * Marketplace-style UX without checkout/prices dependency.
 * Features: product detail 3-column layout, intelligent related products,
 * interest list -> WhatsApp, Search 2.0 with fuzzy matching and dynamic filters,
 * smartphone comparison with up to 3 products.
 * V1.2.1: browsing continuity and contextual mobile WhatsApp CTA.
 */
(function(){
  'use strict';
  if (window.__qualityStorefrontEnhancementsV1) return;
  window.__qualityStorefrontEnhancementsV1 = true;

  var WHATSAPP_NUMBER = '5555991407824';
  var INTEREST_KEY = 'quality_interest_list_v1';
  var COMPARE_KEY = 'quality_compare_smartphones_v1';
  var COMPARE_MAX = 3;
  var CATALOG_URLS = ['/content/catalog-public.json', '/site/content/catalog-public.json'];
  var PRODUCTS_URLS = ['/content/catalog-public.json', '/site/content/catalog-public.json', '/content/products.json', '/site/content/products.json'];
  var catalogPromise = null;
  var productsPromise = null;
  var globalObserver = null;
  var productEnhanceTimer = null;
  var compareTrayRequestSeq = 0;
  var comparePageRequestSeq = 0;
  var compareAnalyticsSignature = '';
  var BROWSE_CONTEXT_KEY = 'quality_browse_context_v1';
  var BROWSE_RESTORE_KEY = 'quality_browse_restore_v1';
  var BROWSE_CONTEXT_TTL = 45 * 60 * 1000;
  var mobileProductCtaObserver = null;

  function normalize(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function emitAnalytics(type,payload){
    try {
      var fn=window.qualityAnalyticsTrack||window.QualityAnalyticsTrack||(window.QualityAnalytics&&window.QualityAnalytics.track);
      if(typeof fn==='function'){ fn(type,payload||{}); return; }
      window.setTimeout(function(){
        try { var retry=window.qualityAnalyticsTrack||window.QualityAnalyticsTrack||(window.QualityAnalytics&&window.QualityAnalytics.track); if(typeof retry==='function') retry(type,payload||{}); } catch (_) {}
      },250);
    } catch (_) {}
  }

  function trackCompareEvent(type, slugs, actionSlug){
    var list=(slugs||readCompareSlugs()).filter(Boolean).slice(0,COMPARE_MAX);
    getCatalog().then(function(items){
      var products=list.map(function(slug){return productBySlug(items,slug);}).filter(Boolean);
      var action=actionSlug?productBySlug(items,actionSlug):null;
      emitAnalytics(type,{
        product:action?{id:action.id||'',slug:action.slug||action.id||'',name:action.name||action.nome||'',image:action.image||action.imagem||''}:undefined,
        comparison:{
          slugs:products.map(function(product){return product.slug||product.id||'';}).filter(Boolean),
          names:products.map(function(product){return product.name||product.nome||product.slug||product.id||'Celular';}),
          count:products.length,
          actionSlug:actionSlug||''
        }
      });
    }).catch(function(){
      emitAnalytics(type,{comparison:{slugs:list,names:[],count:list.length,actionSlug:actionSlug||''}});
    });
  }

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function assetPath(value){
    var raw = String(value || '').trim();
    if (!raw) return '/images/sem-imagem.png';
    if (/^(https?:)?\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
    return '/' + raw.replace(/^\/+/, '').replace(/^site\//i, '');
  }

  function productImageAsset(product){
    return assetPath(product && (product.optimizedImage || product.image || product.imagem));
  }

  function productImageOriginalAttr(product){
    var optimized = product && product.optimizedImage;
    var original = product && (product.image || product.imagem);
    if (!optimized || !original) return '';
    return ' data-quality-original-src="' + esc(assetPath(original)) + '"';
  }

  function fetchFirstJson(urls){
    var index = 0;
    function next(){
      if (index >= urls.length) return Promise.resolve({items:[]});
      var url = urls[index++];
      return fetch(url, {cache:'no-store'}).then(function(response){
        if (!response.ok) throw new Error('Falha ao carregar ' + url);
        return response.json();
      }).catch(next);
    }
    return next();
  }

  function getCatalog(){
    if (!catalogPromise) catalogPromise = fetchFirstJson(CATALOG_URLS).then(function(data){ return Array.isArray(data.items) ? data.items : []; });
    return catalogPromise;
  }

  function getProducts(){
    if (!productsPromise) productsPromise = fetchFirstJson(PRODUCTS_URLS).then(function(data){ return Array.isArray(data.items) ? data.items : []; });
    return productsPromise;
  }

  function isVisibleProduct(product){
    if (!product || product.active === false) return false;
    if (product.siteEnabled === false) return false;
    if (product.virtualStore && product.virtualStore.active === false) return false;
    return true;
  }

  function productUrl(product){
    var slug = product && (product.slug || product.id || product._id);
    return slug ? '/produto/' + encodeURIComponent(String(slug)) + '/' : '#';
  }

  function slugFromUrl(url){
    try {
      var parsed = new URL(url, window.location.href);
      var parts = parsed.pathname.split('/').filter(Boolean);
      var index = parts.indexOf('produto');
      return index >= 0 && parts[index + 1] ? decodeURIComponent(parts[index + 1]) : '';
    } catch (_) { return ''; }
  }

  function currentProductSlug(){
    var fromPath = slugFromUrl(window.location.href);
    if (fromPath) return fromPath;
    var params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('id') || '';
  }

  function internalPath(raw){
    try {
      var url = new URL(raw || window.location.href, window.location.href);
      if (url.origin !== window.location.origin) return '';
      return url.pathname + url.search + url.hash;
    } catch (_) { return ''; }
  }

  function readBrowseContext(){
    try {
      var parsed = JSON.parse(sessionStorage.getItem(BROWSE_CONTEXT_KEY) || 'null');
      if (!parsed || !parsed.source || !parsed.at) return null;
      if ((Date.now() - Number(parsed.at || 0)) > BROWSE_CONTEXT_TTL) {
        sessionStorage.removeItem(BROWSE_CONTEXT_KEY);
        sessionStorage.removeItem(BROWSE_RESTORE_KEY);
        return null;
      }
      return parsed;
    } catch (_) { return null; }
  }

  function captureBrowseContext(destination){
    var target = internalPath(destination);
    if (!target || !/\/produto\//i.test(target)) return;
    // Não troca a origem por outra página de produto. A continuidade é pensada
    // para voltar à vitrine/listagem em que o cliente estava pesquisando.
    if (currentProductSlug()) return;
    var source = internalPath(window.location.href);
    if (!source || /\/produto\//i.test(source)) return;
    var context = {
      source: source,
      scrollY: Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0)),
      product: slugFromUrl(target),
      at: Date.now()
    };
    try { sessionStorage.setItem(BROWSE_CONTEXT_KEY, JSON.stringify(context)); } catch (_) {}
  }

  function browseSourceLabel(source){
    try {
      var url = new URL(source, window.location.origin);
      var path = url.pathname.toLowerCase();
      if (/^\/smartphones\/?$/.test(path)) return 'Smartphones';
      if (/^\/acessorios\/?$/.test(path)) return 'Acessórios';
      if (/^\/eletronicos\/?$/.test(path)) return 'Eletrônicos';
      if (/^\/assistencia-tecnica\/?$/.test(path)) return 'Assistência Técnica';
      if (path === '/' || /\/index\.html$/.test(path)) return 'Home';
      return 'resultados';
    } catch (_) { return 'resultados'; }
  }

  function ensureReturnToResultsLink(){
    var box = document.getElementById('produto-detalhe');
    if (!box || box.querySelector('.quality-return-results')) return;
    var context = readBrowseContext();
    var slug = currentProductSlug();
    if (!context || (context.product && slug && normalize(context.product) !== normalize(slug))) return;
    var source = internalPath(context.source);
    if (!source || /\/produto\//i.test(source)) return;
    var link = document.createElement('a');
    link.className = 'quality-return-results';
    link.href = source;
    link.innerHTML = '<i class="fa-solid fa-arrow-left"></i><span>Voltar para ' + esc(browseSourceLabel(source)) + '</span>';
    link.addEventListener('click', function(){
      try { sessionStorage.setItem(BROWSE_RESTORE_KEY, JSON.stringify({source:source, at:Date.now()})); } catch (_) {}
    });
    var breadcrumb = box.querySelector('.quality-product-breadcrumb');
    if (breadcrumb) box.insertBefore(link, breadcrumb); else box.insertBefore(link, box.firstChild);
  }

  function restoreBrowsePosition(){
    if (currentProductSlug()) return;
    var context = readBrowseContext();
    if (!context || !context.source) return;
    var current = internalPath(window.location.href);
    if (!current || current !== internalPath(context.source)) return;

    var explicit = false;
    try {
      var restore = JSON.parse(sessionStorage.getItem(BROWSE_RESTORE_KEY) || 'null');
      explicit = !!(restore && restore.source && internalPath(restore.source) === current && (Date.now() - Number(restore.at || 0)) < BROWSE_CONTEXT_TTL);
      if (explicit) sessionStorage.removeItem(BROWSE_RESTORE_KEY);
    } catch (_) {}

    var backForward = false;
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      backForward = !!(nav && nav.type === 'back_forward');
    } catch (_) {}
    if (!explicit && !backForward) return;

    var target = Math.max(0, Number(context.scrollY || 0));
    if (!target) return;
    var attempts = 0;
    function apply(){
      attempts++;
      // Se o próprio navegador já restaurou praticamente no ponto certo, não briga com ele.
      if (Math.abs((window.scrollY || 0) - target) <= 8) return;
      var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (maxScroll >= target - 24 || attempts >= 18) {
        window.scrollTo(0, Math.min(target, maxScroll));
        return;
      }
      window.setTimeout(apply, 90);
    }
    window.setTimeout(apply, 40);
  }

  function bindBrowseContinuity(){
    if (window.__qualityBrowseContinuityV1) return;
    window.__qualityBrowseContinuityV1 = true;
    function captureFromEvent(event){
      var link = event.target && event.target.closest && event.target.closest('a[href*="/produto/"]');
      if (!link) return;
      captureBrowseContext(link.getAttribute('href'));
    }
    document.addEventListener('pointerdown', captureFromEvent, true);
    document.addEventListener('click', captureFromEvent, true);
    window.QualityStorefrontNavigation = window.QualityStorefrontNavigation || {};
    window.QualityStorefrontNavigation.capture = captureBrowseContext;
    window.addEventListener('pageshow', function(){ window.setTimeout(restoreBrowsePosition, 0); });
    restoreBrowsePosition();
  }

  function syncMobileProductCta(product, href){
    var bar = document.querySelector('.quality-mobile-product-cta');
    if (!bar) return;
    var link = bar.querySelector('a');
    if (link && href) link.href = href;
    var label = bar.querySelector('[data-quality-mobile-cta-label]');
    if (label) label.textContent = 'Atendimento da Quality';
  }

  function ensureMobileProductCta(product){
    var primary = document.querySelector('.quality-product-whatsapp-primary');
    if (!primary) return;
    var bar = document.querySelector('.quality-mobile-product-cta');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'quality-mobile-product-cta';
      bar.setAttribute('aria-hidden','true');
      bar.innerHTML = '<div class="quality-mobile-product-cta-copy"><small data-quality-mobile-cta-label>Atendimento da Quality</small><strong>Falar sobre este produto</strong></div>' +
        '<a target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>';
      document.body.appendChild(bar);
    }
    syncMobileProductCta(product, primary.href);
    if (bar.dataset.qualityCtaBound === '1') return;
    bar.dataset.qualityCtaBound = '1';

    function setVisible(primaryVisible){
      var mobile = window.matchMedia ? window.matchMedia('(max-width: 850px)').matches : window.innerWidth <= 850;
      var enoughScroll = (window.scrollY || 0) > 180;
      var blocked = document.body.classList.contains('quality-gallery-viewer-open') || document.body.classList.contains('quality-interest-open') || document.body.classList.contains('quality-favorites-open');
      var show = mobile && enoughScroll && !primaryVisible && !blocked;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      document.body.classList.toggle('quality-mobile-cta-active', show);
    }

    if (mobileProductCtaObserver) try { mobileProductCtaObserver.disconnect(); } catch (_) {}
    if ('IntersectionObserver' in window) {
      mobileProductCtaObserver = new IntersectionObserver(function(entries){
        var entry = entries && entries[0];
        setVisible(!!(entry && entry.isIntersecting && entry.intersectionRatio > .12));
      }, {threshold:[0,.12,.5,1]});
      mobileProductCtaObserver.observe(primary);
    } else {
      var fallback = function(){
        var rect = primary.getBoundingClientRect();
        setVisible(rect.bottom > 0 && rect.top < window.innerHeight);
      };
      window.addEventListener('scroll', fallback, {passive:true});
      window.addEventListener('resize', fallback);
      fallback();
    }
    window.addEventListener('scroll', function(){
      if (!mobileProductCtaObserver) return;
      var rect = primary.getBoundingClientRect();
      setVisible(rect.bottom > 0 && rect.top < window.innerHeight);
    }, {passive:true});
    window.addEventListener('resize', function(){
      var rect = primary.getBoundingClientRect();
      setVisible(rect.bottom > 0 && rect.top < window.innerHeight);
    });
  }

  function brandOf(product){
    var explicit = String((product && (product.brand || (product.erp && product.erp.brand))) || '').trim();
    if (explicit && normalize(explicit) !== 'semmarca' && normalize(explicit) !== 'sem marca') {
      var brandKey = normalize(explicit);
      var known = {apple:'Apple', samsung:'Samsung', xiaomi:'Xiaomi', motorola:'Motorola', jbl:'JBL', hp:'HP', lg:'LG', wap:'WAP', epson:'Epson', lenovo:'Lenovo', acer:'Acer', nintendo:'Nintendo', sony:'Sony', intelbras:'Intelbras', kaidi:'Kaidi', sandisk:'SanDisk', c3tech:'C3Tech', amazfit:'Xiaomi'};
      if (known[brandKey]) return known[brandKey];
      return explicit.toLowerCase().replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    }
    var name = normalize(product && (product.name || product.nome));
    var rules = [
      [/iphone|ipad|macbook|apple watch|\bapple\b/, 'Apple'],
      [/samsung|galaxy/, 'Samsung'],
      [/motorola|\bmoto\b/, 'Motorola'],
      [/xiaomi|redmi|poco/, 'Xiaomi'],
      [/\bjbl\b/, 'JBL'],
      [/amazfit/, 'Xiaomi'],
      [/\bepson\b/, 'Epson'],
      [/\bhp\b|hewlett/, 'HP'],
      [/\blenovo\b/, 'Lenovo'],
      [/\bacer\b/, 'Acer'],
      [/\blg\b/, 'LG'],
      [/nintendo/, 'Nintendo'],
      [/playstation|\bsony\b|\bps4\b|\bps5\b/, 'Sony'],
      [/intelbras/, 'Intelbras'],
      [/kaidi/, 'Kaidi'],
      [/sandisk/, 'SanDisk'],
      [/c3tech|c3 tech/, 'C3Tech'],
      [/\bwap\b/, 'WAP']
    ];
    for (var i=0;i<rules.length;i++) if (rules[i][0].test(name)) return rules[i][1];
    return '';
  }

  function conditionOf(product){
    var v = product && product.variations ? product.variations : {};
    var values = Array.isArray(v.condition) ? v.condition : String(v.conditionText || '').split(/[\n,;]+/).map(function(x){return x.trim();}).filter(Boolean);
    var joined = normalize(values.join(' '));
    var name = normalize(product && (product.name || product.nome));
    if (/usado|seminovo|recondicionado/.test(joined + ' ' + name)) return 'Usado';
    if (/novo|lacrado/.test(joined + ' ' + name)) return 'Novo';
    var category = normalize(product && product.category);
    if (category && !category.includes('assistencia')) return 'Novo';
    return '';
  }

  function categoryOf(product){
    return normalize(product && (product.category || product.categoria || product.categorySlug || product.categoriaSlug));
  }

  function displayCategory(product){
    var slug = categoryOf(product);
    var map = {smartphones:'Smartphones', acessorios:'Acessórios', eletronicos:'Eletrônicos', 'assistencia-tecnica':'Assistência Técnica'};
    return map[slug] || String(product && (product.category || product.categoria) || '').trim();
  }

  /* =========================================================
     QUALITY SEARCH 2.0
     Busca tolerante a erros, sinônimos, atributos e resultados globais.
  ========================================================= */
  var SEARCH_PARAM = 'busca';
  var SEARCH_STOPWORDS = new Set(['a','o','as','os','de','da','do','das','dos','e','em','no','na','nos','nas','para','pra','por','com','um','uma','uns','umas','bom','boa','bons','boas','quero','queria','procuro','procurando']);
  var SEARCH_SYNONYMS = {
    celular:['smartphone','telefone'], smartphone:['celular','telefone'], telefone:['celular','smartphone'],
    capinha:['capa'], capas:['capa'], case:['capa'],
    pelicula:['pelicula','protecao','vidro'], privacy:['privacidade'], privacidade:['privacy'],
    carregador:['fonte','carregamento'], fonte:['carregador'],
    powerbank:['power bank','bateria portatil'],
    fone:['headset','auricular'], headset:['fone'],
    notebook:['laptop'], laptop:['notebook'],
    usado:['seminovo'], seminovo:['usado'],
    lacrado:['novo'],
    playstation:['ps'], ps4:['playstation4','playstation 4'], ps5:['playstation5','playstation 5'],
    televisao:['tv'], tv:['televisao'],
    aifone:['iphone'], iphone:['aifone'], moto:['motorola']
  };

  function stripHtml(value){
    var holder=document.createElement('div');
    holder.innerHTML=String(value||'');
    return String(holder.textContent||holder.innerText||'').replace(/\s+/g,' ').trim();
  }

  function uniqueValues(values){
    var out=[];
    (values||[]).forEach(function(value){
      var text=String(value==null?'':value).trim();
      if(!text) return;
      if(!out.some(function(existing){return normalize(existing)===normalize(text);})){ out.push(text); }
    });
    return out;
  }

  function variationList(product,key){
    var v=product&&product.variations?product.variations:{};
    var out=[];
    var direct=v&&v[key];
    if(Array.isArray(direct)) direct.forEach(function(item){
      if(item&&typeof item==='object') item=item.name||item.value||item.label||'';
      if(item) out.push(String(item));
    });
    var text=v&&v[key+'Text'];
    if(text) String(text).split(/[\n,;]+/).forEach(function(item){if(item.trim())out.push(item.trim());});
    if(Array.isArray(v&&v.combinations)) v.combinations.forEach(function(combo){if(combo&&combo[key])out.push(String(combo[key]));});
    return uniqueValues(out);
  }

  function storageValues(product){
    var explicit=variationList(product,'storage');
    if(explicit.length) return explicit;
    function extractStorage(source){
      var values=[];
      var re=/(\d+(?:[.,]\d+)?)\s*(TB|GB)\b/gi,match;
      while((match=re.exec(String(source||'')))!==null){
        var raw=(match[1]+' '+match[2]).replace(/\s+/g,'').toUpperCase().replace(',','.');
        var before=String(source||'').slice(Math.max(0,match.index-18),match.index).toLowerCase();
        var after=String(source||'').slice(re.lastIndex,Math.min(String(source||'').length,re.lastIndex+18)).toLowerCase();
        if(/ram\s*$/.test(before)||/^\s*(?:de\s*)?ram\b/.test(after)||/ram\s*boost/.test(after)) continue;
        values.push(raw);
      }
      return uniqueValues(values);
    }
    var fromName=extractStorage(String(product&&(product.name||product.nome)||''));
    if(fromName.length) return fromName;
    var description=stripHtml([product&&product.descriptionShort,product&&product.descriptionLong].filter(Boolean).join(' ')).slice(0,1800);
    var fromDescription=extractStorage(description);
    if(!fromDescription.length) return [];
    fromDescription.sort(function(a,b){
      function mb(v){var n=parseFloat(v)||0;return /TB/i.test(v)?n*1024:n;}
      return mb(b)-mb(a);
    });
    return [fromDescription[0]];
  }

  function ramValues(product){
    var values=variationList(product,'ram');
    var source=(String(product&&(product.name||product.nome)||'')+' '+stripHtml([product&&product.descriptionShort,product&&product.descriptionLong].filter(Boolean).join(' '))).slice(0,2600);
    var patterns=[/(\d+(?:[.,]\d+)?)\s*GB\s*(?:de\s*)?RAM\b/gi,/RAM\s*(?:f[ií]sica\s*)?(?:de\s*)?(\d+(?:[.,]\d+)?)\s*GB\b/gi];
    patterns.forEach(function(re){var m;while((m=re.exec(source))!==null)values.push(String(m[1]).replace(',','.')+'GB');});
    return uniqueValues(values);
  }

  function colorValues(product){
    var colors=variationList(product,'colors');
    if(colors.length) return colors;
    var v=product&&product.variations?product.variations:{};
    if(Array.isArray(v.colors)){
      v.colors.forEach(function(item){var name=item&&typeof item==='object'?(item.name||item.value):item;if(name)colors.push(String(name));});
    }
    return uniqueValues(colors);
  }

  function networkValues(product){
    var name=normalize(product&&(product.name||product.nome));
    var short=normalize(product&&product.descriptionShort);
    var source=name+' '+short;
    if(/(^|[^a-z0-9])5g([^a-z0-9]|$)/.test(source)) return ['5G'];
    if(/(^|[^a-z0-9])4g([^a-z0-9]|$)|\blte\b/.test(source)) return ['4G'];
    return [];
  }

  function productSearchFields(product){
    var brand=brandOf(product);
    var category=displayCategory(product);
    var condition=conditionOf(product);
    var attributes=[];
    attributes=attributes.concat(storageValues(product),ramValues(product),colorValues(product),networkValues(product));
    if(condition) attributes.push(condition);
    if(categoryOf(product)==='smartphones') attributes.push('smartphone','celular','telefone');
    var tags=Array.isArray(product&&product.tags)?product.tags:String(product&&product.tags||'').split(/[\n,;]+/);
    var variations=product&&product.variations?product.variations:{};
    var comboText=Array.isArray(variations.combinations)?variations.combinations.map(function(combo){return [combo&&combo.color,combo&&combo.storage,combo&&combo.ram,combo&&combo.condition].filter(Boolean).join(' ');}).join(' '):'';
    return [
      {text:product&&(product.name||product.nome)||'',weight:4.5,primary:true},
      {text:brand,weight:3.5,primary:true},
      {text:[product&&product.category,product&&product.categoria,category].filter(Boolean).join(' '),weight:2.2,primary:true},
      {text:attributes.join(' '),weight:3.2,primary:true},
      {text:tags.join(' '),weight:2,primary:true},
      {text:comboText,weight:2.4,primary:true},
      {text:product&&product.slug||'',weight:1.8,primary:true},
      {text:product&&product.descriptionShort||'',weight:1.35,primary:false},
      {text:stripHtml(product&&product.descriptionLong||'').slice(0,2200),weight:.72,primary:false},
      {text:product&&product.virtualStore&&[product.virtualStore.name,product.virtualStore.seoTitle,product.virtualStore.seoDescription].filter(Boolean).join(' ')||'',weight:1.1,primary:false}
    ].filter(function(field){return String(field.text||'').trim();});
  }

  function searchQueryTokens(query){
    return normalize(query).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean).filter(function(token){return !SEARCH_STOPWORDS.has(token);});
  }

  function tokenVariants(token){
    var out=[token];
    (SEARCH_SYNONYMS[token]||[]).forEach(function(value){
      normalize(value).split(/\s+/).filter(Boolean).forEach(function(part){if(!out.includes(part))out.push(part);});
    });
    return out;
  }

  function editDistanceSearch(a,b){
    a=String(a||'');b=String(b||'');
    if(a===b)return 0;if(!a.length)return b.length;if(!b.length)return a.length;
    var prev=Array.from({length:b.length+1},function(_,i){return i;});
    for(var i=1;i<=a.length;i++){
      var left=i,diag=i-1;
      for(var j=1;j<=b.length;j++){
        var up=prev[j],cost=a[i-1]===b[j-1]?0:1;
        var next=Math.min(up+1,left+1,diag+cost);
        diag=up;prev[j]=next;left=next;
      }
    }
    return prev[b.length];
  }

  function tokenMatchScore(queryToken,hayToken){
    if(!queryToken||!hayToken)return 0;
    var best=0;
    tokenVariants(queryToken).forEach(function(q){
      var minLen=Math.min(q.length,hayToken.length);
      var lengthGap=Math.abs(q.length-hayToken.length);
      var numeric=/\d/.test(q);
      if(q===hayToken)best=Math.max(best,100);
      else if(minLen>=2&&lengthGap<=3&&(hayToken.indexOf(q)===0||q.indexOf(hayToken)===0))best=Math.max(best,88);
      else if(!numeric&&minLen>=4&&lengthGap<=4&&(hayToken.indexOf(q)!==-1||q.indexOf(hayToken)!==-1))best=Math.max(best,74);
      else if(!numeric&&q.length>=4&&hayToken.length>=4){
        var distance=editDistanceSearch(q,hayToken);
        if(distance===1)best=Math.max(best,72);
        else if(distance===2&&Math.max(q.length,hayToken.length)>=6)best=Math.max(best,57);
        else if(distance===3&&Math.max(q.length,hayToken.length)>=9)best=Math.max(best,42);
      }
    });
    return best;
  }

  function searchHasAccessoryIntent(tokens){
    var accessory=['capa','capinha','pelicula','privacidade','privacy','carregador','fonte','powerbank','fone','headset','cabo','case'];
    return (tokens||[]).some(function(token){
      if(token==='iphone'||token==='aifone')return false;
      return accessory.some(function(intent){return tokenMatchScore(token,intent)>=57;});
    });
  }

  function searchBrandIntent(tokens){
    var brands=[
      {name:'Apple',aliases:['apple','iphone','aifone']},
      {name:'Samsung',aliases:['samsung']},
      {name:'Motorola',aliases:['motorola','moto']},
      {name:'Xiaomi',aliases:['xiaomi','redmi','poco']},
      {name:'JBL',aliases:['jbl']},
      {name:'HP',aliases:['hp']},
      {name:'LG',aliases:['lg']},
      {name:'Epson',aliases:['epson']},
      {name:'Lenovo',aliases:['lenovo']},
      {name:'Acer',aliases:['acer']},
      {name:'Nintendo',aliases:['nintendo']},
      {name:'Sony',aliases:['sony','playstation','ps4','ps5']},
      {name:'Intelbras',aliases:['intelbras']},
      {name:'Kaidi',aliases:['kaidi']},
      {name:'SanDisk',aliases:['sandisk']},
      {name:'C3Tech',aliases:['c3tech']},
      {name:'WAP',aliases:['wap']}
    ];
    var winner='',best=0;
    (tokens||[]).forEach(function(token){
      brands.forEach(function(brand){
        brand.aliases.forEach(function(alias){
          var score=tokenMatchScore(token,alias);
          if(score>best){best=score;winner=brand.name;}
        });
      });
    });
    return best>=57?winner:'';
  }

  function productSearchScore(product,query){
    if(!product||!isVisibleProduct(product))return 0;
    var raw=normalize(query);
    var tokens=searchQueryTokens(raw);
    if(!tokens.length)return 0;
    var accessoryIntent=searchHasAccessoryIntent(tokens);
    var smartphoneIntent=!accessoryIntent&&tokens.some(function(token){return ['celular','smartphone','telefone'].indexOf(token)!==-1;});
    if(smartphoneIntent&&categoryOf(product)!=='smartphones')return 0;
    var brandIntent=!accessoryIntent?searchBrandIntent(tokens):'';
    if(brandIntent&&normalize(brandOf(product))!==normalize(brandIntent))return 0;
    var iphoneIntent=!accessoryIntent&&tokens.some(function(token){return token==='iphone'||token==='aifone';});
    if(iphoneIntent&&normalize(product.name||product.nome||'').indexOf('iphone')===-1)return 0;
    if(accessoryIntent){
      var primarySource=normalize([product.name||product.nome||'',product.slug||'',displayCategory(product),(Array.isArray(product.tags)?product.tags.join(' '):product.tags||'')].join(' '));
      var primaryTokens=primarySource.replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean);
      var strongAccessory=tokens.some(function(token){
        if(!searchHasAccessoryIntent([token]))return false;
        return primaryTokens.some(function(hay){return tokenMatchScore(token,hay)>=74;});
      });
      if(!strongAccessory)return 0;
    }
    var fields=productSearchFields(product).map(function(field,index){
      return {weight:field.weight,primary:field.primary!==false,text:normalize(field.text),tokens:normalize(field.text).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean)};
    });
    var matched=0,total=0,numericMiss=false;
    tokens.forEach(function(token){
      var tokenBest=0,rawTokenBest=0,rawPrimaryBest=0;
      fields.forEach(function(field){
        var local=0;
        field.tokens.forEach(function(hay){local=Math.max(local,tokenMatchScore(token,hay));});
        rawTokenBest=Math.max(rawTokenBest,local);
        if(field.primary)rawPrimaryBest=Math.max(rawPrimaryBest,local);
        tokenBest=Math.max(tokenBest,local*field.weight);
      });
      if(/\d/.test(token)&&rawPrimaryBest<88)numericMiss=true;
      if(tokenBest>=42){matched++;total+=tokenBest;}
    });
    var coverage=matched/tokens.length;
    var modelFallback=accessoryIntent&&tokens.length===2&&matched===1&&total>=300&&tokens.some(function(token){return /\d/.test(token);});
    if(numericMiss&&!modelFallback)return 0;
    if(coverage<0.66&&!modelFallback)return 0;
    if(modelFallback)total*=0.78;
    var name=normalize(product.name||product.nome||'');
    var compactName=name.replace(/[^a-z0-9]+/g,'');
    var compactQuery=raw.replace(/[^a-z0-9]+/g,'');
    var bonus=0;
    if(name===raw)bonus+=650;
    else if(name.indexOf(raw)===0)bonus+=420;
    else if(name.indexOf(raw)!==-1)bonus+=300;
    if(compactQuery&&compactName.indexOf(compactQuery)!==-1)bonus+=220;
    if(normalize(brandOf(product))===raw)bonus+=180;
    if(normalize(displayCategory(product))===raw)bonus+=100;
    if(product.featured)bonus+=8;
    return Math.round(total*coverage+bonus);
  }

  function searchCatalog(items,query,options){
    options=options||{};
    var minScore=Number(options.minScore==null?90:options.minScore);
    var limit=Number(options.limit||0);
    var ranked=(items||[]).filter(isVisibleProduct).map(function(product){return {product:product,score:productSearchScore(product,query)};})
      .filter(function(entry){return entry.score>=minScore;})
      .sort(function(a,b){
        if(b.score!==a.score)return b.score-a.score;
        return String(a.product.name||a.product.nome||'').localeCompare(String(b.product.name||b.product.nome||''),'pt-BR');
      });
    return limit>0?ranked.slice(0,limit):ranked;
  }

  function isLocalPreviewHost(){
    var host=String(window.location.hostname||'');
    var path=String(window.location.pathname||'');
    return /^(localhost|127\.)/i.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host)||path.indexOf('/site/')===0;
  }

  function searchResultsUrl(query){
    var base=isLocalPreviewHost()?'/site/view/categoria.html':'/categoria.html';
    return base+'?'+SEARCH_PARAM+'='+encodeURIComponent(String(query||'').trim());
  }

  function securityPageUrl(){ return isLocalPreviewHost()?'/site/seguranca.html':'/seguranca.html'; }

  function trackSearch(term,context){
    if(!term)return;
    emitAnalytics('search',{term:String(term),context:context||'Busca'});
  }

  function performSearch(query,context){
    var raw=String(query||'').trim();
    if(!raw)return false;
    trackSearch(raw,context||'Busca global');
    window.location.assign(searchResultsUrl(raw));
    return true;
  }

  function searchFacetLabel(product){
    var parts=[];
    var brand=brandOf(product),condition=conditionOf(product),storage=storageValues(product)[0],network=networkValues(product)[0];
    if(brand)parts.push(brand);if(condition)parts.push(condition);if(storage)parts.push(storage);if(network)parts.push(network);
    return parts.join(' · ');
  }

  function searchResultCardHtml(product,score){
    var name=product.name||product.nome||'Produto';
    var url=productUrl(product);
    var image=productImageAsset(product);
    var imageOriginalAttr=productImageOriginalAttr(product);
    var meta=searchFacetLabel(product);
    var whatsapp='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent('Olá! Vim através do site da Quality Celulares e tenho interesse em '+name);
    return '<div class="produto-card product-card quality-search-result-card" data-quality-search-score="'+esc(score||0)+'">'+
      '<div class="quality-card-image-wrap">'+cardActions(product)+'<a href="'+esc(url)+'" class="quality-card-image-link" aria-label="Ver detalhes de '+esc(name)+'"><img src="'+esc(image)+'"'+imageOriginalAttr+' alt="'+esc(name)+'" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></a></div>'+
      '<h3><a href="'+esc(url)+'" class="quality-card-native-title-link">'+esc(name)+'</a></h3>'+
      (meta?'<div class="quality-search-result-meta">'+esc(meta)+'</div>':'')+
      '<a href="'+esc(url)+'" class="btn btn-details">Ver detalhes</a>'+
      '<a href="'+esc(whatsapp)+'" class="btn btn-whatsapp" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp</a>'+
    '</div>';
  }

  function closestBrandForQuery(items,query){
    var brands=uniqueValues((items||[]).map(brandOf).filter(Boolean));
    var qTokens=searchQueryTokens(query);
    var winner='',best=0;
    brands.forEach(function(brand){
      var bt=normalize(brand);
      qTokens.forEach(function(q){var score=tokenMatchScore(q,bt);if(score>best){best=score;winner=brand;}});
    });
    return best>=57?winner:'';
  }

  function renderNoSearchResults(container,items,query){
    var brand=closestBrandForQuery(items,query);
    var alternatives=brand?(items||[]).filter(function(product){return isVisibleProduct(product)&&normalize(brandOf(product))===normalize(brand);}).slice(0,4):[];
    var whatsapp='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent('Olá! Procurei por "'+query+'" no site da Quality Celulares e não encontrei. Vocês conseguem me ajudar?');
    container.innerHTML='<section class="quality-search-recovery">'+
      '<div class="quality-search-recovery-icon"><i class="fa-solid fa-magnifying-glass"></i></div>'+
      '<h2>Não encontramos exatamente “'+esc(query)+'”</h2>'+
      '<p>Tente remover algum termo, conferir a escrita ou fale com nossa equipe para localizar o produto certo.</p>'+
      '<div class="quality-search-recovery-actions"><a href="/smartphones/">Ver smartphones</a><a class="is-whatsapp" href="'+esc(whatsapp)+'" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Perguntar no WhatsApp</a></div>'+
      (alternatives.length?'<div class="quality-search-alternatives"><strong>Outros produtos '+esc(brand)+'</strong><div class="quality-search-alternative-grid">'+alternatives.map(function(product){return '<a href="'+esc(productUrl(product))+'"><img src="'+esc(productImageAsset(product))+'" alt=""><span>'+esc(product.name||product.nome||'Produto')+'</span></a>';}).join('')+'</div></div>':'')+
    '</section>';
    emitAnalytics('search_no_result',{term:query,searchStatus:'sem_resultado',resultCount:0,context:'Resultados de busca'});
  }

  function initSearchResultsPage(){
    var params=new URLSearchParams(window.location.search||'');
    var query=String(params.get(SEARCH_PARAM)||params.get('q')||'').trim();
    if(!query)return false;
    var container=document.getElementById('produtos-container');
    var title=document.getElementById('categoria-titulo');
    if(!container||!title)return false;
    document.body.classList.add('quality-search-results-page');
    title.textContent='Resultados para “'+query+'”';
    document.title='Busca por '+query+' | Quality Celulares';
    var oldMessage=document.getElementById('no-results');if(oldMessage){oldMessage.style.display='none';oldMessage.textContent='';}
    var robots=document.querySelector('meta[name="robots"]');if(!robots){robots=document.createElement('meta');robots.setAttribute('name','robots');document.head.appendChild(robots);}robots.setAttribute('content','noindex, follow');
    var canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.setAttribute('href','https://www.qualitycel.com.br/');
    var toolbar=document.querySelector('.quality-category-toolbar');
    var sort=toolbar&&toolbar.querySelector('#quality-category-sort');
    if(sort&&!sort.querySelector('option[value="relevance"]')){var option=document.createElement('option');option.value='relevance';option.textContent='🔎 Relevância';sort.insertBefore(option,sort.firstChild);}if(sort)sort.value='relevance';
    var summary=document.createElement('div');summary.className='quality-search-summary';summary.innerHTML='<span>Buscando no catálogo inteiro…</span><button type="button" data-quality-new-search>Nova busca</button>';
    title.insertAdjacentElement('afterend',summary);
    summary.addEventListener('click',function(event){if(event.target.closest('[data-quality-new-search]')){var input=document.getElementById('search-input')||document.getElementById('search-input-mobile');if(input){input.focus();input.select();}}});

    getCatalog().then(function(items){
      var ranked=searchCatalog(items,query,{minScore:90});
      if(!ranked.length){summary.querySelector('span').textContent='Nenhum resultado encontrado';renderNoSearchResults(container,items,query);return;}
      summary.querySelector('span').textContent=ranked.length+(ranked.length===1?' produto encontrado':' produtos encontrados');
      container.dataset.qualitySearchResults='1';
      var base=ranked.slice();
      function sortedEntries(mode){
        var entries=base.slice();
        if(mode==='az')entries.sort(function(a,b){return String(a.product.name||'').localeCompare(String(b.product.name||''),'pt-BR');});
        else if(mode==='za')entries.sort(function(a,b){return String(b.product.name||'').localeCompare(String(a.product.name||''),'pt-BR');});
        else if(mode==='launch')entries.sort(function(a,b){return Number(b.product.id||0)-Number(a.product.id||0);});
        else entries.sort(function(a,b){return b.score-a.score;});
        return entries;
      }
      function render(mode){
        container.innerHTML=sortedEntries(mode||'relevance').map(function(entry){return searchResultCardHtml(entry.product,entry.score);}).join('');
        decorateProductCards();decorateCompareCards();refreshInterestUI();refreshCompareUI();buildCategoryFilters();
        if(window.qualityUpdateFavoriteButtons)try{window.qualityUpdateFavoriteButtons();}catch(_){}
      }
      render(sort?sort.value:'relevance');
      if(sort&&!sort.dataset.qualitySearchSortBound){sort.dataset.qualitySearchSortBound='1';sort.addEventListener('change',function(){render(sort.value);});}
    }).catch(function(){summary.querySelector('span').textContent='Não foi possível carregar a busca';container.innerHTML='<div class="quality-search-recovery"><h2>Não foi possível carregar os produtos.</h2><p>Tente novamente em instantes.</p></div>';});
    return true;
  }

  function bindSearchSubmitOverride(){
    if(window.__qualitySearch2SubmitBound)return;window.__qualitySearch2SubmitBound=true;
    document.addEventListener('click',function(event){
      var button=event.target&&event.target.closest?event.target.closest('#search-button,#search-button-mobile'):null;
      if(!button)return;
      var input=document.getElementById(button.id==='search-button-mobile'?'search-input-mobile':'search-input');
      if(!input||!String(input.value||'').trim())return;
      event.preventDefault();event.stopImmediatePropagation();performSearch(input.value,'Busca pelo cabeçalho');
    },true);
    document.addEventListener('keydown',function(event){
      var input=event.target&&event.target.matches&&event.target.matches('#search-input,#search-input-mobile')?event.target:null;
      if(!input||event.key!=='Enter')return;
      var wrapper=input.closest('.quality-search-host');
      var active=wrapper&&wrapper.querySelector('.quality-search-suggestion.is-active');
      if(active){event.preventDefault();event.stopImmediatePropagation();window.location.assign(active.getAttribute('href'));return;}
      if(!String(input.value||'').trim())return;
      event.preventDefault();event.stopImmediatePropagation();performSearch(input.value,'Busca pelo cabeçalho');
    },true);
  }

  window.QualitySearch2={
    version:'2.0',perform:performSearch,search:function(query,limit){return getCatalog().then(function(items){return searchCatalog(items,query,{minScore:90,limit:limit||0});});},
    score:productSearchScore,resultsUrl:searchResultsUrl,securityUrl:securityPageUrl
  };

  function readInterest(){
    try {
      var parsed = JSON.parse(localStorage.getItem(INTEREST_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function writeInterest(items){
    try { localStorage.setItem(INTEREST_KEY, JSON.stringify(items || [])); } catch (_) {}
    refreshInterestUI();
  }

  function variationText(variation){
    if (!variation || typeof variation !== 'object') return '';
    var labels = {colors:'Cor', storage:'Armazenamento', ram:'RAM', condition:'Condição'};
    return Object.keys(labels).map(function(key){
      var value = String(variation[key] || '').trim();
      return value ? labels[key] + ': ' + value : '';
    }).filter(Boolean).join(' · ');
  }

  function interestItemKey(item){
    return normalize(item.slug || item.id || item.name) + '|' + normalize(variationText(item.variation || {}));
  }

  function addInterest(product, variation){
    if (!product) return;
    var item = {
      id: product.id || product.slug || '',
      slug: product.slug || product.id || '',
      name: product.name || product.nome || 'Produto',
      image: product.image || product.imagem || '',
      url: productUrl(product),
      variation: variation || {},
      savedAt: Date.now()
    };
    var key = interestItemKey(item);
    var items = readInterest().filter(function(existing){ return interestItemKey(existing) !== key; });
    items.unshift(item);
    writeInterest(items.slice(0, 40));
    toast('Adicionado à sua lista');
  }

  function removeInterest(key){
    writeInterest(readInterest().filter(function(item){ return interestItemKey(item) !== key; }));
  }

  function toast(message){
    var el = document.querySelector('.quality-storefront-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'quality-storefront-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__qualityStorefrontToastTimer);
    window.__qualityStorefrontToastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1800);
  }

  function interestMessage(items){
    var lines = ['Olá! Vim através do site da Quality Celulares e tenho interesse em:'];
    items.forEach(function(item){
      var detail = variationText(item.variation || {});
      lines.push('• ' + (item.name || 'Produto') + (detail ? ' — ' + detail : ''));
    });
    return lines.join('\n');
  }

  function interestPanel(){
    var panel = document.querySelector('.quality-interest-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'quality-interest-panel';
    panel.innerHTML =
      '<div class="quality-interest-backdrop" data-quality-close-interest></div>' +
      '<aside class="quality-interest-box" aria-label="Minha lista de interesse">' +
        '<div class="quality-interest-head"><div><strong>Minha lista</strong><span>Produtos que você quer consultar</span></div><button type="button" data-quality-close-interest aria-label="Fechar">×</button></div>' +
        '<div class="quality-interest-body"></div>' +
        '<div class="quality-interest-footer"></div>' +
      '</aside>';
    document.body.appendChild(panel);
    return panel;
  }

  function renderInterestPanel(){
    var panel = interestPanel();
    var body = panel.querySelector('.quality-interest-body');
    var footer = panel.querySelector('.quality-interest-footer');
    var items = readInterest();
    if (!items.length) {
      body.innerHTML = '<div class="quality-interest-empty"><i class="fa-solid fa-list-check"></i><strong>Sua lista está vazia</strong><p>Adicione produtos enquanto navega e envie tudo junto pelo WhatsApp.</p></div>';
      footer.innerHTML = '';
      return;
    }
    body.innerHTML = items.map(function(item){
      var key = interestItemKey(item);
      var detail = variationText(item.variation || {});
      return '<div class="quality-interest-item">' +
        '<a href="' + esc(item.url || '#') + '"><img src="' + esc(assetPath(item.image)) + '" alt="' + esc(item.name) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></a>' +
        '<div class="quality-interest-item-info"><a href="' + esc(item.url || '#') + '">' + esc(item.name || 'Produto') + '</a>' +
          (detail ? '<small>' + esc(detail) + '</small>' : '') +
          '<button type="button" data-quality-remove-interest="' + esc(key) + '">Remover</button></div>' +
      '</div>';
    }).join('');
    var href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(interestMessage(items));
    footer.innerHTML = '<a class="quality-interest-whatsapp" href="' + href + '" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Consultar ' + items.length + (items.length === 1 ? ' produto' : ' produtos') + '</a>' +
      '<button type="button" class="quality-interest-clear" data-quality-clear-interest>Limpar lista</button>';
  }

  function openInterest(){
    var panel = interestPanel();
    renderInterestPanel();
    panel.classList.add('is-open');
    document.body.classList.add('quality-interest-open');
  }

  function closeInterest(){
    document.querySelector('.quality-interest-panel')?.classList.remove('is-open');
    document.body.classList.remove('quality-interest-open');
  }

  function ensureInterestNav(){
    var count = readInterest().length;
    var desktop = document.getElementById('nav-desktop');
    if (desktop && !desktop.querySelector('[data-quality-open-interest]')) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'quality-interest-nav quality-interest-nav-desktop';
      button.setAttribute('data-quality-open-interest','');
      var search = desktop.querySelector('.search-wrapper');
      if (search) desktop.insertBefore(button, search); else desktop.appendChild(button);
    }
    var mobile = document.getElementById('nav-mobile');
    if (mobile && !mobile.querySelector('[data-quality-open-interest]')) {
      var mobileButton = document.createElement('button');
      mobileButton.type = 'button';
      mobileButton.className = 'quality-interest-nav quality-interest-nav-mobile';
      mobileButton.setAttribute('data-quality-open-interest','');
      mobile.appendChild(mobileButton);
    }
    document.querySelectorAll('[data-quality-open-interest]').forEach(function(button){
      var countKey = String(count);
      if (button.getAttribute('data-quality-interest-count') !== countKey) {
        button.setAttribute('data-quality-interest-count', countKey);
        button.innerHTML = '<i class="fa-solid fa-list-check"></i><span>Minha lista</span><b>' + count + '</b>';
      }
      button.classList.toggle('has-items', count > 0);
      button.setAttribute('aria-label', 'Minha lista de interesse com ' + count + ' produto(s)');
    });
  }

  function refreshInterestUI(){
    ensureInterestNav();
    if (document.querySelector('.quality-interest-panel.is-open')) renderInterestPanel();
    document.querySelectorAll('[data-quality-add-interest]').forEach(function(button){
      var slug = button.getAttribute('data-product-slug') || '';
      var has = readInterest().some(function(item){ return normalize(item.slug) === normalize(slug); });
      button.classList.toggle('is-added', has);
      if (button.classList.contains('quality-product-interest-primary')) {
        button.innerHTML = has ? '<i class="fa-solid fa-check"></i> Na minha lista' : '<i class="fa-solid fa-list-check"></i> Adicionar à minha lista';
      }
    });
  }

  function productBySlug(items, slug){
    var key = normalize(slug);
    return (items || []).find(function(product){
      return normalize(product.slug) === key || String(product.id || '') === String(slug || '');
    }) || null;
  }

  function isSmartphone(product){
    return categoryOf(product) === 'smartphones';
  }

  function readCompareSlugs(){
    try {
      var parsed = JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      var out = [];
      parsed.forEach(function(value){
        var slug = String(value || '').trim();
        if (slug && !out.some(function(x){ return normalize(x) === normalize(slug); })) out.push(slug);
      });
      return out.slice(0,COMPARE_MAX);
    } catch (_) { return []; }
  }

  function writeCompareSlugs(slugs){
    var clean = [];
    (slugs || []).forEach(function(value){
      var slug = String(value || '').trim();
      if (slug && !clean.some(function(x){ return normalize(x) === normalize(slug); })) clean.push(slug);
    });
    clean = clean.slice(0,COMPARE_MAX);
    comparePageRequestSeq++;
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(clean)); } catch (_) {}
    setComparePageUrl(clean);
    refreshCompareUI();
    return clean;
  }

  function comparePageUrl(slugs){
    var host = String(window.location.hostname || '');
    var isLocalPreview = /^(localhost|127\.)/i.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || String(window.location.pathname || '').indexOf('/site/') === 0;
    var path = isLocalPreview ? '/site/view/comparar.html' : '/comparar.html';
    var values = (slugs || readCompareSlugs()).filter(Boolean);
    return path + (values.length ? '?p=' + encodeURIComponent(values.join(',')) : '');
  }

  function compareFromUrl(){
    if (!document.getElementById('quality-compare-root')) return null;
    try {
      var raw = new URLSearchParams(window.location.search).get('p') || '';
      if (!raw) return null;
      var values = raw.split(',').map(function(x){ return decodeURIComponent(x).trim(); }).filter(Boolean).slice(0,COMPARE_MAX);
      if (values.length) {
        try { localStorage.setItem(COMPARE_KEY, JSON.stringify(values)); } catch (_) {}
        return values;
      }
    } catch (_) {}
    return null;
  }

  function setComparePageUrl(slugs){
    if (!document.getElementById('quality-compare-root') || !window.history || !history.replaceState) return;
    try { history.replaceState(null,'',comparePageUrl(slugs)); } catch (_) {}
  }

  function injectCompareStyles(){
    if (document.querySelector('link[data-quality-compare-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/commerce-compare.css?v=20260925-6';
    link.setAttribute('data-quality-compare-css','1');
    document.head.appendChild(link);
  }

  function compareNotice(message){
    var toast = document.querySelector('.quality-compare-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'quality-compare-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toast.__qualityTimer);
    toast.__qualityTimer = setTimeout(function(){ toast.classList.remove('is-visible'); },2200);
  }

  function toggleCompareSlug(slug){
    if (!slug) return false;
    var items = readCompareSlugs();
    var index = items.findIndex(function(x){ return normalize(x) === normalize(slug); });
    if (index >= 0) {
      items.splice(index,1);
      writeCompareSlugs(items);
      return false;
    }
    if (items.length >= COMPARE_MAX) {
      compareNotice('Você pode comparar até 3 celulares por vez.');
      return null;
    }
    items.push(slug);
    writeCompareSlugs(items);
    return true;
  }

  function refreshCompareButtons(){
    var selected = readCompareSlugs().map(normalize);
    document.querySelectorAll('[data-quality-compare]').forEach(function(button){
      var slug = button.getAttribute('data-quality-compare') || '';
      var active = selected.includes(normalize(slug));
      var state = active ? '1' : '0';
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',active?'true':'false');

      // Importante: não reescrever o conteúdo a cada passagem do MutationObserver.
      // innerHTML, mesmo com o mesmo valor, gera uma nova mutação e pode criar loop infinito.
      if (button.dataset.qualityCompareState === state) return;
      button.dataset.qualityCompareState = state;
      if (button.classList.contains('quality-compare-card-btn')) {
        button.innerHTML = active ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-code-compare"></i>';
        button.setAttribute('title', active ? 'Remover da comparação' : 'Comparar celular');
        button.setAttribute('aria-label', active ? 'Remover celular da comparação' : 'Adicionar celular à comparação');
      } else if (button.classList.contains('quality-product-compare-primary')) {
        button.innerHTML = active ? '<i class="fa-solid fa-check"></i> Na comparação — escolher outro' : '<i class="fa-solid fa-code-compare"></i> Comparar com outro celular';
      }
    });
  }

  function compareSlugSignature(slugs){
    return (slugs || []).map(normalize).join('|');
  }

  function bindCompareTrayControls(tray){
    if (!tray || tray.dataset.qualityCompareControlsBound === '1') return;
    tray.dataset.qualityCompareControlsBound = '1';
    // Captura os dois comandos críticos diretamente na bandeja. Isso evita que
    // páginas restauradas pelo botão Voltar (bfcache) deixem X/Limpar sem resposta.
    tray.addEventListener('click', function(event){
      var remove = event.target.closest && event.target.closest('[data-quality-compare-remove]');
      if (remove) {
        event.preventDefault();
        event.stopPropagation();
        var removeSlug = remove.getAttribute('data-quality-compare-remove') || '';
        writeCompareSlugs(readCompareSlugs().filter(function(x){ return normalize(x) !== normalize(removeSlug); }));
        return;
      }
      var clear = event.target.closest && event.target.closest('[data-quality-compare-clear]');
      if (clear) {
        event.preventDefault();
        event.stopPropagation();
        writeCompareSlugs([]);
      }
    }, true);
  }

  function ensureCompareTray(){
    var requestSeq = ++compareTrayRequestSeq;
    if (document.getElementById('quality-compare-root')) {
      var existingOnPage = document.querySelector('.quality-compare-tray');
      if (existingOnPage) existingOnPage.remove();
      return;
    }
    var slugs = readCompareSlugs();
    var requestedSignature = compareSlugSignature(slugs);
    var tray = document.querySelector('.quality-compare-tray');
    if (!slugs.length) {
      if (tray) {
        tray.hidden = true;
        tray.dataset.qualityCompareSignature = '';
      }
      return;
    }
    getCatalog().then(function(items){
      // Uma leitura antiga do catálogo pode terminar depois de o cliente clicar
      // em X/Limpar. Nunca deixe essa resposta assíncrona restaurar a seleção antiga.
      if (requestSeq !== compareTrayRequestSeq) return;
      var currentSlugs = readCompareSlugs();
      if (compareSlugSignature(currentSlugs) !== requestedSignature) return;

      var products = currentSlugs.map(function(slug){ return productBySlug(items,slug); }).filter(function(p){ return p && isVisibleProduct(p) && isSmartphone(p); });
      if (!products.length) {
        if (tray) { tray.hidden = true; tray.dataset.qualityCompareSignature = ''; }
        return;
      }
      if (!tray) {
        tray = document.createElement('div');
        tray.className = 'quality-compare-tray';
        tray.setAttribute('role','region');
        tray.setAttribute('aria-label','Celulares selecionados para comparar');
        document.body.appendChild(tray);
      }
      bindCompareTrayControls(tray);
      tray.hidden = false;
      var traySignature = products.map(function(product){ return product.slug || product.id || ''; }).join('|');
      if (tray.dataset.qualityCompareSignature === traySignature) return;
      tray.dataset.qualityCompareSignature = traySignature;
      var slots = [];
      for (var i=0;i<COMPARE_MAX;i++) {
        var product = products[i];
        if (product) {
          var slug = product.slug || product.id || '';
          slots.push('<div class="quality-compare-tray-chip is-filled"><img src="' + esc(productImageAsset(product)) + '" alt=""><span>' + esc(product.name || product.nome || 'Celular') + '</span><button type="button" data-quality-compare-remove="' + esc(slug) + '" aria-label="Remover da comparação"><i class="fa-solid fa-xmark"></i></button></div>');
        } else {
          slots.push('<a class="quality-compare-tray-chip is-empty" href="/comparar.html" aria-label="Adicionar outro celular"><i class="fa-solid fa-plus"></i><span>Adicionar</span></a>');
        }
      }
      var ready = products.length > 1;
      tray.innerHTML =
        '<div class="quality-compare-tray-title"><i class="fa-solid fa-code-compare"></i><span>Comparar celulares</span><b>' + products.length + '/' + COMPARE_MAX + '</b></div>' +
        '<div class="quality-compare-tray-items">' + slots.join('') + '</div>' +
        '<div class="quality-compare-tray-actions"><button type="button" class="quality-compare-tray-clear" data-quality-compare-clear>Limpar</button><a class="quality-compare-tray-go' + (ready?'':' is-waiting') + '" href="' + esc(ready ? comparePageUrl(products.map(function(p){return p.slug || p.id;})) : '/comparar.html') + '">' + (ready ? 'Comparar (' + products.length + ')' : 'Escolher outro') + '</a></div>';
    });
  }

  function decorateCompareCards(){
    if (document.getElementById('quality-compare-root')) return;
    var cards = document.querySelectorAll('.produto-card, .product-card');
    if (!cards.length) { refreshCompareButtons(); ensureCompareTray(); return; }
    getCatalog().then(function(items){
      cards.forEach(function(card){
        var link = card.querySelector('a[href*="/produto/"]');
        var slug = link ? slugFromUrl(link.getAttribute('href')) : '';
        if (!slug) return;
        var product = productBySlug(items,slug);
        var old = card.querySelector('.quality-compare-card-btn');
        if (!product || !isVisibleProduct(product) || !isSmartphone(product)) {
          if (old) old.remove();
          var oldActions = card.querySelector('.quality-card-actions');
          if (oldActions) oldActions.classList.remove('has-quality-compare');
          return;
        }
        var actions = card.querySelector('.quality-card-actions');
        if (!actions) {
          var imageWrap = card.querySelector('.quality-card-image-wrap') || card;
          actions = document.createElement('div');
          actions.className = 'quality-card-actions quality-card-actions-generated';
          imageWrap.appendChild(actions);
        }
        actions.classList.add('has-quality-compare');
        if (!old) {
          old = document.createElement('button');
          old.type = 'button';
          old.className = 'quality-card-action quality-compare-card-btn';
          old.setAttribute('data-quality-compare',slug);
          actions.appendChild(old);
        } else {
          old.classList.add('quality-card-action');
          old.setAttribute('data-quality-compare',slug);
          if (old.parentElement !== actions) actions.appendChild(old);
        }
      });
      refreshCompareButtons();
      ensureCompareTray();
    });
  }

  function addProductCompareButton(product, buybox){
    if (!product || !buybox || !isSmartphone(product) || buybox.querySelector('.quality-product-compare-primary')) return;
    var slug = product.slug || product.id || '';
    if (!slug) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'quality-product-compare-primary';
    button.setAttribute('data-quality-compare',slug);
    button.setAttribute('data-quality-compare-open','1');
    button.innerHTML = '<i class="fa-solid fa-code-compare"></i> Comparar com outro celular';
    buybox.appendChild(button);
    refreshCompareButtons();
  }

  function ensureCompareCategoryLink(){
    var path = normalize(window.location.pathname || '');
    var query = normalize(window.location.search || '');
    var title = normalize((document.getElementById('categoria-titulo') || {}).textContent || '');
    var smartphonePage = path.indexOf('/smartphones') >= 0 || query.indexOf('smartphones') >= 0 || title.indexOf('smartphone') >= 0;
    if (!smartphonePage) return;
    var toolbar = document.querySelector('.quality-category-toolbar');
    if (!toolbar || toolbar.querySelector('[data-quality-open-comparator]')) return;
    var link = document.createElement('a');
    link.href = comparePageUrl();
    link.className = 'quality-compare-category-link';
    link.setAttribute('data-quality-open-comparator','1');
    link.innerHTML = '<i class="fa-solid fa-code-compare"></i> Comparar celulares';
    toolbar.appendChild(link);
  }

  function specPairs(product){
    var html = String(product && (product.descriptionLong || product.description || product.descricao) || '');
    if (!html) return [];
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var pairs = [];
    holder.querySelectorAll('li').forEach(function(li){
      var strong = li.querySelector('strong,b');
      if (!strong) return;
      var label = String(strong.textContent || '').replace(/:\s*$/,'').trim();
      if (!label) return;
      var full = String(li.textContent || '').replace(/\s+/g,' ').trim();
      var value = full.replace(new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*:?\\s*','i'),'').trim();
      if (value) pairs.push({label:label,value:value});
    });
    return pairs;
  }

  function pickSpec(product, patterns){
    var pairs = specPairs(product);
    for (var i=0;i<patterns.length;i++) {
      var re = patterns[i];
      var found = pairs.find(function(pair){ return re.test(normalize(pair.label)); });
      if (found && found.value) return found.value;
    }
    return '';
  }

  function capacityFallback(name, kind){
    var text = String(name || '');
    if (kind === 'ram') {
      var ram = text.match(/(\d{1,2})\s*GB\s*(?:de\s*)?(?:RAM|ram)\b/);
      if (ram) return ram[1] + 'GB';
    }
    var matches = [];
    text.replace(/(\d{1,4})\s*(GB|TB)\b/gi,function(_,num,unit){ matches.push({num:Number(num),unit:unit.toUpperCase()}); return _; });
    if (kind === 'storage') {
      var tb = matches.find(function(x){ return x.unit === 'TB'; });
      if (tb) return tb.num + 'TB';
      var gb = matches.filter(function(x){ return x.unit === 'GB' && x.num >= 64; }).sort(function(a,b){return b.num-a.num;})[0];
      if (gb) return gb.num + 'GB';
    }
    return '';
  }

  function specificationListItems(product){
    var html = String(product && (product.descriptionLong || product.description || product.descricao) || '');
    if (!html) return [];
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var marker = Array.prototype.slice.call(holder.querySelectorAll('strong,b')).find(function(node){
      return /especificacoes/.test(normalize(node.textContent || ''));
    });
    var list = null;
    if (marker) {
      var base = marker.closest('p,div,h2,h3,h4,h5') || marker.parentElement;
      var next = base && base.nextElementSibling;
      var guard = 0;
      while (next && guard < 4) {
        if (/^(UL|OL)$/i.test(next.tagName || '')) { list = next; break; }
        next = next.nextElementSibling;
        guard++;
      }
    }
    var nodes = list ? list.querySelectorAll(':scope > li') : holder.querySelectorAll('li');
    return Array.prototype.slice.call(nodes).map(function(li){
      return String(li.textContent || '').replace(/\s+/g,' ').trim();
    }).filter(Boolean);
  }

  function specIndex(product){
    var index = {};
    function set(label, value){
      var key = normalize(label).replace(/:\s*$/,'');
      var clean = String(value || '').replace(/\s+/g,' ').trim().replace(/^[-–—:\s]+/,'').trim();
      if (key && clean && !index[key]) index[key] = clean;
    }
    specificationListItems(product).forEach(function(text){
      var colon = text.match(/^([^:]{2,48}):\s*(.+)$/);
      if (colon) {
        set(colon[1], colon[2]);
        return;
      }
      var match;
      if ((match = text.match(/^Tela\s+(.+)$/i))) set('Tela', match[1]);
      else if ((match = text.match(/^Processador\s+(.+)$/i))) set('Processador', match[1]);
      else if ((match = text.match(/^(\d{1,2})\s*GB\s+de\s+RAM\b/i))) set('Memória RAM', match[1] + 'GB');
      else if ((match = text.match(/^(\d{2,4})\s*GB\s+de\s+armazenamento\b/i))) set('Armazenamento', match[1] + 'GB');
      else if ((match = text.match(/^C[aâ]mera\s+principal\s+(.+)$/i))) set('Câmera principal', match[1].replace(/^de\s+/i,''));
      else if ((match = text.match(/^C[aâ]mera\s+frontal\s+(.+)$/i))) set('Câmera frontal', match[1].replace(/^de\s+/i,''));
      else if ((match = text.match(/^Bateria\s+(.+)$/i))) set('Bateria', match[1].replace(/^de\s+/i,''));
      else if (/^(Bluetooth|Wi-?Fi|Wi‑Fi|5G|4G)\b/i.test(text)) set('Conectividade', text);
    });
    return index;
  }

  function firstIndexed(index, keys){
    for (var i=0;i<keys.length;i++) {
      var value = index[normalize(keys[i])];
      if (value) return value;
    }
    return '';
  }

  function uniqueJoin(values, separator){
    var seen = [];
    values.filter(Boolean).forEach(function(value){
      var clean = String(value).trim();
      var norm = normalize(clean);
      if (!norm) return;
      if (!seen.some(function(existing){ return normalize(existing) === norm || normalize(existing).indexOf(norm) >= 0 || norm.indexOf(normalize(existing)) >= 0; })) seen.push(clean);
    });
    return seen.join(separator || ' • ');
  }

  function ramFromMemory(value){
    var text = String(value || '');
    if (!text) return '';
    if (!/armazenamento|memoria interna/i.test(normalize(text))) return text;
    var boost = text.match(/(\d{1,2}\s*GB\s*RAM(?:\s*f[ií]sica)?(?:\s*\+\s*(?:at[eé]\s*)?\d{1,2}\s*GB\s*RAM\s*Boost)?)/i);
    if (boost) return boost[1].replace(/\s+/g,' ').trim();
    var simple = text.match(/(\d{1,2})\s*GB\s*RAM\b/i);
    return simple ? simple[1] + 'GB RAM' : '';
  }

  function storageFromMemory(value){
    var text = String(value || '');
    if (!text) return '';
    var matches = [];
    text.replace(/(\d{2,4})\s*(GB|TB)\b/gi,function(_,num,unit){
      var n = Number(num);
      if (unit.toUpperCase() === 'TB' || n >= 64) matches.push(num + unit.toUpperCase());
      return _;
    });
    return matches.length ? matches[matches.length - 1] : '';
  }

  function systemFromText(value){
    var text = String(value || '');
    var match = text.match(/\b(HyperOS\s*[\d.]+|Android\s*\d+(?:\s+[A-Za-z0-9.]+)?|iOS\s*\d+(?:\.\d+)?)\b/i);
    return match ? match[1] : '';
  }

  function connectorFromText(value){
    var text = String(value || '');
    var match = text.match(/\b(USB\s*-?\s*C|Lightning)\b/i);
    return match ? match[1].replace(/\s+/g,'').replace(/USBC/i,'USB-C') : '';
  }

  function protectionFromDescription(product){
    var html = String(product && (product.descriptionLong || product.description || product.descricao) || '');
    if (!html) return '';
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var text = String(holder.textContent || '').replace(/\s+/g,' ');
    var match = text.match(/\b(IP\d{2}(?:\s*\/\s*IP\d{2})?)\b/i);
    return match ? match[1].replace(/\s+/g,'') : '';
  }

  function compareSpecs(product){
    var variations = product && product.variations ? product.variations : {};
    var colors = Array.isArray(variations.colors) ? variations.colors.map(function(c){return typeof c === 'string' ? c : c && c.name;}).filter(Boolean) : [];
    var name = product && (product.name || product.nome) || '';
    var idx = specIndex(product);

    var screen = firstIndexed(idx,['Tela','Display']) || pickSpec(product,[/^tela$/, /^display$/]);
    var processor = firstIndexed(idx,['Processador','Plataforma','Chipset','Chip']) || pickSpec(product,[/^processador$/, /^plataforma$/, /^chipset$/, /^chip$/]);

    var memory = firstIndexed(idx,['Memória','Memoria']);
    var ram = firstIndexed(idx,['Memória RAM','Memoria RAM','RAM']) || ramFromMemory(memory) || capacityFallback(name,'ram');
    var storage = firstIndexed(idx,['Armazenamento','Opções de Armazenamento','Opcoes de Armazenamento','Memória Interna','Memoria Interna']) || storageFromMemory(memory) || capacityFallback(name,'storage');

    var rear = firstIndexed(idx,['Câmeras','Cameras','Câmeras Traseiras','Cameras Traseiras','Câmera Traseira','Camera Traseira','Câmera principal','Camera principal']);
    var front = firstIndexed(idx,['Câmera Frontal','Camera Frontal']);
    var cameras = rear;
    if (front && cameras && normalize(cameras).indexOf(normalize(front)) < 0) cameras += ' • Frontal: ' + front;
    else if (front && !cameras) cameras = 'Frontal: ' + front;
    if (!cameras) cameras = pickSpec(product,[/^cameras$/, /^cameras traseiras$/, /^camera traseira$/, /^camera principal$/]);

    var battery = firstIndexed(idx,['Bateria']) || pickSpec(product,[/^bateria$/]);
    var charging = firstIndexed(idx,['Carregamento','Recarga']);
    if (charging && battery && normalize(battery).indexOf(normalize(charging)) < 0) battery += ' • ' + charging;

    var network = firstIndexed(idx,['Rede']);
    var connectivityDirect = firstIndexed(idx,['Conectividade']);
    var connectivity = uniqueJoin([network,connectivityDirect],' • ');
    if (!connectivity) {
      if (/\b5g\b/i.test(name)) connectivity = '5G';
      else if (/\b4g\b/i.test(name)) connectivity = '4G';
    }

    var protection = firstIndexed(idx,['Proteção','Protecao','Resistência','Resistencia']) || protectionFromDescription(product);
    var security = firstIndexed(idx,['Segurança','Seguranca']) || pickSpec(product,[/^seguranca$/]);
    var audio = firstIndexed(idx,['Áudio','Audio']) || pickSpec(product,[/^audio$/]);
    var connector = firstIndexed(idx,['Conector','Conexões','Conexoes']) || connectorFromText(connectivity);
    var system = firstIndexed(idx,['Sistema operacional','Sistema','Software']) || systemFromText(connectivity);
    if (system && connectivity) {
      connectivity = connectivity.replace(new RegExp('(?:,?\\s*(?:e\\s*)?)?' + system.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*$','i'),'').replace(/[\s,•-]+$/,'').trim();
    }
    var warranty = firstIndexed(idx,['Garantia']) || pickSpec(product,[/^garantia$/]) || String(product && product.logistics && product.logistics.warranty || '').trim();

    return {
      brand: brandOf(product) || '—',
      condition: conditionOf(product) || '—',
      screen: screen || '—',
      processor: processor || '—',
      ram: ram || '—',
      storage: storage || '—',
      cameras: cameras || '—',
      battery: battery || '—',
      connectivity: connectivity || '—',
      connector: connector || '—',
      protection: protection || '—',
      security: security || '—',
      audio: audio || '—',
      system: system || '—',
      colors: colors.length ? colors.join(', ') : '—',
      warranty: warranty || '—'
    };
  }

  var COMPARE_SECTIONS = [
    {title:'Informações gerais', rows:[['brand','Marca'],['condition','Condição'],['colors','Cores disponíveis']]},
    {title:'Tela e multimídia', rows:[['screen','Tela'],['cameras','Câmeras'],['audio','Áudio']]},
    {title:'Desempenho', rows:[['processor','Processador'],['ram','Memória RAM'],['storage','Armazenamento'],['system','Sistema operacional']]},
    {title:'Construção e segurança', rows:[['protection','Proteção / resistência'],['security','Segurança']]},
    {title:'Energia e autonomia', rows:[['battery','Bateria e carregamento']]},
    {title:'Conectividade', rows:[['connectivity','Rede / conectividade'],['connector','Conector']]},
    {title:'Pós-venda', rows:[['warranty','Garantia']]}
  ];

  function compareProductHeader(product){
    var name = product.name || product.nome || 'Celular';
    return '<div class="quality-compare-col-head"><img src="' + esc(productImageAsset(product)) + '" alt=""><div><strong>' + esc(name) + '</strong><a href="' + esc(productUrl(product)) + '">Ver produto</a></div></div>';
  }

  function compareWhatsAppUrl(product){
    var name = product.name || product.nome || 'este celular';
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent('Olá! Vim através do comparador do site da Quality Celulares e tenho interesse em ' + name);
  }


  function compareShareRows(){
    return [
      {group:'Informações gerais', items:[['Marca','brand'],['Condição','condition'],['Cores disponíveis','colors']]},
      {group:'Tela e multimídia', items:[['Tela','screen'],['Câmeras','cameras'],['Áudio','audio']]},
      {group:'Desempenho', items:[['Processador','processor'],['Memória RAM','ram'],['Armazenamento','storage'],['Sistema operacional','system']]},
      {group:'Construção e segurança', items:[['Proteção / resistência','protection'],['Segurança','security']]},
      {group:'Energia e autonomia', items:[['Bateria e carregamento','battery']]},
      {group:'Conectividade', items:[['Rede / conectividade','connectivity'],['Conector','connector']]}
    ];
  }

  function loadCanvasImage(src){
    return new Promise(function(resolve){
      if (!src) return resolve(null);
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function(){ resolve(img); };
      img.onerror = function(){ resolve(null); };
      img.src = src;
    });
  }

  function roundedRect(ctx, x, y, w, h, r){
    var radius = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function canvasTextLines(ctx, text, maxWidth){
    var words = String(text || '—').replace(/\s+/g,' ').trim().split(' ');
    if (!words.length || !words[0]) return ['—'];
    var lines = [];
    var line = words[0];
    for (var i=1;i<words.length;i++) {
      var test = line + ' ' + words[i];
      if (ctx.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line); line = words[i]; }
    }
    lines.push(line);
    return lines;
  }

  function drawCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
    var lines = canvasTextLines(ctx, text, maxWidth);
    var visible = typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines;
    if (typeof maxLines === 'number' && lines.length > maxLines && visible.length) {
      var last = visible[visible.length - 1];
      while (last.length > 3 && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = last + '…';
    }
    visible.forEach(function(line, idx){ ctx.fillText(line, x, y + idx * lineHeight); });
    return visible.length;
  }

  function compareShareFileName(products){
    var slugs = products.map(function(product){ return (product.slug || product.id || 'celular').toString().replace(/[^a-z0-9-]+/gi,'-'); });
    return 'quality-comparacao-' + slugs.join('-') + '.png';
  }

  function createCompareShareBlob(products){
    var specs = products.map(compareSpecs);
    var groups = compareShareRows();
    var width = 1600;
    var margin = 56;
    var gap = 18;
    var labelWidth = 270;
    var cols = Math.max(products.length, 2);
    var colWidth = Math.floor((width - margin * 2 - labelWidth - gap * (cols - 1)) / cols);
    var visibleGroups = groups.map(function(group){
      var items = group.items.filter(function(item){
        return specs.some(function(spec){ return (spec[item[1]] || '—') !== '—'; });
      });
      return { group: group.group, items: items };
    }).filter(function(group){ return group.items.length; });

    var headerH = 132;
    var heroH = 76;
    var cardH = 230;
    var tableTop = headerH + heroH + cardH + 36;
    var groupHeaderH = 44;
    var rowHeights = [];
    var totalRowsH = 0;

    var measurer = document.createElement('canvas').getContext('2d');
    visibleGroups.forEach(function(group){
      totalRowsH += groupHeaderH;
      group.items.forEach(function(item){
        measurer.font = '600 22px Arial';
        var labelLines = canvasTextLines(measurer, item[0], labelWidth - 30).length;
        var maxLines = labelLines;
        specs.forEach(function(spec){
          measurer.font = '500 20px Arial';
          var count = canvasTextLines(measurer, spec[item[1]] || '—', colWidth - 24).length;
          if (count > maxLines) maxLines = count;
        });
        var rowH = Math.max(54, 26 + maxLines * 24);
        rowHeights.push({ key: item[1], label: item[0], height: rowH, group: group.group });
        totalRowsH += rowH;
      });
    });
    var footerH = 92;
    var height = tableTop + totalRowsH + footerH;

    return Promise.all([
      loadCanvasImage('/images/logo.png'),
      Promise.all(products.map(function(product){ return loadCanvasImage(productImageAsset(product)); }))
    ]).then(function(result){
      var logo = result[0];
      var productImages = result[1];
      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f5f7fb';
      ctx.fillRect(0,0,width,height);

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.translate(width * 0.52, height * 0.56);
      ctx.rotate(-0.22);
      if (logo) {
        ctx.drawImage(logo, -300, -140, 600, 230);
      }
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Quality Celulares', 0, 120);
      ctx.restore();

      ctx.save();
      ctx.rotate(-0.24);
      ctx.textAlign = 'center';
      for (var wx = -width; wx < width * 1.8; wx += 420) {
        for (var wy = 120; wy < height * 1.8; wy += 230) {
          ctx.globalAlpha = 0.045;
          if (logo) {
            ctx.drawImage(logo, wx - 110, wy - 30, 220, 84);
          }
          ctx.globalAlpha = 0.035;
          ctx.fillStyle = '#dc2626';
          ctx.font = '800 48px Arial';
          ctx.fillText('Quality Celulares', wx + 70, wy + 34);
          ctx.globalAlpha = 0.028;
          ctx.font = '700 22px Arial';
          ctx.fillStyle = '#64748b';
          ctx.fillText('Comparativo oficial', wx + 70, wy + 68);
        }
      }
      ctx.restore();

      ctx.fillStyle = '#d30000';
      ctx.fillRect(0,0,width,headerH);
      if (logo) ctx.drawImage(logo, margin, 24, 190, 72);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 42px Arial';
      ctx.fillText('Comparativo de smartphones', margin + 230, 58);
      ctx.font = '500 20px Arial';
      ctx.fillText("Quality Celulares · material comparativo com marca d'água", margin + 230, 92);
      ctx.font = '600 18px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(new Date().toLocaleDateString('pt-BR'), width - margin, 58);
      ctx.fillText('qualitycel.com.br', width - margin, 86);
      ctx.textAlign = 'left';

      ctx.fillStyle = '#0f172a';
      ctx.font = '800 34px Arial';
      ctx.fillText('Compare lado a lado', margin, headerH + 40);
      ctx.fillStyle = '#475569';
      ctx.font = '500 18px Arial';
      ctx.fillText('Informações organizadas de forma clara para facilitar sua escolha.', margin, headerH + 68);

      var cardsY = headerH + heroH;
      products.forEach(function(product, idx){
        var x = margin + labelWidth + idx * (colWidth + gap);
        roundedRect(ctx, x, cardsY, colWidth, cardH, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#dbe2ea';
        ctx.lineWidth = 2;
        ctx.stroke();
        var img = productImages[idx];
        if (img) ctx.drawImage(img, x + 18, cardsY + 16, 92, 112);
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 22px Arial';
        drawCanvasText(ctx, product.name || product.nome || 'Celular', x + 124, cardsY + 42, colWidth - 142, 25, 3);
        ctx.fillStyle = '#64748b';
        ctx.font = '600 16px Arial';
        var meta = [brandOf(product), conditionOf(product)].filter(Boolean).join(' · ') || 'Smartphone';
        drawCanvasText(ctx, meta, x + 124, cardsY + 120, colWidth - 142, 20, 2);
        ctx.fillStyle = '#22c55e';
        roundedRect(ctx, x + 18, cardsY + cardH - 44, colWidth - 36, 28, 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Consulte a Quality no WhatsApp', x + colWidth / 2, cardsY + cardH - 25);
        ctx.textAlign = 'left';
      });

      ctx.fillStyle = '#0f172a';
      ctx.font = '800 24px Arial';
      ctx.fillText('Especificações', margin, cardsY + 30);
      ctx.fillStyle = '#475569';
      ctx.font = '500 16px Arial';
      ctx.fillText(products.length + ' modelos selecionados', margin, cardsY + 58);

      var y = tableTop;
      var rowCursor = 0;
      visibleGroups.forEach(function(group){
        roundedRect(ctx, margin, y, width - margin*2, groupHeaderH, 12);
        ctx.fillStyle = '#334155';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 21px Arial';
        ctx.fillText(group.group, margin + 18, y + 28);
        y += groupHeaderH;
        group.items.forEach(function(item, itemIndex){
          var info = rowHeights[rowCursor++];
          ctx.fillStyle = (itemIndex % 2 === 0) ? '#ffffff' : '#f8fafc';
          ctx.fillRect(margin, y, width - margin*2, info.height);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(margin, y, labelWidth, info.height);
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(margin, y + info.height);
          ctx.lineTo(width - margin, y + info.height);
          ctx.stroke();
          ctx.fillStyle = '#0f172a';
          ctx.font = '800 18px Arial';
          drawCanvasText(ctx, item[0], margin + 16, y + 28, labelWidth - 28, 21, 3);
          products.forEach(function(product, idx){
            var cellX = margin + labelWidth + idx * (colWidth + gap);
            ctx.fillStyle = '#111827';
            ctx.font = '500 18px Arial';
            drawCanvasText(ctx, specs[idx][item[1]] || '—', cellX + 10, y + 28, colWidth - 20, 22, 4);
          });
          y += info.height;
        });
      });

      ctx.fillStyle = '#475569';
      ctx.font = '600 17px Arial';
      ctx.fillText('Em caso de dúvida, confirme os detalhes com nossa equipe antes da compra.', margin, height - 48);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 14px Arial';
      ctx.fillText('Arquivo visual gerado automaticamente pelo comparador da Quality Celulares.', margin, height - 22);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#c2410c';
      ctx.font = '800 14px Arial';
      ctx.fillText("Com marca d'água Quality Celulares", width - margin, height - 22);
      ctx.textAlign = 'left';

      // Marca d'água final por cima de todo o comparativo. Isso dificulta recortes
      // que removam apenas o cabeçalho e mantém a identidade da Quality no conteúdo.
      ctx.save();
      ctx.rotate(-0.20);
      ctx.textAlign = 'center';
      for (var ox = -width; ox < width * 1.9; ox += 360) {
        for (var oy = 40; oy < height * 1.7; oy += 210) {
          ctx.globalAlpha = 0.075;
          if (logo) ctx.drawImage(logo, ox - 100, oy - 36, 200, 76);
          ctx.globalAlpha = 0.065;
          ctx.fillStyle = '#dc2626';
          ctx.font = '800 34px Arial';
          ctx.fillText('Quality Celulares', ox + 54, oy + 44);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.105;
      ctx.translate(width * 0.52, height * 0.58);
      ctx.rotate(-0.18);
      if (logo) ctx.drawImage(logo, -260, -105, 520, 198);
      ctx.restore();

      return new Promise(function(resolve, reject){
        canvas.toBlob(function(blob){
          if (blob) resolve(blob);
          else reject(new Error('Não foi possível gerar a imagem.'));
        }, 'image/png');
      });
    });
  }

  function shareCompareAsImage(products){
    if (products.length < 2) {
      compareNotice('Escolha pelo menos 2 celulares para compartilhar.');
      return;
    }
    compareNotice('Gerando imagem da comparação...');
    createCompareShareBlob(products).then(function(blob){
      var file = new File([blob], compareShareFileName(products), { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({
          title: 'Comparativo Quality Celulares',
          text: 'Comparativo gerado pela Quality Celulares',
          files: [file]
        }).catch(function(){});
        return;
      }
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = compareShareFileName(products);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      compareNotice('Comparação pronta para compartilhar.');
    }).catch(function(){
      compareNotice('Não foi possível gerar a imagem agora.');
    });
  }


  function renderCompareMobile(products, onlyDifferences){
    if (products.length < 2) return '';
    var specs = products.map(compareSpecs);
    var count = products.length;
    var html = '<div class="quality-compare-mobile quality-compare-mobile-cols-' + count + '">';
    html += '<div class="quality-compare-mobile-products">';
    products.forEach(function(product, idx){
      var name = product.name || product.nome || 'Celular';
      html += '<div class="quality-compare-mobile-product"><span class="quality-compare-mobile-num">' + (idx + 1) + '</span><img src="' + esc(productImageAsset(product)) + '" alt=""><strong>' + esc(name) + '</strong></div>';
    });
    html += '</div>';

    COMPARE_SECTIONS.forEach(function(section){
      var rows = '';
      section.rows.forEach(function(row){
        var key = row[0], label = row[1];
        var values = specs.map(function(spec){ return spec[key] || '—'; });
        if (values.every(function(v){ return v === '—'; })) return;
        var normalized = values.map(function(v){ return normalize(v); });
        var same = normalized.every(function(v){ return v === normalized[0]; });
        if (onlyDifferences && same) return;
        rows += '<div class="quality-compare-mobile-row' + (!same ? ' is-different' : '') + '"><div class="quality-compare-mobile-label">' + esc(label) + '</div><div class="quality-compare-mobile-values" style="--quality-compare-mobile-cols:' + count + '">';
        values.forEach(function(value, idx){
          rows += '<div class="quality-compare-mobile-value' + (value === '—' ? ' is-missing' : '') + '"><span>' + (idx + 1) + '</span><p>' + esc(value) + '</p></div>';
        });
        rows += '</div></div>';
      });
      if (rows) html += '<section class="quality-compare-mobile-section"><h3>' + esc(section.title) + '</h3>' + rows + '</section>';
    });

    html += '<div class="quality-compare-mobile-actions">';
    products.forEach(function(product, idx){
      html += '<a href="' + esc(compareWhatsAppUrl(product)) + '" target="_blank" rel="noopener" data-quality-compare-whatsapp="' + esc(product.slug || product.id || '') + '"><span>' + (idx + 1) + '</span><i class="fa-brands fa-whatsapp"></i> Consultar</a>';
    });
    html += '</div></div>';
    return html;
  }

  function renderCompareTable(products, onlyDifferences){
    if (products.length < 2) {
      return '<div class="quality-compare-hint"><i class="fa-solid fa-mobile-screen-button"></i><strong>Escolha pelo menos 2 celulares</strong><span>Use os campos acima para montar a comparação.</span></div>';
    }
    var specs = products.map(compareSpecs);
    var html = '<div class="quality-compare-table-shell"><div class="quality-compare-table-scroll"><table class="quality-compare-table"><thead><tr><th>Especificação</th>' +
      products.map(compareProductHeader).map(function(value){return '<th>'+value+'</th>';}).join('') + '</tr></thead><tbody>';
    COMPARE_SECTIONS.forEach(function(section){
      var sectionRows = '';
      section.rows.forEach(function(row){
        var key=row[0], label=row[1];
        var values=specs.map(function(spec){return spec[key] || '—';});
        if (values.every(function(v){return v==='—';})) return;
        var normValues=values.map(function(v){return normalize(v);});
        var same=normValues.every(function(v){return v===normValues[0];});
        sectionRows += '<tr data-same="' + (same?'1':'0') + '" class="' + (!same?'quality-compare-row-different ':'') + (onlyDifferences && same?'is-hidden-same':'') + '"><td>' + esc(label) + '</td>' +
          values.map(function(value){return '<td class="' + (value==='—'?'quality-compare-value-missing':'') + '">' + esc(value) + '</td>';}).join('') + '</tr>';
      });
      if (sectionRows) html += '<tr class="quality-compare-section-row"><th colspan="' + (products.length+1) + '">' + esc(section.title) + '</th></tr>' + sectionRows;
    });
    html += '</tbody></table><div class="quality-compare-cta-row" style="grid-template-columns:180px repeat(' + products.length + ',minmax(0,1fr));min-width:720px"><div class="quality-compare-cta-label">Falar com a Quality</div>' +
      products.map(function(product){return '<div class="quality-compare-cta"><a href="' + esc(compareWhatsAppUrl(product)) + '" target="_blank" rel="noopener" data-quality-compare-whatsapp="' + esc(product.slug || product.id || '') + '"><i class="fa-brands fa-whatsapp"></i> Consultar</a></div>';}).join('') +
      '</div></div></div>';
    return '<div class="quality-compare-desktop">' + html + '</div>' + renderCompareMobile(products, onlyDifferences);
  }

  function compareSelectorSlot(index, product){
    if (product) {
      return '<div class="quality-compare-slot is-filled" data-quality-compare-slot="' + index + '"><div class="quality-compare-product-head"><img src="' + esc(productImageAsset(product)) + '" alt="' + esc(product.name || 'Celular') + '"><div><strong>' + esc(product.name || product.nome || 'Celular') + '</strong><small>' + esc(brandOf(product) || '') + (conditionOf(product)?' · '+esc(conditionOf(product)):'') + '</small></div><button type="button" class="quality-compare-remove" data-quality-compare-remove-page="' + esc(product.slug || product.id || '') + '" aria-label="Remover celular"><i class="fa-solid fa-xmark"></i></button></div></div>';
    }
    return '<div class="quality-compare-slot" data-quality-compare-slot="' + index + '"><label class="quality-compare-add-label">Adicionar celular</label><input type="search" class="quality-compare-search" data-quality-compare-search="' + index + '" placeholder="Digite modelo ou marca…" autocomplete="off"><div class="quality-compare-results" data-quality-compare-results="' + index + '"></div></div>';
  }

  function updateCompareSearch(input, smartphones, selected){
    var index = input.getAttribute('data-quality-compare-search');
    var popup = document.querySelector('[data-quality-compare-results="' + index + '"]');
    if (!popup) return;
    var term = normalize(input.value);
    if (term.length < 2) { popup.classList.remove('is-open'); popup.innerHTML=''; return; }
    var selectedNorm = selected.map(normalize);
    var matches = smartphones.filter(function(product){
      var slug = product.slug || product.id || '';
      if (selectedNorm.includes(normalize(slug))) return false;
      var hay = normalize((product.name || product.nome || '') + ' ' + brandOf(product));
      return hay.includes(term);
    }).slice(0,8);
    popup.innerHTML = matches.length ? matches.map(function(product){
      return '<button type="button" class="quality-compare-result" data-quality-compare-pick="' + esc(product.slug || product.id || '') + '"><img src="' + esc(productImageAsset(product)) + '" alt=""><span><strong>' + esc(product.name || product.nome || 'Celular') + '</strong><small>' + esc(brandOf(product) || '') + '</small></span></button>';
    }).join('') : '<div class="quality-compare-empty-result">Nenhum celular encontrado.</div>';
    popup.classList.add('is-open');
  }

  function renderComparePage(){
    var root = document.getElementById('quality-compare-root');
    if (!root) return;
    var requestSeq = ++comparePageRequestSeq;
    var fromUrl = compareFromUrl();
    var selected = fromUrl || readCompareSlugs();
    getCatalog().then(function(items){
      if (requestSeq !== comparePageRequestSeq) return;
      var smartphones = items.filter(function(p){return isVisibleProduct(p) && isSmartphone(p);});
      selected = selected.filter(function(slug){return !!productBySlug(smartphones,slug);}).slice(0,COMPARE_MAX);
      try { localStorage.setItem(COMPARE_KEY,JSON.stringify(selected)); } catch (_) {}
      setComparePageUrl(selected);
      var products = selected.map(function(slug){return productBySlug(smartphones,slug);}).filter(Boolean);
      if(products.length >= 2){
        var analyticsSignature=products.map(function(product){return normalize(product.slug||product.id||'');}).filter(Boolean).sort().join('|');
        if(analyticsSignature && analyticsSignature!==compareAnalyticsSignature){
          compareAnalyticsSignature=analyticsSignature;
          trackCompareEvent('compare_view',selected,'');
        }
      } else {
        compareAnalyticsSignature='';
      }
      var onlyDifferences = false;
      var slots = [];
      for (var i=0;i<COMPARE_MAX;i++) slots.push(compareSelectorSlot(i,products[i] || null));
      root.innerHTML =
        '<section class="quality-compare-selector-wrap"><div class="quality-compare-selectors">' + slots.join('') + '</div></section>' +
        renderCompareTable(products,false) +
        '<p class="quality-compare-disclaimer">Em caso de dúvida, confirme os detalhes com nossa equipe antes da compra.</p>';

      document.querySelectorAll('[data-quality-compare-search]').forEach(function(input){
        input.addEventListener('input',function(){updateCompareSearch(input,smartphones,selected);});
        input.addEventListener('focus',function(){if(normalize(input.value).length>=2) updateCompareSearch(input,smartphones,selected);});
      });

      var share = document.querySelector('[data-quality-compare-share]');
      if (share) share.hidden = products.length < 2;
      refreshCompareButtons();
    });
  }

  function refreshCompareUI(){
    refreshCompareButtons();
    ensureCompareTray();
    if (document.getElementById('quality-compare-root')) renderComparePage();
  }

  function selectedVariationFromDom(){
    var result = {};
    document.querySelectorAll('.produto-variacao-btn.ativa[data-var-type]').forEach(function(button){
      var type = button.getAttribute('data-var-type');
      if (type) result[type] = button.getAttribute('data-var-value') || button.textContent.trim();
    });
    return result;
  }

  function bindImageProtection(){
    if (window.__qualityImageProtectionV14) return;
    window.__qualityImageProtectionV14 = true;

    // Proteção de UX: dificulta salvar/copiar imagens pelo menu de contexto, arrastar
    // ou copiar uma seleção que contenha imagem. Não interfere em links nem na galeria.
    document.addEventListener('contextmenu', function(event){
      if (event.target && event.target.closest && event.target.closest('img')) event.preventDefault();
    }, true);
    document.addEventListener('dragstart', function(event){
      if (event.target && event.target.closest && event.target.closest('img')) event.preventDefault();
    }, true);
    document.addEventListener('copy', function(event){
      try {
        var selection = window.getSelection && window.getSelection();
        if (!selection || !selection.rangeCount) return;
        for (var i=0;i<selection.rangeCount;i++) {
          var frag = selection.getRangeAt(i).cloneContents();
          if (frag && frag.querySelector && frag.querySelector('img')) { event.preventDefault(); return; }
        }
      } catch (_) {}
    }, true);
  }

  function eventBindings(){
    if (window.__qualityStorefrontEventsV1) return;
    window.__qualityStorefrontEventsV1 = true;
    bindImageProtection();
    document.addEventListener('click', function(event){
      var compare = event.target.closest && event.target.closest('[data-quality-compare]');
      if (compare) {
        event.preventDefault();
        event.stopPropagation();
        var compareSlug = compare.getAttribute('data-quality-compare') || '';
        var active = toggleCompareSlug(compareSlug);
        if(active !== null) trackCompareEvent(active?'compare_add':'compare_remove',readCompareSlugs(),compareSlug);
        if (compare.getAttribute('data-quality-compare-open') === '1' && active !== null) {
          if (active === false) writeCompareSlugs([compareSlug]);
          window.location.href = comparePageUrl(readCompareSlugs());
        }
        return;
      }
      var compareRemove = event.target.closest && event.target.closest('[data-quality-compare-remove]');
      if (compareRemove) {
        event.preventDefault();
        var removeSlug = compareRemove.getAttribute('data-quality-compare-remove') || '';
        var afterRemove=writeCompareSlugs(readCompareSlugs().filter(function(x){ return normalize(x) !== normalize(removeSlug); }));
        trackCompareEvent('compare_remove',afterRemove,removeSlug);
        return;
      }
      if (event.target.closest && event.target.closest('[data-quality-compare-clear]')) {
        event.preventDefault();
        var beforeClear=readCompareSlugs();
        writeCompareSlugs([]);
        trackCompareEvent('compare_clear',beforeClear,'');
        return;
      }
      var pageRemove = event.target.closest && event.target.closest('[data-quality-compare-remove-page]');
      if (pageRemove) {
        event.preventDefault();
        var pageSlug = pageRemove.getAttribute('data-quality-compare-remove-page') || '';
        var afterPageRemove=writeCompareSlugs(readCompareSlugs().filter(function(x){return normalize(x)!==normalize(pageSlug);}));
        trackCompareEvent('compare_remove',afterPageRemove,pageSlug);
        return;
      }
      var pick = event.target.closest && event.target.closest('[data-quality-compare-pick]');
      if (pick) {
        event.preventDefault();
        var pickSlug = pick.getAttribute('data-quality-compare-pick') || '';
        var current = readCompareSlugs();
        var added=false;
        if (current.length < COMPARE_MAX && !current.some(function(x){return normalize(x)===normalize(pickSlug);})) { current.push(pickSlug); added=true; }
        var afterPick=writeCompareSlugs(current);
        if(added) trackCompareEvent('compare_add',afterPick,pickSlug);
        return;
      }
      var shareCompare = event.target.closest && event.target.closest('[data-quality-compare-share]');
      if (shareCompare) {
        event.preventDefault();
        getCatalog().then(function(items){
          var smartphones = items.filter(function(p){ return isVisibleProduct(p) && isSmartphone(p); });
          var selected = (compareFromUrl() || readCompareSlugs()).filter(function(slug){ return !!productBySlug(smartphones, slug); }).slice(0, COMPARE_MAX);
          var products = selected.map(function(slug){ return productBySlug(smartphones, slug); }).filter(Boolean);
          trackCompareEvent('compare_share',selected,'');
          shareCompareAsImage(products);
        });
        return;
      }

      var compareWhatsapp = event.target.closest && event.target.closest('[data-quality-compare-whatsapp]');
      if(compareWhatsapp){
        var compareWhatsappSlug=compareWhatsapp.getAttribute('data-quality-compare-whatsapp')||'';
        trackCompareEvent('compare_whatsapp',readCompareSlugs(),compareWhatsappSlug);
      }

      var open = event.target.closest && event.target.closest('[data-quality-open-interest]');
      if (open) { event.preventDefault(); openInterest(); return; }
      if (event.target.closest && event.target.closest('[data-quality-close-interest]')) { event.preventDefault(); closeInterest(); return; }
      var remove = event.target.closest && event.target.closest('[data-quality-remove-interest]');
      if (remove) { event.preventDefault(); removeInterest(remove.getAttribute('data-quality-remove-interest')); renderInterestPanel(); return; }
      if (event.target.closest && event.target.closest('[data-quality-clear-interest]')) { event.preventDefault(); writeInterest([]); renderInterestPanel(); return; }
      var add = event.target.closest && event.target.closest('[data-quality-add-interest]');
      if (add) {
        event.preventDefault();
        event.stopPropagation();
        var slug = add.getAttribute('data-product-slug') || slugFromUrl(add.getAttribute('data-product-url') || '') || currentProductSlug();
        getCatalog().then(function(items){
          var product = productBySlug(items, slug);
          if (!product) return;
          var variation = add.classList.contains('quality-product-interest-primary') ? selectedVariationFromDom() : {};
          addInterest(product, variation);
        });
        return;
      }
    });
    document.addEventListener('keydown', function(event){ if (event.key === 'Escape') closeInterest(); });
    window.addEventListener('storage', function(event){
      if (event.key === INTEREST_KEY) refreshInterestUI();
      if (event.key === COMPARE_KEY) refreshCompareUI();
    });
    window.addEventListener('pageshow', function(){
      // O navegador pode restaurar a Home inteira do cache ao voltar do comparador.
      // Sincronize a bandeja com o localStorage em vez de confiar no DOM congelado.
      compareTrayRequestSeq++;
      refreshCompareUI();
    });
  }

  function decorateProductCards(){
    var cards = document.querySelectorAll('.produto-card, .product-card, .produto-relacionado-card');
    if (!cards.length) return;
    cards.forEach(function(card){
      if (card.dataset.qualityInterestDecorated === '1') return;
      var link = card.querySelector('a[href*="/produto/"]');
      var slug = link ? slugFromUrl(link.getAttribute('href')) : '';
      if (!slug) return;
      card.dataset.qualityInterestDecorated = '1';
      var actions = card.querySelector('.quality-card-actions');
      if (!actions) {
        var imageWrap = card.querySelector('.quality-card-image-wrap') || card;
        actions = document.createElement('div');
        actions.className = 'quality-card-actions quality-card-actions-generated';
        imageWrap.appendChild(actions);
      }
      if (!actions.querySelector('[data-quality-add-interest]')) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'quality-card-action quality-interest-card-btn';
        button.setAttribute('data-quality-add-interest','');
        button.setAttribute('data-product-slug', slug);
        button.setAttribute('data-product-url', productUrl({slug:slug}));
        button.setAttribute('aria-label','Adicionar à minha lista');
        button.setAttribute('title','Adicionar à minha lista');
        button.innerHTML = '<i class="fa-solid fa-list-check"></i>';
        actions.appendChild(button);
      }
    });
  }

  function bindAutocompleteInput(input){
    if (!input || input.dataset.qualityAutocompleteBound === '1') return;
    input.dataset.qualityAutocompleteBound = '1';
    var wrapper = input.closest('.search-wrapper, .search-wrapper-mobile') || input.parentElement;
    if (!wrapper) return;
    wrapper.classList.add('quality-search-host');
    var popup = document.createElement('div');
    popup.className = 'quality-search-suggestions';
    popup.setAttribute('role','listbox');
    wrapper.appendChild(popup);
    var timer = null;
    var activeIndex = -1;

    function options(){ return Array.from(popup.querySelectorAll('.quality-search-suggestion')); }
    function setActive(index){
      var list=options();
      if(!list.length){activeIndex=-1;return;}
      activeIndex=(index+list.length)%list.length;
      list.forEach(function(item,i){item.classList.toggle('is-active',i===activeIndex);item.setAttribute('aria-selected',i===activeIndex?'true':'false');});
      if(list[activeIndex]&&list[activeIndex].scrollIntoView)list[activeIndex].scrollIntoView({block:'nearest'});
    }
    function close(){ popup.classList.remove('is-open'); popup.innerHTML = ''; activeIndex=-1; }
    function render(items,term){
      var ranked=searchCatalog(items,term,{minScore:90,limit:6});
      if(!ranked.length){
        var whatsapp='https://wa.me/'+WHATSAPP_NUMBER+'?text='+encodeURIComponent('Olá! Procurei por "'+term+'" no site da Quality Celulares e não encontrei. Vocês conseguem me ajudar?');
        popup.innerHTML='<div class="quality-search-suggestion-head">Não encontramos uma correspondência clara</div>'+
          '<a class="quality-search-footer-link" href="'+esc(searchResultsUrl(term))+'"><i class="fa-solid fa-magnifying-glass"></i><span>Buscar mesmo assim por “'+esc(term)+'”</span></a>'+
          '<a class="quality-search-footer-link is-whatsapp" href="'+esc(whatsapp)+'" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i><span>Perguntar para a Quality</span></a>';
        popup.classList.add('is-open');
        activeIndex=-1;
        return;
      }
      popup.innerHTML='<div class="quality-search-suggestion-head">Produtos</div>'+ranked.map(function(entry){
        var product=entry.product,brand=brandOf(product),meta=searchFacetLabel(product);
        return '<a class="quality-search-suggestion" role="option" aria-selected="false" href="' + esc(productUrl(product)) + '">' +
          '<img src="' + esc(productImageAsset(product)) + '" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';">' +
          '<span><strong>' + esc(product.name || product.nome || 'Produto') + '</strong>' +
          '<small>' + esc(meta || brand || displayCategory(product)) + '</small></span></a>';
      }).join('')+'<a class="quality-search-all" href="'+esc(searchResultsUrl(term))+'"><span>Ver todos os resultados para “'+esc(term)+'”</span><i class="fa-solid fa-arrow-right"></i></a>';
      popup.classList.add('is-open');
      activeIndex=-1;
    }

    input.addEventListener('input', function(){
      clearTimeout(timer);
      var term = String(input.value||'').trim();
      if (normalize(term).length < 2) { close(); return; }
      timer = setTimeout(function(){ getCatalog().then(function(items){ render(items,term); }); }, 90);
    });
    input.addEventListener('focus', function(){ if (normalize(input.value).length >= 2 && popup.innerHTML) popup.classList.add('is-open'); });
    document.addEventListener('click', function(event){ if (!wrapper.contains(event.target)) close(); });
    input.addEventListener('keydown', function(event){
      if(event.key==='Escape'){close();return;}
      if(!popup.classList.contains('is-open'))return;
      var list=options();
      if(event.key==='ArrowDown'&&list.length){event.preventDefault();setActive(activeIndex+1);}
      else if(event.key==='ArrowUp'&&list.length){event.preventDefault();setActive(activeIndex-1);}
      else if(event.key==='Enter'&&activeIndex>=0&&list[activeIndex]){event.preventDefault();event.stopImmediatePropagation();window.location.assign(list[activeIndex].getAttribute('href'));}
    });
  }

  function ensureAutocomplete(){
    bindAutocompleteInput(document.getElementById('search-input'));
    bindAutocompleteInput(document.getElementById('search-input-mobile'));
  }

  function filterParamValues(name){
    return String(new URLSearchParams(window.location.search).get(name) || '').split(',').map(function(x){ return normalize(x); }).filter(Boolean);
  }

  function cardProductSlug(card){
    var link = card.querySelector('a[href*="/produto/"]');
    return link ? slugFromUrl(link.getAttribute('href')) : '';
  }

  function facetSort(key,values){
    function capacityMb(value){var m=String(value||'').match(/([0-9.]+)\s*(TB|GB)/i);if(!m)return 0;var n=parseFloat(m[1])||0;return /TB/i.test(m[2])?n*1024:n;}
    if(key==='storage'||key==='ram') return values.sort(function(a,b){return capacityMb(a.label)-capacityMb(b.label);});
    if(key==='network') return values.sort(function(a,b){return String(b.label).localeCompare(String(a.label),'pt-BR',{numeric:true});});
    return values.sort(function(a,b){return String(a.label).localeCompare(String(b.label),'pt-BR');});
  }

  function buildCategoryFilters(){
    var container = document.getElementById('produtos-container');
    if (!container) return;

    function currentCards(){
      return Array.from(container.querySelectorAll(':scope > .produto-card, :scope > .product-card'));
    }
    function cardSignature(cards){
      if (!cards.length) return '';
      return [cards.length, cardProductSlug(cards[0]) || '', cardProductSlug(cards[cards.length - 1]) || ''].join('|');
    }
    function filterNodes(){
      return Array.from(document.querySelectorAll('.quality-category-filters'));
    }
    function removeDuplicateFilters(keep){
      filterNodes().forEach(function(node){ if (!keep || node !== keep) node.remove(); });
    }

    var cards = currentCards();
    if (!cards.length) {
      removeDuplicateFilters(null);
      container.__qualityFilterSignature = '';
      return;
    }

    var signature = cardSignature(cards);
    var existingFilters = filterNodes();

    // Evita corrida entre o init e o MutationObserver enquanto o catálogo
    // ainda está sendo carregado. Sem esta trava, dois painéis podiam ser
    // inseridos lado a lado na mesma categoria.
    if (container.__qualityFilterBuilding) {
      container.__qualityFilterRebuildQueued = true;
      return;
    }

    // Saneia qualquer duplicação já presente no DOM.
    if (existingFilters.length > 1) {
      existingFilters.slice(1).forEach(function(node){ node.remove(); });
      existingFilters = existingFilters.slice(0, 1);
    }

    var existing = existingFilters[0] || null;
    if (existing && container.__qualityFilterSignature === signature) return;
    if (existing) existing.remove();

    container.__qualityFilterBuilding = true;
    container.__qualityFilterRebuildQueued = false;

    var isSearchPage = container.dataset.qualitySearchResults === '1' || !!new URLSearchParams(location.search).get(SEARCH_PARAM);

    getCatalog().then(function(items){
      // Reconsulta os cards após a etapa assíncrona para considerar produtos
      // que terminaram de renderizar enquanto o catálogo carregava.
      cards = currentCards();
      if (!cards.length) {
        removeDuplicateFilters(null);
        container.__qualityFilterSignature = '';
        return;
      }
      signature = cardSignature(cards);

      var bySlug = {};
      items.filter(isVisibleProduct).forEach(function(product){ bySlug[normalize(product.slug)] = product; bySlug[String(product.id||'')] = product; });
      var pageEntries = [];
      cards.forEach(function(card){
        var slug = cardProductSlug(card);
        var product = bySlug[normalize(slug)] || bySlug[String(slug||'')];
        if (!product) return;
        var facets = {
          brand: brandOf(product) ? [brandOf(product)] : [],
          category: displayCategory(product) ? [displayCategory(product)] : [],
          condition: conditionOf(product) ? [conditionOf(product)] : [],
          storage: storageValues(product),
          ram: ramValues(product),
          network: networkValues(product),
          color: colorValues(product)
        };
        Object.keys(facets).forEach(function(key){ card.dataset['qualityFacet'+key.charAt(0).toUpperCase()+key.slice(1)] = facets[key].map(normalize).join('||'); });
        pageEntries.push({product:product,card:card,facets:facets});
      });
      if (!pageEntries.length) {
        removeDuplicateFilters(null);
        container.__qualityFilterSignature = signature;
        return;
      }

      var defs = [
        {key:'brand',title:'Marca',param:'marca'},
        {key:'category',title:'Categoria',param:'categoria',searchOnly:true},
        {key:'condition',title:'Condição',param:'condicao'},
        {key:'storage',title:'Armazenamento',param:'armazenamento'},
        {key:'ram',title:'Memória RAM',param:'ram'},
        {key:'network',title:'Rede',param:'rede'},
        {key:'color',title:'Cor',param:'cor'}
      ];
      var groups=[];
      defs.forEach(function(def){
        if(def.searchOnly&&!isSearchPage)return;
        var map={};
        pageEntries.forEach(function(entry){
          (entry.facets[def.key]||[]).forEach(function(label){
            var value=normalize(label);if(!value)return;
            if(!map[value])map[value]={value:value,label:String(label),count:0};
            map[value].count++;
          });
        });
        var values=facetSort(def.key,Object.keys(map).map(function(key){return map[key];}));
        if(values.length<2)return;
        groups.push({def:def,values:values,selected:filterParamValues(def.param)});
      });

      if(!groups.length){
        removeDuplicateFilters(null);
        container.__qualityFilterSignature = signature;
        return;
      }

      var shell = container.parentElement && container.parentElement.classList.contains('quality-category-layout') ? container.parentElement : null;
      if(!shell){
        shell=document.createElement('div');shell.className='quality-category-layout';
        var toolbar=document.querySelector('.quality-category-toolbar');
        if(toolbar&&toolbar.parentNode)toolbar.parentNode.insertBefore(shell,toolbar.nextSibling);else container.parentNode.insertBefore(shell,container);
        shell.appendChild(container);
      }

      // Garante a invariável: somente um painel de filtros por página.
      removeDuplicateFilters(null);

      var aside=document.createElement('aside');aside.className='quality-category-filters';shell.insertBefore(aside,container);

      function checkboxGroup(group,index){
        var cls=group.values.length>8?' quality-filter-options-scroll':'';
        return '<fieldset class="quality-filter-group" data-quality-filter-group="'+esc(group.def.key)+'"><legend>'+esc(group.def.title)+'</legend><div class="quality-filter-options'+cls+'">'+group.values.map(function(item){
          return '<label><input type="checkbox" data-quality-filter="'+esc(group.def.key)+'" data-quality-param="'+esc(group.def.param)+'" value="'+esc(item.value)+'"'+(group.selected.includes(item.value)?' checked':'')+'><span>'+esc(item.label)+'</span><small>'+item.count+'</small></label>';
        }).join('')+'</div></fieldset>';
      }

      aside.innerHTML='<div class="quality-filter-head"><strong>Filtros</strong><button type="button" data-quality-toggle-filters aria-expanded="false"><i class="fa-solid fa-sliders"></i> <span>Filtrar</span><b data-quality-filter-active-count></b></button></div>'+        '<div class="quality-filter-body">'+groups.map(checkboxGroup).join('')+'<button type="button" class="quality-filter-clear" data-quality-clear-filters>Limpar filtros</button></div><div class="quality-filter-result" aria-live="polite"></div>';

      function chosen(type){ return Array.from(aside.querySelectorAll('input[data-quality-filter="'+type+'"]:checked')).map(function(input){return normalize(input.value);}); }
      function cardValues(card,key){var attr='qualityFacet'+key.charAt(0).toUpperCase()+key.slice(1);return String(card.dataset[attr]||'').split('||').filter(Boolean);}
      function syncUrl(){
        var url=new URL(window.location.href);
        groups.forEach(function(group){var values=chosen(group.def.key);if(values.length)url.searchParams.set(group.def.param,values.join(','));else url.searchParams.delete(group.def.param);});
        history.replaceState(null,'',url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash);
      }
      function applyFilters(){
        var selections={};groups.forEach(function(group){selections[group.def.key]=chosen(group.def.key);});
        var visible=0;
        cards.forEach(function(card){
          var show=groups.every(function(group){
            var selected=selections[group.def.key];if(!selected.length)return true;
            var values=cardValues(card,group.def.key);return selected.some(function(value){return values.includes(value);});
          });
          card.classList.toggle('quality-filter-hidden',!show);if(show)visible++;
        });
        var active=Object.keys(selections).reduce(function(total,key){return total+selections[key].length;},0);
        var badge=aside.querySelector('[data-quality-filter-active-count]');if(badge){badge.textContent=active?String(active):'';badge.hidden=!active;}
        var result=aside.querySelector('.quality-filter-result');if(result)result.textContent=visible+(visible===1?' produto':' produtos');
        aside.classList.toggle('has-active-filters',active>0);
        syncUrl();
      }
      aside.addEventListener('change',function(event){if(event.target.matches('input[data-quality-filter]'))applyFilters();});
      aside.addEventListener('click',function(event){
        var toggle=event.target.closest('[data-quality-toggle-filters]');
        if(toggle){var open=aside.classList.toggle('is-open');toggle.setAttribute('aria-expanded',open?'true':'false');}
        if(event.target.closest('[data-quality-clear-filters]')){aside.querySelectorAll('input[data-quality-filter]').forEach(function(input){input.checked=false;});applyFilters();}
      });

      container.__qualityFilterSignature = signature;
      applyFilters();
    }).catch(function(err){
      console.warn('[Quality Search] Falha ao montar filtros da categoria:', err);
    }).finally(function(){
      container.__qualityFilterBuilding = false;
      if (container.__qualityFilterRebuildQueued) {
        container.__qualityFilterRebuildQueued = false;
        if (window.requestAnimationFrame) window.requestAnimationFrame(buildCategoryFilters);
        else setTimeout(buildCategoryFilters, 0);
      }
    });
  }

  function descriptionHighlights(product){
    var html = String(product && (product.descriptionLong || product.description || product.descricao) || '');
    var result = [];
    if (html) {
      var holder = document.createElement('div');
      holder.innerHTML = html;
      holder.querySelectorAll('li').forEach(function(li){
        var text = li.textContent.replace(/\s+/g,' ').trim();
        if (text && text.length <= 170 && !result.some(function(x){return normalize(x)===normalize(text);})) result.push(text);
      });
    }
    var v = product && product.variations ? product.variations : {};
    function add(text){ if (text && !result.some(function(x){return normalize(x)===normalize(text);})) result.push(text); }
    if (Array.isArray(v.storage) && v.storage.length) add('Armazenamento: ' + v.storage.join(', '));
    if (Array.isArray(v.ram) && v.ram.length) add('Memória RAM: ' + v.ram.join(', '));
    if (Array.isArray(v.colors) && v.colors.length) add('Cores disponíveis: ' + v.colors.map(function(c){ return c.name || c; }).filter(Boolean).join(', '));
    return result.slice(0,6);
  }

  function availabilityFor(product, variation){
    var raw = String(product && product.virtualStore && product.virtualStore.availabilityStatus || product && product.availabilityStatus || 'available').trim().toLowerCase();
    if (raw === 'consult') return {available:null, label:'Consulte disponibilidade'};
    if (raw === 'unavailable') return {available:false, label:'Indisponível'};
    // Regra comercial da vitrine: produto publicado aparece como disponível por padrão.
    // O usuário pode alterar explicitamente esse status na área Loja Virtual do painel.
    return {available:true, label:'Disponível'};
  }

  function updateProductCommercialCard(product){
    var card = document.querySelector('.quality-product-buybox');
    if (!card) return;
    var variation = selectedVariationFromDom();
    var availability = availabilityFor(product, variation);
    var status = card.querySelector('[data-quality-product-availability]');
    if (status) {
      var availabilityClass = availability.available === true ? 'is-available' : availability.available === false ? 'is-unavailable' : 'is-consult';
      var availabilityIcon = availability.available === true ? 'fa-circle-check' : availability.available === false ? 'fa-circle-xmark' : 'fa-circle-info';
      status.className = 'quality-product-availability ' + availabilityClass;
      status.innerHTML = '<i class="fa-solid ' + availabilityIcon + '"></i> ' + esc(availability.label);
    }
    var whatsapp = card.querySelector('.btn-whatsapp');
    if (whatsapp) {
      var detail = variationText(variation);
      var message = 'Olá! Vim através do site da Quality Celulares e tenho interesse em ' + (product.name || product.nome || 'este produto') + (detail ? ' — ' + detail : '');
      whatsapp.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      whatsapp.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp';
      syncMobileProductCta(product, whatsapp.href);
    }
  }

  function productBreadcrumb(product){
    var category = categoryOf(product);
    var categoryName = displayCategory(product);
    var brand = brandOf(product);
    return '<nav class="quality-product-breadcrumb" aria-label="Navegação estrutural">' +
      '<a href="/">Início</a><i class="fa-solid fa-chevron-right"></i>' +
      (category ? '<a href="/' + encodeURIComponent(category) + '/">' + esc(categoryName || category) + '</a><i class="fa-solid fa-chevron-right"></i>' : '') +
      (brand && category ? '<a href="/' + encodeURIComponent(category) + '/?marca=' + encodeURIComponent(normalize(brand)) + '">' + esc(brand) + '</a><i class="fa-solid fa-chevron-right"></i>' : '') +
      '<span>' + esc(product.name || product.nome || 'Produto') + '</span></nav>';
  }

  function enhanceProductPage(product){
    var box = document.getElementById('produto-detalhe');
    var layout = box && box.querySelector('.produto-layout');
    if (!box || !layout) return false;
    if (layout.dataset.qualityMarketplaceReady === '1') {
      ensureReturnToResultsLink();
      ensureMobileProductCta(product);
      updateProductCommercialCard(product);
      return true;
    }
    layout.dataset.qualityMarketplaceReady = '1';
    document.body.classList.add('quality-marketplace-ready');
    box.classList.add('quality-product-detail-shell');

    var gallery = layout.querySelector('.produto-galeria');
    var info = layout.querySelector('.produto-info');
    if (!gallery || !info) return false;

    if (!box.querySelector('.quality-product-breadcrumb')) box.insertAdjacentHTML('afterbegin', productBreadcrumb(product));
    ensureReturnToResultsLink();

    var name = product.name || product.nome || 'Produto';
    var brand = brandOf(product);
    var condition = conditionOf(product);
    var category = categoryOf(product);
    var h1 = info.querySelector('h1');
    if (h1) {
      var eyebrow = document.createElement('div');
      eyebrow.className = 'quality-product-eyebrow';
      eyebrow.innerHTML = (condition ? '<span class="quality-condition-badge">' + esc(condition) + '</span>' : '') +
        (brand ? '<a href="' + (category ? '/' + encodeURIComponent(category) + '/?marca=' + encodeURIComponent(normalize(brand)) : '#') + '">Marca: <strong>' + esc(brand) + '</strong></a>' : '');
      info.insertBefore(eyebrow, h1);
    }

    var actions = info.querySelector('.quality-detail-actions');
    if (actions) actions.classList.add('quality-detail-actions-marketplace');

    var paragraphs = Array.from(info.children).filter(function(el){ return el.tagName === 'P'; });
    paragraphs.forEach(function(p){
      if ((p.getAttribute('style') || '').includes('font-size:17px')) p.classList.add('quality-product-short-description');
    });

    var highlights = descriptionHighlights(product);
    if (highlights.length && !info.querySelector('.quality-product-highlights')) {
      var block = document.createElement('section');
      block.className = 'quality-product-highlights';
      block.innerHTML = '<h2>Resumo do produto</h2><ul>' + highlights.map(function(item){ return '<li>' + esc(item) + '</li>'; }).join('') + '</ul>';
      info.appendChild(block);
    }

    var buybox = document.createElement('aside');
    buybox.className = 'quality-product-buybox';
    buybox.innerHTML = '<div class="quality-product-buybox-title">Disponibilidade</div>' +
      '<div class="quality-product-availability" data-quality-product-availability></div>';

    var price = Array.from(info.querySelectorAll(':scope > p')).find(function(p){ return (p.getAttribute('style') || '').includes('font-size:24px'); });
    if (price) { price.classList.add('quality-product-price'); buybox.appendChild(price); }

    var variations = info.querySelector('.produto-variacoes-box');
    if (variations) buybox.appendChild(variations);

    var trust = document.createElement('div');
    trust.className = 'quality-product-trust';
    var warranty = String(product && product.logistics && product.logistics.warranty || '').trim();
    trust.innerHTML = '<div><i class="fa-solid fa-store"></i><span><strong>Quality Celulares · desde 2014</strong><small>Atendimento humano direto com nossa equipe</small></span></div>' +
      '<div><i class="fa-solid fa-shield-halved"></i><span><strong>Compra segura</strong><small>Confira nossos cuidados e canais oficiais. <a href="' + esc(securityPageUrl()) + '">Saiba mais</a></small></span></div>' +
      (warranty ? '<div><i class="fa-solid fa-certificate"></i><span><strong>Garantia</strong><small>' + esc(warranty) + '</small></span></div>' : '');
    buybox.appendChild(trust);

    var whatsapp = info.querySelector(':scope > .btn-whatsapp');
    if (whatsapp) { whatsapp.classList.add('quality-product-whatsapp-primary'); buybox.appendChild(whatsapp); }

    var interest = document.createElement('button');
    interest.type = 'button';
    interest.className = 'quality-product-interest-primary';
    interest.setAttribute('data-quality-add-interest','');
    interest.setAttribute('data-product-slug', product.slug || product.id || '');
    interest.innerHTML = '<i class="fa-solid fa-list-check"></i> Adicionar à minha lista';
    buybox.appendChild(interest);
    addProductCompareButton(product,buybox);

    layout.appendChild(buybox);
    ensureMobileProductCta(product);

    var description = info.querySelector('.produto-descricao-box');
    if (description) {
      var detailSection = document.createElement('section');
      detailSection.className = 'quality-product-description-section';
      detailSection.appendChild(description);
      box.appendChild(detailSection);
    }

    layout.addEventListener('click', function(event){
      if (event.target.closest('.produto-variacao-btn')) setTimeout(function(){ updateProductCommercialCard(product); }, 0);
    });
    updateProductCommercialCard(product);
    refreshInterestUI();
    return true;
  }

  function tokenSet(name){
    var stop = {para:1,com:1,novo:1,nova:1,gb:1,ram:1,tela:1,preto:1,branco:1,azul:1,verde:1,rosa:1,celular:1,smartphone:1};
    return normalize(name).split(/[^a-z0-9]+/).filter(function(token){ return token.length >= 3 && !stop[token]; });
  }

  function sameProduct(a,b){ return normalize(a && (a.slug || a.id)) === normalize(b && (b.slug || b.id)); }

  function manualRefs(product, field, all){
    var refs = product && product[field];
    if (!Array.isArray(refs)) refs = String(refs || '').split(/[\n,;]+/).map(function(x){return x.trim();}).filter(Boolean);
    return refs.map(function(ref){ return productBySlug(all, ref) || all.find(function(item){ return String(item.id || '') === String(ref); }); }).filter(Boolean);
  }


  function productKind(product){
    var name = normalize(product && (product.name || product.nome));
    var category = categoryOf(product);
    if (category === 'smartphones') return 'smartphone';
    if (/power bank|bateria magsafe|bateria magnetica/.test(name)) return 'powerbank';
    if (/carregador|fonte|adaptador de energia|adaptador.*usb/.test(name)) return 'charger';
    if (/\bcabo\b/.test(name)) return 'cable';
    if (/pelicula/.test(name)) return 'protector';
    if (/capa|capinha|case/.test(name)) return 'case';
    if (/fone|headset|buds|caixa de som|boombox/.test(name)) return 'audio';
    if (/watch|smartwatch|relogio|amazfit/.test(name)) return 'watch';
    if (/playstation|\bps4\b|\bps5\b|xbox|nintendo|console/.test(name)) return 'game';
    if (/notebook|macbook|laptop/.test(name)) return 'notebook';
    if (/impressora/.test(name)) return 'printer';
    if (/mouse/.test(name)) return 'mouse';
    if (/teclado/.test(name)) return 'keyboard';
    if (/suporte.*celular/.test(name)) return 'phone-holder';
    return category || 'other';
  }

  function similarScore(current, candidate){
    if (!candidate || !isVisibleProduct(candidate) || sameProduct(current,candidate)) return -999;
    var score = 0;
    var sameCategory = categoryOf(candidate) === categoryOf(current);
    if (sameCategory) score += 80; else score -= 40;
    var currentKind = productKind(current), candidateKind = productKind(candidate);
    if (currentKind === candidateKind) score += 55;
    else if (categoryOf(current) === 'acessorios' && sameCategory) score -= 60;
    var cb = brandOf(candidate), ob = brandOf(current);
    if (cb && ob && normalize(cb) === normalize(ob)) score += 35;
    var a = tokenSet(current.name || current.nome), b = tokenSet(candidate.name || candidate.nome);
    a.forEach(function(token){ if (b.includes(token)) score += 9; });
    if (conditionOf(candidate) === conditionOf(current)) score += 5;
    if (candidate.featured) score += 5;
    return score;
  }

  function crossSellScore(current, candidate){
    if (!candidate || !isVisibleProduct(candidate) || sameProduct(current,candidate)) return -999;
    var currentName = normalize(current.name || current.nome);
    var candidateName = normalize(candidate.name || candidate.nome);
    var currentCategory = categoryOf(current);
    var candidateCategory = categoryOf(candidate);
    if (candidateCategory.includes('assistencia')) return -999;
    var score = 0;
    var currentBrand = normalize(brandOf(current));
    var candidateBrand = normalize(brandOf(candidate));
    var currentTokens = tokenSet(currentName);
    var candidateTokens = tokenSet(candidateName);
    currentTokens.forEach(function(token){ if (candidateTokens.includes(token)) score += 8; });

    var smartphone = currentCategory === 'smartphones' || /iphone|galaxy|redmi|poco|\bmoto\b/.test(currentName);
    var game = /playstation|\bps4\b|\bps5\b|xbox|nintendo/.test(currentName);
    var notebook = /notebook|macbook|laptop/.test(currentName);
    var watch = /watch|smartwatch|relogio|amazfit/.test(currentName);
    var charger = /carregador|fonte|adaptador.*usb|usb-c.*20w/.test(currentName);
    var audio = /fone|headset|caixa de som|boombox/.test(currentName);

    if (smartphone) {
      if (/capa|capinha|case|pelicula/.test(candidateName)) score += 90;
      if (/carregador|fonte|cabo|power bank|magsafe/.test(candidateName)) score += 65;
      if (/fone|buds|bluetooth/.test(candidateName)) score += 30;
    }
    if (game && /controle|headset|fone|base|carregador|cabo/.test(candidateName)) score += 80;
    if (notebook && /mouse|teclado|mochila|suporte|base|hub|ssd|cabo/.test(candidateName)) score += 80;
    if (watch && /pulseira|pelicula|carregador|cabo/.test(candidateName)) score += 80;
    if (charger && ['cable','powerbank'].includes(productKind(candidate))) score += 75;
    if (audio && /cabo|carregador|case|suporte/.test(candidateName)) score += 45;
    if (currentBrand && candidateBrand && currentBrand === candidateBrand) score += 18;
    if (candidateCategory === 'acessorios') score += 12;
    return score;
  }

  function cardActions(product){
    var slug = product.slug || product.id || '';
    var url = productUrl(product);
    return '<div class="quality-card-actions">' +
      '<button type="button" class="quality-card-action quality-favorite-btn" data-quality-fav data-id="' + esc(product.id || slug) + '" data-slug="' + esc(slug) + '" data-name="' + esc(product.name || product.nome || 'Produto') + '" data-image="' + esc(product.image || product.imagem || '') + '" data-url="' + esc(url) + '" aria-label="Favoritar produto" title="Favoritar"><i class="fa-regular fa-heart"></i></button>' +
      '<button type="button" class="quality-card-action quality-share-btn" data-quality-share data-id="' + esc(product.id || slug) + '" data-slug="' + esc(slug) + '" data-name="' + esc(product.name || product.nome || 'Produto') + '" data-image="' + esc(product.image || product.imagem || '') + '" data-url="' + esc(url) + '" aria-label="Compartilhar produto" title="Compartilhar"><i class="fa-solid fa-share-nodes"></i></button>' +
      '<button type="button" class="quality-card-action quality-interest-card-btn" data-quality-add-interest data-product-slug="' + esc(slug) + '" data-product-url="' + esc(url) + '" aria-label="Adicionar à minha lista" title="Adicionar à minha lista"><i class="fa-solid fa-list-check"></i></button>' +
    '</div>';
  }

  function miniCard(product){
    var name = product.name || product.nome || 'Produto';
    return '<a class="produto-relacionado-card" href="' + esc(productUrl(product)) + '">' +
      '<div class="quality-card-image-wrap related-image-wrap">' + cardActions(product) +
      '<img src="' + esc(productImageAsset(product)) + '"' + productImageOriginalAttr(product) + ' alt="' + esc(name) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></div>' +
      '<strong>' + esc(name) + '</strong></a>';
  }

  function refreshRelatedSections(current, catalog){
    var relatedBlock = document.querySelector('.quality-recommendation-block');
    var crossBlock = document.querySelector('.quality-cross-sell-block');
    var selectedRelated = [];
    if (!relatedBlock && !crossBlock) return;
    if (relatedBlock && relatedBlock.dataset.qualitySmartRelated !== '1') {
      var manual = manualRefs(current,'relatedManualIds',catalog).filter(function(p){return !sameProduct(p,current);});
      var automatic = catalog.map(function(product){ return {product:product,score:similarScore(current,product)}; })
        .filter(function(x){ return x.score > 30 && !manual.some(function(m){return sameProduct(m,x.product);}); })
        .sort(function(a,b){return b.score-a.score;}).map(function(x){return x.product;});
      var items = manual.concat(automatic).slice(0,4);
      selectedRelated = items.slice();
      if (items.length) {
        relatedBlock.dataset.qualitySmartRelated = '1';
        var heading = relatedBlock.querySelector('.quality-section-heading');
        if (heading) heading.innerHTML = '<h2>Produtos semelhantes</h2><p>Outras opções que podem combinar com o que você procura</p>';
        var grid = relatedBlock.querySelector('.produtos-relacionados-grid');
        if (grid) grid.innerHTML = items.map(miniCard).join('');
      } else relatedBlock.remove();
    } else if (relatedBlock) {
      selectedRelated = Array.from(relatedBlock.querySelectorAll('a[href*="/produto/"]')).map(function(a){
        return productBySlug(catalog, slugFromUrl(a.getAttribute('href')));
      }).filter(Boolean);
    }
    if (crossBlock && crossBlock.dataset.qualitySmartRelated !== '1') {
      var manualCross = manualRefs(current,'crossSellIds',catalog).filter(function(p){return !sameProduct(p,current) && !selectedRelated.some(function(r){return sameProduct(r,p);});});
      var autoCross = catalog.map(function(product){ return {product:product,score:crossSellScore(current,product)}; })
        .filter(function(x){ return x.score >= 55 && !manualCross.some(function(m){return sameProduct(m,x.product);}) && !selectedRelated.some(function(r){return sameProduct(r,x.product);}); })
        .sort(function(a,b){return b.score-a.score;}).map(function(x){return x.product;});
      var crossItems = manualCross.concat(autoCross).slice(0,4);
      if (crossItems.length) {
        crossBlock.dataset.qualitySmartRelated = '1';
        var crossHeading = crossBlock.querySelector('.quality-section-heading');
        if (crossHeading) crossHeading.innerHTML = '<h2>Aproveite e leve junto</h2><p>Acessórios que combinam com este produto</p>';
        var crossGrid = crossBlock.querySelector('.produtos-relacionados-grid');
        if (crossGrid) crossGrid.innerHTML = crossItems.map(miniCard).join('');
      } else crossBlock.remove();
    }
    if (window.qualityUpdateFavoriteButtons) try { window.qualityUpdateFavoriteButtons(); } catch (_) {}
    decorateProductCards();
  }

  function enhanceCurrentProduct(){
    var box = document.getElementById('produto-detalhe');
    if (!box) return;
    clearTimeout(productEnhanceTimer);
    productEnhanceTimer = setTimeout(function(){
      var slug = currentProductSlug();
      if (!slug) return;
      Promise.all([getProducts(), getCatalog()]).then(function(all){
        var full = productBySlug(all[0],slug) || productBySlug(all[1],slug);
        if (!full || !isVisibleProduct(full)) return;
        enhanceProductPage(full);
        refreshRelatedSections(full, all[1]);
      });
    }, 20);
  }

  var observerRefreshScheduled = false;
  function runObservedEnhancements(){
    observerRefreshScheduled = false;
    ensureInterestNav();
    ensureAutocomplete();
    decorateProductCards();
    decorateCompareCards();
    ensureCompareCategoryLink();
    buildCategoryFilters();
    var productBox = document.getElementById('produto-detalhe');
    if (productBox) {
      var layout = productBox.querySelector('.produto-layout');
      var needsLayout = layout && layout.dataset.qualityMarketplaceReady !== '1';
      var related = document.querySelector('.quality-recommendation-block');
      var cross = document.querySelector('.quality-cross-sell-block');
      var needsRelated = (related && related.dataset.qualitySmartRelated !== '1') || (cross && cross.dataset.qualitySmartRelated !== '1');
      if (needsLayout || needsRelated) enhanceCurrentProduct();
    }
  }

  function initObservers(){
    if (globalObserver) return;
    globalObserver = new MutationObserver(function(){
      if (observerRefreshScheduled) return;
      observerRefreshScheduled = true;
      if (window.requestAnimationFrame) window.requestAnimationFrame(runObservedEnhancements);
      else setTimeout(runObservedEnhancements, 16);
    });
    globalObserver.observe(document.documentElement, {childList:true, subtree:true});
  }

  function init(){
    bindBrowseContinuity();
    injectCompareStyles();
    eventBindings();
    bindSearchSubmitOverride();
    initSearchResultsPage();
    ensureInterestNav();
    ensureAutocomplete();
    decorateProductCards();
    decorateCompareCards();
    ensureCompareCategoryLink();
    buildCategoryFilters();
    if (document.getElementById('produto-detalhe')) enhanceCurrentProduct();
    if (document.getElementById('quality-compare-root')) renderComparePage();
    initObservers();
    refreshInterestUI();
    refreshCompareUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
