# PDV — vendedor por item e equipe operacional

## Objetivo
Permitir que uma mesma operação tenha vendedores diferentes por produto/serviço, sem transformar "vendedor" ou "técnico" em um papel fixo do usuário.

## Alterações
- O campo **Vendedor do item** passa a usar a mesma lista de equipe configurada no Caixa/PDV, mantendo preenchimento manual quando necessário.
- Ao adicionar um item, ele herda o **Vendedor principal** daquele momento. Depois pode ser trocado individualmente sem alterar os demais itens.
- Na O.S., **Técnico responsável** usa a mesma lista de equipe. Um mesmo nome pode atuar como vendedor em uma operação e técnico em outra.
- A configuração visual **Vendedores autorizados** foi renomeada para **Equipe disponível no PDV / O.S.**. A chave interna `allowedSellers` foi mantida para compatibilidade com dados existentes.
- O vendedor principal da O.S. continua sendo informação interna da operação; nenhuma alteração foi feita no comprovante para exibi-lo.

## Pagamento
- Ao voltar a Forma de pagamento para **Selecione...**, o campo Valor é limpo e Parcelas volta para 1.
- Ao escolher novamente uma forma, o preenchimento automático do saldo restante continua funcionando.

## Comissões
Esta entrega registra o vendedor por item, que é a base necessária para cálculo futuro de comissões por produto/serviço e por funcionário. Não foi criado cálculo de comissão nesta etapa para evitar misturar regra financeira/comercial com a tela do PDV. O módulo de Comissões deve consumir os vendedores gravados nos itens finalizados e manter regras próprias de percentual/valor, vigência e exceções.
