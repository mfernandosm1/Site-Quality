# Quality ERP v0.20.1b — Correção definitiva dos status ERP × Loja Virtual

## Problema corrigido

Ao selecionar **Inativo** para ERP ou Loja Virtual e salvar a linha, o painel recebia novamente o valor ativo e restaurava o seletor.

## Solução aplicada

- Criada a rota dedicada `POST /produtos/update-channel-status`.
- O salvamento da linha captura os valores selecionados antes da requisição.
- Após salvar os demais dados do produto, a interface grava ERP e LV pela rota dedicada.
- A resposta canônica da rota dedicada atualiza os seletores da tela.
- O campo legado `active` continua espelhando somente a Loja Virtual, preservando o publicador atual.
- O status ERP permanece em `erp.active`.
- O status LV permanece em `virtualStore.active` e `virtualStore.channels.lojaVirtual.enabled`.
- Valores booleanos antigos gravados como texto (`"false"`, `"0"`, `"inativo"`) passam a ser interpretados corretamente.

## Arquivos alterados

- `routes/produtos.js`
- `views/produtos.ejs`

## Teste recomendado

1. Reiniciar o painel.
2. Abrir Produtos.
3. Alterar ERP para Inativo e clicar em Salvar.
4. Confirmar que o seletor continua Inativo imediatamente.
5. Pressionar F5 e confirmar que permanece Inativo.
6. Repetir com Loja Virtual.
7. Reativar ERP e deixar somente LV inativa para confirmar independência.

## Compatibilidade

Nenhuma publicação automática foi adicionada. O botão Publicar continua sendo o único responsável pela sincronização do site.
