// === Painel Quality JS ===

document.addEventListener("DOMContentLoaded", () => {
  console.log("Painel Quality Celulares carregado ✅");

  // Confirmações ao salvar
  const salvarBtns = document.querySelectorAll(".btn-salvar");
  salvarBtns.forEach(btn => {
    btn.addEventListener("click", e => {
      if (!confirm("Tem certeza que deseja salvar as alterações?")) {
        e.preventDefault();
      }
    });
  });

  // Feedback visual de sucesso
  const notice = document.querySelector(".notice");
  if (notice) {
    setTimeout(() => {
      notice.style.opacity = "0";
      setTimeout(() => notice.remove(), 500);
    }, 4000);
  }
});
