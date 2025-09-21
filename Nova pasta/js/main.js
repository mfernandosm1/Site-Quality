// main.js

document.addEventListener('DOMContentLoaded', () => {
  // Menu hambúrguer
  const toggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  toggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });

  // Carrossel
  let currentIndex = 0;
  const items = document.querySelectorAll('.carousel-item');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');

  function showItem(index) {
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.remove('hidden');
        item.classList.add('block');
      } else {
        item.classList.add('hidden');
        item.classList.remove('block');
      }
    });
  }

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
    showItem(currentIndex);
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
    showItem(currentIndex);
  });

  // mostrar primeiro item
  showItem(currentIndex);
});
