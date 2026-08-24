# Quality ERP v0.21.7 — Fechamento da grade financeira

## Escopo
Ajuste incremental da janela ampla do Contas a Pagar, preservando serviços, dados e regras existentes.

## Alterações
- grade refeita com colunas proporcionais e mínimos compatíveis com a largura real do modal;
- seleção, botão de quebra e número da parcela separados e alinhados;
- Valor, Vencimento, Forma e Caixa compactados sem aumentar a altura;
- Observação permanece como coluna flexível;
- Situação recebeu largura estável e texto padronizado;
- botão de parcela aberta ou parcial exibe sempre `Pagar`;
- parcela quitada exibe `Pago` em vez de alternar ícones;
- legenda preservada e adaptada para larguras menores;
- rolagem horizontal liberada somente abaixo de 760 px.

## Arquivos
- `public/css/painel.css`
- `public/js/contas-pagar.js`

## Validação
- sintaxe JavaScript validada com `node --check`;
- chaves CSS validadas;
- regras de origem Compra e estorno não foram alteradas.
