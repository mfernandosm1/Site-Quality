document.addEventListener('DOMContentLoaded',()=>{
  const toggle = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  toggle.addEventListener('click',()=>{
    mobileMenu.style.display = mobileMenu.style.display === 'flex' ? 'none' : 'flex';
  });

  // Carousel
  const slides = document.querySelectorAll('.carousel img');
  let index = 0;
  function showSlide(i){
    slides.forEach((img,idx)=> img.classList.toggle('active', idx===i));
  }
  showSlide(index);
  setInterval(()=>{
    index = (index+1) % slides.length;
    showSlide(index);
  },5000);
});