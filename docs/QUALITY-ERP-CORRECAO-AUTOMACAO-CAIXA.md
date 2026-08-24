# Correção da automação do Caixa

## Regra definitiva

A opção **Ativar abertura e fechamento automáticos** passa a ser a chave-mestra da automação.

### Opção desmarcada

- abertura manual;
- fechamento manual;
- horários automáticos ignorados;
- o agendador não abre nem fecha sessões;
- configurações antigas com `closingMode: automatic` não provocam fechamento.

### Opção marcada

- o caixa utiliza os horários de turnos configurados;
- fecha o turno anterior e abre o próximo;
- a rotina continua idempotente e não duplica sessões.

## Proteções implementadas

1. O backend interrompe toda automação quando `automaticShiftsEnabled !== true`.
2. Ao salvar com a automação desmarcada, `closingMode` é normalizado para `manual`.
3. A interface deixa claro que, desmarcada, nenhuma rotina automática será executada.
4. Foi removido o caminho antigo de “fechamento automático simples”, que fechava o caixa mesmo sem abertura automática.

## Sobre a data 05/08 exibida

A tela do Caixa permite abrir um **fechamento histórico** pela URL com o parâmetro `fechamento`.
Nesse modo, são exibidas exclusivamente as movimentações da sessão antiga, mesmo que exista uma sessão nova aberta no dia atual.
Para voltar ao turno atual, use **Voltar ao caixa** ou remova o parâmetro `fechamento` da URL.

A abertura manual continua criando uma nova sessão com `openedAt` e `openedDay` do momento atual; sessões fechadas não são reutilizadas.
