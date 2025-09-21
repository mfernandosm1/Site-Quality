document.addEventListener("DOMContentLoaded", () => {
  // Drawer mobile
  const btn = document.querySelector(".mobile-menu-btn");
  const drawer = document.querySelector(".mobile-drawer");
  btn.addEventListener("click", () => {
    drawer.style.display = drawer.style.display === "flex" ? "none" : "flex";
  });

  // Carousel simples
  const items = document.querySelectorAll(".carousel-item");
  let index = 0;
  function showSlide(i){
    items.forEach((item, idx)=>{
      item.style.display = idx===i ? "block" : "none";
    });
  }
  showSlide(index);
  setInterval(()=>{
    index = (index+1)%items.length;
    showSlide(index);
  }, 5000);
});
