# Quality ERP — Ajuste do cabeçalho do PDV e continuidade da troca

**Data:** 28/08/2026

## Objetivo
Refinar a organização visual do cabeçalho do PDV e tornar o fluxo de troca mais intuitivo depois da confirmação da devolução do item original.

## Alterações

### Cabeçalho do PDV
- `PDV` continua como título principal.
- `v0.15.0` passou para baixo do título, como informação secundária.
- botão de atalhos foi compactado para `⌨ F1`, mantendo tooltip e o mesmo modal de atalhos.
- espaçamentos das ações superiores foram reduzidos para melhorar o encaixe em telas próximas de 1366 px.

### Continuidade da troca
Ao confirmar uma operação do tipo **Troca**:
1. o retorno do item original é registrado normalmente;
2. crediário/carteira são tratados pela rotina de Trocas e Devoluções;
3. o sistema abre automaticamente uma **nova venda no PDV** já vinculada ao cliente;
4. o usuário seleciona o novo produto normalmente;
5. um banner identifica que existe uma troca em andamento e mostra o crédito disponível;
6. na finalização deve ser usada a forma de pagamento `Crédito do cliente / troca` até o limite disponível;
7. eventual diferença é cobrada em outra forma de pagamento e eventual saldo não utilizado permanece na carteira.

### Venda original
O botão `Abrir venda` foi renomeado para **Ver venda original**.

A função é apenas consultar a venda finalizada que originou a troca/devolução. Não é o botão para selecionar o novo produto.

## Arquivos alterados
- `routes/erp.js`
- `views/pdv.ejs`
- `views/trocas_devolucoes.ejs`
- `public/css/painel-theme.css`

## Compatibilidade
Este pacote é incremental e deve ser aplicado sobre a **Entrega 20 — Trocas e Devoluções**.
