# Painel Quality ERP v0.16.4 — Integração PDV/O.S. → Contas a Receber

## Objetivo

Transformar o Contas a Receber em um módulo exclusivamente operacional. Títulos financeiros não podem mais ser criados manualmente: eles passam a nascer de uma Venda ou O.S. finalizada no PDV com uma forma de pagamento configurada para gerar recebimentos futuros.

## Alterações implantadas

- Remoção do botão e do modal **Novo título**.
- Bloqueio da rota de criação manual com resposta HTTP 405.
- Estado vazio explicando a origem automática dos títulos.
- Validação de cliente cadastrado, ativo e com CPF/CNPJ quando a forma exigir.
- Bloqueio de crediário para Consumidor final.
- Geração idempotente do título e das parcelas por pagamento da operação.
- Vínculo permanente com número, tipo e ID da Venda/O.S.
- Uso do primeiro vencimento e intervalo entre parcelas definidos na forma de pagamento.
- Pagamentos que geram Contas a Receber deixam de ser lançados como entrada imediata no Caixa.
- A operação finalizada recebe os IDs dos títulos gerados e passa ao estado financeiro `pending_receipt`.
- Migração conservadora das formas de pagamento de sistema com nome Boleto/Crediário, sem sobrescrever configurações já informadas pelo usuário.

## Regra de segurança

Para uma forma com `requireIdentifiedCustomer` ou `requireValidDocument`, a finalização exige:

1. cliente cadastrado;
2. cadastro ativo;
3. cliente diferente de Consumidor;
4. CPF ou CNPJ válido quando configurado.

A validação ocorre antes de estoque, caixa e finalização.

## Arquivos de dados

Mantidos em `painel/data/erp/finance`:

- `receivables.json`
- `receivable-installments.json`
- `receipts.json`
- `receivable-events.json`

A criação é idempotente por `originId + originPaymentKey`, evitando títulos duplicados em repetição acidental do processamento.

## Teste recomendado

1. Em Configurações Financeiras, editar **Boleto / crediário**.
2. Confirmar:
   - Gerar Contas a Receber;
   - Exigir cliente identificado;
   - Exigir CPF/CNPJ válido;
   - quantidade máxima e vencimentos.
3. No PDV, tentar finalizar para Consumidor: deve bloquear.
4. Selecionar cliente ativo com CPF/CNPJ válido.
5. Finalizar Venda ou O.S. em Boleto/Crediário.
6. Conferir o título em `ERP → Financeiro → Contas a Receber`.
7. Confirmar parcelas, vencimentos, origem e saldo.
8. Conferir que o valor futuro não entrou como recebimento imediato no Caixa.

## Backup

Antes da substituição, manter cópia dos arquivos atuais. Esta entrega contém apenas arquivos novos ou alterados e não remove os dados financeiros existentes.
