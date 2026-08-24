# Ajuste — controle de estoque em todos os produtos

## Objetivo

Garantir que todos os produtos físicos do ERP participem da contagem de estoque sem exigir marcação manual produto a produto.

## Comportamento

- Ao iniciar o painel, produtos físicos existentes com controle de estoque desativado são ativados automaticamente.
- Serviços continuam sem controle de estoque e não entram na contagem.
- Produtos que já possuem saldo no módulo de estoque mantêm o saldo atual; ele não é sobrescrito.
- Produtos ainda sem registro no estoque recebem como saldo inicial o saldo legado do cadastro do produto/variação.
- Variações recebem identidade de estoque quando necessário.
- Antes de alterar `products.json`, é criado backup em `backups/erp-stock-control`.
- Novos produtos físicos passam a nascer com **Controlar estoque** habilitado por padrão.

## Segurança

A rotina é idempotente: reiniciar o ERP não duplica saldos nem reaplica alterações em produtos já preparados.
