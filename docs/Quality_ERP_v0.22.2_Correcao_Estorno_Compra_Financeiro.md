# Quality ERP v0.22.2 — Correção do Estorno Compra × Financeiro

## Objetivo
Garantir que nenhuma Conta a Pagar permaneça ativa quando a compra de origem estiver estornada.

## Ajustes
- O estorno da compra localiza a Conta a Pagar pelo vínculo direto, pela origem da operação ou pelo número da compra.
- A Conta a Pagar e suas parcelas passam para o estado `reversed` antes da reversão do estoque.
- Pagamentos vinculados são estornados de forma coordenada.
- A operação é bloqueada caso o financeiro permaneça ativo, evitando estorno parcial da compra.
- Foi adicionada reconciliação automática para compras já estornadas que, por inconsistência anterior, ainda tenham Conta a Pagar ativa.
- A reconciliação é executada ao abrir ou atualizar Contas a Pagar.
- Contas estornadas deixam a visualização ativa e os totais financeiros, permanecendo disponíveis na aba de estornadas para auditoria.

## Arquivos alterados
- `services/purchase-service.js`
- `routes/erp.js`

## Teste recomendado
1. Concluir uma compra com pagamento imediato e/ou parcela futura.
2. Confirmar a Conta a Pagar vinculada.
3. Estornar a compra pelo módulo Compras.
4. Abrir Contas a Pagar.
5. Confirmar que a conta não aparece em contas ativas nem nos totais.
6. Abrir a aba Estornadas e confirmar o histórico da conta.
