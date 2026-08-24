# WM10 Produtos — Economia de consultas — 23/08/2026

## Objetivo
Reduzir chamadas tarifadas à API do WM10 durante a migração de produtos.

## Alterações
- O snapshot local de produtos passa a ser a fonte padrão da análise, importação, famílias, correção e sincronização.
- Reanalisar o snapshot local custa zero chamadas ao WM10.
- Nova atualização externa acontece somente pelo botão explícito **Atualizar dados do WM10**.
- O cache não expira automaticamente; a tela exibe quando ele foi atualizado para o operador decidir quando atualizar.
- Importação/sincronização não fazem fallback silencioso para a API. Se faltar um código no snapshot, pedem uma atualização manual e informam que nenhuma consulta cobrada foi feita.
- Tamanho de página alterado para 500 registros, reduzindo pela metade aproximadamente o número de chamadas em uma atualização completa.
- A API de categorias deixou de ser consultada automaticamente porque seu retorno é apenas diagnóstico e não permite associar a categoria do produto.
- A tela mostra uma estimativa de quantidade de consultas e custo antes da atualização externa, calculada a partir do último total conhecido.

## Base encontrada no ZIP
- Snapshot local: 11.661 produtos.
- Configuração anterior: 250 registros/página.
- Uma varredura completa exigia ~47 chamadas de produtos + ~1 de categorias = ~48 chamadas (~R$ 0,48 a R$ 0,01 por chamada).
- Com 500 registros/página e sem consulta automática de categorias: ~24 chamadas (~R$ 0,24) apenas quando o operador solicitar atualização.

## Observação
O botão **Testar conexão** continua fazendo uma chamada real à API, pois essa é a finalidade do teste. Não é executado automaticamente.
