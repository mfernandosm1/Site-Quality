# Quality ERP — v0.10.12 — DRE por competência + saldo do Fluxo de Caixa

Data: 16/08/2026

## DRE Inteligente

- Corrigido o regime de **Competência** para considerar as despesas de Contas a Pagar independentemente do status de pagamento.
- Parcelas **pagas, parciais e em aberto** passam a compor o DRE pela competência do título/parcela.
- Para bases antigas em que `payable-installments.json` repetiu a mesma competência em todas as parcelas, o DRE usa primeiro a lista `payables.competencies` associada à ordem da parcela, preservando a distribuição mensal correta.
- Pagamentos de contas a pagar (`payable_payment`) deixam de ser somados novamente no regime de competência, evitando duplicidade entre o compromisso e sua quitação.
- Contas classificadas como **CMV** não são somadas novamente pelas parcelas de Contas a Pagar, pois o CMV já é apurado pelos itens efetivamente vendidos.
- Regime de caixa continua baseado em movimentações realizadas.

## Fluxo de Caixa Inteligente

- Estornos continuam visíveis na linha do tempo para auditoria, mas não são tratados como entrada e não alteram o saldo exibido.
- O saldo do período passa a fechar diretamente com os cards:
  - `Saldo do período = Entradas realizadas - Saídas realizadas`
- O saldo anterior também ignora eventos de estorno, evitando carregar diferença artificial para períodos posteriores.
- O saldo acumulado exibido em cada movimento não muda ao passar por uma linha de estorno.

## Validação com a base entregue

Período 01/08/2026 a 31/08/2026:

- Entradas realizadas: **R$ 16.844,79**
- Saídas realizadas: **R$ 10.650,90**
- Saldo do período: **R$ 6.193,89**

DRE em competência:

- Passou a considerar também compromissos ainda não pagos.
- Despesas após CMV encontradas na base atual: **R$ 16.696,51**, em 22 lançamentos/parcelas de competência, antes dos demais filtros do usuário.

## Arquivos alterados

- `services/cash-flow-service.js`
- `services/dre-service.js`
- `docs/CHANGELOG-v0.10.12-DRE-FLUXO-CAIXA.md`
