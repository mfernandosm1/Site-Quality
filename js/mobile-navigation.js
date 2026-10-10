/* Quality Celulares — navegação mobile V1, 09/10/2026
 * Site institucional/comercial: sem checkout/login. Usa Favoritos e Minha lista existentes.
 * O shell não altera os dados do catálogo, apenas disponibiliza sua navegação.
 */
(function () {
  'use strict';
  if (window.__qualityMobileNavigationV1) return;
  window.__qualityMobileNavigationV1 = true;
  var mq = window.matchMedia('(max-width: 850px)');
  var SEARCH_SUGGESTED = ['iPhone 16','Redmi Note 15','Samsung Galaxy','Motorola Moto'];
  var root = null, modal = null, lastFocus = null;
  var icon = function (name) { return '<i class="fa-solid fa-' + name + '" aria-hidden="true"></i>'; };
  var safeLinks = [
    { title:'Smartphones', url:'/smartphones/', icon:'mobile-screen-button', text:'Celulares novos e seminovos' },
    { title:'Acessórios', url:'/acessorios/', icon:'headphones', text:'Capas, películas e mais' },
    { title:'Eletrônicos', url:'/eletronicos/', icon:'laptop', text:'Tecnologia para você' },
    { title:'Assistência técnica', url:'/assistencia-tecnica/', icon:'screwdriver-wrench', text:'Serviços e reparos' }
  ];

  function isLocalPreview(){
    return !!window.__QUALITY_LOCAL_PREVIEW__ || /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(location.hostname);
  }
  function homeUrl(){
    if (window.__QUALITY_PREVIEW_HOME__) return window.__QUALITY_PREVIEW_HOME__;
    return isLocalPreview() ? '/site/view/index.html?qualityPreview=real' : '/';
  }
  function fromHome(){ return (location.pathname === '/' || location.pathname === '/index.html' || location.pathname === '/site/view/index.html'); }
  function closeDialog(returnFocus){
    if (!modal || !modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('quality-mobile-sheet-open');
    var target = lastFocus;
    lastFocus = null;
    if (returnFocus !== false && target && target.isConnected) target.focus({preventScroll:true});
  }
  function openDialog(view, btn){
    if (!modal) return;
    lastFocus = btn || document.activeElement;
    modal.querySelector('.quality-mobile-sheet-title').textContent = view === 'categories' ? 'Categorias' : 'Mais opções';
    modal.querySelector('.quality-mobile-sheet-content').innerHTML = view === 'categories' ? categoriesContent() : moreContent();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('quality-mobile-sheet-open');
    modal.querySelector('.quality-mobile-sheet-close').focus({preventScroll:true});
  }
  function categoriesContent(){
    return '<div class="quality-mobile-sheet-intro">O que você procura hoje?</div>' +
      '<div class="quality-mobile-categories">' + safeLinks.map(function(x){
        return '<a class="quality-mobile-category" href="'+x.url+'">' +
          '<span class="quality-mobile-category-icon">'+icon(x.icon)+'</span><span><strong>'+x.title+'</strong><small>'+x.text+'</small></span>'+icon('chevron-right')+'</a>';
      }).join('') + '</div>' +
      '<div class="quality-mobile-sheet-subtitle">Mais formas de encontrar</div>' +
      '<a class="quality-mobile-info-link" href="/smartphones/?subcategoria=usados">'+icon('rotate')+' Seminovos e usados '+icon('chevron-right')+'</a>' +
      '<a class="quality-mobile-info-link" href="/comparar.html">'+icon('scale-balanced')+' Comparar celulares '+icon('chevron-right')+'</a>';
  }
  function moreContent(){
    return '<div class="quality-mobile-sheet-intro">Tudo sobre a Quality, em um só lugar.</div>' +
      '<div class="quality-mobile-sheet-subtitle">Atendimento e compras</div>' +
      '<div class="quality-mobile-sheet-section">' +
      '<a href="/formas-de-pagamento.html">'+icon('credit-card')+' Pagamento e envio '+icon('chevron-right')+'</a>' +
      '<a href="/seguranca.html">'+icon('shield-halved')+' Compra segura '+icon('chevron-right')+'</a>' +
      '<a href="/assistencia-tecnica/">'+icon('screwdriver-wrench')+' Assistência técnica '+icon('chevron-right')+'</a>' +
      '</div>' +
      '<div class="quality-mobile-sheet-subtitle">Conheça a Quality</div>' +
      '<div class="quality-mobile-sheet-section">' +
      '<a href="/sobre.html">'+icon('store')+' Sobre nós '+icon('chevron-right')+'</a>' +
      '<a href="/blog/">'+icon('book-open')+' Guia Quality '+icon('chevron-right')+'</a>' +
      '<a href="/trabalhe-conosco.html">'+icon('briefcase')+' Trabalhe conosco '+icon('chevron-right')+'</a>' +
      '<a href="/seja-nosso-fornecedor.html">'+icon('handshake')+' Seja nosso fornecedor '+icon('chevron-right')+'</a>' +
      '</div>' +
      '<div class="quality-mobile-sheet-subtitle">Redes sociais</div>' +
      '<div class="quality-mobile-socials">' +
      '<a href="https://www.instagram.com/quality_celulares/" target="_blank" rel="noopener noreferrer" aria-label="Instagram Quality Saldanha Marinho"><i class="fa-brands fa-instagram" aria-hidden="true"></i> Instagram</a>' +
      '<a href="https://www.facebook.com/share/17KnAHN57D/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Facebook Quality Celulares"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i> Facebook</a>' +
      '</div>' +
      '<p class="quality-mobile-legal">Quality Celulares · Loja física e online<br>CNPJ: 20.375.910/0001-66</p>';
  }
  function dynamicClick(attribute){
    // Aciona a funcionalidade existente sem reimplementar sua lógica nem criar dados paralelos.
    var existing = document.querySelector('#nav-mobile ['+attribute+'], #nav-desktop ['+attribute+']');
    if (existing) { existing.click(); return; }
    var fallback = document.createElement('button');
    fallback.type = 'button'; fallback.style.display = 'none'; fallback.setAttribute(attribute,'');
    document.body.appendChild(fallback);
    fallback.click();
    fallback.remove();
  }
  function search(term){
    var q = String(term || '').trim();
    if (!q) { document.getElementById('quality-mobile-search')?.focus(); return; }
    if(window.QualitySearch2 && typeof window.QualitySearch2.perform === 'function') {
      window.QualitySearch2.perform(q, 'Busca fixa mobile');
      return;
    }
    var liveInput = document.getElementById('search-input') || document.getElementById('search-input-mobile');
    var liveButton = document.getElementById('search-button') || document.getElementById('search-button-mobile');
    if (liveInput && liveButton) {
      liveInput.value = q;
      liveInput.dispatchEvent(new Event('input', {bubbles:true}));
      liveButton.click();
      var grid = document.getElementById('produtos-container') || document.querySelector('.products, .product-grid');
      if (grid) setTimeout(function(){grid.scrollIntoView({behavior:'smooth',block:'start'});},120);
    } else if (typeof window.doSearch === 'function') {
      window.doSearch(q);
    } else {
      try { sessionStorage.setItem('quality-mobile-pending-search', q); } catch (_) {}
      location.assign(homeUrl());
    }
    if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function routePanelAction(action, button){
    if(root) setDrawer(false);
    if(action === 'home'){ location.assign(homeUrl()); }
    else if(action === 'categories' || action === 'more'){openDialog(action,button);}
    else if(action === 'favorites') {closeDialog(false); dynamicClick('data-quality-open-favorites-menu');}
    else if(action === 'interest') {closeDialog(false); dynamicClick('data-quality-open-interest');}
  }
  function setDrawer(open){
    if(!root)return;
    var el=root.querySelector('.quality-mobile-drawer');if(!el)return;
    el.classList.toggle('is-open',!!open);el.setAttribute('aria-hidden',open?'false':'true');
    root.querySelector('[data-quality-drawer-open]').setAttribute('aria-expanded',open?'true':'false');
    document.body.classList.toggle('quality-mobile-drawer-open',!!open);
    if(open){closeSuggestions();el.querySelector('[data-quality-drawer-close]').focus({preventScroll:true});}
  }
  function closeSuggestions(){
    if (!root) return;
    var popup = root.querySelector('.quality-mobile-search-suggestions');
    popup.classList.remove('is-open'); popup.innerHTML = '';
  }
  function closeMobileSearch(){
    document.body.classList.remove('quality-mobile-search-open');
    closeSuggestions();
    var input = root && root.querySelector('#quality-mobile-search');
    if(input && document.activeElement === input) input.blur();
  }
  function bindSuggestions(){
    var input = root.querySelector('#quality-mobile-search');
    var popup = root.querySelector('.quality-mobile-search-suggestions');
    var timer = null; var active = -1;
    function options(){return Array.from(popup.querySelectorAll('a.quality-mobile-suggestion'));}
    function suggestionsOnFocus(){
      if(input.value.trim()){input.dispatchEvent(new Event('input'));return;}
      popup.replaceChildren();
      var head=document.createElement('p');head.className='quality-mobile-suggestion-heading';head.textContent='Sugestões de busca';popup.appendChild(head);
      SEARCH_SUGGESTED.forEach(function(term){
        var btn=document.createElement('button');btn.type='button';btn.className='quality-mobile-suggestion-term';
        btn.textContent=term;btn.addEventListener('click',function(){input.value=term;closeMobileSearch();search(term);});popup.appendChild(btn);
      });
      popup.classList.add('is-open');
    }
    input.addEventListener('focus',function(){
      document.body.classList.add('quality-mobile-search-open');
      suggestionsOnFocus();
    });

    input.addEventListener('input',function(){
      clearTimeout(timer);
      var term = input.value.trim();
      closeSuggestions(); active=-1;
      if(!term){suggestionsOnFocus();return;}
      if(term.length < 2 || !window.QualitySearch2 || !window.QualitySearch2.search) return;
      timer=setTimeout(function(){
        window.QualitySearch2.search(term,5).then(function(items){
          if(input.value.trim() !== term || !mq.matches || document.body.classList.contains('quality-mobile-sheet-open')) return;
          popup.replaceChildren();
          var heading = document.createElement('p'); heading.className='quality-mobile-suggestion-heading'; heading.textContent = items.length ? 'Sugestões de produtos' : 'Nenhum produto encontrado';
          popup.appendChild(heading);
          (items||[]).forEach(function(entry){
            var product=entry.product||{}, slug=product.slug||product.id;
            if(!slug) return;
            var link=document.createElement('a'); link.className='quality-mobile-suggestion'; link.href='/produto/'+encodeURIComponent(slug)+'/';
            var title=document.createElement('span'); title.textContent=String(product.name||product.nome||'Produto');
            link.appendChild(title); popup.appendChild(link);
          });
          var more=document.createElement('button'); more.type='button'; more.className='quality-mobile-suggestion-more';more.textContent='Ver todos os resultados';
          more.addEventListener('click',function(){closeMobileSearch();search(term);});
          popup.appendChild(more);popup.classList.add('is-open');
        }).catch(function(){closeSuggestions();});
      },120);
    });
    input.addEventListener('keydown',function(event){
      if(event.key === 'Escape'){closeMobileSearch();return;}
      var links=options();
      if(!popup.classList.contains('is-open') || !links.length) return;
      if(event.key === 'ArrowDown' || event.key === 'ArrowUp'){
        event.preventDefault();active = (active + (event.key==='ArrowDown'?1:-1) + links.length)%links.length;
        links.forEach(function(link,i){link.classList.toggle('is-active',i === active);});
      }
    });
    document.addEventListener('click',function(event){if(!root.querySelector('.quality-mobile-topbar').contains(event.target)) closeSuggestions();});
  }
  function updateActive(){
    if (!root) return;
    var path = location.pathname;
    var isCategory = /^\/(smartphones|acessorios|eletronicos|assistencia-tecnica)\//.test(path) || path === '/categoria.html';
    var active = fromHome() ? 'home' : isCategory ? 'categories' : '';
    root.querySelectorAll('.quality-mobile-tab').forEach(function(button){
      var isActive = button.dataset.qualityTab === active;
      button.classList.toggle('is-current', isActive);
      if (isActive) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
  }
  function buildShell(){
    if(root) return;
    root = document.createElement('div'); root.id = 'quality-mobile-shell';
    root.innerHTML =
      '<div class="quality-mobile-topbar" role="banner">' +
        '<div class="quality-mobile-brand"><button type="button" class="quality-mobile-menu-trigger" data-quality-drawer-open aria-label="Abrir menu de navegação" aria-expanded="false">'+icon('bars')+'</button><a href="' + homeUrl() + '" aria-label="Quality Celulares — início"><img src="/images/logo.png" alt="Quality Celulares"></a>' +
        '<span>Loja física e online</span></div>' +
        '<div class="quality-mobile-search-row"><button type="button" class="quality-mobile-search-back" aria-label="Voltar à loja">'+icon('arrow-left')+'</button>' +
      '<form id="quality-mobile-search-form" class="quality-mobile-search-form" role="search">' +
        '<label class="quality-mobile-search-label" for="quality-mobile-search">Buscar produtos na Quality</label>' +
        '<input id="quality-mobile-search" type="search" placeholder="O que você está procurando?" autocomplete="off" enterkeyhint="search" />' +
        '<button type="submit" aria-label="Buscar produtos">'+icon('magnifying-glass')+'</button></form></div>' +
      '<div class="quality-mobile-search-suggestions" role="listbox" aria-label="Sugestões de produtos"></div>' +
      '</div>' +
      '<nav class="quality-mobile-bottom-nav" aria-label="Navegação principal mobile">' +
      '<button type="button" class="quality-mobile-tab" data-quality-tab="home">'+icon('house')+'<span>Início</span></button>' +
      '<button type="button" class="quality-mobile-tab" data-quality-tab="categories">'+icon('grip')+'<span>Categorias</span></button>' +
      '<button type="button" class="quality-mobile-tab" data-quality-tab="favorites">'+icon('heart')+'<span>Favoritos</span></button>' +
      '<button type="button" class="quality-mobile-tab" data-quality-tab="interest">'+icon('list-check')+'<span>Minha lista</span></button>' +
      '<button type="button" class="quality-mobile-tab" data-quality-tab="more">'+icon('ellipsis')+'<span>Mais</span></button>' +
      '</nav>' +
      '<div class="quality-mobile-drawer" aria-hidden="true"><div class="quality-mobile-drawer-shade" data-quality-drawer-close></div><nav class="quality-mobile-drawer-panel" aria-label="Menu lateral"><div class="quality-mobile-drawer-head"><strong>Menu Quality</strong><button type="button" data-quality-drawer-close aria-label="Fechar menu">'+icon('xmark')+'</button></div><div class="quality-mobile-drawer-links">'+
        '<a href="'+homeUrl()+'">'+icon('house')+' Início</a>'+safeLinks.map(function(x){return '<a href="'+x.url+'">'+icon(x.icon)+' '+x.title+'</a>';}).join('')+'<a href="/smartphones/?subcategoria=usados">'+icon('rotate')+' Seminovos</a><a href="/comparar.html">'+icon('scale-balanced')+' Comparar celulares</a></div><div class="quality-mobile-drawer-aux"><button type="button" data-quality-tab="favorites">'+icon('heart')+' Favoritos</button><button type="button" data-quality-tab="interest">'+icon('list-check')+' Minha lista</button><button type="button" data-quality-tab="more">'+icon('circle-info')+' Sobre a Quality</button></div></nav></div>' +
      '<div class="quality-mobile-sheet" role="presentation" aria-hidden="true">' +
        '<div class="quality-mobile-sheet-backdrop" data-quality-sheet-close></div>' +
        '<section class="quality-mobile-sheet-card" role="dialog" aria-modal="true" aria-labelledby="quality-mobile-sheet-title">' +
          '<div class="quality-mobile-sheet-head"><h2 id="quality-mobile-sheet-title" class="quality-mobile-sheet-title">Categorias</h2>' +
          '<button class="quality-mobile-sheet-close" data-quality-sheet-close type="button" aria-label="Fechar">'+icon('xmark')+'</button></div>' +
          '<div class="quality-mobile-sheet-content"></div>' +
        '</section></div>';
    document.body.appendChild(root);
    modal = root.querySelector('.quality-mobile-sheet');
    root.querySelector('#quality-mobile-search-form').addEventListener('submit',function(event){
      event.preventDefault();
      var active = root.querySelector('.quality-mobile-search-suggestions a.is-active');
      if (active) { location.assign(active.getAttribute('href')); return; }
      closeMobileSearch();
      search(root.querySelector('#quality-mobile-search').value);
    });
    bindSuggestions();
    root.querySelector('.quality-mobile-search-back').addEventListener('click',closeMobileSearch);
    root.addEventListener('click',function(event){
      if(event.target.closest('[data-quality-drawer-open]')){setDrawer(true);return;}
      if(event.target.closest('[data-quality-drawer-close]')){setDrawer(false);return;}
      var close = event.target.closest('[data-quality-sheet-close]');
      if(close){closeDialog();return;}
      var button = event.target.closest('[data-quality-tab]');
      if(button){setDrawer(false);routePanelAction(button.dataset.qualityTab,button);return;}
      if(event.target.closest('.quality-mobile-sheet-content a')) closeDialog(false);
    });
    modal.addEventListener('keydown',function(event){
      if (event.key !== 'Tab') return;
      var els = Array.from(modal.querySelectorAll('button:not([disabled]),a[href]'));
      if (!els.length) return;
      if(event.shiftKey && document.activeElement === els[0]){event.preventDefault();els[els.length-1].focus();}
      else if(!event.shiftKey && document.activeElement === els[els.length-1]){event.preventDefault();els[0].focus();}
    });
    document.addEventListener('keydown',function(event){if(event.key === 'Escape'){closeDialog();setDrawer(false);closeMobileSearch();}});
    updateActive();
    document.body.classList.add('quality-mobile-app');
    try {
      var term = sessionStorage.getItem('quality-mobile-pending-search');
      if (term && fromHome()) {
        sessionStorage.removeItem('quality-mobile-pending-search');
        root.querySelector('#quality-mobile-search').value = term;
        setTimeout(function(){search(term);},650);
      }
    } catch(_) {}
  }
  function init(){
    if(mq.matches && !root) buildShell();
    document.body.classList.toggle('quality-mobile-app', mq.matches);
    if(!mq.matches) document.body.classList.remove('quality-mobile-search-open');
    if(root){root.style.display = mq.matches ? '' : 'none';if(!mq.matches){setDrawer(false);closeDialog(false);}}
  }
  function ready(){
    init();
    if (mq.addEventListener) mq.addEventListener('change',init);
    else if(mq.addListener) mq.addListener(init);
    window.addEventListener('pageshow',function(){closeDialog(false);updateActive();});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();
