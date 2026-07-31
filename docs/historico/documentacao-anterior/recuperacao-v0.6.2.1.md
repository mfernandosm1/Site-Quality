# Automação WhatsApp — v0.6.2.1 Recuperação Estável

## Escopo
Retorno controlado à base validada da v0.6.2 após regressões observadas na linha v0.6.3.x.

## Alteração aplicada
- Restaurados os três arquivos funcionais da v0.6.2.
- Alterado somente o identificador interno de versão para `0.6.2.1`.
- Nenhuma migração de dados.
- Nenhuma alteração na pasta de sessão.

## Mudanças removidas temporariamente
- Paginação de mensagens do Inbox.
- Atualização incremental de mensagens via polling.
- Busca ampliada de mídias remotas no histórico do WhatsApp.
- Rotas auxiliares introduzidas na v0.6.3.x.

## Dados preservados
Todo o conteúdo em `content/automacao_whatsapp`, especialmente `inbox` e `session`, deve permanecer intocado.

## Critérios de aceite
- conexão automática da sessão;
- identidade correta de contatos;
- visualização e download de mídias;
- grupos funcionando;
- CRM preservado;
- envio manual funcionando.
