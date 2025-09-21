document.addEventListener('DOMContentLoaded', function(){

  // Offcanvas mobile menu toggle
  const openBtn = document.getElementById('btn-open-menu');
  const closeBtn = document.getElementById('btn-close-menu');
  const offcanvas = document.getElementById('offcanvas');
  if(openBtn) openBtn.addEventListener('click', ()=>{ offcanvas.setAttribute('aria-hidden','false'); });
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ offcanvas.setAttribute('aria-hidden','true'); });
  // close by clicking outside
  document.addEventListener('click', (e)=>{
    if(offcanvas && offcanvas.getAttribute('aria-hidden') === 'false'){
      const isClickInside = offcanvas.contains(e.target) || (openBtn && openBtn.contains(e.target));
      if(!isClickInside) offcanvas.setAttribute('aria-hidden','true');
    }
  });

  // Simple carousel controller (supports desktop and mobile tracks separately)
  function Carousel(trackId, opts){
    this.track = document.getElementById(trackId);
    if(!this.track) return;
    this.slides = Array.from(this.track.children);
    this.total = this.slides.length;
    this.index = 0;
    this.autoplay = opts && opts.autoplay || 5000;
    this.timer = null;

    this.show = ()=>{
      const offset = -this.index * 100;
      this.track.style.transform = 'translateX(' + offset + '%)';
    };
    this.next = ()=>{ this.index = (this.index + 1) % this.total; this.show(); };
    this.prev = ()=>{ this.index = (this.index - 1 + this.total) % this.total; this.show(); };
    this.start = ()=>{ if(this.autoplay) this.timer = setInterval(this.next, this.autoplay); };
    this.stop = ()=>{ if(this.timer) clearInterval(this.timer); };

    // attach arrow buttons based on data-target attribute
    document.querySelectorAll('.carousel-arrow').forEach(btn=>{
      if(btn.dataset.target === trackId.split('-')[1]){
        btn.addEventListener('click', ()=>{ this.stop(); if(btn.classList.contains('left')) this.prev(); else this.next(); this.start(); });
      }
    });

    this.show(); this.start();
  }

  const desktopCarousel = new Carousel('track-desktop',{autoplay:5000});
  const mobileCarousel = new Carousel('track-mobile',{autoplay:5000});

  // accessibility: pause when page hidden
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ if(desktopCarousel && desktopCarousel.stop) desktopCarousel.stop(); if(mobileCarousel && mobileCarousel.stop) mobileCarousel.stop(); }
    else { if(desktopCarousel && desktopCarousel.start) desktopCarousel.start(); if(mobileCarousel && mobileCarousel.start) mobileCarousel.start(); }
  });

});