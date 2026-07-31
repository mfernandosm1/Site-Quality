# Painel Quality ERP — PDV v0.14

## Objetivo

Consolidar o PDV como núcleo operacional de vendas e Ordens de Serviço, integrado ao cadastro mestre de clientes e produtos, estoque, pagamentos e caixa.

## Evolução da série v0.14

### v0.14.2 — Finalização segura

- Bloqueio de finalização sem itens.
- Total mínimo da operação: R$ 0,01.
- Quantidade e valor unitário devem ser maiores que zero.
- Pagamento integral obrigatório.
- Saldo pendente não é permitido.
- Somente dinheiro pode exceder o total, gerando troco.
- Confirmação antes de processar estoque e caixa.

### v0.14.2.1 — Pós-finalização

- Tela de sucesso após finalizar.
- Acesso a impressão, visualização da operação e nova operação.
- Operação finalizada permanece disponível na busca e histórico.

### v0.14.3 — Caixa Operacional

- Página própria em `/erp/pdv/caixa`.
- Suprimentos, sangrias e linha do tempo.
- Resumo por forma de pagamento.
- Filtros por período, tipo, forma, usuário, operação e cliente.
- Diferenciação visual entre Venda e O.S.

### v0.14.4 — Fechamento inteligente

- Conferência obrigatória do dinheiro contado.
- Cálculo automático do dinheiro esperado.
- Diferença calculada em tempo real.
- Observação obrigatória quando houver sobra ou falta.
- Histórico de fechamentos.
- Comprovante imprimível.
- PDV permanece bloqueado enquanto o caixa estiver fechado.

## Regras permanentes do PDV

1. Nenhuma Venda ou O.S. pode ser criada, alterada ou finalizada sem caixa aberto.
2. Operações finalizadas ou canceladas são somente leitura.
3. O pagamento deve cobrir integralmente o total da operação.
4. O estoque e o caixa são processados apenas na finalização.
5. Cada operação mantém número, datas, usuário, linha do tempo e versão para proteção contra edição simultânea.

## Arquivos envolvidos

- `routes/erp.js`
- `services/commerce-service.js`
- `views/pdv.ejs`
- `views/caixa.ejs`
- `public/css/painel-theme.css`
- `data/erp/commerce/*.json`
