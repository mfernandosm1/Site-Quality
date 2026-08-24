# Quality ERP — Parâmetros separados de Venda e Compras por Forma de Pagamento — V17
Data: 12/08/2026

## Regra nova
A mesma Forma de Pagamento passa a ter comportamento independente conforme o contexto.

Exemplo:
- Cartão de crédito no PDV: **Pago na venda = Sim**
- Cartão de crédito em Compras / Contas a Pagar: **Pago na compra / despesa = Não**

## Parâmetros para vendas e recebimentos
`Pago na venda` controla Venda/PDV e o comportamento de recebimento.
Parcelamento, taxas, prazo, juros, troco e geração de Contas a Receber continuam no bloco de vendas.

## Parâmetros para compras e Contas a Pagar
`Pago na compra / despesa` controla a baixa automática de Compras e lançamentos manuais do Contas a Pagar.

- Sim: a conta é baixada automaticamente pelo fluxo normal de pagamento e Caixa.
- Não: a conta permanece em aberto até o operador realizar a baixa.

A data de vencimento deixa de ser usada para adivinhar se a forma deve ser paga.

## Migração e compatibilidade
`autoSettle` permanece internamente apenas como compatibilidade de `Pago na venda`.

Na primeira inicialização:
- `salesPaid` herda o antigo `autoSettle`.
- `purchasePaid` só herda Sim quando a forma já era automática, habilitada em Compras e não parcelável.
- Assim, Dinheiro/PIX imediatos continuam práticos, enquanto cartões não viram despesas quitadas automaticamente.

A CP-000034 recuperada na V16 continua preservada em aberto.

## Arquivos alterados
- services/finance-service.js
- services/receivables-service.js
- services/payables-service.js
- public/js/receivables-service.js
- public/js/financeiro-fundacao.js
- views/configuracoes_financeiro.ejs
- Readme/CORRECAO-2026-08-12-PARAMETROS-VENDA-COMPRAS-FORMA-PAGAMENTO-V17.md
