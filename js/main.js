// main.js

// Menu hamburguer toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  toggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });
});

// Carrossel
let currentIndex = 0;
const items = document.querySelectorAll('.carousel-item');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

function showItem(index) {
  items.forEach((item, i) => {
    item.classList.toggle('block', i === index);
    item.classList.toggle('hidden', i !== index);
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

showItem(currentIndex);
