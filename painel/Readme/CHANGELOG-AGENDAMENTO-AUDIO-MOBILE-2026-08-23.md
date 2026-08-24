# Agendamento de áudio — compatibilidade mobile

Data: 23/08/2026

## Problema corrigido

O áudio agendado podia ser enviado e reproduzir normalmente no WhatsApp Web/notebook, mas no celular aparecer como áudio indisponível ou com erro de reprodução.

## Ajuste

- Todo áudio agendado é normalizado antes do envio para um perfil específico de mensagem de voz do WhatsApp:
  - contêiner OGG;
  - codec Opus;
  - mono;
  - 48 kHz;
  - bitrate aproximado de 18 kbps;
  - VBR;
  - frames de 20 ms;
  - aplicação VOIP;
  - timestamps normalizados a partir de zero.
- O arquivo convertido é validado pelo FFmpeg antes do envio.
- Áudios antigos em WebM/WAV/OGG passam novamente pela normalização ao usar **Tentar agora**.
- Arquivos já preparados pelo novo perfil `.ptt.ogg` são apenas validados, evitando conversões repetidas.
- O agendamento registra internamente o perfil `whatsapp-ptt-mobile-v1`.

## Observação

O projeto continua utilizando `ffmpeg-static`, já presente nas dependências. Não foi adicionada nova dependência.
