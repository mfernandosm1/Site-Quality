# Automação WhatsApp v0.5.7 — Anexos do Inbox

## Objetivo

Adicionar envio e recebimento manual de imagens, áudios, documentos e vídeos no Inbox, sem respostas automáticas e sem misturar as mídias das conversas com a biblioteca oficial dos blocos.

## Arquivos alterados

- `routes/automacao_whatsapp.js`
- `services/whatsapp_inbox.js`
- `views/automacao_whatsapp.ejs`

## Armazenamento

As mídias recebidas e enviadas são baixadas pelo evento `message_create` e armazenadas em:

```text
content/automacao_whatsapp/inbox/media/<telefone>/<ano>/<mes>/
```

O JSON da conversa guarda somente metadados e caminho relativo. Nenhum arquivo é gravado em Base64 no histórico.

A biblioteca dos blocos permanece em sua estrutura própria, sem compartilhamento com o Inbox.

## Tipos permitidos

- Imagens: JPEG, PNG, WebP e GIF.
- Áudios: OGG, MP3, MP4/M4A, WebM e WAV.
- Vídeos: MP4 e WebM.
- Documentos: PDF, TXT, ZIP, DOC, DOCX, XLS e XLSX.

Limite atual por envio: 40 MB.

## Rotas novas

- `POST /automacao-whatsapp/inbox/enviar-anexo`
- `GET /automacao-whatsapp/inbox/media/:conversationId/:messageId`
- Download: adicionar `?download=1` à rota da mídia.

## Segurança

- Lista fechada de MIME types.
- Apenas um arquivo por envio.
- Limite de 40 MB.
- Nome físico sanitizado.
- Caminho resolvido e validado dentro da pasta exclusiva do Inbox.
- Cabeçalho `X-Content-Type-Options: nosniff` na leitura.
- Arquivos executáveis não são aceitos.

## Comportamento

- Imagem: prévia no histórico, abrir e baixar.
- Áudio: player, abrir e baixar.
- Vídeo: player, abrir e baixar.
- Documento: nome, tipo, tamanho aproximado, abrir e baixar.
- Legenda: enviada junto de imagem, vídeo e documento.
- Em áudio, o texto é enviado em uma mensagem separada após o áudio.
- Falha ao baixar uma mídia não interrompe o Inbox; o histórico mostra um aviso.

## Testes obrigatórios

1. Reiniciar o Painel e confirmar conexão do WhatsApp.
2. Abrir conversas antigas e validar textos, contatos, não lidas e status comercial.
3. Enviar JPG e receber JPG.
4. Enviar PDF, abrir e baixar.
5. Enviar áudio e reproduzir no histórico.
6. Receber áudio de voz e reproduzir.
7. Enviar vídeo MP4 pequeno e reproduzir.
8. Testar legenda em imagem e documento.
9. Tentar arquivo não permitido, como `.exe`.
10. Tentar arquivo maior que 40 MB.
11. Reiniciar o Painel e confirmar que as prévias continuam acessíveis.
12. Confirmar que nada apareceu na biblioteca de mídias dos blocos.

## Observações

Mensagens antigas que tinham `hasMedia: true` mas não possuíam arquivo baixado continuarão mostrando aviso de mídia indisponível. A v0.5.7 não tenta recuperar retroativamente anexos antigos, reduzindo risco e complexidade.
