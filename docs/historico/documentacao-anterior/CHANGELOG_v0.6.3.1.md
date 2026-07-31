# v0.6.3.1 — Hotfix de Mídias

## Correções

- Rota de mídia alterada para parâmetros de consulta, evitando perda ou interpretação incorreta do identificador completo da mensagem.
- Resposta binária enviada com `res.end(buffer)`, `Content-Type`, `Content-Length` e `Content-Disposition` explícitos.
- Decodificação robusta para Base64 simples ou Data URI.
- Extensão de arquivo inferida pelo MIME quando o WhatsApp não informa o nome completo.
- Fallback de recuperação pela conversa quando `getMessageById()` não localiza a mensagem.
- Tela amigável com HTTP 410 quando a mídia não está mais disponível.

## Preservado

- Paginação de mensagens da v0.6.3.
- Polling incremental.
- Visualização temporária, sem cópia automática em `inbox/media`.
- Grupos fora das métricas comerciais.
- Central de Armazenamento.
