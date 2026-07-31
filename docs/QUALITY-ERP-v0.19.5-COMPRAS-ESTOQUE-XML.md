# Quality ERP v0.19.5 — Compras, Estoque e Conferência de XML

## Objetivo

Correção incremental das integrações de Compras com Estoque e refinamento da conferência de XML, preservando os dados existentes, o Black OLED e o modo claro.

## Ajustes implementados

### Estoque

- O módulo Estoque volta a listar todos os produtos ativos, inclusive os que ainda estão com o controle desativado.
- Produtos sem controle recebem identificação visual e atalho para ativação no Cadastro Mestre.
- Produtos controlados continuam permitindo entrada, saída e ajuste.
- Movimentações manuais passam a reconhecer também o `inventoryItemId` de combinações de variação.
- Compras concluídas antigas que ficaram sem movimentação são reconciliadas de forma idempotente: o sistema verifica movimentações existentes antes de criar qualquer entrada.
- Produtos usados em compras passam a ter o controle de estoque ativado automaticamente, com identidade persistente.

### Compras

- Ao salvar um item comprado, o sistema garante que ele possua `inventoryItemId` e controle de estoque ativo.
- A conclusão da compra gera a entrada mesmo para produtos que antes estavam sem controle.
- Compras antigas com `Movimentos de estoque: 0` são reparadas ao acessar Compras ou Estoque, sem duplicar movimentos já existentes.
- O histórico traduz a reconciliação como `Estoque da compra reconciliado`.

### Variações

- Combinações de variação com grade criada continuam aparecendo como itens individuais na compra e no estoque.
- Produtos que possuem opções de cor, armazenamento, RAM ou estado, mas não possuem combinações na grade, são identificados como `Variações configuradas, mas a grade ainda não foi criada`.
- O sistema não inventa combinações automaticamente, evitando criar SKUs e saldos para configurações inexistentes.

### Conferência de XML

- O seletor longo foi substituído por pesquisa digitável por nome, código, SKU, EAN, referência, marca, modelo e variação.
- Ao cadastrar um produto dentro do XML, ele é selecionado, definido e vinculado automaticamente.
- O contador de itens definidos é atualizado imediatamente e o botão `Usar dados na nova compra` é liberado quando todos os itens estiverem definidos.
- As listas de resultado fecham ao clicar fora.

### Compra manual

- A lista de busca fecha ao clicar fora do campo.
- Ao fechar ou reabrir o modal, a busca anterior e sua lista são limpas.

## Compatibilidade

- Nenhuma estrutura existente foi removida.
- Produtos cadastrados pelo XML continuam desativados para publicação no site por padrão.
- A reconciliação de compras é idempotente e usa `referenceId`, `inventoryItemId` e classificação `purchase` para evitar duplicidade.

## Validações executadas

- `node --check services/purchase-service.js`
- `node --check routes/erp.js`
- validação do JavaScript incorporado em `views/compras.ejs`
- teste isolado de conclusão de compra com ativação automática do estoque
- teste isolado de reconciliação de compra antiga, incluindo segunda execução sem duplicidade
