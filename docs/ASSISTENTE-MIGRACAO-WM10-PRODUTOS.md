# Quality ERP — Migração e Sincronização WM10 · Produtos

## Objetivo

Permitir migrar o catálogo do WM10 em partes, evitando duplicações e sem obrigar o usuário a trazer dados operacionais inconsistentes para o Quality ERP.

O fluxo foi desenhado para uma base WM10 grande e com cadastros antigos/duplicados. A simulação compara WM10 × Quality e WM10 × WM10 antes de qualquer criação.

## Fluxo

1. Configurar URL, CNPJ, token e paginação da API.
2. Testar conexão.
3. Buscar e analisar os produtos.
4. Revisar duplicidades e vínculos sugeridos.
5. Escolher a operação:
   - Importar novos produtos;
   - Sincronizar produtos já migrados/vinculados.
6. Escolher quais dados serão aplicados.
7. Selecionar os produtos e confirmar o lote.

## Importação parcial

A migração não precisa acontecer em um único dia. O estado é salvo por `Cod_produto` do WM10.

Exemplo:

- hoje: importar 300 produtos;
- amanhã: importar mais 400;
- depois: continuar apenas com os pendentes.

Produtos já importados ou vinculados aparecem como "Já tratados" e não são criados novamente.

## Dados selecionáveis

Na importação de novos produtos, o preset recomendado traz:

- Nome (obrigatório);
- Preço de venda;
- Código de barras/EAN;
- Referência;
- Marca;
- Unidade;
- Situação ativo/inativo.

Ficam desmarcados por padrão:

- Estoque atual;
- Preço de compra;
- Coleção.

O estoque foi deixado desmarcado por padrão de propósito: quando o saldo do WM10 não é confiável, o produto entra com estoque zero e o estoque pode ser construído por Compras/Inventário no Quality.

## Sincronização posterior

Depois que um produto foi importado ou vinculado, ele pode ser sincronizado sem ser recriado.

Há um preset **Somente estoque**. Nesse modo:

- nenhum produto novo é criado;
- nome, preço, marca, referência etc. não são alterados;
- somente o saldo de estoque selecionado é aplicado;
- o produto passa a ter controle de estoque ativado;
- a alteração é registrada no Inventory Service como ajuste de inventário com origem `wm10_migration`.

Isso permite, por exemplo, importar o cadastro hoje com estoque zero, corrigir o saldo no WM10 amanhã e então sincronizar apenas o estoque.

Também é possível sincronizar posteriormente preço de venda, custo, EAN, referência, marca, unidade, ativo/inativo e coleção, marcando somente os campos desejados.

## Segurança do estoque

Antes de operações que aplicam estoque, são preservados backups do catálogo e, quando disponíveis, dos arquivos de saldo e movimentações do Inventory Service.

O ajuste de estoque gera histórico, evitando que uma quantidade simplesmente apareça no produto sem origem.

## Regras de duplicidade

A análise considera:

- vínculo prévio por código WM10;
- EAN/código de barras;
- nome normalizado;
- referência + marca;
- similaridade de nome;
- duplicidades entre registros do próprio WM10.

Casos duvidosos continuam bloqueados para importação automática e exigem revisão/vínculo.

## Categorias

A API de produto documentada não retorna `cod_categoria`. Por isso a consulta de categorias permanece diagnóstica e o importador não inventa uma associação Produto → Categoria ERP.

## Variações

O WM10 fornece Cor e Tamanho e esses dados são preservados no snapshot de integração. A consolidação automática em famílias/variações (por exemplo iPhone 15 → 128 GB/256 GB, cores e condição) não foi ativada nesta entrega porque exige a definição estrutural definitiva de variações no módulo Produtos antes de alterar o catálogo real.
