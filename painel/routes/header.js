import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8'); }
function stamp(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function toBool(v, def=false){ if (v===undefined) return def; return String(v) === 'true'; }
function toNum(v, def=null){ if (v===undefined || v==='') return def; const n = Number(v); return isNaN(n) ? def : n; }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'header.json');
  const data = readJson(file);
  res.render('editar_header', { flash:null, style: data.style||{}, menu: data.menu||[] });
});

router.post('/save-style', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'header.json');
  const data = readJson(file);
  data.style = data.style || {};
  data.style.background = req.body.background ?? data.style.background ?? '#c90000';
  data.style.textColor = req.body.textColor ?? data.style.textColor ?? '#ffffff';
  data.style.hoverColor = req.body.hoverColor ?? data.style.hoverColor ?? '#ffeeee';
  data.style.activeColor = req.body.activeColor ?? data.style.activeColor ?? '#ffffff';
  data.style.align = req.body.align ?? data.style.align ?? 'left';
  data.style.gap = toNum(req.body.gap, data.style.gap ?? 16);
  data.style.spacingX = toNum(req.body.spacingX, data.style.spacingX ?? 16);
  data.style.height = toNum(req.body.height, data.style.height ?? 60);
  data.style.fontSize = req.body.fontSize ?? data.style.fontSize ?? '15px';
  data.style.fontWeight = req.body.fontWeight ?? data.style.fontWeight ?? '600';
  data.style.logoMaxHeight = toNum(req.body.logoMaxHeight, data.style.logoMaxHeight ?? 40);
  data.style.sticky = toBool(req.body.sticky, data.style.sticky ?? true);
  data.style.shadow = toBool(req.body.shadow, data.style.shadow ?? true);
  data.style.scrollShrink = toBool(req.body.scrollShrink, data.style.scrollShrink ?? false);
  data.style.mobileBehavior = req.body.mobileBehavior ?? data.style.mobileBehavior ?? 'slide';
  data.style.mobileBreakpoint = toNum(req.body.mobileBreakpoint, data.style.mobileBreakpoint ?? 768);
  data.style.mobileOverlay = toBool(req.body.mobileOverlay, data.style.mobileOverlay ?? true);
  data.style.mobileCloseOnClick = toBool(req.body.mobileCloseOnClick, data.style.mobileCloseOnClick ?? true);
  data.style.hamburgerAlign = req.body.hamburgerAlign ?? data.style.hamburgerAlign ?? 'right';
  data.style.showCTA = toBool(req.body.showCTA, data.style.showCTA ?? false);
  data.style.ctaLabel = req.body.ctaLabel ?? data.style.ctaLabel ?? 'Comprar';
  data.style.ctaHref = req.body.ctaHref ?? data.style.ctaHref ?? '#';
  data.style.ctaStyle = req.body.ctaStyle ?? data.style.ctaStyle ?? 'solid';
  data.style.showPhone = toBool(req.body.showPhone, data.style.showPhone ?? false);
  data.style.phoneText = req.body.phoneText ?? data.style.phoneText ?? '(00) 00000-0000';
  data.style.phoneHref = req.body.phoneHref ?? data.style.phoneHref ?? 'tel:+550000000000';
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'header-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data);
  res.render('editar_header', { flash:'Estilo salvo! Campos com prefixo "Mobile" afetam somente mobile.', style: data.style, menu: data.menu||[] });
});

router.post('/add-menu', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'header.json');
  const data = readJson(file);
  data.menu = data.menu || [];
  data.menu.push({ label:req.body.label||'Item', href:req.body.href||'#', order:Number(req.body.order||data.menu.length+1) });
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'header-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data);
  res.redirect('/header');
});

router.post('/del-menu', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'header.json');
  const data = readJson(file);
  const idx = Number(req.body.index);
  if (Array.isArray(data.menu) && data.menu[idx]) data.menu.splice(idx,1);
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'header-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data);
  res.redirect('/header');
});

export default router;
