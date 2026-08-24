# Quality ERP — Centro de Operações V1.1

## Objetivo desta revisão

Revisão curta da primeira entrega, baseada no uso real da dashboard.

## Arquivos alterados nesta revisão

- `server.js`
- `services/dashboard-service.js`
- `views/index.ejs`
- `public/css/painel.css`

## Ajustes

### Atenção Necessária

A regra já contempla contas a pagar que vencem hoje. Quando houver parcelas em aberto com `dueDate` igual à data atual, a dashboard mostra, por exemplo, `2 contas vencem hoje`, com link direto para Contas a Pagar filtrado em Hoje.

Também continuam previstos: contas a pagar vencidas, recebimentos em atraso, O.S. em aberto e caixa aberto.

### Filtros rápidos

Removido `30 dias` da Visão do Negócio para evitar sobreposição de conceito com `Mês`.

Adicionado `Mês passado` para comparação rápida.

Filtros da V1.1:

- Hoje
- Semana
- Mês
- Mês passado
- Ano

O ranking de clientes continua usando os últimos 30 dias, pois ali esse período faz sentido e é independente do filtro geral.

### Ecossistema Quality

O bloco `ERP, CRM e Site` foi removido da dashboard porque repetia navegação já disponível na barra de trabalho. O ranking de clientes passa a ocupar a largura disponível. O espaço poderá receber outro widget no futuro somente quando houver uma necessidade real.

### Inicialização do painel

O carregamento dos dados da dashboard foi medido na base enviada e leva poucos milissegundos, portanto não explica uma demora próxima de 30 segundos.

A inicialização automática do WhatsApp usa Chromium/Puppeteer e é muito mais pesada. Ela estava sendo disparada imediatamente na abertura do servidor. Nesta revisão, o servidor sobe e fica disponível primeiro; o WhatsApp continua iniciando automaticamente, mas em segundo plano 8 segundos depois.

Isso não remove nenhuma função do WhatsApp. Apenas evita que Chromium concorra com a primeira renderização do painel.

## Observação

Se ainda houver demora após esta revisão, o próximo passo recomendado é registrar tempos de inicialização por etapa (`server`, `dashboard`, `WhatsApp`, `caixa automático`) para identificar objetivamente o gargalo no computador onde o ERP está rodando.
