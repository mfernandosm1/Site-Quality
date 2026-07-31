# Operação, Caminhos e Publicação

## Caminhos oficiais

```text
Site público:        C:\Site\Site_with_content
Painel local:        C:\Site\painel
Raiz do GitHub:      C:\Site
Documentação:        C:\Site\docs
Workflow Pages:      C:\Site\.github\workflows\pages.yml
Backups:             C:\Site\Backup
```

## Endereço publicado

`https://www.qualitycel.com.br`

## Fluxo de publicação

```text
Painel / conteúdo local
        ↓
publish.js
        ↓
backup em C:\Site\Backup
        ↓
sincronização de Site_with_content para a raiz publicada
        ↓
geração/atualização de sitemap e robots quando aplicável
        ↓
commit e push para main
        ↓
GitHub Pages
```

## Regras de segurança

- fazer backup antes de alterações sensíveis;
- manter aproximadamente os últimos cinco backups conforme configuração atual;
- validar o site localmente antes da publicação;
- nunca substituir JSONs reais de operação com arquivos vazios de um ZIP;
- preservar `pages.yml`, `sitemap.xml`, `robots.txt` e `publish.js` salvo necessidade confirmada;
- em erro de arquivo bloqueado, identificar o processo antes de repetir a publicação.

## Acesso remoto

Tailscale foi escolhido para o momento atual por permitir acesso privado ao computador local sem expor publicamente o painel. Migração para nuvem continua como possibilidade futura.

## Recuperação básica

1. parar o painel;
2. identificar o último backup válido;
3. restaurar somente os arquivos necessários;
4. preservar dados mais recentes sempre que possível;
5. iniciar o painel e testar;
6. documentar a causa e a reversão.
