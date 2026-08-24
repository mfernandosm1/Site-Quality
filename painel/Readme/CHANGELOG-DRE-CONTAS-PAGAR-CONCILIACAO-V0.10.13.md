# Quality ERP — DRE + Contas a Pagar — v0.10.13

## Objetivo

Eliminar a comparação incorreta entre valores de caixa/vencimento e DRE e tornar o Contas a Pagar conferível pelo operador.

## DRE — regra corrigida

No regime de competência, o DRE continua considerando despesas pagas e não pagas conforme a competência cadastrada.

Foram consolidadas duas exclusões que não devem inflar o card **Despesas**:

- compras/estoque classificadas em CMV não entram novamente como despesa do Contas a Pagar; o CMV é apurado pelos itens efetivamente vendidos;
- principal de **Empréstimos e financiamentos** (`ACC-70-04`) não entra como despesa financeira da DRE. Amortização de principal reduz passivo; juros, IOF, tarifas e outras despesas financeiras permanecem normalmente na DRE quando cadastrados nas respectivas contas.

A tela do DRE informa agora que o card de despesas não inclui CMV nem principal de financiamentos.

## Conferência realizada com a base recebida

Para agosto/2026:

- **Pagos no período**: R$ 10.427,34 — pagamentos cuja data de baixa ocorreu em agosto;
- **Em aberto com vencimento em agosto**: R$ 9.371,35;
- somar esses dois cards não produz o total correto das contas de agosto, pois há R$ 1.055,58 pagos em 11/08 referentes a uma parcela com vencimento em 06/08/2027 (PG-000008 / CP-000012);
- **Total correto das parcelas com vencimento em agosto (pagas + em aberto)**: R$ 18.743,11, formado por R$ 9.371,76 já quitados + R$ 9.371,35 em aberto.

Portanto, `Pagos no período` é um indicador de caixa/data de pagamento e `Total do período` é um indicador de compromissos/data de vencimento. Eles não devem ser somados entre si.

Com a regra de DRE ajustada, a base recebida apura em agosto/2026:

- Receita: R$ 16.844,79;
- CMV: R$ 4.757,05;
- Despesas após CMV: R$ 5.459,59;
- Resultado líquido: R$ 6.628,15.

Os valores de Contas a Pagar não precisam ser iguais ao DRE: compras de estoque/CMV e amortização de principal de financiamentos têm tratamento diferente, e o DRE usa competência enquanto os cards do Contas a Pagar podem usar vencimento ou pagamento.

## Contas a Pagar — novas conferências

- Novo card **Total do período**: soma todas as parcelas com vencimento dentro do período selecionado, incluindo quitadas e em aberto e excluindo estornadas.
- Nova visualização **Ativas + Pagas**, para mostrar as duas situações juntas sem misturar estornadas.
- O filtro de período nessa visualização usa vencimento das parcelas.
- A lista exibe **Total exibido**, recalculado conforme os filtros aplicados, além da quantidade de parcelas consideradas.
- O card `Pagos no período` continua usando a data efetiva do pagamento, pois representa saída realizada.

## Arquivos alterados

- `services/dre-service.js`
- `services/payables-service.js`
- `routes/erp.js`
- `views/dre.ejs`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Validação

- `node --check` executado nos arquivos JavaScript alterados.
- `PayablesService.dashboardSummary()` validado contra a base recebida.
- `PayablesService.list({ view: 'all', duePreset: 'month' })` validado com total de R$ 18.743,11 para agosto/2026.
- `DreService.query()` validado para agosto/2026 no regime de competência.
