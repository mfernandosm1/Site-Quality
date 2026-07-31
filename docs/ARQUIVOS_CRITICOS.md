# Arquivos Críticos

Alterações nesses arquivos devem ser pequenas, justificadas, testadas e precedidas de backup quando houver risco.

## Publicação e infraestrutura

- `publish.js`
- `.github/workflows/pages.yml`
- `sitemap.xml`
- `robots.txt`

## Dados públicos

- `Site_with_content/content/products.json`
- `Site_with_content/content/categories.json`

`products.json` é especialmente sensível porque afeta site, painel, SEO, pesquisa, relacionados, cross-sell, favoritos, Analytics e publicação.

## Painel e templates importantes

- `layout.ejs`
- `views/produtos.ejs`
- `views/marketing.ejs`
- `views/publicar.ejs`
- `views/seo.ejs`
- `views/personalizacao.ejs`

## Site público

- `header.html`
- `footer.html`
- `main.js`
- `header-runtime.js`
- `footer-runtime.js`
- `quality-analytics.js`
- `style.css`

## Estoque

- `services/inventory-service.js`
- `data/erp/inventory/stock.json`
- `data/erp/inventory/movements.json`
- `data/erp/inventory/inventory-settings.json`
- `data/erp/inventory/locations.json`

Os JSONs de estoque são dados operacionais. Pacotes de atualização não devem substituí-los.

## Arquivo preservado por decisão explícita

- `sorteios.js`

Não remover nem reescrever casualmente.

## Preferência de tema

Para mudanças visuais, preferir o arquivo de tema/override apropriado. Evitar alterar o `style.css` legado do site sem necessidade real.
