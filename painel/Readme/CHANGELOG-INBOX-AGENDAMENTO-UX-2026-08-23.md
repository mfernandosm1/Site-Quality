# Changelog — Inbox / Agendamento — 23/08/2026

## Correções

- Corrigida a duração visual do áudio recém-gravado no agendamento:
  - o sistema mede a duração real desde o início até o clique em **Parar**;
  - a duração passa a ser exibida junto ao status do áudio (ex.: `0:05`);
  - foi adicionada uma tentativa de estabilização dos metadados do preview para evitar o `0:00` incorreto em gravações WebM/Opus do Chrome.
- O modal **Agendar mensagem** não é mais fechado por recarga automática quando uma mensagem do Inbox é enviada em segundo plano.
- Enquanto o modal de agendamento estiver aberto, mudanças de revisão do Inbox são absorvidas sem F5.
- A lista de agendamentos passa a se atualizar silenciosamente a cada 2,5 s enquanto o modal estiver aberto, permitindo acompanhar `Pendente → Enviado/Erro` sem fechar a tela.
- Ao fechar o modal, se houve atualização do Inbox durante o período, a página pode ser sincronizada depois, sem interromper o preenchimento ou a gravação.

## Arquivo alterado

- `views/automacao_whatsapp.ejs`
