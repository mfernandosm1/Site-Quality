(function(){
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
    var el=e.target.closest('a,button,[role="button"],input[type="submit"],input[type="button"]');
    if(!el || el.closest('[data-kernel-ignore]'))return;
    send({action:'CLICK',label:textOf(el),element:el.tagName.toLowerCase(),target:el.getAttribute('href')||el.getAttribute('data-action')||el.name||el.id||''});
  },true);
  document.addEventListener('submit',function(e){
    var form=e.target;if(!form || form.closest('[data-kernel-ignore]'))return;
    send({action:'FORM_SUBMIT',label:form.getAttribute('aria-label')||form.getAttribute('name')||form.id||'Formulário enviado',element:'form',target:form.getAttribute('action')||location.pathname});
  },true);
})();
