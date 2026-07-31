# Painel Quality ERP v0.16.3 — Contas a Receber

## Objetivo
Implantar o núcleo operacional de Contas a Receber sem ativar ainda a gravação automática do PDV, preservando a estabilidade da Fundação do PDV e Caixa.

## Arquivos novos
- `services/receivables-service.js`
- `views/contas_receber.ejs`
- `public/js/contas-receber.js`

## Arquivos alterados
- `services/finance-service.js`
- `routes/erp.js`
- `views/configuracoes_financeiro.ejs`
- `views/financeiro_fundacao.ejs`
- `public/js/financeiro-fundacao.js`
- `public/css/painel-theme.css`

## Recursos implantados
- Títulos manuais vinculados a cliente, forma de pagamento, Centro de Custo e Plano de Conta.
- Parcelas independentes com vencimento, valor, saldo e situação.
- Recebimento total ou parcial, com juros, multa e desconto registrados separadamente.
- Histórico imutável de criação e recebimentos.
- Impressão do resumo/comprovante sem alterar o estado do título.
- Separação visual por situação e pesquisa.
- Black OLED revisado para a nova tela.

## Formas de pagamento
Foram adicionadas configurações para:
- gerar Contas a Receber;
- exigir cliente identificado;
- exigir CPF/CNPJ válido;
- exigir comprovante assinado;
- primeiro vencimento e intervalo entre parcelas;
- carência após vencimento;
- multa fixa e percentual;
- juros diário ou mensal;
- juros simples ou compostos;
- taxa administrativa de atraso.

## Regra de segurança do crediário
O serviço de Contas a Receber rejeita:
- cliente inexistente;
- cliente inativo;
- cadastro chamado Consumidor;
- cliente sem CPF/CNPJ com 11 ou 14 dígitos quando a operação exige documento.

A integração automática PDV → Contas a Receber deve usar a mesma validação na etapa seguinte, evitando duplicação da regra.

## Arquivos de dados
Criados automaticamente em `data/erp/finance`:
- `receivables.json`
- `receivable-installments.json`
- `receipts.json`
- `receivable-events.json`

A escrita é atômica por arquivo (`.tmp` seguido de rename).

## Implantação
1. Fazer backup de `C:\Site\painel`.
2. Extrair o ZIP na raiz `C:\Site\painel` mantendo as pastas.
3. Reiniciar o painel.
4. Abrir Configurações Financeiras e revisar as regras de cada forma.
5. Abrir ERP → Financeiro → Contas a Receber.
6. Criar um título de teste, registrar recebimento parcial e depois o saldo restante.

## Limites desta versão
- O PDV ainda não cria títulos automaticamente.
- O comprovante usa o resumo financeiro do título; o modelo contratual completo com dados da empresa e assinaturas será refinado junto da integração PDV/crediário.
- Estorno de recebimento será implantado antes da integração automática definitiva.
