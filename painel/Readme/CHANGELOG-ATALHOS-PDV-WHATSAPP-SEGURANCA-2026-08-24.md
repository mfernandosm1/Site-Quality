# Quality ERP — Atalhos, cadastro PDV e revisão WhatsApp

Data: 24/08/2026

## Atalhos rápidos
- Diferencia `Produtos ERP` de `Produtos do site` na personalização dos atalhos.
- `Produtos ERP` abre `/produtos?origem=erp`.
- `Produtos do site` mantém `/produtos` e passa a usar ícone distinto.

## Cadastro de cliente pelo PDV
- Campo Data de nascimento passa a aceitar digitação e colar em `DD/MM/AAAA`, igual ao cadastro mestre de Clientes.
- Datas salvas continuam normalizadas em `AAAA-MM-DD` no backend.
- Incluída validação de data antes do envio.

## WhatsApp — redução de risco operacional
> Estas proteções reduzem disparos acidentais e ajudam a respeitar preferências do cliente. Elas não tornam `whatsapp-web.js` uma integração oficial da Meta.

- Identificado o canal atual como `whatsapp-web.js` + `LocalAuth` (WhatsApp Web não oficial).
- Tela de Conexão passa a informar claramente a diferença para a WhatsApp Business Platform/API Oficial.
- Intervalo automático de aniversariantes passa a ter mínimo de 45 segundos.
- Mensagens agendadas vencidas são espaçadas na fila em 5 segundos.
- Etapas automáticas de blocos ganham intervalo mínimo entre mensagens quando não há uma etapa de pausa explícita.
- Adicionado opt-out automático para frases claras como `parar`, `sair`, `não quero receber mensagens` e equivalentes.
- Contatos em opt-out não recebem aniversários automáticos nem novos agendamentos automáticos.
- Agendamentos já existentes são cancelados automaticamente se o cliente pedir opt-out antes do horário de envio.
- Frases explícitas de retorno, como `quero voltar a receber`, removem o bloqueio automático.
- Painel de aniversariantes identifica contatos em opt-out para não tratá-los como pendentes.
- Terminologia de “delay humano” foi trocada na interface por “intervalo operacional”.

## Observação de arquitetura
Para automações comerciais em produção com o menor risco de restrição de conta, a evolução indicada é substituir a sessão automatizada do WhatsApp Web pela WhatsApp Business Platform/API Oficial, mantendo regras de consentimento, opt-out, janela de atendimento e templates quando aplicável.
