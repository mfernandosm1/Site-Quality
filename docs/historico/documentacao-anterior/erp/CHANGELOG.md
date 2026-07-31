# CHANGELOG — ERP Quality

## v0.10.0 — Fundação ERP

### Adicionado
- nova área `/erp`;
- dashboard estrutural do ERP;
- mapa inicial dos módulos;
- páginas informativas por módulo;
- acesso ERP no menu superior e na Home;
- manifesto `data/erp/foundation.json`;
- estrutura reservada `painel/erp/core`, `painel/erp/modules` e `painel/erp/database`;
- documentação inicial da arquitetura, entidades, eventos, banco e integrações.

### Decisões
- nenhum módulo operacional será concluído nesta versão;
- o ERP será a fonte principal de produtos;
- o site continuará estático e receberá dados exportados pelo ERP;
- SQLite é a opção indicada para a fase local, mas sua implantação aguarda validação do modelo;
- tabelas centrais serão preparadas para multiempresa;
- regras de negócio não deverão ficar presas às rotas ou telas.

### Preservado
- Site;
- WhatsApp, Inbox e CRM;
- Analytics;
- Central de Mídias;
- Marketing;
- Sorteios;
- publicação atual;
- acesso por Tailscale.

## v0.10.0 — Entrega incremental 2
- Dashboard Geral reorganizada como Centro de Operações.
- Menu principal reduzido e agrupado por áreas.
- Criados centros de CRM, Site, Marketing e Ferramentas.
- Criada Fundação de Configurações da Empresa.
- Registrada a separação Plataforma → Empresa → Unidade → Módulos.
- Ordens de Serviço mantidas dentro da área ERP.
