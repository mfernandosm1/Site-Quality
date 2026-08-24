# Quality ERP v0.22.0 — Finalização do Cadastro Mestre

## Alterações

- Código interno automático e somente leitura no padrão `PRD-1`, `PRD-2`, `PRD-3`.
- Migração automática dos produtos antigos sem código interno válido.
- Categoria ERP obrigatória para novos cadastros e edições.
- Categoria e subcategoria ERP convertidas em seletores vinculados aos cadastros existentes.
- Categoria e subcategoria da Loja Virtual permanecem opcionais.
- Nenhuma categoria é selecionada automaticamente em novos produtos.
- Subcategoria orienta o usuário a selecionar primeiro uma categoria.
- Compatibilidade preservada com PDV, Estoque, Compras e publicação atual.

## Regras

- Categoria ERP: obrigatória.
- Subcategoria ERP: opcional.
- Categoria da Loja Virtual: opcional.
- Subcategoria da Loja Virtual: opcional.
- Código interno: gerado pelo sistema e não reutilizado manualmente.

## Testes recomendados

1. Abrir a listagem e confirmar que produtos antigos receberam códigos `PRD-n`.
2. Tentar cadastrar sem Categoria ERP e confirmar o bloqueio.
3. Selecionar uma Categoria ERP e conferir o carregamento das subcategorias.
4. Salvar um produto e confirmar o código interno automático.
5. Editar o produto e confirmar que o código permanece o mesmo.
6. Confirmar o produto no PDV, Estoque e Compras.
