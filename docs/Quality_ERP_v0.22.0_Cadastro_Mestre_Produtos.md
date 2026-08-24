# Quality ERP v0.22.0 — Cadastro Mestre de Produtos

## Objetivo
Criar o alicerce do cadastro mestre sem ampliar excessivamente a tela e sem iniciar integrações de marketplace.

## Implementado
- Nome ERP e Nome Loja Virtual preservados separadamente.
- Apelido de busca opcional.
- SKU, código interno, código do fornecedor e código de barras.
- Marca, unidade, categoria ERP e subcategoria ERP.
- Controle de estoque, estoque mínimo e permissão de estoque negativo.
- Dados menos usados organizados em área expansível.
- Persistência compatível com produtos antigos e com o formato atual do products.json.
- Apelido de busca considerado na pesquisa do PDV.

## Decisões de escopo
- Nenhuma integração de marketplace foi ativada.
- Nenhuma estrutura fiscal avançada foi criada.
- O cadastro atual foi evoluído incrementalmente, sem reescrita.

## Testes recomendados
1. Cadastrar produto preenchendo apenas os campos principais.
2. Cadastrar outro produto usando Dados internos adicionais.
3. Editar e confirmar que todos os campos permanecem salvos.
4. Pesquisar no PDV pelo Apelido de busca.
5. Testar produto com e sem controle de estoque.
6. Testar estoque mínimo e permissão de estoque negativo.
7. Confirmar visual no modo Claro e Black OLED.
