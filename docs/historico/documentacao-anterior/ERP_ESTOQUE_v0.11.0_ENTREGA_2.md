# ERP Estoque v0.11.0 — Entrega 2

## Objetivo
Integrar o Cadastro Mestre de Produtos ao `InventoryService` sem interromper o site ou as funções atuais do painel.

## Funcionalidades
- Ativação do controle de estoque por produto.
- Entrada inicial ao ativar e informar quantidade.
- Ajustes posteriores registrados como movimentações.
- Saldo físico consultado do `stock.json` ao abrir Produtos.
- Estoque mínimo persistido.
- Preparação das políticas: venda zerada, compartilhamento/limite do site e reserva física.
- Identidade estável para produto e combinações de variação.

## Regra de compatibilidade
O campo `stock` de `products.json` continua como espelho temporário. Isso evita quebrar site, filtros e indicadores existentes enquanto os demais módulos são migrados gradualmente.

## Teste mínimo
1. Escolha um produto não crítico.
2. Ative o controle e informe `3`.
3. Salve e confira uma movimentação de ajuste/entrada.
4. Altere para `5`.
5. Confirme nova movimentação de `+2`, sem apagar a anterior.
