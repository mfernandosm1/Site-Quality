# Quality ERP — UI, temas, mapa e performance — 23/08/2026

## Escopo
Refino visual sistêmico, mapa de clientes, revisão de temas Escuro/Dark Blue/OLED, barra superior global e correção do principal gargalo de navegação identificado no Kernel.

## 1. Barra superior global
- Substituída a barra vermelha variável por uma barra única e neutra em todas as telas.
- Identidade: **Quality ERP · Centro de Operações** com marca provisória `Q`, pronta para receber a logo da empresa posteriormente.
- Menu compacto inspirado no acesso rápido do WM10:
  - Início
  - Operação
  - ERP
  - Financeiro
  - CRM
  - Negócio
- Mantidos os acessos globais de tema, **Publicar** e **Ver site**.
- A rota atual recebe destaque e os menus fecham ao clicar fora/Esc.

## 2. Cores semânticas nos cards
Criado padrão reaproveitável para o ERP:
- azul: valores/entradas/itens a receber;
- vermelho: saídas, atrasos, erros e itens críticos;
- verde: concluído, pago, ativo, correto;
- dourado/âmbar: atenção, vencimentos, totais de valor;
- roxo: informação/total neutro.

Aplicado em Dashboard financeiro e também em Clientes, Fornecedores, Categorias ERP, Estoque, Contagem de estoque, Agenda, Centro de Operações, Histórico, Caixa, Contas a Receber, Contas a Pagar, Fluxo de Caixa e DRE.

## 3. Mapa / localização dos clientes
- A área continua recolhida e leve por padrão.
- Ao abrir, carrega apenas a concentração e a lista de cidades.
- A cidade selecionada mostra os clientes daquela cidade, com busca local.
- Cada cliente possui **📍 Ver no mapa**, usando o endereço cadastrado para mostrar o marcador exato sob demanda.
- Adicionado **Mapa geral** com todas as cidades que possuem clientes; cada cidade tem um marcador e o tamanho indica a concentração.
- O mapa geral só baixa a biblioteca/base geográfica quando o usuário solicita.
- Como a base atual não possui latitude/longitude individual por cliente, o mapa geral usa o centro do município. O endereço individual é resolvido apenas quando o usuário clica no cliente, evitando geocodificar milhares de endereços e deixar a Dashboard pesada.

## 4. Conferência Fortaleza/CE
A base atual contém **30 clientes ativos cadastrados em Fortaleza/CE**. Os 30 registros possuem rua e CEP preenchidos; portanto o número exibido não veio de erro de agrupamento da Dashboard.

## 5. Temas Escuro / Dark Blue / Black OLED
- Adicionados aliases globais para componentes que ainda usavam variáveis antigas.
- Corrigidos cartões/formulários que ficavam claros em tema escuro, principalmente Categorias ERP e Fluxo de Caixa.
- Reforçada a compatibilidade de Automação WhatsApp, Analytics e Configurações de clientes com os três temas escuros.
- Inputs de data, busca, selects, superfícies e bordas passam a respeitar a paleta atual.

## 6. Performance / fluidez
### Gargalo encontrado
`data/kernel/logs.json` estava com aproximadamente **26 MB / 33.530 registros**.

O comportamento anterior fazia, em cada clique rastreado:
1. uma requisição extra para `/kernel/client-event`;
2. leitura síncrona de todo o JSON de logs;
3. parse de todo o arquivo;
4. inclusão de um registro;
5. regravação síncrona de todo o arquivo.

Em teste local com a base recebida, uma única gravação antiga levou aproximadamente **1,45 s**, suficiente para bloquear o processo Node e atrasar a navegação seguinte.

### Alterações
- cliques comuns não geram mais telemetria HTTP;
- GET/page view comum não vira mais log operacional;
- mutações e erros HTTP continuam registrados;
- LogService mantém os logs recentes em memória;
- persistência agrupada e assíncrona;
- limite de 5.000 logs recentes;
- ao iniciar pela primeira vez, o arquivo grande é compactado para os últimos 5.000 registros;
- CKEditor global removido do layout (editores específicos continuam carregando o próprio editor apenas onde necessário).

Teste do novo LogService com a mesma base: gravação em memória ficou na ordem de **1 ms**; o arquivo compactado ficou em torno de **2,9 MB**.

## Arquivos alterados
- `views/layout.ejs`
- `views/index.ejs`
- `views/clientes.ejs`
- `views/fornecedores.ejs`
- `views/erp_categories.ejs`
- `views/estoque.ejs`
- `views/estoque_contagem.ejs`
- `views/agenda.ejs`
- `views/centro_operacoes.ejs`
- `views/erp_historico.ejs`
- `views/financeiro_fundacao.ejs`
- `views/contas_receber.ejs`
- `views/contas_pagar.ejs`
- `views/caixa.ejs`
- `views/fluxo_caixa.ejs`
- `views/dre.ejs`
- `public/css/painel.css`
- `public/css/painel-theme.css`
- `public/js/dashboard.js`
- `public/js/kernel-tracker.js`
- `routes/index.js`
- `services/kernel/log-service.js`
- `services/kernel/request-logger.js`
- `server.js`

## Observação de implantação
Após substituir os arquivos, reinicie o Quality ERP. A primeira inicialização pode levar um pouco mais apenas uma vez, pois o `logs.json` antigo é compactado; depois disso a navegação deixa de sofrer o custo de regravar dezenas de MB a cada clique.
