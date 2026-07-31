# Quality ERP v0.18.0 — Contas a Pagar

## Objetivo

Implantar a fundação operacional do Contas a Pagar mantendo o padrão estrutural e visual do Contas a Receber, sem dashboard financeiro nesta etapa e sem reescrever módulos existentes.

## Implementado

- Serviço isolado `PayablesService`.
- Cadastro manual de contas com fornecedor opcional.
- Snapshot do nome e documento do fornecedor.
- Parcelamento com primeiro vencimento e intervalo configurável.
- Situações: em aberto, parcial, pago e cancelado.
- Filtros rápidos e avançados.
- Drawer de detalhes, parcelas, pagamentos e histórico.
- Pagamento total ou parcial.
- Juros, multa e desconto no pagamento.
- Integração com `FinanceService` para lançamentos e movimentos de saída.
- Integração com `CommerceService` para saída física de dinheiro.
- Validação de caixa aberto e saldo suficiente para pagamentos em dinheiro.
- Idempotência por `requestKey`.
- Registro de usuário e eventos operacionais.
- Base preparada para metadados de comprovantes.

## Arquivos de dados

- `data/erp/finance/payables.json`
- `data/erp/finance/payable-installments.json`
- `data/erp/finance/payable-payments.json`
- `data/erp/finance/payable-events.json`
- `data/erp/finance/payable-attachments.json`

## Regras operacionais

1. Pagamentos em dinheiro exigem caixa aberto.
2. O saldo físico do caixa é validado antes da saída.
3. PIX, boleto, cartão ou outras formas não movimentam o dinheiro físico do caixa.
4. Uma conta com pagamento registrado não pode ser cancelada sem futuro fluxo de estorno.
5. Um pagamento não pode exceder o saldo da parcela.
6. Reenvio com a mesma chave de requisição não duplica o pagamento.
7. Contas canceladas permanecem no histórico.

## Próximas evoluções sugeridas

- Upload e visualização física de comprovantes.
- Impressão de comprovante de pagamento.
- Estorno de pagamento.
- Edição controlada de contas ainda sem pagamento.
- Recorrência automática.
- Integração com Compras e importação fiscal.

## Refinamento v0.18.1 — UX, competências e filtros futuros

- Corrigido o drawer lateral que abria somente o fundo escuro sem trazer a ficha da conta para a tela.
- Corrigido o mesmo estado após salvar uma nova conta.
- Adicionado fechamento seguro dos modais, drawer e bloqueio de rolagem.
- Cadastro reorganizado em Identificação, Competências e Parcelamento/Classificação.
- Competência passou a utilizar somente mês/ano (`input type="month"`).
- Adicionado botão `+ Adicionar competência`, preenchendo automaticamente o mês seguinte ao último informado.
- O título mantém `competenceDate` para compatibilidade e passa a armazenar também `competencies`.
- Integrado o seletor global de períodos rápidos nos campos de vencimento.
- Adicionado `Próximo mês` ao modo financeiro global, mantendo próximos 30, 60 e 90 dias.
