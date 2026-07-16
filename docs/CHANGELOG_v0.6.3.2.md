# WhatsApp v0.6.3.2 — Hotfix de mídias

- Corrige visualização e download remoto de imagens, vídeos, áudios e documentos.
- Aceita as duas formas de rota: parâmetros no caminho e parâmetros na query string.
- Procura a mensagem diretamente e, se necessário, no histórico recente da conversa.
- Valida o Base64 antes de iniciar a resposta HTTP.
- Evita respostas incompletas que causavam ERR_INVALID_RESPONSE.
- Exibe uma página amigável quando a mídia não está mais disponível.
- Mantém paginação, polling, armazenamento inteligente, grupos e CRM inalterados.
