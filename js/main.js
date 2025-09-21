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

  // Simple carousel implementation that only runs the visible carousel
  function Carousel(trackId, options){
    this.track = document.getElementById(trackId);
    if(!this.track) return;
    // confirm visibility before running
    const style = window.getComputedStyle(this.track.parentElement);
    if(style.display === 'none' || style.visibility === 'hidden') return;

    this.slides = Array.from(this.track.children);
    if(this.slides.length === 0) return;
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

  const desktopPrev = document.querySelector('.desktop-carousel .prev');
  const desktopNext = document.querySelector('.desktop-carousel .next');
  const desktopCarousel = new Carousel('desktop-track', { autoplay:5000, prevBtn: desktopPrev, nextBtn: desktopNext });

  const mobileCarousel = new Carousel('mobile-track', { autoplay:5000 });

  // reload on breakpoint change to ensure correct carousel is active
  let lastIsDesktop = window.innerWidth > 768;
  window.addEventListener('resize', () => {
    const nowIsDesktop = window.innerWidth > 768;
    if(nowIsDesktop !== lastIsDesktop){
      lastIsDesktop = nowIsDesktop;
      // reload to re-init appropriate carousel and avoid duplicates
      location.reload();
    }
  });

  // Pause carousels on visibility change
  document.addEventListener('visibilitychange', ()=>{
    // nothing extra needed because Carousel objects clear on reload
  });
});