# Quality ERP v0.21.6 — Central Financeira compacta

## Objetivo
Refinar a Central Financeira do Contas a Pagar para aproveitar melhor a largura da janela em zoom de 100%, eliminar sobreposição do resumo e aproximar a organização visual aprovada.

## Alterações
- Removida a fixação do resumo que sobrepunha a grade durante a rolagem.
- Janela ampla com rolagem vertical somente no conteúdo interno.
- Grade horizontal compactada sem ocultar a coluna Situação.
- Parcela, seleção e ação de quebra organizadas no mesmo bloco à esquerda.
- Campos de valor, vencimento, forma, caixa e observação reduzidos e alinhados.
- Linhas de parcelas com menor altura.
- Legenda compacta adicionada ao rodapé da grade.
- Rolagem horizontal mantida apenas para telas realmente estreitas.
- Modo claro e Black OLED preservados.

## Regras preservadas
- Quebrar parcela.
- Atualizar parcela.
- Juntar parcelas selecionadas.
- Pagar e desfazer pagamentos.
- Contas originadas de Compra não podem ser estornadas pelo Contas a Pagar.
- Para remover o financeiro de uma compra, deve-se estornar a compra no módulo Compras.

## Arquivos alterados
- `public/js/contas-pagar.js`
- `public/css/painel.css`

## Testes recomendados
1. Abrir conta com uma parcela no zoom de 100%.
2. Abrir conta com quatro ou mais parcelas.
3. Conferir todas as colunas, inclusive Situação, sem corte lateral.
4. Quebrar, atualizar e juntar parcelas.
5. Testar modo claro e Black OLED.
6. Abrir uma conta originada de Compra e confirmar a ausência do estorno financeiro direto.
