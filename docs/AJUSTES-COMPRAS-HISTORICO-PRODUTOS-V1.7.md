# Ajustes — Compras em centavos, histórico de produtos e limpeza da homologação

## 1. Compras com valores abaixo de R$ 1,00
O editor de itens da Compra não reconstrói mais toda a linha a cada tecla digitada. Isso permite informar normalmente custos como `0,01`, `0,10` e `0,50`, inclusive usando vírgula no padrão brasileiro. O total da linha e o total da compra continuam sendo recalculados em tempo real.

## 2. Histórico do produto
Foi adicionado o botão **Histórico** na listagem de Produtos. A visão consolida:
- alterações cadastrais futuras salvas pelo cadastro de Produtos;
- movimentações de estoque do produto e de cada variação;
- compras vinculadas;
- vendas/estornos vinculados no PDV.

O histórico cadastral novo é persistido em `data/erp/products/product-history.json` quando surgirem eventos. O arquivo não precisa existir previamente.

## 3. Limpeza da homologação solicitada
Foram removidos do snapshot enviado os registros de teste mostrados na conversa:
- Venda #5 e seu estorno;
- Compra COM-000009 / CP-000031 e integrações financeiras/caixa correspondentes;
- movimentações manuais de estoque feitas durante a homologação das duas variações do iPhone 14.

As duas variações voltam a saldo zero no snapshot. Numeração/counters não foram retrocedidos para preservar a integridade de sequências já utilizadas.

## Teste recomendado
1. Nova compra com um item a `R$ 0,01` e outro a `R$ 0,10`.
2. Finalizar e conferir estoque/caixa.
3. Abrir Produtos > Histórico no produto e verificar compra e movimentos.
4. Fazer uma edição no nome/marca e salvar; o evento deve aparecer no Histórico.
