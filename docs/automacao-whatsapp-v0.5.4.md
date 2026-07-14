# Automação WhatsApp v0.5.4 — Respostas manuais pelo Inbox

## Objetivo

Transformar o Inbox em uma ferramenta de atendimento manual, preservando a conexão,
a identificação de contatos e a persistência validadas na v0.5.3.

## Entregas

- campo para enviar mensagens de texto diretamente pela conversa;
- envio ao pressionar Enter;
- quebra de linha com Shift+Enter;
- seletor de blocos ativos dentro da conversa;
- execução manual de blocos no contato aberto;
- respeito às pausas, digitação e gravação configuradas no bloco;
- atualização do histórico após o envio;
- conversa marcada como respondida pelo evento real do WhatsApp;
- mensagens e etapas registradas pelos eventos já existentes do Inbox;
- aviso visual de sucesso ou falha;
- bloqueio do envio quando o WhatsApp estiver desconectado;
- bloqueio do envio quando o número real ainda não estiver identificado;
- proteção para não recarregar a tela enquanto uma mensagem estiver sendo digitada.

## Segurança operacional

- nenhuma resposta automática foi criada;
- todo envio depende de ação manual;
- o texto só é considerado enviado após confirmação da função `sendMessage`;
- a mensagem é persistida pelo evento real `message_create`;
- blocos continuam usando a biblioteca oficial de mídias;
- mídias dos blocos não são copiadas para a pasta de conversas;
- apenas um bloco pode ser executado por vez.

## Arquivos alterados

```text
C:\Site\painel\routes\automacao_whatsapp.js
C:\Site\painel\views\automacao_whatsapp.ejs
```

## Arquivo preservado no pacote

```text
C:\Site\painel\services\whatsapp_inbox.js
```

O serviço é incluído para manter o conjunto completo da versão, mas não altera a
estrutura dos dados criada na v0.5.3.

## Dados que não devem ser substituídos

```text
content\automacao_whatsapp\inbox\conversations.json
content\automacao_whatsapp\inbox\contacts.json
content\automacao_whatsapp\inbox\messages\
content\automacao_whatsapp\inbox\backups\
content\automacao_whatsapp\session\
blocos.json
midias.json
config.json
logs.json
```

## Testes recomendados

1. Reiniciar o painel e confirmar a reconexão.
2. Abrir uma conversa com número identificado.
3. Digitar um texto e clicar em Enviar.
4. Confirmar que a mensagem chegou ao WhatsApp.
5. Confirmar que ela apareceu no histórico e a conversa ficou como Respondido.
6. Testar envio com Enter.
7. Testar Shift+Enter para criar uma nova linha.
8. Selecionar um bloco curto e executá-lo.
9. Confirmar todas as etapas no WhatsApp e no histórico.
10. Desconectar o WhatsApp e confirmar que os controles ficam desabilitados.
11. Digitar parcialmente uma mensagem e receber outra mensagem, confirmando que o texto não é perdido por recarregamento automático.

## Limitações desta versão

- upload manual de imagem, áudio e arquivo pelo Inbox ficará para a próxima etapa;
- histórico anterior à instalação do Inbox não é importado;
- atualização continua usando consulta periódica de 2,5 segundos;
- não existem respostas automáticas, IA ou gatilhos.
