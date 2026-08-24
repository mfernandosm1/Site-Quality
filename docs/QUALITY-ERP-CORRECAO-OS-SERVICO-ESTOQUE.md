# Quality ERP — Correção de finalização de O.S. com serviço

## Problema

Operações abertas antes da alteração de um produto para a categoria/tipo **Serviço** podiam conservar, dentro do rascunho da operação, a marcação antiga `stockControlled=true`.

Ao finalizar a O.S., o servidor confiava nessa informação antiga e bloqueava a operação com a mensagem de estoque insuficiente, mesmo que o cadastro atual do serviço já estivesse com o controle de estoque desativado.

## Correção

A finalização agora consulta a configuração atual do produto em `products.json` como fonte de verdade:

- serviço/produto sem controle de estoque: não valida saldo e não gera saída;
- produto atualmente controlado: valida o saldo e registra a saída normalmente;
- operações antigas abertas continuam compatíveis após a mudança do cadastro.

## Arquivo alterado

- `routes/erp.js`

## Teste sugerido

1. Abrir a mesma O.S. que apresentava o alerta.
2. Confirmar que o item está cadastrado como Serviço e com estoque desativado.
3. Finalizar a operação.
4. Confirmar que não houve movimentação no estoque desse serviço.
5. Testar também uma venda com produto controlado e saldo zerado para garantir que o bloqueio legítimo continua funcionando.
