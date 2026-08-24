# Quality ERP — Correção definitiva de estoque em serviços no PDV/O.S.

## Problema
Serviços cadastrados em uma Categoria ERP do tipo `service` ainda podiam carregar a marcação antiga `stockControlled=true` no cadastro ou no rascunho da operação. Por isso, a finalização da O.S. continuava exibindo “Estoque insuficiente”.

## Correção
- A Categoria ERP atual passou a ser a fonte de verdade no carregamento do PDV e na finalização.
- Itens vinculados a categoria do tipo Serviço nunca são tratados como estoque controlado.
- Serviços não consultam saldo e não geram movimentação de saída.
- Produtos comuns e controlados continuam respeitando estoque e permissão de saldo negativo.
- O ajuste também corrige O.S. abertas antes da conversão do item para Serviço.

## Arquivo alterado
- `routes/erp.js`

## Teste recomendado
1. Reiniciar o servidor.
2. Abrir novamente a O.S.
3. Confirmar que “Limpeza de Vírus Sistema Android” está em Categoria ERP do tipo Serviço.
4. Finalizar a O.S.
5. Confirmar que não houve baixa no estoque.
