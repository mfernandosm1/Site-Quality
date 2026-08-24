# Inbox — tela única, atualização silenciosa e armazenamento (23/08/2026)

## Ajustes
- O título redundante `💬 Automação WhatsApp` deixa de ocupar espaço quando a aba ativa é o Inbox.
- O Inbox passa a aproveitar a altura disponível da janela: abas do módulo, conversas, chat, compositor, emojis e execução de blocos permanecem no mesmo quadro, usando rolagem interna apenas onde necessário.
- O polling do Inbox não usa mais `window.location.reload()` quando detecta novas mensagens. A conversa e a lista são atualizadas de forma incremental, preservando a navegação e evitando o efeito visual de F5.
- Envio de anexo, sincronização manual e fechamento do modal de agendamento também usam atualização incremental em vez de recarregar a página inteira.
- O modal de agendamento é movido para o `body` quando aberto e recebe prioridade visual alta, evitando ficar atrás do menu global fixo.
- Restaurada em Configurações a seção `🧹 Armazenamento`, usando as rotinas de limpeza que já existiam no backend.
- A seção de armazenamento mostra tamanho total, mídias, mensagens, conversas, arquivos órfãos e arquivos antigos, e permite limpar mídias órfãs, de grupos, com +30/+90 dias, pastas vazias ou todas as mídias locais.
- A limpeza de armazenamento preserva o histórico textual das conversas; apenas cópias locais de mídias são removidas conforme a opção escolhida.
- Em `Configurações → Conexão`, o botão de excluir todos os agendamentos continua disponível e foi adicionado um atalho para a limpeza/armazenamento do Inbox.

## Arquivo alterado
- `views/automacao_whatsapp.ejs`
