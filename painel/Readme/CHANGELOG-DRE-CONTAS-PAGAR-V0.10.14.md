# Quality ERP — v0.10.14 — DRE e Contas a Pagar

## Correção do Total do período em Contas a Pagar

O card **Total do período** passa a representar a regra operacional usada no painel:

- parcelas **pagas dentro do período selecionado**, inclusive pagamentos antecipados;
- mais parcelas **ainda em aberto com vencimento dentro do período**;
- uma mesma parcela nunca é contada duas vezes.

Na base de teste de agosto/2026 o fechamento validado é:

- Pagos no período: **R$ 10.427,34**;
- Em aberto no período: **R$ 9.371,35**;
- Total do período: **R$ 19.798,69**.

A implementação usa `installmentId` para consolidar os valores e evitar duplicidade em pagamentos parciais.

## Correção do DRE

A versão anterior excluía por regra fixa toda a conta **Empréstimos e financiamentos**, o que alterava artificialmente o resultado gerencial. Essa exceção foi removida. O DRE volta a respeitar a classificação financeira configurada no Plano de Contas.

Para Contas a Pagar no regime de competência gerencial do Quality ERP:

- valor pago é reconhecido na data do pagamento;
- saldo ainda aberto é reconhecido no vencimento;
- pagamento parcial é dividido entre a parte paga e o saldo ainda aberto;
- compras/parcelas classificadas como **CMV** não são somadas novamente em Despesas, pois o CMV já é calculado pelos produtos efetivamente vendidos;
- contas de compra sem classificação antiga também são identificadas pela origem `purchase` e não caem indevidamente em Outras Despesas.

Com a base fornecida para agosto/2026, a validação do serviço resultou em:

- Receitas: **R$ 16.844,79**
- CMV: **R$ 4.757,05**
- Despesas após CMV: **R$ 17.901,13**
- Resultado líquido: **- R$ 5.813,39**

Esses valores deixam de esconder parcelas financeiras por uma regra fixa e evitam duplicar compras no DRE.

## Arquivos alterados

- `services/dre-service.js`
- `services/payables-service.js`
- `views/contas_pagar.ejs`
