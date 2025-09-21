const swiper = new Swiper('.swiper', { 
  loop: true, 
  autoplay: { delay: 3000 }, 
  pagination: { el: '.swiper-pagination', clickable: true }, 
  navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } 
});
document.getElementById('menu-toggle').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.remove('-translate-x-full');
});
document.getElementById('menu-close').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.add('-translate-x-full');
});