# Analytics próprio - Plataforma Quality

## Objetivo

Manter um Analytics simples, próprio e incremental para a Plataforma Quality, sem depender de reescrita do site e sem impactar o funcionamento do menu, busca, produtos ou publicação.

## Arquitetura atual

```txt
Site público / preview local
  js/quality-analytics.js
  ↓ envia eventos
Painel Node
  routes/analytics.js
  ↓ grava
content/analytics.json
  ↓ exibe
views/analytics.ejs
```

## Regra importante para GitHub Pages

O GitHub Pages é estático. Ele não recebe `POST` nem grava arquivos. Por isso, o site publicado não consegue salvar Analytics sozinho.

No localhost, o endpoint relativo funciona:

```js
/analytics/track
```

No site publicado, o endpoint precisa apontar para um backend público:

```html
<script>
  window.QUALITY_ANALYTICS_ENDPOINT = 'https://seu-backend.com/analytics/track';
</script>
<script src="/js/quality-analytics.js"></script>
```

## Decisão técnica

O coletor oficial do site é:

```txt
js/quality-analytics.js
```

O arquivo `js/main.js` deve cuidar de comportamento geral do site, como:

- carregamento do header e footer;
- menu mobile;
- busca;
- categorias no header;
- carrossel Swiper.

O bloco antigo de Analytics dentro do `main.js` foi removido para evitar eventos duplicados.

## Eventos coletados

- `page_view`
- `category_view`
- `product_view`
- `favorite`
- `whatsapp_click`
- `share_click`
- `search`

## Arquivos envolvidos

```txt
Site_with_content/js/main.js
Site_with_content/js/quality-analytics.js
painel/routes/analytics.js
painel/views/analytics.ejs
Site_with_content/content/analytics.json
docs/analytics.md
```

## Cuidados futuros

1. Não criar outro coletor de Analytics dentro do `main.js`.
2. Antes de alterar eventos, verificar se já existe disparo em `quality-analytics.js`.
3. Antes de publicar, testar se o endpoint configurado está acessível no domínio público.
4. Evitar duplicação de `page_view` e `product_view`.
5. Manter alterações pequenas e documentadas.

## Próximos passos recomendados

1. Confirmar se `quality-analytics.js` é carregado em todas as páginas publicadas.
2. Definir onde ficará o backend público do Analytics.
3. Configurar `window.QUALITY_ANALYTICS_ENDPOINT` no site publicado.
4. Testar eventos reais no domínio `www.qualitycel.com.br`.
5. Verificar se `analytics.json` recebe apenas um evento por ação esperada.
