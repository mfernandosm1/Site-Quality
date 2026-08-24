import express from 'express';
import fs from 'fs';
import path from 'path';
import { updateHeaderMenu } from './main_utils.js';
const router = express.Router();
function P(app){ return app.locals.paths; }

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
  const page = req.params.page;
  const contentPath = path.join(SITE_DIR, page);
  const headerPath = path.join(SITE_DIR, 'header.html');
  const footerPath = path.join(SITE_DIR, 'footer.html');
  let pageHtml = '', header = '', footer = '';
  try { pageHtml = fs.readFileSync(contentPath, 'utf-8'); } catch(e){}
  try { header  = fs.readFileSync(headerPath, 'utf-8'); } catch(e){}
  try { footer  = fs.readFileSync(footerPath, 'utf-8'); } catch(e){}

  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(pageHtml);
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(pageHtml);
  const headInner = headMatch ? headMatch[1] : '';
  const bodyInner = bodyMatch ? bodyMatch[1] : pageHtml;

  function rewriteLinks(html){
    return html.replace(/href\s*=\s*"(?!https?:|mailto:|tel:|#|\/site\/)([^"]+\.html)"/gi, (m, p1) => `href="/site/view/${p1}"`);
  }

  const assembled = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/site/">
<link rel="stylesheet" href="/site/css/style.css">
<link rel="stylesheet" href="/site/css/theme-overrides.css">
${headInner}
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
</head>
<body>
${rewriteLinks(header)}
${rewriteLinks(bodyInner)}
${rewriteLinks(footer)}
<script src="/site/js/main.js"></script>
</body></html>`;
  res.send(assembled);
});

export default router;
