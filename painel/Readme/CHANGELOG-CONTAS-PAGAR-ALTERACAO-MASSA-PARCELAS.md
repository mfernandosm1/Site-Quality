# Contas a Pagar — alteração em massa de parcelas

## Objetivo
Permitir atualizar várias parcelas da mesma conta de uma só vez, evitando editar linha por linha.

## Implementação
- Novo botão **Alterar em massa** no bloco Financeiro da Conta > Parcelas.
- A alteração atua somente nas parcelas que ainda possuem saldo em aberto.
- É possível escolher quais campos serão aplicados:
  - vencimentos;
  - forma de pagamento;
  - observação;
  - valor de cada parcela.
- Campos não marcados são preservados.
- Para vencimentos, o usuário informa o primeiro vencimento e pode manter a opção de avançar mês a mês.
- Alteração de valor exige confirmação adicional no mesmo fluxo, pois pode alterar o total da conta.
- A operação é registrada no histórico como `installments_bulk_updated`.

## Backend
Foi criada uma operação única de atualização em massa. As alterações são validadas antes da gravação e o total/status da conta é recalculado apenas uma vez ao final.

## Arquivos alterados
- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `routes/erp.js`
- `services/payables-service.js`
