import express from 'express';
import path from 'path';
import fs from 'fs';
const router = express.Router();
function P(app){ return app.locals.paths; }

function bake(html){
  // garante includes e ordem dos scripts
  function ensureInHead(h, tag){
    if (h.includes(tag)) return h;
    if (h.includes('</head>')) return h.replace('</head>', '  '+tag+'\n</head>');
    return '<!doctype html><html><head>'+tag+'</head><body>'+h+'</body></html>';
  }
  function ensureBeforeBodyEnd(h, tag){
    if (h.includes(tag)) return h;
    if (h.includes('</body>')) return h.replace('</body>', '  '+tag+'\n</body>');
    return h + '\n'+tag+'\n';
  }
  html = ensureBeforeBodyEnd(html, '<script src="/site/js/header-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="/site/js/footer-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="/site/js/main.js"></script>');
  html = ensureInHead(html, '<link rel="stylesheet" href="/site/css/style.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="/site/css/theme-overrides.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">');
  return html;
}

router.get('/view/:file?', (req,res)=>{
  const f = req.params.file || 'index.html';
  const file = path.join(P(req.app).SITE_DIR, f);
  if (!fs.existsSync(file)) return res.status(404).send('Arquivo não encontrado');
  let html = fs.readFileSync(file, 'utf-8');
  res.send(bake(html));
});
export default router;
