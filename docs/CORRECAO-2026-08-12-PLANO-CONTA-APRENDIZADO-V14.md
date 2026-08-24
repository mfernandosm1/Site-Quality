# Quality ERP — Plano de Conta unificado + aprendizado de classificação — V14
Data: 12/08/2026

## Objetivo
Simplificar a classificação financeira seguindo o fluxo operacional usado como referência no WM10:

- Centro de Custo organiza os Planos de Conta.
- O operador seleciona somente o Plano de Conta ao lançar/classificar uma despesa.
- O Centro de Custo é herdado automaticamente do Plano de Conta.
- O Grupo DRE deixa de ser uma escolha manual no cadastro de cada Plano de Conta.
- O Contas a Pagar aprende com classificações anteriores e sugere o Plano de Conta em novos lançamentos semelhantes.

## 1. Centro de Custo + Plano de Conta passam a funcionar juntos
O Plano de Conta continua cadastrado dentro de um Centro de Custo nas Configurações Financeiras.

Nas operações do Contas a Pagar, porém, existe somente uma escolha operacional: Plano de Conta.

Exemplo:
`Custos Comerciais › Fatura de cartão de crédito`

Ao selecionar esse plano, o sistema grava automaticamente o Centro de Custo `Custos Comerciais`.

### Cadastro manual de conta
Plano de Conta passa a ser obrigatório, exceto quando o Quality encontra uma sugestão válida no histórico e preenche automaticamente.

### Reclassificação de uma conta
A edição da classificação também pede somente o Plano de Conta. O Centro de Custo é atualizado automaticamente.

## 2. Aprendizado automático de classificação
O Quality utiliza o próprio histórico de Contas a Pagar classificadas, sem criar uma tabela manual paralela.

A sugestão considera principalmente:
- mesmo fornecedor;
- descrição igual ou semelhante;
- palavras em comum na descrição;
- classificações mais recentes para desempate.

Ao abrir uma nova conta e informar fornecedor/descrição, o sistema consulta o histórico e, quando existe confiança suficiente, preenche o Plano de Conta automaticamente.

A sugestão nunca bloqueia edição: o operador pode trocar o Plano antes de salvar.

Quando uma conta é reclassificada manualmente, essa própria conta passa a fazer parte do histórico e melhora sugestões futuras.

## 3. DRE simplificado
O Grupo DRE foi removido do formulário de cadastro do Plano de Conta.

A classificação do DRE passa a pertencer à estrutura do Centro de Custo. Na primeira inicialização após esta versão, o ERP preserva automaticamente o Grupo DRE já utilizado pelos Planos existentes daquele centro.

Exemplos preservados na base atual:
- Receitas → Receita Bruta
- CMV — Mercadorias e peças → Custos das Vendas (CMV)
- Financeiro e Bancário → Despesas Financeiras
- Operacionais Fixos / Assistência / Comercial / Marketing / Tecnologia etc. → Despesas Operacionais

Para novos Centros de Custo, o sistema classifica automaticamente pela natureza/nome, usando Despesas Operacionais como padrão seguro para novos centros de despesa.

O DRE também passa a recuperar o Centro de Custo diretamente pelo Plano de Conta quando o lançamento antigo não tiver o centro gravado explicitamente.

## 4. Compatibilidade
- Nenhuma conta histórica é apagada ou reclassificada em massa.
- Planos antigos continuam válidos.
- A migração apenas acrescenta ao Centro de Custo a classificação DRE que os próprios planos filhos já utilizavam.
- Compras e demais origens continuam podendo informar Plano/Centro automaticamente como antes.

## Arquivos alterados
- services/finance-service.js
- services/dre-service.js
- services/payables-service.js
- routes/erp.js
- views/configuracoes_financeiro.ejs
- views/contas_pagar.ejs
- public/js/financeiro-fundacao.js
- public/js/contas-pagar.js
- Readme/CORRECAO-2026-08-12-PLANO-CONTA-APRENDIZADO-V14.md

## Testes recomendados
1. Reiniciar o ERP.
2. Abrir Configurações Financeiras → Centros de custo e planos de conta.
3. Criar/editar um Plano de Conta e confirmar que não existe mais campo Grupo DRE.
4. Abrir Contas a Pagar → Nova conta.
5. Confirmar que existe apenas Plano de Conta na classificação.
6. Selecionar um plano e salvar; abrir a conta e confirmar que o Centro de Custo apareceu automaticamente.
7. Criar outra conta para um fornecedor/descrição já classificados anteriormente e verificar a sugestão automática.
8. Reclassificar uma conta antiga e depois criar outra semelhante para validar o aprendizado.
9. Conferir o DRE para garantir que as classificações existentes continuam nos mesmos grupos.
