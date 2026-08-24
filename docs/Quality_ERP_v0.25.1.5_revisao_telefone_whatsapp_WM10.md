# Quality ERP v0.25.1.5 — Revisão Telefone e WhatsApp WM10

## Regra consolidada

- O campo `celular` do WM10 continua sendo gravado em **Celular / WhatsApp**.
- O campo `telefone` do WM10 continua sendo gravado separadamente em **Telefone**.
- Para identificar um contato utilizável pelo WhatsApp, o importador usa primeiro `celular`.
- Quando `celular` estiver vazio ou inválido, usa `telefone` como alternativa.
- O cliente é contabilizado em **Sem WhatsApp** somente quando os dois campos não possuem um número utilizável.
- São considerados utilizáveis números com 10 a 13 dígitos, contemplando DDD e DDI opcional.

## Auditoria

O vínculo WM10 registra `whatsAppNumber` e `whatsAppSource` (`mobile` ou `phone`) para facilitar a futura automação de aniversariantes.
