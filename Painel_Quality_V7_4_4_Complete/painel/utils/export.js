import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ensureDir } from './backup.js';

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
  html = ensureBeforeBodyEnd(html, '<script src="js/header-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="js/footer-runtime.js"></script>');
  html = ensureBeforeBodyEnd(html, '<script src="js/main.js"></script>');
  html = ensureInHead(html, '<link rel="stylesheet" href="css/style.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="css/theme-overrides.css">');
  html = ensureInHead(html, '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">');
  return html;
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
  await rec(dir); return out;
}

export default async function exportForGHPages(siteDir, outDir){
  await ensureDir(outDir);

  async function copyRecursive(src, dest){
    const st = await fsp.stat(src);
    if (st.isDirectory()){
      await ensureDir(dest);
      const ents = await fsp.readdir(src, { withFileTypes:true });
      for (const e of ents) await copyRecursive(path.join(src, e.name), path.join(dest, e.name));
    } else {
      await ensureDir(path.dirname(dest));
      await fsp.copyFile(src, dest);
    }
  }
  await copyRecursive(siteDir, outDir);

  const files = await listFiles(outDir, ['.html','.js','.css']);
  for (const f of files){
    let t = await fsp.readFile(f, 'utf-8');
    t = t.replace(/href="\//g,'href="').replace(/src="\//g,'src="').replace(/url\(\//g,'url(');
    t = t.replace(/fetch\("\/content\//g, 'fetch("content/').replace(/fetch\('\/content\//g, "fetch('content/");
    if (f.endsWith('.html')) t = ensureScripts(t);
    await fsp.writeFile(f, t, 'utf-8');
  }
  await fsp.writeFile(path.join(outDir, '.nojekyll'), '');
}
