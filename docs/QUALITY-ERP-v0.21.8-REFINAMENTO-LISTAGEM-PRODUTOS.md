# Quality ERP v0.21.8 — Refinamento da Listagem ERP × Loja Virtual

## Ajustes realizados

- Filtros independentes para status ERP e Loja Virtual.
- Combinação livre dos filtros, incluindo ERP ativo + LV inativo.
- Contador dinâmico dos produtos visíveis após busca e filtros.
- Identificação visual de ERP inativo e LV inativo na listagem.
- Seleção em lote aplicada somente aos produtos marcados, com confirmação da quantidade.
- Botão de alterações pendentes esclarecido: ERP/LV salvam imediatamente; os demais campos continuam usando o salvamento pendente.
- Coluna LV refinada para melhor distribuição horizontal.
- Produtos ERP inativos continuam acessíveis na listagem e nos registros históricos.
- Produtos ERP inativos foram removidos das opções novas de Compras e Orçamentos.
- Operações e registros antigos continuam preservados para compatibilidade e auditoria.

## Testes recomendados

1. Filtrar ERP Ativo e LV Inativo e conferir o contador.
2. Selecionar apenas os resultados visíveis e aplicar uma ação em lote.
3. Inativar um produto no ERP e confirmar que ele some das buscas de produto em Compras.
4. Confirmar que o mesmo produto não aparece para inclusão em um novo Orçamento.
5. Voltar à listagem de produtos, selecionar ERP Inativo e confirmar que o produto permanece acessível.
6. Alterar apenas ERP ou LV e confirmar o salvamento imediato.
7. Alterar nome ou categoria e confirmar que o botão de alterações pendentes salva normalmente.
