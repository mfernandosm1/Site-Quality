# Dashboard — atalhos rápidos V1.8.0

## Objetivo
Completar e organizar a barra rápida do Centro de Operações para dar acesso direto às telas realmente usadas no dia a dia.

## Alterações
- Adicionado atalho para a listagem de **Clientes**, separado de **Novo cliente**.
- Adicionado acesso direto ao **Inbox do WhatsApp**, sem precisar abrir primeiro a área geral de automação.
- Adicionados atalhos para **Centro de Operações/Operações**, **Contagem de estoque** e **Histórico ERP**.
- Financeiro expandido com acessos diretos a **Contas a receber**, **Contas a pagar**, **Caixa / PDV**, **Fluxo de Caixa** e **DRE**.
- Produtos, Estoque, Compras e Fornecedores agora apontam para as rotas diretas já existentes no ERP.
- O seletor de atalhos foi organizado por grupos: Operação; Clientes e relacionamento; Produtos, estoque e compras; Financeiro; Loja virtual; Ferramentas; Configurações.
- Adicionada busca no seletor de atalhos, com normalização de acentos. Ex.: `cliente`, `whatsapp`, `caixa`, `dre`.
- Mantida a personalização livre da barra e a compatibilidade com atalhos já salvos.

## Arquivos alterados
- `routes/index.js`
- `views/index.ejs`
- `public/css/painel.css`

## Arquivo novo
- `Readme/CHANGELOG-DASHBOARD-ATALHOS-V1.8.0.md`
