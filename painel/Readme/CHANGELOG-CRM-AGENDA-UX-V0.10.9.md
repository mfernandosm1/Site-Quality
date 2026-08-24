# Quality ERP — CRM / Agenda / Blocos v0.10.9

Data: 16/08/2026

## Inbox — correção Black OLED
- Corrigido o resultado da janela **Iniciar conversa** no Black OLED.
- Linhas, avatar, bordas, hover/focus e badges agora respeitam o fundo escuro.
- Mantida compatibilidade com os aliases de tema `oled` e `black-oled`.

## Agenda — responsáveis e filtros
- Adicionado campo **Responsável** ao criar uma tarefa.
- O campo aceita digitação livre e sugere responsáveis já usados.
- Adicionado filtro rápido por responsável, com opção **Todas** para visualizar as tarefas de todos.
- Cada tarefa mostra claramente o responsável na própria linha.
- Tarefas concluídas também exibem o responsável.
- Contadores Vencidas / Hoje / Próximas / Concluídas respeitam o responsável selecionado.

## Agenda — Black OLED e notificações
- Corrigido o tema Black OLED da Agenda, incluindo cards, campos, abas, tarefas e filtro de responsáveis.
- O aviso de sucesso/erro da Agenda some automaticamente após aproximadamente 2,5 segundos.
- O parâmetro `flash` também é removido da URL após o carregamento para evitar reaparecimento ao atualizar a página.

## Agenda — limpeza dos testes
- Criada migração única da Agenda para a versão de armazenamento `2`.
- Na primeira execução desta versão, tarefas antigas de teste da Agenda são removidas.
- A limpeza acontece apenas na migração v1 → v2; novas tarefas criadas depois disso não serão apagadas em reinicializações futuras.

## Blocos
- A frase “Monte a sequência visual do bloco e teste cada etapa antes de salvar.” foi movida para um ícone `i` ao lado do título do editor.
- O ícone de ajuda que ficava abaixo de **+ Opções** agora fica ao lado do botão **+ Opções**.

## Biblioteca de mídias
- A explicação “Organizada por bloco...” foi movida para um ícone `i` ao lado do título.
- A mensagem principal foi simplificada para: **“Esta biblioteca contém somente materiais oficiais dos blocos.”**
- A informação ficou concentrada no tooltip para deixar a tela mais limpa.

## Arquivos alterados
- `views/automacao_whatsapp.ejs`
- `views/agenda.ejs`
- `routes/erp.js`
- `services/erp_tasks.js`
- `public/css/painel.css`
