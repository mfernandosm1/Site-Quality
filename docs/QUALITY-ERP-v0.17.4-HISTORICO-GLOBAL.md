# Quality ERP v0.17.4 — Histórico Global do ERP

Data: 28/07/2026

## Objetivo

Criar uma consulta operacional amigável para os registros já armazenados pelo Kernel do Painel Quality, sem duplicar bancos de dados e sem alterar as regras do PDV, Caixa, Estoque ou Financeiro.

## Nova área

Rota: `/erp/historico`

A tela foi adicionada ao ERP com o nome **Histórico do ERP** e reúne três fontes existentes:

- Atividades (`logs.json`)
- Timeline (`timelines.json`)
- Auditorias (`audits.json`)

A área técnica anterior continua disponível em `/kernel`. A nova tela é uma visão operacional e não substitui a Administração do Sistema.

## Recursos implantados

- Pesquisa global por descrição, ação, usuário, documento, entidade, rota e detalhes registrados.
- Filtros por módulo, tipo de registro, resultado, usuário e período.
- Indicadores de registros encontrados, atividades de hoje, auditorias, erros e usuários envolvidos.
- Timeline cronológica unificada.
- Identificação visual de atividade, timeline, auditoria e erro.
- Paginação para evitar carregamento excessivo da interface.
- Painel lateral com detalhes completos do registro.
- Comparação de valor anterior e novo nos registros de auditoria.
- Atalho no Centro de Operações.
- Card ativo no Dashboard ERP.

## Arquivos novos

- `services/erp-history-service.js`
- `views/erp_historico.ejs`
- `docs/QUALITY-ERP-v0.17.4-HISTORICO-GLOBAL.md`

## Arquivos alterados

- `routes/erp.js`
- `views/centro_operacoes.ejs`
- `public/css/painel-theme.css`

## Decisões de arquitetura

1. Não foi criado um novo JSON de histórico.
2. A tela lê somente as fontes oficiais do Kernel.
3. O serviço de histórico é somente de consulta nesta versão.
4. Nenhuma rota de gravação do PDV ou Financeiro foi modificada.
5. O detalhamento técnico completo continua preservado em `/kernel`.

## Teste recomendado

1. Iniciar o painel normalmente.
2. Abrir `ERP > Histórico do ERP`.
3. Conferir se os registros existentes aparecem em ordem cronológica.
4. Testar pesquisa por `PDV`, nome de usuário ou número de documento.
5. Testar os filtros de período, módulo e tipo.
6. Abrir `Ver detalhes` e fechar pelo X, pelo fundo escuro e pela tecla Esc.
7. Conferir os temas Claro, Escuro, Black OLED e Dark Blue.
8. Abrir o Centro de Operações e testar o novo botão `Histórico do ERP`.

## Próximas evoluções planejadas

- Timeline especializada para venda e O.S., relacionando eventos pelo ID da operação.
- Histórico financeiro dentro da ficha do cliente.
- Links inteligentes para abrir diretamente venda, O.S., cliente, produto ou recebimento relacionado.
- Tradução progressiva das ações técnicas para descrições operacionais mais específicas.
