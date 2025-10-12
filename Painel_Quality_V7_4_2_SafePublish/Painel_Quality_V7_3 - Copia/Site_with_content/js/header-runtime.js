// Header Runtime - apenas dedupe (não injeta nada)
(function () {
  function dedupe() {
    try {
      const hs = document.querySelectorAll("header");
      if (hs.length > 1) {
        for (let i = 1; i < hs.length; i++) hs[i].remove();
        console.log("🧹 Header duplicado removido");
      }
    } catch (e) { /* noop */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", dedupe);
  } else {
    dedupe();
  }
  setTimeout(dedupe, 200);
  setTimeout(dedupe, 800);
})();
