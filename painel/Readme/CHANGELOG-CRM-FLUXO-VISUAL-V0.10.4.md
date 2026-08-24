# CRM / Automação WhatsApp — Fluxo visual v0.10.4

## Objetivo

Remover a implementação por enquete da etapa **Opções** e preparar o construtor de blocos para trabalhar com ramificações reais, sem perder os blocos existentes.

## Alterações

- removido o uso de `Poll` / `vote_update` do `whatsapp-web.js`;
- a etapa **Opções** continua criando uma espera de fluxo por conversa, mas o canal atual envia uma lista numerada compatível (`1.`, `2.`, `3.`...);
- respostas por número, texto da opção e IDs de lista permanecem reconhecidas pelo motor de fluxo;
- cada opção conserva sua ação independente: texto, imagem, áudio, vídeo, arquivo, outro bloco ou encerramento;
- criado **Mapa do fluxo** no editor, exibindo sequência, pontos de decisão e destinos de cada ramificação;
- o mapa é atualizado enquanto o usuário altera pergunta, opção, destino ou conteúdo;
- incluído aviso técnico discreto no mapa deixando claro que a estrutura está pronta para um futuro canal com botões/listas nativos, sem prometer menu clicável no canal atual;
- blocos salvos no formato v0.10.3 permanecem compatíveis.

## Motivo

A enquete do WhatsApp registra votos, mas não representa corretamente um menu conversacional. Nesta versão, a enquete foi retirada para evitar uma UX enganosa e o modelo de dados passa a priorizar o fluxo e suas ramificações.

## Compatibilidade

Nenhuma mídia é duplicada por esta alteração. As ações de mídia continuam referenciando os arquivos já cadastrados na biblioteca de mídias.
