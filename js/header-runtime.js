(function(){
  function ready(fn){ 
    if(document.readyState!=='loading') fn(); 
    else document.addEventListener('DOMContentLoaded', fn); 
  }

  async function ensureHeader(){
    try {
      // Preferir preencher o contêiner #header se existir
      var headerContainer = document.getElementById('header');
      var hasRealHeader = document.querySelector('header.header');
      if (headerContainer && !hasRealHeader){
        var res1 = await fetch('header.html', { cache: 'no-store' });
        if (res1.ok){
          headerContainer.innerHTML = await res1.text();
          console.log('[header-runtime] header inserido em #header');
          return;
        }
      }
      // Caso não exista #header, injeta no topo do body (evita duplicações)
      if (!document.querySelector('header.header') && !window.__panelHeaderInjected){
        var res2 = await fetch('header.html', { cache: 'no-store' });
        if (res2.ok){
          var html = await res2.text();
          var wrap = document.createElement('div');
          wrap.innerHTML = html;
          document.body.insertBefore(wrap, document.body.firstChild);
          window.__panelHeaderInjected = true;
          console.log('[header-runtime] header inserido no topo do body');
        }
      }
    } catch(e){ console.warn('[header-runtime] erro ao injetar header:', e); }
  }

  // Delegação global de eventos — funciona mesmo após recarregar o header
  function bindDelegatedMenu(){
    if (window.__menuDelegatedBound) return;
    window.__menuDelegatedBound = true;

    document.addEventListener('click', function(ev){
      var t = ev.target;
      var toggle = t.closest && t.closest('#menu-toggle');
      var closeBtn = t.closest && (t.closest('#menu-close') || t.closest('#menu-overlay') || t.closest('.mobile-nav a'));
      var sidebar = document.getElementById('mobile-menu');
      var overlay = document.getElementById('menu-overlay');
      if (!sidebar) return;

      function open(){
        sidebar.classList.add('open');
        overlay && overlay.classList.add('active');
        document.body.classList.add('menu-open');
      }
      function close(){
        sidebar.classList.remove('open');
        overlay && overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
      }

      if (toggle){
        ev.preventDefault();
        sidebar.classList.contains('open') ? close() : open();
      }
      if (closeBtn){
        ev.preventDefault();
        close();
      }
    });

    // ESC fecha
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        var sidebar = document.getElementById('mobile-menu');
        var overlay = document.getElementById('menu-overlay');
        if (sidebar && sidebar.classList.contains('open')){
          sidebar.classList.remove('open');
          overlay && overlay.classList.remove('active');
          document.body.classList.remove('menu-open');
        }
      }
    });

    console.log('[header-runtime] delegação de eventos do menu ativa');
  }

  ready(async function(){
    await ensureHeader();
    bindDelegatedMenu();
  });
})();