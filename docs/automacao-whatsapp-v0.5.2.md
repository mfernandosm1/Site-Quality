# Automação WhatsApp v0.5.2

## Objetivo
Corrigir os primeiros pontos identificados no Inbox real sem alterar a conexão, os blocos ou a biblioteca de mídias.

## Alterações
- Atualização automática do Inbox a cada 2,5 segundos quando chegam novas mensagens.
- A página não recarrega automaticamente enquanto o operador estiver editando os campos da conversa.
- Tratamento de identificadores `@lid` usados pelo WhatsApp Web.
- Tentativa de obter o número real com `getContactLidAndPhone` antes de salvar a conversa.
- Conversas antigas registradas com LID podem ser migradas para o número real quando uma nova mensagem daquele contato for processada.
- O painel deixa de incluir todo interlocutor automaticamente em `contacts.json`.
- O cadastro na agenda do Painel passa a ser opcional por meio da caixa “Salvar também na agenda de contatos do Painel”.
- Nome, status, origem e produto podem ser salvos somente na conversa, sem criar contato exportável.
- O botão foi renomeado para “Salvar alterações”.

## Separação importante
- `conversations.json`: todas as conversas necessárias ao Inbox.
- `contacts.json`: somente contatos que o operador decidiu salvar manualmente.

Essa separação prepara as futuras exportações para Android/Google Contatos, iPhone/vCard, CSV e ERP sem incluir contatos indesejados.

## Limitações
- O histórico anterior à ativação do Inbox continua não sendo importado.
- Se o WhatsApp não disponibilizar o telefone para um identificador LID, o painel mostra “Número real ainda não identificado” e não permite salvar na agenda até uma resolução posterior.
- Nenhuma resposta automática foi adicionada.
