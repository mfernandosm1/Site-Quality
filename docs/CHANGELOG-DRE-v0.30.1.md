# DRE Inteligente — v0.30.1

## Ajustes de interface

- Removida a coloração verde/vermelha do texto completo da Análise gerencial; agora as cores ficam concentradas nos números e indicadores.
- Card **Resultado líquido** ganhou destaque visual elegante conforme o resultado:
  - déficit: borda/acento vermelho;
  - superávit: borda/acento verde.
- Reorganização dos filtros:
  - **Regime**, **Classificação financeira** e **Grupo DRE** ficam na mesma linha;
  - **Classificação financeira** ocupa menos espaço;
  - **Grupo DRE** ficou mais compacto;
  - removido o botão **⋯ Mais filtros**;
  - **De**, **Até** e **Aplicar** ficam juntos na linha inferior.

## Correções funcionais

- Corrigido o caminho do JavaScript do DRE de `/js/dre.js` para `/public/js/dre.js`.
- Essa correção restaura:
  - filtros rápidos **Últimos 3 meses**, **Este mês**, **Mês anterior**, **Ano** e **Todos**;
  - expansão dos grupos, planos de conta e lançamentos da Estrutura do DRE;
  - exportação PDF/Imagem.
- Incluído versionamento do asset (`?v=0.30.1`) para evitar cache do arquivo JavaScript anterior.

## Análise gerencial

A análise voltou a ter caráter gerencial, sem simplesmente explicar a fórmula do DRE. Agora ela prioriza:

- resultado e margem do período;
- maior grupo de despesa e peso sobre receita/despesas;
- identificação quando as despesas superam o lucro bruto;
- recomendação objetiva de onde investigar primeiro;
- alerta de margem apertada mesmo quando o resultado é positivo.

## Validação

- JavaScript do navegador validado com `node --check`.
- Serviço DRE validado com `node --check`.
- Rotas ERP validadas com `node --check`.
- Consulta real de agosto/2026 mantida em **- R$ 2.280,79**, sem alterar o cálculo financeiro existente.
