# Quality ERP v0.18.8.1 — Caixa: filtros e histórico

## Objetivo
Refinar a conferência do Caixa Operacional sem alterar a arquitetura de abertura, fechamento ou movimentações já existente.

## Ajustes realizados
- Restaurado o filtro rápido padrão: Hoje, Ontem, Últimos 7 dias, Este mês, Próximo mês e Tudo.
- Datas, tipo, forma e usuário atualizam automaticamente a consulta.
- Cards e resumo por forma de pagamento são recalculados conforme os filtros ativos.
- O saldo físico filtrado considera o saldo inicial do turno somado somente às entradas e saídas em dinheiro encontradas pelo filtro.
- Ao abrir um fechamento histórico, a página passa a trabalhar exclusivamente com a sessão selecionada.
- A linha do tempo do histórico mostra somente movimentos pertencentes àquele turno.
- A visão histórica não exibe botões de movimentação ou fechamento do caixa atual.
- O modal de fechamento continua utilizando o resumo integral e atual do caixa aberto, mesmo quando a tela possui filtros.

## Arquivos alterados
- `routes/erp.js`
- `views/caixa.ejs`
- `public/css/painel-theme.css`

## Validações
- `node --check routes/erp.js`
- Conferência de equilíbrio dos delimitadores EJS.
- Compatibilidade mantida com sessões e movimentos já gravados.
- Revisão visual para Black OLED e resoluções menores.
