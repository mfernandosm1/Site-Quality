# WhatsApp v0.5.9 — Painel Comercial

## Escopo

Entrega focada exclusivamente na leitura comercial dos dados já existentes no Inbox.

Não foram alterados:

- conexão com o WhatsApp;
- autenticação ou sessão LocalAuth;
- envio de textos;
- envio de anexos;
- execução de blocos;
- armazenamento das mensagens e mídias.

## Arquivos alterados

- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
- `services/whatsapp_inbox.js`

## Implementação

Foi adicionada a aba **Painel Comercial**, alimentada exclusivamente por `conversations.json` e pelos campos já mantidos pelo Inbox.

### Indicadores

- total de conversas comerciais;
- oportunidades abertas;
- clientes aguardando atendimento;
- vendas concluídas;
- conversão registrada;
- tempo médio da primeira resposta.

A conversão registrada usa a fórmula:

`vendas concluídas / (vendas concluídas + perdidos)`

Ela considera somente conversas que já tiveram um desfecho comercial explícito.

### Funil comercial

Exibe a quantidade atual nos status:

- Novo contato;
- Em andamento;
- Pendente;
- Venda concluída;
- Perdido;
- Sem potencial.

### Oportunidades abertas

Lista conversas nos status Novo, Em andamento e Pendente, priorizando clientes que aguardam resposta.

Filtros disponíveis:

- busca por nome, número ou produto;
- status comercial;
- aguardando resposta ou respondido.

Ao clicar em uma oportunidade, o operador é levado diretamente para a conversa no Inbox.

### Origem e produtos

O painel agrupa as origens já existentes e apresenta os produtos de interesse registrados automaticamente ou preenchidos manualmente.

## Refinamentos básicos incluídos

- navegação direta do Painel Comercial para a conversa;
- filtros operacionais sem recarregar a página;
- layout compacto compatível com a filosofia do Inbox em Full HD/zoom 100%;
- priorização visual das conversas aguardando resposta;
- nenhum campo novo obrigatório e nenhuma migração de dados.

## Compatibilidade e segurança

A função `getCommercialDashboard()` é somente leitura. Ela não altera arquivos JSON, mensagens, contatos ou estado da conexão.

Em bases vazias, todos os indicadores retornam zero e as listas exibem estado vazio sem erro.
