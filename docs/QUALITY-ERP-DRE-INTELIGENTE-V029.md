# Quality ERP — DRE Inteligente v0.29.0

## Objetivo

Transformar a abertura do DRE em uma visão executiva compacta. O usuário deve visualizar os quatro números principais sem rolar a página e abrir detalhes somente quando necessário.

## Alterações

- Filtros rápidos: Últimos 3 meses, Este mês, Mês anterior, Ano e Todos.
- Este mês permanece como período padrão do serviço.
- Filtros principais compactados em uma linha.
- Datas, Grupo DRE e Plano de Conta movidos para Mais filtros.
- Mais filtros permanece fechado, exceto quando existe Grupo DRE ou Plano de Conta aplicado.
- Cards de Receita Bruta, Receita Líquida, Resultado Líquido e Margem permanecem sempre visíveis.
- Análise gerencial inicia recolhida.
- Evolução do resultado inicia recolhida.
- Estrutura do DRE inicia recolhida.
- Grupos, planos de conta e lançamentos continuam recolhidos internamente e abrem por drill-down.
- Bloco de lançamentos sem classificação também inicia recolhido.
- Período ativo é exibido no cabeçalho.

## Regra de usabilidade

A tela trabalha em três níveis:

1. Número: visível imediatamente nos cards.
2. Explicação: aberta pelo usuário quando necessário.
3. Detalhe: acessado por drill-down na estrutura.

## Arquivos alterados

- `views/dre.ejs`
- `routes/erp.js`

## Instalação

Substituir os arquivos mantendo as pastas originais, reiniciar o servidor e atualizar a página com Ctrl+F5.
