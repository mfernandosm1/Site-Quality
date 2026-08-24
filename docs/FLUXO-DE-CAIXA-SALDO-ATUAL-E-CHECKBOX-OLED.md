# Fluxo de Caixa — saldo atual e checkbox Black OLED

## Alterações

### 1. Saldo atual

O primeiro card do Fluxo de Caixa foi alterado de **Saldo inicial** para **Saldo atual**.

O valor é calculado por:

```text
Saldo atual = saldo anterior ao período + entradas realizadas - saídas realizadas
```

O card **Saldo do período** continua exibindo somente o resultado das movimentações realizadas dentro do intervalo selecionado.

O **Saldo projetado** agora parte do saldo atual e adiciona os valores previstos:

```text
Saldo projetado = saldo atual + receber previsto - pagar previsto
```

### 2. Checkbox no tema Black OLED

O checkbox **Considerar suprimentos e sangrias** recebeu estilo próprio, sem depender da aparência nativa do navegador. Isso corrige o fundo claro e a baixa legibilidade no tema Black OLED.

## Arquivos alterados

- `services/cash-flow-service.js`
- `views/fluxo_caixa.ejs`
- `public/css/painel-theme.css`
