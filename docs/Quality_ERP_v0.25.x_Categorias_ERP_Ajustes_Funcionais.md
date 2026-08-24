# Quality ERP v0.25.x — Categorias ERP

## Escopo desta entrega

Finalização funcional do módulo **ERP → Categorias ERP**, sem alterações na estrutura ou nos dados das Categorias da Loja Virtual.

## Arquivos alterados

- `views/erp_categories.ejs`
- `views/erp_dashboard.ejs`
- `public/js/erp-categories.js` (novo)
- `public/css/painel.css`
- `services/erp-category-service.js`

## Ajustes realizados

- Atalho **Categorias ERP** incluído entre os módulos operacionais do Dashboard ERP.
- Botão **Nova categoria** funcional.
- Botão **Editar** funcional.
- Modal com fechamento pelo botão, clique externo e tecla `Esc`.
- Expansão e recolhimento individual da árvore.
- Ações **Expandir todas** e **Recolher todas**.
- Busca com exibição automática das categorias superiores.
- Impressão/PDF expandindo a árvore para a impressão.
- Confirmação antes da exclusão.
- Bloqueio de exclusão para categorias com produtos ou categorias-filhas.
- Proteção contra ciclos na árvore ao alterar a categoria superior.
- Proteção contra nomes duplicados no mesmo nível.
- Contraste e campos revisados nos temas Claro, Escuro e Black OLED.
- Nenhum campo, SEO, slug ou vínculo das categorias do site foi alterado.

## Checklist de testes

1. Abrir `ERP → Categorias ERP` pelo Dashboard ERP.
2. Criar uma categoria principal e confirmar o salvamento.
3. Criar uma categoria filha selecionando a categoria superior.
4. Expandir e recolher pela seta da categoria principal.
5. Testar **Expandir todas** e **Recolher todas**.
6. Buscar uma subcategoria e confirmar que a categoria superior permanece visível.
7. Editar nome, descrição, tipo, categoria superior e status.
8. Confirmar que uma categoria não pode ser filha dela própria nem de uma descendente.
9. Confirmar que categorias com produtos ou filhas não podem ser excluídas.
10. Excluir uma categoria vazia e sem filhas.
11. Testar Exportar CSV e Imprimir/PDF.
12. Repetir os testes nos temas Claro e Black OLED.
13. Conferir que `/categorias` e `/subcategorias` do site continuam intactas.
