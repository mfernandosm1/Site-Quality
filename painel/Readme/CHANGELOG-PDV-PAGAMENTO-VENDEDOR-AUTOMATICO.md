# PDV — pagamento e vendedor automáticos

## Objetivo
Reduzir digitação repetitiva no caixa sem tirar a possibilidade de ajuste manual.

## Pagamento
- Ao selecionar uma forma de pagamento em uma linha vazia, o PDV preenche automaticamente o valor com o saldo restante da operação.
- Em pagamento misto, valores já digitados são preservados e a próxima forma recebe somente o que ainda falta.
- O valor continua totalmente editável.

## Vendedor principal
- Nova opção em Configurações do Caixa / PDV: **Usar usuário logado como vendedor principal**.
- Quando houver login individual, o usuário logado é preenchido automaticamente se estiver autorizado como vendedor.
- A lista `Vendedores autorizados` também alimenta sugestões no campo do PDV.
- `Vendedor padrão` continua funcionando como alternativa quando não houver usuário logado habilitado.
- A implementação é compatível com a estrutura atual, na qual o módulo completo de Usuários e Permissões ainda está marcado como planejado.
