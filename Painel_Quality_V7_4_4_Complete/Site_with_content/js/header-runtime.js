(function(){
  function ready(fn){ if(document.readyState !== 'loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  function dedupeHeaders(){
    try{
      var hs = document.querySelectorAll('header');
      if (hs.length > 1){
        for (var i=1;i<hs.length;i++){ hs[i].parentNode && hs[i].parentNode.removeChild(hs[i]); }
      }
    }catch(e){}
  }
  function ensureOverlay(){
    var overlay = document.getElementById('menu-overlay');
    if (!overlay){
      overlay = document.createElement('div');
      overlay.id = 'menu-overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }
  function setMenu(open){
    var menu = document.getElementById('mobile-menu');
    var overlay = ensureOverlay();
    if (!menu) return;
    ['open','active','show','is-open'].forEach(function(c){
      menu.classList[open?'add':'remove'](c);
      overlay.classList[open?'add':'remove'](c);
    });
    menu.setAttribute('aria-hidden', open?'false':'true');
    document.body.classList[open?'add':'remove']('menu-open');
    if (open){
      menu.style.display='block'; menu.style.visibility='visible'; menu.style.opacity='1';
      overlay.style.display='block'; overlay.style.visibility='visible'; overlay.style.opacity='1';
      overlay.style.position='fixed'; overlay.style.inset='0';
      overlay.style.background='rgba(0,0,0,0.35)'; overlay.style.zIndex='9998';
      if (!menu.style.zIndex) menu.style.zIndex='9999';
    } else {
      menu.style.display='none'; menu.style.visibility='hidden'; menu.style.opacity='0';
      overlay.style.display='none'; overlay.style.visibility='hidden'; overlay.style.opacity='0';
    }
  }
  function bindMenuOnce(){
    try{
      var btnOpen  = document.getElementById('menu-toggle');
      var btnClose = document.getElementById('menu-close');
      var overlay  = ensureOverlay();
      if (btnOpen && !btnOpen.__bound){ btnOpen.addEventListener('click', function(e){ e&&e.preventDefault(); setMenu(true); });  btnOpen.__bound = true; }
      if (btnClose && !btnClose.__bound){ btnClose.addEventListener('click', function(e){ e&&e.preventDefault(); setMenu(false); }); btnClose.__bound = true; }
      if (overlay && !overlay.__bound){ overlay.addEventListener('click', function(){ setMenu(false); }); overlay.__bound = true; }
      if (btnOpen  && !btnOpen.__touch){  btnOpen.addEventListener('touchstart',  function(e){ e&&e.preventDefault(); setMenu(true); },  {passive:false}); btnOpen.__touch=true; }
      if (btnClose && !btnClose.__touch){ btnClose.addEventListener('touchstart', function(e){ e&&e.preventDefault(); setMenu(false); }, {passive:false}); btnClose.__touch=true; }
      if (overlay && !overlay.__touch){   overlay.addEventListener('touchstart',  function(){ setMenu(false); }, {passive:true}); overlay.__touch=true; }
      if (!window.__menuEscBound){
        document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape') setMenu(false); });
        window.__menuEscBound = true;
      }
      window.__panelMenu = { open: function(){ setMenu(true); }, close: function(){ setMenu(false); } };
    }catch(e){}
  }
  ready(async function(){
    try {
      var hasHeader = document.querySelector('header, [data-site-header], .site-header');
      if (!hasHeader && !window.__panelHeaderInjected){
        var res = await fetch('header.html', { cache: 'no-store' });
        if (res.ok) {
          var html = await res.text();
          var wrap = document.createElement('div');
          wrap.setAttribute('data-panel-injected','header');
          wrap.innerHTML = html;
          document.body.insertBefore(wrap, document.body.firstChild);
          window.__panelHeaderInjected = true;
        }
      }
    } catch(e){}
    dedupeHeaders(); bindMenuOnce();
    setTimeout(function(){ dedupeHeaders(); bindMenuOnce(); }, 50);
    setTimeout(function(){ dedupeHeaders(); bindMenuOnce(); }, 250);
    try{
      var obs = new MutationObserver(function(){ dedupeHeaders(); bindMenuOnce(); });
      obs.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
  });
})();