# Quality ERP — Observações de venda e O.S.

## Alteração realizada

- Removido do PDV o campo redundante **Detalhes da operação**.
- Mantido apenas **Observação geral** durante a criação e edição de vendas e O.S. abertas.
- Na ficha da operação dentro do cadastro do cliente, o campo passou a ser **Adicionar observação à operação**.
- Novas observações são acrescentadas ao histórico com usuário, data e hora, sem substituir textos anteriores.
- Observações antigas que já estavam gravadas em `details` continuam preservadas e aparecem como **Observação complementar anterior**.
- A Central de Operações também exibe o conteúdo das novas observações no histórico.

## Compatibilidade

O campo `details` não foi apagado do banco/JSON para evitar perda de dados antigos. O PDV deixou de gravar novos valores nesse campo, mas continua preservando o conteúdo já existente.

## Testes recomendados

1. Abrir uma venda nova e confirmar que aparece somente **Observação geral**.
2. Salvar a venda em aberto e reabrir, verificando a preservação da observação.
3. Finalizar a venda e abrir o histórico pelo cadastro do cliente.
4. Adicionar duas observações diferentes e confirmar que ambas aparecem separadamente no log.
5. Repetir o fluxo com uma O.S.
6. Abrir a operação pela Central de Operações e conferir o histórico.
7. Conferir uma operação antiga que possua `details`, garantindo que o texto anterior continua visível.
8. Testar nos temas Black OLED e Claro.
