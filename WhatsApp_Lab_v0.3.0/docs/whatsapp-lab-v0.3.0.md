# WhatsApp Lab v0.3.0 — WWebJS Explorer

## Objetivo

Comparar a API pública do `whatsapp-web.js` com chamadas diretas ao objeto `window.WWebJS` injetado na página.

## Testes principais

- assinatura e código-fonte parcial de funções internas;
- controle com `client.getChats()`;
- chamada direta a `window.WWebJS.getChats()`;
- chamada direta a `window.WWebJS.getContacts()`;
- captura de IDs reais pelos eventos;
- chamadas diretas a `getChat(id)` e `getContact(id)`;
- repetição de `getChats()` após estabilização;
- captura de erros da página e console do navegador.

## Segurança

O laboratório não grava no Inbox, CRM, mídias ou arquivos do Painel. A sessão compartilhada exige que o Painel esteja totalmente fechado durante o teste.
