# Quality ERP — Correção V3 — PDV + performance de Produtos

Data: 11/08/2026

## 1. Pesquisa do PDV — causa real

O campo principal de Produto / Serviço do PDV usava o `datalist` nativo do navegador.
A busca inteligente adicionada anteriormente estava sendo aplicada à janela aberta pela lupa, mas não controlava o filtro exibido pelo `datalist` do campo principal.

### Correção
- removido o `datalist` do campo principal do PDV;
- criado dropdown incremental próprio do Quality ERP;
- a busca agora ignora acentos, caixa e pontuação;
- cada termo digitado pode casar com uma palavra diferente;
- exemplos: `pelicula i` encontra `PELÍCULA APPLE iPhone...`; `pelicula sam pri` encontra `PELÍCULA SAMSUNG ... PRIVACIDADE`;
- seleção preserva exatamente o item escolhido, inclusive quando existirem nomes semelhantes/variações;
- a lupa/modal usa a mesma regra.

## 2. Delay da listagem de Produtos — causa real

A rota `/produtos` fazia `consultarSaldo()` individualmente para cada produto e para cada combinação de variação controlada.
Cada chamada relia `inventory-settings.json` e `stock.json` do disco. Em uma base grande isso gerava centenas/milhares de leituras síncronas antes do render.

### Correção
- criado `InventoryService.consultarSaldosEmLote()`;
- a tela coleta os IDs necessários e lê o estoque uma única vez;
- os saldos são resolvidos em memória por `Map`;
- preservadas as regras de estoque por variação e estoque derivado do pai.

Teste isolado local: resolução de 9.000 IDs pelo método em lote em poucos milissegundos no conjunto de teste.

## 3. Delay do Novo Produto/Serviço — causa real

Mesmo em `?workspace=new`, a rota enviava todos os produtos para a view e o EJS renderizava a listagem inteira escondida, além dos formulários auxiliares/referências de todos os itens.

### Correção
- no workspace de Novo Produto/Serviço, `items` é vazio para a renderização;
- a base continua sendo lida para as rotinas de consistência, mas não é transformada em milhares de elementos HTML invisíveis;
- a escolha Produto/Serviço continua aparecendo sempre ao clicar em Novo produto.

## 4. Peso excessivo dos selects de imagem

Cada linha de produto repetia todas as imagens disponíveis dentro de seu `<select>`. Com muitos produtos x muitas imagens, a quantidade de `<option>` crescia de forma multiplicativa.

### Correção
- cada linha recebe somente a imagem atual inicialmente;
- a lista completa de imagens é hidratada somente quando o seletor daquela linha recebe foco/clique;
- a funcionalidade de seleção permanece disponível sem pesar o carregamento inicial.

## Arquivos principais desta V3
- `views/pdv.ejs`
- `views/produtos.ejs`
- `public/css/painel-theme.css`
- `routes/produtos.js`
- `services/inventory-service.js`

O ZIP é cumulativo em relação às correções V2 e inclui também os arquivos de pesquisa padronizada já entregues anteriormente.

## Instalação
Extraia na raiz do projeto Quality ERP e permita mesclar/substituir as pastas e arquivos existentes. Reinicie o `npm start` depois da substituição para garantir que as alterações de rota/service sejam carregadas.
