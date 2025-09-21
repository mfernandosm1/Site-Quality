document.addEventListener('DOMContentLoaded', function(){
  // Mobile menu controls with overlay
  const hamburger = document.getElementById('hamburger');
  const mobile = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-close');
  const overlay = document.getElementById('overlay');

  function openMobile(){
    if(mobile) mobile.style.transform = 'translateX(0)';
    if(overlay) overlay.classList.remove('hidden');
    if(mobile) mobile.setAttribute('aria-hidden','false');
  }
  function closeMobile(){
    if(mobile) mobile.style.transform = 'translateX(110%)';
    if(overlay) overlay.classList.add('hidden');
    if(mobile) mobile.setAttribute('aria-hidden','true');
  }

  if(hamburger) hamburger.addEventListener('click', openMobile);
  if(mobileClose) mobileClose.addEventListener('click', closeMobile);
  if(overlay) overlay.addEventListener('click', closeMobile);

  // Simple carousel for desktop and mobile
  function Carousel(trackId, options){
    this.track = document.getElementById(trackId);
    if(!this.track) return;
    this.slides = Array.from(this.track.children);
    this.index = 0;
    this.total = this.slides.length;
    this.interval = null;
    this.autoplay = options.autoplay || 5000;
    this.prevBtn = options.prevBtn || null;
    this.nextBtn = options.nextBtn || null;

    this.show = () => {
      const offset = -this.index * 100;
      this.track.style.transform = 'translateX(' + offset + '%)';
    };
    this.next = () => { this.index = (this.index + 1) % this.total; this.show(); };
    this.prev = () => { this.index = (this.index - 1 + this.total) % this.total; this.show(); };
    this.start = () => { if(this.autoplay) this.interval = setInterval(this.next, this.autoplay); };
    this.stop = () => { if(this.interval) clearInterval(this.interval); };
    if(this.prevBtn && this.nextBtn){
      this.prevBtn.addEventListener('click', ()=>{ this.prev(); this.stop(); this.start(); });
      this.nextBtn.addEventListener('click', ()=>{ this.next(); this.stop(); this.start(); });
    }
    this.show();
    this.start();
  }

  // Desktop carousel (with buttons)
  const desktopPrev = document.querySelector('.desktop-carousel .prev');
  const desktopNext = document.querySelector('.desktop-carousel .next');
  const desktopCarousel = new Carousel('desktop-track', { autoplay:5000, prevBtn: desktopPrev, nextBtn: desktopNext });

  // Mobile carousel (no manual buttons)
  const mobileCarousel = new Carousel('mobile-track', { autoplay:5000 });

  // Accessibility: pause carousels on focus
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ if(desktopCarousel) desktopCarousel.stop(); if(mobileCarousel) mobileCarousel.stop(); }
    else{ if(desktopCarousel) desktopCarousel.start(); if(mobileCarousel) mobileCarousel.start(); }
  });
});