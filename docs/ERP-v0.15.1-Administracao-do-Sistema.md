# Quality ERP v0.15.1 — Administração do Sistema

## Objetivo
Evoluir o Kernel v0.15.0 sem alterar os módulos operacionais estáveis. A tela de Logs passa a oferecer pesquisa, filtros, paginação, detalhes e exportação CSV. Configurações passa a concentrar o acesso administrativo.

## Implantado
- Filtros por pesquisa, módulo, ação, resultado e período.
- Paginação dos registros.
- Exportação CSV dos logs filtrados.
- Painel lateral com detalhes técnicos do registro.
- Perfis-base de permissões: Administrador, Gerente, Vendedor, Assistência, Financeiro, Estoque e Somente leitura.
- Fundação do Centro de Documentos preservada.
- Atalhos administrativos em Configurações.

## Limite de segurança desta versão
Os perfis de permissão são apenas a estrutura de dados. Eles ainda não bloqueiam rotas porque o painel não possui autenticação, usuários e sessões. A ativação ocorrerá na versão de login, evitando uma falsa sensação de segurança.

## Arquivos alterados
- `routes/kernel.js`
- `views/kernel_dashboard.ejs`
- `views/configuracoes.ejs`
- `services/kernel/log-service.js`
- `services/kernel/kernel-service.js`
- `public/css/painel-theme.css`

## Arquivos novos
- `services/kernel/permission-service.js`
- `data/kernel/permissions.json`

## Compatibilidade
Nenhum arquivo de PDV, Caixa, Estoque, Clientes, Produtos, Fornecedores, WhatsApp ou Site foi alterado.
