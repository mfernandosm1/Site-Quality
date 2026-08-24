# PDV — seleção rápida de produto V0.27.9

## Ajustes
- Clique em um resultado da busca rápida agora adiciona o produto diretamente à operação, executando a mesma ação do botão **Adicionar**.
- `Enter` no campo Produto / serviço adiciona o produto selecionado; quando ainda não há seleção explícita, utiliza o primeiro resultado visível da busca.
- Após adicionar, a busca é limpa e recebe foco novamente para agilizar vendas sequenciais e uso com teclado/leitor.
- O botão **Adicionar** continua funcionando normalmente e passa a compartilhar a mesma rotina de inclusão, evitando comportamentos diferentes entre mouse e teclado.

## Escopo
Alteração somente na interface do PDV (`views/pdv.ejs`). Nenhuma regra de estoque, preço, pagamento ou finalização foi modificada.
