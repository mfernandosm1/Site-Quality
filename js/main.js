document.addEventListener("DOMContentLoaded", () => {
  let currentIndex = 0;
  const items = document.querySelectorAll('.carousel-item');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const menuBtn = document.getElementById('menu-btn');
  const closeMenu = document.getElementById('close-menu');
  const mobileMenu = document.getElementById('mobile-menu');

  function showItem(index) {
    items.forEach((item, i) => {
      item.style.display = i === index ? 'block' : 'none';
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

  setInterval(() => {
    currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
    showItem(currentIndex);
  }, 4000);

  showItem(currentIndex);

  // Menu mobile
  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('translate-x-full');
  });

  closeMenu.addEventListener('click', () => {
    mobileMenu.classList.add('translate-x-full');
  });
});
