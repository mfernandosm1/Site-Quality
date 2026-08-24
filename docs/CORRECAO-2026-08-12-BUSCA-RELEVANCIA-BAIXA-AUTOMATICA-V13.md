# Quality ERP — Busca por relevância + baixa automática manual — V13
Data: 12/08/2026

## 1. Pesquisa de Produtos por relevância

### Problema
A busca já ignorava acentos e aceitava termos separados, porém tratava nome, SKU, código interno, código de barras e outros identificadores praticamente com o mesmo peso.

Isso permitia que uma busca como `redmi 12` trouxesse um produto `Redmi Note 15` antes de produtos Redmi 12 quando o número `12` aparecia em algum identificador técnico.

### Correção
Foi adicionado ranking de relevância:
1. Nome/modelo igual à pesquisa.
2. Nome/modelo iniciando com a expressão pesquisada.
3. Expressão completa presente no nome/modelo.
4. Todos os termos presentes no nome/modelo, privilegiando ordem e proximidade.
5. Correspondências parciais no nome.
6. Correspondências apenas em SKU, código, barcode, slug ou alias.

A busca por códigos continua funcionando; ela apenas deixa de superar uma correspondência textual claramente melhor.

## 2. Baixa automática no cadastro manual de Contas a Pagar

### Problema
O `PayablesService` já possuía suporte a formas com `autoSettle=true`, e a rotina era utilizada pelo módulo de Compras. Porém a rota de cadastro manual de Contas a Pagar chamava somente `create()` e encerrava.

Resultado: uma conta manual cadastrada em `Dinheiro`, mesmo com `Baixa automática` configurada, ficava aberta e exigia clicar em Pagar.

### Correção
O cadastro manual agora:
1. Identifica formas do plano configuradas com baixa automática.
2. Valida previamente se existe Caixa aberto e correspondência ativa da forma.
3. Só então cria a conta.
4. Executa `payImmediatePlan()` nas parcelas de baixa automática.
5. Registra as saídas correspondentes no Caixa.
6. Retorna a conta já recalculada/quitada quando todo o plano for imediato.

Se o Caixa necessário estiver fechado, o cadastro é interrompido antes da criação da conta, evitando registro parcialmente concluído.

Formas sem baixa automática continuam criando parcelas abertas normalmente. Planos mistos baixam somente as parcelas/formas marcadas como automáticas.

## Arquivos alterados
- utils/search.js
- routes/produtos.js
- routes/erp.js
- Readme/CORRECAO-2026-08-12-BUSCA-RELEVANCIA-BAIXA-AUTOMATICA-V13.md

## Testes recomendados
### Produtos
- Buscar `redmi 12`.
- Confirmar que Redmi 12 / Redmi Note 12 / Redmi 12C aparecem antes de resultados em que o 12 existe somente em códigos.
- Buscar também por um SKU/código conhecido para confirmar que pesquisa técnica continua funcionando.

### Contas a Pagar
- Manter `Dinheiro` com `Baixa automática` ativada.
- Deixar um Caixa aberto.
- Criar uma conta manual pequena com forma Dinheiro.
- Confirmar que a conta nasce paga/baixada e que a saída aparece no Caixa.
- Testar uma forma sem baixa automática e confirmar que a conta permanece em aberto.
