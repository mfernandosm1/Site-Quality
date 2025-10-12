import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';


export function readFileUtf8(p){
  try{ return fs.readFileSync(p,'utf-8'); }catch(e){ return ''; }
}

export function writeFileUtf8(p, content){
  fs.writeFileSync(p, content, 'utf-8');
}

// Extract the inner HTML of <main> (fallback to body if not found)
export function extractMain(html){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length) return $main.html() || '';
  return $('body').html() || '';
}

// Replace only the inner HTML of <main> (fallback to body if not found)
export function replaceMain(html, newMainInner){
  const $ = cheerio.load(html, { decodeEntities: false });
  const $main = $('main').first();
  if ($main.length){
    $main.html(newMainInner);
  } else {
    const $body = $('body').first();
    if ($body.length) $body.html(newMainInner);
  }
  return $.html();
}

// INDEX helpers (safe fields only)
export function extractIndexFields(html){
  const $ = cheerio.load(html, { decodeEntities: false });
  const main = $('main').first();
  const h2Smartphones = main.find('h2#smartphones').first().text().trim();
  const h2Acessorios = main.find('h2#acessorios').first().text().trim();
  const emBreve = main.find('p.em-breve').first().text().trim();
  return { h2Smartphones, h2Acessorios, emBreve };
}

export function applyIndexFields(html, fields){
  const $ = cheerio.load(html, { decodeEntities: false });
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
