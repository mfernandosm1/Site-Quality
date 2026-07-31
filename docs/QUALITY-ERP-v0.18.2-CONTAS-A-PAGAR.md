# Quality ERP v0.18.2 — Refinamento Operacional do Contas a Pagar

## Objetivo

Refinar a experiência operacional do módulo Contas a Pagar sobre a fundação da v0.18.1, sem reescrever serviços nem alterar a estrutura persistida dos títulos, parcelas, pagamentos e eventos.

## Implementações

### Drawer de detalhes

- resumo financeiro em cards: valor original, total pago, saldo e situação;
- fornecedor clicável, direcionando para a consulta de fornecedores;
- dados de documento, emissão, forma prevista, centro de custo e plano de contas;
- competências exibidas de forma compacta por mês/ano;
- parcelas em cards com barra de progresso e indicação de quitação;
- pagamentos exibidos em histórico visual, com juros, multa, desconto e formas utilizadas;
- reimpressão de comprovantes já registrados;
- timeline visual dos eventos da conta.

### Pagamento

- modal operacional alinhado ao padrão do Contas a Receber;
- suporte visual a múltiplas formas de pagamento;
- cálculo de total informado, principal aplicado e saldo restante;
- validação antes da confirmação;
- tela de sucesso após o pagamento;
- impressão de comprovante de pagamento;
- preservação da integração já existente com Financeiro e Caixa.

### Cadastro

- competências mais compactas;
- inclusão automática do mês seguinte pelo botão `+ Adicionar competência`;
- foco automático no cadastro;
- atalho `F2` para abrir uma nova conta;
- atalho `Ctrl + Enter` para salvar o cadastro aberto;
- `Esc` fecha modal ou drawer ativo.

### Tabela e filtros

- ordenação por vencimento mais próximo, vencimento mais distante, maior saldo ou criação mais recente;
- indicadores laterais para contas vencidas e que vencem hoje;
- situação com cores específicas;
- filtros rápidos adicionais para próximo mês e contas futuras;
- cards superiores passam a acionar os filtros correspondentes.

## Arquivos alterados

- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`
- `services/payables-service.js`
- `routes/erp.js`

## Arquivo novo

- `docs/QUALITY-ERP-v0.18.2-CONTAS-A-PAGAR.md`

## Compatibilidade e estabilidade

- nenhuma estrutura JSON existente foi removida ou renomeada;
- pagamentos continuam sendo processados pelo `PayablesService`;
- integração com `FinanceService` e movimentação de dinheiro no caixa foram preservadas;
- não foram implementadas ações em lote nesta versão, mantendo-as como evolução futura;
- nenhuma migração de dados é necessária.

## Validação recomendada

1. Abrir Contas a Pagar e testar cada filtro rápido.
2. Ordenar a tabela pelos quatro critérios.
3. Abrir uma conta e conferir fornecedor, competências, parcelas e histórico.
4. Registrar pagamento com uma única forma.
5. Registrar pagamento dividido entre duas formas.
6. Confirmar cálculo de juros, multa e desconto.
7. Imprimir o comprovante na tela de sucesso.
8. Reabrir a conta e reimprimir o comprovante pelo histórico.
9. Criar uma conta com múltiplas competências usando o botão `+`.
10. Testar os atalhos `F2`, `Ctrl + Enter` e `Esc`.
