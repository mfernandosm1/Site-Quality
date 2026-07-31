# Banco de Dados ERP

## Situação atual

Os módulos existentes utilizam principalmente arquivos JSON. Eles continuarão funcionando sem migração forçada.

## Direção recomendada

- SQLite para o ERP local;
- arquivo único e simples de copiar no backup;
- transações e integridade relacional;
- camada de acesso separada para futura migração a PostgreSQL;
- uso de `empresa_id` nas entidades empresariais desde o início.

## Decisão da v0.10.0

O banco ainda não foi criado. Primeiro serão validados:

- entidades;
- relacionamentos;
- campos obrigatórios;
- estratégia de IDs;
- auditoria;
- importação dos dados atuais.

Essa decisão evita retrabalho estrutural.
