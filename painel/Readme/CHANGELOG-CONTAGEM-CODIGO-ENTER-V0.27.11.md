# Contagem de estoque — código + Enter — V0.27.11

## Ajuste

A pesquisa da contagem agora reconhece como correspondência exata o número digitado sem o prefixo do código interno.

Exemplo: ao digitar `123` e pressionar Enter, um produto com código `PRD-123` é reconhecido como exato e incluído imediatamente na contagem, usando a quantidade informada no campo à esquerda.

Também são preservadas as correspondências exatas já existentes por código de barras, código, SKU e referência.

## Segurança operacional

A inclusão automática por Enter continua exigindo uma correspondência exata única. Pesquisas genéricas por nome não adicionam automaticamente o primeiro resultado, evitando contagens no produto errado.
