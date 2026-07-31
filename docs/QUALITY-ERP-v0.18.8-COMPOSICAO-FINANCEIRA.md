# Quality ERP v0.18.8 — Composição Financeira do Contas a Pagar

## Objetivo

Permitir que uma despesa manual seja prevista com mais de uma forma de pagamento, mantendo competências contábeis separadas das parcelas financeiras.

## Regras implantadas

- O cadastro manual do Contas a Pagar gera sempre uma **Despesa**.
- **Compra** fica reservada ao futuro módulo de Compras, que deverá integrar fornecedor, itens, custos, estoque e geração automática da conta.
- O plano de pagamento aceita múltiplas linhas com forma, valor, quantidade de parcelas e primeiro vencimento.
- A soma da composição deve coincidir exatamente com o total da despesa.
- Cada linha do plano gera suas próprias parcelas mensais, preservando a forma prevista em cada parcela.
- Previsões não movimentam o Caixa. Apenas pagamentos efetivamente confirmados geram saída.
- Despesas antigas continuam compatíveis com o modelo de uma única forma prevista.

## Exemplo validado

Despesa de R$ 3.000,00:

- R$ 500,00 em Pix, uma parcela;
- R$ 2.500,00 em boleto, dez parcelas mensais.

Resultado: onze parcelas financeiras, cada uma vinculada à forma e ao grupo de composição correspondente.

## Arquivos alterados

- `services/payables-service.js`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Compatibilidade e cuidados

- Não foi criado um segundo serviço financeiro.
- A rotina existente de pagamento parcial, histórico, Caixa e reconciliação foi preservada.
- O campo legado `paymentMethodId` continua preenchido com a primeira forma da composição para compatibilidade com filtros e telas antigas.
- O plano completo é armazenado em `paymentPlan`, e cada parcela recebe `paymentPlanId`.
- Antes de substituir os arquivos, manter backup da versão atual.

## Validações executadas

- `node --check services/payables-service.js`
- `node --check public/js/contas-pagar.js`
- criação simulada com uma forma única;
- criação simulada com Pix de entrada e saldo em dez boletos;
- bloqueio de composição menor ou maior que o total;
- preservação do vínculo de forma por parcela.
