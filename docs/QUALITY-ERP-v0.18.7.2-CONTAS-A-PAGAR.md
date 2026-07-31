# Quality ERP v0.18.7.2 — Correções Operacionais do Contas a Pagar

## Ajustes
- Pagamentos em Pix, boleto, cartão e demais formas passam a gerar saída no mesmo Caixa Operacional, e não apenas pagamentos em dinheiro.
- Cada saída mantém vínculo com conta, parcela, forma financeira e chave idempotente para evitar duplicidade.
- Separação visual entre Contas ativas e Estornadas.
- Novo filtro de tipo: Despesa ou Compra.
- Cadastro passa a gravar o tipo do lançamento, mantendo contas antigas como Despesa por compatibilidade.
- Abas do painel lateral ajustadas para não exibirem rolagem vertical indevida.
- Exportação atualizada para v0.18.7.2 e respeita os filtros ativos.

## Arquivos alterados
- services/payables-service.js
- services/commerce-service.js
- routes/erp.js
- views/contas_pagar.ejs
- public/js/contas-pagar.js
- public/css/painel-theme.css

## Testes recomendados
1. Abrir o Caixa Operacional.
2. Criar uma despesa e pagar uma parcela em Pix.
3. Confirmar a saída na linha do tempo do mesmo caixa, com forma Pix.
4. Repetir com dinheiro e boleto.
5. Reenviar a mesma requisição e confirmar que a chave idempotente evita duplicidade.
6. Alternar entre Contas ativas e Estornadas.
7. Filtrar por Compra e Despesa.

## Compatibilidade
Contas antigas sem `entryType` são tratadas como `expense`. Não houve migração destrutiva dos JSON existentes.
