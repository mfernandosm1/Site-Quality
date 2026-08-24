# CRM / Inbox — Nova conversa e performance v0.10.8

## Objetivo
Corrigir o travamento percebido ao pesquisar contatos para iniciar uma nova conversa e melhorar o fluxo de abertura de conversas no Inbox.

## Alterações
- Corrigido o hover do botão `+` no tema Black OLED, evitando fundo claro/branco.
- A pesquisa de nova conversa não executa mais `getContacts()` do WhatsApp a cada digitação.
- O diretório de contatos do WhatsApp passa a usar cache de 30 minutos e carregamento único em segundo plano.
- Enquanto o diretório do WhatsApp é carregado, a pesquisa responde imediatamente usando Inbox + clientes do ERP + cache já disponível.
- Removida a validação em lote de vários telefones durante a pesquisa. A validação do WhatsApp ocorre somente quando o operador realmente tenta abrir/iniciar a conversa.
- Adicionado debounce de 400 ms e cancelamento da pesquisa anterior com `AbortController`, impedindo requisições acumuladas durante a digitação.
- Adicionado campo dedicado para digitar um número novo e iniciar conversa mesmo quando o contato ainda não existe no ERP ou na lista do Inbox.
- O número digitado é validado no WhatsApp antes da criação da conversa; números inexistentes não criam conversas inválidas.
- A pesquisa por contato continua consolidando telefone para evitar duplicidade entre ERP, Inbox e WhatsApp.

## Arquivos alterados
- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`

## Observação operacional
A primeira carga do diretório completo do WhatsApp pode ocorrer em segundo plano, mas não bloqueia mais a resposta da pesquisa digitada. Pesquisas subsequentes reutilizam o cache.
