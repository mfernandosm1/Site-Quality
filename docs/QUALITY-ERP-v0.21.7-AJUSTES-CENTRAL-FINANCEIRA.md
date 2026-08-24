# Quality ERP v0.21.7 — Ajustes Finais da Central Financeira

## Escopo

Refinamento incremental da grade de parcelas em **Central Financeira > Contas a Pagar**, preservando os serviços, dados atuais, compactação vertical e comportamento existente.

## Alterações realizadas

- Redução definitiva da largura da coluna **Parc.**.
- Agrupamento visual de seleção, ação de quebrar e número da parcela.
- Remoção do espaço vazio entre **Parc.** e **Valor**.
- Colunas de Valor, Vencimento, Forma e Caixa dimensionadas de forma compacta.
- **Observação** configurada como coluna flexível para aproveitar o espaço restante.
- **Situação** mantida totalmente visível em desktop.
- Cabeçalho e campos passam a compartilhar exatamente a mesma definição de grade.
- Compactação vertical e legenda de ações preservadas.
- Rolagem horizontal mantida somente para telas menores, abaixo de 720 px.

## Regra de origem Compra preservada

Contas originadas de compra manual ou XML continuam bloqueadas para estorno direto em Contas a Pagar. A interface apresenta orientação e acesso ao módulo Compras, e o serviço também bloqueia a operação no backend.

## Arquivos alterados ou adicionados

- `public/css/painel.css`
- `docs/QUALITY-ERP-v0.21.7-AJUSTES-CENTRAL-FINANCEIRA.md`

## Validações

- Sintaxe JavaScript do módulo de Contas a Pagar validada com `node --check`.
- Estrutura CSS revisada para Black OLED e modo claro, utilizando somente variáveis já existentes do tema.
- Nenhuma estrutura de dados ou serviço foi alterado.
