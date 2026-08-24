# DRE Inteligente — v0.30.0

Revisão gerencial do DRE com base no fluxo visual utilizado no WM10, preservando a estrutura e os dados do Quality ERP.

## Alterações

- Resumo principal reorganizado para: **Receitas → CMV → Lucro bruto → Despesas → Resultado líquido**.
- O card de **Despesas** exibe o total e a quantidade de lançamentos, evitando adicionar um sexto card apenas para contagem.
- Margem líquida passou a aparecer como informação complementar do card de Resultado líquido.
- Valores negativos usam sinal `-` e destaque vermelho; resultados positivos usam verde.
- Análise gerencial ganhou contexto sobre receitas, CMV, lucro bruto, despesas, quantidade de lançamentos e maior grupo de despesa.
- Estrutura do DRE ganhou separação visual entre **Receitas e custo da mercadoria**, **Lucro bruto**, **Despesas** e **Resultado líquido**.
- Grupos permanecem recolhidos por padrão e podem ser expandidos até plano de conta e lançamento.
- **Centro de custo** e **Plano de conta** foram unificados no filtro **Classificação financeira**, com dois grupos internos no seletor.
- Adicionada exportação do conteúdo filtrado em **PDF** e **Imagem (PNG)**, incluindo cards, análise e estrutura detalhada.
- Mantida proteção contra duplicidade no regime de competência: recebimentos de contas a receber vinculados a venda/O.S. já considerada não somam a receita duas vezes.

## Regra do resumo

`Receitas - Deduções - CMV = Lucro bruto`

`Lucro bruto - Demais despesas = Resultado líquido`

Receitas financeiras e outras receitas classificadas como grupos de adição também participam do total de receitas do resumo gerencial.
