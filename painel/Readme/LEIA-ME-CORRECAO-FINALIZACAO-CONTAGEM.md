# Correção crítica — finalização de contagem total

Esta atualização corrige dois gargalos que podiam fazer a conclusão de uma contagem grande aparentar travamento:

1. A conferência varria todo o histórico de movimentações para cada produto contado.
2. A geração do ID de cada movimentação varria novamente todo o histórico para cada ajuste aplicado.

Agora ambos os processos são indexados/em lote.

## Segurança

- Não exclui nem recria a contagem existente.
- Não altera `counts.json` durante a instalação.
- A contagem continua aberta até a conclusão realmente terminar.
- O backup pré-conclusão implementado na correção anterior continua sendo utilizado.

## Arquivos alterados

- `services/stock-count-service.js`
- `services/inventory-service.js`

Substitua estes arquivos no projeto, reinicie `npm start` e tente concluir a mesma contagem novamente.
