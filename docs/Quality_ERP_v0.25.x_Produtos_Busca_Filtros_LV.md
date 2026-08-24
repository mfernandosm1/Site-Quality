# Quality ERP v0.25.x — Produtos: cadastro compacto, busca e filtros

## Arquivo alterado
- `C:\Site\painel\views\produtos.ejs`

## Ajustes entregues

### Cadastro de produto
- Com **Produto publicado na Loja Virtual = Inativo**, ficam ocultos os campos exclusivos da Loja Virtual:
  - nome LV;
  - slug;
  - preço LV;
  - imagem;
  - Categoria LV e Subcategoria LV;
  - exibição de preço;
  - vitrine;
  - página de detalhes;
  - galeria;
  - etiquetas;
  - descrição curta e descrição completa.
- Ao alterar para **Ativo**, os campos reaparecem imediatamente.
- Nenhum dado já salvo é apagado; a alteração é apenas de exibição.

### Central de Operações em Lote
- Recolhida por padrão.
- Clique no cabeçalho para expandir ou recolher.
- Contador de itens selecionados permanece visível no cabeçalho compacto.

### Busca
O campo agora pesquisa por:
- nome;
- código interno;
- SKU;
- código de barras;
- código do fornecedor;
- apelido de busca;
- slug.

### Filtro de estoque
- Todos;
- Com estoque;
- Estoque zerado;
- Serviços.

A opção **Serviços** considera a Categoria ERP do tipo Serviço e não mistura esses registros com produtos de estoque zerado.

## Checklist de teste
1. Abrir Produtos e confirmar que a Central de Operações em Lote inicia recolhida.
2. Expandir e recolher a Central pelo cabeçalho.
3. Buscar um item pelo nome.
4. Buscar pelo código interno `PRD-*`.
5. Buscar por SKU, código de barras ou código do fornecedor.
6. Testar os filtros Todos, Com estoque, Estoque zerado e Serviços.
7. Abrir Novo produto com Loja Virtual inativa e confirmar o cadastro compacto.
8. Alterar Loja Virtual para Ativo e confirmar que os campos públicos reaparecem.
9. Voltar para Inativo e confirmar que nenhum valor preenchido é apagado.
10. Validar no tema Claro e no Black OLED.
