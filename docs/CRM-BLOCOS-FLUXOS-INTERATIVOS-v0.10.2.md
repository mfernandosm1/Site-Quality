# CRM / Automação WhatsApp — Fluxos interativos v0.10.2

## Ajustes de interface

- O aviso `Existem alterações ainda não salvas` foi reduzido para um destaque compacto, sem ocupar toda a largura do editor.
- Os controles globais de expandir/recolher etapas (`⤢` / `⤡`) foram removidos, pois não agregavam ao fluxo operacional.

## Opções com continuação automática

A etapa **Opções** agora pode funcionar como um menu de decisão do fluxo:

1. Defina o texto exibido acima das opções.
2. Em cada opção, informe o rótulo mostrado ao cliente.
3. O campo **Atalho** permanece como alternativa digitada (ex.: `1`, `2`).
4. Selecione no novo campo de destino qual **bloco será executado** quando o cliente escolher aquela opção.
5. Se o destino ficar em `Encerrar fluxo após esta escolha`, nenhuma continuação é executada.

Quando ao menos uma opção possui um bloco de destino, o sistema tenta enviar uma **lista interativa clicável do WhatsApp**. O bloco atual pausa nessa etapa. Ao cliente selecionar uma opção, o CRM identifica a escolha e executa automaticamente o bloco vinculado.

Como contingência, caso o WhatsApp não aceite a lista interativa naquele momento, o sistema envia as opções em texto e continua aceitando a resposta digitada pelo cliente.

## Compatibilidade

- Blocos antigos que possuíam `proximoBloco` pelo nome continuam sendo reconhecidos.
- Novas seleções passam a gravar o ID do bloco, evitando problemas se o nome do bloco for alterado posteriormente.
- A leitura do Inbox já reconhecia `list_response`; por isso a escolha interativa não vira código técnico na conversa.

## Estado e armazenamento

O sistema mantém somente um registro pequeno de fluxo pendente por conversa, em `flow_sessions.json`, com expiração lógica de 24 horas. Não há cópia de mídia nem novo armazenamento de áudio, imagem ou vídeo para sustentar os menus.

Isso permite inclusive recuperar uma escolha pendente após reinício do painel sem criar armazenamento relevante.

## Arquivos alterados

- `routes/automacao_whatsapp.js`
- `views/automacao_whatsapp.ejs`
- `documentacao/CRM-BLOCOS-FLUXOS-INTERATIVOS-v0.10.2.md`
