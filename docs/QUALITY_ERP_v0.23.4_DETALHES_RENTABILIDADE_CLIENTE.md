# Quality ERP v0.23.4 — Detalhes da Operação e Rentabilidade do Cliente

## Objetivo
Refinar a inteligência comercial do cliente, corrigir o Black OLED dos modais e transformar a observação complementar em um campo persistente de Detalhes da operação.

## Implementado
- Correções de contraste no Black OLED para Análise de Crédito, Carteira, Histórico e detalhes da operação.
- Rentabilidade consolidada e mensal: custo conhecido, venda, resultado bruto, resultado percentual e markup.
- Itens sem custo são sinalizados e não recebem cálculo inventado.
- Campo `details` persistente em Venda/O.S., exibido no histórico do cliente, Centro de Operações, PDV e impressão.
- Toda alteração de Detalhes gera evento de auditoria com valor anterior, valor novo, usuário, data e origem.
- Compatibilidade preservada com a rota antiga de observações.

## Regra dos cálculos
- Receita do item = quantidade × preço unitário − desconto.
- Custo = quantidade × custo unitário, apenas quando o custo estiver registrado.
- Resultado bruto = receita − custo.
- Resultado % = resultado bruto ÷ custo × 100.
- Markup exibido = resultado bruto ÷ custo.

## Arquivos alterados
- `services/commerce-service.js`
- `routes/erp.js`
- `public/js/clientes.js`
- `views/clientes.ejs`
- `views/centro_operacoes.ejs`
- `views/pdv.ejs`

## Arquivo novo
- `docs/QUALITY_ERP_v0.23.4_DETALHES_RENTABILIDADE_CLIENTE.md`

## Compatibilidade
Não altera estoque, Caixa, Contas a Receber, Compras ou valores históricos. Operações antigas recebem `details` vazio durante a migração automática.

## Testes recomendados
1. Abrir Análise de Crédito nos modos Claro e Black OLED.
2. Conferir a tabela mensal de rentabilidade e a sinalização de itens sem custo.
3. Abrir uma operação pelo Histórico do cliente, salvar Detalhes e reabrir.
4. Conferir os Detalhes no Centro de Operações.
5. Abrir a operação no PDV e confirmar o campo.
6. Imprimir e confirmar Observação original e Detalhes.
7. Alterar novamente os Detalhes e confirmar o evento no histórico/log.
