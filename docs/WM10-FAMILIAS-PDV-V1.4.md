# Quality ERP — WM10 Famílias + PDV V1.4

## Ajustes desta entrega

### Famílias menores e seguras
A detecção de famílias deixou de remover armazenamento e condição da chave de agrupamento. Assim, por exemplo, `iPhone 14 usado 128GB branco` e `iPhone 14 usado 128GB preto` formam a família `iPhone 14 usado 128GB`, enquanto um `iPhone 14 usado 256GB` fica em outra família.

O campo `Tamanho` do WM10 não é mais tratado automaticamente como variação quando contém compatibilidade/modelo (ex.: `A22`, `A10 M10`, `iPhone 14`). Ele passa a fazer parte da identidade da família. Tamanhos convencionais de vestuário continuam podendo virar variação.

Tipos simples de acessórios passam a ser reconhecidos como variação dentro do mesmo modelo, incluindo `case`, `silicone`, `anti impacto`, `clear case`, `carteira`, além dos tipos de película já previstos (`3D`, `privacidade`, `vidro`, `cerâmica`, `hidrogel`, `fosca`).

Exemplos esperados:
- `iPhone 14 usado 128GB` → variações somente de cor.
- `Capa Samsung A22` → combinações de tipo + cor, sem misturar A20/A21/A23.
- `Película iPhone 14` → variações de tipo, sem misturar outros modelos.

### PDV com variações como itens vendáveis
O PDV agora usa o catálogo expandido do ERP. Cada combinação de variação aparece como item pesquisável e mantém seu próprio `inventoryItemId`, portanto estoque de `Preto` e `Branco` é independente.

A busca passa a localizar nome da variação, nome base, referência, código de barras e dados de origem disponíveis na combinação.

### Produto já importado
Esta entrega corrige a lógica para novas análises/importações. Para o iPhone 14 já gravado, é seguro editar o cadastro atual (nome e variações) ou inativá-lo e reimportar após revisar a nova família. Não foi incluído nenhum `products.json` no ZIP para não sobrescrever a base real.

## Arquivos alterados
- `services/wm10-product-import-service.js`
- `services/purchase-service.js`
- `routes/erp.js`
