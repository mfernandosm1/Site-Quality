# Automação WhatsApp v0.5.1 — Captura e Inbox de leitura

## Objetivo
Conectar mensagens reais à estrutura local do Inbox, preservando a conexão, os blocos e a biblioteca de mídias já validados.

## Entregas
- Captura de mensagens recebidas e enviadas pelo evento `message_create`.
- Ignora grupos e Status do WhatsApp nesta etapa.
- Prevenção de duplicidade pelo ID original da mensagem.
- Cadastro local e permanente do contato pelo número normalizado.
- Lista de conversas ordenada pela mensagem mais recente.
- Histórico carregado somente ao abrir a conversa.
- Indicador de cliente aguardando resposta.
- Registro do tempo da primeira resposta.
- Origem automática simples: Site Quality, Instagram, campanha, indicação, WhatsApp direto ou desconhecida.
- Extração simples do produto de interesse quando estiver no texto inicial.
- Nome único do contato, editável no próprio Inbox.
- Nome alterado manualmente não é sobrescrito pelo nome do WhatsApp.
- Edição manual de status comercial, origem e produto de interesse.
- Campo `erpCustomerId` preparado para vínculo futuro com o ERP pelo telefone.

## Estrutura de dados
```text
content/automacao_whatsapp/inbox/
├── conversations.json
├── contacts.json
├── messages/
│   └── 5554999999999.json
└── media/
```

## Arquivos alterados
```text
routes/automacao_whatsapp.js
views/automacao_whatsapp.ejs
services/whatsapp_inbox.js
```

## Regras importantes
- O telefone normalizado é a referência principal do contato.
- Existe somente um campo `name`.
- A edição manual do nome tem prioridade sobre futuras atualizações do WhatsApp.
- Mídias das conversas permanecem separadas da biblioteca oficial dos blocos.
- Nesta versão, mensagens com mídia registram apenas o tipo e a existência do anexo. O download da mídia será implementado em etapa posterior.
- Não existe resposta automática.

## Preparação futura
A base já permite evoluir para:
- exportação geral em CSV, Excel e JSON;
- Android/Google Contatos em CSV compatível;
- iPhone/iCloud em vCard `.vcf`;
- vínculo automático com o cadastro do ERP pelo número do WhatsApp;
- criação ou associação manual de cliente no ERP.

## Testes recomendados
1. Parar o painel com `Ctrl+C`.
2. Fazer backup dos três arquivos atuais.
3. Substituir os arquivos do pacote.
4. Iniciar com `npm start`.
5. Confirmar a reconexão do WhatsApp.
6. Enviar uma mensagem de outro número para o número conectado.
7. Atualizar a aba Inbox.
8. Abrir a conversa e conferir o histórico.
9. Responder pelo envio manual atual e confirmar que a resposta aparece no histórico.
10. Editar o nome do contato e reiniciar o painel para confirmar que o nome foi preservado.
11. Alterar status, origem e produto de interesse.
12. Confirmar que Blocos, Mídias e Simulador continuam funcionando.

## Limitações conhecidas
- O Inbox registra mensagens novas a partir da instalação desta versão; não importa todo o histórico antigo automaticamente.
- Mídias ainda não são baixadas para a pasta do Inbox.
- A tela não atualiza em tempo real; use a atualização do navegador para ver novas mensagens.
- O envio diretamente pelo campo da conversa será implementado depois da validação desta etapa.
