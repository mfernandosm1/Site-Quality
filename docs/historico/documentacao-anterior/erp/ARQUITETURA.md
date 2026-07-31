# Arquitetura da Fundação ERP

## Visão

O Painel Quality evoluirá de um conjunto de módulos para uma plataforma integrada.

```text
Interfaces e módulos
Site | WhatsApp | CRM | PDV | OS | Calculadora | Compatibilidade
                         ↓
                     ERP Core
                         ↓
        Entidades | Serviços | Eventos | Auditoria
                         ↓
                    Persistência
```

## Regras

1. Entidades centrais não pertencem às telas.
2. Rotas apenas recebem requisições e apresentam respostas.
3. Regras comerciais ficam em serviços reutilizáveis.
4. Integrações são documentadas antes da implementação.
5. Alterações sensíveis devem ser auditáveis.
6. A infraestrutura local não deve impedir migração futura para nuvem.

## Camadas previstas

- **Apresentação:** EJS, site, WhatsApp e futuras interfaces.
- **Aplicação:** serviços e casos de uso.
- **Domínio:** entidades e regras centrais.
- **Infraestrutura:** SQLite inicialmente; adaptadores futuros.
- **Integração:** eventos e exportadores, como ERP → Site.

## Plataforma, empresa, unidade e módulos
A arquitetura não poderá depender exclusivamente do segmento da Quality. O núcleo será genérico e seguirá a hierarquia:

Plataforma → Empresa → Unidade → Módulos

A Quality Celulares será a primeira empresa configurada. Cada módulo operacional deverá ser ativável por empresa e respeitar `empresa_id` e `unidade_id` quando o banco transacional for implantado.

Ordens de Serviço pertencem ao ERP e deverão integrar clientes, itens, estoque, garantias, financeiro e histórico.
