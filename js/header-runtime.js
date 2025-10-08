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
    dedupeHeaders();
    setTimeout(dedupeHeaders, 50);
    setTimeout(dedupeHeaders, 250);
    try{
      var obs = new MutationObserver(function(){ dedupeHeaders(); });
      obs.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
  });
})();