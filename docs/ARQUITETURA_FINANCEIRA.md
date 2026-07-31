# Quality ERP — Arquitetura Financeira

## Princípio central

Toda movimentação financeira deve possuir **uma única origem e uma única referência**. Os módulos operacionais registram eventos; os módulos financeiros e gerenciais consomem esses eventos.

## Fluxo principal

```text
Cadastros mestres
  Produtos / Clientes / Fornecedores
              ↓
Operação
  PDV / O.S. / Compras / Estoque
              ↓
Movimentações financeiras
              ↓
Caixa / Contas a pagar / Contas a receber
              ↓
Fluxo de Caixa
              ↓
DFC / DRE / Relatórios
```

## Estrutura mínima de uma movimentação

- `id`
- `origin` ou origem do módulo
- `type`
- `referenceType`
- `referenceId`
- `methodId`
- `amount`
- `signedAmount`
- `createdAt`
- `createdBy`
- `status`

## Exemplos

### Venda no PDV

```text
Origem: PDV
Tipo: recebimento de venda
Referência: Venda #35
Impacto: entrada
Forma: Pix
```

### Pagamento de fornecedor

```text
Origem: Compras / Financeiro
Tipo: pagamento de fornecedor
Referência: Compra #52
Impacto: saída
Forma: Pix
```

## Regras de integração

1. Um módulo não deve duplicar lançamento criado por outro módulo.
2. Caixa físico e movimento financeiro são conceitos relacionados, mas diferentes.
3. Somente dinheiro altera a gaveta operacional.
4. Pix, cartão e boleto devem existir na base financeira mesmo sem alterar a gaveta.
5. DFC, DRE, Fluxo de Caixa e relatórios não criam lançamentos; apenas classificam e consolidam dados existentes.
6. Estornos devem referenciar o lançamento original.
7. Alterações futuras devem preservar origem, referência e rastreabilidade.

## Preparação para módulos futuros

Compras, Contas a Pagar, Contas a Receber e Financeiro devem reutilizar esta base, evitando arquivos paralelos sem vínculo com a origem operacional.
