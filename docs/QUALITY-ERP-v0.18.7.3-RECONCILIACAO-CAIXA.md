# Quality ERP v0.18.7.3 — Reconciliação Contas a Pagar → Caixa

## Objetivo

Corrigir pagamentos do Contas a Pagar registrados antes da integração operacional completa com o Caixa, especialmente pagamentos que ficaram com o Financeiro atualizado, mas sem `cashMovementIds` e sem saída visível no Caixa Operacional.

## Ajustes implantados

- Reconciliação automática e idempotente ao abrir o Caixa Operacional.
- Busca de pagamentos do Contas a Pagar sem movimentação correspondente.
- Validação de que existe um turno aberto no caixa selecionado.
- Validação de que o pagamento ocorreu após a abertura do turno atual.
- Conversão segura da forma financeira para a forma do Caixa (Pix, dinheiro, cartão, boleto/crediário etc.).
- Criação somente da movimentação ausente.
- Preservação da data e hora original do pagamento na linha do tempo.
- Atualização de `cashboxId`, `cashMovementIds`, `cashReconciledAt` e `cashReconciledBy` no pagamento.
- Evento de auditoria `cash_reconciled` na conta.
- Chave de idempotência para impedir duplicidade ao atualizar ou abrir a tela novamente.

## Comportamento esperado

Ao abrir `/erp/pdv/caixa`, o sistema verifica pagamentos órfãos do turno aberto. O pagamento de R$ 3,00 em Pix deve passar a aparecer como saída na linha do tempo do Caixa. Nas próximas aberturas, nenhuma nova movimentação será criada para o mesmo pagamento.

## Compatibilidade e segurança

- Pagamentos que já possuem movimentação não são duplicados.
- Pagamentos anteriores ao turno aberto não são inseridos automaticamente em um turno incorreto.
- Nenhum saldo de parcela ou conta é recalculado durante a reconciliação.
- A alteração em `addCashMovement` é opcional e retrocompatível: o novo campo `occurredAt` só é usado quando informado.

## Arquivos alterados

- `services/commerce-service.js`
- `services/payables-service.js`
- `routes/erp.js`

## Testes realizados

- Validação de sintaxe com `node --check` nos três arquivos alterados.
- Teste sobre cópia dos dados reais:
  - pagamento Pix de R$ 3,00 identificado sem `cashMovementIds`;
  - saída criada no Caixa com método `pix` e valor `-3`;
  - pagamento atualizado com o ID da movimentação;
  - segunda execução retornou zero reparos, confirmando idempotência.
