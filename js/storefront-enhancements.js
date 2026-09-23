/*
 * Quality Storefront Experience V1 - 2026-09-22
 * Marketplace-style UX without checkout/prices dependency.
 * Features: product detail 3-column layout, intelligent related products,
 * interest list -> WhatsApp, search autocomplete, Brand/Condition filters.
 */
(function(){
  'use strict';
  if (window.__qualityStorefrontEnhancementsV1) return;
  window.__qualityStorefrontEnhancementsV1 = true;

  var WHATSAPP_NUMBER = '5555991407824';
  var INTEREST_KEY = 'quality_interest_list_v1';
  var CATALOG_URLS = ['/content/catalog-public.json', '/site/content/catalog-public.json'];
  var PRODUCTS_URLS = ['/content/products.json', '/site/content/products.json'];
  var catalogPromise = null;
  var productsPromise = null;
  var globalObserver = null;
  var productEnhanceTimer = null;

  function normalize(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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

  function brandOf(product){
    var explicit = String((product && (product.brand || (product.erp && product.erp.brand))) || '').trim();
    if (explicit && normalize(explicit) !== 'semmarca' && normalize(explicit) !== 'sem marca') {
      var brandKey = normalize(explicit);
      var known = {apple:'Apple', samsung:'Samsung', xiaomi:'Xiaomi', motorola:'Motorola', jbl:'JBL', hp:'HP', lg:'LG', wap:'WAP', epson:'Epson', lenovo:'Lenovo', acer:'Acer', nintendo:'Nintendo', sony:'Sony', intelbras:'Intelbras', kaidi:'Kaidi', sandisk:'SanDisk', c3tech:'C3Tech', amazfit:'Amazfit'};
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
      [/amazfit/, 'Amazfit'],
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
        '<a href="' + esc(item.url || '#') + '"><img src="' + esc(assetPath(item.image)) + '" alt="' + esc(item.name) + '" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></a>' +
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
    window.addEventListener('storage', function(event){ if (event.key === INTEREST_KEY) refreshInterestUI(); });
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

  function scoreSearch(product, term){
    var name = normalize(product.name || product.nome);
    var slug = normalize(product.slug);
    var brand = normalize(brandOf(product));
    if (!name.includes(term) && !slug.includes(term) && !brand.includes(term)) return -1;
    var score = 0;
    if (name === term) score += 100;
    if (name.startsWith(term)) score += 60;
    if (name.includes(term)) score += 35;
    if (brand === term) score += 30;
    if (product.featured) score += 8;
    return score;
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
    function close(){ popup.classList.remove('is-open'); popup.innerHTML = ''; }
    input.addEventListener('input', function(){
      clearTimeout(timer);
      var term = normalize(input.value);
      if (term.length < 2) { close(); return; }
      timer = setTimeout(function(){
        getCatalog().then(function(items){
          var matches = items.filter(isVisibleProduct).map(function(product){ return {product:product, score:scoreSearch(product, term)}; })
            .filter(function(x){ return x.score >= 0; }).sort(function(a,b){ return b.score-a.score; }).slice(0,6).map(function(x){return x.product;});
          if (!matches.length) { popup.innerHTML = '<div class="quality-search-empty">Nenhum produto encontrado</div>'; popup.classList.add('is-open'); return; }
          popup.innerHTML = matches.map(function(product){
            var brand = brandOf(product);
            return '<a class="quality-search-suggestion" role="option" href="' + esc(productUrl(product)) + '">' +
              '<img src="' + esc(assetPath(product.image || product.imagem)) + '" alt="" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';">' +
              '<span><strong>' + esc(product.name || product.nome || 'Produto') + '</strong>' +
              (brand ? '<small>' + esc(brand) + '</small>' : '') + '</span></a>';
          }).join('');
          popup.classList.add('is-open');
        });
      }, 100);
    });
    input.addEventListener('focus', function(){ if (normalize(input.value).length >= 2 && popup.innerHTML) popup.classList.add('is-open'); });
    document.addEventListener('click', function(event){ if (!wrapper.contains(event.target)) close(); });
    input.addEventListener('keydown', function(event){ if (event.key === 'Escape') close(); });
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

  function buildCategoryFilters(){
    var container = document.getElementById('produtos-container');
    if (!container || document.querySelector('.quality-category-filters')) return;
    var cards = Array.from(container.querySelectorAll('.produto-card, .product-card'));
    if (!cards.length) return;
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var categorySlug = normalize(pathParts[pathParts.length-1] || new URLSearchParams(location.search).get('slug') || '');
    if (!categorySlug || categorySlug === 'categoria.html') categorySlug = normalize(new URLSearchParams(location.search).get('slug') || new URLSearchParams(location.search).get('cat') || '');

    getCatalog().then(function(items){
      var bySlug = {};
      items.filter(isVisibleProduct).forEach(function(product){ bySlug[normalize(product.slug)] = product; });
      var pageProducts = [];
      cards.forEach(function(card){
        var slug = cardProductSlug(card);
        var product = bySlug[normalize(slug)];
        if (!product) return;
        var brand = brandOf(product);
        var condition = conditionOf(product);
        card.dataset.qualityBrand = normalize(brand);
        card.dataset.qualityCondition = normalize(condition);
        pageProducts.push(product);
      });
      if (!pageProducts.length) return;

      var brands = Array.from(new Set(pageProducts.map(brandOf).filter(Boolean))).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
      var conditions = Array.from(new Set(pageProducts.map(conditionOf).filter(Boolean))).sort(function(a,b){ return a.localeCompare(b,'pt-BR'); });
      if (!brands.length && conditions.length < 2) return;

      var shell = document.createElement('div');
      shell.className = 'quality-category-layout';
      var aside = document.createElement('aside');
      aside.className = 'quality-category-filters';
      var toolbar = document.querySelector('.quality-category-toolbar');
      if (toolbar && toolbar.parentNode) toolbar.parentNode.insertBefore(shell, toolbar.nextSibling);
      else container.parentNode.insertBefore(shell, container);
      shell.appendChild(aside);
      shell.appendChild(container);

      var selectedBrands = filterParamValues('marca');
      var selectedConditions = filterParamValues('condicao');

      function checkboxGroup(title, key, values, selected){
        if (!values.length || (key === 'condition' && values.length < 2)) return '';
        return '<fieldset class="quality-filter-group"><legend>' + esc(title) + '</legend>' + values.map(function(value){
          var normalized = normalize(value);
          return '<label><input type="checkbox" data-quality-filter="' + key + '" value="' + esc(normalized) + '"' + (selected.includes(normalized) ? ' checked' : '') + '><span>' + esc(value) + '</span></label>';
        }).join('') + '</fieldset>';
      }

      aside.innerHTML = '<div class="quality-filter-head"><strong>Filtros</strong><button type="button" data-quality-toggle-filters aria-expanded="false"><i class="fa-solid fa-sliders"></i> Filtrar</button></div>' +
        '<div class="quality-filter-body">' +
          checkboxGroup('Marca','brand',brands,selectedBrands) +
          checkboxGroup('Condição','condition',conditions,selectedConditions) +
          '<button type="button" class="quality-filter-clear" data-quality-clear-filters>Limpar filtros</button>' +
        '</div>' +
        '<div class="quality-filter-result" aria-live="polite"></div>';

      function chosen(type){ return Array.from(aside.querySelectorAll('input[data-quality-filter="' + type + '"]:checked')).map(function(input){ return normalize(input.value); }); }
      function syncUrl(){
        var url = new URL(window.location.href);
        var bs = chosen('brand');
        var cs = chosen('condition');
        if (bs.length) url.searchParams.set('marca', bs.join(',')); else url.searchParams.delete('marca');
        if (cs.length) url.searchParams.set('condicao', cs.join(',')); else url.searchParams.delete('condicao');
        history.replaceState(null,'',url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash);
      }
      function applyFilters(){
        var bs = chosen('brand');
        var cs = chosen('condition');
        var visible = 0;
        cards.forEach(function(card){
          var brand = normalize(card.dataset.qualityBrand || '');
          var condition = normalize(card.dataset.qualityCondition || '');
          var matchBrand = !bs.length || bs.includes(brand);
          var matchCondition = !cs.length || cs.includes(condition);
          var show = matchBrand && matchCondition;
          card.classList.toggle('quality-filter-hidden', !show);
          if (show) visible++;
        });
        var result = aside.querySelector('.quality-filter-result');
        if (result) result.textContent = visible + (visible === 1 ? ' produto' : ' produtos');
        syncUrl();
      }
      aside.addEventListener('change', function(event){ if (event.target.matches('input[data-quality-filter]')) applyFilters(); });
      aside.addEventListener('click', function(event){
        var toggle = event.target.closest('[data-quality-toggle-filters]');
        if (toggle) {
          var open = aside.classList.toggle('is-open');
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        if (event.target.closest('[data-quality-clear-filters]')) {
          aside.querySelectorAll('input[data-quality-filter]').forEach(function(input){ input.checked = false; });
          applyFilters();
        }
      });
      applyFilters();
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
    trust.innerHTML = '<div><i class="fa-solid fa-store"></i><span><strong>Quality Celulares</strong><small>Atendimento direto com nossa equipe</small></span></div>' +
      '<div><i class="fa-solid fa-shield-halved"></i><span><strong>Atendimento personalizado</strong><small>Consulte condições e tire suas dúvidas com nossa equipe</small></span></div>' +
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

    layout.appendChild(buybox);

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
      '<img src="' + esc(assetPath(product.image || product.imagem)) + '" alt="' + esc(name) + '" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></div>' +
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

  function initObservers(){
    if (globalObserver) return;
    globalObserver = new MutationObserver(function(){
      ensureInterestNav();
      ensureAutocomplete();
      decorateProductCards();
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
    });
    globalObserver.observe(document.documentElement, {childList:true, subtree:true});
  }

  function init(){
    eventBindings();
    ensureInterestNav();
    ensureAutocomplete();
    decorateProductCards();
    buildCategoryFilters();
    if (document.getElementById('produto-detalhe')) enhanceCurrentProduct();
    initObservers();
    refreshInterestUI();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
