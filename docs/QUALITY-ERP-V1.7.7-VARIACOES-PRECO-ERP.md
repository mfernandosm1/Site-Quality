# Quality ERP — V1.7.7 — Variações com preço ERP próprio

## Objetivo

Tratar cada variação como item comercial vendável, inclusive em serviços, sem criar uma segunda tabela de preços.

## Regra

- O cadastro pai possui `Preço de venda ERP` como preço padrão.
- Cada combinação/variação pode possuir `Preço ERP` próprio.
- Se o preço da variação ficar vazio, ela herda o preço ERP do pai.
- Se o preço da variação for informado, PDV e catálogos operacionais usam o preço da variação.
- A regra vale igualmente para produtos e serviços.
- Serviço continua sem controle de estoque quando a categoria ERP é do tipo Serviço.

## Exemplo de serviço

Cadastro pai: `Formatação Celular`

Grupo: `Tipo de serviço`

- `Sem salvar dados` — R$ 100,00
- `Com cópia de dados` — R$ 160,00

No PDV aparecem duas opções vendáveis independentes, cada uma com seu preço.

## UX

Na Grade de combinações foi adicionado `Preço ERP`.

Quando existe somente um grupo de variação, a grade é materializada automaticamente no modal para permitir informar o preço de cada opção sem precisar montar combinações manualmente.

O campo de preço ao lado de cada combinação aceita vazio (`herdar pai`) ou um valor próprio.

## Compatibilidade

O formato textual das combinações ganhou uma sétima posição:

`cor|armazenamento|ram|estado|imagem|estoque|precoERP`

Registros antigos com seis ou menos posições continuam válidos e simplesmente herdam o preço do pai.

A importação WM10 também preserva o preço de venda de cada registro como preço da variação quando a opção de preço de venda está marcada.

## Arquivos alterados

- `views/produtos.ejs` — edição e exibição de preço por variação.
- `routes/produtos.js` — leitura/persistência do preço ERP nas combinações.
- `services/purchase-service.js` — catálogo operacional/PDV usa preço da variação e respeita estoque explicitamente desativado em serviços.
- `services/wm10-product-import-service.js` — preço WM10 preservado por variação.

## Testes recomendados

1. Criar serviço pai `Formatação Celular` com preço ERP padrão.
2. Criar um único grupo `Tipo de serviço` com duas opções.
3. Informar preço diferente em cada combinação.
4. Salvar e reabrir Variações; preços devem permanecer.
5. Pesquisar no PDV; cada variação deve aparecer separadamente com seu preço.
6. Adicionar cada variação ao PDV e confirmar que o valor unitário corresponde ao preço configurado.
7. Produto físico com variações: deixar uma variação sem preço e confirmar que herda o pai; informar preço em outra e confirmar que usa o próprio.
8. Serviço não deve exigir nem movimentar estoque.
