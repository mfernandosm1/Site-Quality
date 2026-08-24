# Quality ERP — Tooltips, Nova Conta e regra de Dinheiro — V20
Data: 12/08/2026

## Ajustes
- Tooltip das Configurações Financeiras passou a usar Popover/top-layer, ficando acima do dialog nativo.
- Plano de contas foi movido para a área superior da Nova Conta, ao lado de Caixa previsto.
- Explicações fixas de Caixa previsto, Competência e Plano de contas viraram ícones de informação.
- Texto "Informações principais do compromisso" removido.
- Texto do aprendizado alterado para "O ERP também aprende...".
- Mensagens dinâmicas de sugestão de Plano de Conta continuam aparecendo somente quando houver sugestão/seleção.
- Dinheiro é regra do ERP: Baixa automática em Vendas e em Compras/Contas a Pagar fica sempre ativada e bloqueada para edição.
- A regra de Dinheiro é garantida também no backend, portanto não depende apenas da interface.

## Arquivos alterados
- views/contas_pagar.ejs
- public/js/contas-pagar.js
- views/configuracoes_financeiro.ejs (sem alteração funcional nesta versão; não incluído no ZIP)
- public/js/financeiro-fundacao.js
- services/finance-service.js
- public/css/painel-theme.css
- Readme/CORRECAO-2026-08-12-TOOLTIPS-NOVA-CONTA-DINHEIRO-V20.md
