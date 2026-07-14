# Automação WhatsApp v0.5.3 — Identificação e mesclagem de conversas

## Objetivo
Corrigir a identificação de números reais em mensagens recebidas e enviadas, eliminar conversas duplicadas criadas por identificadores LID e preservar os dados já registrados no Inbox.

## Alterações
- Resolução do contato pelo chat real da mensagem, inclusive em mensagens enviadas pela loja.
- Conversão de identificadores `@lid` para o telefone real usando o recurso disponível no `whatsapp-web.js`.
- Revisão automática das conversas antigas ao conectar o WhatsApp.
- Mesclagem de uma conversa LID com a conversa já existente do mesmo telefone.
- Mesclagem dos históricos de mensagens com antduplicidade por ID.
- Preservação de nome editado manualmente, status comercial, origem, produto de interesse e datas.
- Preservação apenas dos contatos que foram salvos manualmente na agenda do Painel.
- Registros automáticos antigos deixam de ser tratados como contatos salvos.
- Backup automático de `conversations.json` e `contacts.json` antes da primeira migração necessária.
- Logs mais claros com nome, telefone, direção e prévia da mensagem.
- Estrutura dos arquivos do Inbox atualizada para versão 3.

## Backup da migração
Quando existirem conversas antigas por LID e o WhatsApp conseguir identificar seus telefones, será criado um backup em:

```text
content/automacao_whatsapp/inbox/backups/v0.5.3-<data-hora>/
```

O backup contém:

```text
conversations.json
contacts.json
```

## Comportamento esperado nos casos testados
- O LID `145771240403186` deverá ser associado ao número real já identificado pelo WhatsApp, evitando os dois cards da mesma conversa.
- O registro de mensagem enviada que aparecia como “Matheus” deverá ser associado ao telefone real da cliente quando o WhatsApp fornecer o mapeamento do LID.
- O nome manual “Quality Celulares” deverá ser preservado durante a mesclagem.
- O contato salvo manualmente continuará na agenda.
- Contatos antigos criados automaticamente não passarão a integrar exportações futuras.

## Limitações
- A correção depende de o WhatsApp Web disponibilizar a relação entre LID e telefone durante a sessão conectada.
- Se um identificador não puder ser resolvido naquele momento, ele permanecerá pendente e será tentado novamente em mensagens futuras ou em uma nova conexão.
- Esta versão não importa o histórico completo do WhatsApp anterior à instalação do Inbox.

## Arquivos alterados
```text
C:\Site\painel\routes\automacao_whatsapp.js
C:\Site\painel\services\whatsapp_inbox.js
C:\Site\painel\views\automacao_whatsapp.ejs
C:\Site\docs\automacao-whatsapp-v0.5.3.md
```

## Testes recomendados
1. Pare o painel com `Ctrl+C`.
2. Faça backup dos três arquivos de código atuais.
3. Substitua os arquivos do ZIP.
4. Não substitua os JSONs do Inbox nem a pasta `session`.
5. Inicie com `npm start`.
6. Aguarde o WhatsApp ficar conectado.
7. Abra o Inbox e confirme se os cards duplicados foram mesclados.
8. Confirme se “Quality Celulares” continua com o nome editado.
9. Envie uma mensagem para a cliente do número `54 9632-4341` e confirme se aparece o telefone normalizado correto.
10. Envie uma mensagem de outro telefone para validar também o fluxo recebido.
11. Confira Configurações → Logs.

## Segurança
- Nenhuma resposta automática foi adicionada.
- Nenhum JSON real é incluído neste pacote.
- A sessão do WhatsApp não é alterada.
- A migração faz backup antes de modificar os índices de conversas e contatos.
