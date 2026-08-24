# Quality ERP v0.25.x — Ocultar indicadores no novo produto

## Alteração

Ao abrir `Produtos → Novo produto`, os cards de resumo abaixo ficam ocultos:

- Produtos
- Ativos
- Inativos
- Vitrine
- Variações
- Estoque total

Os cards continuam visíveis normalmente na listagem de produtos.

## Arquivo alterado

- `views/produtos.ejs`

## Teste rápido

1. Abra `/produtos` e confirme que os seis cards aparecem.
2. Clique em `+ Novo produto` e confirme que os cards desaparecem.
3. Clique em `Produtos cadastrados` ou `Voltar à lista` e confirme que os cards reaparecem.
4. Atualize diretamente a URL `/produtos?workspace=new` e confirme que os cards permanecem ocultos.
5. Verifique os temas Claro e Black OLED.
