# Quality ERP — Contas a Pagar: pagamento em lote (V6)

Data: 11/08/2026

## Objetivo

Permitir selecionar várias contas na listagem de Contas a Pagar e registrar as baixas em uma única operação de tela, sem perder o histórico individual de cada conta/parcela.

## Alterações

- Adicionado checkbox por conta em aberto/parcial na listagem.
- Adicionado checkbox geral para selecionar todas as contas visíveis.
- Adicionado botão `Pagar selecionadas (N) · R$ total`, exibido somente quando houver seleção.
- Nova janela de pagamento em lote com uma linha por conta/parcela.
- Cada linha possui Data do pagamento, Forma de pagamento e Caixa próprios.
- Bloco `Aplicar a todas` permite replicar Data, Forma e/ou Caixa para todas as linhas rapidamente.
- O pagamento individual já existente continua disponível ao abrir uma conta.
- O lote não cria um único lançamento consolidado: cada conta continua gerando seu próprio pagamento, histórico, baixa financeira e saída no Caixa.
- O backend faz uma pré-validação de todas as contas antes de iniciar as baixas (conta/parcela em aberto, forma ativa, valor e caixa aberto).
- Limite de segurança: até 100 contas por lote.
- Em falha operacional rara durante a execução, a interface informa quais pagamentos foram concluídos e quais ficaram pendentes, evitando ocultar processamento parcial.

## Regra operacional

A seleção da listagem representa a **próxima parcela em aberto** mostrada naquela linha. Em contas parceladas, somente essa parcela é liquidada no lote. Para dividir uma única parcela em mais de uma forma de pagamento, permanece disponível o pagamento individual da conta, que já permite múltiplas formas.

## Arquivos alterados

- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `services/payables-service.js`
- `routes/erp.js`
- `Readme/CORRECOES-2026-08-11-CONTAS-PAGAR-PAGAMENTO-LOTE-V6.md`

## Compatibilidade

Esta entrega parte da V5 e preserva as correções anteriores de PDV, Produtos, Centro de Operações, agrupamento diário do Contas a Pagar e bloqueio de vencimentos retroativos no PDV.
