document.addEventListener("DOMContentLoaded", () => {
  // Carrossel automático
  const carousel = document.querySelector(".carousel");
  let index = 0;
  if(carousel){
    setInterval(() => {
      index = (index + 1) % carousel.children.length;
      carousel.style.transform = `translateX(-${index * 100}%)`;
    }, 5000);
  }

  // Menu mobile toggle
  const menuBtn = document.querySelector(".mobile-menu-button");
  const sidebar = document.querySelector(".mobile-sidebar");
  if(menuBtn && sidebar){
    menuBtn.addEventListener("click", () => {
      sidebar.style.display = sidebar.style.display === "block" ? "none" : "block";
    });
  }
});
