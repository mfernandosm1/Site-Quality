# Quality ERP v0.22.5 — Correções pós-padronização

## Ajustes

- Restaurada a listagem de Compras após corrigir a inicialização do formatador de referências.
- Contas a Receber passam a exibir `CR-1`, `CR-2` e assim por diante, sem alterar os identificadores internos.
- O Caixa passa a exibir `Estorno` no lugar do tipo técnico `payment_reversal`.
- Mantidos os prefixos de rastreabilidade e os vínculos internos do ERP.

## Arquivos alterados

- `views/compras.ejs`
- `views/contas_receber.ejs`
- `views/caixa.ejs`
- `public/js/contas-receber.js`
