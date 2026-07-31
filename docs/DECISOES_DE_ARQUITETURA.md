# Quality — Decisões de Arquitetura

Este documento registra decisões que não devem ser alteradas casualmente.

## ERP e operação

- O Caixa Operacional pertence ao contexto do PDV, embora possua tela própria.
- O PDV atende Venda e Ordem de Serviço.
- Caixa fechado bloqueia novas operações e alterações operacionais.
- Clientes, produtos e fornecedores são cadastros mestres únicos.
- Módulos futuros devem reutilizar esses cadastros, sem criar bases duplicadas.

## Financeiro

- Toda movimentação possui origem, tipo e referência.
- O mesmo evento financeiro não pode ser lançado novamente em outro módulo.
- Caixa físico é composto apenas por dinheiro.
- Financeiro, Fluxo de Caixa, DFC e DRE consomem a mesma base de eventos.
- Fechamentos mantêm snapshot para preservar o retrato do turno mesmo após evoluções futuras.

## Desenvolvimento

- Evolução incremental.
- Estabilidade antes de novas funcionalidades.
- Correções localizadas em vez de reescritas amplas.
- Backup antes de substituições importantes.
- Mudanças que atinjam cinco ou mais arquivos centrais devem ser reconsideradas e simplificadas quando possível.
- Toda alteração aprovada deve ser documentada em `C:\Site\docs`.
