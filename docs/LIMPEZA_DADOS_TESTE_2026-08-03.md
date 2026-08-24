# Limpeza segura dos dados de teste — 03/08/2026

## Preservado
- Compra real COM-8 (`PUR-3acce852-933c-4f77-a1c4-bc1eb274848b`).
- 20 Contas a Pagar ativas/reais.
- Parcela e eventos da CP vinculada à COM-8.
- Clientes, produtos, fornecedores e configurações.
- Estoque da compra COM-8.

## Removido
- 29 operações de teste (vendas/O.S.).
- Movimentações e sessões de caixa de teste.
- 6 títulos a receber de teste e seus pagamentos/recibos.
- 6 compras de teste (COM-3, COM-4, COM-5, COM-6, COM-7 e COM-9).
- 10 Contas a Pagar estornadas de teste.
- Movimentações de estoque vinculadas às operações e compras removidas.
- Carteira/cupons operacionais usados nos testes.

## Segurança
Foi criado um backup completo anterior à limpeza em:
`data/backups/pre-limpeza-testes-2026-08-03/`

## Validação esperada
- Centro de Operações: 0 operações.
- Caixa: sem sessões e movimentações antigas.
- Compras: somente COM-8.
- Contas a Pagar: 20 contas reais/ativas, sem as 10 estornadas de teste.
- Contas a Receber: vazio.
- Próxima venda/O.S.: número 1.
