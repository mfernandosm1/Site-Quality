document.addEventListener("DOMContentLoaded", () => {
  const desktopBanners = document.querySelectorAll(".desktop-banner");
  const mobileBanners = document.querySelectorAll(".mobile-banner");
  let current = 0;

  function showBanner(banners) {
    banners.forEach((b, i) => {
      b.classList.toggle("active", i === current);
    });
  }

  function rotateBanners() {
    const banners = window.innerWidth <= 768 ? mobileBanners : desktopBanners;
    if (banners.length === 0) return;
    current = (current + 1) % banners.length;
    showBanner(banners);
  }

  setInterval(rotateBanners, 5000);
});
