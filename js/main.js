let currentIndex = 0;
const images = document.querySelector('.carousel-images');
const total = images.children.length;

function showSlide(index) {
  images.style.transform = `translateX(-${index * 100}%)`;
}

document.querySelector('.prev').addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + total) % total;
  showSlide(currentIndex);
  resetAutoSlide();
});

document.querySelector('.next').addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % total;
  showSlide(currentIndex);
  resetAutoSlide();
});

let autoSlide = setInterval(() => {
  currentIndex = (currentIndex + 1) % total;
  showSlide(currentIndex);
}, 5000);

function resetAutoSlide() {
  clearInterval(autoSlide);
  autoSlide = setInterval(() => {
    currentIndex = (currentIndex + 1) % total;
    showSlide(currentIndex);
  }, 5000);
}
