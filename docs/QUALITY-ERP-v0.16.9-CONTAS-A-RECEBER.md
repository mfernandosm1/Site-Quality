# Painel Quality ERP v0.16.9 — Refinamento Operacional do Contas a Receber

## Objetivo
Refinar a operação de consulta do Contas a Receber sem alterar a geração automática de títulos pelo PDV e sem antecipar a implantação do módulo de Recebimento de Parcelas.

## Alterações implantadas
- Removida a coluna **Emissão** da listagem principal.
- Removido o botão **Detalhes**.
- Toda a linha do título passou a ser clicável e acessível por teclado.
- Substituído o modal pelo painel lateral operacional, seguindo o padrão visual do ERP.
- Painel lateral com identificação do título, cliente, origem Venda/O.S., parcelas, recebimentos, histórico do título e resumo financeiro do cliente.
- Criados os cards superiores: **Em aberto**, **Vencem hoje**, **Vencidos** e **Recebidos no mês**.
- Cards superiores clicáveis para aplicação rápida de filtros.
- Criados filtros rápidos por vencimento: Todos, Hoje, Vencidos, Próximos 7 dias e Este mês.
- Preparados filtros por intervalo de vencimento, cliente, forma de pagamento, centro de custo e plano de contas.
- Refinado o tema Black OLED, incluindo cards, filtros, tabela, sobreposição e painel lateral.
- Mantida a proteção de origem operacional: títulos continuam sendo gerados exclusivamente por Venda/O.S. finalizada no PDV.

## Arquivos alterados
- `routes/erp.js`
- `services/receivables-service.js`
- `views/contas_receber.ejs`
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`

## Arquivo novo
- `docs/QUALITY-ERP-v0.16.9-CONTAS-A-RECEBER.md`

## Validações técnicas
- Verificação de sintaxe JavaScript executada em rotas, serviço e script do navegador.
- Filtros trabalham sobre os títulos e parcelas já existentes, sem migração destrutiva de dados.
- Resumo **Recebidos no mês** utiliza os registros de `receipts.json`.
- Nenhum arquivo de dados do ERP foi incluído na entrega.

## Próxima etapa planejada
Módulo de Recebimento de Parcelas, com integração ao Caixa, Fluxo de Caixa e Dashboard Financeiro.
