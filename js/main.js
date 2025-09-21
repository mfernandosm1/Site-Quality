
let currentIndex = 0;
const items = document.querySelectorAll('.carousel-item');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
let autoPlayInterval;

function showItem(index) {
  items.forEach((item, i) => {
    item.classList.toggle('block', i === index);
    item.classList.toggle('hidden', i !== index);
  });
}

function nextItem() {
  currentIndex = (currentIndex === items.length - 1) ? 0 : currentIndex + 1;
  showItem(currentIndex);
}

function prevItem() {
  currentIndex = (currentIndex === 0) ? items.length - 1 : currentIndex - 1;
  showItem(currentIndex);
}

function startAutoPlay() {
  stopAutoPlay();
  autoPlayInterval = setInterval(nextItem, 5000);
}

function stopAutoPlay() {
  if (autoPlayInterval) clearInterval(autoPlayInterval);
}

prevBtn?.addEventListener('click', () => {
  prevItem();
  startAutoPlay();
});

nextBtn?.addEventListener('click', () => {
  nextItem();
  startAutoPlay();
});

showItem(currentIndex);
startAutoPlay();
