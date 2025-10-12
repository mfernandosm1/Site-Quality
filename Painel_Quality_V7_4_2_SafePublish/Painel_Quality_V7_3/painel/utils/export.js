import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ensureDir } from './backup.js';

function replaceAll(s, map){
  let out = s;
  for (const [from, to] of map) out = out.split(from).join(to);
  return out;
}

function ensureInHead(html, tag){
  if (html.includes(tag)) return html;
  if (html.includes('</head>')) return html.replace('</head>', '  '+tag+'\n</head>');
  return '<!doctype html><html><head>'+tag+'</head><body>'+html+'</body></html>';
}
function ensureBeforeBodyEnd(html, tag){
  if (html.includes(tag)) return html;
  if (html.includes('</body>')) return html.replace('</body>', '  '+tag+'\n</body>');
  return html + '\n'+tag+'\n';
}
function ensureScripts(html){
  // order: header-runtime, footer-runtime, then main.js
  html = ensureBeforeBodyEnd(html, '<script src="js/header-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="js/footer-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="js/main.js"></script>');
  // ensure style and FA
  html = ensureInHead(html, '<link rel="stylesheet" href="css/style.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="css/theme-overrides.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">');
  return html;
}

export async function exportForGHPages(siteDir, outDir){
  await ensureDir(outDir);
  // copy all
  await copyRecursive(siteDir, outDir);
  // fix paths: remove leading / in href/src/url() across .html/.js/.css
  const files = await listFiles(outDir, ['.html','.js','.css']);
  for (const f of files){
    let t = await fsp.readFile(f, 'utf-8');
    if (f.endsWith('.html')) t = ensureScripts(t);
    t = t.replace(/href="\//g,'href="');
    t = t.replace(/src="\//g,'src="');
    t = t.replace(/url\(\//g,'url(');
    // common fetch() absolute
    t = t.replace(/fetch\("\/content\//g, 'fetch("content/');
    t = t.replace(/fetch\('\/content\//g, "fetch('content/");
    t = t.replace(/"\/images\//g, '"images/');
    t = t.replace(/'\/images\//g, "'images/");
    await fsp.writeFile(f, t, 'utf-8');
  }
  // ensure .nojekyll
  await fsp.writeFile(path.join(outDir, '.nojekyll'), '');
}

async function listFiles(dir, exts){
  const out = [];
  async function rec(p){
    const ents = await fsp.readdir(p, { withFileTypes:true });
    for (const e of ents){
      const full = path.join(p, e.name);
      if (e.isDirectory()) await rec(full);
      else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full);
    }
  }
  await rec(dir);
  return out;
}

async function copyRecursive(src, dest){
  const stats = await fsp.stat(src);
  if (stats.isDirectory()){
    await ensureDir(dest);
    const ents = await fsp.readdir(src, { withFileTypes:true });
    for (const e of ents){
      await copyRecursive(path.join(src, e.name), path.join(dest, e.name));
    }
  } else {
    await ensureDir(path.dirname(dest));
    await fsp.copyFile(src, dest);
  }
}

export default exportForGHPages;
