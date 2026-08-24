# Ajustes — Agendamentos e popovers do Inbox — 23/08/2026

- Corrigidos os botões Excluir e Limpar agendamentos no modal: as funções agora ficam acessíveis aos handlers HTML.
- Simplificada a limpeza da conversa para um único botão "Limpar agendamentos"; exclusão individual continua disponível em cada item.
- Adicionado em Configurações > Conexão o botão "Excluir todos os agendamentos", que limpa todas as conversas, inclusive pendentes, mediante confirmação.
- Corrigida a altura dos popovers do Inbox (Anexar, Executar bloco e Emojis). O cálculo anterior usava a altura do compositor e podia reduzir o popover a poucos pixels.
- Popovers agora usam altura baseada na viewport, rolagem interna e z-index superior.
