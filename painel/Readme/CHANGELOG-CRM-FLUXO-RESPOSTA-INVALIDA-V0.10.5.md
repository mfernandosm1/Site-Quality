# CRM / Automação WhatsApp — resposta inválida em menus v0.10.5

## Ajustes

- O **Mapa do fluxo** deixou de ocupar espaço permanente no editor. A explicação das ramificações agora fica em um ícone **i** ao lado de **Fluxo do bloco**.
- Etapas do tipo **Opções** ganharam o campo **Resposta não reconhecida**.
- O texto desse campo é enviado automaticamente quando o cliente responder algo que não corresponda a nenhuma opção válida.
- Uma resposta inválida **não encerra nem reinicia o fluxo**: a sessão continua aguardando a escolha correta.
- O campo pode ficar vazio quando não se deseja resposta automática.
- A sessão pendente é renovada quando ocorre resposta inválida, preservando o fluxo mesmo após mensagens incorretas.
- O novo texto é armazenado apenas como configuração do bloco/sessão e não adiciona mídias nem consumo relevante de armazenamento local.

## Compatibilidade

Blocos antigos continuam funcionando. Ao abrir uma etapa antiga de Opções no editor, é sugerida uma mensagem padrão, que passa a ser persistida quando o bloco for salvo.
