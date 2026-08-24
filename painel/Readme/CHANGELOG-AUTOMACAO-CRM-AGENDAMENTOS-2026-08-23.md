# Ajustes — Automação, CRM e agendamentos — 23/08/2026

## Menu global
- Campo `[F1] Pesquisar menu` reduzido levemente na largura, mantendo a área interna de digitação ocupando todo o campo.

## Inbox — mensagens agendadas
- Envio automático ganhou estratégia de envio mais resiliente: tenta pelo cliente, pelo chat já resolvido e, quando necessário, atualiza o identificador do número antes de falhar.
- Mídia agendada passa a usar `MessageMedia.fromFilePath`, o mesmo caminho mais estável já usado por outras mídias do módulo.
- Áudio tenta primeiro como mensagem de voz e, em caso de falha específica desse formato, tenta como áudio normal.
- Áudios gravados no navegador são preparados em WAV antes de serem armazenados, evitando depender apenas do WebM gerado pelo Chrome.
- Mantidas até 3 tentativas automáticas, com erro visível no próprio agendamento e ação `Tentar agora`.

## Automação de respostas
- Aba `Palavras-chave` renomeada para `Automação`.
- Textos explicativos extensos removidos da tela e concentrados no ícone de informação.
- Nomenclaturas de execução alteradas para `respostas automáticas`.
- Métricas adicionadas: hoje, esta semana, este mês e total.
- Ranking das frases/gatilhos mais acionados passa a ser registrado a partir desta versão.
- Contadores são incrementados somente após o bloco ser executado com sucesso.

## Painel comercial / CRM
- `Dashboard` e `Painel Comercial` foram consolidados em um único `Painel Comercial`.
- Removidos da visão principal: Últimos blocos, Status do módulo e Segurança operacional.
- Novos indicadores de contatos únicos que vieram até a loja: hoje, semana e mês.
- A contagem considera apenas períodos em que a primeira mensagem partiu do cliente, evitando contabilizar conversas iniciadas pela empresa.
- Adicionado gráfico diário de contatos do mês.
- `Oportunidades abertas` foi substituído por `Oportunidades que pedem ação`, com priorização por espera do cliente, próxima ação vencida, pendência, interesse registrado e recência.
- Cada oportunidade passa a mostrar motivo e ação sugerida.

## Arquivos alterados
- `public/css/painel.css`
- `routes/automacao_whatsapp.js`
- `services/whatsapp_inbox.js`
- `views/automacao_whatsapp.ejs`
