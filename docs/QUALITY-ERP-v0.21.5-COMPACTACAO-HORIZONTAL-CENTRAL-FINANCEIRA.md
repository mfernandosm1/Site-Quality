# Quality ERP v0.21.5 — Compactação horizontal da Central Financeira

## Objetivo

Eliminar cortes laterais e reduzir a necessidade de rolagem horizontal na janela da Central Financeira do Contas a Pagar, mantendo todas as ações disponíveis na mesma linha.

## Ajustes realizados

- redução das larguras das colunas Parcela, Valor, Vencimento, Forma, Caixa, Observação e Situação;
- redução dos espaçamentos entre colunas;
- campos, selects, textos e botões ligeiramente mais compactos;
- melhor aproveitamento da coluna Observação;
- prevenção de estouro horizontal dentro da janela em telas desktop e notebooks;
- rolagem horizontal mantida apenas em larguras realmente pequenas;
- preservação das ações de quebrar, atualizar, juntar, pagar e consultar movimentações.

## Arquivo alterado

- `public/css/painel.css`

## Testes recomendados

1. Abrir uma conta manual com quatro ou mais parcelas em zoom de 100%.
2. Confirmar que a coluna Situação aparece inteira sem corte lateral.
3. Testar conta originada de Compra.
4. Alternar entre modo claro e Black OLED.
5. Testar em resoluções próximas de 1366×768 e 1920×1080.
6. Confirmar que quebrar, juntar, atualizar e pagar continuam funcionando.
