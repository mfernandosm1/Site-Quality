# Quality ERP — v0.10.11 — Regra financeira líquida

## Objetivo
Padronizar Fluxo de Caixa, DRE e indicadores financeiros para que estornos não sejam tratados como novas receitas ou novas despesas.

## Regra adotada
- Pagamento normal aumenta **Saídas realizadas**.
- Estorno de pagamento **reduz Saídas realizadas**; não aumenta Entradas realizadas.
- Recebimento normal aumenta **Entradas realizadas**.
- Estorno de recebimento **reduz Entradas realizadas**; não aumenta Saídas realizadas.
- O movimento de estorno continua visível no histórico/linha do tempo para auditoria.
- Registros `reversed`, `cancelled`, `void` ou com `reversalStatus=reversed` não entram novamente nos consolidados financeiros.

## Fluxo de Caixa
Os cards passam a trabalhar com valores líquidos. A decomposição passa a respeitar:

`Saldo do período = Entradas realizadas líquidas - Saídas realizadas líquidas`

Quando existe saldo anterior ao intervalo filtrado:

`Saldo atual = Saldo anterior + Entradas líquidas - Saídas líquidas`

No conjunto de dados usado para validação em agosto/2026:
- Entradas realizadas: R$ 16.844,79
- Saídas realizadas brutas anteriores: R$ 10.650,90
- Estornos de pagamentos: R$ 223,56
- Saídas realizadas líquidas: R$ 10.427,34
- Saldo: R$ 6.417,45

Assim, `16.844,79 - 10.427,34 = 6.417,45`.

Os totais diários da linha do tempo também usam o mesmo conceito líquido, sem perder os lançamentos de estorno individuais.

## DRE
A leitura financeira foi reforçada para ignorar registros revertidos/cancelados/anulados tanto no regime de caixa quanto nas origens operacionais usadas no regime de competência. O estorno elimina o efeito econômico do lançamento original, em vez de criar uma receita/despesa artificial.

## Financeiro / Dashboard
Os consolidados financeiros passam a usar a mesma regra de registros ativos. Os resumos diário e mensal agora retornam também saldo calculado diretamente por `entradas - saídas`, garantindo reconciliação matemática dos indicadores.

## Dashboard Geral
Contas a pagar, contas a receber e pagamentos realizados usam a mesma validação de registro financeiramente ativo, evitando que valores estornados/cancelados/anulados reapareçam em cards consolidados.

## Compatibilidade
Contas a Pagar e Contas a Receber já removiam pagamentos/recebimentos estornados de seus resumos. A versão reforça e padroniza essa regra nos demais consolidados sem alterar o histórico de auditoria.
