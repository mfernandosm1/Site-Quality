# Quality ERP — Valor da próxima parcela em Contas a Pagar

## Ajuste realizado

Na listagem de **Financeiro > Contas a Pagar**, a coluna **Valor** passou a exibir o saldo da próxima parcela em aberto, correspondente à data mostrada em **Próximo vencimento**.

A coluna **Saldo** continua exibindo o total ainda pendente da despesa completa.

## Regras

- Parcela em aberto: exibe o saldo atual da próxima parcela.
- Parcela parcialmente paga: exibe somente o restante daquela parcela.
- Conta sem parcela disponível: usa o saldo total da conta como fallback.
- Exportação da listagem: também utiliza o valor da próxima parcela para manter consistência com a tela.

## Arquivos alterados

- `public/js/contas-pagar.js`
- `views/contas_pagar.ejs`
