# Quality ERP v0.21.2 — Central Financeira em Janela Ampla

## Objetivo
Substituir a abertura lateral da conta por uma janela central ampla, adequada à quantidade de informações e à operação direta das parcelas.

## Alterações
- Central Financeira passa a abrir em modal amplo, semelhante ao cadastro de nova despesa.
- Largura e altura utilizam quase toda a área útil da tela.
- Resumo permanece visível no topo durante a rolagem.
- Grade de parcelas ganhou mais espaço horizontal e rolagem própria somente quando necessária.
- Totalizador duplicado inferior foi ocultado para reduzir repetição visual.
- Correções específicas para modo claro em superfícies, textos, bordas, inputs, selects, histórico e competências.
- Black OLED preservado.

## Arquivos alterados
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `public/css/painel-theme.css`

## Testes rápidos
1. Abrir Contas a Pagar e clicar em uma conta com várias parcelas.
2. Confirmar que a Central abre centralizada e ocupa quase toda a tela.
3. Conferir valor, vencimento, forma, caixa, observação e ações sem corte lateral.
4. Alternar entre Black OLED e modo claro.
5. Fechar pelo X, pelo fundo escuro e pela tecla Esc.
6. Abrir Nova Conta e confirmar que o modal de cadastro continua funcionando normalmente.
