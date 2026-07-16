# Quality WhatsApp Lab v0.1.0

Laboratório isolado para diagnosticar a camada de integração WhatsApp do Painel Quality.

## Regra principal

**Feche o Painel Quality antes de executar o Lab.** O Painel e o Lab usam a mesma sessão `LocalAuth`; dois processos não devem abri-la simultaneamente.

## Instalação

1. Extraia a pasta, preferencialmente em `C:\Site\whatsapp-lab`.
2. Confira o caminho da sessão no arquivo `.env.example`.
3. Caso o caminho padrão esteja correto, basta executar `start-lab.bat`.
4. Na primeira execução, o script instala as dependências automaticamente.

Se o Painel estiver em outro caminho, copie `.env.example` para `.env` e ajuste `WA_SESSION_PATH`.

## Resultado

O Lab gera:

- `reports\diagnostico-<data>.json`
- `logs\lab.log`

Envie o JSON gerado para a próxima análise.

## Escopo da v0.1.0

- validação da pasta de sessão;
- detecção do Chrome;
- inicialização do cliente;
- eventos `qr`, `authenticated`, `ready`, `auth_failure`, `disconnected`;
- leitura de `client.info`;
- snapshot básico da página;
- encerramento seguro.

Esta versão não chama `getChats()` e não altera Inbox, CRM, mídias, contatos ou arquivos do Painel.
