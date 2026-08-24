# Quality ERP — V7 — Estoque legado no PDV + botão de pagamento em lote

Data: 11/08/2026

## 1. Correção de produtos antigos no estoque do PDV

### Problema encontrado

O produto **Console PlayStation 4 Slim 1TB Sony Usado (PRD-61 / QLT-733442)** possuía saldo físico correto de 1 unidade no estoque ERP, registrado no item:

`PRD-1781454733442`

Porém uma operação do PDV criada com estrutura antiga ainda carregava:

`1781454733442`

como `inventoryItemId`.

Na finalização, o PDV priorizava o identificador salvo na operação. Com isso consultava um item de estoque inexistente e retornava saldo 0, mesmo com 1 unidade registrada corretamente.

### Correção

Para **produto simples**, a finalização passa a utilizar como fonte de verdade o `inventory.itemId` atual do cadastro do produto.

Para **produto com variações**, permanece sendo utilizada a identidade física da combinação selecionada.

Quando uma operação antiga chega com identidade legada, o PDV normaliza automaticamente o item antes de concluir e persiste a identidade correta na operação. Isso também garante que um futuro estorno retorne o saldo ao mesmo item físico usado na venda.

A mesma compatibilidade foi aplicada ao caminho de estorno.

### Revisão dos dados atuais

Foi feita uma varredura nas operações e saldos presentes no ZIP recebido procurando operações cujo `inventoryItemId` não existe, mas possui correspondente `PRD-<id>` no estoque.

Foi encontrado **1 caso**, referente ao PlayStation 4 informado. A correção foi feita no código para proteger os demais produtos legados que possam apresentar o mesmo cenário futuramente.

Observação: nenhum arquivo histórico de venda/estoque foi sobrescrito nesta entrega. A correção atua nas próximas finalizações e normaliza a operação quando ela for processada.

## 2. Botão “Pagar selecionadas”

O botão de pagamento múltiplo do Contas a Pagar recebeu estilo próprio para ficar claramente identificável como ação:

- fundo verde;
- texto branco;
- ícone de confirmação `✓`;
- borda verde;
- preenchimento e altura de botão;
- hover com destaque;
- sombra discreta compatível com Black OLED.

O comportamento funcional do pagamento em lote não foi alterado.

## Arquivos alterados

- `routes/erp.js`
- `public/css/painel.css`
- `Readme/CORRECOES-2026-08-11-ESTOQUE-LEGADO-BOTAO-PAGAMENTO-V7.md`
