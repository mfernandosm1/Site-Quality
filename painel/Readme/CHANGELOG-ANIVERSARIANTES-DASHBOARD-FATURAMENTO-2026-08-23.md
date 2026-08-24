# Ajustes — Aniversariantes e Dashboard de faturamento
Data: 23/08/2026

## Aniversariantes
- O bloco de aniversários não enviados do dia anterior foi movido para o final da aba Aniversariantes.
- O bloco só é renderizado quando existe pelo menos um aniversário do dia anterior sem envio registrado.
- O bloco ficou mais compacto e recolhível; o envio permanece exclusivamente manual.
- A data do aniversário perdido continua visível para deixar claro que o aniversário foi no dia anterior.
- A frase “Lista consultada diretamente do cadastro de clientes do Quality ERP.” saiu do texto fixo e passou para um ícone de informação ao lado de “Aniversariantes de hoje”.

## Dashboard — faturamento diário
- O eixo inferior do gráfico agora exibe todos os dias do período no formato `DD/MM`, alinhados aos pontos do gráfico.
- No mês atual, o gráfico vai do dia 01 até o dia atual, evitando exibir dias futuros sem movimento.
- Ao selecionar “Mês passado”, o gráfico passa a usar todos os dias daquele mês.
- Os pontos continuam clicáveis e levam às operações do dia selecionado.

## Arquivos alterados
- `views/automacao_whatsapp.ejs`
- `views/index.ejs`
- `public/js/dashboard.js`
- `public/css/painel.css`
- `services/dashboard-service.js`
