# Quality ERP — Ajustes V1.5

## Objetivo

Entrega incremental sobre a V1.4. O pacote contém somente arquivos alterados e esta documentação; nenhum arquivo de dados da loja é incluído.

## 1. Produto pai e variações

A regra de família permanece: tudo que é comum entre pai e filhos continua no nome do produto. Exemplo esperado: `iPhone 14 usado 128GB`, com `Preto` e `Branco` como variações.

Foi corrigido um caso comum do WM10 em que o campo Cor informa `PRETO`, mas o nome usa `PRETA` (ou `BRANCO`/`BRANCA`). A análise passa a remover a cor realmente encontrada no nome, evitando separar capas que deveriam pertencer à mesma família.

Para capas e películas, o modelo continua fazendo parte da identidade da família. Tipos como Case, Silicone, Anti Impacto, Carteira, 3D, Privacidade, Vidro, Cerâmica, Hidrogel e Fosca podem formar o atributo Tipo dentro daquele modelo, em vez de criar uma família enorme para toda a marca.

## 2. Grade automática quando existe apenas um atributo

Quando o cadastro possui somente um grupo de variação — por exemplo Cor = Preto e Branco — e ainda não existe grade de combinações, o Quality cria automaticamente uma combinação para cada opção ao salvar.

Isso faz com que as variações já se tornem itens vendáveis no PDV, cada uma com identidade própria de estoque. Para múltiplos grupos, a grade continua manual/assistida para evitar gerar combinações indesejadas.

## 3. PDV e estoque por variação

O PDV já pesquisa as combinações como itens próprios. Esta versão corrige também a finalização da venda: a baixa agora usa o `inventoryItemId` da variação selecionada, e não o item de estoque do produto pai.

Exemplo: se `iPhone 14 usado 128GB · Preto` possui 1 unidade e `Branco` possui 0, a venda do Preto baixa somente o Preto. O saldo da combinação também é atualizado no cadastro do produto.

## 4. Formas de pagamento — uma fonte de verdade

PDV, Caixa e Configurações de Caixa/PDV passam a ler o catálogo de Formas de Pagamento do Financeiro.

São respeitados:

- ativo/inativo;
- permissão do módulo PDV;
- parcelamento e demais parâmetros financeiros;
- novas formas cadastradas posteriormente.

O Commerce mantém apenas a configuração operacional necessária para o caixa. IDs antigos são migrados por nome quando possível. Uma nova forma habilitada para PDV entra automaticamente nos caixas existentes, sem reativar formas antigas que o usuário já havia desabilitado especificamente naquele caixa.

A identificação de dinheiro físico também deixou de depender do ID legado `dinheiro`, permitindo que o catálogo financeiro use IDs como `PM-DINHEIRO` sem quebrar saldo de gaveta, troco ou resumo do Caixa.

## 5. Pós-importação

Quando um lote de famílias importar exatamente um produto, o assistente oferece abrir imediatamente esse cadastro no módulo Produtos para revisão final.

## Arquivos alterados

- `services/commerce-service.js`
- `services/wm10-product-import-service.js`
- `routes/erp.js`
- `routes/produtos.js`
- `views/pdv.ejs`
- `views/produtos_importar_wm10.ejs`

## Validações realizadas

- `node --check` nos arquivos JavaScript alterados;
- teste isolado da migração do catálogo de formas de pagamento do Commerce;
- teste de reconhecimento de dinheiro com ID financeiro;
- teste sintético de famílias de iPhone por capacidade/condição e capas por modelo + Tipo + Cor.

Não foi executado o servidor completo no ambiente de empacotamento porque o ZIP do projeto não inclui `node_modules`.
