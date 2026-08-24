# Quality ERP — Contagem e Ajuste de Estoque v0.27.3

## Ajustes desta entrega

- Estoque atual passa a aparecer assim que um produto entra na contagem, facilitando identificar divergências já durante a conferência física.
- Pesquisa tolerante melhorada: buscas parciais como `1620` e `bateria 1620` encontram `Bateria CR1620`; também continua ignorando acentos e caixa.
- Pesquisa da tela de estoque passou a considerar nome, código, SKU, EAN/código de barras, referência, marca, modelo, categoria e subcategoria.
- A pesquisa da tela de estoque recebeu debounce de 220 ms para evitar o efeito de piscar/recalcular a cada tecla.
- Otimização de abertura do Estoque: saldos são lidos em lote, evitando reler o arquivo de estoque produto por produto.
- A reconciliação de compras deixou de rodar automaticamente apenas por abrir a tela de Estoque; consulta de tela não deve executar manutenção pesada.
- Catálogo de contagem e criação de Contagem Total também usam leitura de saldos em lote.
- Correção do retorno à tela de contagens pelo navegador (bfcache): o botão `Iniciar contagem` é reabilitado ao voltar, evitando travamento ao criar outra contagem sem F5.
- Produtos para contagem continuam carregados sob demanda e paginados, mantendo 50 por página como padrão.

## Regra de estoque exibido durante a contagem

Ao inserir o produto, o Quality registra o saldo físico existente naquele momento (`systemQuantityAtCount`). Esse saldo é mostrado ao lado da quantidade contada. Na conferência final, o sistema usa o saldo vigente e considera movimentações ocorridas depois da contagem do item, preservando a lógica de loja em operação.

## Busca

A busca trabalha por tokens. Para termos com 3 ou mais caracteres, também permite ocorrência dentro de uma palavra/código. Exemplo: `1620` encontra `CR1620`. Termos curtos continuam mais restritivos para reduzir resultados excessivos.

## Arquivos alterados

- `routes/erp.js`
- `services/purchase-service.js`
- `services/stock-count-service.js`
- `utils/search.js`
- `public/js/search-utils.js`
- `public/js/estoque.js`
- `public/js/estoque-contagem.js`
- `public/js/estoque-contagens.js`
- `views/estoque_contagem.ejs`
