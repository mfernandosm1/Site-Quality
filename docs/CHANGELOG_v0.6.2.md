# WhatsApp v0.6.2 — Central de Armazenamento

## Adicionado

- Nova seção **Configurações → Armazenamento**.
- Relatório de uso do Inbox e seus principais diretórios.
- Contadores de mensagens, contatos, grupos, mídias locais, pastas e backups.
- Detecção de arquivos órfãos, mídias antigas, mídias de grupos, pastas vazias e JSON inválidos.
- Limpezas manuais com confirmação prévia.
- Registro de cada limpeza nos logs do módulo.

## Segurança

- Exclusões limitadas à pasta local `inbox/media`.
- Metadados das mensagens são ajustados após a remoção de uma mídia vinculada.
- Nenhuma alteração na conexão, autenticação, envio, blocos, CRM ou métricas comerciais.

## Compatibilidade

- Mantida a visualização temporária de mídias da v0.6.1.
- Mídias antigas que permanecerem locais continuam funcionando normalmente.
