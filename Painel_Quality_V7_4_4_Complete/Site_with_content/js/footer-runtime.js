(function(){
  function ready(fn){ if(document.readyState!=='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }
  function dedupe(){
    try{
      var fs = document.querySelectorAll('footer');
      if (fs.length>1){ for (var i=1;i<fs.length;i++){ fs[i].parentNode && fs[i].parentNode.removeChild(fs[i]); } }
    }catch(e){}
  }
  ready(async function(){
    try{
      var has = document.querySelector('footer, .site-footer, [data-site-footer]');
      if (!has && !window.__panelFooterInjected){
        var res = await fetch('footer.html', { cache: 'no-store' });
        if (res.ok){
          var html = await res.text();
          var wrap = document.createElement('div');
          wrap.setAttribute('data-panel-injected','footer');
          wrap.innerHTML = html;
          document.body.appendChild(wrap);
          window.__panelFooterInjected = true;
        }
      }
    }catch(e){}
    dedupe();
    setTimeout(dedupe, 50); setTimeout(dedupe, 250);
    try{
      var obs = new MutationObserver(function(){ dedupe(); });
      obs.observe(document.body, { childList:true, subtree:true });
    }catch(e){}
  });
})();