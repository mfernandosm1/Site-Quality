# WhatsApp Lab v0.2.0 — Deep Inspection

## Objetivo

Localizar a causa da incompatibilidade nas APIs de leitura sem modificar o Painel Quality.

## Decisão arquitetural

O Lab valida a biblioteca. O futuro WhatsApp Provider concentra toda integração. CRM, Inbox, Blocos e Painel Comercial não deverão importar `whatsapp-web.js` diretamente.

## Particularidade investigada

O evento `ready` pode ocorrer antes do fim dos eventos `loading_screen`. Por isso, `getChats()` é executado em dois momentos: imediatamente após `ready` e depois de uma espera de estabilização configurável.

## Privacidade

Os relatórios evitam conteúdo de mensagens. São armazenados apenas IDs técnicos, tipos, contagens e pequenas amostras de nomes necessárias ao diagnóstico.
