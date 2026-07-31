# ERP v0.15.2 — Centro de Operações

## Objetivo
Centralizar a consulta de Vendas e Ordens de Serviço sem duplicar os dados do PDV.

## Estrutura criada
- `services/operations-center-service.js`: consolida operação, cliente, caixa, estoque e histórico.
- `views/centro_operacoes.ejs`: pesquisa, filtros, listagem e ficha lateral completa.
- rota `GET /erp/centro-operacoes` em `routes/erp.js`.
- estilos isolados no final de `public/css/painel-theme.css`.

## Regras
- Operações abertas só podem ser continuadas no PDV quando o caixa correspondente está aberto.
- Se o caixa estiver fechado, a ação conduz primeiro à abertura do caixa.
- Operações concluídas e canceladas são abertas em modo de consulta.
- Nenhum dado financeiro ou operacional é duplicado; a tela lê as fontes existentes.

## Filtros iniciais
Número/cliente/documento/telefone/produto, tipo, situação, caixa, período de abertura e vendedor.

## Integrações exibidas
Itens, pagamentos, caixa, estoque, O.S., anexos e timeline/auditoria da operação.


## Ajuste v0.15.2.1
- Corrigida comparação de datas para registros gravados em ISO ou no formato brasileiro.
- Removidos parâmetros duplicados ao abrir e fechar a ficha da operação.
- Adicionado seletor de período rápido: Hoje, Ontem, Esta semana, Últimos 7 dias, Este mês, Mês anterior, Últimos 30 dias, Este ano e Limpar período.


## v0.15.2.2 — correção do período

- Corrigida a comparação de timestamps ISO em UTC com a data local exibida no painel.
- Operações exibidas em 27/07 não entram mais no filtro exclusivo de 28/07.
- O menu de períodos rápidos foi movido para uma seta discreta dentro do campo `Até`.

## v0.15.2.3 — QuickDatePicker global

Foi criado o componente reutilizável `public/js/quick-date-picker.js`.

- Setas de período rápido nos campos **De** e **Até**.
- Modo `operations`, sem períodos futuros desnecessários.
- Modo `financial`, preparado para Amanhã, Próxima semana e próximos 30/60/90 dias.
- Separadores visuais, intervalo exibido em cada opção e destaque da opção selecionada.
- O componente preenche o período completo independentemente da seta utilizada.

Exemplo para telas operacionais:

```javascript
QualityQuickDatePicker.init({
  wrapper: '.meu-filtro-periodo',
  from: '#dataDe',
  to: '#dataAte',
  mode: 'operations'
});
```

Exemplo para o futuro Financeiro:

```javascript
QualityQuickDatePicker.init({
  wrapper: '.meu-filtro-periodo',
  from: '#vencimentoDe',
  to: '#vencimentoAte',
  mode: 'financial'
});
```


## v0.15.2.4 — Ajuste do seletor rápido

- Setas rápidas separadas do ícone nativo do calendário, evitando sobreposição de cliques.
- Campos De e Até novamente alinhados lado a lado em telas maiores.
- Menu rápido posicionado junto à seta clicada.
- Em telas menores, os campos passam para uma coluna.

## v0.15.2.5 — Correção de carregamento
- Corrigido o caminho público do componente QuickDatePicker de `/js/` para `/public/js/`.
- A seta de períodos rápidos passa a carregar o JavaScript corretamente.

## v0.15.2.6 — Refinamentos operacionais

- Cards de situação agora funcionam como filtros rápidos.
- Ordenação por número, cliente, abertura e valor diretamente no cabeçalho.
- Preservação da posição de rolagem ao abrir ficha, ordenar ou trocar filtro rápido.
- Fechamento da ficha sem recarregar a listagem, inclusive por clique no fundo ou tecla Esc.
- Ações rápidas na ficha: abrir cliente, copiar número e imprimir ficha.
- Correção consolidada do filtro por data local para timestamps gravados em UTC.
