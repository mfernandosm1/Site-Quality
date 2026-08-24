# DRE v0.30.2

## Interface e leitura gerencial
- A Análise gerencial passa a iniciar recolhida.
- O texto da análise foi dividido em blocos para melhorar a leitura, mantendo a análise orientada a impacto e prioridade.
- O card Resultado líquido recebeu destaque um pouco mais forte, ainda discreto: déficit em vermelho e superávit em verde, inclusive no valor principal.

## Novos gráficos
- Nova seção **Visão gráfica**, aberta por padrão.
- **Formação do resultado** compara Receitas, CMV, Lucro bruto, Despesas e Resultado líquido.
- **Composição das despesas** mostra o peso de cada Grupo DRE nas despesas após o CMV.
- O gráfico já existente de **Evolução do resultado** foi mantido para análise temporal dos últimos seis meses.
- Os gráficos usam HTML/CSS nativo, sem biblioteca externa, para preservar a velocidade de abertura do DRE.

## Exportação
- A exportação mantém a análise gerencial com as mesmas quebras lógicas de leitura.

## Arquivos alterados
- `views/dre.ejs`
- `public/js/dre.js`
- `routes/erp.js`
