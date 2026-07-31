# Quality ERP v0.19.2 — Produtividade e Conferência XML de Compras

## Objetivo

Evoluir o módulo Compras sem reescrever a fundação v0.19.1, preservando as integrações validadas com Estoque, Contas a Pagar e Caixa.

## Alterações

### Busca e conferência de produtos

- A busca continua considerando nome, código interno, código de barras, referência, marca, modelo e SKU.
- Cada resultado apresenta estoque físico atual, último custo cadastrado, preço de venda e margem atual quando os valores estiverem disponíveis.
- Os mesmos indicadores ficam visíveis no item já adicionado à compra.
- Nenhum produto é duplicado dentro da mesma compra.

### Importação de XML de NF-e

Foi implantada a primeira tela de conferência XML preparada para NF-e modelo 55 / leiaute 4.00.

A leitura reconhece:

- emitente e CNPJ/CPF;
- número, série, chave e datas;
- total, frete, desconto e outras despesas;
- código do fornecedor, EAN, descrição, NCM, CEST, CFOP, unidade, quantidade e custo por item;
- presença do grupo de impostos, preservado para evolução fiscal posterior.

### Vínculos

- O fornecedor é localizado pelo documento quando já estiver cadastrado.
- Produtos são sugeridos por EAN, código/SKU/referência e, por último, nome exato.
- Itens não reconhecidos ficam destacados como pendentes.
- A conferência permite selecionar manualmente um produto cadastrado para cada item.
- O XML somente pode ser levado para uma nova compra quando fornecedor e todos os itens estiverem vinculados.

### Segurança operacional

- Importar XML não salva nem conclui a compra.
- Importar XML não movimenta estoque.
- Importar XML não cria Contas a Pagar nem lança Caixa.
- Após a conferência, os dados apenas preenchem o formulário de uma nova compra.
- A conclusão continua usando o fluxo transacional e idempotente da fundação de Compras.

## Compatibilidade

- Dados e compras existentes foram preservados.
- Black OLED e modo claro usam as variáveis visuais já existentes.
- Não foi adicionada biblioteca externa de XML.
- Não há interpretação, cálculo ou transmissão tributária nesta versão.

## Arquivos alterados

- `services/purchase-service.js`
- `routes/erp.js`
- `views/compras.ejs`

## Arquivo novo

- `docs/QUALITY-ERP-v0.19.2-PRODUTIVIDADE-XML.md`

## Validações executadas

- `node --check services/purchase-service.js`
- `node --check routes/erp.js`
- validação do JavaScript interno de `views/compras.ejs` com `node --check` após extração;
- leitura funcional do XML de referência com 50 itens, NF 42505, série 1.
