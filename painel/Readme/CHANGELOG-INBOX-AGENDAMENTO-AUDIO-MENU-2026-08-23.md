# Quality ERP — Inbox agendado + áudio + shell

Data: 23/08/2026

## Inbox — agendamento
- Corrigido o acionamento do botão de relógio com listener delegado, inclusive após troca dinâmica de conversa no Inbox.
- Agendamento agora aceita texto, imagem, áudio enviado como arquivo e áudio gravado na hora.
- Áudio gravado usa MediaRecorder do navegador e pode ser ouvido antes de agendar.
- Áudio agendado é enviado como mensagem de voz no WhatsApp.
- Se houver texto junto com áudio, o áudio é enviado e em seguida o texto.
- Arquivos de agendamento limitados a 20 MB.
- Mantidas tentativas automáticas, cancelamento e recuperação quando ERP/WhatsApp voltarem a ficar disponíveis.

## Menu global
- Cabeçalho ganhou mais altura vertical para aproveitar melhor a faixa superior.
- Navegação principal pode quebrar em duas linhas quando necessário, evitando que “Negócio” invada o seletor de tema.
- Logo e controles ficam centralizados verticalmente.
