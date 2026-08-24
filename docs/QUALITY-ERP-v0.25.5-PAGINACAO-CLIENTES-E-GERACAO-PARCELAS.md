# Quality ERP v0.25.5 — Paginação de Clientes e Geração de Parcelas

## Objetivo
Refinar a quantidade de clientes exibidos por página e agilizar a geração de parcelas em Contas a Pagar.

## Clientes
- Mantido o padrão de 20 registros por página.
- Adicionado seletor com 20, 50, 100 e 300 registros por página.
- A opção escolhida é preservada ao navegar entre páginas e aplicar filtros.
- Ao alterar a quantidade, a navegação retorna para a página 1 para evitar páginas inválidas.
- Valores aceitos pelo servidor são limitados à lista permitida, evitando cargas arbitrárias.

## Contas a Pagar
- Adicionado o campo **Forma de pagamento** ao gerador de parcelas.
- A forma selecionada é aplicada automaticamente a todas as parcelas geradas.
- O sistema exige uma forma antes de gerar, evitando parcelas incompletas.
- Valores, vencimentos e formas continuam editáveis individualmente após a geração.
- A divisão automática do total e o avanço mensal dos vencimentos foram preservados.

## Arquivos alterados
- `routes/erp.js`
- `views/clientes.ejs`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`

## Testes recomendados
1. Abrir Clientes e alternar entre 20, 50, 100 e 300 registros.
2. Navegar para outra página e confirmar que a quantidade escolhida permanece.
3. Aplicar filtros e confirmar que o seletor continua preservado.
4. Em Contas a Pagar, informar total, quantidade, forma e primeiro vencimento.
5. Gerar parcelas e conferir forma, valores e vencimentos em todas elas.
6. Alterar manualmente uma forma, valor ou vencimento e salvar a conta.
