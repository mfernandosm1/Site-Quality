# Quality ERP v0.21.4 — Refinamento da Grade Financeira e Origem Compra

## Objetivo

Refinar a Central Financeira do Contas a Pagar após a validação da quebra e junção de parcelas, reduzindo espaços e protegendo o ciclo financeiro das compras.

## Ajustes visuais

- Grade financeira mais compacta no zoom normal de 100%.
- Redução da largura reservada à coluna Parcela.
- Menor distância entre Parcela e Valor.
- Linhas, campos, cabeçalho e espaçamentos verticais reduzidos.
- Modal amplo preservado, com melhor aproveitamento da área útil.
- Responsividade mantida para telas menores.

## Regra para contas originadas por compra

Contas geradas por compra manual ou por importação de XML não exibem mais a ação **Estornar conta** no Contas a Pagar.

Essas contas apresentam:

- aviso de que o financeiro foi gerado pela compra;
- orientação para estornar a compra completa;
- botão **Ir para Compras**.

A remoção do compromisso financeiro deve ocorrer pelo estorno da compra, preservando a consistência entre:

- compra;
- estoque;
- Contas a Pagar;
- Caixa;
- Fluxo de Caixa;
- DRE;
- DFC;
- histórico e auditoria.

Contas manuais continuam permitindo estorno pelo Contas a Pagar.

## Arquivos alterados

- `public/js/contas-pagar.js`
- `public/css/painel.css`
