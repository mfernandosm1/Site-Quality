# Quality ERP — Agenda v1.1

Ajustes feitos após validação da primeira versão da Agenda.

- Corrigida a classificação por horário: uma tarefa passa para **Vencidas** assim que o horário programado é ultrapassado, inclusive no mesmo dia.
- Validação de data/hora reforçada no navegador e no serviço: horários inexistentes, como `84:88`, não são aceitos.
- Agenda reorganizada em quatro opções lado a lado: **Vencidas**, **Hoje**, **Próximas** e **Concluídas**. Apenas a opção selecionada é exibida, reduzindo rolagem e poluição visual.
- **Concluídas recentemente** corrigida no tema Black OLED.
- Numeração do ranking **Quem mais comprou nos últimos 30 dias** corrigida no Black OLED.
- Na dashboard, Agenda continua ocupando apenas uma linha em **Atenção necessária**. A linha mostra resumo compacto e um contador das tarefas que pedem ação agora (vencidas + hoje).
- Adicionado acesso permanente **Agenda** ao cabeçalho do Centro de Operações, além do acesso já existente pela Atenção necessária e pela barra rápida personalizável.

Arquivos alterados:

- `services/erp_tasks.js`
- `views/agenda.ejs`
- `views/index.ejs`
- `public/js/dashboard.js`
- `public/css/painel.css`
