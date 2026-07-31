# Quality ERP v0.19.4 — Compras, XML e Estoque

## Objetivo
Correção incremental da conferência de XML e da integração entre Compras, cadastro de produtos, variações e Estoque.

## Alterações

### XML → nova compra
- Corrigido o botão **Usar dados na nova compra**.
- O formulário é aberto já preenchido com fornecedor, datas, número, série, chave, frete, despesas, desconto e itens conferidos.
- O XML continua sem movimentar Estoque, Caixa ou Financeiro automaticamente.
- A compra somente é preenchida quando todos os itens estiverem definidos.

### Fornecedor
- O cadastro rápido passa a aproveitar os dados existentes no `enderEmit` da NF-e:
  - telefone;
  - CEP;
  - rua;
  - número;
  - complemento;
  - bairro;
  - cidade;
  - UF.
- O XML de teste não possui e-mail do emitente. Por isso esse campo permanece vazio.

### Produtos criados pelo XML
- Produtos novos continuam ativos no ERP.
- A disponibilidade para o site nasce desativada.
- O cadastro recebe `siteEnabled: false` e canal do site em modo `disabled`, evitando publicação acidental.

### Variações
- Produtos com combinações passam a aparecer como opções individuais na busca e na conferência.
- Cada variação usa seu próprio `inventoryItemId`.
- A compra grava produto principal, descrição da variação e item de estoque correto.

### Estoque
- A leitura preserva o saldo legado do produto quando ainda não existe linha no `stock.json`.
- Quando existe item do Inventory Service, o saldo desse serviço tem prioridade.
- Produtos com `inventory.itemId` são reconhecidos como controlados para a compra.
- A finalização movimenta o item ou a variação selecionada.

## XML usado na validação
NF-e 42505, série 1, emitida por RE COMERCIO ATACADISTA DE ACESSORIOS LTDA.

Dados confirmados no XML:
- 50 itens;
- valor total R$ 936,24;
- endereço completo do emitente;
- telefone 51981067999;
- sem e-mail do emitente.

## Testes recomendados
1. Importar o mesmo XML.
2. Definir todos os itens.
3. Clicar em **Usar dados na nova compra**.
4. Confirmar fornecedor, documentos, 50 itens e total de R$ 936,24.
5. Pesquisar um produto com variações e selecionar uma combinação específica.
6. Salvar a compra aberta.
7. Finalizar uma compra pequena de teste.
8. Conferir a movimentação no Estoque e o saldo da variação escolhida.
