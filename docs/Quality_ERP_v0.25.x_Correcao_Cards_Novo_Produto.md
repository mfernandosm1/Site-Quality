# Quality ERP v0.25.x — Correção dos cards no Novo Produto

## Arquivo alterado
- `C:\Site\painel\views\produtos.ejs`

## Correção
Ao acessar `/produtos?workspace=new`, os seguintes elementos são ocultados imediatamente pela própria URL, sem depender do valor enviado pela rota:
- Cadastro Mestre de Produtos;
- cards Produtos, Ativos, Inativos, Vitrine, Variações e Estoque total;
- título e descrição do Workspace de Produtos.

Os botões de navegação e o formulário permanecem visíveis. Na listagem normal `/produtos`, os cards continuam aparecendo.

## Teste
1. Reiniciar o painel.
2. Abrir `/produtos?workspace=new`.
3. Confirmar que a primeira linha visível contém os botões de navegação e que não há cards superiores.
4. Abrir `/produtos` e confirmar que os cards reaparecem.
