# Correção — duplicação de produtos e identidade de estoque

## Problema
Ao duplicar um produto, a cópia herdava chaves técnicas do cadastro original, principalmente `erp.internalCode`, `inventory.itemId` e, quando existiam, `inventoryItemId` das variações. Como a contagem de estoque usa `inventoryItemId` como identidade física, produtos diferentes acabavam sendo tratados como o mesmo item na contagem.

## Ajustes
- Produto duplicado recebe um novo código interno `PRD-n` imediatamente.
- Produto duplicado recebe um novo `inventory.itemId` próprio.
- Variações duplicadas recebem novos `inventoryItemId` próprios.
- O novo produto físico inicia com estoque zero; o saldo e o histórico do original não são copiados.
- Dados cadastrais e comerciais continuam sendo copiados normalmente.
- Corrigida a rotina de saneamento de códigos internos para realmente detectar códigos `PRD-n` repetidos.
- Incluída rotina de reparo de identidades de estoque repetidas. O primeiro cadastro mantém a identidade/saldo histórico; cópias posteriores recebem identidade nova e saldo zero.
- Antes de persistir qualquer saneamento automático, o fluxo existente de backup do `products.json` é mantido.

## Resultado esperado
Após instalar o ajuste e abrir a tela de Produtos, cadastros antigos criados por duplicação com código/identidade repetidos são saneados. Na Contagem de Estoque, cada produto passa a aparecer e ser contado de forma independente.
