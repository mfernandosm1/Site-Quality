# CRM / Inbox — desempenho e correções (v0.9.8)

## Objetivo
Reduzir o tempo de abertura do Inbox, evitar downloads desnecessários em grupos e corrigir problemas operacionais observados no uso diário.

## Alterações
- Removida da abertura normal do CRM a varredura completa de armazenamento (mensagens, mídias, backups e JSONs). Essa rotina era custosa e não era utilizada pela tela do Inbox.
- O resumo do Inbox e o Painel Comercial agora reaproveitam a mesma leitura do índice de conversas, evitando releituras do mesmo JSON.
- Conversas já lidas não reescrevem o arquivo inteiro de conversas apenas por serem abertas novamente.
- A sincronização passou a ser incremental: chats cujo último registro local já corresponde ao último evento remoto são ignorados, evitando buscar novamente dezenas de mensagens a cada reconexão ou sincronização manual.
- Em grupos, mídias recebidas não são mais baixadas automaticamente durante sincronização, recebimento ou abertura da conversa. Foto, figurinha, áudio, vídeo e documento só são recuperados quando o operador clicar. Contatos/clientes mantêm o comportamento anterior.
- Eventos internos transitórios do WhatsApp (`ciphertext`, notificações E2E, protocolo etc.), que podem surgir após reinícios do processo, deixam de ser gravados como mensagens. Chamadas passam a ser apresentadas como “📞 Chamada pelo WhatsApp” e mensagens apagadas como “🚫 Mensagem apagada”.
- O aviso “Executando bloco...” saiu da parte inferior do compositor e virou um balão discreto no topo da conversa, desaparecendo automaticamente em cerca de 1,8 s; erros permanecem por mais tempo para leitura. Blocos selecionados em sequência passam a entrar em fila, em vez de rejeitar o segundo comando enquanto o primeiro ainda está em execução.
- Corrigido o botão de “Forçar sincronização” no tema Black OLED, com fundo, borda e contraste coerentes com o tema.

## Arquivos alterados
- `services/whatsapp_inbox.js`
- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`

## Observação de desempenho
O maior ganho ocorre principalmente após reiniciar o servidor (`Ctrl+C` / `npm start`) ou ao abrir o Inbox com muitas conversas já sincronizadas, pois o sistema deixa de repetir trabalho pesado para chats que não mudaram.
