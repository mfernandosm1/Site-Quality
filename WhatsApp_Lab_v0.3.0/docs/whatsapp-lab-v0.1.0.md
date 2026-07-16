# WhatsApp Lab v0.1.0 — Fundação

## Objetivo

Criar um ambiente independente e reproduzível para validar a integração com `whatsapp-web.js` antes de qualquer alteração no Painel Quality.

## Isolamento

O Lab não importa módulos do Painel e não grava em suas bases. A única dependência compartilhada é a sessão `LocalAuth`, usada em modo exclusivo enquanto o Painel estiver fechado.

## Configuração reproduzida

- `clientId`: `quality-teste`
- `whatsapp-web.js`: `1.34.7`
- Chrome local em modo headless
- argumentos Puppeteer: `--no-sandbox`, `--disable-setuid-sandbox`, `--disable-dev-shm-usage`

## Política arquitetural

Nenhum módulo futuro de Inbox, CRM, Comercial, Blocos ou Mídias deverá importar `whatsapp-web.js` diretamente. A biblioteca ficará encapsulada no WhatsApp Provider.

## Próxima versão

A v0.2.0 deverá acrescentar testes isolados e opt-in para:

- versão do WhatsApp Web;
- `window.Store` e `window.WWebJS`;
- `client.getChats()`;
- captura integral de stack e contexto;
- estratégias alternativas de compatibilidade.
