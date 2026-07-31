# Painel Quality ERP v0.11.0 — Primeira Entrega do Estoque

## Objetivo
Criar a fundação segura do estoque sem mudar o funcionamento visual atual do Cadastro Mestre de Produtos.

## Regra central
- Produto é o cadastro mestre.
- Variação/combinação é a unidade comercial e de estoque.
- Saldo é alterado somente por movimentação.
- Movimentações não são apagadas; erros são corrigidos por estorno.

## Arquivos novos
- `services/inventory-service.js`
- `data/erp/inventory/stock.json`
- `data/erp/inventory/movements.json`
- `data/erp/inventory/locations.json`
- `data/erp/inventory/inventory-settings.json`
- `scripts/migrate-inventory-foundation.js`

## Arquivo atualizado
- `produtos.js`: mantém a estrutura atual e passa a preservar a política de estoque e identificadores estáveis.

## Recursos preparados
- estoque físico, reservado e disponível;
- entrada, saída, reserva, liberação, ajuste e estorno;
- loja principal como local padrão;
- estoque compartilhado com o site;
- limite do site e estoque mínimo físico preparados, porém desativados;
- venda com saldo negativo preparada, porém desativada;
- identificador próprio para produto e para cada combinação de variação.

## Instalação sugerida
1. Fazer backup manual da pasta `C:\Site`.
2. Copiar `services/inventory-service.js` para `C:\Site\painel\services\`.
3. Copiar a pasta `data\erp\inventory` para `C:\Site\data\erp\inventory`.
4. Substituir somente o arquivo `produtos.js` pelo arquivo da pasta `arquivos_atualizados`.
5. Copiar o script de migração para `C:\Site\painel\scripts\`.
6. Executar uma única vez:
   `node scripts/migrate-inventory-foundation.js C:\Site\Site_with_content\content\products.json`
7. Iniciar o painel e testar cadastro/edição de um produto com e sem variações.

## Observação
Esta entrega não ativa baixa automática pelo site, PDV ou orçamento. Ela cria a base para essas integrações sem alterar o comportamento atual.
