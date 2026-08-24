# Correção de conclusão de contagem V0.27.4

A conclusão da contagem não é mais bloqueada por produtos que foram removidos, recriados ou tiveram sua identidade alterada no catálogo após a contagem.

- O saldo oficial é aplicado pelo `inventoryItemId` preservado na contagem.
- O catálogo é sincronizado quando o produto é encontrado por inventoryItemId, productId, código, SKU, código de barras ou nome.
- Itens ausentes do catálogo geram aviso no terminal, mas não invalidam a contagem física.
- O rollback transacional já existente continua protegendo estoque, movimentos, catálogo e contagem em caso de erro real durante a conclusão.
