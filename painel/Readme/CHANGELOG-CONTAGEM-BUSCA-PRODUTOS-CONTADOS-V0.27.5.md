# Contagem de estoque — busca nos produtos já contados (v0.27.5)

## Objetivo
Facilitar a localização de um item dentro de contagens grandes, sem precisar percorrer manualmente centenas de linhas.

## Alterações
- Adicionado campo **“Buscar entre os produtos já contados”** acima da tabela de conferência.
- Busca instantânea no navegador, sem nova requisição ao servidor e sem alterar a contagem.
- Pesquisa por **nome, variação, código, SKU, EAN/código de barras e ID do item de estoque**.
- Busca sem diferenciação de maiúsculas/minúsculas e tolerante a acentos.
- Exibe quantos produtos foram encontrados em relação ao total contado.
- Funciona tanto durante uma contagem em andamento quanto ao consultar uma contagem concluída.
- A busca trabalha em conjunto com os filtros de conferência (Divergentes, Todos, Faltando, Sobrando e Corretos).
- Pressionar `Esc` limpa rapidamente a busca.

## Segurança
A funcionalidade é apenas de visualização/filtro local. Nenhum dado de estoque ou da contagem é alterado ao pesquisar.
