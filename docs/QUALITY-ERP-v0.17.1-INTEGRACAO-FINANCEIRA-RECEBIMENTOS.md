# Painel Quality ERP v0.17.1 — Integração Financeira dos Recebimentos

## Objetivo

Integrar cada recebimento confirmado no Contas a Receber ao Caixa e à fundação Financeira, preservando o vínculo completo do título e preparando a base para estorno futuro.

## Comportamento implantado

- exige caixa aberto pelo mesmo operador que confirma o recebimento;
- utiliza a sessão de caixa aberta mais recente do operador;
- registra uma movimentação de Caixa para cada forma de pagamento;
- registra um lançamento financeiro principal por comprovante;
- registra cada forma de pagamento separadamente em `payments.json` e `movements.json`;
- atualiza automaticamente os indicadores do Dashboard Financeiro a partir dos movimentos;
- mantém pagamento parcial, juros, multa e desconto;
- mantém vínculo entre título, parcela, recebimento, Venda/O.S., cliente, caixa, sessão e operador;
- grava IDs cruzados do Caixa e Financeiro dentro do comprovante;
- permite reimpressão pelos comprovantes já persistidos;
- marca o recebimento como reversível para futura implantação de estorno;
- utiliza `requestKey` e chaves por movimento para impedir duplicidade em reenvios;
- restaura os arquivos envolvidos caso alguma etapa da integração falhe.

## Arquivos financeiros envolvidos

- `data/erp/finance/receipts.json`: comprovante e vínculos da integração;
- `data/erp/finance/entries.json`: lançamento financeiro principal;
- `data/erp/finance/payments.json`: formas de pagamento individualizadas;
- `data/erp/finance/movements.json`: entradas para Fluxo de Caixa e Dashboard;
- `data/erp/finance/audit.json`: auditoria da postagem financeira;
- `data/erp/commerce/cash-movements.json`: entradas na sessão de Caixa.

## Regra de pagamento misto

Exemplo: PIX R$ 200,00 + Dinheiro R$ 100,00.

O sistema cria um único recebimento/comprovante e dois movimentos de Caixa, dois pagamentos financeiros e dois movimentos financeiros, todos vinculados ao mesmo `receiptId`.

## Idempotência

O navegador gera uma chave única ao abrir a tela de recebimento. Caso a mesma requisição seja enviada novamente, o serviço devolve o recebimento já criado e não baixa novamente a parcela nem duplica Caixa ou Financeiro.

## Preparação para estorno

Os comprovantes possuem `reversible`, `reversalStatus`, IDs dos movimentos de Caixa e IDs dos lançamentos financeiros. A futura rotina de estorno deverá criar contrapartidas, preservar o histórico e nunca apagar os registros originais.

## Validação executada

- sintaxe Node.js dos serviços, rota e JavaScript do Contas a Receber;
- recebimento parcial;
- integração com caixa aberto do operador;
- pagamento misto;
- criação separada de movimentos;
- idempotência por reenvio;
- atualização do resumo financeiro.
