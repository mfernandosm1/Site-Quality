# Quality ERP v0.19.1 — Correção da integração Compras → Caixa

## Objetivo

Garantir que uma compra com pagamento imediato somente seja concluída quando a saída estiver realmente persistida na sessão aberta do Caixa selecionado.

## Ajustes

- Confirmação da movimentação por chave de idempotência após o registro.
- Validação do `cashboxId` e da sessão aberta correspondente.
- Bloqueio da conclusão quando o pagamento foi baixado, mas a saída não foi confirmada no Caixa.
- Reconciliação reforçada para pagamentos já existentes:
  - verifica se a movimentação pertence ao Caixa selecionado;
  - verifica se pertence à sessão atualmente aberta;
  - recria somente a movimentação ausente;
  - preserva idempotência e evita duplicidade.
- Compras já concluídas com pagamento registrado podem ser reparadas ao abrir a tela do Caixa.

## Compatibilidade

- Não altera estruturas JSON existentes.
- Não reescreve Compra, Contas a Pagar ou Caixa.
- Mantém compatibilidade com pagamentos anteriores.
- Não cria nova baixa financeira; apenas garante ou reconcilia a movimentação operacional do Caixa.
