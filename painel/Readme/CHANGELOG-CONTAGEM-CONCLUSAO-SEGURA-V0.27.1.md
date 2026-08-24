# Contagem de estoque — conclusão segura e rápida (v0.27.1)

- Corrige a conclusão de inventários grandes que aparentava travar após confirmar.
- Os ajustes de estoque agora são processados em lote, evitando centenas de leituras/gravações dos arquivos de estoque e movimentos.
- Todos os produtos envolvidos são validados antes de iniciar os ajustes, reduzindo risco de conclusão parcial por cadastro inconsistente.
- Antes da conclusão é criado automaticamente um backup da contagem em `data/erp/inventory/backups/`.
- A tela mostra `Finalizando inventário...` enquanto o processamento ocorre e mantém a contagem aberta se houver erro.
- A rotina continua segura para uma nova tentativa: ajustes já aplicados para a mesma contagem não são duplicados pela conferência.
