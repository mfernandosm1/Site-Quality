# Correção da publicação GitHub v2 — 2026-08-30

- Remove pathspecs de `Backup/**` do `git add`, evitando erro quando a pasta já está no `.gitignore`.
- Usa `.git/info/exclude` para ZIP/RAR/7Z/TAR/backups, dados locais do WhatsApp e cache.
- Usa `git add -A` normal e saneia o stage em seguida.
- Mantém a proteção contra arquivos acima de 95 MB.
- Mantém a recuperação automática de commits locais rejeitados pelo GitHub.
- Avisos LF/CRLF continuam sendo apenas avisos e não interrompem a publicação.
