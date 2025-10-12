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
    // Injeção (apenas se não houver) — com trava global
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
    // Dedup imediato + depois de um tempo
    dedupeFooters();
    setTimeout(dedupeFooters, 50);
    setTimeout(dedupeFooters, 250);
    // Observer para eliminar duplicatas que surjam depois (ex.: outro script injeta)
    try{
      var obs = new MutationObserver(function(){ dedupeFooters(); });
      obs.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
  });
})();