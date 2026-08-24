# Correção — áudio agendado como mensagem de voz

- Áudios gravados em WebM/WAV/MP3/M4A são convertidos para **OGG/Opus 48 kHz mono** antes do envio.
- O WhatsApp recebe `audio/ogg; codecs=opus` com `sendAudioAsVoice: true`, para aparecer como áudio/voz normal e não como documento `.webm`.
- O botão **Tentar agora** também converte os agendamentos antigos antes de reenviar.
- Usa `ffmpeg-static` quando instalado e aceita `FFMPEG_PATH`/FFmpeg do sistema como fallback.
- Se não houver conversor disponível, o painel mostra um erro explícito em vez de marcar um envio incorreto como concluído.
