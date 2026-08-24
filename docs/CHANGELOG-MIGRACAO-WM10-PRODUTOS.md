# Changelog — Migração WM10 Produtos

## V2 — Migração + Sincronização seletiva

### Adicionado

- Modo **Sincronizar já migrados**.
- Seleção dos campos que serão importados/sincronizados.
- Preset **Cadastro recomendado**.
- Preset **Somente estoque**.
- Sincronização posterior por `Cod_produto` WM10 sem recriar cadastro.
- Integração do estoque importado com o `InventoryService`.
- Movimento de ajuste com origem `wm10_migration` ao aplicar estoque.
- Backup dos arquivos de estoque/movimentações antes de lotes que alteram saldo.
- Registro de `lastSyncAt`, usuário e campos sincronizados no vínculo WM10.

### Alterado

- Estoque agora fica **desmarcado por padrão** na importação inicial.
- Produto novo sem estoque selecionado nasce com quantidade 0 e controle de estoque desligado.
- Ao sincronizar estoque posteriormente, o controle de estoque é ativado e o saldo é registrado por movimento.
- O mesmo assistente passa a servir para migração inicial e sincronizações durante a transição WM10 → Quality.

### Mantido

- Importação parcial por lotes.
- Detecção WM10 × Quality e WM10 × WM10.
- Bloqueio de possíveis duplicidades.
- Vínculo manual com produto existente.
- Estado persistente de importado/vinculado/ignorado.
- Loja Virtual não é publicada automaticamente.

### Observação

Agrupamento automático em famílias/variações foi documentado como próxima evolução estrutural e não é executado automaticamente nesta versão.
