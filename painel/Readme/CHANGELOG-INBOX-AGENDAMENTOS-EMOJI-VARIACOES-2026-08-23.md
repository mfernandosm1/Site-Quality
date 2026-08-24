# Quality ERP — Inbox, agendamentos e variações — 23/08/2026

## Agendamentos do Inbox
- Mantido o envio de áudio agendado em OGG/Opus já validado.
- Arquivo opcional agora aceita imagem, áudio **e vídeo** (MP4, WebM ou MOV/QuickTime), até 40 MB.
- Vídeos agendados usam a mensagem como legenda.
- Cada agendamento ganhou ação **Excluir**.
- No modal foram adicionados **Limpar histórico** e **Limpar todos**.
- O Painel Comercial ganhou o card **Mensagens agendadas**, com data/hora, cliente, status, abrir conversa e excluir.
- O Painel Comercial também permite limpar o histórico global já enviado/cancelado/com erro sem apagar pendentes.

> Observação: o arquivo `mensagens_agendadas.json` com os testes locais não veio dentro do ZIP enviado. Por isso a atualização não apaga automaticamente dados locais do computador. Depois de instalar, use **Limpar todos** na conversa de teste para remover os registros mostrados no histórico.

## Inbox / UX
- Inbox passa a aproveitar melhor a altura útil da janela.
- Lista de conversas e área de mensagens usam altura flexível, reduzindo o espaço morto inferior.
- Popover **Executar bloco** ficou mais compacto para não ficar cortado.
- Adicionado seletor simples de **emojis** no compositor, sem dependência externa.

## Variações e estoque
- Corrigida a situação em que uma nova opção de variação era salva, mas não entrava em **Estoque por variação**.
- Ao adicionar uma nova opção, o ERP cria somente as combinações necessárias para ela e preserva estoque/preço das combinações existentes.
- Combinações órfãs de opções removidas são eliminadas.
- Produtos já afetados são reconciliados ao abrir Produtos pela primeira vez após a atualização.
- Corrigido também o editor de estoque para não perder o `Preço ERP` da combinação ao salvar quantidades.
