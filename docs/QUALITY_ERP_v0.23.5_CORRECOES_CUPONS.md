# Quality ERP v0.23.5 — Correções Visuais, Nome Atual no Caixa e Cupons

## Alterações
- Corrigido contraste no tema Black OLED (`data-panel-theme=oled`) em Análise de Crédito, Carteira e Histórico.
- Caixa Operacional passa a resolver o nome atual pelo `customerId`, preservando o nome histórico internamente.
- Removidos do topo do PDV o indicador técnico `v0` e o botão redundante Histórico.
- Criado cadastro de cupons em Configurações → Cupons de desconto.
- Cupom fixo ou percentual pode ser aplicado no PDV antes dos pagamentos.
- Registro da operação guarda código, nome, regra e valor efetivo do desconto.
- Caixa registra apenas o valor efetivamente recebido; cupom não cria movimentação separada.
- Impressão da operação mostra o cupom utilizado.
- Estrutura mantém subtotal, desconto de itens, desconto de cupom e total separados para futuro módulo fiscal.

## Arquivos
- services/coupon-service.js (novo)
- services/commerce-service.js
- routes/configuracoes.js
- routes/erp.js
- views/configuracoes.ejs
- views/configuracoes_cupons.ejs (novo)
- views/pdv.ejs
- views/clientes.ejs
- public/css/painel.css

## Testes
1. Testar Análise, Carteira e Histórico em Claro e Black OLED.
2. Renomear cliente e conferir o nome atual no Caixa.
3. Criar cupom fixo e percentual.
4. Aplicar cupom no PDV e conferir total/pagamentos.
5. Salvar em aberto, reabrir e conferir o cupom.
6. Finalizar e conferir impressão e Caixa.
7. Confirmar que o Caixa recebeu apenas o total líquido.
