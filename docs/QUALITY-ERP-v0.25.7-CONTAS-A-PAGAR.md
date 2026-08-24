# Quality ERP v0.25.7 — Períodos e Classificação do Contas a Pagar

Data: 02/08/2026

## Objetivo

Refinar os cards de vencimento e a classificação financeira do Contas a Pagar, preservando as integrações existentes com Compras, Caixa, Fluxo de Caixa, DRE e DFC.

## Ajustes realizados

### Cards por período

- O card **Contas desta semana** considera os compromissos dos próximos 7 dias.
- O card **Contas da próxima semana** considera os compromissos entre 8 e 14 dias a partir da data atual.
- O card **Próximos 30 dias** continua considerando os próximos 30 dias.
- O cálculo usa as parcelas individuais com saldo em aberto, e não apenas a data geral da conta.
- A parcela da CP-12 com vencimento em 10/08/2026 passa a aparecer no card **Contas da próxima semana** quando a referência é 02/08/2026.

### Filtro rápido

- O filtro pouco útil **Futuras** foi substituído por **Esta semana**.
- O novo filtro considera vencimentos entre hoje e os próximos 7 dias.

### Centro de custo e Plano de contas

- O Contas a Pagar agora recebe somente Centros de custo e Planos de contas de natureza **despesa**.
- Itens de receita, ocultos ou gerenciados internamente não aparecem mais nos seletores do módulo.
- Foi adicionada pesquisa por texto nos seletores de Centro de custo e Plano de contas.
- O Plano de contas é filtrado de acordo com o Centro de custo selecionado.
- A validação no serviço impede salvar combinações inválidas ou classificações de receita em uma conta a pagar.

## Arquivos alterados

- `routes/erp.js`
- `services/payables-service.js`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Validações executadas

- Sintaxe de `routes/erp.js` validada com `node --check`.
- Sintaxe de `services/payables-service.js` validada com `node --check`.
- Sintaxe de `public/js/contas-pagar.js` validada com `node --check`.
- Resumo financeiro testado com referência em 02/08/2026:
  - próxima semana: 1 parcela;
  - valor: R$ 1.510,09;
  - período: 10/08/2026 a 16/08/2026.

## Testes recomendados no painel

1. Abrir o Contas a Pagar e confirmar que a CP-12 aparece em **Contas da próxima semana**.
2. Clicar em **Esta semana** e confirmar a aplicação do filtro.
3. Abrir a CP-12, editar a classificação e pesquisar por parte do nome de um Centro de custo.
4. Selecionar um Centro de custo e confirmar que o Plano de contas mostra somente opções vinculadas a ele.
5. Confirmar que **Receitas** não aparece em nenhum seletor do Contas a Pagar.
