(function(){
  'use strict';
  var observer = null;
  var renderTimer = null;
  var rendering = false;
  var lastSignature = '';

  function normalizeFlag(value, defaultValue){
    if (value === undefined || value === null || value === '') return defaultValue;
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    var v = String(value).trim().toLowerCase();
    if (['true','1','sim','yes','on','ativo','ativa'].indexOf(v) >= 0) return true;
    if (['false','0','nao','não','no','off','inativo','inativa'].indexOf(v) >= 0) return false;
    return defaultValue;
  }

  function esc(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function enc(value){ return encodeURIComponent(String(value == null ? '' : value).trim()); }

  function getJson(url){
    return fetch(url, { cache:'no-store' }).then(function(r){
      if (!r.ok) throw new Error('HTTP '+r.status+' em '+url);
      return r.json();
    });
  }

  function categoryNodes(nav){
    if (!nav) return [];
    return Array.prototype.filter.call(nav.children, function(el){
      if (!el || !el.matches) return false;
      return el.matches('.cat-link, .cat-menu-group, .cat-mobile-group, [data-quality-catalog-node="1"]');
    });
  }

  function clearCategories(nav){ categoryNodes(nav).forEach(function(el){ el.remove(); }); }

  function iconHtml(icon){
    icon = String(icon || '').trim();
    return icon && icon.indexOf('fa-') >= 0 ? '<i class="'+esc(icon)+'" aria-hidden="true"></i> ' : '';
  }

  function render(categories, subcategories){
    var desktop = document.getElementById('nav-desktop');
    var mobile = document.getElementById('nav-mobile');
    if (!desktop || !mobile) return false;

    categories = (categories || []).slice().sort(function(a,b){ return Number(a.order||0)-Number(b.order||0); });
    subcategories = (subcategories || []).filter(function(s){
      return s && normalizeFlag(s.active, true) && normalizeFlag(s.showOnSite, false);
    }).sort(function(a,b){
      var d=Number(a.order||0)-Number(b.order||0);
      return d || String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
    });

    var signature = JSON.stringify({
      c:categories.map(function(c){return [c.id,c.slug,c.name,c.order,c.icon];}),
      s:subcategories.map(function(s){return [s.id,s.categoryId,s.slug,s.name,s.order,s.active,s.showOnSite];})
    });

    rendering = true;
    if (observer) observer.disconnect();
    try {
      clearCategories(desktop);
      clearCategories(mobile);
      var search = desktop.querySelector('.search-wrapper');

      categories.forEach(function(cat){
        var slug=String(cat.slug||cat.name||'').trim();
        var name=String(cat.name||slug).trim();
        if(!slug||!name) return;
        var children=subcategories.filter(function(s){ return Number(s.categoryId)===Number(cat.id); });
        var href='/'+enc(slug)+'/';

        if(children.length){
          var group=document.createElement('div');
          group.className='cat-menu-group'; group.setAttribute('data-quality-catalog-node','1');
          group.innerHTML='<a href="'+href+'" class="cat-link cat-parent-link">'+iconHtml(cat.icon)+esc(name)+' <span class="cat-menu-caret">▾</span></a><div class="cat-submenu">'+children.map(function(sub){ return '<a href="'+href+'?subcategoria='+enc(sub.slug||sub.name)+'" class="cat-sub-link">'+esc(sub.name||sub.slug)+'</a>'; }).join('')+'</div>';
          if(search) desktop.insertBefore(group,search); else desktop.appendChild(group);

          var mgroup=document.createElement('div');
          mgroup.className='cat-mobile-group'; mgroup.setAttribute('data-quality-catalog-node','1');
          mgroup.innerHTML='<a href="'+href+'" class="cat-link">'+iconHtml(cat.icon)+esc(name)+'</a><div class="cat-mobile-submenu">'+children.map(function(sub){ return '<a href="'+href+'?subcategoria='+enc(sub.slug||sub.name)+'" class="cat-sub-link cat-sub-link-mobile">'+esc(sub.name||sub.slug)+'</a>'; }).join('')+'</div>';
          mobile.appendChild(mgroup);
        }else{
          var a=document.createElement('a'); a.href=href; a.className='cat-link'; a.setAttribute('data-quality-catalog-node','1'); a.innerHTML=iconHtml(cat.icon)+esc(name);
          if(search) desktop.insertBefore(a,search); else desktop.appendChild(a);
          var am=a.cloneNode(true); mobile.appendChild(am);
        }
      });
      lastSignature=signature;
    } finally {
      rendering=false;
      observe();
    }
    return true;
  }

  function observe(){
    if (typeof MutationObserver==='undefined') return;
    var desktop=document.getElementById('nav-desktop');
    var mobile=document.getElementById('nav-mobile');
    if(!desktop||!mobile) return;
    if(!observer){
      observer=new MutationObserver(function(){
        if(rendering) return;
        clearTimeout(renderTimer);
        renderTimer=setTimeout(loadAndRender,20);
      });
    }
    observer.disconnect();
    observer.observe(desktop,{childList:true,subtree:true});
    observer.observe(mobile,{childList:true,subtree:true});
  }

  function loadAndRender(){
    if(rendering) return;
    var desktop=document.getElementById('nav-desktop');
    var mobile=document.getElementById('nav-mobile');
    if(!desktop||!mobile){ setTimeout(loadAndRender,80); return; }
    Promise.all([
      getJson('/content/categories.json'),
      getJson('/content/subcategories.json').catch(function(){return {items:[]};})
    ]).then(function(all){
      render(all[0].items||all[0]||[], all[1].items||all[1]||[]);
    }).catch(function(err){ console.error('Quality: falha ao sincronizar menu do catálogo',err); });
  }

  function start(){
    loadAndRender();
    setTimeout(loadAndRender,150);
    setTimeout(loadAndRender,600);
    setTimeout(loadAndRender,1600);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();