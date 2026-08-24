# Ajuste — Comprovantes O.S. / Produtos e Serviços

## Objetivo
Melhorar a leitura da tabela de produtos/serviços na impressão térmica das O.S. de entrada e saída, sem alterar o comprovante de venda.

## Alterações
- Aplicado somente aos modelos de **O.S. Entrada** e **O.S. Saída**.
- Primeira linha de cada item: **Cód. + Produto**.
- Segunda linha: **Qtd. | Unit. | Desc. | Total**.
- As quatro colunas inferiores usam larguras fixas e alinhamento numérico consistente.
- Valores monetários permanecem em uma única linha (`white-space: nowrap`).
- O nome do produto pode quebrar linha livremente para preservar espaço para os valores.
- O comprovante de venda mantém o layout anterior.
- O mesmo padrão é usado na pré-visualização e na impressão real.

## Arquivos alterados
- `public/js/erp-print-renderer.js`
- `routes/erp.js`
- `views/configuracoes_comprovantes.ejs`
- `data/erp/settings/print-models.json`
