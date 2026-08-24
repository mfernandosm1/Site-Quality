# PDV — código do produto e reaproveitamento de operação vazia

## Ajustes

- O item adicionado ao PDV passa a exibir o código abaixo do nome no formato `Cód: 2255`.
- Prefixos `PRD`, separadores e zeros à esquerda são removidos apenas para apresentação no PDV.
- Ao solicitar **Nova operação**, o sistema verifica se existe uma venda em aberto no mesmo caixa sem conteúdo operacional.
- Uma operação somente é tratada como vazia quando não possui cliente, identificador, vendedor salvo, observações, detalhes, produtos, pagamentos, cupom nem dados de O.S.
- Quando uma venda vazia é encontrada, o operador escolhe entre **Prosseguir com venda #XX** ou **Criar nova mesmo assim**.
- A rota de criação também faz a mesma proteção no servidor, evitando gerar rascunhos vazios em sequência por atalhos ou navegação direta.

## Arquivos alterados

- `views/pdv.ejs`
- `routes/erp.js`
