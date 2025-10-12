import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {}; } }

router.get('/', (req,res)=>{
  const { CONTENT_DIR } = P(req.app);
  const theme = readJson(path.join(CONTENT_DIR, 'theme.json'));
  res.render('aparencia', { theme, flash:null });
});

router.post('/salvar', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const themePath = path.join(CONTENT_DIR, 'theme.json');
  const theme = { primary:req.body.primary||'#c90000', text:req.body.text||'#111827', bg:req.body.bg||'#ffffff', radius:req.body.radius||'10', font:req.body.font||'Inter, system-ui, sans-serif' };
  fs.writeFileSync(themePath, JSON.stringify(theme,null,2),'utf-8');
  // generate overrides CSS
  const css = `:root{--q-primary:${theme.primary};--q-text:${theme.text};--q-bg:${theme.bg};--q-radius:${theme.radius}px;--q-font:${theme.font};}`;
  const out = path.join(SITE_DIR,'css','theme-overrides.css');
  fs.writeFileSync(out, css, 'utf-8');
  // ensure link in header.html
  const hdr = path.join(SITE_DIR, 'header.html');
  try {
    let html = fs.readFileSync(hdr,'utf-8');
    if (!html.includes('css/theme-overrides.css')){
      html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="css/theme-overrides.css">\n</head>');
      fs.writeFileSync(hdr, html, 'utf-8');
    }
  } catch(e){}
  res.redirect('/aparencia');
});
export default router;
