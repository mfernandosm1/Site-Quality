# Quality ERP — Palavras-chave, fluxos e agendamento do Inbox

Data: 23/08/2026
Módulo: Automação WhatsApp / Inbox
Versão interna: `0.12.0-palavras-chave-fluxos`

## 1. Pesquisa geral do menu

- Aumentada a área útil do campo `[F1] Pesquisar menu`.
- O input passa a ocupar toda a caixa disponível, com altura e fonte maiores.
- Mantido o atalho F1 e o comportamento atual da busca global.

## 2. Correção do envio de mensagens agendadas

O agendamento já era salvo, porém o disparo dependia excessivamente do ciclo periódico do monitor e o áudio gravado podia perder informações importantes de MIME ao ser reconstruído para envio.

Ajustes:

- criado wake-up individual para o próximo horário agendado;
- monitor de segurança reduzido para 5 segundos;
- processamento imediato ao iniciar o módulo;
- o próprio Inbox garante que o monitor esteja armado ao criar/consultar agendamentos e recupera itens vencidos ao abrir a lista;
- mensagens vencidas são verificadas logo após o WhatsApp reconectar;
- áudio agendado mantém o MIME salvo (`audio/webm`, etc.) e é reconstruído em `MessageMedia` a partir do arquivo armazenado;
- áudio é enviado como mensagem de voz;
- falhas recebem até 3 tentativas, com nova tentativa após 2 minutos;
- dados de tentativa (`lastAttemptAt` / `nextAttemptAt`) ficam disponíveis para a interface;
- criar, cancelar ou tentar novamente um agendamento recalcula imediatamente o próximo wake-up.

## 3. Nova automação por palavras-chave

Adicionada a aba **Palavras-chave** em Automação WhatsApp.

Cada regra possui:

- nome interno;
- uma ou várias palavras/frases acionadoras;
- modo de comparação:
  - contém;
  - exatamente igual;
  - começa com;
- bloco a executar;
- ativo/pausado;
- prioridade definida pela ordem da lista;
- contador de execuções e último acionamento.

As comparações ignoram maiúsculas/minúsculas, acentos e pontuação simples.

### Prioridade durante um fluxo

Quando o cliente está aguardando uma resposta de uma etapa **Opções**, essa resposta é tratada primeiro. Ela não dispara uma nova regra de palavra-chave paralela. Isso evita interromper um atendimento em andamento.

### Simulador

A aba inclui um simulador que permite digitar uma mensagem e verificar qual regra seria acionada, sem enviar nada pelo WhatsApp.

## 4. Menus e ramificações

O construtor de blocos do Quality ERP já possui a etapa **Opções**. Cada alternativa pode:

- enviar texto;
- enviar mídia;
- abrir outro bloco;
- encerrar o fluxo.

Com a conexão atual baseada em `whatsapp-web.js`, a apresentação segura permanece em formato de menu numerado/textual. A biblioteca utilizada atualmente marca o envio de botões e listas nativas como recursos descontinuados. A estrutura de ramificações foi mantida separada da apresentação para permitir migrar futuramente para um canal que ofereça mensagens interativas oficiais sem reconstruir os fluxos.

## 5. Arquivos de dados

Novo arquivo criado automaticamente quando necessário:

`data/automacao-whatsapp/palavras_chave.json`

O caminho exato segue a pasta de dados já utilizada pelo módulo.

## 6. Fluxo recomendado para teste

1. Reiniciar o Quality ERP.
2. Confirmar o WhatsApp como conectado.
3. Criar um bloco simples chamado `Horário de atendimento`.
4. Na aba **Palavras-chave**, criar uma regra com frases como:
   - `qual horário vocês atendem`
   - `horário de atendimento`
   - `que horas abre`
5. Vincular ao bloco e manter a regra ativa.
6. Enviar uma dessas frases para o número conectado a partir de outro WhatsApp.
7. Confirmar que o bloco é disparado e que o contador da regra aumenta.
8. Para o agendamento, criar uma mensagem para 2 minutos à frente e confirmar a mudança de `Pendente` para `Enviado`.
