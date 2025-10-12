// js/site-shell.js — header/footer + menu com delegação e aria fix
(function(){
  if (window.__SITE_SHELL_LOADED__) return;
  window.__SITE_SHELL_LOADED__ = true;

  function onReady(fn){ document.readyState!=='loading' ? fn() : document.addEventListener('DOMContentLoaded', fn); }

  // Delegação global: funciona mesmo após reinjeção do header
  function bindMenuDelegation(){
    if (window.__MENU_DELEGATION_BOUND__) return;
    window.__MENU_DELEGATION_BOUND__ = true;

    document.addEventListener('click', function(ev){
      const t = ev.target;
      const toggle   = t.closest && t.closest('#menu-toggle');
      const wantsClose = t.closest && (t.closest('#menu-close') || t.closest('#menu-overlay') || t.closest('.mobile-nav a'));
      const menu   = document.getElementById('mobile-menu');
      const overlay= document.getElementById('menu-overlay');
      if (!menu) return;

      const open = () => {
        menu.classList.add('open');
        overlay && overlay.classList.add('active');
        document.body.classList.add('menu-open');
        menu.setAttribute('aria-hidden','false'); // ARIA fix
      };
      const close = () => {
        menu.classList.remove('open');
        overlay && overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        menu.setAttribute('aria-hidden','true'); // ARIA fix
      };

      if (toggle){ ev.preventDefault(); menu.classList.contains('open') ? close() : open(); }
      else if (wantsClose){ ev.preventDefault(); close(); }
    });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape'){
        const menu = document.getElementById('mobile-menu');
        const overlay= document.getElementById('menu-overlay');
        if (menu && menu.classList.contains('open')){
          menu.classList.remove('open'); overlay && overlay.classList.remove('active');
          document.body.classList.remove('menu-open'); menu.setAttribute('aria-hidden','true');
        }
      }
    });

    // Fecha ao mudar hash (âncoras do index)
    window.addEventListener('hashchange', function(){
      const menu = document.getElementById('mobile-menu');
      const overlay= document.getElementById('menu-overlay');
      if (menu){ menu.classList.remove('open'); menu.setAttribute('aria-hidden','true'); }
      if (overlay){ overlay.classList.remove('active'); }
      document.body.classList.remove('menu-open');
    });

    console.log('✅ Delegação do menu ligada');
  }

  async function fetchInto(target, url){
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return false;
      const html = await res.text();
      if (typeof target === 'function'){ target(html); }
      else { const el = document.querySelector(target); if (el) el.innerHTML = html; }
      return true;
    }catch(e){ console.warn('[site-shell] fetchInto fail', url, e); return false; }
  }

  async function ensureHeader(){
    const hasHeaderTag = !!document.querySelector('header.header');
    if (document.getElementById('header')){
      if (!hasHeaderTag){ await fetchInto('#header', 'header.html'); }
    } else if (!hasHeaderTag){
      await fetchInto(function(html){
        const wrap = document.createElement('div'); wrap.innerHTML = html;
        document.body.insertBefore(wrap, document.body.firstChild);
      }, 'header.html');
    }
  }

  async function ensureFooter(){
    const hasFooterTag = !!document.querySelector('footer');
    if (document.getElementById('footer')){
      if (!hasFooterTag){ await fetchInto('#footer', 'footer.html'); }
    } else if (!hasFooterTag){
      await fetchInto(function(html){
        const wrap = document.createElement('div'); wrap.innerHTML = html;
        document.body.appendChild(wrap);
      }, 'footer.html');
    }
    // dedupe
    try{
      const fs = document.querySelectorAll('footer'); for (let i=1;i<fs.length;i++){ fs[i].parentNode && fs[i].parentNode.removeChild(fs[i]); }
    }catch(e){}
  }

  function initSwiperIfAny(){
    if (typeof Swiper !== 'undefined' && document.querySelector('.swiper')){
      new Swiper('.swiper', { loop:true, autoplay:{delay:5000,disableOnInteraction:false},
        navigation:{ nextEl:'.swiper-button-next', prevEl:'.swiper-button-prev' }, effect:'slide' });
      console.log('✅ Swiper inicializado');
    }
  }

  onReady(async function(){
    bindMenuDelegation();
    await ensureHeader();
    await ensureFooter();
    initSwiperIfAny();
  });
})();
