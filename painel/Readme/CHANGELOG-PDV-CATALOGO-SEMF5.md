# PDV — atualização de produtos sem F5

## Objetivo

Manter o catálogo do PDV atualizado enquanto a tela permanece aberta, sem recarregar a página inteira e sem perder as regras atuais de pesquisa.

## Diagnóstico

O PDV recebe inicialmente o catálogo em `window.PDV_BOOT.products`. O servidor, por outro lado, já monta o catálogo a partir da fonte atual de produtos e estoque a cada chamada. Portanto, a defasagem ocorria no catálogo mantido no navegador.

## Ajuste aplicado

- O endpoint JSON `/erp/pdv/catalogo` continua sendo a fonte de atualização sob demanda do PDV.
- O catálogo é atualizado quando a aba do PDV volta ao foco ou volta a ficar visível.
- Ao focar o campo de produto, o catálogo é atualizado imediatamente.
- Durante a digitação, o catálogo pode ser revalidado com janela curta de proteção contra requisições repetidas.
- Ao abrir a lupa/lista completa de produtos, o catálogo é atualizado antes de renderizar os resultados.
- Antes de adicionar o produto à operação, o PDV faz uma última atualização do catálogo para usar nome, código, SKU, código de barras, preço, estoque e variação atuais.
- A seleção deixou de depender da posição numérica do produto no array. Agora usa uma chave estável do item do catálogo, evitando apontar para outro produto caso uma inclusão/alteração mude a ordenação enquanto o PDV está aberto.
- Se o item selecionado foi alterado, a seleção passa a apontar para os dados atualizados. Se deixou de existir/ficou indisponível, a seleção é invalidada.
- Se o modal de pesquisa estiver aberto durante uma atualização, seus resultados são renderizados novamente com o catálogo novo.

## Pesquisa preservada

Não foi alterada a regra `normalizeProductSearch` / `productSearchMatches`. Continuam funcionando:

- palavras parciais;
- múltiplos termos;
- números;
- código/SKU;
- código de barras;
- normalização de acentos.

## Cenários cobertos

1. PDV aberto → cadastrar produto em outra aba → voltar ao PDV → pesquisar: produto novo aparece sem F5.
2. PDV aberto → alterar produto em outra aba → voltar ao PDV → pesquisar: dados alterados aparecem sem F5.
3. Abrir a lupa de produtos depois de uma alteração: lista é revalidada antes de abrir.
4. Selecionar um produto e alterá-lo em outra aba antes de adicionar: o PDV revalida o catálogo e adiciona a versão atual.

## Arquivos alterados

- `views/pdv.ejs`
- `Readme/CHANGELOG-PDV-CATALOGO-SEMF5.md`


## Ajuste complementar — busca/cadastro de cliente no PDV

- O modal da lupa de cliente agora usa o título **Pesquisar / adicionar cliente**.
- O tooltip da lupa foi padronizado para **Pesquisar / adicionar cliente**.
- O texto principal continua curto e ganhou um ícone **i** com ajuda contextual: ao passar o mouse ou focar, informa que um CPF/CNPJ não encontrado pode iniciar um novo cadastro.
- O placeholder do campo de busca agora mostra diretamente os tipos de dado aceitos: nome, telefone, CPF/CNPJ, e-mail ou código.
- Nenhuma regra de busca, validação de CPF/CNPJ ou cadastro rápido foi alterada; o ajuste é apenas de UX/informação.
