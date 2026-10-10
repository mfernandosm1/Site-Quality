/* Diagnóstico sob demanda: adicionar ?qualityPerf=1 ao endereço. Nenhuma coleta remota. */
(function(){
 'use strict';
 if(window.__qualityPerfDiagnostic) return; window.__qualityPerfDiagnostic=true;
 const start=performance.now(); let firstCard=0;
 const observer=new MutationObserver(()=>{
   if(firstCard)return;
   if(document.querySelector('.produto-card, .product-card')){firstCard=Math.round(performance.now());observer.disconnect();}
 });
 if(document.querySelector('.produto-card, .product-card')){firstCard=Math.round(performance.now());}
 else observer.observe(document.documentElement,{childList:true,subtree:true});
 function report(){
   const nav=performance.getEntriesByType('navigation')[0]||{};
   const resources=performance.getEntriesByType('resource');
   const slow=resources.slice().sort((a,b)=>b.duration-a.duration).slice(0,8);
   const cc=navigator.connection||{};
   let rows=[
     'QUALITY - DIAGNÓSTICO DE CARREGAMENTO',
     'Página: '+location.pathname,
     'Conexão: '+(cc.effectiveType||'não identificada'),
     'HTML/TTFB: '+Math.round(nav.responseStart||0)+' ms',
     'DOM pronto: '+Math.round(nav.domContentLoadedEventEnd||0)+' ms',
     'Load: '+Math.round(nav.loadEventEnd||0)+' ms',
     '1º card: '+(firstCard?firstCard+' ms':'ainda não carregado'),
     'Imagens: '+Array.from(document.images).filter(x=>x.complete&&x.naturalWidth>0).length+'/'+document.images.length,
     'Recursos solicitados: '+resources.length,
     'Mais lentos:'
   ];
   slow.forEach(r=>{let name='';try{name=new URL(r.name).pathname}catch(_){name=r.name}; rows.push(' - '+Math.round(r.duration)+' ms | '+name.slice(0,115));});
   return rows.join('\n');
 }
 function draw(){
  const box=document.createElement('aside');box.id='quality-perf-debug';
  box.style.cssText='position:fixed;left:8px;right:8px;bottom:83px;max-width:550px;max-height:65vh;overflow:auto;z-index:999999;background:#fff;color:#111;border:2px solid #ab111b;border-radius:10px;padding:12px;font:12px/1.45 monospace;box-shadow:0 6px 25px #0004';
  const actions=document.createElement('div');actions.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:6px;position:sticky;top:0;background:#fff;padding-bottom:6px';
  const title=document.createElement('b');title.textContent='Diagnóstico Quality';
  const refresh=document.createElement('button');refresh.type='button';refresh.textContent='Atualizar';
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar';
  const close=document.createElement('button');close.type='button';close.textContent='Fechar';
  const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;font:inherit';
  function update(){output.textContent=report();}
  refresh.onclick=update;
  copy.onclick=async()=>{let s=report();try{await navigator.clipboard.writeText(s);copy.textContent='Copiado!';}catch(_){const area=document.createElement('textarea');area.value=s;box.appendChild(area);area.select();try{document.execCommand('copy')}catch(_){}area.remove();}};
  close.onclick=()=>box.remove();
  actions.append(title,refresh,copy,close);box.append(actions,output);document.body.appendChild(box);update();
 }
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(draw,1400),{once:true});
 else setTimeout(draw,1400);
})();
