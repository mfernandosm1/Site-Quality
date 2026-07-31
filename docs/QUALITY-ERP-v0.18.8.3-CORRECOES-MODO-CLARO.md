# Quality ERP v0.18.8.3 — Correções do modo claro

## Objetivo
Consolidar o modo claro nos módulos Caixa Operacional, Contas a Receber e Contas a Pagar, sem alterar regras financeiras, serviços, rotas ou dados.

## Arquivo alterado
- `public/css/painel-theme.css`

## Ajustes
- Caixa Operacional: cards, filtros, tabela, histórico, badges, resumo por forma, fechamento e modais.
- Contas a Receber: drawer lateral, resumo da operação, seções, produtos, pagamentos, parcelas, recebimentos e histórico.
- Contas a Pagar: drawer lateral, dados da conta, competências, parcelas, pagamentos, estornos e campos de pagamento.
- Preservação integral do tema Black OLED.

## Compatibilidade
A alteração é exclusivamente visual e utiliza seletores condicionados por `html[data-panel-theme="light"]`.
Nenhuma estrutura EJS, JavaScript, rota, serviço ou JSON foi modificada.

## Testes recomendados
1. Alternar entre Claro e Black OLED com Caixa aberto.
2. Abrir um fechamento histórico e conferir cards, tabela e filtros.
3. Abrir um título em Contas a Receber e percorrer todas as seções do drawer.
4. Abrir uma conta ativa, parcial e estornada em Contas a Pagar.
5. Abrir os modais de recebimento e pagamento nos dois temas.
