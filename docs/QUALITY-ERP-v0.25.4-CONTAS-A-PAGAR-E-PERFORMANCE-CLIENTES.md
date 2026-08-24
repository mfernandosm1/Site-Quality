# Quality ERP v0.25.4 — Parcelas, filtros e performance de clientes

## Objetivo

Refinar o cadastro de Contas a Pagar e reduzir o tempo de abertura da listagem de clientes sem alterar os fluxos existentes de Caixa, Financeiro, Compras ou Contas a Receber.

## Contas a Pagar

- Adicionado gerador rápido de parcelas por quantidade.
- O operador informa a quantidade e o primeiro vencimento e clica em **Gerar parcelas**.
- As datas avançam mês a mês, preservando o dia sempre que possível.
- Quando a distribuição automática está marcada, o total é dividido entre as parcelas e o ajuste de centavos é aplicado automaticamente.
- As parcelas continuam editáveis individualmente após a geração.
- A listagem passa a iniciar com o filtro rápido **Este mês**.
- Ao selecionar **Todos**, o painel exibe um aviso de carregamento para bases maiores.

## Clientes

A listagem já limitava a página a 20 clientes, porém calculava o resumo financeiro de cada cliente separadamente. Isso fazia múltiplas leituras e varreduras dos mesmos arquivos.

Foi criado um cálculo em lote para os resumos financeiros dos clientes da página atual:

- contas a receber são lidas uma vez;
- parcelas são lidas uma vez;
- recebimentos são lidos uma vez;
- os resultados são agrupados em memória pelos 20 clientes exibidos.

O comportamento visual e os valores exibidos permanecem os mesmos. A melhora real depende do tamanho dos arquivos JSON e do computador, portanto o tempo deve ser medido novamente no ambiente local.

## Arquivos alterados

- `views/contas_pagar.ejs`
- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`
- `services/receivables-service.js`
- `routes/erp.js`

## Arquivo novo

- `docs/QUALITY-ERP-v0.25.4-CONTAS-A-PAGAR-E-PERFORMANCE-CLIENTES.md`

## Testes recomendados

1. Criar uma conta de R$ 1.000,00, gerar 3 parcelas e conferir valores e vencimentos mensais.
2. Alterar manualmente uma data e um valor antes de salvar.
3. Abrir Contas a Pagar e confirmar que **Este mês** inicia selecionado.
4. Clicar em **Todos** e confirmar o aviso durante o carregamento.
5. Abrir a tela de clientes três vezes e comparar o tempo com os ~3,5 s anteriores.
6. Conferir em alguns clientes se saldo, atrasos e situação financeira permanecem corretos.
