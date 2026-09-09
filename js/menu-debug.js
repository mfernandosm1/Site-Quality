(function(){
  'use strict';
  var params = new URLSearchParams(location.search);
  if (params.get('debugmenu') !== '1') return;

  var MAX = 28;
  var logs = [];
  var mutationCount = 0;
  var lastMutationAt = 0;

  function short(el){
    if (!el || !el.tagName) return String(el || '');
    var out = el.tagName.toLowerCase();
    if (el.id) out += '#' + el.id;
    if (el.classList && el.classList.length) out += '.' + Array.from(el.classList).slice(0,4).join('.');
    return out;
  }
  function txt(el){
    return String(el && el.textContent || '').replace(/\s+/g,' ').trim().slice(0,50);
  }
  function css(el, prop){
    try { return getComputedStyle(el)[prop] || ''; } catch(e){ return ''; }
  }
  function menuState(){
    var m=document.getElementById('mobile-menu'), o=document.getElementById('menu-overlay');
    return 'menu='+(m?(m.className+' d:'+css(m,'display')+' pe:'+css(m,'pointerEvents')):'-')+
      ' overlay='+(o?(o.className+' d:'+css(o,'display')+' pe:'+css(o,'pointerEvents')):'-');
  }
  function push(line){
    logs.unshift(new Date().toLocaleTimeString()+' '+line);
    logs = logs.slice(0, MAX);
    render();
  }
  function eventLine(type, ev){
    var t=ev.target;
    var a=t && t.closest ? t.closest('a[href]') : null;
    var top='';
    try { top = short(document.elementFromPoint(ev.clientX || 0, ev.clientY || 0)); } catch(e){}
    return type+' target='+short(t)+' text="'+txt(t)+'"'+
      (a?' href='+a.getAttribute('href'):'')+
      ' top='+top+' prevented='+ev.defaultPrevented+' '+menuState();
  }

  var panel=document.createElement('section');
  panel.id='quality-menu-debug';
  panel.style.cssText='position:fixed;left:6px;right:6px;bottom:6px;z-index:2147483647;background:rgba(0,0,0,.94);color:#fff;font:11px/1.35 monospace;padding:8px;border-radius:8px;max-height:42vh;overflow:auto;box-shadow:0 2px 14px rgba(0,0,0,.35)';
  panel.innerHTML='<div style="display:flex;gap:6px;align-items:center;position:sticky;top:0;background:#111;padding-bottom:5px"><b style="flex:1">DIAGNÓSTICO MENU/CATEGORIA</b><button type="button" data-copy style="font:12px sans-serif;padding:5px 8px">Copiar</button><button type="button" data-clear style="font:12px sans-serif;padding:5px 8px">Limpar</button><button type="button" data-hide style="font:12px sans-serif;padding:5px 8px">×</button></div><pre data-log style="white-space:pre-wrap;margin:0"></pre>';
  document.body.appendChild(panel);
  var pre=panel.querySelector('[data-log]');
  function render(){
    if (!pre) return;
    pre.textContent='URL: '+location.href+'\nViewport: '+innerWidth+'x'+innerHeight+'\nMutações nav: '+mutationCount+(lastMutationAt?' (última '+new Date(lastMutationAt).toLocaleTimeString()+')':'')+'\n'+logs.join('\n');
  }
  panel.querySelector('[data-clear]').onclick=function(){logs=[];mutationCount=0;lastMutationAt=0;render();};
  panel.querySelector('[data-hide]').onclick=function(){panel.style.display='none';};
  panel.querySelector('[data-copy]').onclick=function(){
    var s=pre.textContent;
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(s).catch(function(){});
    else window.prompt('Copie o diagnóstico:',s);
  };

  ['pointerdown','pointerup','touchstart','touchend','click'].forEach(function(type){
    document.addEventListener(type,function(ev){ push(eventLine(type,ev)); },true);
  });

  ['nav-desktop','nav-mobile'].forEach(function(id){
    var n=document.getElementById(id); if(!n || !window.MutationObserver) return;
    new MutationObserver(function(ms){
      mutationCount += ms.length; lastMutationAt=Date.now();
      push('MUTATION '+id+' x'+ms.length);
    }).observe(n,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
  });

  window.addEventListener('error',function(e){ push('ERROR '+(e.message||'')+' @ '+(e.filename||'')+':'+(e.lineno||'')); });
  window.addEventListener('unhandledrejection',function(e){ push('PROMISE '+String(e.reason||'')); });
  document.addEventListener('visibilitychange',function(){ push('visibility='+document.visibilityState); },true);
  window.addEventListener('beforeunload',function(){ try{sessionStorage.setItem('quality_menu_debug_last',pre.textContent);}catch(e){}; });

  try {
    var old=sessionStorage.getItem('quality_menu_debug_last');
    if(old){ push('ÚLTIMA PÁGINA registrou beforeunload (houve tentativa de navegação).'); sessionStorage.removeItem('quality_menu_debug_last'); }
  } catch(e){}

  push('diagnóstico ativo');
})();
