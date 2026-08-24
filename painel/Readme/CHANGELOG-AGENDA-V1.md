# Quality ERP — Agenda rápida V1

## Objetivo
Criar uma agenda simples, rápida e funcional para tarefas e lembretes do usuário, integrada à dashboard e aos clientes do ERP.

## Implementado
- Nova tela `/erp/agenda`.
- Cadastro rápido de tarefa com título, data/hora, tipo, prioridade e cliente opcional.
- Tipos: Tarefa, Lembrete, Ligação, Retorno e Compromisso.
- Organização automática em Vencidas, Hoje e Próximas.
- Conclusão com um clique e exclusão no menu da tarefa.
- Histórico recente de concluídas recolhido.
- Vínculo opcional com cadastro real de clientes do ERP.
- Responsável gravado na tarefa para suportar agenda por usuário.
- Card compacto de Agenda dentro de "Atenção necessária" na dashboard, destacando vencidas e tarefas de hoje.
- Atalho "Agenda / tarefas" disponível na barra rápida personalizável.
- Compatibilidade visual com tema Claro e Black OLED.

## Arquivos alterados
- `services/erp_tasks.js`
- `routes/erp.js`
- `routes/index.js`
- `views/index.ejs`
- `public/js/dashboard.js`
- `public/css/painel.css`

## Arquivos novos
- `views/agenda.ejs`
- `Readme/CHANGELOG-AGENDA-V1.md`
