// Função para ler parâmetros da URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

document.addEventListener("DOMContentLoaded", () => {
  const categoria = getQueryParam("tipo");
  if (!categoria) {
    document.getElementById("categoria-titulo").innerText = "Categoria não encontrada";
    return;
  }

  // Define o título dinamicamente (primeira letra maiúscula)
  const titulo = categoria.charAt(0).toUpperCase() + categoria.slice(1);
  document.getElementById("categoria-titulo").innerText = titulo;

  // Carregar os produtos dessa categoria
  loadProducts(categoria, "products-categoria", "no-results-categoria");
});
