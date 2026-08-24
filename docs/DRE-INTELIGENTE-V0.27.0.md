# DRE Inteligente — v0.27.0

## Princípios

- O DRE não possui lançamentos próprios.
- A fonte é `data/erp/finance/entries.json`.
- Cada Plano de Conta define seu `dreGroupId`.
- Não existem regras por nome de conta no relatório.
- Lançamentos estornados ou cancelados são ignorados.
- O regime padrão é competência; a tela permite consulta por caixa.

## Arquivos

- Novo: `data/erp/finance/dre-groups.json`
- Novo: `services/dre-service.js`
- Novo: `views/dre.ejs`
- Alterado: `data/erp/finance/chart-of-accounts.json`
- Alterado: `services/finance-service.js`
- Alterado: `routes/erp.js`
- Alterado: `views/configuracoes_financeiro.ejs`
- Alterado: `public/js/financeiro-fundacao.js`
- Alterado: `views/financeiro_fundacao.ejs`

## Uso

Acesse **Financeiro → DRE Inteligente**. Para alterar a classificação, abra **Configurações → Financeiro → Centros de custo e planos de conta**, edite o Plano de Conta e selecione o Grupo DRE.

## Migração inicial

As contas existentes foram classificadas com base na estrutura atual: receitas em Receita Bruta, contas do CMV em Custos das Vendas, contas financeiras em Despesas Financeiras e as demais despesas em Despesas Operacionais. A classificação pode ser revisada pela interface.
