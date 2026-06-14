import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function P(app){ return app.locals.paths; }

function readJson(file, fallback = {}){
  try{
    if(fs.existsSync(file)){
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  }catch(e){}
  return fallback;
}

function writeJson(file, data){
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function backupFile(file, backupDir, prefix){
  try{
    if(!fs.existsSync(file)) return;
    fs.mkdirSync(backupDir, { recursive:true });
    const stamp = new Date().toISOString().replace(/[:.]/g,'-');
    fs.writeFileSync(path.join(backupDir, `${prefix}.${stamp}.bak`), fs.readFileSync(file, 'utf-8'), 'utf-8');
  }catch(e){}
}

function appendHistory(app, action){
  const { CONTENT_DIR } = P(app);
  const historyPath = path.join(CONTENT_DIR, 'personalizacao-history.json');
  const history = readJson(historyPath, []);
  history.unshift({
    date: new Date().toLocaleString('pt-BR'),
    action
  });
  writeJson(historyPath, history.slice(0, 25));
}

function siteCss(theme){
  return `:root{
  --q-primary:${theme.primary};
  --q-text:${theme.text};
  --q-bg:${theme.bg};
  --q-radius:${theme.radius}px;
  --q-font:${theme.font};
}

body{
  font-family:var(--q-font);
  color:var(--q-text);
  background:var(--q-bg);
}

button,
.btn,
.card,
.product-card,
.category-card{
  border-radius:var(--q-radius);
}

a,
.price,
.section-title,
.logo-text{
  color:var(--q-primary);
}
`;
}

function panelCss(theme){
  return `:root{
  --brand:${theme.brand};
  --bg:${theme.bg};
  --card:${theme.card};
  --line:${theme.line};
  --muted:${theme.muted};
  --text:${theme.text};
  --blue:${theme.button};
  --panel-radius:${theme.radius}px;
  --panel-font:${theme.font};
  --panel-card-padding:${theme.cardPadding}px;
  --panel-btn-padding-y:${theme.buttonPaddingY}px;
  --panel-btn-padding-x:${theme.buttonPaddingX}px;
  --panel-menu-size:${theme.menuSize}px;
}

body{
  font-family:var(--panel-font);
}

.card{
  border-radius:var(--panel-radius);
  padding:var(--panel-card-padding);
}

.btn{
  border-radius:calc(var(--panel-radius) - 2px);
  padding:var(--panel-btn-padding-y) var(--panel-btn-padding-x);
}

.topbar nav a{
  font-size:var(--panel-menu-size);
}

input[type="text"],
input[type="url"],
input[type="number"],
select,
textarea{
  background:var(--card) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

input[type="color"]{
  background:var(--card) !important;
  border:1px solid var(--line) !important;
  border-radius:8px;
  padding:2px;
}

input::placeholder,
textarea::placeholder{
  color:var(--muted) !important;
  opacity:.85;
}

label,
.card p,
.marketing-ia-subtitle,
.gallery-help,
.history-item span{
  color:var(--muted) !important;
}

.table th,
.table td,
.quality-table-wrap th:last-child,
.quality-table-wrap td:last-child{
  background:var(--card) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

.table th{
  color:var(--text) !important;
}

.notice{
  background:color-mix(in srgb, var(--blue, #2563eb) 12%, var(--card)) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

.badge,
.btn.ghost,
.btn:not(.primary):not(.secondary):not(.warn),
.kit a,
.palette-btn,
.marketing-tab-btn,
.marketing-quick-buttons button{
  background:color-mix(in srgb, var(--card) 88%, var(--text)) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

.personalizacao-tab{
  background:var(--card) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

.personalizacao-tab.active{
  background:var(--brand) !important;
  color:#fff !important;
  border-color:var(--brand) !important;
}

.history-item,
.marketing-result-card,
.marketing-list-item{
  background:var(--card) !important;
  color:var(--text) !important;
  border-color:var(--line) !important;
}

.marketing-list-text{
  color:var(--text) !important;
}
`;
}

const defaultSiteTheme = {
  primary:'#c90000',
  text:'#111827',
  bg:'#ffffff',
  radius:'10',
  font:'Inter, system-ui, sans-serif'
};

const defaultPanelTheme = {
  brand:'#c90000',
  bg:'#f6f8fc',
  card:'#ffffff',
  line:'#e5e7eb',
  muted:'#6b7280',
  text:'#111827',
  button:'#2563eb',
  radius:'14',
  font:'Inter, system-ui, sans-serif',
  cardPadding:'16',
  buttonPaddingY:'9',
  buttonPaddingX:'13',
  menuSize:'14'
};

router.get('/', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const siteTheme = readJson(path.join(CONTENT_DIR, 'theme.json'), defaultSiteTheme);
  const panelTheme = readJson(path.join(CONTENT_DIR, 'panel-theme.json'), defaultPanelTheme);
  const history = readJson(path.join(CONTENT_DIR, 'personalizacao-history.json'), []);
  let css = '';
  try{ css = fs.readFileSync(path.join(SITE_DIR, 'css', 'style.css'), 'utf-8'); }catch(e){}
  res.render('personalizacao', {
    flash:req.query.flash || null,
    activeTab:req.query.tab || 'site',
    siteTheme:{...defaultSiteTheme, ...siteTheme},
    panelTheme:{...defaultPanelTheme, ...panelTheme},
    history,
    css
  });
});

router.post('/site/salvar', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const theme = {
    primary:req.body.primary || defaultSiteTheme.primary,
    text:req.body.text || defaultSiteTheme.text,
    bg:req.body.bg || defaultSiteTheme.bg,
    radius:req.body.radius || defaultSiteTheme.radius,
    font:req.body.font || defaultSiteTheme.font
  };

  writeJson(path.join(CONTENT_DIR, 'theme.json'), theme);
  fs.writeFileSync(path.join(SITE_DIR,'css','theme-overrides.css'), siteCss(theme), 'utf-8');

  const hdr = path.join(SITE_DIR, 'header.html');
  try{
    let html = fs.readFileSync(hdr,'utf-8');
    if(!html.includes('css/theme-overrides.css')){
      html = html.replace(/<\/head>/i, '  <link rel="stylesheet" href="css/theme-overrides.css">\n</head>');
      fs.writeFileSync(hdr, html, 'utf-8');
    }
  }catch(e){}

  appendHistory(req.app, 'Design do site salvo');
  res.redirect('/personalizacao?tab=site&flash=Design do site salvo');
});

router.post('/painel/salvar', (req,res)=>{
  const { CONTENT_DIR, PUBLIC_DIR } = P(req.app);
  const publicDir = PUBLIC_DIR;
  const theme = {
    brand:req.body.brand || defaultPanelTheme.brand,
    bg:req.body.bg || defaultPanelTheme.bg,
    card:req.body.card || defaultPanelTheme.card,
    line:req.body.line || defaultPanelTheme.line,
    muted:req.body.muted || defaultPanelTheme.muted,
    text:req.body.text || defaultPanelTheme.text,
    button:req.body.button || defaultPanelTheme.button,
    radius:req.body.radius || defaultPanelTheme.radius,
    font:req.body.font || defaultPanelTheme.font,
    cardPadding:req.body.cardPadding || defaultPanelTheme.cardPadding,
    buttonPaddingY:req.body.buttonPaddingY || defaultPanelTheme.buttonPaddingY,
    buttonPaddingX:req.body.buttonPaddingX || defaultPanelTheme.buttonPaddingX,
    menuSize:req.body.menuSize || defaultPanelTheme.menuSize
  };

  writeJson(path.join(CONTENT_DIR, 'panel-theme.json'), theme);
  fs.mkdirSync(path.join(publicDir, 'css'), { recursive:true });
  fs.writeFileSync(path.join(publicDir, 'css', 'painel-theme.css'), panelCss(theme), 'utf-8');

  appendHistory(req.app, 'Design do painel salvo');
  res.redirect('/personalizacao?tab=painel&flash=Design do painel salvo');
});

router.post('/css/salvar', (req,res)=>{
  const { SITE_DIR, BACKUPS_DIR } = P(req.app);
  const cssPath = path.join(SITE_DIR,'css','style.css');
  backupFile(cssPath, BACKUPS_DIR, 'style.css');
  fs.writeFileSync(cssPath, req.body.css || '', 'utf-8');
  appendHistory(req.app, 'CSS avançado do site salvo');
  res.redirect('/personalizacao?tab=avancado&flash=CSS avançado salvo');
});

router.post('/restaurar-padrao', (req,res)=>{
  const { SITE_DIR, CONTENT_DIR, PUBLIC_DIR } = P(req.app);
  const publicDir = PUBLIC_DIR;

  writeJson(path.join(CONTENT_DIR, 'theme.json'), defaultSiteTheme);
  writeJson(path.join(CONTENT_DIR, 'panel-theme.json'), defaultPanelTheme);

  fs.writeFileSync(path.join(SITE_DIR,'css','theme-overrides.css'), siteCss(defaultSiteTheme), 'utf-8');

  fs.mkdirSync(path.join(publicDir, 'css'), { recursive:true });
  fs.writeFileSync(path.join(publicDir, 'css', 'painel-theme.css'), panelCss(defaultPanelTheme), 'utf-8');

  appendHistory(req.app, 'Configurações restauradas para o padrão');
  res.redirect('/personalizacao?tab=painel&flash=Padrão restaurado');
});

export default router;
