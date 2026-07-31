# Quality ERP v0.16.7 — Compatibilidade do Crediário

## Objetivo

Corrigir a geração de Contas a Receber para formas de pagamento cadastradas antes da inclusão do campo `generatesReceivable`.

## Causa encontrada

A forma padrão `PM-BOLETO` já possuía:

- `autoSettle: false`;
- `eventType: "title"`.

Entretanto, ela não possuía o campo mais recente `generatesReceivable: true`. A integração da v0.16.6 considerava somente esse novo campo e ignorava silenciosamente o crediário antigo.

## Correção

Foi criada uma regra compatível:

1. `generatesReceivable: true` gera título;
2. `generatesReceivable: false` não gera título;
3. quando o campo não existe, `eventType: title` ou `receivable` com `autoSettle` diferente de `true` gera título.

A configuração explícita continua prevalecendo, preservando o controle das formas novas.

## Recuperação automática

Ao abrir Contas a Receber, a reconciliação existente revisa as Vendas e O.S. finalizadas. Com a regra corrigida, operações anteriores em Boleto/crediário que não tiveram título criado serão recuperadas automaticamente, sem duplicar registros já existentes.

## Arquivo alterado

- `C:\Site\painel\services\receivables-service.js`

## Teste recomendado

1. Fazer backup do painel.
2. Substituir o arquivo e reiniciar o servidor.
3. Abrir `/erp/financeiro/contas-a-receber`.
4. Confirmar que as vendas finalizadas em Boleto/crediário aparecem na lista.
5. Finalizar uma nova venda com cliente identificado, valor e vencimento.
6. Confirmar que o título aparece e abre os detalhes.
