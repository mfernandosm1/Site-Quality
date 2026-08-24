# Quality ERP — Correção definitiva dos cards do Contas a Pagar — V10
Data: 11/08/2026

## Problemas encontrados
1. O resumo recebia títulos inteiros. Se uma conta de R$ 33 mil possuía apenas uma parcela de R$ 1.950 no mês, o card podia considerar o saldo total da conta.
2. O card de pagos dependia da listagem ativa, excluindo contas totalmente quitadas e podendo aparecer zerado.
3. A API assíncrona da tela precisava repassar os mesmos filtros ao resumo.
4. O card "Em aberto" exibia quantidade de contas, embora o cálculo correto por período seja por parcelas.

## Regra corrigida
Os cards financeiros agora usam a unidade correta:
- Em aberto: parcelas abertas dentro do período.
- Vencem hoje: parcelas abertas com vencimento hoje e dentro do recorte.
- Vencidos: parcelas abertas vencidas dentro do recorte.
- Pagos no período: pagamentos efetivamente realizados pela data de pagamento.
- Esta semana / Próxima semana / Próximos 30 dias: parcelas abertas dentro das respectivas janelas, respeitando também o filtro ativo.

Filtros de fornecedor, centro de custo, plano de contas, forma prevista, tipo e pesquisa continuam sendo respeitados.

## Validação com a base enviada
Na base PAOZ enviada em 11/08/2026:
- Este mês: 14 parcelas abertas = R$ 8.120,79
- Pagos em agosto: 7 pagamentos = R$ 7.466,97
- Próximos 30 dias: 19 parcelas = R$ 15.012,10

Esses números são calculados diretamente pelos registros de parcelas/pagamentos do ZIP.

## Ajuste visual/semântico
- "Em aberto" passa a indicar quantidade de parcelas.
- "Pagos no mês" foi renomeado para "Pagos no período", pois acompanha o filtro rápido/período selecionado.

## Arquivos alterados
- services/payables-service.js
- routes/erp.js
- views/contas_pagar.ejs
- public/js/contas-pagar.js
- Readme/CORRECAO-2026-08-11-CARDS-CONTAS-PAGAR-PARCELAS-V10.md
