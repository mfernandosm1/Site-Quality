# Quality WhatsApp Lab v0.2.0

Diagnóstico profundo e isolado da integração `whatsapp-web.js` usada pelo Painel Quality.

## Antes de executar

**Feche completamente o Painel Quality.** O Lab reutiliza a mesma sessão `LocalAuth`, e dois processos não devem abrir essa sessão ao mesmo tempo.

## Como executar

1. Extraia preferencialmente em `C:\Site\WhatsApp_Lab_v0.2.0`.
2. Execute `start-lab.bat`.
3. Aguarde até aparecer o caminho do JSON e do resumo TXT.
4. Envie o ZIP da pasta `reports`, ou apenas o arquivo JSON.

Na primeira execução, as dependências serão instaladas automaticamente.

## O que esta versão testa

- sessão, Chrome, Node e versão real da biblioteca;
- `authenticated`, `ready` e eventos principais;
- versão do navegador e versão reportada do WhatsApp Web;
- inspeção de `window.Store`, `WWebJS`, `AuthStore`, `Debug` e chunks Webpack;
- `getChats()` imediatamente após `ready` e novamente após estabilização;
- `getContacts()`, `getChatById()`, `getContactById()` e `searchMessages()`;
- busca e download em memória de uma mídia recente, sem salvar no Painel;
- fingerprint do ambiente para futuras comparações;
- JSON completo e resumo TXT mais fácil de enviar.

## Segurança

O Lab não importa serviços do Painel, não grava no Inbox, CRM, contatos, mídias ou Painel Comercial e não salva a mídia testada em disco.
