# Quality ERP — Migração WM10 — Famílias e Variações V1

## Objetivo

Adicionar uma etapa simples e segura ao Assistente de Migração WM10 para detectar produtos que parecem pertencer à mesma família e permitir a revisão manual antes de qualquer união real no cadastro.

Exemplo:

- Capa iPhone XR Preto
- Capa iPhone XR Azul
- Capa iPhone XR Rosa

Passam a aparecer como uma sugestão de família `Capa iPhone XR`, mantendo os códigos WM10 individuais visíveis para revisão.

## O que foi implementado

- Detecção de famílias baseada em regras leves, sem IA externa.
- Reconhecimento inicial de variações por:
  - cor;
  - armazenamento (GB/TB/MB);
  - tamanho (campo do WM10);
  - condição (novo, usado, seminovo, vitrine, recondicionado);
  - voltagem (110V, 127V, 220V, bivolt).
- Proteção contra confundir modelos como `iPhone 15` e `iPhone 15 Pro`: palavras de modelo não são removidas pela regra de família.
- Novo resumo com quantidade de famílias detectadas e aprovadas.
- Nova área `Famílias e variações sugeridas` na análise do catálogo.
- Pesquisa e filtro por famílias aprovadas / para revisar.
- Exibição limitada às primeiras 120 famílias por vez para não pesar a tela com catálogos grandes; a busca localiza as demais.
- Em cada família é possível classificar cada registro como:
  - Produto pai;
  - Variação / filho;
  - Duplicado;
  - Manter separado;
  - Não importar.
- Apenas um produto pai por família.
- Nome sugerido do produto pai pode ser editado.
- Decisões são persistidas em `data/erp/wm10-product-family-state.json` (arquivo criado automaticamente em execução).
- Família aprovada pode ser reaberta.
- Salvar uma família não refaz a consulta completa da API; a tela atualiza localmente para manter o processo rápido.

## Regra de segurança desta V1

**Aprovar uma família NÃO altera nem junta produtos no cadastro do Quality ERP.**

Nesta versão, a etapa serve para montar e salvar o plano de migração: quem é pai, quem é filho/variação, quem é duplicado e quem deve ficar separado.

A união real deve acontecer somente em uma etapa posterior, usando apenas famílias aprovadas. Isso evita transformar sugestões erradas em alterações de cadastro.

## Por que a união real não foi ativada ainda

O cadastro atual de variações do Quality possui campos principais como cor, armazenamento, RAM, condição e estoque, mas a migração precisa preservar também dados próprios de cada registro WM10, especialmente EAN/código de barras, referência e código de origem.

Antes de materializar os filhos como variações definitivas, é recomendável estender a estrutura de cada combinação para preservar esses identificadores individualmente. Assim nenhum código antigo será perdido ao unir produtos.

## Desempenho

A detecção é feita por chave normalizada e não compara todas as famílias entre si. Em teste sintético local com 11.000 registros, a análise completa com 2.000 famílias levou aproximadamente 4 segundos no ambiente de desenvolvimento, sem consulta de rede.

## Fluxo recomendado

1. Configurar a API WM10.
2. Buscar e analisar o catálogo.
3. Abrir `Famílias e variações sugeridas`.
4. Conferir as famílias mais importantes.
5. Escolher o produto pai.
6. Marcar filhos, duplicados, separados ou itens a ignorar.
7. Aprovar a família.
8. Continuar a triagem/importação individual enquanto a materialização definitiva das variações ainda não estiver habilitada.

## Arquivos alterados

- `services/wm10-product-import-service.js`
- `routes/produtos.js`
- `views/produtos_importar_wm10.ejs`

## Arquivos novos desta entrega

- `Readme/MIGRACAO-WM10-FAMILIAS-V1.md`
- `Readme/MANIFESTO-ARQUIVOS-MIGRACAO-WM10-FAMILIAS-V1.txt`
