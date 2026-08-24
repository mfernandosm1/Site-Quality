# v0.10.16 — Contas a Pagar / Inbox

## Contas a Pagar
- Reorganizados os filtros avançados: período em uma linha e Forma prevista, Classificação financeira e Fornecedor alinhados lado a lado.
- Classificação financeira deixou de ocupar largura excessiva.
- Forma prevista, Classificação financeira e Fornecedor agora aceitam seleção múltipla, no mesmo padrão visual do Fluxo de Caixa.
- A API/serviço de Contas a Pagar passou a aceitar múltiplos `paymentMethodId`, `accountId` e `supplierId` na mesma consulta.
- O resumo de filtros e o botão Limpar foram adaptados aos novos filtros múltiplos.

## CRM / Inbox
- Corrigida a navegação sem recarregar quando o Inbox é aberto sem uma conversa selecionada.
- Ao clicar na primeira conversa, o placeholder “Selecione uma conversa” é substituído pelo atendimento carregado via navegação parcial, sem exigir F5.
- A troca entre conversas continua sem recarregar a página inteira.
