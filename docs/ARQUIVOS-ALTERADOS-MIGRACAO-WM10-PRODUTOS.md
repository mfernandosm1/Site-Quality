# Arquivos desta entrega

Este ZIP contém somente arquivos novos ou alterados em relação ao painel enviado.

## Alterados

- `routes/produtos.js`
  - passa o Inventory Service ao assistente;
  - aceita seleção de campos na importação;
  - adiciona rota de sincronização seletiva.

- `views/produtos.ejs`
  - mantém o acesso ao Assistente de Migração WM10 criado na entrega anterior.

## Novos / substituição da entrega anterior

- `services/wm10-product-import-service.js`
  - importação parcial;
  - estado da migração;
  - comparação e duplicidades;
  - campos seletivos;
  - sincronização posterior;
  - estoque via Inventory Service e histórico de ajuste.

- `views/produtos_importar_wm10.ejs`
  - interface de Migração e Sincronização;
  - presets Cadastro recomendado / Somente estoque;
  - seleção por lotes e filtros.

- `Readme/ASSISTENTE-MIGRACAO-WM10-PRODUTOS.md`
- `Readme/CHANGELOG-MIGRACAO-WM10-PRODUTOS.md`
- `Readme/ARQUIVOS-ALTERADOS-MIGRACAO-WM10-PRODUTOS.md`

## Não incluídos

Arquivos de dados (`data/...`) e backups não fazem parte deste ZIP. Eles são criados pelo sistema em execução quando necessário.
