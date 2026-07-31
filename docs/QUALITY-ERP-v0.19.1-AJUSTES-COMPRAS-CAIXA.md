# Quality ERP v0.19.1 — Ajustes de Compras, Caixa e filtros

## Objetivo

Refinar a fundação do módulo Compras sem reescrever os serviços existentes, mantendo compatibilidade com compras e títulos já gravados.

## Alterações desta entrega

### Cadastro manual

- O campo **Nº da nota** passou para a área recolhível **Dados fiscais adicionais**, junto de Série, Emissão e Chave de acesso.
- O cabeçalho principal ficou como **Fornecedor e entrada**, reduzindo campos pouco usados no fluxo diário.
- Compras antigas que possuam qualquer dado fiscal continuam abrindo automaticamente essa área ao editar.

### Filtro rápido

- A listagem de Compras passou a reutilizar o componente global `quick-date-picker.js`.
- Foram preservados os campos De/Até e adicionadas as setas de período rápido no padrão do ERP.
- O filtro atualiza a listagem sem exigir botão Buscar.

### Plano de pagamento e Caixa

- A validação que exige que a composição financeira feche exatamente o total da compra foi preservada.
- Ao finalizar, formas configuradas como `autoSettle` no catálogo financeiro são tratadas como pagamento imediato.
- Atualmente, na base consolidada, Dinheiro e PIX são formas imediatas.
- Antes de movimentar estoque ou criar efeitos definitivos, o serviço valida se o Caixa selecionado está aberto e se a forma possui correspondência ativa no Caixa.
- Cada parcela imediata é quitada reutilizando `PayablesService.pay()`. Assim, a saída é registrada no Caixa, Fluxo de Caixa e histórico financeiro pelos mesmos serviços do Contas a Pagar.
- Boleto e formas não imediatas permanecem como títulos em aberto e não movimentam o Caixa na conclusão.
- Chaves de idempotência ligadas à compra evitam pagamento e movimentação duplicados.

### Detalhes da compra

O painel lateral passou a mostrar:

- plano de pagamento previsto;
- forma, valor, parcelas e primeiro vencimento;
- pagamentos efetivamente realizados;
- data e número do pagamento;
- situação da conta vinculada: em aberto, parcial ou paga;
- nomes amigáveis no histórico da compra.

## Compatibilidade

- Nenhum dado existente foi removido ou migrado.
- Compras antigas continuam legíveis.
- Compras já concluídas sem pagamento imediato não são alteradas automaticamente.
- O comportamento de estorno financeiro permanece protegido: títulos que já possuam pagamento não podem ser estornados sem o fluxo rastreável de estorno de pagamento.

## Arquivos alterados

- `services/purchase-service.js`
- `services/payables-service.js`
- `routes/erp.js`
- `views/compras.ejs`

## Validações executadas

- `node --check services/purchase-service.js`
- `node --check services/payables-service.js`
- `node --check routes/erp.js`
- extração e validação do JavaScript interno de `views/compras.ejs`
