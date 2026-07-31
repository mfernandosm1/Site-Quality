# WhatsApp Provider v1.0.3

## Objetivo

Eliminar as falhas causadas por `model.serialize()` e por `window.WWebJS.getChatModel(model)` durante a leitura das conversas.

## Alteração

O `getChatsSafe()` agora:

1. obtém os modelos por `window.require('WAWebCollections').Chat.getModelsArray()`;
2. percorre os modelos sequencialmente com `for`;
3. monta um objeto simples manualmente;
4. protege cada propriedade individualmente;
5. não chama `serialize()`, `getChatModel()` ou `Promise.all()`;
6. mantém erro isolado por conversa.

## Validação esperada

- `totalModels`: próximo de 494;
- `validChats`: próximo de 494;
- `failedChats`: zero ou quantidade pequena;
- `diagnostics.serialization`: `manual-safe-v1`.

O Inbox, CRM, Comercial e Blocos ainda não foram migrados para o Provider.
