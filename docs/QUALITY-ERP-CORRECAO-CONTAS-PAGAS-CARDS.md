# Quality ERP — Correção da consulta de contas pagas

## Ajustes

- A aba e o filtro **Contas Pagas** agora exibem contas que possuem pagamentos válidos, mesmo quando a despesa ainda está parcialmente paga.
- Uma conta parcial com uma ou mais parcelas pagas passa a aparecer na consulta de pagamentos.
- A data usada nessa consulta continua sendo a data efetiva do pagamento.
- Os cards superiores deixaram de ser recalculados sobre o filtro atual. Assim, seus totais gerais não zeram ao abrir a aba de contas pagas.
- O contador **Contas Pagas** considera contas com ao menos um pagamento válido, sem duplicar a mesma conta quando houver mais de um pagamento.

## Arquivos alterados

- `services/payables-service.js`
- `routes/erp.js`

## Testes recomendados

1. Abrir **Contas Pagas** e confirmar que a conta parcialmente paga aparece.
2. Verificar se a coluna **Data do pagamento** mostra a data efetiva do pagamento.
3. Confirmar que o status da conta parcial permanece **Parcial**.
4. Confirmar que os cards superiores mantêm seus valores gerais ao alternar entre Contas Ativas, Pagas e Estornadas.
5. Estornar um pagamento de teste e confirmar que uma conta sem outros pagamentos válidos deixa de aparecer em Contas Pagas.
