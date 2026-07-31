# Eventos do ERP

## Objetivo

Permitir que ações importantes sejam comunicadas sem criar dependências rígidas entre módulos.

## Exemplos planejados

- `produto.criado`
- `produto.atualizado`
- `produto.publicacao_solicitada`
- `site.produtos_sincronizados`
- `cliente.criado`
- `orcamento.aprovado`
- `venda.realizada`
- `estoque.movimentado`
- `financeiro.lancamento_criado`
- `os.finalizada`

## Regra de segurança

O uso de eventos será incremental. Na fase local, um barramento interno simples é suficiente. Não será introduzida infraestrutura distribuída antes de existir necessidade real.
