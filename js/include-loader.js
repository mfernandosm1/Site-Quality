
// include-loader.js
document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("header");
  const footer = document.getElementById("footer");
  if (header) fetch("header.html").then(r => r.text()).then(d => header.innerHTML = d);
  if (footer) fetch("footer.html").then(r => r.text()).then(d => footer.innerHTML = d);
});
