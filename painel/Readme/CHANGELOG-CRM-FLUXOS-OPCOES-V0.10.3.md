# CRM / Automação WhatsApp — Fluxos por opção v0.10.3

## Objetivo
Evoluir a etapa **Opções** dos blocos para um fluxo realmente ramificado: o cliente escolhe uma alternativa clicável e cada alternativa executa seu próprio destino.

## Alterações
- O aviso de alterações não salvas foi reduzido para um selo compacto: **⚠️ Alterações não salvas**.
- Removidos os controles globais de expandir/recolher etapas que não agregavam ao fluxo operacional.
- A etapa **Opções** foi redesenhada. Cada alternativa possui agora **Ao clicar**, com os destinos:
  - Enviar texto;
  - Enviar imagem;
  - Enviar áudio;
  - Enviar vídeo;
  - Enviar arquivo;
  - Executar outro bloco;
  - Encerrar fluxo.
- Mídias usadas diretamente em uma alternativa podem ser escolhidas da biblioteca ou enviadas por upload.
- Mídias vinculadas às alternativas passam a contar como mídia em uso, evitando exclusão indevida pela biblioteca.
- Blocos antigos que usavam `proximoBloco` continuam compatíveis e são interpretados como **Executar outro bloco**.

## Menu clicável no WhatsApp
A versão atual do `whatsapp-web.js` utilizada no projeto é a 1.34.7. Nessa versão, botões e listas interativas tradicionais estão marcados pela própria biblioteca como recursos descontinuados. Por isso o fluxo utiliza **enquete de escolha única (Poll)** como transporte clicável suportado pelo WhatsApp Web.

Ao clicar em uma alternativa da enquete, o evento `vote_update` é associado à conversa e à sessão de fluxo pendente. A ação configurada para aquela alternativa é executada imediatamente.

Se o envio da escolha clicável falhar, permanece a contingência por texto numerado, para que o atendimento não seja interrompido.

## Persistência
A sessão pendente continua pequena e temporária. Ela armazena apenas a identificação da conversa, opções e ação escolhível; nenhuma nova cópia de mídia é criada para o fluxo.

## Compatibilidade
- Blocos antigos permanecem válidos.
- Continuação para outro bloco permanece disponível.
- Inbox e execução em fila não foram alterados.
