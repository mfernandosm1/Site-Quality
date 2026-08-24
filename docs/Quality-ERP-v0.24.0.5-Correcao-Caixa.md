# Quality ERP v0.24.0.5 — Correção de regressão do Caixa

## Correção realizada

- A rota `GET /erp/pdv/caixa` volta a fornecer `dailySummary` para `views/caixa.ejs`.
- Mantidos os cards de Saldo atual, Recebido hoje, Recebido no turno, Saídas hoje e Estornos hoje.
- Incluído fallback seguro para bases em que o serviço ainda não exponha `getCashboxDailySummary`, evitando a quebra completa da tela.
- Nenhuma alteração realizada no fluxo de impressão nesta correção.

## Validação

- Sintaxe de `routes/erp.js` validada com `node --check`.
