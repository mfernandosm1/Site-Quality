# Correção Analytics V3 — 30/08/2026

- Remove `navigator.sendBeacon` do envio ao Google Apps Script.
- Usa `fetch` cross-origin `no-cors` com redirecionamento, compatível com Web App do Apps Script.
- `product_view` é disparado imediatamente pela própria página, sem aguardar `products.json`.
- Mantém `page_view` e favoritos.
- Em localhost, mantém também um espelho no endpoint local `/analytics/track` para facilitar testes.
- Cache-buster alterado para `quality-analytics.js?v=20260830-3`.

Após substituir os arquivos, publicar o site novamente.
