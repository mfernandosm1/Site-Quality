# Correção — vencimento de contas a pagar

## Problema
Ao cadastrar uma nova conta a pagar e informar uma data de vencimento no Plano de Pagamento, a parcela podia ser salva com a data do dia do cadastro em vez do vencimento escolhido pelo usuário.

## Causa
Na geração das parcelas, a rotina usava o helper `dateOnly()` para verificar uma data de vencimento personalizada. Esse helper possui fallback automático para a data atual. Quando não existia uma data individual em `installmentDueDates`, o fallback retornava o dia atual e impedia o sistema de utilizar `firstDueDate` do plano de pagamento.

## Correção
A geração das parcelas agora verifica primeiro se existe uma data individual realmente preenchida. Quando não existe, o vencimento é calculado corretamente a partir de `firstDueDate`, avançando mês a mês conforme a parcela.

## Resultado esperado
- 1 parcela com primeiro vencimento em 23/09/2026 → vencimento salvo em 23/09/2026.
- Parcelamentos usam o primeiro vencimento escolhido como base.
- Parcelas seguintes avançam mês a mês.
- A data de emissão/cadastro não substitui mais indevidamente o vencimento informado.
