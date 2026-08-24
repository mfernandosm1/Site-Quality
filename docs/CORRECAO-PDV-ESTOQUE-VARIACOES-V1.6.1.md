# Quality ERP — Correção V1.6.1

## PDV — finalização de variações

Corrigido o `productId` enviado pelo PDV ao adicionar uma variação. A operação passa a salvar o ID do produto pai em `productId` e a identidade da combinação em `inventoryItemId`.

Também foi adicionada compatibilidade no servidor para operações/rascunhos criados antes desta correção: se o `productId` antigo não localizar o produto, a finalização recupera o pai pelo `inventoryItemId` da variação.

Resultado esperado: uma variação como `IPHONE 14 128gb usado · Branco` pode ser pesquisada e finalizada normalmente, baixando somente o estoque da combinação selecionada.

## Estoque total de produtos com variações

O campo `Estoque total (variações)` agora fica efetivamente bloqueado (`disabled`) quando existem combinações. O valor é somente informativo e é recalculado pela soma dos estoques das variações.

Exemplo:

- Preto = 1
- Branco = 1
- Estoque total = 2 (somente leitura)

O usuário altera apenas Preto/Branco. Não existe estoque físico paralelo no produto pai.

## Arquivos alterados

- `views/pdv.ejs`
- `routes/erp.js`
- `views/produtos.ejs`
