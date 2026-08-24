# Quality ERP — DRE Inteligente v0.28

## Objetivo

Evoluir o DRE sem transformar a tela em um painel excessivamente carregado. Esta revisão mantém somente as informações essenciais para responder se a empresa teve lucro ou prejuízo, qual foi a margem e quais grupos formaram o resultado.

## Alterações

- Resumo reduzido a quatro indicadores: Receita Bruta, Receita Líquida, Resultado Líquido e Margem Líquida.
- Análise gerencial automática, construída exclusivamente com os números do próprio DRE.
- Um único gráfico, mostrando a evolução do resultado nos últimos seis meses.
- Drill-down em três níveis: Grupo DRE, Plano de Conta e Lançamento Financeiro.
- Percentuais calculados em relação à Receita Bruta.
- Serviço reorganizado para entregar resumo, análise, estrutura e linha temporal sem duplicar regras na view.

## Fonte dos dados

O DRE continua sem lançamentos paralelos. Ele lê `data/erp/finance/entries.json` e utiliza o `dreGroupId` definido no Plano de Contas.

## Arquivos alterados

- `services/dre-service.js`
- `views/dre.ejs`

## Instalação

Substituir os arquivos mantendo a estrutura de pastas, reiniciar o servidor e atualizar a página com Ctrl+F5.
