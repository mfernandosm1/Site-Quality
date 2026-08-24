# v0.10.15 — Contas a Pagar: total e classificação financeira

## Ajustes
- Corrigido **Total exibido** na visão **Ativas + Pagas** para usar a mesma regra do card **Total do período**.
- A visão combinada considera pagamentos efetuados no período (inclusive antecipados) + parcelas ainda abertas com vencimento no período.
- A mesma parcela é contabilizada apenas uma vez em casos de pagamento parcial.
- Contas com pagamento antecipado passam a permanecer na consulta combinada mesmo quando o vencimento está fora do mês.
- Unificados os filtros **Centro de custo** e **Plano de contas** em **Classificação financeira**.
- O seletor exibe `Centro de custo › Plano de contas`, mantendo a classificação completa em um único campo.
- Reorganizado o grid dos filtros avançados para melhor alinhamento e uso do espaço.
