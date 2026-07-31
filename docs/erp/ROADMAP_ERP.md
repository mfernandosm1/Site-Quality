# ROADMAP ERP — Projeto Painel Quality

## Princípio central

Nenhum módulo será desenvolvido antes de desenhar sua integração com o restante do ERP.

O ERP será a fonte central dos dados. Site, WhatsApp, CRM, PDV, estoque, financeiro, compatibilidade e calculadora serão interfaces ou consumidores dessa base.

## v0.10.0 — Fundação ERP

- criar a área ERP e sua navegação;
- registrar arquitetura, entidades e integrações;
- reservar a estrutura do ERP Core;
- preparar abordagem multiempresa;
- preservar integralmente os módulos estabilizados;
- definir a estratégia ERP → Site;
- não concluir módulos operacionais.

## Próximas fases sugeridas

### v0.10.x — Modelo de dados
- validar entidades e relacionamentos;
- criar dicionário de dados;
- definir identificadores, auditoria e empresa_id;
- validar SQLite como banco local.

### v0.11.x — Cadastro Mestre de Produtos
- importar produtos atuais do site;
- cadastro central de produto e variações;
- integração planejada com estoque, orçamento, PDV, WhatsApp e site;
- sincronização ERP → products.json com prévia e estados de publicação.

### v0.12.x — Clientes
- unificação CRM/WhatsApp/ERP;
- histórico comercial e de atendimento;
- vínculos com vendas, orçamentos, OS e financeiro.
