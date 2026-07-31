# Quality ERP v0.15.0 — Kernel do Sistema

## Objetivo
Criar uma fundação transversal para rastreabilidade, eventos, auditoria, documentos universais e timelines, sem reescrever os módulos operacionais já estáveis.

## Componentes implantados
- `services/kernel/kernel-service.js`: fachada central.
- `log-service.js`: acessos, páginas, interações e operações HTTP.
- `event-service.js`: eventos de domínio e sistema.
- `audit-service.js`: alterações críticas com estado anterior e posterior.
- `document-service.js`: registros universais com prefixos por tipo.
- `timeline-service.js`: histórico por entidade.
- `request-logger.js`: middleware global de captura segura.
- `public/js/kernel-tracker.js`: cliques operacionais e envio de formulários.
- `routes/kernel.js` e `views/kernel_dashboard.ejs`: consulta administrativa.

## Dados
Os dados ficam em `painel/data/kernel/`:
`logs.json`, `events.json`, `audits.json`, `documents.json`, `timelines.json` e `counters.json`.

## Regras de segurança
- Não grava conteúdo digitado em campos.
- Não grava senhas, tokens, mídia, base64 ou segredos.
- Registra somente nomes de campos recebidos em operações HTTP.
- Ignora arquivos estáticos.
- O usuário atual aparece como `painel` até a implantação de autenticação real.

## Cobertura inicial
- Inicialização e encerramento do servidor.
- Acesso a páginas HTML de todos os módulos.
- POST, PUT, PATCH e DELETE de todos os módulos.
- Cliques em links, botões e controles operacionais.
- Envio de formulários.
- IP, user-agent, rota, duração e resultado HTTP.

## Próxima etapa incremental
Instrumentar eventos de domínio explícitos nos serviços estáveis, começando por PDV/Caixa, Clientes, Fornecedores e Estoque. Exemplos: `SALE_COMPLETED`, `CASHBOX_OPENED`, `CUSTOMER_UPDATED` e `STOCK_MOVED`.
