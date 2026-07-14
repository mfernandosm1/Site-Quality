# Automação WhatsApp v0.5.0 — Estrutura inicial do Inbox

## Objetivo
Organizar a navegação do módulo e criar a base isolada do futuro Inbox, preservando integralmente a conexão, os blocos, as mídias e os envios manuais validados na v0.4.3.

## Navegação principal
- Dashboard
- Inbox
- Blocos
- Mídias
- Simulador
- Aniversariantes
- Configurações

## Configurações internas
- Geral
- Conexão
- Logs

A antiga aba principal “Conexão e teste” foi movida para **Configurações → Conexão**.
A antiga aba principal “Logs” foi movida para **Configurações → Logs**.
Nenhuma funcionalidade dessas áreas foi removida.

## Estrutura criada automaticamente
Ao iniciar o Painel Quality, o módulo passa a garantir a existência de:

```text
C:\Site\Site_with_content\content\automacao_whatsapp\inbox\
├── conversations.json
├── contacts.json
├── messages\
└── media\
```

As mídias do Inbox permanecem separadas da biblioteca oficial dos blocos.

## Serviço novo

```text
C:\Site\painel\services\whatsapp_inbox.js
```

Responsabilidades desta primeira entrega:
- criar com segurança a estrutura do Inbox;
- ler um resumo básico das conversas;
- preparar contadores para a tela inicial do Inbox;
- não capturar mensagens ainda;
- não enviar respostas automáticas.

## Tela do Inbox
Nesta etapa, a aba Inbox exibe:
- conversas registradas;
- aguardando resposta;
- novos contatos;
- vendas concluídas;
- aviso de que a base está preparada para a próxima etapa.

Os valores começam zerados porque nenhuma mensagem recebida é capturada nesta entrega.

## Arquivos alterados

```text
C:\Site\painel\routes\automacao_whatsapp.js
C:\Site\painel\views\automacao_whatsapp.ejs
```

## Arquivo criado

```text
C:\Site\painel\services\whatsapp_inbox.js
```

## Arquivos não alterados
- server.js
- layout.ejs
- routes/index.js
- blocos.json
- midias.json
- config.json
- logs.json
- pasta session

## Instalação
1. Pare o painel com `Ctrl+C`.
2. Faça backup dos arquivos atuais.
3. Copie os arquivos do ZIP respeitando as pastas `routes`, `views` e `services`.
4. Copie a documentação para `C:\Site\docs`.
5. Não substitua nenhum JSON nem a pasta `session`.
6. Inicie com `npm start`.

## Testes recomendados
1. Confirmar a reconexão automática do WhatsApp.
2. Abrir a Automação WhatsApp.
3. Confirmar o menu reduzido e na ordem correta.
4. Abrir a nova aba Inbox.
5. Confirmar os quatro contadores zerados e o aviso da etapa inicial.
6. Abrir Configurações → Geral.
7. Abrir Configurações → Conexão e testar o status da sessão.
8. Abrir Configurações → Logs.
9. Abrir Blocos, Mídias e Simulador para confirmar que continuam funcionando.
10. Confirmar a criação da pasta `content\automacao_whatsapp\inbox`.

## Limitações desta entrega
- nenhuma mensagem recebida é capturada;
- nenhum histórico real é exibido;
- não há envio pelo Inbox;
- não há resposta automática;
- não há download de mídias de conversas.

## Próxima etapa
Conectar o evento de mensagens recebidas do `whatsapp-web.js` ao serviço do Inbox, com prevenção de duplicidade, classificação inicial da origem e gravação separada por conversa.
