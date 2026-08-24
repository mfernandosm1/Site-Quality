(function(){
  // v0.28.0: telemetria leve. Cliques comuns não geram mais uma requisição HTTP
  // para cada navegação. Apenas elementos explicitamente marcados são rastreados.
  function textOf(el){
    return String(el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.value || el.name || '').replace(/\s+/g,' ').trim().slice(0,180);
  }
  function send(payload){
    try{
      var body=JSON.stringify(Object.assign({route:location.pathname+location.search,module:(location.pathname.split('/').filter(Boolean)[0]||'dashboard')},payload));
      if(navigator.sendBeacon){navigator.sendBeacon('/kernel/client-event',new Blob([body],{type:'application/json'}));return;}
      fetch('/kernel/client-event',{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true}).catch(function(){});
    }catch(_){ }
  }
  document.addEventListener('click',function(e){
    var el=e.target.closest('[data-kernel-track]');
    if(!el || el.closest('[data-kernel-ignore]'))return;
    send({action:'CLICK',label:textOf(el),element:el.tagName.toLowerCase(),target:el.getAttribute('href')||el.getAttribute('data-action')||el.name||el.id||''});
  },true);
})();
