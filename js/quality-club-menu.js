/* Quality Club — normalização de links do menu, sem alterar logins ou dados. */
(function(){
  'use strict';
  if (window.__qualityClubMenuPatch) return;
  window.__qualityClubMenuPatch=true;
  var url='/quality-club.html';
  function isClubLink(a){
    var text=(a.textContent||'').replace(/\s+/g,' ').trim();
    return /^(?:tabela\s+vip|quality\s+club)$/i.test(text) || a.classList.contains('quality-club-nav-link');
  }
  function normalize(){
    document.querySelectorAll('#nav-desktop, #nav-mobile, .quality-mobile-drawer-panel, .quality-mobile-categories, .quality-mobile-sheet-content').forEach(function(nav){
      var anchors=Array.prototype.slice.call(nav.querySelectorAll('a'));
      var kept=null;
      anchors.forEach(function(a){
        if (!isClubLink(a)) return;
        if (kept && a.parentNode===kept.parentNode){ a.remove(); return; }
        if(a.textContent.trim()!=='Quality Club')a.textContent='Quality Club';
        if(a.getAttribute('href')!==url)a.setAttribute('href',url);
        if(!a.classList.contains('quality-club-nav-link'))a.classList.add('quality-club-nav-link');
        kept=a;
      });
      if (!kept && (nav.id==='nav-desktop' || nav.id==='nav-mobile')){
        var item=document.createElement('a');
        item.href=url; item.textContent='Quality Club';
        item.className='cat-link quality-club-nav-link';
        nav.appendChild(item);
      }
    });
  }
  function init(){
    normalize();
    var host=document.getElementById('header');
    if (host && 'MutationObserver' in window){
      var pending=false;
      new MutationObserver(function(){
        if(pending) return;
        pending=true;
        Promise.resolve().then(function(){pending=false;normalize();});
      }).observe(host,{subtree:true,childList:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  document.addEventListener('quality:category-header-ready',normalize);
})();
