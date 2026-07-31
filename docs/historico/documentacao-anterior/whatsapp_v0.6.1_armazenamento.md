# WhatsApp v0.6.1 — Armazenamento Inteligente

## Objetivo

Impedir o crescimento automático da pasta `content/automacao_whatsapp/inbox/media`, mantendo o histórico textual e comercial do Inbox.

## Novo comportamento

As mensagens novas com mídia passam a registrar somente metadados no JSON:

- tipo da mídia;
- MIME, quando fornecido pelo WhatsApp;
- nome original, quando fornecido;
- tamanho, quando fornecido;
- identificador original da mensagem;
- estado `stored: false` e `remote: true`.

Nenhum arquivo novo é criado automaticamente na pasta de mídia do Inbox.

## Visualização temporária

Ao abrir uma mídia não armazenada, o painel:

1. localiza a mensagem pelo identificador do WhatsApp;
2. solicita o conteúdo à sessão conectada;
3. mantém o conteúdo apenas em memória durante a resposta HTTP;
4. envia o conteúdo ao navegador;
5. não grava uma cópia na pasta do projeto.

O navegador pode manter cache temporário conforme suas próprias regras, mas o Painel Quality não cria arquivo permanente.

## Download no computador

O botão **Baixar no computador** responde com `Content-Disposition: attachment`. O navegador define a pasta final, normalmente `Downloads`.

## Compatibilidade

Mensagens antigas com `stored: true` continuam usando os arquivos existentes em `inbox/media`. Nenhum arquivo antigo é removido nesta versão.

## Limitações

- O WhatsApp precisa estar conectado para recuperar mídia não armazenada.
- O WhatsApp pode não disponibilizar novamente uma mídia muito antiga.
- Vídeos e arquivos grandes utilizam memória temporariamente durante a transferência.
- A v0.6.1 não executa limpeza dos arquivos existentes.

## Itens preservados

- conexão e autenticação;
- envio de mensagens e anexos;
- blocos;
- Inbox de contatos e grupos;
- CRM e métricas;
- exclusão de grupos das métricas comerciais.

## Próxima etapa

A v0.6.2 poderá adicionar a Central de Armazenamento para varredura e limpeza manual das mídias antigas.
