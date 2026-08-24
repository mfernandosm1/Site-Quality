# Compras XML — nome atual do produto vinculado (v0.27.6)

## Ajuste

O vínculo aprendido do XML continua sendo identificado pelo `productId`, mas a conferência passa a receber do servidor o cadastro atual do produto correspondente.

Isso evita que uma aba de Compras já aberta continue exibindo ou leve para a Nova Compra um nome antigo depois que o produto foi renomeado no cadastro mestre.

## Comportamento esperado

- O nome grande do item na conferência continua sendo o `xProd` da NF-e, pois representa o nome fiscal enviado pelo fornecedor.
- O produto vinculado no ERP usa sempre o nome atual do cadastro mestre.
- Ao usar os dados do XML na Nova Compra, o item usa o cadastro atual retornado pelo servidor, sem depender do `productName` histórico do vínculo aprendido.
- Os vínculos existentes não precisam ser recriados.
- Nenhuma compra, estoque ou histórico existente é alterado por esta atualização.
