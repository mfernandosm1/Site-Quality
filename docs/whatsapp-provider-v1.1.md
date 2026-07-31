# WhatsApp Provider v1.1 — Catálogo do Inbox

## Objetivo

Migrar somente a obtenção do catálogo de conversas do Inbox para o `WhatsAppProvider.getChatsSafe()`.

## Alteração

- `syncInboxFromWhatsApp()` consulta o Provider para obter chats e grupos.
- `repairInboxContactNames()` consulta o mesmo catálogo seguro.
- `repairInboxGroupNames()` consulta o mesmo catálogo seguro.
- Não há mais tentativa de `client.getChats()` quando o Provider retorna dados válidos.
- Busca de mensagens continua individualmente com `client.getChatById()` e `chat.fetchMessages()`.
- Envio, CRM, Comercial, Blocos e armazenamento de mídias não foram migrados nesta versão.

## Fallback

Se o Provider não estiver disponível ou falhar, o código mantém os fallbacks anteriores para evitar indisponibilidade do Inbox.

## Validação esperada

1. WhatsApp conecta normalmente.
2. Sincronização informa `source: provider`.
3. Grupos aparecem com os títulos entregues pelo Provider.
4. Inbox continua abrindo e enviando mensagens como antes.
