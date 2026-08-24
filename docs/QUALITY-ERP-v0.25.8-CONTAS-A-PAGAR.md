# Quality ERP v0.25.8 — Contas a Pagar

## Objetivo

Corrigir a rolagem duplicada da Central Financeira e manter o nome do fornecedor sincronizado com o Cadastro Mestre.

## Alterações

### Central Financeira

- O cartão externo do modal não possui mais rolagem própria.
- O cabeçalho permanece fixo na estrutura do modal.
- Somente o conteúdo interno da conta realiza rolagem vertical.
- A página ao fundo continua bloqueada enquanto a conta está aberta.

### Fornecedor atualizado

- Contas vinculadas por `supplierId` passam a exibir o nome atual do Cadastro Mestre.
- Alterar o nome do fornecedor atualiza automaticamente a listagem e os detalhes do Contas a Pagar após recarregar a página.
- O nome armazenado originalmente na conta continua preservado como fallback histórico quando não existe vínculo válido.
- Valores, parcelas, pagamentos, classificação e histórico da conta não são alterados.

## Arquivos alterados

- `public/css/painel.css`
- `services/payables-service.js`

## Testes recomendados

1. Abrir a CP-12 e confirmar que existe somente uma barra de rolagem dentro do modal.
2. Rolar até a última parcela e voltar ao topo.
3. Fechar o modal e confirmar que a página volta a rolar normalmente.
4. Alterar novamente o nome de um fornecedor no Cadastro Mestre.
5. Recarregar o Contas a Pagar e confirmar o novo nome na tabela e nos detalhes da conta.
6. Confirmar que contas sem fornecedor vinculado continuam exibindo o nome histórico salvo.
