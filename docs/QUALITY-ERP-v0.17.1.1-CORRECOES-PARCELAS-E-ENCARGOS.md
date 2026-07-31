# Quality ERP v0.17.1.1 — Correções de Parcelas e Encargos

## Objetivo
Correção incremental após os testes da v0.17.1.

## Ajustes
- O PDV mantém apenas o primeiro vencimento na linha principal.
- Parcelamentos com mais de uma parcela exibem o botão **Configurar parcelas**.
- A janela mostra todas as parcelas, valores proporcionais e vencimentos editáveis.
- Os vencimentos personalizados seguem da operação até a criação do Contas a Receber.
- A finalização é bloqueada com mensagem quando os vencimentos não foram configurados.
- Ao informar juros, multa ou desconto no recebimento, o valor da forma única de pagamento é recalculado automaticamente.
- O cálculo nunca exibe valor negativo aplicado ao saldo.
- Quando o pagamento não cobre os encargos, o sistema explica o motivo do bloqueio.
- Pagamento parcial e pagamento misto continuam disponíveis.

## Implantação
Copiar os arquivos mantendo a estrutura dentro de `C:\Site\painel`.
Copiar esta documentação para `C:\Site\docs`.

## Arquivos alterados
- `views/pdv.ejs`
- `public/css/painel-theme.css`
- `public/js/contas-receber.js`
- `services/commerce-service.js`
- `services/receivables-service.js`
