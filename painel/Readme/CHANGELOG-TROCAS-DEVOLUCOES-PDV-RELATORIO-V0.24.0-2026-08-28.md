# CHANGELOG — Trocas / Devoluções no PDV + relatório de problemas
**Versão funcional:** 0.24.0  
**Data:** 28/08/2026

## Objetivo
Fechar o ciclo de pós-venda do PDV com um fluxo rastreável de troca/devolução, sem perder controle de estoque, crediário, crédito do cliente e auditoria.

## Implementado

### 1. Troca/Devolução vinculada à venda original
Nova tela: `ERP → PDV → Troca / devolução`.

Permite localizar venda finalizada por:
- número;
- cliente;
- produto;
- código/SKU;
- identificador.

### 2. Quantidade devolvível controlada
O sistema calcula, por item:
- quantidade vendida;
- quantidade já devolvida em operações anteriores;
- quantidade ainda disponível para retorno.

Não permite devolver quantidade superior ao saldo disponível.

### 3. Motivo obrigatório
É obrigatório selecionar uma categoria de motivo e escrever uma descrição.

Motivos disponíveis incluem:
- defeito/problema;
- garantia;
- avaria;
- incompatibilidade;
- erro de venda;
- troca de cor/modelo;
- desistência;
- compra duplicada;
- outro.

### 4. Destino do estoque
Para item físico controlado:
- **Volta ao estoque vendável**: gera entrada de estoque vinculada à devolução;
- **Problema / garantia**: não volta ao estoque vendável;
- **Baixa / descarte**: não volta ao estoque vendável.

Por segurança, motivos classificados como defeito, garantia ou avaria não podem ser enviados diretamente ao estoque vendável.

### 5. Valor do crédito
O crédito do item considera o valor líquido efetivamente pago:
- preço × quantidade;
- menos desconto do item;
- menos rateio proporcional do cupom/desconto global.

Frete não é incluído automaticamente no crédito do item nesta etapa.

### 6. Crediário / Contas a Receber
Quando a venda original possui saldo de crediário em aberto:
1. o crédito da devolução reduz primeiro o saldo em aberto;
2. as parcelas são reduzidas das mais antigas para as seguintes;
3. o ajuste é registrado como **crédito aplicado**, e não como recebimento de dinheiro;
4. se o crédito for maior que o saldo devido, a diferença vai para a carteira do cliente.

### 7. Carteira do cliente
Saldo excedente da devolução vira crédito do cliente.

Foi adicionada a forma de pagamento de sistema:
**Crédito do cliente / troca (`PM-CARTEIRA`)**.

Na nova venda:
- se o produto novo for mais caro, a carteira abate parte do total e o cliente paga a diferença;
- se for mais barato, usa somente o necessário e o saldo restante continua na carteira.

Lançamentos de carteira vinculados à operação são idempotentes para evitar débito/crédito duplicado em reprocessamento.

### 8. Auditoria e vínculo
A venda original passa a armazenar o ID da troca/devolução em seus vínculos.

O registro guarda:
- usuário responsável;
- data/hora;
- venda original;
- cliente;
- motivo;
- itens e quantidades;
- destino físico;
- crédito;
- abatimento de crediário;
- carteira gerada;
- fornecedor de origem encontrado, quando possível.

### 9. Relatório de Trocas / Devoluções
Nova aba em **Central de Relatórios**.

Indicadores:
- quantidade de trocas/devoluções;
- unidades retornadas;
- unidades com motivo de problema;
- valor de crédito gerado;
- valor abatido no crediário;
- saldo enviado à carteira;
- unidades em quarentena.

Detalhamentos recolhíveis:
- produtos com mais retornos/problemas;
- taxa de retorno sobre vendas do período;
- principais motivos;
- fornecedores associados aos problemas;
- histórico das trocas/devoluções.

A associação com fornecedor utiliza a compra anterior mais recente localizada para o mesmo produto/variação. É um indicador para investigação, não prova automática de origem do defeito.

### 10. Permissões
Nova permissão:
`pdv.returns` — **Realizar trocas e devoluções**.

Administrador e perfis com `pdv.*` possuem acesso. O vendedor comum não recebe essa permissão automaticamente.

## Limites intencionais desta etapa
- fluxo disponível inicialmente para **Venda**; O.S. fica para evolução futura;
- não realiza reembolso direto em dinheiro/cartão nesta versão;
- item marcado como problema/garantia fica fora do estoque vendável e é acompanhado no registro de devolução; localização física/quarentena multiestoque pode ser evoluída depois;
- frete não é reembolsado automaticamente junto do item;
- fornecedor associado ao problema é uma heurística baseada na compra anterior localizada.

## Validações executadas
Foi testado em cópia temporária da base real:
- troca de item de R$ 140 em venda com R$ 175 de crediário aberto → saldo reduzido para R$ 35;
- devolução de R$ 90 em venda quitada → R$ 90 na carteira;
- utilização de R$ 60 desse crédito em nova operação → saldo restante R$ 30;
- idempotência da utilização da carteira;
- migração automática da forma de pagamento `PM-CARTEIRA`.

## Arquivos novos/alterados
- `services/return-service.js` **novo**
- `services/customer-wallet-service.js`
- `services/receivables-service.js`
- `services/finance-service.js`
- `services/commerce-service.js`
- `services/report-service.js`
- `services/auth-service.js`
- `services/kernel/permission-service.js`
- `routes/erp.js`
- `views/pdv.ejs`
- `views/trocas_devolucoes.ejs` **novo**
- `views/relatorios.ejs`
- `public/js/relatorios.js`
- documentação mestre / matriz / backlog
