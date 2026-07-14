# Automação WhatsApp v0.5.6 — Modo operacional compacto

## Objetivo
Otimizar o Inbox para uso diário em monitor Full HD (1920×1080) com zoom de 100%, priorizando conversa, histórico e campo de resposta.

## Alterações
- cabeçalho do módulo reduzido no Inbox;
- descrição em uma única linha e ocultada em telas menores;
- ações superiores convertidas em botões compactos com tooltip;
- abas menores;
- quatro cards grandes substituídos por uma barra de resumo;
- coluna de conversas reduzida e itens mais densos;
- área do Inbox calculada pela altura disponível da janela;
- histórico passou a ocupar o espaço restante automaticamente;
- cabeçalho da conversa, mensagens e composer compactados;
- comportamento das outras abas preservado;
- conexão, envio, blocos, leitura e dados não foram alterados.

## Arquivos
- routes/automacao_whatsapp.js
- views/automacao_whatsapp.ejs
- services/whatsapp_inbox.js (preservado)

## Teste
1. Usar resolução 1920×1080 e zoom 100%.
2. Abrir Inbox com uma conversa.
3. Confirmar lista, histórico e composer na mesma tela.
4. Enviar texto e executar bloco.
5. Testar painel do contato, menu de ações e não lidas.
6. Testar janela menor para confirmar adaptação.

## Próxima etapa sugerida
Abrir nova conversa para planejar tema Claro/Escuro/Seguir sistema e, depois, anexos manuais.
