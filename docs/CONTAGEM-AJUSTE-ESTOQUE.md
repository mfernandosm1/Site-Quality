# Quality ERP — Contagem e Ajuste de Estoque

Versão inicial: 0.27.0

## Objetivo

Criar um fluxo rápido de inventário físico sobre o estoque oficial já existente no Quality ERP, sem manter saldos paralelos. A conclusão de uma contagem usa o `InventoryService` e gera movimentações classificadas como `INVENTORY`.

## Fluxo operacional

1. Acesse **Estoque → Contagem de estoque**.
2. Crie uma contagem **Parcial** ou **Total**.
3. Escolha se o PDV deve continuar operando ou ficar bloqueado durante o inventário.
4. Na tela da contagem, o campo de leitura recebe foco automaticamente.
5. Um código de barras exato + Enter soma 1 unidade. Também é possível pesquisar por nome, código, SKU ou EAN e alterar a quantidade manualmente.
6. Durante a contagem o saldo do sistema fica oculto para evitar influência na conferência física.
7. Em **Conferir e concluir**, o sistema mostra saldo atual, contado e diferença, com filtros de divergentes, faltando, sobrando e corretos.
8. Ao concluir, somente divergências geram movimentação oficial de estoque.
9. Cancelamentos exigem motivo e permanecem registrados no histórico.

## Contagem parcial

Somente itens efetivamente incluídos participam da conferência e podem ser ajustados. Produtos não contados permanecem intactos.

## Contagem total

Ao iniciar, o Quality registra uma fotografia da lista de itens controlados. Na conferência, itens que não foram contados aparecem separadamente. Eles **não são zerados automaticamente**. Para concluir com esses itens em zero, o operador precisa marcar uma confirmação explícita.

## Vendas durante a contagem

Se o PDV ficar liberado, a conferência considera movimentações de estoque ocorridas depois da última leitura daquele item. Assim, se um produto for contado e depois vendido, o alvo da conferência é compensado pela movimentação posterior.

Se a opção **Bloquear vendas no PDV** estiver ativa, a finalização de Venda/O.S. é interrompida com uma mensagem informando qual contagem está bloqueando a operação. Ao concluir ou cancelar a contagem, o bloqueio deixa de existir automaticamente.

## Persistência e auditoria

Arquivo novo de dados:

- `data/erp/inventory/counts.json` — criado automaticamente pelo serviço na primeira utilização.

Cada contagem registra eventos de criação, leitura/alteração de itens, remoções, conclusão e cancelamento. O arquivo de saldo oficial continua sendo `stock.json` e o histórico oficial continua sendo `movements.json`.

As correções geradas na conclusão usam:

- `origin: inventory_count`
- `referenceType: inventory_count`
- `referenceId: <id da contagem>`
- `reasonCode: INVENTORY`
- `classification: inventory`

## Arquivos novos

- `services/stock-count-service.js`
- `views/estoque_contagens.ejs`
- `views/estoque_contagem.ejs`
- `public/js/estoque-contagens.js`
- `public/js/estoque-contagem.js`
- `Readme/CONTAGEM-AJUSTE-ESTOQUE.md`

## Arquivos alterados

- `routes/erp.js` — rotas/API de contagem, integração com InventoryService e bloqueio opcional do PDV.
- `views/estoque.ejs` — acesso rápido para Contagem de estoque.

## Regras de segurança

- Nenhum saldo paralelo é usado.
- Contagem cancelada não movimenta estoque.
- Contagem concluída não pode ser reaplicada.
- Quantidades negativas não são aceitas.
- Contagem total não zera itens ausentes sem confirmação explícita.
- Variações são tratadas pelo `inventoryItemId` físico da combinação.
