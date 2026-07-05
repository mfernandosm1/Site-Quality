/* =========================================================
   Quality V8.2.3.5 - Favoritos definitivo e modular
   - Um único listener global: evita clique duplo/toggle duplo
   - Funciona em index, categoria, produto e páginas futuras
   - Menu favoritos global com contador
   - Painel lateral + remover individual + remover todos
   - Não depende do main.js
========================================================= */
(function(){
  if (window.__qualityFavoriteMenuModuleV8235) return;
  window.__qualityFavoriteMenuModuleV8235 = true;
  window.__qualityUseFavoriteMenuModule = true;

  var KEY = 'quality_favoritos_v811';
  var refreshTimer = null;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function norm(v){ return clean(v).toLowerCase(); }

  function esc(v){
    return clean(v)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function absoluteUrl(u){
    u = clean(u);
    if (!u || u === '#') return '';
    try { return new URL(u, window.location.origin).href; }
    catch(e){ return u; }
  }

  function productUrlFromSlug(slug){
    slug = clean(slug);
    return slug ? '/produto/' + encodeURIComponent(slug) + '/' : '';
  }

  function readFavorites(){
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      var seen = {};
      var out = [];
      raw.forEach(function(item){
        var k = productKey(item);
        if (!k || seen[k]) return;
        seen[k] = true;
        out.push(item);
      });
      if (out.length !== raw.length) writeFavorites(out);
      return out;
    } catch(e){ return []; }
  }

  function writeFavorites(items){
    try { localStorage.setItem(KEY, JSON.stringify(items || [])); } catch(e){}
  }

  function productKey(item){
    if (!item) return '';
    var candidates = [item.key, item.slug, item.id, item.url, item.name, item.nome];
    for (var i=0; i<candidates.length; i++) {
      var k = norm(candidates[i]);
      if (k) return k;
    }
    return '';
  }

  function keysOf(item){
    if (!item) return [];
    var values = [item.key, item.slug, item.id, item.url, item.name, item.nome];
    if (item.url) values.push(absoluteUrl(item.url));
    var out = [];
    values.forEach(function(v){
      var k = norm(v);
      if (k && out.indexOf(k) === -1) out.push(k);
    });
    return out;
  }

  function sameProduct(a,b){
    var ak = keysOf(a), bk = keysOf(b);
    return ak.some(function(k){ return bk.indexOf(k) !== -1; });
  }

  function inferPayloadFromCard(btn){
    var card = btn.closest('.produto-card, .product-card, .produto-relacionado-card, .quality-saved-card, .quality-recent-card');
    var title = card ? clean(card.querySelector('h3, strong, .quality-saved-card-name, .quality-recent-card-name')?.textContent) : '';
    var imgEl = card ? card.querySelector('img') : null;
    var detailLink = card ? card.querySelector('a.btn-details, a[href*="/produto/"]') : null;
    var url = detailLink ? clean(detailLink.getAttribute('href')) : '';
    var slug = '';
    if (url) {
      var m = url.match(/\/produto\/([^\/?#]+)\/?/i);
      if (m) { try { slug = decodeURIComponent(m[1]); } catch(e){ slug = m[1]; } }
    }
    return {
      id: slug || title || url,
      slug: slug,
      name: title || 'Produto',
      image: imgEl ? clean(imgEl.getAttribute('src')) : '',
      url: absoluteUrl(url) || url,
      key: slug || url || title
    };
  }

  function payloadFromButton(btn){
    var fallback = inferPayloadFromCard(btn);
    var slug = clean(btn.getAttribute('data-slug')) || fallback.slug;
    var id = clean(btn.getAttribute('data-id')) || fallback.id || slug;
    var name = clean(btn.getAttribute('data-name')) || fallback.name || 'Produto';
    var image = clean(btn.getAttribute('data-image')) || fallback.image;
    var url = clean(btn.getAttribute('data-url')) || fallback.url || productUrlFromSlug(slug);
    var abs = absoluteUrl(url);
    var key = slug || id || abs || name;
    return { key:key, id:id || key, slug:slug || id || '', name:name, image:image, url:abs || url };
  }

  function isFavorite(product){
    return readFavorites().some(function(item){ return sameProduct(item, product); });
  }

  function toggleFavorite(product){
    if (!productKey(product)) return false;
    var items = readFavorites();
    var exists = items.some(function(item){ return sameProduct(item, product); });
    if (exists) {
      items = items.filter(function(item){ return !sameProduct(item, product); });
    } else {
      items.unshift({
        key: product.key || productKey(product),
        id: product.id || product.slug || product.key || productKey(product),
        slug: product.slug || product.id || '',
        name: product.name || product.nome || 'Produto',
        image: product.image || product.imagem || '',
        url: product.url || productUrlFromSlug(product.slug),
        savedAt: Date.now()
      });
    }
    writeFavorites(items.slice(0, 60));
    return !exists;
  }

  function imgPath(item){
    var p = clean(item && (item.image || item.imagem));
    if (!p) return '/images/sem-imagem.png';
    if (/^https?:\/\//i.test(p)) return p;
    return '/' + p.replace(/^\/+/, '').replace(/^site\//, '');
  }

  function pageUrl(item){
    var u = clean(item && item.url);
    if (!u && item && item.slug) u = productUrlFromSlug(item.slug);
    return absoluteUrl(u) || '#';
  }

  function favoriteMenuHtml(count){
    return '<i class="fa-solid fa-heart"></i><span>Favoritos</span><span class="quality-favorites-count">' + count + '</span>';
  }

  function insertBeforeSearch(nav, link){
    var search = nav.querySelector('.search-wrapper, .search-wrapper-mobile');
    if (search && search.parentNode === nav) nav.insertBefore(link, search);
    else nav.appendChild(link);
  }

  function ensureMenu(){
    var count = readFavorites().length;
    document.querySelectorAll('[data-quality-open-favorites-menu]').forEach(function(link){
      if (!count) link.remove();
    });
    if (!count) { closePanel(); return; }

    ['nav-desktop','nav-mobile'].forEach(function(id){
      var nav = document.getElementById(id);
      if (!nav) return;
      var link = nav.querySelector('[data-quality-open-favorites-menu]');
      if (!link) {
        link = document.createElement('a');
        link.href = '#';
        link.className = 'quality-favorites-menu-link';
        link.setAttribute('data-quality-open-favorites-menu', '1');
        link.setAttribute('aria-label', 'Abrir favoritos');
        insertBeforeSearch(nav, link);
      }
      link.innerHTML = favoriteMenuHtml(count);
    });
  }

  function panelShell(){
    var panel = document.querySelector('.quality-favorites-panel-global');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'quality-favorites-panel quality-favorites-panel-global';
      panel.innerHTML =
        '<div class="quality-favorites-panel-backdrop" data-quality-close-favorites-menu></div>' +
        '<aside class="quality-favorites-panel-box" aria-label="Meus favoritos">' +
          '<div class="quality-favorites-panel-head">' +
            '<strong>❤️ Meus favoritos</strong>' +
            '<button type="button" data-quality-close-favorites-menu aria-label="Fechar">×</button>' +
          '</div>' +
          '<div class="quality-favorites-panel-top"></div>' +
          '<div class="quality-favorites-panel-body"></div>' +
        '</aside>';
      document.body.appendChild(panel);
    }
    return panel;
  }

  function itemHtml(item){
    var name = clean(item && (item.name || item.nome)) || 'Produto';
    var u = pageUrl(item);
    var k = productKey(item);
    return '<div class="quality-favorites-panel-item">' +
      '<a class="quality-favorites-panel-img" href="' + esc(u) + '"><img src="' + esc(imgPath(item)) + '" alt="' + esc(name) + '" onerror="this.onerror=null;this.src=\'/images/sem-imagem.png\';"></a>' +
      '<div class="quality-favorites-panel-info">' +
        '<a class="quality-favorites-panel-name" href="' + esc(u) + '">' + esc(name) + '</a>' +
        '<div class="quality-favorites-panel-actions">' +
          '<a href="' + esc(u) + '" class="btn-details quality-favorites-see">Ver detalhes</a>' +
          '<button type="button" class="quality-favorites-remove" data-quality-remove-favorite-menu="' + esc(k) + '">Remover</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function openPanel(){
    var panel = panelShell();
    var items = readFavorites();
    panel.querySelector('.quality-favorites-panel-top').innerHTML = items.length
      ? '<button type="button" class="quality-favorites-clear-all" data-quality-clear-favorites-menu><i class="fa-regular fa-trash-can"></i> Remover todos</button>'
      : '';
    panel.querySelector('.quality-favorites-panel-body').innerHTML = items.length
      ? items.map(itemHtml).join('')
      : '<p class="quality-favorites-empty">Você ainda não favoritou nenhum produto.</p>';
    panel.classList.add('is-open','show');
    document.body.classList.add('quality-favorites-open');
  }

  function closePanel(){
    document.querySelectorAll('.quality-favorites-panel').forEach(function(panel){ panel.classList.remove('is-open','show'); });
    document.body.classList.remove('quality-favorites-open');
  }

  function updateHeartButtons(){
    document.querySelectorAll('[data-quality-fav]').forEach(function(btn){
      var product = payloadFromButton(btn);
      var active = isFavorite(product);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-label', active ? 'Remover dos favoritos' : 'Favoritar produto');
      btn.setAttribute('title', active ? 'Remover dos favoritos' : 'Favoritar');
      if (btn.classList.contains('quality-detail-action')) {
        btn.innerHTML = active ? '<i class="fa-solid fa-heart"></i> Favoritado' : '<i class="fa-regular fa-heart"></i> Favoritar';
      } else {
        btn.innerHTML = active ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
      }
    });
  }

  function refresh(){ ensureMenu(); updateHeartButtons(); }
  function refreshSoon(){
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, 80);
  }

  function toast(message){
    var el = document.querySelector('.quality-fav-toast');
    if (!el) { el = document.createElement('div'); el.className = 'quality-fav-toast'; document.body.appendChild(el); }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window.__qualityFavToastTimer);
    window.__qualityFavToastTimer = setTimeout(function(){ el.classList.remove('show'); }, 1600);
  }

  async function shareProduct(product){
    var title = product.name || 'Produto Quality Celulares';
    var url = product.url || productUrlFromSlug(product.slug) || window.location.href;
    try { url = new URL(url, window.location.origin).href; } catch(e) { url = window.location.href; }
    var text = 'Olha este produto da Quality Celulares: ' + title;
    if (navigator.share) {
      try { await navigator.share({ title:title, text:text, url:url }); return; }
      catch(e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); toast('Link do produto copiado 📤'); }
    catch(e) { window.prompt('Copie o link do produto:', url); }
  }

  function stop(ev){
    if (!ev) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }

  document.addEventListener('click', function(ev){
    var open = ev.target.closest('[data-quality-open-favorites-menu]');
    if (open) { stop(ev); openPanel(); return; }

    if (ev.target.closest('[data-quality-close-favorites-menu]')) { stop(ev); closePanel(); return; }

    var clear = ev.target.closest('[data-quality-clear-favorites-menu]');
    if (clear) {
      stop(ev);
      if (confirm('Remover todos os favoritos deste navegador?')) {
        writeFavorites([]);
        refresh();
        closePanel();
      }
      return;
    }

    var remove = ev.target.closest('[data-quality-remove-favorite-menu]');
    if (remove) {
      stop(ev);
      var k = norm(remove.getAttribute('data-quality-remove-favorite-menu'));
      writeFavorites(readFavorites().filter(function(item){ return productKey(item) !== k; }));
      refresh();
      if (readFavorites().length) openPanel(); else closePanel();
      return;
    }

    var fav = ev.target.closest('[data-quality-fav]');
    if (fav) {
      stop(ev);
      var active = toggleFavorite(payloadFromButton(fav));
      fav.classList.add('quality-action-pulse');
      setTimeout(function(){ fav.classList.remove('quality-action-pulse'); }, 260);
      refresh();
      toast(active ? 'Produto adicionado aos favoritos ❤️' : 'Produto removido dos favoritos');
      return;
    }

    var share = ev.target.closest('[data-quality-share]');
    if (share) { stop(ev); shareProduct(payloadFromButton(share)); return; }
  }, true);

  window.addEventListener('storage', refresh);
  try {
    var obs = new MutationObserver(refreshSoon);
    obs.observe(document.documentElement, { childList:true, subtree:true });
  } catch(e){}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ refresh(); setTimeout(refresh,300); setTimeout(refresh,1000); });
  else { refresh(); setTimeout(refresh,300); setTimeout(refresh,1000); }

  window.qualityRefreshFavoritesMenu = refresh;
  window.qualityUpdateFavoriteButtons = updateHeartButtons;
  window.qualityOpenFavoritesPanel = openPanel;
})();
