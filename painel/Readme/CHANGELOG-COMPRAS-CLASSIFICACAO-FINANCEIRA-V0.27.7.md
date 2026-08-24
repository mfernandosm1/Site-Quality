# Compras — Classificação financeira única · v0.27.7

- Unificados **Centro de custo** e **Plano de contas** em um único campo: **Classificação financeira**.
- As opções exibem `Centro de custo › Plano de contas`, mantendo o contexto financeiro completo em uma única escolha.
- Ao selecionar a classificação, o **Centro de custo é derivado automaticamente do Plano de contas** no servidor.
- A compra continua gravando `accountId` e `costCenterId` internamente para preservar compatibilidade com Contas a Pagar, DRE e Fluxo de Caixa.
- **Caixa previsto** permanece separado, pois representa o destino/origem financeira do pagamento e não a classificação da despesa.
- Compras antigas continuam compatíveis: ao editar, o campo é preenchido pelo `accountId` já salvo.
