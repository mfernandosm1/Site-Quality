# Correção Analytics — visualização de produto — 30/08/2026

- Restaurado `page_view` automático em cada carregamento real de página.
- Restaurado `product_view` automático ao abrir `/produto/<slug>/`.
- Identificação do produto usa `content/products.json` com fallback pelo próprio HTML.
- Mantido o registro de favoritos.
- Restaurados aliases `qualityAnalyticsTrack`, `QualityAnalyticsTrack` e `QualityAnalytics.track`, inclusive para compatibilidade com a busca já existente.
- Versão do script atualizada para `20260830-2` para evitar cache antigo no mobile.
- O gerador de publicação continua reinstalando esta versão nas páginas geradas, portanto a correção não se perde na próxima publicação.
