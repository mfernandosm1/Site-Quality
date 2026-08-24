# Quality ERP v0.25.3 — Refinamento de Contas a Pagar

Data: 02/08/2026

## Objetivo

Refinar o cadastro e a consulta de Contas a Pagar sem alterar a estrutura central das integrações com Compras, Caixa e Financeiro.

## Implementações

### Competências

- Adicionado botão inferior fixo **Adicionar próxima competência**, acessível durante a rolagem do modal.
- Ao adicionar uma competência, o sistema cria o mês seguinte, avança o vencimento em um mês, rola até o novo registro e posiciona o foco no campo de mês/ano.
- O avanço mensal preserva o dia escolhido e ajusta automaticamente para o último dia em meses mais curtos.

### Plano de pagamento e parcelas

- As linhas do plano de pagamento agora exibem numeração, como **Parcela 1/12**.
- Adicionada a opção, habilitada por padrão, **Dividir o total igualmente e avançar os vencimentos mês a mês**.
- Ao adicionar ou remover linhas, o total é redistribuído em centavos, garantindo que a soma final seja exatamente igual ao valor da despesa.
- A primeira data funciona como base para as seguintes. Exemplo: 10/08/2026, 10/09/2026 e 10/10/2026.
- A opção pode ser desmarcada para permitir composição e valores totalmente manuais.

### Classificação de contas existentes

- Contas ativas agora permitem editar **Centro de custo** e **Plano de contas** diretamente na tela de detalhes.
- A alteração é registrada no histórico geral da conta, preservando valor anterior e novo valor.
- Contas estornadas permanecem apenas para consulta.

### Cards e filtros

- Os cards **Em aberto**, **Vencem hoje**, **Vencidos** e **Pagos no mês** passam a acompanhar os filtros ativos da listagem.
- São considerados pesquisa, situação, origem, período, fornecedor, forma prevista, centro de custo, plano de contas e visualização ativa/estornada.

## Arquivos alterados

- `public/js/contas-pagar.js`
- `public/css/painel-theme.css`
- `views/contas_pagar.ejs`
- `services/payables-service.js`
- `routes/erp.js`

## Arquivo novo

- `docs/QUALITY-ERP-v0.25.3-CONTAS-A-PAGAR.md`

## Testes recomendados

1. Criar uma conta com várias competências e confirmar que o botão inferior continua acessível.
2. Definir a primeira data como 10/08/2026, adicionar parcelas e conferir o avanço mensal.
3. Conferir a divisão de um valor com centavos, como R$ 1.000,00 em três linhas: R$ 333,34, R$ 333,33 e R$ 333,33.
4. Desmarcar a divisão automática e alterar valores e datas manualmente.
5. Abrir a CP-12, editar Centro de custo e Plano de contas, salvar e conferir o histórico.
6. Aplicar cada filtro e confirmar a atualização dos quatro cards.
7. Conferir os modos Black OLED e Light.
