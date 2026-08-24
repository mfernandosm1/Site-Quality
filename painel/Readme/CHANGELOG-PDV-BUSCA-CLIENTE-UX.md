# PDV — Busca / cadastro rápido de cliente

## Ajuste visual

O modal de busca de clientes do PDV foi alinhado ao fluxo de pesquisa + cadastro rápido:

- título mantido como **Pesquisar / adicionar cliente**;
- texto de apoio simplificado para **nome, telefone, CPF/CNPJ ou e-mail**;
- placeholder simplificado para os mesmos quatro campos;
- ícone de informação mantido, explicando que um CPF/CNPJ não cadastrado inicia o fluxo de novo cliente;
- adicionada mensagem discreta no rodapé: **Cliente não encontrado? Pesquise pelo CPF/CNPJ para cadastrar rapidamente.**;
- estilos contemplam Black OLED e tema claro.

## Busca por e-mail

A pesquisa por e-mail já fazia parte do mecanismo real de busca do PDV e foi preservada. O `renderCustomerSearch()` inclui `customer.email` no texto pesquisável e utiliza a mesma normalização tolerante já adotada no PDV, incluindo remoção de diferenças de caixa e separadores. Assim, pesquisar o endereço completo ou partes iniciais de seus segmentos continua retornando o cliente correspondente.

## Escopo

Nenhuma regra de cadastro, validação de CPF/CNPJ, seleção de cliente ou pesquisa de produtos foi alterada neste ajuste.

## Refinamento visual do campo de pesquisa
- Aumentada discretamente a altura do campo de pesquisa de clientes para 38 px.
- Ajustado o espaçamento interno para melhorar leitura, foco e área de clique sem aumentar o modal desnecessariamente.
- Alteração isolada ao modal de pesquisa de clientes; nenhuma regra de busca ou cadastro foi modificada.
