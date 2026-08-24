# Quality ERP — Estoque por variações V1.6

## Regra definitiva

O ERP passa a trabalhar com apenas uma fonte física de estoque por produto:

- Produto sem grade de combinações: o saldo pertence ao produto.
- Produto com grade de combinações: o saldo pertence somente às combinações/variações.
- O campo `product.stock`, quando há combinações, é somente um espelho calculado da soma das variações para compatibilidade com telas e relatórios antigos. Ele não é um segundo estoque editável.

Exemplo:

- iPhone 14 usado 128GB
  - Preto: 2
  - Branco: 4
  - Total exibido no pai: 6 (somente leitura)

## Ajustes aplicados

### Produtos

- A listagem deixa de oferecer estoque editável no produto pai quando existe grade.
- Exibe `Estoque total` calculado e a quantidade de variações.
- No modal de edição, `Estoque total (variações)` fica somente leitura.
- As quantidades são alteradas exclusivamente em `Estoque por variação`.
- Ao salvar produto com variações, o backend sincroniza apenas os itens `VAR-*`.
- Se houver saldo legado no item pai, ele é ajustado para zero quando o cadastro com variações é salvo. O histórico anterior não é apagado.
- Ao abrir Produtos, o total do pai é recalculado a partir dos saldos reais das combinações no InventoryService.

### PDV / estornos / movimentação manual

- Venda de uma variação altera somente o `inventoryItemId` daquela combinação.
- Estorno de venda atualiza somente a combinação correspondente.
- Entrada, saída ou ajuste manual de uma variação atualiza a combinação e recalcula o total exibido no pai.

### Compras

- Produtos com grade continuam aparecendo no catálogo de compras como itens de variação, não como estoque do pai.
- Ao concluir uma compra de uma variação, o saldo daquela combinação é atualizado e `product.stock` é recalculado apenas como soma de compatibilidade.

## Loja Virtual

Nada foi fundido com a regra física do ERP. `channelAvailability.site`, limite do site e reserva física continuam como camada de disponibilidade do canal. O estoque físico continua sendo o InventoryService.

## Compatibilidade

O `inventory.itemId` do produto pai não é removido para não quebrar histórico e referências existentes. Para produtos com combinações ele deixa de ser um item vendável/controlável na operação normal e seu saldo corrente é mantido em zero.

## Arquivos alterados

- `routes/produtos.js`
- `routes/erp.js`
- `services/purchase-service.js`
- `views/produtos.ejs`
