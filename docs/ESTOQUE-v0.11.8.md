# Painel Quality ERP — Estoque v0.11.8

## Entrega: Giro dos Produtos

Esta versão mantém toda a operação da v0.11.7 e acrescenta uma aba de análise de giro.

### Recursos

- abas `Operação` e `Giro dos produtos`;
- ranking por quantidade vendida;
- carro-chefe do período;
- filtros por produto, período, categoria, subcategoria, marca e situação;
- períodos de 30 dias, 3 meses, 1 ano e histórico completo;
- indicadores de produtos vendidos, nunca vendidos e sem venda há 90 dias;
- última venda e dias sem vender;
- classificação visual de giro alto, médio, baixo ou sem giro;
- coluna preparada para compradores identificados.

### Regra de venda

Somente movimentações com:

```json
"classification": "sale"
```

entram nos relatórios. Brindes, perdas, garantia, inventário e uso interno não contam como venda.

### Marca

O filtro procura os campos `brand`, `marca`, `manufacturer` ou `fabricante` no cadastro do produto. Quando não há um campo definido, exibe `Sem marca definida`.

### Clientes

A estrutura já aceita `customerId`, `customerName` e `saleId` na movimentação. As saídas manuais atuais normalmente não possuem esses vínculos, portanto aparecem como `Não identificado`. O PDV deverá enviar essas referências futuramente.

### Arquivos alterados

- `routes/erp.js`
- `services/inventory-service.js`
- `views/estoque.ejs`
- `public/js/estoque.js`

### Instalação

Substituir os arquivos nas mesmas pastas do painel e reiniciar o servidor Node.
