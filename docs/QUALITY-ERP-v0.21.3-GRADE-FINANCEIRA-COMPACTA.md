# Quality ERP v0.21.3 — Grade Financeira Compacta

## Objetivo

Reduzir a rolagem e o espalhamento visual da Central Financeira do Contas a Pagar, preservando o visual Quality ERP e aproximando a operação da agilidade observada no WM10.

## Ajustes realizados

- grade de parcelas mais compacta;
- remoção dos botões grandes “Salvar linha” e “Quebrar”;
- ícone `−` ao lado de cada parcela para quebrá-la;
- ícone `↻` ao lado do valor para atualizar a parcela;
- ícone `+` no lado esquerdo do cabeçalho para juntar parcelas selecionadas;
- ajuda/legenda recolhida no botão `?`;
- cabeçalho único das colunas para evitar repetição de rótulos em cada parcela;
- redução de alturas, margens, espaçamentos e tamanhos de controles;
- retirada da largura mínima fixa que causava rolagem horizontal desnecessária em telas desktop;
- manutenção da rolagem horizontal apenas em telas realmente estreitas;
- refinamento adicional do modo claro para grade, ícones e legenda.

## Comportamento mantido

- quebra de parcela;
- atualização de valor, vencimento, forma e observação;
- seleção e junção de parcelas;
- pagamento e estorno por parcela;
- competências e histórico recolhidos;
- logs e integrações financeiras existentes.

## Arquivos alterados

- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `public/css/painel-theme.css`

## Validação

- sintaxe de `public/js/contas-pagar.js` validada com `node --check`.
