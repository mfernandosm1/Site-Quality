
document.addEventListener('DOMContentLoaded', function(){
  // Carousel
  try {
    const inner = document.querySelector('.carousel-inner');
    const items = document.querySelectorAll('.carousel-item');
    let idx = 0;
    const total = items.length || 1;
    function show(i){ if(inner) inner.style.transform = `translateX(-${i*100}%)`; }
    show(idx);
    const interval = setInterval(()=>{ idx = (idx+1)%total; show(idx); }, 5000);
    // Prev/Next buttons (if desired in future)
    document.getElementById('prev')?.addEventListener('click', ()=>{ idx = (idx-1+total)%total; show(idx); clearInterval(interval); });
    document.getElementById('next')?.addEventListener('click', ()=>{ idx = (idx+1)%total; show(idx); clearInterval(interval); });
  } catch(e){ console.warn('carousel error', e); }

  // Mobile drawer menu
  try {
    const btn = document.getElementById('menu-toggle');
    const drawer = document.getElementById('mobile-menu');
    const closeBtn = document.getElementById('mobile-close');
    btn?.addEventListener('click', ()=> drawer?.classList.toggle('open'));
    closeBtn?.addEventListener('click', ()=> drawer?.classList.remove('open'));
    // close when clicking link
    document.querySelectorAll('#mobile-menu a')?.forEach(a=> a.addEventListener('click', ()=> drawer?.classList.remove('open')));
  } catch(e){ console.warn('drawer error', e); }

});
