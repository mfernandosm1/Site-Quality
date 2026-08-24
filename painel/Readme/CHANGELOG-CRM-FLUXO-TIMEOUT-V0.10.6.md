# CRM / Automação WhatsApp — timeout de espera do fluxo v0.10.6

Data: 14/08/2026

## Objetivo
Evitar que uma etapa de Opções fique aguardando resposta indefinidamente e mantenha o atendimento preso em um fluxo antigo.

## Alterações
- Cada etapa `Opções` agora possui **Tempo sem resposta (min)**.
- Valor padrão para novas etapas: **30 minutos**.
- `0` desativa o tempo limite, mantendo a espera sem expiração automática.
- Campo **Mensagem ao expirar** configurável por etapa.
- Opção **Encerrar atendimento ao expirar** habilitada por padrão.
- Quando o prazo termina, o sistema remove a espera pendente e não aceita respostas tardias como se ainda pertencessem àquele menu.
- Se configurada, a mensagem de expiração é enviada uma única vez ao cliente.
- Se `Encerrar atendimento ao expirar` estiver marcado, o ciclo do Inbox é encerrado automaticamente com ator `automacao_timeout`.
- O vencimento é persistido em `flow_sessions.json`, portanto continua válido após reinicialização do painel (`Ctrl+C` / `npm start`).
- Um monitor leve verifica expirações a cada 15 segundos; não cria cópias de mídia nem aumenta de forma relevante o armazenamento local.

## Compatibilidade
Blocos antigos continuam funcionando. Etapas antigas de Opções sem esses campos recebem os valores padrão ao serem carregadas/salvas.
