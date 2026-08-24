# Quality ERP v0.25.x — Correção do Workspace de Novo Produto

## Ajuste

No endereço `/produtos?workspace=new`, a tela agora é renderizada diretamente no modo de cadastro, sem exibir antes os elementos da listagem.

Ficam ocultos no cadastro:

- título Cadastro Mestre de Produtos;
- bloco ERP · Produtos;
- cards de Produtos, Ativos, Inativos, Vitrine, Variações e Estoque total;
- título e descrição Workspace de Produtos.

Permanecem disponíveis:

- Voltar ao ERP;
- Produtos cadastrados;
- Novo produto;
- Voltar à lista;
- formulário e Cadastro Inteligente com IA.

Ao retornar para `/produtos`, os indicadores e o contexto da listagem voltam a aparecer normalmente.

## Arquivos alterados

- `painel/routes/produtos.js`
- `painel/views/produtos.ejs`

## Testes

1. Acessar `/produtos?workspace=new` e confirmar que os cards não aparecem.
2. Confirmar os quatro controles de navegação do cadastro.
3. Clicar em Produtos cadastrados e conferir o retorno da listagem e dos cards.
4. Clicar em Novo produto novamente e confirmar que o modo compacto é aplicado sem recarregar incorretamente.
5. Validar nos temas Claro e Black OLED.
