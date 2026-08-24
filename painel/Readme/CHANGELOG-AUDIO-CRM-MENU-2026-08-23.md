# Ajustes — áudio agendado, CRM e menu — 23/08/2026

## Cabeçalho / pesquisa
- Mantida a largura confortável da pesquisa global.
- Altura reduzida discretamente para ocupar menos espaço vertical.

## Agendamento do Inbox
- Horário inicial do agendamento passa a usar o minuto atual, sem adicionar 1 hora automaticamente.
- Se o usuário mantiver o minuto atual, o backend normaliza para alguns segundos à frente para permitir envio imediato/agendamento no minuto corrente.
- Áudio gravado preserva o MIME completo do MediaRecorder, inclusive `codecs=opus` quando informado pelo navegador.
- O agendador não converte mais silenciosamente um áudio em documento. Se o WhatsApp não aceitar como voz/áudio, o item permanece com erro para nova tentativa.
- Mantidos os caminhos de tentativa como mensagem de voz e áudio comum.

## CRM
- Menu CRM agora aponta diretamente para Painel Comercial, Inbox e Automação.
- `/crm` deixa de ter hub próprio e redireciona para o Painel Comercial da Automação WhatsApp.
- A pesquisa geral deixa de oferecer a antiga página CRM separada.
