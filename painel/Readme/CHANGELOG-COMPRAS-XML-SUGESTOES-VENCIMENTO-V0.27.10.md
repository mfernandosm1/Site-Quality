# Compras XML — sugestões e vencimento v0.27.10

## Objetivo
Melhorar a identificação automática de produtos durante a importação de NF-e e corrigir a perda de foco do campo de primeiro vencimento no plano de pagamento.

## Alterações
- O catálogo de produtos da compra passou a usar cache invalidado automaticamente quando `products.json` ou o estoque mudam, reduzindo reconstruções desnecessárias.
- A conferência XML cria índices temporários por EAN, código/referência, nome e tokens do catálogo antes de analisar os itens da nota.
- A sugestão inteligente passou a considerar relevância dos termos, sequência inicial, identificadores e conflitos de números/modelos.
- Sugestões com dois termos relevantes e boa distância para a segunda opção podem ser apresentadas sem exigir um nome quase idêntico. Ex.: `Chip Vivo Triplo Hibrido` pode sugerir `Chip Vivo Pré Pago`, permanecendo necessária a confirmação do operador.
- Produtos rejeitados anteriormente continuam fora das sugestões daquele vínculo.
- O campo `1º vencimento` não recria mais o plano de pagamento ao digitar/selecionar uma data. O foco permanece no próprio campo.
- Datas das parcelas são recalculadas em memória e os campos já visíveis são atualizados sem reconstruir a linha.
- O primeiro campo `Forma` foi limitado a uma largura mais compacta para equilibrar a linha do plano de pagamento.

## Segurança operacional
A sugestão automática não cria vínculo definitivo sozinha. Um produto apenas sugerido continua pendente até o usuário confirmar em `Definir`.

## Arquivos alterados
- `services/purchase-service.js`
- `views/compras.ejs`
