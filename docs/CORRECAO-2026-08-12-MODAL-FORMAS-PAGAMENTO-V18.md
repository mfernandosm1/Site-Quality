# Quality ERP — Modal amplo de Formas de Pagamento — V18
Data: 12/08/2026

## Objetivo
Melhorar a clareza e a organização da configuração de Formas de Pagamento criada na V17.

## 1. Nomenclatura
Os parâmetros foram renomeados para uma linguagem mais operacional:

- `Pago na venda` → **Baixa automática na venda**
- `Pago na compra / despesa` → **Baixa automática em compras / contas a pagar**

A mudança é apenas visual/semântica. Internamente continuam existindo os dois parâmetros independentes (`salesPaid` e `purchasePaid`), portanto a regra da V17 é preservada.

Na listagem das Formas de Pagamento, o resumo também passa a exibir:

- `Venda: Baixa automática`
- `Compras: Baixa automática`
- ou `Em aberto`, conforme a configuração.

## 2. Janela ampla
Ao editar ou criar uma Forma de Pagamento, o modal passa a usar quase toda a área útil disponível no desktop.

O modal de cadastros simples (Centro de Custo / Plano de Conta etc.) não é ampliado; a mudança é aplicada especificamente quando a seção de Forma de Pagamento está aberta.

## 3. Organização em colunas
Em desktop:

1. Onde pode ser utilizada ocupa toda a largura no topo.
2. Parâmetros de Vendas/Recebimentos e Compras/Contas a Pagar são organizados no espaço amplo.
3. Regras de atraso e Preparação fiscal/NFC-e aproveitam as colunas disponíveis.
4. O conteúdo interno passa a rolar quando necessário, mantendo cabeçalho e ações melhor organizados.

Em telas menores, o layout volta automaticamente para uma coluna.

## Arquivos alterados
- `views/configuracoes_financeiro.ejs`
- `public/js/financeiro-fundacao.js`
- `public/css/painel-theme.css`
- `Readme/CORRECAO-2026-08-12-MODAL-FORMAS-PAGAMENTO-V18.md`

## Testes recomendados
1. Abrir Configurações → Financeiro → Formas de pagamento.
2. Editar Cartão de crédito.
3. Confirmar que o modal ocupa quase toda a área útil da tela.
4. Confirmar que os blocos não ficam cortados ou excessivamente estreitos.
5. Confirmar os nomes `Baixa automática na venda` e `Baixa automática em compras / contas a pagar`.
6. Salvar e reabrir para garantir que os parâmetros da V17 continuam independentes.
