# Quality ERP v0.20.1a — Correção da Persistência ERP × Loja Virtual

## Objetivo

Corrigir o retorno automático dos status **ERP** e **Loja Virtual (LV)** para Ativo após salvar o produto.

## Ajustes realizados

- Normalização robusta de valores booleanos recebidos pelo Express, incluindo `false`, `0`, `off`, `inativo` e valores enviados em array.
- Persistência explícita de `erp.active` após a montagem completa do cadastro.
- Persistência explícita de `virtualStore.active` e `virtualStore.channels.lojaVirtual.enabled`.
- Manutenção do campo legado `active` como espelho do status LV para compatibilidade com o publicador atual.
- Leitura correta de valores booleanos antigos que possam estar gravados como texto.
- Sincronização visual da linha com os valores efetivamente devolvidos pelo backend após o salvamento.
- Correção de um bloco JavaScript duplicado na rotina de confirmação de salvamento.

## Compatibilidade

- Nenhuma migração destrutiva de dados.
- Produtos antigos continuam herdando o status anterior quando os novos campos ainda não existem.
- O botão Publicar e o fluxo de publicação não foram alterados.
- Estoque, PDV, Compras e demais módulos não foram reescritos.

## Teste rápido

1. Na listagem de produtos, altere ERP para **Inativo** e salve.
2. Pressione F5. O status deve continuar Inativo.
3. Reative o ERP e altere somente LV para **Inativo**.
4. Salve e pressione F5. LV deve continuar Inativo e ERP deve permanecer Ativo.
5. Abra o cadastro pelo botão Editar e confirme os mesmos estados.

## Arquivos alterados

- `routes/produtos.js`
- `views/produtos.ejs`
