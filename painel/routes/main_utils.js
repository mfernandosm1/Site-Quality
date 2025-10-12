import * as cheerio from 'cheerio';
import fs from 'fs';

/**
 * Lê o conteúdo HTML e extrai apenas o conteúdo do <main>, se existir.
 * Retorna {htmlCompleto, innerMain, area}
 */
export function loadMainOnly(filePath) {
  let html = '';
  try { html = fs.readFileSync(filePath, 'utf-8'); } catch (e) { return {htmlCompleto:'', innerMain:'', area:'raw'}; }
  const $ = cheerio.load(html);
  const main = $('main').first();
  if (main.length > 0) {
    return { htmlCompleto: html, innerMain: main.html() || '', area: 'main' };
  }
  const body = $('body').first();
  if (body.length > 0) {
    return { htmlCompleto: html, innerMain: body.html() || '', area: 'body' };
  }
  return { htmlCompleto: html, innerMain: html, area: 'raw' };
}

/**
 * Substitui o conteúdo do <main> (ou <body>) no HTML original e retorna o resultado.
 */
export function injectMainOnly(htmlOriginal, area, newInner) {
  const $ = cheerio.load(htmlOriginal);
  if (area === 'main') {
    const main = $('main').first();
    if (main.length > 0) { main.html(newInner); return $.html(); }
  }
  if (area === 'body') {
    const body = $('body').first();
    if (body.length > 0) { body.html(newInner); return $.html(); }
  }
  return newInner;
}
