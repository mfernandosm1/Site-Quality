document.addEventListener('DOMContentLoaded', () => {
  let currentIndex = 0;
  const items = document.querySelectorAll('.carousel-item');
  const inner = document.querySelector('.carousel-inner');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  function updateCarousel() {
    inner.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  prev.addEventListener('click', () => {
    currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
    updateCarousel();
  });

  next.addEventListener('click', () => {
    currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
    updateCarousel();
  });

  setInterval(() => {
    currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
    updateCarousel();
  }, 5000);

  // Mobile menu
  const menuToggle = document.getElementById('menu-toggle');
  const menuClose = document.getElementById('menu-close');
  const mobileMenu = document.getElementById('mobile-menu');

  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.remove('translate-x-full');
  });
  menuClose.addEventListener('click', () => {
    mobileMenu.classList.add('translate-x-full');
  });
});
