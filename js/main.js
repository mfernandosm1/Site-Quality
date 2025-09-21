
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const close = document.getElementById("close-sidebar");

  toggle.addEventListener("click", () => sidebar.classList.add("active"));
  close.addEventListener("click", () => sidebar.classList.remove("active"));

  // Carousel
  let current = 0;
  const slides = document.querySelectorAll(".carousel img");
  setInterval(() => {
    slides[current].classList.remove("active");
    current = (current + 1) % slides.length;
    slides[current].classList.add("active");
  }, 5000);
});
