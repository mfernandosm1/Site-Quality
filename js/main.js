document.addEventListener('DOMContentLoaded', () => {
  // Carousel
  const items = document.querySelectorAll('.carousel-item');
  let index = 0;
  function showSlide(i) {
    items.forEach((el, idx) => el.classList.toggle('active', idx === i));
  }
  function nextSlide() {
    index = (index + 1) % items.length;
    showSlide(index);
  }
  showSlide(index);
  setInterval(nextSlide, 4000);

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
  }
});
