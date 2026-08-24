# Quality ERP v0.23.6.6 — Ajustes de recebimentos

## Alterações

- Corrigido o estorno de recebimentos antigos que não possuíam `cashboxId` gravado.
- O estorno agora utiliza o caixa aberto localizado para o operador e preserva essa referência no recebimento.
- Mantidos motivo, usuário, data, movimento inverso e histórico sem exclusão de registros.
- Refinados os dados do cliente no cabeçalho da ficha.
- Corrigidos os ícones de impressão e WhatsApp com SVG visível nos modos Black OLED e Claro.
- Removidos zeros à esquerda apenas na apresentação de títulos, recebimentos e comprovantes.
- IDs e estruturas persistidas permanecem inalterados para compatibilidade com os dados atuais.

## Arquivos alterados

- `services/receivables-service.js`
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`
- `views/caixa.ejs`
