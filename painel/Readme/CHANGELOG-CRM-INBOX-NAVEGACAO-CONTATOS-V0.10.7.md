# CRM / Inbox — navegação rápida e início de conversa (v0.10.7)

## Objetivo

Reduzir o tempo operacional dentro do Inbox e aproximar o fluxo de atendimento do comportamento do WhatsApp Web.

## Alterações

- O card **WhatsApp e Inbox** da central CRM passou a se chamar **Inbox**.
- O card agora abre diretamente em `/automacao-whatsapp?tab=inbox`.
- A descrição “Conversas, contatos, notas, lembretes e atendimento.” saiu do corpo do card e foi movida para um ícone `i`.
- O resumo superior do Inbox com Conversas / Aguardando / Novos / Vendas / Grupos foi removido desta tela operacional. Os dados continuam disponíveis para futura organização no Dashboard ou Painel Comercial.
- A troca entre conversas passou a usar navegação assíncrona: o navegador busca a próxima conversa e substitui apenas a área operacional do chat, sem recarregar a página inteira. A URL continua sendo atualizada e os botões voltar/avançar do navegador são preservados.
- O código do composer deixou de depender do ID da conversa gravado no HTML inicial; passa a ler dinamicamente a conversa atualmente aberta.
- Foi adicionado o botão **＋ Iniciar nova conversa** ao lado da busca do Inbox.
- A nova busca reúne contatos já presentes no Inbox, contatos do WhatsApp e clientes do cadastro principal do ERP.
- Os registros são consolidados por telefone para reduzir duplicidades entre ERP, Inbox e WhatsApp.
- Números vindos do ERP são verificados no WhatsApp antes da abertura sempre que a conexão está disponível. Registros confirmados como sem WhatsApp ficam indisponíveis para início de conversa.
- Ao escolher um contato que já possui conversa, o sistema abre a conversa existente. Para um número válido ainda sem histórico, é criada a estrutura mínima da conversa e o Inbox é aberto pronto para envio.
- A lista de contatos do WhatsApp utiliza cache curto em memória (5 minutos) para evitar consultas pesadas a cada tecla. A busca visual usa debounce de 250 ms.

## Arquivos alterados

- `routes/navigation.js`
- `views/area_hub.ejs`
- `routes/automacao_whatsapp.js`
- `services/whatsapp_inbox.js`
- `views/automacao_whatsapp.ejs`

## Arquivo novo

- `Readme/CHANGELOG-CRM-INBOX-NAVEGACAO-CONTATOS-V0.10.7.md`

## Observações de implementação

O cadastro de clientes usado pela pesquisa é o `CustomerService` principal do ERP (`data/erp/customers`), evitando criar uma nova base paralela apenas para o Inbox. A estrutura de conversa é persistida no armazenamento já existente do Inbox.
