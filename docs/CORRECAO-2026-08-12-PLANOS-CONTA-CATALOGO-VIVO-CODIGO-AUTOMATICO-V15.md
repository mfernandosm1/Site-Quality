# Quality ERP — Catálogo vivo de Planos de Conta + código automático — V15
Data: 12/08/2026

## Problemas corrigidos

### 1. Plano recém-criado não aparecia no Contas a Pagar
Os campos de Plano de Conta eram montados com os dados existentes no carregamento da página. O componente de pesquisa ainda copiava internamente essas opções, deixando a lista congelada.

Resultado: um Plano de Conta criado nas Configurações Financeiras podia não aparecer na Nova Conta ou na reclassificação de uma conta já existente, mesmo após tentar pesquisar.

### Correção
Foi criado um catálogo vivo para classificação financeira:

- nova API de leitura dos catálogos financeiros;
- ao abrir Nova Conta, o Quality busca novamente Planos de Conta e Centros de Custo ativos;
- ao abrir/editar a classificação de uma conta existente, a lista é atualizada;
- ao focar a pesquisa de Plano de Conta, ocorre uma atualização leve do catálogo;
- ao voltar para a aba do Contas a Pagar, o catálogo pode ser atualizado;
- quando um Plano de Conta ou Centro de Custo é salvo em outra aba do mesmo navegador, as demais abas recebem um aviso via `localStorage` e atualizam a lista sem F5;
- o componente pesquisável agora consegue reconstruir a própria fonte de opções depois de uma atualização dinâmica.

Assim, a operação continua escolhendo apenas o Plano de Conta; o Centro de Custo segue herdado automaticamente.

## 2. Código do Plano de Conta automático
O usuário não precisa mais definir manualmente o código de um Plano de Conta.

O Quality calcula a próxima sequência disponível dentro do Centro de Custo.

Exemplo da base enviada:

- Centro de Custo: Custos Comerciais (`40`)
- existentes: `2.40.01` até `2.40.16`
- novo plano `Fatura cartões de crédito`: `2.40.17`
- próximo novo plano dentro de Custos Comerciais: `2.40.18`

Para centros de despesa, o padrão é `2.<código do centro>.<sequência>`.
Para o centro de receitas, a sequência segue o padrão já usado pela base `1.xx`.

### Planos existentes sem código
Na inicialização, o ERP detecta Planos de Conta sem código e preenche automaticamente a sequência correta. Não é necessário editar e salvar novamente.

O campo Código no formulário de Plano de Conta fica somente para consulta e não pode mais ser digitado manualmente.

## Validação realizada
Com uma cópia dos dados do ZIP `TIMATE.zip`:

- `Fatura cartões de crédito`, que estava sem código, foi migrado para `2.40.17`;
- um segundo Plano de Conta de teste criado em Custos Comerciais recebeu `2.40.18`;
- sintaxe validada nos arquivos JavaScript/backend alterados.

## Arquivos alterados
- `services/finance-service.js`
- `routes/erp.js`
- `views/configuracoes_financeiro.ejs`
- `public/js/financeiro-fundacao.js`
- `public/js/contas-pagar.js`
- `Readme/CORRECAO-2026-08-12-PLANOS-CONTA-CATALOGO-VIVO-CODIGO-AUTOMATICO-V15.md`

## Teste recomendado
1. Substituir os arquivos e reiniciar `npm start`.
2. Abrir Configurações Financeiras e conferir `Fatura cartões de crédito`; o código deve aparecer como `2.40.17`.
3. Deixar Contas a Pagar aberto em outra aba.
4. Criar um novo Plano de Conta dentro de Custos Comerciais.
5. Voltar para Contas a Pagar e abrir Nova Conta: o novo plano deve estar disponível sem F5.
6. Abrir uma conta existente → Editar classificação: o mesmo plano deve estar disponível.
7. Criar outro plano e confirmar que o código avança automaticamente.
