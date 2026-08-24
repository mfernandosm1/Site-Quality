# Quality ERP — Centro de Operações V1.2

## Objetivo
Eliminar o bloqueio da Home introduzido pela primeira versão da nova Dashboard.

## Problema identificado
A rota `/` calculava toda a Dashboard antes de executar `res.render()`. O `DashboardService` também usava várias leituras síncronas (`fs.readFileSync`). Na prática, a navegação principal ficava dependente da leitura e consolidação de dados financeiros e comerciais.

## Alterações
- A rota `/` não calcula mais indicadores antes de renderizar.
- Criada a rota `GET /api/dashboard?periodo=...` para carregar os dados depois que a Home já apareceu.
- `DashboardService.snapshot()` passou a ser assíncrono.
- Os seis arquivos JSON são lidos em paralelo com `Promise.all` + `fs/promises`.
- Adicionado cache curto de 15 segundos por período para evitar recalcular a mesma visão em cliques repetidos.
- Requisições simultâneas do mesmo período compartilham o mesmo processamento (`inflight`).
- A Dashboard mostra placeholders imediatamente e completa os indicadores via JavaScript.
- Os filtros Hoje/Semana/Mês/Mês passado/Ano atualizam a Dashboard sem recarregar a página inteira.
- Mantida a regra de Atenção Necessária, inclusive contas que vencem hoje.
- Revertida a alteração experimental que atrasava a inicialização do WhatsApp em 8 segundos; `server.js` volta ao comportamento anterior à V1.1.

## Arquivos alterados nesta entrega
- `server.js`
- `routes/index.js`
- `services/dashboard-service.js`
- `views/index.ejs`
- `public/js/dashboard.js`
- `Readme/CENTRO-OPERACOES-V1.2-PERFORMANCE.md`

## Como aplicar
Copiar os arquivos mantendo exatamente as mesmas pastas e substituir os existentes.

## Resultado esperado
Assim que o servidor responder, a estrutura da Home e a Barra de Trabalho devem abrir sem aguardar os cálculos da Dashboard. Indicadores, gráfico, alertas e ranking são preenchidos logo depois.

## Observação de diagnóstico
Se ainda houver aproximadamente 30 segundos entre executar `npm start` e a mensagem `Painel Quality ERP ... iniciado na porta 3000`, então a demora não está na rota da Dashboard, pois nenhuma rota HTTP é executada antes do `app.listen`. Nesse caso, o próximo passo é instrumentar o bootstrap do `server.js` e os imports para localizar exatamente o módulo que está consumindo esse tempo.
