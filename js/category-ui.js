(function(){
  'use strict';
  if (window.__qcCategorySearchOnlyV18) return;
  window.__qcCategorySearchOnlyV18 = true;
  function norm(v){return (v||'').toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function msg(t){var m=document.getElementById('no-results');if(m){m.textContent=t;m.style.display='block';}else{window.alert(t);}}
  function firstJson(urls){var i=0;function next(){if(i>=urls.length)return Promise.resolve({items:[]});var u=urls[i++];return fetch(u,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error();var ct=String(r.headers.get('content-type')||'').toLowerCase();if(ct&&ct.indexOf('json')<0)throw new Error();return r.json();}).catch(next);}return next();}
  function search(q){var term=norm(q),cards=document.querySelectorAll('.product-card'),m=document.getElementById('no-results');if(!term){cards.forEach(function(c){c.style.display='flex';});if(m)m.style.display='none';return;}var found=false;cards.forEach(function(c){var h=c.querySelector('h3'),ok=norm(h?h.textContent:'').indexOf(term)!==-1;c.style.display=ok?'flex':'none';if(ok)found=true;});if(found){if(m)m.style.display='none';return;}Promise.all([firstJson(['/content/catalog-public.json','/content/products.json']),firstJson(['/content/categories.json'])]).then(function(a){var p=(a[0].items||[]).find(function(x){return x&&x.active!==false&&(norm(x.name||x.nome).indexOf(term)!==-1||norm(x.slug).indexOf(term)!==-1);});if(p&&(p.slug||p.id)){location.assign('/produto/'+encodeURIComponent(p.slug||p.id)+'/');return;}var c=(a[1].items||[]).find(function(x){return x&&(norm(x.name||x.nome).indexOf(term)!==-1||norm(x.slug).indexOf(term)!==-1);});if(c&&c.slug){location.assign('/'+encodeURIComponent(c.slug)+'/');return;}msg('Nenhum produto encontrado.');}).catch(function(){msg('Erro ao buscar produto.');});}
  function bind(i,b){var input=document.getElementById(i),btn=document.getElementById(b);if(!input||!btn)return;btn.addEventListener('click',function(){search(input.value);});input.addEventListener('keydown',function(e){if(e.key==='Enter')search(input.value);});}
  function init(){bind('qc-cat-search-input','qc-cat-search-button');bind('qc-cat-search-input-mobile','qc-cat-search-button-mobile');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
