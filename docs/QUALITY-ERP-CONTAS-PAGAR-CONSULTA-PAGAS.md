# Quality ERP — Consulta de contas pagas e parcelas parcialmente pagas

## Alterações

- Traduzido o evento interno `installment_updated` para **Parcela atualizada** no histórico.
- O histórico passa a detalhar alterações de valor, vencimento, forma de pagamento e observação da parcela.
- Corrigido o filtro **Parcial** para usar a data do pagamento quando houver período ou filtro rápido selecionado.
- Corrigido o filtro **Paga** para usar a data efetiva do pagamento, em vez do próximo vencimento.
- Adicionada a visualização **Contas Pagas** ao lado de **Contas Ativas** e **Estornadas**.
- **Contas Ativas** agora representa apenas contas em aberto ou parcialmente pagas.
- Na visualização de contas pagas, a coluna de data passa a mostrar **Data do pagamento** e o valor apresenta o total pago da conta.
- O card **Pagos no mês** abre diretamente a visualização de contas pagas do mês atual.

## Arquivos alterados

- `services/payables-service.js`
- `routes/erp.js`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`

## Testes sugeridos

1. Atualizar uma parcela e conferir se o histórico mostra “Parcela atualizada”.
2. Pagar parcialmente uma conta cuja próxima parcela vence no mês seguinte.
3. Filtrar por **Parcial** e selecionar o período em que o pagamento foi realizado.
4. Clicar em **Contas Pagas** e confirmar que somente contas quitadas aparecem.
5. Filtrar contas pagas por data e fornecedor.
6. Clicar no card **Pagos no mês** e conferir a lista correspondente.
7. Confirmar que contas estornadas continuam separadas.
