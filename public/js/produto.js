// Função auxiliar para pegar parâmetros da URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

document.addEventListener("DOMContentLoaded", () => {
  const productId = getQueryParam("id");
  if (!productId) {
    document.getElementById("produto-detalhe").innerHTML = `
      <p style="text-align:center; margin:40px;">Produto não encontrado.</p>
    `;
    return;
  }

  fetch("data/products.json")
    .then(res => res.json())
    .then(products => {
      const produto = products.find(p => String(p.id) === productId);
      if (!produto) {
        document.getElementById("produto-detalhe").innerHTML = `
          <p style="text-align:center; margin:40px;">Produto não encontrado.</p>
        `;
        return;
      }

      renderProduto(produto);
    })
    .catch(err => {
      console.error("Erro ao carregar produto:", err);
      document.getElementById("produto-detalhe").innerHTML = `
        <p style="text-align:center; margin:40px;">Erro ao carregar produto.</p>
      `;
    });
});

function renderProduto(produto) {
  const container = document.getElementById("produto-detalhe");

  // Galeria de imagens com Swiper
  const imagensHTML = (produto.imagens || [])
    .map(img => `
      <div class="swiper-slide">
        <img src="${img}" alt="${produto.nome}" style="max-width:100%; border-radius:10px;" />
      </div>
    `)
    .join("");

  container.innerHTML = `
    <h1 style="text-align:center; margin-bottom:20px;">${produto.nome}</h1>
    <div class="produto-container" style="display:grid; grid-template-columns: 1fr 1fr; gap:30px; align-items:start;">
      
      <!-- Galeria -->
      <div class="swiper produto-swiper">
        <div class="swiper-wrapper">
          ${imagensHTML}
        </div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
      </div>

      <!-- Informações -->
      <div class="produto-info">
        <p style="font-size:18px; line-height:1.6; margin-bottom:20px;">
          ${produto.descricao || ""}
        </p>
        <p style="font-size:22px; font-weight:bold; margin-bottom:20px; color:#c90000;">
          ${produto.preco || "Sob consulta"}
        </p>
        <a href="https://wa.me/5555991407824?text=Olá,%20tenho%20interesse%20no%20${encodeURIComponent(produto.nome)}"
           class="btn-whatsapp" target="_blank">
          <i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp
        </a>
      </div>
    </div>
  `;

  // Inicia Swiper da galeria
  new Swiper(".produto-swiper", {
    loop: true,
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}
