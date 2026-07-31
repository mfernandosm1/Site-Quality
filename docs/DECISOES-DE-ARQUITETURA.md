# Decisões de Arquitetura

## ADR-001 — Kernel transversal e incremental
O Kernel foi adicionado como uma camada transversal. Nenhum módulo estável foi reescrito.

## ADR-002 — LOG separado de Auditoria
LOG possui alto volume e contexto operacional. Auditoria possui baixo volume, maior criticidade e comparação antes/depois.

## ADR-003 — Dados isolados
Os arquivos do Kernel ficam em `data/kernel`, sem misturar registros com Clientes, Estoque, PDV ou Site.

## ADR-004 — Rastreamento seguro
Cliques operacionais são registrados, mas valores digitados, senhas, tokens e mídia não são capturados.

## ADR-005 — Integração por etapas
A captura transversal entra primeiro. Eventos específicos, documentos e timelines são ligados módulo por módulo após validação.
