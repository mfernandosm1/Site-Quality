import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

/* =========================================================
   🧱 FUNÇÕES BASE GERAIS (usadas por paginas.js)
========================================================= */
export function readFileUtf8(p){
  try { return fs.readFileSync(p, 'utf-8'); }
  catch { return ''; }
}
export function writeFileUtf8(p, content){
  fs.writeFileSync(p, content, 'utf-8');
}
function load$(html){ return cheerio.load(html, { decodeEntities:false }); }

export function extractMain(html){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length) return $main.html() || '';
  return $('body').html() || '';
}
export function replaceMain(html, newMainInner){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length) {
    $main.html(newMainInner);
  } else {
    const $body = $('body').first();
    if ($body.length) $body.html(newMainInner);
  }
  return $.html();
}

/* =========================================================
   🏠 INDEX (mantém ids existentes)
========================================================= */
export function extractIndexFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const h2Smartphones = main.find('h2#smartphones').first().text().trim();
  const h2Acessorios  = main.find('h2#acessorios').first().text().trim();
  const emBreve = main.find('p.em-breve').first().text().trim();
  return { h2Smartphones, h2Acessorios, emBreve };
}
export function applyIndexFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  if (fields.h2Smartphones !== undefined){
    main.find('h2#smartphones').first().text(fields.h2Smartphones);
  }
  if (fields.h2Acessorios !== undefined){
    main.find('h2#acessorios').first().text(fields.h2Acessorios);
  }
  if (fields.emBreve !== undefined){
    main.find('p.em-breve').first().text(fields.emBreve);
  }
  return $.html();
}

/* =========================================================
   ℹ️ SOBRE
========================================================= */
export function extractSobreFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const sec0 = main.find('section').eq(0);
  const titulo = sec0.find('h1').first().text().trim();
  const intro  = sec0.find('p').first().text().trim();

  const cards  = main.find('section').eq(1).find('div').toArray();
  const missao = cards[0] ? $(cards[0]).find('p').first().text().trim() : '';
  const visao  = cards[1] ? $(cards[1]).find('p').first().text().trim() : '';
  const valores= cards[2] ? $(cards[2]).find('p').first().text().trim() : '';

  const difSec = main.find('section').eq(2);
  const difTitulo = difSec.find('h2').first().text().trim();
  const difUL = difSec.find('ul').first();
  const difListaHTML = difUL.length ? difUL.html() : '';

  return { titulo, intro, missao, visao, valores, difTitulo, difListaHTML };
}
export function applySobreFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  const sec0 = main.find('section').eq(0);
  if (fields.titulo !== undefined) sec0.find('h1').first().text(fields.titulo);
  if (fields.intro  !== undefined) sec0.find('p').first().text(fields.intro);

  const cards  = main.find('section').eq(1).find('div').toArray();
  if (fields.missao !== undefined && cards[0]) $(cards[0]).find('p').first().text(fields.missao);
  if (fields.visao  !== undefined && cards[1]) $(cards[1]).find('p').first().text(fields.visao);
  if (fields.valores!== undefined && cards[2]) $(cards[2]).find('p').first().text(fields.valores);

  const difSec = main.find('section').eq(2);
  if (fields.difTitulo !== undefined) difSec.find('h2').first().text(fields.difTitulo);
  if (fields.difListaHTML !== undefined){
    const difUL = difSec.find('ul').first();
    if (difUL.length) difUL.html(fields.difListaHTML);
  }
  return $.html();
}

/* =========================================================
   💳 FORMAS DE PAGAMENTO
========================================================= */
export function extractFormasFields(html){
  const $ = load$(html);
  const main = $('main').first();
  const titulo = main.find('h1').first().text().trim();

  const gridCards = main.find('section').eq(0).find('div').toArray();
  const cartaoTitulo = gridCards[0] ? $(gridCards[0]).find('h2').first().text().trim() : '';
  const cartaoTexto  = gridCards[0] ? $(gridCards[0]).find('p').first().text().trim() : '';

  const boletoTitulo = gridCards[1] ? $(gridCards[1]).find('h2').first().text().trim() : '';
  const boletoTexto  = gridCards[1] ? $(gridCards[1]).find('p').first().text().trim() : '';

  const pixTitulo    = gridCards[2] ? $(gridCards[2]).find('h2').first().text().trim() : '';
  const pixTexto     = gridCards[2] ? $(gridCards[2]).find('p').first().text().trim() : '';

  const envSec = main.find('section').eq(1);
  const enviosTitulo = envSec.find('h2').first().text().trim();
  const enviosLinha1 = envSec.find('p').eq(0).text().trim();
  const enviosLinha2 = envSec.find('p').eq(1).text().trim();

  return { titulo, cartaoTitulo, cartaoTexto, boletoTitulo, boletoTexto, pixTitulo, pixTexto, enviosTitulo, enviosLinha1, enviosLinha2 };
}
export function applyFormasFields(html, fields){
  const $ = load$(html);
  const main = $('main').first();
  if (fields.titulo !== undefined) main.find('h1').first().text(fields.titulo);

  const gridCards = main.find('section').eq(0).find('div').toArray();
  if (gridCards[0]){
    if (fields.cartaoTitulo !== undefined) $(gridCards[0]).find('h2').first().text(fields.cartaoTitulo);
    if (fields.cartaoTexto  !== undefined) $(gridCards[0]).find('p').first().text(fields.cartaoTexto);
  }
  if (gridCards[1]){
    if (fields.boletoTitulo !== undefined) $(gridCards[1]).find('h2').first().text(fields.boletoTitulo);
    if (fields.boletoTexto  !== undefined) $(gridCards[1]).find('p').first().text(fields.boletoTexto);
  }
  if (gridCards[2]){
    if (fields.pixTitulo !== undefined) $(gridCards[2]).find('h2').first().text(fields.pixTitulo);
    if (fields.pixTexto  !== undefined) $(gridCards[2]).find('p').first().text(fields.pixTexto);
  }

  const envSec = main.find('section').eq(1);
  if (fields.enviosTitulo !== undefined) envSec.find('h2').first().text(fields.enviosTitulo);
  if (fields.enviosLinha1 !== undefined) envSec.find('p').eq(0).text(fields.enviosLinha1);
  if (fields.enviosLinha2 !== undefined) envSec.find('p').eq(1).text(fields.enviosLinha2);

  return $.html();
}

/* =========================================================
   🆕 CATEGORIAS
========================================================= */
export function generateCategoryPage(name, slug, siteDir) {
  const header = readFileUtf8(path.join(siteDir, 'header.html'));
  const footer = readFileUtf8(path.join(siteDir, 'footer.html'));
  const target = path.join(siteDir, `categoria-${slug}.html`);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} – Quality Celulares</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
${header}
<main class="main">
  <h1 style="text-align:center;margin-top:30px;">${name}</h1>
  <div id="produtos-container" class="products" style="margin-top:40px;"></div>
</main>
${footer}
<script>
function shouldShowPrice(p){
  const v = (p.showPrice ?? p.mostrar_preco ?? p.show_price ?? p.mostrarPreco ?? p.priceVisible ?? '').toString().toLowerCase();
  return v === 'sim' || v === 'yes' || v === 'true' || v === '1' || v === 'on' || v === true;
}
fetch('content/products.json')
  .then(r=>r.json())
  .then(data=>{
    const container=document.getElementById('produtos-container');
    const slugLower='${slug}'.toLowerCase();
    const nameLower='${name}'.toLowerCase();
    const prods=(data.items||[]).filter(p=>{
      const cat=(p.category||'').toString().toLowerCase();
      return cat===slugLower || cat===nameLower;
    });
    if(prods.length===0){
      container.innerHTML='<p class="em-breve" style="text-align:center;">Nenhum produto nesta categoria ainda.</p>';
      return;
    }
    prods.forEach(p=>{
      const show = shouldShowPrice(p);
      const priceNum = (typeof p.price==='number' ? p.price : Number(p.price||0));
      const priceStr = (!show || isNaN(priceNum)) ? '' : 'R$ '+priceNum.toFixed(2).replace('.',',');
      const card=document.createElement('div');
      card.className='product-card';
      card.innerHTML=\`
        <img src="\${p.image||''}" alt="\${p.name||''}">
        <h3>\${p.name||''}</h3>
        \${priceStr ? '<p>'+priceStr+'</p>' : ''}
        <a href="https://wa.me/5555991407824?text='+encodeURIComponent('Olá! Tenho interesse em '+(p.name||'produto'))+'" 
           class="btn-whatsapp" target="_blank">
           <i class="fa-brands fa-whatsapp"></i> Comprar no WhatsApp
        </a>
      \`;
      container.appendChild(card);
    });
  });
</script>
</body>
</html>`;
  writeFileUtf8(target, html);
}

export function updateHeaderMenu(categories, siteDir) {
  const headerPath = path.join(siteDir, 'header.html');
  let headerHtml = readFileUtf8(headerPath);
  if (!headerHtml.includes('<nav')) return;

  const $ = cheerio.load(headerHtml, { decodeEntities: false });
  const navDesktop = $('#nav-desktop');
  const navMobile  = $('#nav-mobile');

  if (!navDesktop.length || !navMobile.length) return;

  navDesktop.find('a.cat-link').remove();
  navMobile.find('a.cat-link').remove();

  const sorted = [...(categories || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const searchWrapper = navDesktop.find('.search-wrapper').first();

  sorted.forEach((c) => {
    const slug = (c.slug || c.name || '').toString().trim();
    const name = (c.name || slug).toString().trim();
    if (!slug || !name) return;

    const linkD = `<a href="categoria-${slug}.html" class="cat-link">${name}</a>`;
    const linkM = `<a href="categoria-${slug}.html" class="cat-link">${name}</a>`;

    if (searchWrapper.length) searchWrapper.before(linkD);
    else navDesktop.append(linkD);

    navMobile.append(linkM);
  });

  writeFileUtf8(headerPath, $.html());
  console.log(`✅ Header atualizado com ${sorted.length} categorias.`);
}

export function convertOldCategoryFiles(siteDir) {
  const files = fs.readdirSync(siteDir).filter(f => /^categoria_/.test(f));
  let converted = 0;
  for (const file of files) {
    const oldPath = path.join(siteDir, file);
    const newName = file.replace(/^categoria_/, 'categoria-');
    const newPath = path.join(siteDir, newName);
    const html = readFileUtf8(oldPath).replace(/categoria_/g, 'categoria-');
    writeFileUtf8(newPath, html);
    fs.unlinkSync(oldPath);
    converted++;
  }
  console.log(converted>0
    ? `🔄 Convertidos ${converted} arquivos de categoria para o novo padrão.`
    : '✅ Nenhum arquivo antigo encontrado.');
}

/* =========================================================
   🖼️ BANNERS
========================================================= */
export function ensureDirSync(dir){
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}
export function backupWriteJson(targetFile, data, backupsDir, label){
  try {
    const prev = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf-8') : '';
    if (prev) {
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const bakName = `${label}.${ts}.bak.json`;
      if (backupsDir) ensureDirSync(backupsDir);
      fs.writeFileSync(path.join(backupsDir, bakName), prev, 'utf-8');
    }
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}
function norm(v){ return (v||'').toString().trim(); }
function firstFromSrcset(v){
  if (!v) return '';
  const t = v.split(',')[0].trim();
  return t.split(/\s+/)[0];
}
function deriveMobile(desktop){
  if (!desktop) return '';
  if (/-mob(?:ile)?\.[a-z0-9]+$/i.test(desktop)) return desktop;
  return desktop.replace(/(\.[a-z0-9]+)$/i, '-mob$1');
}
/** Prefixa 'images/' quando o valor parece só um nome de arquivo (ex.: desk1.png). */
function normalizeBannerPath(p){
  const x = norm(p);
  if (!x) return '';
  if (/^https?:\/\//i.test(x)) return x;
  if (x.startsWith('/')) return x;
  // se não tem barra, assume pasta images/
  if (!x.includes('/')) return `images/${x}`;
  return x;
}

/** Lê banners no index.html e retorna objetos: { src, mobileSrc, alt, href, title, text, order } */
export function parseBannersFromIndex(indexHtml){
  if (!indexHtml) return [];
  const $ = cheerio.load(indexHtml, { decodeEntities:false });

  const items = [];

  // Caso principal do seu site: section.banner > .swiper > .swiper-wrapper > .swiper-slide > picture > source/img
  $('section.banner .swiper-slide picture').each((i, pic)=>{
    const $pic = $(pic);
    const $img = $pic.find('img').first();
    if (!$img.length) return;

    const desktop = normalizeBannerPath($img.attr('data-src') || $img.attr('src'));
    const $srcMobile = $pic.find('source[media*="max-width"][srcset]').first().length
      ? $pic.find('source[media*="max-width"][srcset]').first()
      : $pic.find('source[srcset]').first();
    let mobile = $srcMobile.length ? normalizeBannerPath(firstFromSrcset($srcMobile.attr('srcset'))) : '';
    if (!mobile) mobile = normalizeBannerPath($img.attr('data-src-mobile') || $img.attr('data-mobile'));
    if (!mobile) mobile = normalizeBannerPath(deriveMobile(desktop));
    if (!desktop) return;

    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm($img.attr('alt')),
      href: '',
      title: norm($img.attr('title') || $pic.attr('title')),
      text: '',
      order: items.length
    });
  });

  // Fallback: <img> direto
  $('section.banner .swiper-slide img').each((i, img)=>{
    const $img = $(img);
    const desktop = normalizeBannerPath($img.attr('data-src') || $img.attr('src'));
    if (!desktop) return;
    if (items.some(it => it.src === desktop)) return;
    let mobile = normalizeBannerPath($img.attr('data-src-mobile') || $img.attr('data-mobile'));
    if (!mobile) mobile = normalizeBannerPath(deriveMobile(desktop));
    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm($img.attr('alt')),
      href: '',
      title: norm($img.attr('title')),
      text: '',
      order: items.length
    });
  });

  // Fallback adicional: elementos com background
  $('.swiper-slide, .carousel-item, .banner, [class*="hero"], [class*="slide"], [class*="banner"]').each((i, el)=>{
    const s = norm($(el).attr('style'));
    const m = /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i.exec(s);
    const desktop = m && m[1] ? normalizeBannerPath(m[1]) : '';
    if (!desktop) return;
    if (items.some(it => it.src === desktop)) return;
    const mobileData = $(el).attr('data-bg-mobile') || $(el).attr('data-background-mobile');
    const mobile = normalizeBannerPath(mobileData || deriveMobile(desktop));
    items.push({
      src: desktop,
      mobileSrc: mobile || '',
      alt: '',
      href: '',
      title: norm($(el).attr('title')),
      text: '',
      order: items.length
    });
  });

  // Dedup por src
  const seen = new Set();
  const out = [];
  for (const it of items){
    if (it.src && !seen.has(it.src)){ seen.add(it.src); out.push(it); }
  }
  return out;
}

/** Reescreve os slides do index.html com base em content/banners.json (CRUD). */
export function buildSlidesFromCrud(siteDir){
  const idxPath = path.join(siteDir, 'index.html');
  const jsonPath= path.join(siteDir, 'content', 'banners.json');
  const html    = readFileUtf8(idxPath);
  if (!html) return;

  const $ = cheerio.load(html, { decodeEntities:false });
  const $wrap = $('section.banner .swiper .swiper-wrapper').first();
  if (!$wrap.length) return;

  let items = [];
  try {
    const raw = JSON.parse(readFileUtf8(jsonPath) || '{}');
    items = Array.isArray(raw.items) ? raw.items : [];
  } catch { items = []; }

  // Normaliza e ordena
  const normItems = items.map((it, i) => {
    const desktop = normalizeBannerPath(it.src || it.image || '');
    let mobile = normalizeBannerPath(it.mobileSrc || it.mobile || '');
    if (!mobile) mobile = normalizeBannerPath(deriveMobile(desktop));
    return {
      src: desktop,
      mobileSrc: mobile || '',
      alt: norm(it.alt),
      href: norm(it.link || it.href),
      title: norm(it.title || it.text),
      order: Number(it.order ?? i) || 0
    };
  }).sort((a,b)=>a.order-b.order);

  // Reescreve o conteúdo
  $wrap.empty();
  normItems.forEach(it=>{
    const slide = `
      <div class="swiper-slide">
        <picture>
          ${it.mobileSrc ? `<source media="(max-width: 767px)" srcset="${it.mobileSrc}">` : ''}
          <img src="${it.src}" alt="${it.alt || ''}" class="banner-img">
        </picture>
      </div>`;
    $wrap.append(slide);
  });

  writeFileUtf8(idxPath, $.html());
  console.log(`🖼️ index.html atualizado com ${normItems.length} banner(s).`);
}
