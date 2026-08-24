# Quality ERP v0.26.0 — Fluxo de Caixa Inteligente

## Escopo da primeira entrega

Estrutura principal do módulo criada em `/erp/financeiro/fluxo-de-caixa`.

A implementação não cria uma base financeira paralela. O serviço consolida, em leitura:

- movimentos realizados do Caixa (`data/erp/commerce/cash-movements.json`);
- movimentos financeiros realizados (`data/erp/finance/movements.json`);
- parcelas abertas de Contas a Pagar;
- parcelas abertas de Contas a Receber.

Movimentos financeiros já refletidos no Caixa são deduplicados por chave de idempotência/referência.

## Recursos entregues

- cards compactos de realizado, previsto e projeção;
- filtros rápidos e período personalizado;
- filtros por situação, forma de pagamento, origem, centro de custo e plano de contas;
- extrato agrupado por dia;
- totais diários;
- saldo acumulado;
- painel lateral com detalhes e abertura da origem;
- suporte aos temas Claro, Escuro e Black OLED.

## Arquivos alterados

- `routes/erp.js`
- `views/financeiro_fundacao.ejs`
- `public/css/painel-theme.css`

## Arquivos novos

- `services/cash-flow-service.js`
- `views/fluxo_caixa.ejs`
- `public/js/fluxo-caixa.js`
- `docs/Quality-ERP-v0.26.0-Fluxo-de-Caixa-Inteligente.md`

## Testes recomendados

1. Abrir Financeiro → Fluxo de Caixa.
2. Conferir o pagamento real do fornecedor SICOOB sem duplicidade.
3. Comparar movimentos realizados com Caixa e Contas a Pagar.
4. Testar Realizado, Previsto e Ambos.
5. Testar todos os filtros rápidos.
6. Abrir uma movimentação e validar o painel lateral.
7. Validar Claro e Black OLED.
8. Fazer um pagamento, recebimento e estorno e recarregar o fluxo.
