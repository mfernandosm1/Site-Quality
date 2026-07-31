# Quality ERP v0.16.6 — Correção do crediário e reconciliação financeira

## Objetivo

Corrigir o fluxo de Venda/O.S. em crediário para permitir a definição do primeiro vencimento no PDV e garantir que toda operação finalizada com forma de pagamento configurada para gerar Contas a Receber produza um título financeiro visível e rastreável.

## Alterações implantadas

### PDV

- A forma de pagamento do PDV passa a receber os parâmetros correspondentes cadastrados em Configurações Financeiras.
- Quando a forma gera Contas a Receber, o campo **1º vencimento** aparece automaticamente.
- A data sugerida respeita `firstDueDays` da forma de pagamento.
- O operador pode alterar a data antes da finalização.
- O PDV impede a finalização quando uma forma futura não possui primeiro vencimento.
- A data é persistida na operação aberta e recarregada ao retornar ao PDV.

### Contas a Receber

- O título usa a data definida no PDV como primeiro vencimento.
- As demais parcelas seguem o intervalo configurado na forma de pagamento.
- Foi adicionada reconciliação idempotente de operações finalizadas.
- Ao abrir Contas a Receber, vendas e O.S. finalizadas são conferidas e títulos ausentes são recuperados automaticamente.
- A proteção por `originId + originPaymentKey` impede duplicação.
- Quando houver recuperação, a tela informa quantos títulos foram sincronizados.

## Recuperação da venda de teste

Após instalar os arquivos e reiniciar o painel, abra:

`/erp/financeiro/contas-a-receber`

A venda já finalizada em crediário será analisada. Se o título estiver ausente, será criado automaticamente usando os dados persistidos na operação. Como essa operação antiga não possuía data de vencimento informada, será aplicada a regra padrão da forma de pagamento.

## Teste recomendado

1. Faça backup de `C:\Site\painel` e especialmente de `data\erp\commerce` e `data\erp\finance`.
2. Substitua somente os arquivos desta entrega.
3. Reinicie o painel.
4. Abra Contas a Receber e confirme a recuperação da venda de teste.
5. No PDV, crie uma nova venda com cliente identificado e CPF/CNPJ válido.
6. Adicione uma forma configurada para gerar Contas a Receber.
7. Confirme que o campo **1º vencimento** aparece.
8. Defina uma data, finalize e abra Contas a Receber.
9. Abra o título e confira venda, cliente, parcelas, vencimentos e histórico de crédito.

## Arquivos alterados

- `painel/routes/erp.js`
- `painel/services/receivables-service.js`
- `painel/views/pdv.ejs`
- `painel/views/contas_receber.ejs`
- `painel/public/css/painel-theme.css`
- `docs/QUALITY-ERP-v0.16.6-CORRECAO-CREDIARIO-E-RECONCILIACAO.md`

## Segurança e compatibilidade

- Nenhuma estrutura JSON existente foi removida.
- Nenhum título é criado manualmente.
- A reconciliação é repetível e não duplica títulos existentes.
- Nenhuma dependência nova foi adicionada.
