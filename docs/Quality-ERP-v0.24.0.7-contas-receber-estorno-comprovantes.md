# Quality ERP v0.24.0.7 — Contas a Receber: estorno e comprovantes

## Correções

- Títulos ligados a operações canceladas ou estornadas não podem permanecer ou voltar para `Em aberto`.
- Ao estornar manualmente um recebimento de uma operação já estornada, o título e suas parcelas permanecem cancelados e com saldo aberto zerado.
- A reconciliação usa a base bruta de títulos e também é executada ao abrir o detalhe do título.
- Os botões de comprovante foram substituídos por ações compactas e legíveis: `Imprimir` e `WhatsApp`.
- Ajuste visual compatível com os temas Claro e Black OLED.

## Arquivos alterados

- `services/receivables-service.js`
- `routes/erp.js`
- `public/js/contas-receber.js`
- `public/css/erp.css`
