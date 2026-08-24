# Quality ERP — Migração WM10 — Famílias V1.2

## Objetivo
Fechar o fluxo de famílias com uma etapa real de importação e reduzir travamentos da tela ao trabalhar com milhares de registros do WM10.

## Fluxo
1. Buscar e analisar WM10.
2. Revisar uma família.
3. Definir Produto pai / Variação-filho / Duplicado / Manter separado / Não importar.
4. Aprovar família.
5. Usar **Importar famílias aprovadas**.

## O que a importação faz
- Produto pai: cria um único cadastro principal no Quality.
- Variação/filho: vira combinação dentro de `product.variations.combinations`.
- Duplicado: não cria outro produto; o código WM10 fica vinculado ao pai.
- Manter separado: cria produto independente.
- Não importar: grava a decisão como ignorado e não cria cadastro.
- Todos os códigos WM10 envolvidos são preservados no vínculo de migração.

## Estoque
O estoque continua desmarcado por padrão.
- Desmarcado: pai e variações iniciam em zero, mas continuam com controle de estoque habilitado para que Compras/Inventário passem a formar o saldo correto dali em diante.
- Marcado: o saldo WM10 é aplicado por ajuste de estoque na importação.

## Proteções
- Máximo de 200 famílias por lote.
- Se a família contém código já migrado, ela falha sem duplicar produto.
- Se duas variações terminam com os mesmos atributos, a família é bloqueada para revisão (uma deve ser marcada como duplicada ou ignorada).
- Cada família falha isoladamente; as demais continuam.
- Backup de produtos é criado antes da execução.

## Desempenho da tela
- A lista de famílias mostra no máximo 40 resumos por vez.
- Os itens de uma família só são renderizados quando o bloco é aberto (lazy rendering).
- A Triagem Inteligente mostra no máximo 200 linhas por vez; busca e filtros localizam o restante.
- Isso reduz muito a quantidade de elementos DOM quando a análise contém 9–12 mil produtos.

## Observação sobre atributos
O Quality já possui estrutura principal de variações para cor, armazenamento, RAM e condição. Tamanho/voltagem detectados pelo migrador são preservados como metadados da combinação para evolução posterior do editor de produtos.
