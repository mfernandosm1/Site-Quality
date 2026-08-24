# Quality ERP — Agendamento de áudio + CRM mais inteligente

Data: 23/08/2026

## Pesquisa do menu
- A largura voltou ao tamanho confortável anterior.
- A altura foi reduzida levemente para a pesquisa ficar menos alta dentro do cabeçalho.

## Inbox — mensagens agendadas com áudio
- O áudio gravado deixa de ser convertido obrigatoriamente para WAV; o navegador preserva o codec original, priorizando OGG/Opus quando suportado e WebM/Opus como alternativa.
- O backend deixa de reconstruir a mídia agendada com `MessageMedia.fromFilePath` e passa a utilizar os bytes do arquivo em memória, igual ao fluxo de anexo manual do Inbox.
- O envio tenta, nesta ordem: mensagem de voz, áudio normal e, somente como último recurso de compatibilidade, arquivo de áudio.
- `Tentar agora` reaproveita o mesmo fluxo novo, inclusive para agendamentos antigos que ainda possuem o arquivo armazenado.
- O tipo MIME do áudio é normalizado para evitar problemas com valores contendo `;codecs=...`.
- Quando o último fallback for necessário, o histórico informa `enviado como arquivo de áudio`.

## Painel Comercial — Agenda / Lembretes
- O título `Lembretes` foi alterado para `Agenda / Lembretes`.

## Painel Comercial — Atendimento
- Os indicadores deixam de depender apenas dos estados históricos gravados na conversa.
- `Aguardando agora` usa a direção real da última mensagem e considera atendimentos abertos dos últimos 7 dias.
- `Críticos +2h` passa a ser calculado somente sobre essa fila real de clientes aguardando.
- `1ª resposta média · 30d` é recalculada pelas mensagens reais, somente nos dias em que o cliente iniciou o contato; intervalos acima de 12 horas são ignorados para não distorcer o indicador com atendimentos retomados no dia seguinte.
- O cálculo recebe cache curto de 10 segundos para não pesar a navegação.

## Painel Comercial — Interesses mais frequentes
- Textos longos, menus numerados e conteúdos que parecem respostas/fluxos automáticos deixam de entrar no ranking.
- O ranking mantém apenas interesses curtos e claros.
- A captura automática de novos interesses também passa a rejeitar conteúdos com aparência de menu completo.

## Arquivos alterados
- `public/css/painel.css`
- `routes/automacao_whatsapp.js`
- `services/whatsapp_inbox.js`
- `views/automacao_whatsapp.ejs`
