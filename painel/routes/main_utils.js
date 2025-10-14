import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

// ===== FUNÇÕES BASE GERAIS (usadas por paginas.js) =====
export function readFileUtf8(p){
  try { return fs.readFileSync(p, 'utf-8'); }
  catch { return ''; }
}

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

export function writeFileUtf8(p, content){
  fs.writeFileSync(p, content, 'utf-8');
}

function load$(html){ return cheerio.load(html, { decodeEntities:false }); }

// ===== INDEX (mantém ids existentes) =====
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

// ===== SOBRE =====
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

// ===== FORMAS =====
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
