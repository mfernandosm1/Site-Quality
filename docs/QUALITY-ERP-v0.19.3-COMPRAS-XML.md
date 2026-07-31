# Quality ERP v0.19.3 — Conferência Inteligente de XML e Refinamento de Compras

## Entrega

Evolução incremental do módulo de Compras, preservando dados existentes e mantendo a conclusão da compra como única etapa que movimenta estoque e financeiro.

## Estoque na busca de produtos

- A busca agora prioriza o saldo físico do serviço de estoque quando existe registro em `data/erp/inventory/stock.json`.
- Foi adicionada compatibilidade com cadastros antigos cujo `inventory.itemId` não estava preenchido, usando o próprio ID do produto quando há saldo correspondente.
- Mantido fallback para o campo legado `stock` e, na ausência dele, soma das combinações de variações.
- A resposta informa internamente a origem do saldo (`inventory`, `product` ou `variations`) para facilitar diagnóstico.
- Produtos com registro efetivo de estoque passam a ser considerados controlados, mesmo em cadastros antigos incompletos.

## Conferência inteligente de XML

- Identificação automática do fornecedor pelo CPF/CNPJ.
- Cadastro rápido do fornecedor dentro da conferência.
- Sugestão de produto por vínculo aprendido, EAN, código/referência, nome exato e semelhança de nome.
- Sugestão não equivale a confirmação: cada item precisa do botão **Definir**.
- Troca manual da sugestão antes da definição.
- Cadastro rápido de produto sem fechar a importação.
- Vínculos confirmados são gravados em `data/erp/purchases/xml-product-links.json` e reaproveitados nas próximas importações do mesmo emitente.
- A compra só pode ser preenchida quando todos os itens estiverem definidos e o fornecedor estiver selecionado.
- Ler ou conferir XML não gera estoque, Contas a Pagar ou Caixa.

## Cadastro rápido de produto

O cadastro rápido cria um produto ativo e controlado por estoque com:

- nome;
- código do fornecedor;
- EAN;
- NCM;
- último custo do XML;
- item de estoque vinculado ao ID do produto.

O produto pode ser refinado depois no cadastro mestre de Produtos.

## Arquivos alterados

- `services/purchase-service.js`
- `routes/erp.js`
- `views/compras.ejs`

## Arquivo novo

- `docs/QUALITY-ERP-v0.19.3-COMPRAS-XML.md`

## Validações executadas

- `node --check services/purchase-service.js`
- `node --check routes/erp.js`
- extração e validação do JavaScript de `views/compras.ejs` com `node --check`
- teste isolado de saldo de estoque
- teste de leitura de XML
- teste de gravação e reaproveitamento do vínculo XML ↔ produto

## Teste operacional recomendado

1. Abrir Compras e buscar o Adaptador que já recebeu entrada.
2. Confirmar que o saldo exibido corresponde ao Estoque.
3. Importar uma NF-e conhecida.
4. Conferir fornecedor e sugestões.
5. Trocar uma sugestão, clicar em **Definir** e preencher a compra.
6. Fechar sem finalizar e confirmar que estoque e financeiro não mudaram.
7. Importar novamente o mesmo XML e verificar o texto “Vínculo aprendido anteriormente”.
8. Finalizar uma compra de teste e conferir Estoque, Contas a Pagar e Caixa.
