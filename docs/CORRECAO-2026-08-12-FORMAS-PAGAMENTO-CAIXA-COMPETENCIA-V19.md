# Quality ERP — Formas por contexto, Caixa independente e Competência mensal — V19
Data: 12/08/2026

## 1. Disponibilidade da forma por módulo
A forma de pagamento continua sendo um cadastro único, mas sua disponibilidade é independente.

Em **Onde pode ser utilizada** é possível marcar/desmarcar separadamente:
- Vendas
- Compras / Contas a Pagar
- PDV
- O.S.
- Financeiro

A V19 também passa a respeitar essa configuração nas telas operacionais:
- PDV mostra somente formas habilitadas no PDV.
- Compras mostra somente formas habilitadas em Compras / Contas a Pagar.
- Contas a Pagar mostra somente formas habilitadas em Compras / Contas a Pagar.

Assim uma forma pode estar ativa em Compras e não existir no PDV, ou vice-versa.

## 2. Baixa e Caixa deixam de ser a mesma coisa
Foram criados dois parâmetros adicionais no cadastro da forma:

### Vendas e recebimentos
- **Baixa automática na venda**
- **Creditar no Caixa**

Exemplo: uma forma pode ser considerada paga no PDV, mas não gerar entrada no Caixa operacional.

### Compras e Contas a Pagar
- **Baixa automática em compras / contas a pagar**
- **Debitar no Caixa**

Exemplo: uma despesa pode ser baixada automaticamente sem gerar saída no Caixa.

Quando `Debitar no Caixa` estiver desligado, o pagamento não exige Caixa aberto e não cria movimento operacional no Caixa. O registro financeiro da baixa continua existindo normalmente.

Quando `Creditar no Caixa` estiver desligado, a venda/recebimento continua podendo ser liquidada, mas o movimento operacional de entrada não é criado no Caixa.

## 3. Compatibilidade com formas já cadastradas
Na primeira inicialização após a V19:
- Formas antigas recebem `Creditar no Caixa = Sim`.
- Formas antigas recebem `Debitar no Caixa = Sim`.

Isso preserva o comportamento anterior até que o usuário altere explicitamente cada forma.

## 4. Competência passa a ser somente Mês/Ano
Foi removido o campo **Vencimento** de dentro de cada Competência no cadastro manual de Contas a Pagar.

Agora cada competência possui somente:
- Mês/Ano
- Valor

Os vencimentos ficam exclusivamente no **Plano de Pagamento**, onde pertencem às parcelas.

Exemplo:
- Competência: agosto/2026
- Plano de pagamento: 3 parcelas
- 1º vencimento: 19/08/2026
- Demais vencimentos: 19/09/2026 e 19/10/2026

Internamente o ERP continua armazenando a competência como `YYYY-MM-01` quando uma data técnica for necessária, apenas para compatibilidade com DRE/Financeiro. O dia `01` não representa vencimento e não é apresentado ao operador.

## 5. Tooltip do modal financeiro
Os balões de ajuda do modal de Formas de Pagamento agora são renderizados em uma camada global, fora da área rolável do `<dialog>`.

Isso impede que o texto seja cortado nas bordas do modal ou dos fieldsets.

## 6. Estornos e pagamentos em lote
A regra de Caixa também foi aplicada a:
- pagamento individual;
- pagamento múltiplo;
- baixa automática;
- estorno de pagamento;
- reconciliação de movimentos;
- recebimento e estorno de Contas a Receber.

Somente movimentos que realmente deveriam atingir o Caixa são criados ou estornados.

## Arquivos alterados
- services/finance-service.js
- services/payables-service.js
- services/receivables-service.js
- routes/erp.js
- views/configuracoes_financeiro.ejs
- views/contas_pagar.ejs
- views/compras.ejs
- public/js/financeiro-fundacao.js
- public/js/contas-pagar.js
- public/css/painel-theme.css
- Readme/CORRECAO-2026-08-12-FORMAS-PAGAMENTO-CAIXA-COMPETENCIA-V19.md

## Testes recomendados
1. Configurar uma forma com `Compras / Contas a Pagar = Sim` e `PDV = Não`.
2. Confirmar que ela aparece no Contas a Pagar/Compras e não aparece no PDV.
3. Configurar `Baixa automática em compras = Sim` e `Debitar no Caixa = Não`.
4. Criar uma conta nessa forma e confirmar que é baixada sem criar saída no Caixa.
5. Configurar `Baixa automática na venda = Sim` e `Creditar no Caixa = Não`.
6. Finalizar uma venda e confirmar que a operação é liquidada sem criar entrada operacional no Caixa.
7. Abrir Nova Conta e confirmar que Competência mostra somente Mês/Ano + Valor.
8. Definir os dias exclusivamente no Plano de Pagamento.
9. Passar o mouse nos ícones `?` do modal e confirmar que o balão não é cortado.
