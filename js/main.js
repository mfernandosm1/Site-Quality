let currentSlide = 0;
let slides = document.querySelectorAll('.carrossel .slides .banner');
let autoSlideInterval;

function showSlide(index) {
  slides.forEach((slide, i) => {
    slide.classList.remove('active');
    if (i === index) slide.classList.add('active');
  });
  currentSlide = index;
}

function moveSlide(step) {
  let newIndex = (currentSlide + step + slides.length) % slides.length;
  showSlide(newIndex);
}

function startAutoSlide() {
  autoSlideInterval = setInterval(() => {
    moveSlide(1);
  }, 5000);
}

function stopAutoSlide() {
  clearInterval(autoSlideInterval);
}

document.addEventListener('DOMContentLoaded', () => {
  slides = document.querySelectorAll('.carrossel .slides .banner');
  showSlide(0);
  startAutoSlide();
});

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
}