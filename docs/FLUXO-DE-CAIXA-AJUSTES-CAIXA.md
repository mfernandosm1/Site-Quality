# Fluxo de Caixa — suprimentos e sangrias

## Alteração

As movimentações manuais do Caixa dos tipos `supply` (suprimento) e `withdrawal` (sangria) deixaram de participar do Fluxo de Caixa Inteligente por padrão.

Isso significa que elas não alteram:

- saldo inicial do Fluxo de Caixa;
- entradas ou saídas realizadas;
- saldo do período;
- saldo projetado;
- totais diários;
- linha do tempo financeira.

As movimentações continuam preservadas no histórico e no fechamento do Caixa operacional. Nenhum registro é apagado ou alterado.

## Consulta opcional

Na tela **Fluxo de Caixa Inteligente**, o filtro **Ajustes do caixa** oferece a opção:

> Considerar suprimentos e sangrias

Ao habilitá-la, esses movimentos voltam a ser incluídos somente naquela consulta. O filtro também está disponível na API por meio do parâmetro:

```text
includeCashAdjustments=1
```

Sem o parâmetro, ou com ele desabilitado, suprimentos e sangrias permanecem ocultos.

## Arquivos alterados

- `services/cash-flow-service.js`
- `routes/erp.js`
- `views/fluxo_caixa.ejs`
- `public/css/painel-theme.css`

## Arquivo novo

- `Readme/FLUXO-DE-CAIXA-AJUSTES-CAIXA.md`
