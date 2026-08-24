# Quality ERP — Agenda, Dashboard e localização de clientes

Data: 23/08/2026

## Agenda sem recarregar a página

- Cadastro de nova tarefa passa a ser processado em segundo plano.
- Cadastro e exclusão de responsáveis passam a atualizar somente o conteúdo da Agenda, mantendo a posição de rolagem e o painel de Configurações aberto.
- Cadastro e exclusão de tipos de compromisso seguem o mesmo comportamento.
- Concluir/excluir itens da Agenda também usa o fluxo sem F5 completo.
- Mensagens de sucesso/erro aparecem como aviso temporário no canto da tela.
- As rotas da Agenda continuam compatíveis com o fluxo tradicional por redirect, mas respondem JSON quando chamadas pela interface assíncrona.

## Responsáveis

- Um responsável removido não fica mais disponível no seletor de responsável de uma nova tarefa.
- Responsáveis antigos ainda podem aparecer nos filtros/histórico caso existam tarefas preservadas vinculadas a eles.
- A cor sugerida ao cadastrar um novo responsável passa a alternar pela paleta da Agenda em vez de usar sempre azul.
- Reforçado o contraste das cores nas colunas, filtros e cards da Dashboard para facilitar a diferenciação visual entre responsáveis.

## Agenda na Dashboard

- Cada compromisso ganhou botão `Ver mais`.
- Ao expandir, o título deixa de ser truncado e são exibidos data/hora, prioridade, cliente vinculado e observações, sem precisar abrir a Agenda.
- Compromissos atrasados recebem indicação `🚩 Atrasada` e borda vermelha discreta.
- Mantido o link opcional `Abrir na agenda` dentro dos detalhes.

## Cards financeiros da Dashboard

- `Contas a receber`: texto alterado para `Total em aberto no período` e destaque azul.
- `Contas a pagar`: texto alterado para `Total em aberto no período` e destaque vermelho.
- `Contas pagas`: destaque verde.
- Faturamento permaneceu sem alteração de cor.

## Localização dos clientes

- Adicionada seção recolhida `📍 Localização dos clientes` no final da Dashboard.
- Nenhum recurso de mapa é carregado durante a abertura normal da Dashboard.
- Somente ao expandir a seção o sistema consulta os clientes ativos e agrupa a concentração por `Cidade/UF`.
- A lateral mostra ranking de cidades, quantidade de clientes com cidade informada e quantidade sem cidade cadastrada.
- O mapa visual usa Leaflet + OpenStreetMap e localização aproximada das principais cidades via Photon, sem necessidade de chave de Google Maps.
- São posicionadas no mapa as 10 cidades com maior concentração, com círculos proporcionais à quantidade de clientes.
- Coordenadas localizadas são guardadas no `localStorage` do navegador para reduzir consultas futuras.
- Caso o serviço externo de mapa/geolocalização esteja indisponível, a Dashboard continua funcionando e o ranking local por cidade permanece disponível.

## Arquivos alterados

- `routes/erp.js`
- `routes/index.js`
- `views/agenda.ejs`
- `views/index.ejs`
- `public/js/dashboard.js`
- `public/css/painel.css`
