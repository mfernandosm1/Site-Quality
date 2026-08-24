# Quality ERP — V5 — PDV: vencimentos retroativos + Contas a Pagar por dia

Data: 11/08/2026

## 1. PDV — bloqueio de vencimento retroativo

Regra adicionada para pagamentos que geram Contas a Receber (crediário e demais formas configuradas como recebível):

- O vencimento não pode ser anterior ao dia da venda/O.S.
- Campos de data do PDV recebem data mínima igual ao dia atual.
- Parcelamento personalizado valida todas as datas antes de salvar.
- Vencimento de parcela única também é validado imediatamente.
- O backend valida novamente antes da finalização, portanto a regra não depende apenas do navegador.
- A criação operacional do Contas a Receber possui uma segunda proteção contra datas anteriores à data de emissão da venda.

Importante: a regra é aplicada ao fluxo operacional do PDV. Lançamentos financeiros manuais continuam podendo representar compromissos históricos quando necessário.

## 2. Contas a Pagar — agrupamento visual por vencimento

Na ordenação padrão por vencimento, a listagem agora cria pequenos separadores por dia contendo:

- data do vencimento;
- quantidade de contas exibidas naquele dia;
- total das parcelas/valores exibidos naquele vencimento.

Exemplo:

`11/08/2026 · 2 contas     Total do dia: R$ 586,06`

As contas permanecem logo abaixo, sem alterar o fluxo de consulta/pagamento.

O agrupamento aparece nas ordenações "Vencimento mais próximo" e "Vencimento mais distante". Nas ordenações "Maior saldo" e "Mais recentes", a listagem permanece plana para respeitar a ordenação escolhida.

## 3. Arquivos desta entrega cumulativa

Esta V5 também inclui os arquivos da V4 (performance de Produtos e correção de data do Centro de Operações), para evitar perda da entrega anterior ao substituir os arquivos.

Arquivos alterados/incluídos:

- `views/pdv.ejs`
- `services/receivables-service.js`
- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel.css`
- `views/produtos.ejs` (V4 cumulativa)
- `routes/produtos.js` (V4 cumulativa)
- `services/operations-center-service.js` (V4 cumulativa)
- `Readme/CORRECOES-2026-08-11-PDV-DATAS-CONTAS-PAGAR-V5.md`

## 4. Instalação

Extrair o ZIP na raiz do Quality ERP, mantendo as pastas e substituindo os arquivos existentes. Reiniciar o `npm start` após a substituição, pois há alteração em service/backend.
