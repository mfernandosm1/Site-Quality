(function(){
  'use strict';

  if (window.__qualityCategoryUIV12) return;
  window.__qualityCategoryUIV12 = true;

  function normalizeSearch(value){
    return (value || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function showSearchMessage(text){
    var message = document.getElementById('no-results');
    if (message) { message.textContent = text; message.style.display = 'block'; }
    else window.alert(text);
  }

  function fetchFirstJson(urls){
    var index = 0;
    function next(){
      if (index >= urls.length) return Promise.resolve({items:[]});
      var url = urls[index++];
      return fetch(url, {cache:'no-store'}).then(function(r){
        if (!r.ok) throw new Error('Falha ao carregar ' + url);
        var type = String(r.headers.get('content-type') || '').toLowerCase();
        if (type && type.indexOf('json') < 0) throw new Error('Resposta não JSON em ' + url);
        return r.json();
      }).catch(next);
    }
    return next();
  }

  function doSearch(query){
    var term = normalizeSearch(query);
    if (term && window.QualityAnalyticsTrack) {
      try { window.QualityAnalyticsTrack('search', {term: term}); } catch (_) {}
    }

    var cards = document.querySelectorAll('.product-card');
    var message = document.getElementById('no-results');
    if (!term) {
      cards.forEach(function(card){ card.style.display = 'flex'; });
      if (message) message.style.display = 'none';
      return;
    }

    var found = false;
    cards.forEach(function(card){
      var titleNode = card.querySelector('h3');
      var title = normalizeSearch(titleNode ? titleNode.textContent : '');
      var match = title.indexOf(term) !== -1;
      card.style.display = match ? 'flex' : 'none';
      if (match) found = true;
    });
    if (found) { if (message) message.style.display = 'none'; return; }

    Promise.all([
      fetchFirstJson(['/content/catalog-public.json', '/site/content/catalog-public.json', '/content/products.json', '/site/content/products.json']),
      fetch('/content/categories.json', {cache:'no-store'}).then(function(r){ return r.ok ? r.json() : {items:[]}; }).catch(function(){ return {items:[]}; })
    ]).then(function(all){
      var products = all[0].items || [];
      var categories = all[1].items || [];
      var product = products.find(function(p){
        if (!p || p.active === false) return false;
        return normalizeSearch(p.name || p.nome || '').indexOf(term) !== -1 || normalizeSearch(p.slug || '').indexOf(term) !== -1;
      });
      if (product) {
        var slug = product.slug || product.id;
        if (slug) window.location.assign('/produto/' + encodeURIComponent(slug) + '/');
        return;
      }
      var category = categories.find(function(c){
        return normalizeSearch(c.name || c.nome || '').indexOf(term) !== -1 || normalizeSearch(c.slug || '').indexOf(term) !== -1;
      });
      if (category && category.slug) { window.location.assign('/' + encodeURIComponent(category.slug) + '/'); return; }
      showSearchMessage('Nenhum produto encontrado.');
    }).catch(function(){ showSearchMessage('Erro ao buscar produto.'); });
  }

  function bindPair(input, button){
    if (!input || !button || button.dataset.qualityCategorySearchBound === '1') return;
    button.dataset.qualityCategorySearchBound = '1';
    button.addEventListener('click', function(){ doSearch(input.value); });
    input.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') doSearch(input.value); });
  }

  function bindSearch(){
    bindPair(document.getElementById('search-input'), document.getElementById('search-button'));
    bindPair(document.getElementById('search-input-mobile'), document.getElementById('search-button-mobile'));
  }

  function menuEls(){
    return {
      toggle: document.getElementById('menu-toggle'),
      close: document.getElementById('menu-close'),
      menu: document.getElementById('mobile-menu'),
      overlay: document.getElementById('menu-overlay')
    };
  }

  function setMenuOpen(open){
    var e = menuEls();
    if (!e.menu || !e.overlay || !e.toggle) return;
    open = !!open;
    e.menu.classList.toggle('open', open);
    e.menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    e.overlay.classList.toggle('active', open);
    e.overlay.setAttribute('aria-hidden', open ? 'false' : 'true');
    e.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('quality-category-menu-open', open);
  }

  function bindMenu(){
    var e = menuEls();
    if (!e.toggle || !e.close || !e.menu || !e.overlay) return;
    var lastPointerAction = 0;
    function bindControl(el, fn){
      el.addEventListener('pointerup', function(ev){
        if (ev.pointerType !== 'touch' && ev.pointerType !== 'pen') return;
        lastPointerAction = Date.now();
        fn();
      });
      el.addEventListener('click', function(){
        if (Date.now() - lastPointerAction < 500) return;
        fn();
      });
    }
    setMenuOpen(false);
    bindControl(e.toggle, function(){ setMenuOpen(true); });
    bindControl(e.close, function(){ setMenuOpen(false); });
    bindControl(e.overlay, function(){ setMenuOpen(false); });
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') setMenuOpen(false); });
    window.addEventListener('pageshow', function(){ setMenuOpen(false); });
  }

  function safeInternalUrl(anchor){
    if (!anchor) return '';
    var raw = anchor.getAttribute('href') || '';
    if (!raw || raw.charAt(0) === '#' || /^javascript:/i.test(raw)) return '';
    try {
      var url = new URL(raw, window.location.href);
      if (url.origin !== window.location.origin) return '';
      return url.href;
    } catch (_) { return ''; }
  }

  function go(anchor){
    var url = safeInternalUrl(anchor);
    if (!url) return false;
    window.location.href = url;
    return true;
  }

  /* Desktop V12:
     - submenu não fecha por cronômetro enquanto o usuário vai até "Usados";
     - removemos a antiga área invisível de ponte que podia capturar ponteiro;
     - links continuam com href normal e recebem um fallback direto no mouse. */
  function bindDesktopNavigation(){
    var nav = document.getElementById('nav-desktop');
    if (!nav) return;
    var group = nav.querySelector('.cat-menu-group');

    function openGroup(){ if (group) group.classList.add('is-open'); }
    function closeGroup(){ if (group) group.classList.remove('is-open'); }

    if (group) {
      group.addEventListener('mouseenter', openGroup);
      group.addEventListener('focusin', openGroup);
      /* O grupo permanece aberto durante todo o trajeto parent -> submenu.
         Só fecha quando o ponteiro entra em outra opção de nível principal ou sai do nav. */
      Array.prototype.forEach.call(nav.children, function(child){
        if (child === group || !child || !child.addEventListener) return;
        child.addEventListener('mouseenter', closeGroup);
      });
      nav.addEventListener('mouseleave', closeGroup);
      nav.addEventListener('focusout', function(ev){
        if (!group.contains(ev.relatedTarget)) closeGroup();
      });
    }

    Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function(a){
      if (a.hasAttribute('data-quality-open-favorites-menu')) return;
      a.addEventListener('pointerdown', function(ev){
        if (ev.pointerType && ev.pointerType !== 'mouse') return;
        if (ev.button !== undefined && ev.button !== 0) return;
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        go(a);
      });
    });
  }

  /* Mobile V12:
     Links recebem listeners diretamente, sem delegação e sem depender do alvo final
     do pointerup. Isso evita o toque perdido ao trocar de categoria em Chrome/Opera.
     O drawer NÃO é fechado antes da navegação. */
  function bindMobileNavigation(){
    var nav = document.getElementById('nav-mobile');
    if (!nav) return;

    Array.prototype.forEach.call(nav.querySelectorAll('a[href]'), function(a){
      if (a.hasAttribute('data-quality-open-favorites-menu')) return;
      var touch = null;
      var navigatedAt = 0;

      a.addEventListener('touchstart', function(ev){
        if (!ev.touches || ev.touches.length !== 1) { touch = null; return; }
        var t = ev.touches[0];
        touch = {x:t.clientX, y:t.clientY};
      }, {passive:true});

      a.addEventListener('touchend', function(ev){
        if (!touch) return;
        var t = ev.changedTouches && ev.changedTouches[0];
        var start = touch; touch = null;
        if (!t) return;
        if (Math.abs(t.clientX - start.x) > 40 || Math.abs(t.clientY - start.y) > 40) return;
        navigatedAt = Date.now();
        ev.preventDefault();
        go(a);
      }, {passive:false});

      a.addEventListener('touchcancel', function(){ touch = null; }, {passive:true});

      a.addEventListener('click', function(ev){
        if (Date.now() - navigatedAt < 900) { ev.preventDefault(); return; }
        ev.preventDefault();
        go(a);
      });
    });
  }

  function init(){
    bindMenu();
    bindSearch();
    bindDesktopNavigation();
    bindMobileNavigation();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
