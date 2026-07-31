# Produtos / Estoque v0.11.7.1 — Ações em lote

## Arquivos
- `routes/produtos.js`
- `views/produtos.ejs`

## Novas ações
- Ativar controle de estoque nos produtos selecionados.
- Desativar controle sem apagar saldo ou histórico.
- Definir estoque mínimo em lote.
- Seleção continua limitada aos resultados filtrados visíveis.

## Segurança
Antes de cada operação em lote, o painel cria uma cópia de `products.json` em:

`C:\Site\Backup\Painel\products`

São mantidos os 10 backups mais recentes dessa operação. Se o backup falhar, nenhuma alteração é aplicada.

## Integração com estoque
Ao ativar o controle, o painel garante o `inventory.itemId`, configura o estoque mínimo e sincroniza o saldo com o Inventory Service sem apagar movimentos anteriores.

## Instalação
1. Feche o servidor do painel.
2. Faça uma cópia adicional dos arquivos atuais.
3. Substitua os dois arquivos respeitando as pastas do ZIP.
4. Inicie o painel e teste primeiro com dois produtos.
