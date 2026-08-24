# Quality ERP v0.23.6 — Central de Recebimentos, Crediário e Cupons

## Objetivo

Consolidar o fluxo de Contas a Receber e crediário do cliente sobre a fundação existente, reutilizando o padrão operacional de Contas a Pagar e preservando os dados atuais.

## Central de Recebimentos

- A ficha do título reúne operação de origem, cliente, produtos/serviços, parcelas, recebimentos, saldo, observações e timeline.
- As situações são apresentadas em português: Em aberto, Parcial, Recebido, Cancelado e Estornado.
- O recebimento aceita baixa total ou parcial, juros, multa, desconto e múltiplas formas de pagamento.
- O operador escolhe explicitamente um caixa aberto. Caixas fechados aparecem bloqueados.
- Cada recebimento gera comprovante e pode ser impresso ou compartilhado pelo WhatsApp.

## Estorno de recebimento

O estorno nunca exclui registros.

Fluxo técnico:

1. exige motivo e confirmação;
2. exige que o mesmo caixa do recebimento esteja aberto;
3. gera movimento inverso no Caixa com referência ao recebimento original;
4. marca entradas, pagamentos e movimentos financeiros vinculados como `reversed`;
5. recompõe o saldo das parcelas conforme as alocações originais;
6. recalcula a situação do título;
7. registra data, usuário, motivo e movimentos de reversão no histórico.

Arquivos persistidos preservados:

- `data/erp/finance/receivables.json`
- `data/erp/finance/receivable-installments.json`
- `data/erp/finance/receipts.json`
- `data/erp/finance/receivable-events.json`
- `data/erp/finance/entries.json`
- `data/erp/finance/payments.json`
- `data/erp/finance/movements.json`
- movimentos do Caixa em `data/erp/commerce`

## Crediário do cliente

A central utiliza sempre o nome atual do cadastro do cliente na consulta, mantendo o nome histórico da operação como snapshot interno. O resumo financeiro apresenta títulos, saldo aberto, saldo vencido, recebimentos e títulos recentes.

## Cupons

A fundação oficial de cupons permanece no `CouponService`:

- código único;
- nome e descrição;
- desconto fixo ou percentual;
- período de validade;
- ativo/inativo;
- compra mínima;
- desconto máximo;
- limite de utilizações;
- contador e histórico por operação.

No PDV, o cupom é validado antes da finalização, gravado na operação e registrado como utilizado somente após a conclusão. O Caixa recebe o valor financeiro líquido da operação; a origem promocional permanece no histórico da operação, sem exigir exposição em futura NF.

## Detalhes da operação

O campo foi mantido no serviço existente e refinado para textarea em largura total, com ação de salvar alinhada. O conteúdo continua disponível para impressão, consulta da operação e histórico.

## Compatibilidade e segurança

- Nenhuma migração destrutiva foi adicionada.
- Registros antigos sem campos de estorno continuam legíveis.
- Operações idempotentes evitam duplicidade de movimentos de Caixa.
- Contas a Pagar não foi reescrito.
- Black OLED e modo Claro recebem regras específicas para ações e cartões de recebimento.

## Testes recomendados

1. Abrir um título com parcela em aberto.
2. Receber parcialmente usando duas formas de pagamento e selecionar um caixa aberto.
3. Imprimir o comprovante e abrir o compartilhamento por WhatsApp.
4. Conferir Caixa, Financeiro e saldo da parcela.
5. Estornar o recebimento informando um motivo.
6. Confirmar que o registro permanece visível como Estornado, o saldo volta e o Caixa recebe o movimento inverso.
7. Repetir em Black OLED e modo Claro.
8. Aplicar um cupom no PDV, finalizar e conferir operação, Caixa e contador de utilização.


## Correção incremental v0.23.6.1
- botão Movimentações do PDV convertido em navegação direta, independente do JavaScript da operação;
- ficha do Contas a Receber ampliada para o padrão de janela central do Contas a Pagar;
- abertura automática do título informado por `?titulo=`;
- crediário com situações traduzidas e abertura da ficha completa em nova aba;
- refinamentos de contraste e responsividade em Black OLED e modo Claro.
