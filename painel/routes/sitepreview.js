import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }

router.get('/view/:page', (req,res)=>{
  const { SITE_DIR } = P(req.app);
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
${rewriteLinks(bodyInner)}
<script src="/site/js/header-runtime.js"></script>
<script src="/site/js/footer-runtime.js"></script>
<script src="/site/js/header-runtime.js"></script>
<script src="/site/js/footer-runtime.js"></script>
<script src="/site/js/main.js"></script>
<script src="/site/js/main.js"></script>
</body></html>`;
  res.send(assembled);
});

export default router;
