# Quality ERP v0.24.0.7 — Estorno financeiro integrado

## Correção

O estorno de uma Venda ou O.S. concluída agora trata a operação como uma unidade única:

1. localiza os títulos do Contas a Receber pelo `receivableIds` e também pelo `originId`;
2. estorna automaticamente todos os recebimentos ativos vinculados;
3. registra as devoluções correspondentes no Caixa e no Financeiro;
4. cancela o título e suas parcelas, zerando o saldo em aberto;
5. reverte estoque e recebimentos diretos da operação;
6. somente então marca a operação como estornada.

Todo o fluxo utiliza snapshots dos arquivos envolvidos. Se qualquer etapa falhar, os arquivos são restaurados para evitar estorno parcial.

## Reconciliação de registros antigos

Ao abrir o Contas a Receber, a reconciliação também verifica operações canceladas ou estornadas. Quando encontra um título ainda aberto, mas sem recebimentos ativos, cancela o título e as parcelas automaticamente.

Caso ainda exista recebimento ativo em um registro antigo, a reconciliação não apaga nem altera o valor silenciosamente; registra a pendência para que o estorno seja feito pelo fluxo operacional com Caixa aberto.

## Regra preservada

- Operação em aberto: pode ser cancelada.
- Operação concluída: deve ser estornada.
- Título com recebimento ativo: não pode ser cancelado isoladamente; o recebimento precisa ser estornado primeiro.
