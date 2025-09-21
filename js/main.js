
document.addEventListener('DOMContentLoaded', function(){
  // Carousel
  const inner = document.querySelector('.carousel-inner');
  const slides = Array.from(document.querySelectorAll('.slide'));
  let idx = 0;
  const total = slides.length;
  function show(i){ inner.style.transform = `translateX(-${i*100}%)`; }
  document.getElementById('prev')?.addEventListener('click', ()=>{ idx = (idx-1+total)%total; show(idx); });
  document.getElementById('next')?.addEventListener('click', ()=>{ idx = (idx+1)%total; show(idx); });
  show(0);
  setInterval(()=>{ idx = (idx+1)%total; show(idx); }, 4000);

  // Drawer mobile
  const menuBtn = document.getElementById('menu-btn');
  const closeBtn = document.getElementById('close-menu');
  const drawer = document.getElementById('mobile-menu');
  menuBtn?.addEventListener('click', ()=> drawer.classList.add('open'));
  closeBtn?.addEventListener('click', ()=> drawer.classList.remove('open'));
});
