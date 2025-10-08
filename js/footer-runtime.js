(function(){
  function ready(fn){ if(document.readyState !== 'loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  function dedupeFooters(){
    try{
      var fs = document.querySelectorAll('footer');
      if (fs.length > 1){
        for (var i=1;i<fs.length;i++){ fs[i].parentNode && fs[i].parentNode.removeChild(fs[i]); }
      }
    }catch(e){}
  }
  ready(async function(){
    try {
      var hasFooter = document.querySelector('footer, [data-site-footer], .site-footer');
      if (!hasFooter && !window.__panelFooterInjected){
        var res = await fetch('footer.html', { cache: 'no-store' });
        if (res.ok) {
          var html = await res.text();
          var wrap = document.createElement('div');
          wrap.setAttribute('data-panel-injected','footer');
          wrap.innerHTML = html;
          document.body.appendChild(wrap);
          window.__panelFooterInjected = true;
        }
      }
    } catch(e){}
    dedupeFooters();
    setTimeout(dedupeFooters, 50);
    setTimeout(dedupeFooters, 250);
    try{
      var obs = new MutationObserver(function(){ dedupeFooters(); });
      obs.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
  });
})();