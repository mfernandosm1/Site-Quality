# Produtos — edição de variações sem recriar

## Ajustes
- Variações existentes agora têm botão de edição (lápis).
- Cor pode ter nome, seletor e imagem alterados sem excluir/recriar.
- Ao trocar nome/imagem da cor, as combinações relacionadas são preservadas; imagem herdada acompanha a nova imagem.
- Combinações permitem trocar somente a imagem diretamente.
- Preço ERP, preço de compra e margem alvo foram removidos do modal de Variações.
- Preços por combinação agora aparecem na aba **Comercial** do editor de produto.
- Estoque por combinação permanece exclusivamente na aba **Estoque**.
- Ao abrir Variações a partir do editor, alterações já digitadas nas outras abas são aplicadas à linha antes do salvamento, evitando perda de edição.

## Compatibilidade
O formato persistido de `variationCombinations` não foi alterado. Estoque, preço, custo, margem, identidade de estoque e integração existente continuam preservados.
