# Zoom da galeria de produto — Quality V8.4.1

## Objetivo
Melhorar a visualização das fotos dos produtos sem alterar a estrutura do catálogo ou o `products.json`.

## Comportamento

### Computador
- O zoom é ativado ao passar o mouse sobre a imagem principal.
- Uma lente acompanha o cursor.
- A ampliação aparece sobre a coluna de informações do produto.
- O recurso só é ativado em dispositivos com mouse de precisão e tela acima de 900 px.
- Vídeos do YouTube não recebem zoom.

### Celular e tablet
- Um toque na imagem abre o visualizador em tela cheia.
- O usuário pode ampliar com gesto de pinça.
- Quando ampliada, a foto pode ser arrastada.
- Sem ampliação, o gesto horizontal troca a foto.
- Também existem botões anterior, próximo e fechar.
- A rolagem da página fica bloqueada enquanto o visualizador está aberto.

## Arquivo alterado
- `Site_with_content/produto.html`

## Arquivos preservados
- `js/main.js` não foi alterado.
- `css/style.css` não foi alterado.
- `painel/utils/main_utils.js` não foi alterado, pois ele já usa `produto.html` como template para gerar as URLs amigáveis.

## Instalação
1. Faça backup de `C:\Site\Site_with_content\produto.html`.
2. Substitua o arquivo pelo incluído neste pacote.
3. Use no painel a ação normal que gera/publica as páginas do site. Isso recriará `/produto/<slug>/index.html` usando o template atualizado.
4. Teste no localhost antes de publicar.

## Testes obrigatórios
- Desktop: passar o mouse pelas bordas e centro da foto.
- Desktop: trocar miniaturas e verificar se o zoom acompanha a nova imagem.
- Desktop: selecionar uma variação com imagem própria.
- Mobile: abrir, fechar, trocar fotos, ampliar com pinça e arrastar.
- Mobile: confirmar que a página não rola por trás do visualizador.
- Produto com vídeo: confirmar que o vídeo continua funcionando e não abre o zoom.

## Reversão
Restaure o backup de `produto.html` e gere/publice novamente as páginas.

## Observação para o histórico no Google
**Quality V8.4.1 — Zoom premium na galeria de produtos:** adicionado zoom por hover no computador, com lente e painel ampliado, e visualizador em tela cheia no mobile com pinça, arraste e navegação entre fotos. Implementação isolada em `produto.html`, sem alterações em `main.js`, `style.css`, `main_utils.js` ou na estrutura do catálogo.
