# Quality ERP v0.17.1.2 — Refinamento Operacional

## Objetivo
Refinar o parcelamento do PDV, a leitura do Caixa Operacional e a mensagem de conclusão dos recebimentos, mantendo a integração financeira da v0.17.1.

## Parcelamento no PDV
- Removido o campo de primeiro vencimento da tela principal.
- O botão Configurar parcelas fica alinhado junto à forma, valor e quantidade.
- O modal permite editar individualmente valor e vencimento de cada parcela.
- Incluído o comando Redistribuir igualmente.
- O modal informa total da forma, total configurado e diferença.
- A configuração só pode ser salva quando a soma das parcelas fecha com o valor da forma de pagamento.
- A configuração personalizada é persistida na operação e usada para gerar as parcelas do Contas a Receber.
- Ao finalizar sem configuração manual, o operador pode confirmar o uso de divisão igual e vencimentos automáticos mensais.
- Caso escolha voltar, o modal de parcelas é aberto para configuração.

## Contas a Receber
- A geração de títulos aceita valores personalizados por parcela.
- O serviço valida quantidade, valores positivos e soma total das parcelas.
- Quando o saldo da parcela fica zerado, a confirmação informa que a parcela foi quitada, mesmo quando o total recebido inclui juros ou multa.

## Caixa Operacional
Cards operacionais reorganizados para:
- Abertura;
- Saldo atual;
- Recebido hoje;
- Vendas em dinheiro;
- Suprimentos;
- Sangrias / despesas.

O termo Dinheiro esperado permanece somente no fechamento e no comprovante de fechamento, onde é usado para comparação com o valor contado.

A linha do tempo recebeu identificação visual para Venda, O.S., Recebimento, Suprimento, Sangria, Despesa e Estorno.

## Compatibilidade
- Não altera a geração base das operações do PDV além dos novos campos opcionais `installmentAmounts`.
- Operações antigas sem valores personalizados continuam usando divisão igual.
- Datas automáticas continuam seguindo a configuração da forma de pagamento.
- Pagamento parcial, misto, juros, multa, desconto, comprovante e integração com Caixa continuam preservados.

## Testes recomendados
1. Venda de R$ 100,00 em 3 parcelas personalizadas: R$ 50,00, R$ 25,00 e R$ 25,00.
2. Conferir os três valores e vencimentos no Contas a Receber.
3. Finalizar outra venda sem abrir o modal e aceitar datas automáticas.
4. Receber uma parcela com juros e multa e conferir a mensagem de parcela quitada.
5. Conferir Saldo atual e Recebido hoje no Caixa.
