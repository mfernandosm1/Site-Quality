# CRM / Inbox — blocos em tempo real (v0.10.0)

## Objetivo
Evitar qualquer recarregamento completo da página ao executar blocos no Inbox e, ao mesmo tempo, mostrar imediatamente na conversa o que acabou de ser enviado.

## Alterações
- A execução do bloco retorna ao navegador uma representação das etapas efetivamente enviadas.
- O Inbox adiciona essas mensagens diretamente no histórico aberto, sem `window.location.reload()`.
- Textos e opções aparecem com o conteúdo enviado.
- Imagem, vídeo, áudio e arquivo aparecem imediatamente como itens enviados, com a legenda quando houver.
- A conversa rola automaticamente para a última mensagem adicionada.
- A lista/pesquisa de blocos continua aberta após o envio, preservando o fluxo para executar outro bloco em seguida.
- O marcador de revisão do Inbox é atualizado após o envio para evitar que o polling interprete a própria operação como motivo para recarregar a página.

## Armazenamento
A atualização visual é feita no DOM do navegador e não cria cópias adicionais de mídia nem grava arquivos extras apenas para mostrar o envio. Portanto, este ajuste não aumenta o armazenamento local do WhatsApp.

## Arquivos alterados
- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
