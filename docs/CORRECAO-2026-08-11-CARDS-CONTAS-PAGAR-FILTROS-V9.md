# Correção — Cards do Contas a Pagar acompanham filtros — 11/08/2026

## Problema
A listagem de Contas a Pagar recebia os filtros ativos (Todos, Hoje, Vencidos, Próximos 7 dias, Este mês, Próximo mês, Esta semana e filtros avançados), porém a API recalculava os cards chamando `dashboardSummary()` sem repassar esses filtros.

Resultado: a lista mudava, mas os valores dos cards permaneciam baseados no conjunto geral.

## Correção
A rota `GET /erp/financeiro/api/contas-a-pagar` agora envia os mesmos filtros da consulta para `dashboardSummary(filters)`.

Assim, listagem e cards usam o mesmo recorte de dados em cada atualização.

## Arquivos alterados
- `routes/erp.js`
- `Readme/CORRECAO-2026-08-11-CARDS-CONTAS-PAGAR-FILTROS-V9.md`

## Testes recomendados
1. Abrir Contas a Pagar.
2. Alternar entre Todos, Hoje, Vencidos, Próximos 7 dias, Este mês, Próximo mês e Esta semana.
3. Confirmar que a listagem e os cards são recalculados juntos.
4. Testar também período manual e fornecedor.
