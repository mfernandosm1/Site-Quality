# CRM / Inbox — envio de blocos sem recarregar e armazenamento enxuto (v0.9.9)

## Objetivo
Evitar que a operação do atendente seja interrompida após executar um bloco, simplificar o cabeçalho do módulo e reduzir downloads locais desnecessários durante sincronizações do WhatsApp.

## Alterações
- A execução rápida de blocos pelo Inbox não força mais `window.location.reload()` ao concluir.
- A janela de blocos permanece aberta após o envio, preservando a pesquisa digitada e devolvendo o foco ao campo de busca. Isso permite escolher o próximo bloco imediatamente.
- Após um bloco ser concluído, a revisão interna do Inbox é atualizada em segundo plano. Assim, o polling automático não interpreta o próprio envio do bloco como motivo para recarregar a página logo em seguida.
- O polling do Inbox também evita recarregar a página enquanto houver popover, menu de conversa ou ficha do cliente abertos.
- O texto longo abaixo de “Automação WhatsApp” foi substituído por um ícone `i`. Ao passar o mouse ou focar pelo teclado, o texto completo e a versão do módulo aparecem em um tooltip, inclusive no tema Black OLED.
- A sincronização inicial e o botão “Forçar sincronização” deixam de baixar mídias em massa de conversas históricas. Nessas rotinas são persistidos apenas dados necessários de mensagens/conversas.
- O comportamento já existente de grupos permanece sob demanda. Para contatos/clientes, a recuperação de mídias ao abrir a conversa e o tratamento das novas mensagens continuam preservados.
- Nenhuma mídia local já existente é apagada automaticamente por esta alteração.

## Impacto esperado
- Envio de vários blocos em sequência sem perder a lista aberta.
- Menos recarregamentos visuais e menos interrupções durante atendimento.
- Menor crescimento de armazenamento local causado por sincronizações históricas ou sincronizações manuais do Inbox.

## Arquivos alterados
- `views/automacao_whatsapp.ejs`
- `routes/automacao_whatsapp.js`
- `Readme/CHANGELOG-CRM-INBOX-UX-ARMAZENAMENTO-V0.9.9.md`
