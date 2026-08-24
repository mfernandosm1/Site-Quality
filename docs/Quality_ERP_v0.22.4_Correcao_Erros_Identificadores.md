# Quality ERP v0.22.4 — Correção dos erros da padronização

## Correções

- Corrigido `Cannot access 'ref' before initialization` no Contas a Pagar.
- A função de formatação dos identificadores passa a ser inicializada antes da primeira renderização e dos eventos da tela.
- Corrigido `ref is not defined` na view do Caixa.
- Mantida a exibição simplificada dos identificadores, como `CP-11`, `COM-9` e `PG-8`.
- Nenhuma regra financeira, vínculo interno ou posição visual dos filtros foi alterada nesta correção.

## Arquivos alterados

- `public/js/contas-pagar.js`
- `views/caixa.ejs`

## Validação

- Sintaxe de `public/js/contas-pagar.js` validada com `node --check`.
