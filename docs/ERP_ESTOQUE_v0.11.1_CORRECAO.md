# ERP Estoque v0.11.1 — Correção da gravação

## Causa encontrada

A Entrega 2 calculava o diretório do estoque a partir de `PUBLIC_DIR`. Como `PUBLIC_DIR` aponta para o site público, o caminho resultante não correspondia necessariamente a `C:\Site\painel\data\erp\inventory`.

## Correção

A rota `produtos.js` agora determina a raiz do painel pela própria localização do arquivo:

```text
painel/routes/produtos.js
        ↓
painel/data/erp/inventory
```

O serviço também é mantido como uma única instância em `app.locals.inventoryService` durante a execução do painel.

## Compatibilidade

- Nenhuma alteração em `products.json` é exigida.
- Nenhuma alteração em `produtos.ejs` é exigida.
- Os JSONs existentes podem permanecer como estão.
- A primeira gravação válida preencherá `stock.json` e `movements.json`.

## Regra de ativação

A integração com o novo motor ocorre somente quando o campo **Controlar estoque deste produto** estiver marcado.
