# Quality ERP — V8 — Contas a Pagar / Tema Claro / limpeza de operações de teste

Data: 11/08/2026

## 1. Botão “Pagar selecionadas”

O botão continuava claro porque `public/css/painel-theme.css` é carregado depois de `public/css/painel.css` e possuía uma regra genérica para `.btn` que também alcançava o botão de pagamento em lote.

Correção aplicada no arquivo de tema, que é o último da cascata:

- fundo verde sólido;
- texto branco;
- ícone de confirmação;
- borda verde;
- hover e sombra próprios;
- comportamento consistente no Claro, Escuro, Black OLED e Dark Blue.

## 2. Contas a Pagar no modo Claro

Os separadores de vencimento por dia usavam fallbacks pensados para tema escuro. No tema Claro isso deixava as barras de data pretas.

Foram definidas cores específicas para o modo Claro:

- fundo cinza muito claro;
- borda clara;
- textos escuros;
- totais com contraste correto.

O Black OLED permanece com o visual escuro já existente.

## 3. Remoção de operações de teste

Removidas integralmente:

- Operação #2 — `OP-1785941466642-CCGW0`;
- Operação #23 — `OP-1786478265125-ZNBUN`.

Foram eliminadas referências em:

- Centro de Operações (`operations.json`);
- Caixa (`cash-movements.json`);
- movimentações de estoque (`inventory/movements.json`);
- logs técnicos do Kernel (`kernel/logs.json`).

A operação #23 era a venda-teste do Console PlayStation 4 Slim e havia criado:

- entrada de R$ 0,01 no Caixa;
- saída de 1 unidade do estoque do PS4.

Esses efeitos foram removidos. O estoque de `PRD-1781454733442` voltou para 1 unidade, que era o saldo imediatamente anterior à venda-teste.

Como #23 era a última operação emitida, `nextNumber` voltou para 23. A próxima operação real poderá usar o número #23. A operação #2 foi removida sem renumerar operações históricas posteriores.

## 4. Verificação

Após a limpeza, foi feita busca em todos os JSONs da pasta `data` pelos dois IDs das operações. Nenhuma referência permaneceu.

## Arquivos alterados nesta entrega

- `public/css/painel-theme.css`
- `data/erp/commerce/operations.json`
- `data/erp/commerce/cash-movements.json`
- `data/erp/inventory/movements.json`
- `data/erp/inventory/stock.json`
- `data/kernel/logs.json`
- `Readme/CORRECOES-2026-08-11-TEMA-CLARO-LIMPEZA-OPERACOES-V8.md`
