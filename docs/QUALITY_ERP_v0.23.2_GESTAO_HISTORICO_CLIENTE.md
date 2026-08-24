# Quality ERP v0.23.2 — Gestão e Histórico do Cliente

## Objetivo
Centralizar consulta cadastral, crédito, histórico comercial, crediário e carteira do cliente sem duplicar os módulos financeiros existentes.

## Alterações
- Nome atual do Cadastro Mestre passa a ser exibido no Centro de Operações e Contas a Receber; o nome original permanece gravado como fotografia histórica.
- Impressão da ficha cadastral.
- Análise de crédito baseada em operações e Contas a Receber.
- Histórico paginado em 10 registros.
- Crediário abre o Contas a Receber já filtrado pelo cliente.
- Carteira do Cliente para créditos, vales, cupons e devoluções, separada do Caixa físico e do limite de crediário.

## Arquivos alterados
- routes/erp.js
- services/operations-center-service.js
- services/receivables-service.js
- views/clientes.ejs
- views/contas_receber.ejs
- public/js/clientes.js

## Arquivos novos
- services/customer-wallet-service.js
- views/cliente_ficha.ejs
- docs/QUALITY_ERP_v0.23.2_GESTAO_HISTORICO_CLIENTE.md

## Proteções
- Carteira não permite saldo negativo.
- Carteira não altera Caixa, estoque ou Contas a Receber.
- Limite de crédito continua exclusivo do crediário.
- Nenhum dado histórico é regravado ao atualizar o nome do cliente.

## Testes recomendados
1. Renomear cliente e conferir Centro de Operações e Contas a Receber.
2. Abrir impressão da ficha.
3. Conferir análise de crédito.
4. Navegar entre páginas do histórico.
5. Abrir Crediário e confirmar o cliente selecionado.
6. Adicionar e debitar crédito na Carteira; testar bloqueio de saldo negativo.
7. Validar temas Claro e Black OLED.
