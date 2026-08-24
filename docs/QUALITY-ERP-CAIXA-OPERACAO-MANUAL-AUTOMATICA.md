# Quality ERP — Operação manual e automática do Caixa

## Objetivo

Eliminar a duplicidade entre o campo **Operação do caixa** e o antigo checkbox de abertura/fechamento automáticos.

## Regra definitiva

### Manual

- abertura feita pelo usuário;
- fechamento feito pelo usuário;
- nenhum horário automático é executado;
- a rotina automática ignora completamente o caixa.

### Automática

- o turno atual fecha nos horários configurados;
- o próximo turno abre automaticamente;
- podem existir vários horários de troca no mesmo dia.

## Alterações

### `views/configuracoes_caixa_pdv.ejs`

- o seletor Manual/Automática voltou a ser editável;
- removido o checkbox redundante;
- horários aparecem somente no modo Automático;
- a própria seleção determina o valor enviado ao servidor;
- texto de ajuda muda conforme o modo escolhido.

### `services/commerce-service.js`

- `closingMode` passou a ser a única fonte de verdade ao salvar;
- `automaticShiftsEnabled` é mantido internamente por compatibilidade, sempre espelhando `closingMode`;
- configurações antigas contraditórias são normalizadas na leitura;
- quando a flag antiga estiver explicitamente desativada, o caixa permanece Manual, mesmo que exista um `closingMode: automatic` legado.

## Teste recomendado

1. Acesse **Configurações → Caixa / PDV**.
2. Selecione **Manual** e salve.
3. Recarregue a página e confirme que continua Manual.
4. Abra o caixa e aguarde/passse por um horário anteriormente configurado: ele não deve fechar sozinho.
5. Selecione **Automática**, configure um horário futuro próximo e salve.
6. Confirme que o turno fecha e o seguinte abre no horário configurado.
