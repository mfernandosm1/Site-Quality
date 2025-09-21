let currentSlide = 0;
let slides = document.querySelectorAll('.slide');
if(slides.length > 0) {
  slides[currentSlide].classList.add('active');
  setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 4000);
}

function toggleMenu() {
  document.getElementById('mobileMenu').style.display = 'block';
}
function closeMenu() {
  document.getElementById('mobileMenu').style.display = 'none';
}