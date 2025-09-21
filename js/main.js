document.addEventListener('DOMContentLoaded', function(){
  const menuToggle = document.querySelector('.menu-toggle');
  const menuMobile = document.querySelector('.menu-mobile');
  const closeMenu = document.querySelector('.close-menu');
  if(menuToggle && menuMobile){
    menuToggle.addEventListener('click', ()=> menuMobile.classList.add('active'));
    if(closeMenu) closeMenu.addEventListener('click', ()=> menuMobile.classList.remove('active'));
  }

  // Carousel
  let slides = document.querySelectorAll('.carousel img');
  let currentIndex = 0;
  if(slides.length){
    slides[currentIndex].classList.add('active');
    function showSlide(index){
      slides.forEach(s=>s.classList.remove('active'));
      slides[index].classList.add('active');
    }
    document.querySelector('.next').addEventListener('click', ()=>{
      currentIndex = (currentIndex+1)%slides.length;
      showSlide(currentIndex);
    });
    document.querySelector('.prev').addEventListener('click', ()=>{
      currentIndex = (currentIndex-1+slides.length)%slides.length;
      showSlide(currentIndex);
    });
    setInterval(()=>{
      currentIndex = (currentIndex+1)%slides.length;
      showSlide(currentIndex);
    }, 5000);
  }
});
