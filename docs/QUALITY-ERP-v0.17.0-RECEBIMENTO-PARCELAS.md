# Painel Quality ERP v0.17.0 — Recebimento de Parcelas

## Objetivo

Transformar o Contas a Receber em uma área operacional de recebimento, preservando a fundação financeira implantada na v0.16.9 e sem alterar o fluxo de geração de títulos pelo PDV.

## Arquivos alterados

- `routes/erp.js`
- `services/receivables-service.js`
- `views/contas_receber.ejs`
- `public/js/contas-receber.js`
- `public/css/painel-theme.css`

## Funcionalidades implantadas

### Histórico da operação

O painel lateral passa a exibir os produtos e serviços registrados na Venda ou O.S., incluindo quantidade, valor unitário, desconto e total do item. Para O.S., também são exibidos os principais dados do equipamento e do serviço quando estiverem disponíveis no snapshot operacional.

### Recebimento por parcela

Cada parcela com saldo em aberto possui o botão `Receber`. Parcelas quitadas permanecem somente para consulta.

O recebimento permite:

- selecionar a data;
- informar juros, multa e desconto;
- registrar pagamento parcial;
- utilizar mais de uma forma de pagamento;
- incluir observação;
- visualizar o saldo restante antes de confirmar.

A baixa é aplicada somente à parcela selecionada. O saldo do título é atualizado automaticamente. Quando o saldo chega a zero, a parcela e o título passam para a situação `paid`.

### Histórico de recebimentos

Cada recebimento armazena:

- número sequencial do comprovante;
- formas e valores de pagamento;
- valor aplicado ao principal;
- juros, multa e desconto;
- saldo posterior;
- data, hora e operador;
- parcela alcançada e respectivas alocações.

### Comprovante

Após a confirmação é possível imprimir o comprovante. Comprovantes anteriores também podem ser reimpressos pelo histórico do título.

## Estrutura de dados

Nenhum arquivo financeiro existente foi removido ou recriado. O arquivo `receipts.json` mantém compatibilidade com registros anteriores e recebe novos campos apenas nos novos recebimentos:

- `receiptNumber`;
- `installmentId`;
- `allocations`;
- `payments`;
- `receivedDateTime`;
- `balanceAfter`.

## Limites desta versão

A v0.17.0 registra a baixa no Contas a Receber e prepara os dados necessários para integração. O lançamento automático no Caixa, Fluxo de Caixa e Dashboard Financeiro fica reservado para a etapa v0.17.1, evitando acoplamento prematuro e mantendo a implantação incremental.

## Implantação

1. Fazer backup de `C:\Site\painel`.
2. Extrair o ZIP respeitando as pastas internas.
3. Substituir somente os arquivos incluídos.
4. Copiar esta documentação para `C:\Site\docs`.
5. Reiniciar o painel.
6. Abrir um título com saldo e testar um recebimento parcial de baixo valor.
7. Conferir saldo da parcela, saldo do título, histórico e impressão do comprovante.

## Validações realizadas

- sintaxe de `routes/erp.js`;
- sintaxe de `services/receivables-service.js`;
- sintaxe de `public/js/contas-receber.js`;
- teste isolado de título com três parcelas;
- teste de recebimento parcial usando duas formas de pagamento;
- conferência do saldo da parcela e do título após a baixa.
