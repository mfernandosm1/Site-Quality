# Quality ERP v0.25.x — Categorias ERP × Loja Virtual

## Arquitetura entregue

- **ERP → Categorias ERP**: estrutura interna independente, salva em `data/erp/catalog/categories.json` na primeira execução.
- **Site → Categorias da Loja Virtual**: mantém `categories.json` e `subcategories.json`, com slug, SEO, banner, ícone, ordem, navegação e URLs.
- Produtos passam a gravar o vínculo interno em `product.erp.categoryId`.
- `product.erp.category` e `product.category` são preservados para compatibilidade com serviços consolidados e com o publicador do site.

## Migração automática e backup

Ao abrir `/erp/categorias` ou a tela de produtos pela primeira vez:

1. As categorias e subcategorias atuais da Loja Virtual são copiadas para a nova árvore ERP.
2. Os produtos são vinculados às novas categorias por ID, sem apagar os campos antigos.
3. Antes de alterar `products.json`, é criado uma única vez o backup:
   `data/erp/backups/v0.25-categorias/products-pre-migration.json`.

A migração é idempotente: novas inicializações não duplicam categorias nem vínculos.

## Cadastro de Categorias ERP

Campos: Nome, Descrição, Tipo, Categoria Superior e Status.

Tipos disponíveis:

- Produto
- Serviço
- Produto Controlado

Categorias vinculadas a produtos ou com categorias filhas não podem ser excluídas. Devem ser inativadas, preservando histórico e integrações.

## Listagem

A listagem única em árvore permite:

- expandir/recolher individualmente;
- expandir/recolher todas;
- busca rápida;
- visualizar tipo, quantidade de produtos, status e última utilização;
- editar, excluir quando permitido;
- exportar CSV;
- imprimir ou salvar como PDF pelo navegador.

## Cadastro de Produtos

- Categoria ERP é obrigatória para novos produtos.
- Categoria Loja Virtual é independente.
- Quando “Produto publicado na Loja Virtual” estiver como Não/Inativo, os campos de categoria pública ficam escondidos.
- A publicação do site continua dependendo do fluxo já existente de publicação.

## Checklist de teste

1. Fazer backup da base completa antes de substituir os arquivos.
2. Iniciar o painel e abrir `ERP → Categorias ERP`.
3. Confirmar a mensagem de migração e a árvore criada.
4. Expandir/recolher categorias principais e filhas.
5. Criar uma categoria principal e uma categoria filha.
6. Editar nome, tipo e status.
7. Confirmar que categoria em uso não pode ser excluída.
8. Abrir Produtos e confirmar a separação entre Categoria ERP e Categoria Loja Virtual.
9. Cadastrar produto com Loja Virtual inativa e confirmar que a categoria pública fica escondida.
10. Ativar Loja Virtual, selecionar categoria pública e salvar.
11. Confirmar que PDV, estoque, compras e listagem de produtos continuam abrindo normalmente.
12. Validar Claro e Black OLED, especialmente modal, selects, placeholders e textos.
13. Testar Exportar CSV e Imprimir/PDF.
