let slideIndex = 0;
showSlides();

function showSlides(){
  let slides = document.querySelectorAll('.slides img');
  slides.forEach((slide, i) => slide.style.display = "none");
  slideIndex++;
  if(slideIndex > slides.length){ slideIndex = 1; }
  slides[slideIndex-1].style.display = "block";
  setTimeout(showSlides, 5000);
}
function moveSlide(n){
  let slides = document.querySelectorAll('.slides img');
  slides.forEach(slide => slide.style.display = "none");
  slideIndex += n;
  if(slideIndex > slides.length){ slideIndex = 1; }
  if(slideIndex < 1){ slideIndex = slides.length; }
  slides[slideIndex-1].style.display = "block";
}
function toggleMobileMenu(){
  let menu = document.querySelector('.mobile-menu');
  menu.style.display = menu.style.display === "flex" ? "none" : "flex";
}
