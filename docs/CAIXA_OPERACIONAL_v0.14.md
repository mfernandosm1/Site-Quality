# Painel Quality ERP — Caixa Operacional v0.14

## Objetivo

Controlar o turno de caixa do PDV com rastreabilidade de abertura, entradas, saídas, recebimentos, conferência e fechamento.

## Fluxo operacional

```text
Abrir caixa
   ↓
Vendas e O.S.
   ↓
Suprimentos / Sangrias
   ↓
Conferência do dinheiro físico
   ↓
Fechamento
   ↓
Histórico e comprovante
```

## Regra da gaveta

Somente movimentações em **dinheiro** alteram o saldo físico do caixa.

- Dinheiro: altera a gaveta.
- Pix: registra recebimento financeiro, mas não altera a gaveta.
- Cartão: registra recebimento financeiro, mas não altera a gaveta.
- Boleto/crediário: registra a obrigação ou recebível, mas não altera a gaveta.

## Cálculo do dinheiro esperado

```text
Saldo inicial
+ Suprimentos
+ Vendas recebidas em dinheiro
- Sangrias
- Despesas em dinheiro
= Dinheiro esperado
```

## Fechamento inteligente v0.14.4

O operador informa o dinheiro contado. O sistema calcula:

```text
Diferença = Dinheiro contado - Dinheiro esperado
```

Regras:

- O dinheiro contado é obrigatório.
- Não pode ser negativo.
- Havendo qualquer diferença de pelo menos R$ 0,01, a observação é obrigatória.
- O fechamento salva um snapshot do resumo do turno.
- Depois do fechamento, o PDV fica bloqueado até nova abertura.

## Dados registrados no fechamento

- caixa;
- abertura e fechamento;
- usuário de abertura e fechamento;
- saldo inicial;
- suprimentos;
- vendas em dinheiro;
- sangrias e despesas;
- total recebido em todas as formas;
- dinheiro esperado;
- dinheiro contado;
- diferença;
- observação;
- resumo por forma de pagamento;
- quantidade de movimentações.

## Histórico

A tela do Caixa Operacional mostra os últimos fechamentos do caixa selecionado. Cada fechamento pode ser aberto e impresso.

## Persistência

- `cashboxes.json`: caixas cadastrados.
- `cash-sessions.json`: aberturas e fechamentos.
- `cash-movements.json`: movimentações do turno.
- `operations.json`: vendas e O.S.
- `commerce-settings.json`: formas de pagamento e configurações.
