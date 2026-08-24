# Correção crítica — Finalização de contagem total v0.27.3

## Objetivo
Corrigir travamento ao concluir inventários grandes sem apagar ou recriar a contagem existente.

## Alterações
- `services/stock-count-service.js`
  - Indexa as movimentações por item antes da conferência, evitando varrer todo o histórico para cada produto.
  - Mantém backup pré-conclusão da contagem.
- `services/inventory-service.js`
  - Indexa os saldos em memória durante ajuste em lote.
  - Calcula a sequência de IDs de movimentação uma única vez, em vez de revarrer o histórico a cada ajuste.
  - Continua gravando estoque e movimentos uma única vez ao final do lote.
- `routes/erp.js`
  - Indexa produtos e variações por `inventoryItemId`/`productId`, evitando milhares de buscas repetidas.
  - Adiciona rollback transacional de `stock.json`, `movements.json`, `products.json` e `counts.json` se qualquer etapa falhar.
  - Adiciona logs no terminal com prefixo `[StockCount CNT-...]` para mostrar exatamente em que etapa a conclusão está.

## Segurança
A instalação não modifica `counts.json`, `stock.json`, `movements.json` nem `products.json`. Apenas substitui código. A contagem atual deve ser aberta e concluída normalmente depois de reiniciar o servidor.

## Validação feita
- `node --check` nos três arquivos alterados.
- Conferência da contagem `CNT-20260815-0001` do pacote fornecido executada em aproximadamente 11 ms no ambiente de teste, com 627 itens contados e 188 não contados.

## Após instalar
1. Pare o servidor.
2. Substitua os três arquivos mantendo as pastas.
3. Inicie com `npm start`.
4. Abra a mesma contagem.
5. Clique em concluir uma única vez.
6. Observe o terminal: deverão aparecer linhas `[StockCount CNT-20260815-0001] ...`.
