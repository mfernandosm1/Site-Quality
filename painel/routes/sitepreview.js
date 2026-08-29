import express from 'express';
import fs from 'fs';
import path from 'path';
import { updateHeaderMenu } from './main_utils.js';
const router = express.Router();
function P(app){ return app.locals.paths; }

function rewritePreviewLinks(html = ''){
  return String(html || '')
    .replace(/href\s*=\s*"(?!https?:|mailto:|tel:|#|\/site\/)([^"?#]+\.html)([^\"]*)"/gi, (m, p1, suffix = '') => {
      const clean = String(p1 || '').replace(/^\.\//, '').replace(/^\/+/, '');
      return `href="/site/view/${clean}${suffix}"`;
    })
    .replace(/href\s*=\s*'(?!https?:|mailto:|tel:|#|\/site\/)([^'?#]+\.html)([^']*)'/gi, (m, p1, suffix = '') => {
      const clean = String(p1 || '').replace(/^\.\//, '').replace(/^\/+/, '');
      return `href='/site/view/${clean}${suffix}'`;
    });
}

function injectBaseHref(html = ''){
  let out = String(html || '');
  if (/<base\b[^>]*>/i.test(out)) {
    return out.replace(/<base\b[^>]*>/i, '<base href="/site/">');
  }
  if (/<head\b[^>]*>/i.test(out)) {
    return out.replace(/<head\b[^>]*>/i, match => `${match}\n<base href="/site/">`);
  }
  return out;
}

function hasScript(html, srcPart){
  const escaped = srcPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<script[^>]+src=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i').test(html || '');
}

function previewRuntime(){
  return `<script data-quality-preview-runtime>
(function(){
  function fixHomeLinks(){
    document.querySelectorAll('a[data-home-link]').forEach(function(a){
      a.setAttribute('href', '/site/view/index.html');
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', fixHomeLinks, { once:true });
  }else{
    fixHomeLinks();
  }
})();
</script>`;
}

function injectBeforeBodyEnd(html, block){
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}\n</body>`);
  return `${html}\n${block}`;
}

router.get('/view/:page', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);

  // O preview precisa refletir o estado ATUAL do catálogo.
  // Não confia em um header.html possivelmente antigo: reconstrói o menu
  // usando categories.json + subcategories.json antes de montar a página.
  try {
    const readItems = (file) => {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
      } catch (_) {
        return [];
      }
    };
    const categories = readItems(path.join(CONTENT_DIR, 'categories.json'));
    const subcategories = readItems(path.join(CONTENT_DIR, 'subcategories.json'));
    if (categories.length) updateHeaderMenu(categories, SITE_DIR, subcategories);
  } catch (e) {
    console.warn(`⚠️ Preview: não foi possível sincronizar o menu: ${e.message}`);
  }

  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // Evita sair de Site_with_content e aceita somente páginas HTML do preview.
  const requestedPage = String(req.params.page || '').trim();
  const page = path.basename(requestedPage);
  if (!page || page !== requestedPage || !/\.html?$/i.test(page)) {
    return res.status(400).send('Página de preview inválida.');
  }

  const contentPath = path.join(SITE_DIR, page);
  const headerPath = path.join(SITE_DIR, 'header.html');
  const footerPath = path.join(SITE_DIR, 'footer.html');

  let pageHtml = '';
  try { pageHtml = fs.readFileSync(contentPath, 'utf-8'); } catch(e){}
  if (!pageHtml) return res.status(404).send('Página não encontrada no preview.');

  const isFullDocument = /<!doctype\s+html/i.test(pageHtml) || /<html\b/i.test(pageHtml) || /<body\b/i.test(pageHtml);

  if (isFullDocument) {
    /*
      IMPORTANTE:
      index.html e as páginas publicadas já possuem a própria estrutura de CSS/JS
      e, dependendo da versão do site, carregam header/footer pelo main.js.

      O preview antigo extraía apenas o body e INJETAVA header + footer + main.js
      novamente. Isso criava duas instâncias do rodapé e dois runtimes disputando
      o menu, causando o "pisca" ao passar o mouse.

      No preview correto servimos a MESMA página que irá para produção e apenas
      ajustamos a base/links para o namespace /site/.
    */
    let out = injectBaseHref(pageHtml);
    out = rewritePreviewLinks(out);
    out = injectBeforeBodyEnd(out, previewRuntime());
    return res.send(out);
  }

  // Compatibilidade para algum arquivo legado que seja apenas um fragmento HTML.
  let header = '', footer = '';
  try { header = fs.readFileSync(headerPath, 'utf-8'); } catch(e){}
  try { footer = fs.readFileSync(footerPath, 'utf-8'); } catch(e){}

  const hasHeaderPlaceholder = /id\s*=\s*["']header["']/i.test(pageHtml);
  const hasFooterPlaceholder = /id\s*=\s*["']footer["']/i.test(pageHtml);
  const headerBlock = hasHeaderPlaceholder ? '' : rewritePreviewLinks(header);
  const footerBlock = hasFooterPlaceholder ? '' : rewritePreviewLinks(footer);
  const mainScript = hasScript(pageHtml, 'main.js') ? '' : '<script src="/site/js/main.js"></script>';

  const assembled = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/site/">
<link rel="stylesheet" href="/site/css/style.css">
<link rel="stylesheet" href="/site/css/theme-overrides.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</head>
<body>
${headerBlock}
${rewritePreviewLinks(pageHtml)}
${footerBlock}
${mainScript}
${previewRuntime()}
</body></html>`;

  return res.send(assembled);
});

export default router;
