# Automação WhatsApp v0.5.5 — UX do Inbox

## Objetivo

Reduzir a quantidade de elementos visíveis no Inbox e deixar o atendimento mais rápido,
intuitivo e próximo dos padrões já conhecidos do WhatsApp Web, sem alterar a conexão,
a persistência ou a segurança dos envios manuais.

## Alterações principais

- lista de conversas mais compacta;
- contador verde de mensagens não lidas;
- conversa aberta é marcada automaticamente como lida;
- opção **Marcar como não lida** no menu da conversa;
- horário humanizado: Agora, minutos, Ontem, dia da semana ou data;
- indicação da última mensagem enviada com `✓`;
- barra lateral colorida conforme o status comercial;
- campo de mensagem compacto no rodapé;
- botão `+` preparado para anexos;
- botão `🧩` abre a lista de blocos sem ocupar espaço permanente;
- botão `➤` envia a mensagem;
- dados do contato removidos do rodapé e colocados em painel lateral recolhível;
- rolagem automática até a mensagem mais recente;
- Escape fecha menus e painel lateral;
- interface responsiva preservada.

## Cores do status comercial

- azul: Novo contato;
- amarelo: Em andamento;
- laranja: Pendente;
- verde: Venda concluída;
- vermelho: Perdido;
- cinza: Sem potencial.

## Comportamento das mensagens não lidas

Quando uma nova mensagem recebida é registrada:

- o contador verde aumenta;
- a conversa ganha destaque visual;
- ao abrir a conversa, o contador é zerado;
- pelo menu `⋮`, a conversa pode ser marcada novamente como não lida.

## Segurança preservada

- nenhuma resposta automática;
- blocos só executam após clique;
- texto só envia após ação manual;
- mídias dos blocos permanecem separadas das mídias das conversas;
- JSONs existentes não são substituídos;
- sessão LocalAuth não é alterada.

## Arquivos alterados

```text
C:\Site\painel\routes\automacao_whatsapp.js
C:\Site\painel\views\automacao_whatsapp.ejs
C:\Site\painel\services\whatsapp_inbox.js
```

## Testes recomendados

1. Reiniciar o painel e confirmar conexão automática.
2. Abrir o Inbox e conferir o novo layout.
3. Receber uma mensagem com o Inbox aberto em outra conversa.
4. Confirmar contador verde.
5. Abrir a conversa e confirmar que o contador desaparece.
6. Usar `⋮` e marcar como não lida.
7. Abrir `👤` e salvar alterações do contato.
8. Abrir `🧩` e executar um bloco pequeno.
9. Enviar texto pelo campo compacto.
10. Confirmar Enter para enviar e Shift+Enter para nova linha.
11. Confirmar que a conversa abre posicionada na última mensagem.

## Limitações

- o botão `+` apenas prepara a interface; upload de mídias entra na próxima versão funcional;
- gravação de áudio ainda não foi implementada;
- menu contextual possui somente as ações já seguras nesta etapa;
- atualização continua usando consulta periódica de 2,5 segundos.
