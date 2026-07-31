# Quality ERP v0.18.8.1 — Ajuste de leitura do Caixa

## Objetivo

Eliminar ambiguidades nos cards do Caixa Operacional e deixar explícita a diferença entre total recebido em todas as formas e dinheiro físico existente na gaveta.

## Ajustes realizados

- `Recebido hoje` passou a ser exibido como `Total recebido hoje`, com ícone neutro de entrada.
- O total recebido considera vendas, ordens de serviço e baixas do Contas a Receber, em todas as formas de pagamento.
- `Vendas em dinheiro` passou a ser exibido como `Entradas em dinheiro`.
- Entradas em dinheiro incluem vendas, O.S. e recebimentos efetivamente pagos em espécie.
- `Saldo atual` passou a ser exibido como `Saldo físico atual`.
- A descrição do saldo físico informa a fórmula operacional: abertura + entradas − saídas em dinheiro.
- O fechamento do caixa também utiliza a nomenclatura `Entradas em dinheiro`.

## Compatibilidade

Os campos antigos `cashSales` e `salesTotal` foram preservados como aliases para evitar quebra em telas, históricos e fechamentos já existentes.

## Arquivos alterados

- `services/commerce-service.js`
- `views/caixa.ejs`

## Validações

- Sintaxe JavaScript validada com `node --check`.
- Conferência estrutural dos delimitadores EJS.
- Compatibilidade com resumos e fechamentos anteriores mantida por fallback.
