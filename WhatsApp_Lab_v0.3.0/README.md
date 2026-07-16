# Quality WhatsApp Lab v0.3.0

Laboratório isolado para explorar diretamente o `window.WWebJS` e comparar seus resultados com a API pública do `whatsapp-web.js`.

## Como executar

1. Feche completamente o Painel Quality.
2. Extraia esta pasta, preferencialmente em `C:\Site\WhatsApp_Lab_v0.3.0`.
3. Execute `start-lab.bat`.
4. Aguarde o encerramento automático.
5. Envie o JSON e o TXT gerados em `reports`.

## O que esta versão testa

- sessão, Chrome, `ready` e `client.info`;
- versão real do WhatsApp Web;
- estrutura interna do `WWebJS`;
- `client.getChats()` como controle;
- `window.WWebJS.getChats()` e `getContacts()` diretamente;
- `getChat(id)` e `getContact(id)` com IDs reais dos eventos;
- erros internos da página e do console;
- fingerprint do ambiente.

## Importante

O Lab reutiliza a sessão do Painel, mas não altera Inbox, CRM, contatos, blocos ou mídias. Nunca execute o Lab e o Painel simultaneamente.
