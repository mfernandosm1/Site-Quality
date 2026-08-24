# Correção — Prosseguir com operação vazia no PDV

## Problema
Ao clicar em **Prosseguir com venda #XX** no aviso de operação vazia, nada acontecia.

## Causa
O clique chamava uma função `hide()` que não existe no script atual do PDV. Isso interrompia o handler com erro JavaScript antes de fechar o modal ou navegar para a operação existente.

## Correção
- O modal agora é fechado diretamente usando a propriedade `hidden` do elemento.
- Se a venda vazia já for a operação atualmente carregada, o aviso simplesmente fecha e o usuário continua nela.
- Se a venda vazia for outra operação, o PDV navega explicitamente para essa venda em aberto.
- O comportamento de **Criar nova mesmo assim** foi mantido.
