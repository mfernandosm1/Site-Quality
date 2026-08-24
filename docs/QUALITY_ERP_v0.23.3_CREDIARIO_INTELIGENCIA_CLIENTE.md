# Quality ERP v0.23.3 — Crediário e Inteligência do Cliente

## Objetivo
Aprimorar a gestão individual do cliente sem duplicar dados financeiros: o Crediário usa o Contas a Receber como fonte oficial; o histórico usa as operações existentes; e a análise de crédito é calculada a partir desses registros.

## Alterações
- Crediário exclusivo dentro do menu Gerenciar do cliente.
- Correção da resolução do nome atual no Centro de Operações, com preservação do nome histórico.
- Black OLED corrigido nos modais de Análise, Histórico, Crediário e detalhes da operação.
- Histórico paginado e clicável.
- Resumo da operação com itens, situação, observação, impressão e timeline.
- Observação complementar adicionada como evento auditável, sem substituir a observação original.
- Análise de crédito reorganizada em Crédito, Comportamento, Compras e Parcelas.
- Indicadores objetivos: Regular, Atenção, Inadimplente e Sem histórico suficiente.

## Fonte dos dados
- Cadastro Mestre: identidade e limite do cliente.
- Centro de Operações/PDV: vendas e O.S.
- Contas a Receber: títulos, parcelas, recebimentos, atrasos e saldos.
- Não foi criado saldo paralelo de crediário.

## Arquivos alterados
- routes/erp.js
- services/commerce-service.js
- services/operations-center-service.js
- views/clientes.ejs
- public/js/clientes.js

## Arquivo novo
- docs/QUALITY_ERP_v0.23.3_CREDIARIO_INTELIGENCIA_CLIENTE.md

## Testes recomendados
1. Renomear um cliente e conferir o Centro de Operações.
2. Abrir Gerenciar > Crediário e comparar valores com Contas a Receber.
3. Abrir Análise de crédito em Claro e Black OLED.
4. Abrir Histórico, avançar páginas e clicar numa operação.
5. Conferir itens, status, observações e timeline.
6. Adicionar observação complementar e confirmar que a observação original não foi substituída.
7. Usar Imprimir e confirmar que a operação não muda de estado.

## Compatibilidade
Preservados PDV, Caixa, Estoque, Contas a Receber, Compras, O.S. e dados existentes.
