// Mobile menu toggle
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const mobileMenu = document.getElementById('mobile-menu');

if(menuToggle){
  menuToggle.addEventListener('click', () => {
    mobileMenu.style.transform = 'translateX(0)';
  });
}

if(menuClose){
  menuClose.addEventListener('click', () => {
    mobileMenu.style.transform = 'translateX(100%)';
  });
}

// Swiper carousels
const desktopSwiper = new Swiper('.desktop-banners', {
  loop: true,
  autoplay: { delay: 3000 },
  navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  pagination: { el: '.swiper-pagination', clickable: true }
});

const mobileSwiper = new Swiper('.mobile-banners', {
  loop: true,
  autoplay: { delay: 3000 },
  pagination: { el: '.swiper-pagination', clickable: true }
});
