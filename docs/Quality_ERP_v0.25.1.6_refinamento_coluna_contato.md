# Quality ERP v0.25.1.6 — Refinamento da coluna Contato

A listagem de Clientes passou a exibir celular e telefone sem duplicidade visual.

## Regras

- Somente celular: exibe `📱 celular`.
- Somente telefone: exibe `📱 telefone`.
- Celular e telefone diferentes: exibe `📱 celular` e `☎ telefone`.
- Celular e telefone iguais: exibe somente `📱 celular`.
- A comparação ignora máscara, espaços, pontuação e o DDI brasileiro `55`.
- Os dados originais não são alterados; o ajuste é somente de apresentação.
- A pesquisa continua utilizando os dois campos já existentes.
