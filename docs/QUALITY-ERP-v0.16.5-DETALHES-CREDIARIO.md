# Quality ERP v0.16.5 — Detalhes do Crediário

## Objetivo

Tornar cada título do Contas a Receber clicável e permitir a conferência completa da origem operacional, cliente, parcelas e histórico de crédito.

## Implantação

Substituir somente os arquivos entregues, mantendo backup prévio:

- `painel/routes/erp.js`
- `painel/services/receivables-service.js`
- `painel/views/contas_receber.ejs`
- `painel/public/js/contas-receber.js`
- `painel/public/css/painel-theme.css`

Copiar esta documentação para:

- `C:\Site\docs\QUALITY-ERP-v0.16.5-DETALHES-CREDIARIO.md`

## O que mudou

- Linha inteira do título passou a ser clicável, além do botão Detalhes.
- Detalhamento mostra Venda/O.S. de origem, itens, vendedor, total e data da finalização.
- Exibe cadastro do cliente, CPF/CNPJ, telefone, e-mail e endereço.
- Exibe resumo de crédito do cliente: títulos, saldo aberto, parcelas vencidas e saldo vencido.
- Permite navegar entre títulos recentes do mesmo cliente.
- Mantém parcelas, recebimentos, impressão e histórico do título no mesmo painel.
- Inclui acesso para abrir a operação original no PDV.

## Teste de crediário

1. Em Configurações Financeiras, confirme uma forma ativa com `Gera Contas a Receber` habilitado, cliente identificado e CPF/CNPJ obrigatório.
2. Cadastre ou selecione um cliente ativo com CPF válido.
3. No PDV, crie uma Venda ou O.S. com item de valor maior que R$ 0,01.
4. Selecione a forma de crediário, informe o valor integral e a quantidade de parcelas.
5. Finalize a operação.
6. Abra `ERP > Financeiro > Contas a Receber`.
7. Confirme que o título aparece com origem, cliente, vencimento, valor e saldo.
8. Clique em qualquer área da linha ou em `Detalhes`.
9. Confira operação, cliente, histórico de crédito, parcelas e histórico do título.

## Segurança

A entrega não cria títulos de teste diretamente nos JSONs e não altera vendas antigas. O teste deve ser feito por uma movimentação real do PDV para validar o fluxo completo.
