# Quality ERP v0.21.0 — Central Financeira: estornos rastreáveis

## Escopo entregue

- Estorno individual de pagamentos em Contas a Pagar.
- Pagamentos integrais ou parciais podem ser estornados separadamente.
- A parcela retorna automaticamente para `Em aberto` ou `Parcial`.
- A conta retorna automaticamente para `Em aberto` ou `Parcial`.
- O pagamento original não é excluído: permanece no histórico como `Estornado`.
- O estorno gera LOG com operador, data, valor e motivo.
- O Caixa recebe uma movimentação inversa vinculada ao pagamento original.
- Os lançamentos do Financeiro, Fluxo, DRE e DFC vinculados ao pagamento são marcados como estornados e deixam de compor os totalizadores ativos.
- Contas manuais podem ser estornadas mesmo após pagamentos, revertendo antes todos os pagamentos ativos.
- Contas originadas por Compra não podem ser estornadas integralmente pelo Contas a Pagar. O sistema orienta a estornar a Compra completa no módulo Compras.

## Regras de segurança

1. Nenhum pagamento é apagado fisicamente.
2. Um pagamento já estornado não pode ser estornado novamente.
3. O Caixa selecionado precisa estar aberto para realizar a movimentação inversa.
4. O estorno integral de conta manual reverte todos os pagamentos ativos antes de inativar a conta.
5. O financeiro de uma compra somente pode ser removido pelo estorno integral da compra, preservando coerência com estoque e custos.

## Testes rápidos recomendados

1. Abrir uma conta parcialmente paga e estornar somente um pagamento.
2. Conferir se saldo da parcela e saldo da conta aumentaram corretamente.
3. Conferir se o pagamento permanece visível como `Estornado`.
4. Conferir Caixa, Fluxo, DRE e DFC após o estorno.
5. Pagar integralmente uma conta manual e depois usar `Estornar conta e pagamentos`.
6. Abrir uma conta originada por Compra e confirmar que o estorno integral é bloqueado.
