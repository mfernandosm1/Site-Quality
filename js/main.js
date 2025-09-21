// main.js

// ----------------------------
// Carrossel de Banners
// ----------------------------
let currentIndex = 0;
const items = document.querySelectorAll('.carousel-item');
const totalItems = items.length;
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let autoSlide;

// Mostrar item específico
function showItem(index) {
  items.forEach((item, i) => {
    item.classList.toggle('hidden', i !== index);
    item.classList.toggle('block', i === index);
  });
}

// Anterior
function prevItem() {
  currentIndex = (currentIndex === 0) ? totalItems - 1 : currentIndex - 1;
  showItem(currentIndex);
}

// Próximo
function nextItem() {
  currentIndex = (currentIndex === totalItems - 1) ? 0 : currentIndex + 1;
  showItem(currentIndex);
}

// Auto Slide
function startAutoSlide() {
  autoSlide = setInterval(nextItem, 4000); // troca a cada 4s
}

function stopAutoSlide() {
  clearInterval(autoSlide);
}

// Eventos botões
if (prevBtn && nextBtn) {
  prevBtn.addEventListener('click', () => {
    prevItem();
    stopAutoSlide();
    startAutoSlide();
  });

  nextBtn.addEventListener('click', () => {
    nextItem();
    stopAutoSlide();
    startAutoSlide();
  });
}

// Inicializar
if (items.length > 0) {
  showItem(currentIndex);
  startAutoSlide();
}

// ----------------------------
// Menu Mobile
// ----------------------------
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const mobileOverlay = document.getElementById('mobile-overlay');
const mobileClose = document.getElementById('mobile-close');

if (mobileMenuBtn && mobileMenu && mobileOverlay && mobileClose) {
  // Abrir
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('translate-x-full');
    mobileOverlay.classList.remove('hidden');
  });

  // Fechar (ícone X ou overlay)
  mobileClose.addEventListener('click', () => {
    mobileMenu.classList.add('translate-x-full');
    mobileOverlay.classList.add('hidden');
  });

  mobileOverlay.addEventListener('click', () => {
    mobileMenu.classList.add('translate-x-full');
    mobileOverlay.classList.add('hidden');
  });
}
