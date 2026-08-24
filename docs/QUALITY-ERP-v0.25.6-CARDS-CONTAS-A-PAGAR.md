# Quality ERP v0.25.6 — Cards de vencimento no Contas a Pagar

## Objetivo

Reposicionar os indicadores de compromissos de curto prazo no módulo correto e manter os cards sincronizados com os filtros da listagem.

## Alterações

### Financeiro

- Removida a faixa superior com os cards:
  - Vencidas;
  - Contas desta semana;
  - Contas da próxima semana;
  - Próximos 30 dias.
- O Financeiro volta a exibir apenas o resumo operacional geral e os atalhos dos módulos.

### Contas a Pagar

- Mantidos os cards principais:
  - Em aberto;
  - Vencem hoje;
  - Vencidos;
  - Pagos no mês.
- Adicionados os cards de planejamento:
  - Contas desta semana;
  - Contas da próxima semana;
  - Próximos 30 dias.
- Os sete cards são recalculados pela API com os mesmos filtros usados na listagem.
- Busca, situação, origem, fornecedor, forma prevista, centro de custo, plano de contas e período alteram automaticamente os valores dos cards.
- Ao clicar nos novos cards de período, o intervalo correspondente é aplicado aos campos de vencimento e os filtros avançados são exibidos.

## Regras de período

- Semana atual: segunda-feira até domingo.
- Próxima semana: segunda-feira seguinte até domingo.
- Próximos 30 dias: hoje até 30 dias à frente.
- Somente parcelas com saldo em aberto entram nos cards de planejamento.
- Contas estornadas não compõem os valores financeiros.

## Arquivos alterados

- `views/financeiro_fundacao.ejs`
- `views/contas_pagar.ejs`
- `services/payables-service.js`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Testes recomendados

1. Abrir `/erp/financeiro` e confirmar que a faixa de compromissos não aparece mais.
2. Abrir `/erp/financeiro/contas-a-pagar` e conferir os três novos cards.
3. Alterar fornecedor, centro de custo e plano de contas e conferir a atualização dos cards.
4. Usar os filtros Este mês, Próximo mês e Todos e conferir os valores.
5. Clicar em Contas desta semana e verificar o preenchimento do período.
6. Clicar em Contas da próxima semana e verificar o período de segunda a domingo.
7. Clicar em Próximos 30 dias e verificar o intervalo aplicado.
8. Testar nos temas Black OLED e claro.
