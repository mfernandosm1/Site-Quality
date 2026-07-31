# WhatsApp Provider v1.0.2

## Objetivo

Corrigir `Provider.getChatsSafe()` usando o mesmo mecanismo interno utilizado
pelo `whatsapp-web.js` 1.34.7.

## Implementação

A coleção de conversas é obtida dentro de `client.pupPage.evaluate()` por:

```js
window.require('WAWebCollections').Chat.getModelsArray()
```

Cada modelo é processado sequencialmente:

```js
for (...) {
  try {
    await window.WWebJS.getChatModel(model)
  } catch (error) {
    // registra e continua
  }
}
```

Não existe `Promise.all()`.

## Escopo

Esta versão não altera Inbox, CRM, Comercial, Blocos, mensagens ou mídias.
Ela apenas corrige o teste isolado de `getChatsSafe()`.

## Teste

Com o WhatsApp conectado:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/automacao-whatsapp/whatsapp/provider/testar-chats-safe" | ConvertTo-Json -Depth 8 | Out-File ".\provider-chats-safe.json" -Encoding utf8
```

O resultado esperado é uma quantidade próxima do total identificado pelo Lab,
com falhas individuais registradas sem interromper a operação.
