/* Quality Celulares · v27 Modo Vitrine, sem area do cliente publica.
   Carrinho e favoritos permanecem locais ao navegador. */
(function(){'use strict';
  if(window.__qualityPublicHeaderV27)return;
  window.__qualityPublicHeaderV27=true;
  var FAVORITES='quality_favoritos_v811', CART='quality_interest_list_v1', last='';
  function count(key){
    try{var v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v.length:0;}catch(_){return 0;}
  }
  function cleanIdentity(root){
    (root||document).querySelectorAll('.quality-account-nav-link,.quality-account-menu,.quality-account-mobile-link,[data-quality-notifications-open],[data-quality-mobile-notifications]').forEach(function(el){el.remove();});
  }
  function createButton(type){
    var fav=type==='favorites';var b=document.createElement('button');b.type='button';
    b.className='quality-header-icon-action'+(fav?'':' quality-header-cart-action');
    b.setAttribute(fav?'data-quality-header-favorites':'data-quality-header-cart','');
    b.setAttribute('aria-label',fav?'Abrir meus favoritos':'Abrir meu carrinho');
    b.title=fav?'Favoritos':'Meu carrinho';
    b.innerHTML='<i class="'+(fav?'fa-regular fa-heart':'fa-solid fa-cart-shopping')+'" aria-hidden="true"></i><span class="quality-header-action-count" '+(fav?'data-quality-favorites-total hidden':'data-quality-cart-total')+'>0</span>';
    return b;
  }
  function ensure(){
    cleanIdentity(document);
    var bar=document.querySelector('.quality-desktop-actions');
    if(bar){
      if(!bar.querySelector('[data-quality-header-favorites]'))bar.appendChild(createButton('favorites'));
      if(!bar.querySelector('[data-quality-header-cart]'))bar.appendChild(createButton('cart'));
    }
    refresh();
  }
  function refresh(){
    var f=count(FAVORITES),c=count(CART),signature=f+'|'+c;
    if(last===signature && document.querySelector('[data-quality-cart-total]'))return;
    last=signature;
    document.querySelectorAll('[data-quality-favorites-total]').forEach(function(el){el.textContent=String(f);el.hidden=!f;});
    document.querySelectorAll('[data-quality-cart-total]').forEach(function(el){el.textContent=String(c);});
  }
  // Nem todas as páginas publicadas têm o painel de Favoritos no HTML.
  // Abrimos localmente, sem redirecionar para "/" (que é o ERP na prévia).
  function safeText(value){
    return String(value==null?'':value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function favKey(item){return String(item&&(item.slug||item.id||item.url||item.name||item.nome)||'').trim().toLowerCase();}
  function readFavorites(){
    try {var data=JSON.parse(localStorage.getItem(FAVORITES)||'[]');return Array.isArray(data)?data.filter(Boolean):[];}
    catch(_){return [];}
  }
  function safeUrl(value,fallback){
    try {var url=new URL(String(value||fallback||''),location.origin);if(url.protocol==='http:'||url.protocol==='https:')return url.href;}
    catch(_){}return fallback||'#';
  }
  function favImage(item){
    var raw=String(item.image||item.imagem||'').trim();
    if(!raw)return '/images/sem-imagem.png';
    if(/^https?:\/\//i.test(raw))return safeUrl(raw,'/images/sem-imagem.png');
    return '/'+raw.replace(/^\/+/, '').replace(/^site\//i,'');
  }
  function closeFallback(){
    var panel=document.querySelector('.quality-header-favs-fallback');
    if(panel){panel.classList.remove('is-open','show');}
    document.body.classList.remove('quality-favorites-open');
  }
  function renderFallback(){
    var panel=document.querySelector('.quality-header-favs-fallback');
    if(!panel)return;
    var items=readFavorites(),seen={};
    items=items.filter(function(item){var key=favKey(item);if(!key||seen[key])return false;seen[key]=true;return true;});
    panel.querySelector('.quality-favorites-panel-top').innerHTML=items.length?'<button type="button" class="quality-favorites-clear-all" data-qheader-clear-favs><i class="fa-regular fa-trash-can"></i> Remover todos</button>':'';
    panel.querySelector('.quality-favorites-panel-body').innerHTML=items.length?items.map(function(item){
      var name=safeText(item.name||item.nome||'Produto');
      var url=safeText(safeUrl(item.url,item.slug?'/produto/'+encodeURIComponent(item.slug)+'/':'#'));
      return '<div class="quality-favorites-panel-item">'+
        '<a class="quality-favorites-panel-img" href="'+url+'"><img src="'+safeText(favImage(item))+'" alt="'+name+'" loading="lazy"></a>'+
        '<div class="quality-favorites-panel-info"><a class="quality-favorites-panel-name" href="'+url+'">'+name+'</a>'+
        '<div class="quality-favorites-panel-actions"><a class="btn-details quality-favorites-see" href="'+url+'">Ver detalhes</a>'+
        '<button type="button" class="quality-favorites-remove" data-qheader-remove-fav="'+safeText(favKey(item))+'">Remover</button></div></div></div>';
    }).join(''):'<p class="quality-favorites-empty">Você ainda não favoritou nenhum produto.</p>';
  }
  function showFallback(){
    var panel=document.querySelector('.quality-header-favs-fallback');
    if(!panel){
      panel=document.createElement('div');
      panel.className='quality-favorites-panel quality-favorites-panel-global quality-header-favs-fallback';
      panel.innerHTML='<div class="quality-favorites-panel-backdrop" data-qheader-close-favs></div>'+
        '<aside class="quality-favorites-panel-box" role="dialog" aria-modal="true" aria-label="Meus favoritos">'+
        '<div class="quality-favorites-panel-head"><strong>❤️ Meus favoritos</strong><button type="button" data-qheader-close-favs aria-label="Fechar">×</button></div>'+
        '<div class="quality-favorites-panel-top"></div><div class="quality-favorites-panel-body"></div></aside>';
      document.body.appendChild(panel);
    }
    renderFallback();
    panel.classList.add('is-open','show');
    document.body.classList.add('quality-favorites-open');
    panel.querySelector('button[data-qheader-close-favs]').focus?.({preventScroll:true});
  }
  function favoritesChanged(){
    last='';refresh();
    try{window.qualityUpdateFavoriteButtons?.();}catch(_){}
    try{window.qualityRefreshFavoritesMenu?.();}catch(_){}
    window.dispatchEvent(new Event('quality:favorites-changed'));
  }
  document.addEventListener('click',function(ev){
    var p=ev.target.closest('.quality-header-favs-fallback');if(!p)return;
    if(ev.target.closest('[data-qheader-close-favs]')){ev.preventDefault();closeFallback();return;}
    var clear=ev.target.closest('[data-qheader-clear-favs]');
    if(clear){ev.preventDefault();if(window.confirm('Remover todos os favoritos deste navegador?')){try{localStorage.setItem(FAVORITES,'[]');}catch(_){}favoritesChanged();renderFallback();}return;}
    var remove=ev.target.closest('[data-qheader-remove-fav]');
    if(remove){ev.preventDefault();var key=remove.getAttribute('data-qheader-remove-fav');try{localStorage.setItem(FAVORITES,JSON.stringify(readFavorites().filter(function(item){return favKey(item)!==key;})));}catch(_){}favoritesChanged();renderFallback();}
  });
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeFallback();});
  function open(which){
    if(which==='favorites'){
      if(typeof window.qualityOpenFavoritesPanel==='function'){window.qualityOpenFavoritesPanel();return;}
      // Os modelos antigos têm um listener em captura para o menu, mesmo
      // quando seu botão não aparece (favoritos vazios).
      var native=document.createElement('button');native.type='button';
      native.hidden=true;native.setAttribute('data-quality-open-favorites-menu','1');
      document.body.appendChild(native);native.click();native.remove();
      if(document.querySelector('.quality-favorites-panel-global.is-open:not(.quality-header-favs-fallback)'))return;
      showFallback();return;
    }
    if(typeof window.qualityOpenInterestPanel==='function'){window.qualityOpenInterestPanel();return;}
    var candidate=document.querySelector('[data-quality-open-interest]');
    if(candidate){candidate.click();return;}
    try{sessionStorage.setItem('quality_open_after_navigation','cart');}catch(_){}
    var preview=/^(localhost|127\.|10\.|192\.168\.)/i.test(location.hostname)||location.pathname.indexOf('/site/')===0;
    location.assign(preview?'/site/view/index.html?qualityPreview=real':'/');
  }
  document.addEventListener('click',function(ev){
    var btn=ev.target.closest('[data-quality-header-favorites],[data-quality-header-cart]');
    if(!btn)return;
    ev.preventDefault();open(btn.hasAttribute('data-quality-header-favorites')?'favorites':'cart');
    setTimeout(function(){last='';refresh();},150);
  });
  function changed(){last='';refresh();}
  window.qualityRefreshHeaderCounts=changed;
  window.addEventListener('quality:favorites-changed',changed);
  window.addEventListener('quality:cart-changed',changed);
  window.addEventListener('storage',function(ev){if(ev.key===FAVORITES||ev.key===CART)changed();});
  window.addEventListener('focus',function(){last='';refresh();});
  // A gravação no localStorage ocorre durante o clique; uma tarefa zero-delay
  // vê o novo total no mesmo ciclo de interação, sem esperar 250 ms.
  document.addEventListener('click',function(ev){
    if(ev.target.closest('[data-quality-fav],[data-quality-remove-favorite-menu],[data-quality-clear-favorites-menu]')){
      setTimeout(changed,0);
    }
  },true);
  document.addEventListener('DOMContentLoaded',ensure);
  var header=document.getElementById('header');
  if(header){new MutationObserver(function(){ensure();}).observe(header,{childList:true,subtree:false});}
  if(document.readyState!=='loading')ensure();
  setTimeout(ensure,700);
})();
