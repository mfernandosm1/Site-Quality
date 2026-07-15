# Painel Quality — WhatsApp v0.6.3 Performance

## Escopo

Versão dedicada à performance do Inbox, sem alterações na conexão, autenticação, envio, CRM, grupos, blocos ou armazenamento inteligente.

## Alterações

- Carregamento inicial limitado às 50 mensagens mais recentes.
- Botão para carregar mensagens anteriores em blocos de 50.
- Endpoint paginado para mensagens (`/inbox/messages`).
- Novas mensagens são acrescentadas à conversa aberta sem recarregar toda a página.
- Polling ajustado para 3,5 segundos e dividido entre revisão da lista e revisão da conversa.
- Imagens continuam com lazy loading e mídias remotas continuam sem cópia automática.
- Log no terminal após limpezas da Central de Armazenamento, mostrando arquivos removidos, espaço liberado e duração.
- Estrutura de leitura paginada preparada para futura troca do armazenamento local por banco de dados ou serviço em nuvem.

## Instalação

Substituir:

- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
- `services/whatsapp_inbox.js`

Reiniciar o Painel Quality.

## Testes recomendados

1. Abrir uma conversa com mais de 50 mensagens.
2. Confirmar que aparecem as mensagens mais recentes.
3. Clicar em “Carregar mensagens anteriores”.
4. Receber uma nova mensagem com a conversa aberta e confirmar que ela aparece sem recarregar a página inteira.
5. Executar uma limpeza em Configurações → Armazenamento e conferir o resumo no terminal.
