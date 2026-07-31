import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import InventoryService from '../services/inventory-service.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');

function P(app) {
  return app.locals.paths;
}

function inventoryService(app) {
  // O estoque pertence ao painel local, e não à pasta pública do site.
  // Como este arquivo fica em painel/routes, PANEL_DIR sempre aponta para C:\Site\painel.
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'inventory');

  if (!app.locals.inventoryService) {
    app.locals.inventoryService = new InventoryService({ dataDir });
    console.log(`📦 Inventory Service: ${dataDir}`);
  }

  return app.locals.inventoryService;
}

function booleanFromBody(value, fallback = false) {
  // Express pode entregar um valor simples ou um array quando existem campos
  // repetidos. Sempre considera o último valor enviado pelo formulário.
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;

  const normalized = String(raw).trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'sim', 'ativo'].includes(normalized)) return true;
  if (['false', '0', 'off', 'no', 'nao', 'não', 'inativo'].includes(normalized)) return false;
  return fallback;
}


function numberOrNull(value, fallback = null) {
  if (value === undefined) return fallback;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return { items: [] };
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function backupProductsJson(file) {
  if (!fs.existsSync(file)) return null;

  const backupDir = path.resolve(PANEL_DIR, '..', 'Backup', 'Painel', 'products');
  fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');

  const backupFile = path.join(backupDir, `products-${stamp}.json`);
  fs.copyFileSync(file, backupFile);

  const backups = fs.readdirSync(backupDir)
    .filter(name => /^products-.*\.json$/i.test(name))
    .map(name => ({ name, full: path.join(backupDir, name), time: fs.statSync(path.join(backupDir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  backups.slice(10).forEach(entry => {
    try { fs.unlinkSync(entry.full); } catch (_) {}
  });

  return backupFile;
}

function getAllImages(baseDir, prefix = '') {
  let results = [];
  if (!fs.existsSync(baseDir)) return results;

  const files = fs.readdirSync(baseDir);

  for (const file of files) {
    const full = path.join(baseDir, file);
    const rel = prefix ? `${prefix}/${file}` : file;

    if (fs.statSync(full).isDirectory()) {
      results = results.concat(getAllImages(full, rel));
    } else if (/\.(png|jpg|jpeg|webp|gif)$/i.test(file)) {
      results.push(rel);
    }
  }

  return results;
}

function wantsJson(req) {
  return req.xhr || (req.headers.accept || '').includes('application/json');
}

function galleryFromBody(value, current = []) {
  if (value === undefined || value === null) return current || [];

  let list = [];

  if (Array.isArray(value)) {
    list = value;
  } else {
    list = value.toString().split(/\r?\n|,/);
  }

  return list
    .map(item => item.toString().trim())
    .filter(Boolean)
    .slice(0, 4);
}

function gerarSlug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function slugUnico(slugBase, items = [], ignoreId = null) {
  let base = slugBase || 'produto';
  let slug = base;
  let contador = 2;

  while (
    items.some(p =>
      p.slug === slug &&
      Number(p.id) !== Number(ignoreId)
    )
  ) {
    slug = `${base}-${contador}`;
    contador++;
  }

  return slug;
}

function loadCategories(app) {
  try {
    const file = path.join(P(app).CONTENT_DIR, 'categories.json');
    const data = readJson(file);
    return data.items || [];
  } catch (e) {
    return [];
  }
}

function loadSubcategories(app) {
  try {
    const file = path.join(P(app).CONTENT_DIR, 'subcategories.json');
    const data = readJson(file);
    return data.items || [];
  } catch (e) {
    return [];
  }
}

function normalizeSubcategoryValue(value, categoryValue, categories = [], subcategories = []) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return '';
  const category = (categories || []).find(c => String(c.slug || '') === String(categoryValue || ''));
  if (!category) return '';
  const normalized = gerarSlug(raw);
  const found = (subcategories || []).find(s => Number(s.categoryId) === Number(category.id) && (String(s.slug || '') === raw || gerarSlug(s.name || '') === normalized || gerarSlug(s.slug || '') === normalized));
  return found ? String(found.slug || '').trim() : '';
}

function normalizeCategoryValue(value, categories = []) {
  const raw = (value ?? '').toString().trim();
  if (!raw) return '';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const found = (categories || []).find(c => {
    const id = (c.id ?? '').toString().trim();
    const slug = (c.slug ?? '').toString().trim();
    const name = (c.name ?? '').toString().trim();
    const slugNorm = gerarSlug(slug);
    const nameNorm = gerarSlug(name);
    return raw === id || raw === slug || raw === name || normalized === slugNorm || normalized === nameNorm;
  });

  return found ? (found.slug || gerarSlug(found.name) || raw).toString().trim() : gerarSlug(raw);
}


function getEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env')
  ];

  for (const envPath of envPaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim();
        if (!clean || clean.startsWith('#')) continue;
        const index = clean.indexOf('=');
        if (index === -1) continue;
        const key = clean.slice(0, index).trim();
        const value = clean.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key === name) return value;
      }
    } catch (_) {}
  }

  return '';
}

function geminiModelsToTry() {
  const preferred = getEnvValue('GEMINI_MODEL') || '';
  // V7.6.3: evita modelos 1.5 que não respondem mais nesse endpoint e só geravam erro no console.
  const fallback = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ];

  return [...new Set([preferred, ...fallback].map(v => String(v || '').trim()).filter(Boolean))];
}

function isTemporaryGeminiError(message = '', status = 0) {
  const text = String(message || '').toLowerCase();
  return (
    status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
    text.includes('high demand') || text.includes('overloaded') || text.includes('temporarily') ||
    text.includes('try again later') || text.includes('unavailable') || text.includes('rate limit') || text.includes('quota')
  );
}

function friendlyGeminiError(error) {
  const msg = String(error?.message || error || '');
  if (/GEMINI_API_KEY/i.test(msg) || msg.includes('Chave do Gemini')) return msg;
  if (/quota|rate limit|exceeded/i.test(msg)) return '⚠️ A cota grátis do Gemini acabou por enquanto. Preenchi um rascunho local para você não ficar parado.';
  if (isTemporaryGeminiError(msg, error?.status)) return '⚠️ A IA está congestionada no momento. Aguarde alguns segundos e tente novamente.';
  if (/not found|not supported|not available|invalid/i.test(msg)) return '⚠️ O modelo de IA configurado não respondeu corretamente. Verifique o GEMINI_MODEL no arquivo .env ou tente novamente.';
  return msg || 'Erro ao chamar a IA.';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeJsonFromText(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  } catch (_) {}
  throw new Error('A IA não retornou um cadastro válido. Tente novamente.');
}

async function callGeminiJson(prompt, { temperature = 0.35, maxOutputTokens = 1600 } = {}) {
  const apiKey = getEnvValue('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Chave do Gemini não configurada. Crie um arquivo .env na pasta painel com GEMINI_API_KEY=sua_chave_aqui');

  const models = geminiModelsToTry();
  let lastError = null;

  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            topP: 0.9,
            maxOutputTokens
          }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(data?.error?.message || `Erro ao chamar a API do Gemini (${response.status}).`);
        err.status = response.status;
        err.model = model;
        throw err;
      }

      const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
      if (!text) throw new Error('A IA não retornou conteúdo. Tente novamente.');
      if (index > 0) console.log(`✅ Cadastro IA respondeu usando modelo alternativo: ${model}`);
      return safeJsonFromText(text);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Falha no Cadastro IA (${model}): ${error.message}`);
      if (index < models.length - 1) {
        await wait(isTemporaryGeminiError(error.message, error.status) ? 900 : 250);
        continue;
      }
    }
  }

  throw new Error(friendlyGeminiError(lastError));
}

function extractStorageRamFromQuery(query = '') {
  const text = String(query || '').toLowerCase();
  const storageMatch = text.match(/(64|128|256|512|1024|1)\s*(gb|g|tb)/i);
  const ramMatch = text.match(/(?:\b(2|3|4|6|8|12|16)\s*(gb|g)\s*(?:ram|mem[oó]ria)|(?:ram|mem[oó]ria)\s*(2|3|4|6|8|12|16)\s*(gb|g))/i);
  let storage = '';
  if (storageMatch) {
    const n = storageMatch[1];
    const unit = String(storageMatch[2] || '').toLowerCase();
    storage = unit === 'tb' || n === '1024' ? '1TB' : `${n}GB`;
  }
  const ram = ramMatch ? `${ramMatch[1] || ramMatch[3]}GB RAM` : '';
  return { storage, ram };
}

function normalizeQueryForSpecs(query = '') {
  return String(query || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function knownSpecsForProduct(query = '') {
  const q = normalizeQueryForSpecs(query);

  if (/\b(samsung|galaxy)?\s*m55\b/.test(q)) {
    return {
      baseName: 'Samsung Galaxy M55 5G',
      Tela: 'Super AMOLED Plus de 6,7”, Full HD+ e 120Hz',
      Processador: 'Qualcomm Snapdragon 7 Gen 1',
      'Câmera traseira': '50MP com OIS + 8MP ultrawide + 2MP macro',
      'Câmera frontal': '50MP',
      Bateria: '5.000mAh, carregamento rápido de até 45W',
      Sistema: 'Android 14 com One UI',
      Rede: '5G',
      NFC: 'Sim, pode variar conforme região/lote',
      Recursos: 'Leitor digital na tela, som estéreo, USB-C'
    };
  }


  if (/\b(samsung|galaxy)?\s*s26\s*(ultra)?\b/.test(q)) {
    const isUltra = /\bultra\b/.test(q);
    const isPlus = /\b(s26\s*\+|s26\s*plus)\b/.test(q);
    if (isUltra) {
      return {
        baseName: 'Samsung Galaxy S26 Ultra 5G',
        Tela: 'Dynamic AMOLED 2X de 6,9”, 120Hz, com Privacy Display',
        Processador: 'Chipset topo de linha da linha S26; confirmar variante/região',
        'Câmera traseira': 'Principal de 200MP + conjunto ultrawide/telefoto; confirmar versão exata',
        'Câmera frontal': '12MP',
        Bateria: '5.000mAh, até 31h de reprodução de vídeo segundo a Samsung',
        Sistema: 'Android com One UI, conforme versão de fábrica/lote',
        Rede: '5G',
        NFC: 'Sim, pode variar conforme região/lote',
        Recursos: 'S Pen, Galaxy AI, IP68, USB-C, leitor digital na tela'
      };
    }
    return {
      baseName: isPlus ? 'Samsung Galaxy S26+ 5G' : 'Samsung Galaxy S26 5G',
      Tela: isPlus ? 'Dynamic AMOLED 2X de 6,7”, 120Hz e brilho de até 2600 nits' : 'Dynamic AMOLED 2X de 6,3”, 120Hz e brilho de até 2600 nits',
      Processador: 'Exynos 2600 em mercados selecionados; confirmar variante/região',
      'Câmera traseira': '12MP ultrawide + 50MP wide + 10MP telefoto 3x',
      'Câmera frontal': '12MP',
      Bateria: isPlus ? '4.900mAh, até 31h de reprodução de vídeo segundo a Samsung' : '4.300mAh, até 30h de reprodução de vídeo segundo a Samsung',
      Sistema: 'Android com One UI, conforme versão de fábrica/lote',
      Rede: '5G',
      NFC: 'Sim, pode variar conforme região/lote',
      Recursos: 'Galaxy AI, IP68, Gorilla Glass Victus 2, USB-C, leitor digital na tela'
    };
  }

  if (/\b(samsung|galaxy)?\s*a36\b/.test(q)) {
    return {
      baseName: 'Samsung Galaxy A36 5G',
      Tela: 'Super AMOLED de 6,7”, Full HD+ e 120Hz',
      Processador: 'Qualcomm Snapdragon 6 Gen 3',
      'Câmera traseira': '50MP com OIS + 8MP ultrawide + 5MP macro',
      'Câmera frontal': '12MP',
      Bateria: '5.000mAh, carregamento rápido de até 45W',
      Sistema: 'Android 15 com One UI 7',
      Rede: '5G',
      NFC: 'Sim, pode variar conforme região/lote',
      Recursos: 'Resistência IP67, leitor digital na tela, USB-C'
    };
  }

  if (/\b(samsung|galaxy)?\s*a12\b/.test(q)) {
    return {
      baseName: 'Samsung Galaxy A12',
      Tela: 'PLS LCD de 6,5”, HD+',
      Processador: 'MediaTek Helio P35 ou Exynos 850, conforme versão',
      'Câmera traseira': '48MP + 5MP ultrawide + 2MP macro + 2MP profundidade',
      'Câmera frontal': '8MP',
      Bateria: '5.000mAh, carregamento de até 15W',
      Sistema: 'Android, versão pode variar conforme atualização do aparelho',
      Rede: '4G',
      NFC: 'Normalmente não possui, confirmar variante',
      Recursos: 'Leitor digital lateral, USB-C'
    };
  }

  if (/\b(samsung|galaxy)?\s*a15\b/.test(q)) {
    return {
      baseName: q.includes('5g') ? 'Samsung Galaxy A15 5G' : 'Samsung Galaxy A15',
      Tela: 'Super AMOLED de 6,5”, Full HD+ e 90Hz',
      Processador: q.includes('5g') ? 'MediaTek Dimensity 6100+' : 'MediaTek Helio G99',
      'Câmera traseira': '50MP + 5MP ultrawide + 2MP macro',
      'Câmera frontal': '13MP',
      Bateria: '5.000mAh, carregamento de até 25W',
      Sistema: 'Android 14 com One UI',
      Rede: q.includes('5g') ? '5G' : '4G',
      NFC: 'Confirmar conforme região/lote',
      Recursos: 'Leitor digital lateral, USB-C'
    };
  }

  if (/\b(redmi)?\s*note\s*13\b/.test(q)) {
    const is5g = q.includes('5g');
    return {
      baseName: is5g ? 'Xiaomi Redmi Note 13 5G' : 'Xiaomi Redmi Note 13',
      Tela: 'AMOLED de 6,67”, Full HD+ e 120Hz',
      Processador: is5g ? 'MediaTek Dimensity 6080' : 'Qualcomm Snapdragon 685',
      'Câmera traseira': is5g ? '108MP + sensores auxiliares' : '108MP + 8MP ultrawide + 2MP macro',
      'Câmera frontal': '16MP',
      Bateria: '5.000mAh, carregamento rápido de até 33W',
      Sistema: 'Android/MIUI ou HyperOS, conforme lote e atualização',
      Rede: is5g ? '5G' : '4G',
      NFC: 'Pode variar conforme versão/região',
      Recursos: 'Leitor digital, USB-C, infravermelho'
    };
  }

  if (/\b(moto|motorola)\s*g84\b/.test(q)) {
    return {
      baseName: 'Motorola Moto G84 5G',
      Tela: 'pOLED de 6,55”, Full HD+ e 120Hz',
      Processador: 'Qualcomm Snapdragon 695 5G',
      'Câmera traseira': '50MP com OIS + 8MP ultrawide/macro',
      'Câmera frontal': '16MP',
      Bateria: '5.000mAh, carregamento TurboPower de até 30W',
      Sistema: 'Android, conforme atualização do aparelho',
      Rede: '5G',
      NFC: 'Sim, pode variar conforme região/lote',
      Recursos: 'Som estéreo, USB-C, leitor digital na tela'
    };
  }

  if (/\biphone\s*11\b/.test(q)) {
    return {
      baseName: 'iPhone 11',
      Tela: 'Liquid Retina HD de 6,1”',
      Processador: 'Apple A13 Bionic',
      'Câmera traseira': 'Dupla de 12MP: grande-angular + ultra-angular',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '4G',
      NFC: 'Sim',
      Recursos: 'Face ID, Lightning'
    };
  }

  if (/\biphone\s*12\b/.test(q)) {
    return {
      baseName: 'iPhone 12',
      Tela: 'Super Retina XDR OLED de 6,1”',
      Processador: 'Apple A14 Bionic',
      'Câmera traseira': 'Dupla de 12MP: grande-angular + ultra-angular',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, MagSafe, Lightning'
    };
  }

  if (/\biphone\s*13\b/.test(q)) {
    return {
      baseName: 'iPhone 13',
      Tela: 'Super Retina XDR OLED de 6,1”',
      Processador: 'Apple A15 Bionic',
      'Câmera traseira': 'Dupla de 12MP: grande-angular + ultra-angular',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, MagSafe, Lightning'
    };
  }


  if (/\biphone\s*14\b/.test(q)) {
    return {
      baseName: 'iPhone 14',
      Tela: 'Super Retina XDR OLED de 6,1”',
      Processador: 'Apple A15 Bionic',
      'Câmera traseira': 'Dupla de 12MP: principal + ultra-angular',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, MagSafe, Lightning, Ceramic Shield'
    };
  }

  if (/\biphone\s*15\b/.test(q)) {
    return {
      baseName: 'iPhone 15',
      Tela: 'Super Retina XDR OLED de 6,1” com Dynamic Island',
      Processador: 'Apple A16 Bionic',
      'Câmera traseira': '48MP principal + 12MP ultra-angular, zoom óptico de qualidade 2x',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, USB-C, MagSafe, Dynamic Island'
    };
  }

  if (/\biphone\s*16\b/.test(q)) {
    return {
      baseName: 'iPhone 16',
      Tela: 'Super Retina XDR OLED de 6,1” com Dynamic Island',
      Processador: 'Apple A18',
      'Câmera traseira': '48MP Fusion principal + 12MP ultra-angular',
      'Câmera frontal': '12MP TrueDepth',
      Bateria: 'Autonomia varia conforme saúde da bateria e uso',
      Sistema: 'iOS, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, USB-C, MagSafe, Botão de Ação e Controle da Câmera'
    };
  }

  if (/\biphone\s*17\b/.test(q)) {
    return {
      baseName: 'iPhone 17',
      Tela: 'Super Retina XDR OLED de 6,3”, ProMotion até 120Hz, Always-On e brilho externo de até 3000 nits',
      Processador: 'Apple A19',
      'Câmera traseira': 'Sistema 48MP Dual Fusion: principal 48MP com telefoto 2x + ultra-angular 48MP',
      'Câmera frontal': 'Center Stage de 18MP com vídeo 4K HDR',
      Bateria: 'Autonomia para o dia todo; varia conforme uso',
      Sistema: 'iOS 26 ou superior, conforme atualização disponível',
      Rede: '5G',
      NFC: 'Sim',
      Recursos: 'Face ID, USB-C, Dynamic Island, MagSafe, Ceramic Shield 2, ProMotion'
    };
  }

  return null;
}

function prettyNameFromQuery(query = '', specs = null) {
  const raw = String(query || '').trim().replace(/\s+/g, ' ');
  const detected = extractStorageRamFromQuery(raw);
  let name = specs?.baseName || raw;
  if (detected.storage && !normalizeQueryForSpecs(name).includes(normalizeQueryForSpecs(detected.storage))) name += ` ${detected.storage}`;
  if (detected.ram && !normalizeQueryForSpecs(name).includes(normalizeQueryForSpecs(detected.ram.replace(' RAM', '')))) name += ` ${detected.ram}`;
  return name.trim();
}


function commercialSummaryForProduct(name = '', specs = {}, detected = {}) {
  const q = normalizeQueryForSpecs(name);
  const storagePart = detected.storage ? `${detected.storage} de armazenamento` : 'bom espaço de armazenamento';
  const ramPart = detected.ram ? ` e ${detected.ram}` : '';

  if (q.includes('iphone')) {
    const tela = specs.Tela ? `tela ${specs.Tela}` : 'tela de alta qualidade';
    const chip = specs.Processador ? `chip ${specs.Processador}` : 'chip Apple';
    const camera = specs['Câmera traseira'] ? 'câmeras avançadas' : 'ótimas câmeras';
    return `<strong>${name}</strong> combina design premium, ${tela}, ${chip}, ${camera} e ${storagePart}${ramPart}. É uma excelente escolha para quem busca desempenho, fotos de qualidade e uma experiência fluida no dia a dia.`;
  }

  if (q.includes('galaxy') || q.includes('samsung')) {
    const tela = specs.Tela ? `tela ${specs.Tela}` : 'tela de ótima qualidade';
    const processador = specs.Processador ? `processador ${specs.Processador}` : 'bom desempenho';
    const bateria = specs.Bateria ? `bateria ${String(specs.Bateria).split(',')[0]}` : 'boa autonomia';
    return `<strong>${name}</strong> entrega uma experiência completa com ${tela}, ${processador}, ${storagePart}${ramPart} e ${bateria}. Ideal para quem quer um smartphone moderno, rápido e confiável para fotos, vídeos, redes sociais e uso diário.`;
  }

  if (q.includes('redmi') || q.includes('xiaomi') || q.includes('poco')) {
    const tela = specs.Tela ? `tela ${specs.Tela}` : 'boa tela';
    const bateria = specs.Bateria ? `bateria ${String(specs.Bateria).split(',')[0]}` : 'boa bateria';
    return `<strong>${name}</strong> é uma ótima opção para quem procura custo-benefício, com ${tela}, ${storagePart}${ramPart}, ${bateria} e recursos práticos para o dia a dia.`;
  }

  if (q.includes('moto') || q.includes('motorola')) {
    const bateria = specs.Bateria ? `bateria ${String(specs.Bateria).split(',')[0]}` : 'boa autonomia';
    return `<strong>${name}</strong> oferece uso simples, rápido e confiável, com ${storagePart}${ramPart}, ${bateria} e recursos úteis para quem precisa de praticidade no dia a dia.`;
  }

  return `<strong>${name}</strong> reúne as principais características para quem busca praticidade, bom desempenho e uma experiência completa no uso diário. Confira abaixo os detalhes técnicos do produto.`;
}

function buildLocalProductDraft(query = '', categories = []) {
  const raw = String(query || '').trim();
  const lower = raw.toLowerCase();
  const categoryGuess = lower.includes('iphone') || lower.includes('samsung') || lower.includes('galaxy') || lower.includes('xiaomi') || lower.includes('redmi') || lower.includes('poco') || lower.includes('moto') || lower.includes('motorola')
    ? 'smartphones'
    : '';
  const category = normalizeCategoryValue(categoryGuess, categories) || normalizeCategoryValue('', categories);
  const detected = extractStorageRamFromQuery(raw);
  const specs = knownSpecsForProduct(raw);
  const name = prettyNameFromQuery(raw, specs);
  const slug = gerarSlug(name);

  if (specs) {
    const mergedSpecs = {
      ...specs,
      'Memória RAM': detected.ram || 'Confirmar versão exata',
      'Armazenamento': detected.storage || 'Confirmar versão exata'
    };
    delete mergedSpecs.baseName;

    const camera = mergedSpecs['Câmera traseira'] ? `, câmera ${mergedSpecs['Câmera traseira'].split('+')[0].replace('com OIS', '').trim()}` : '';
    const descShort = `${name} com ${mergedSpecs.Tela || 'tela'}${detected.storage ? `, ${detected.storage}` : ''}${detected.ram ? `, ${detected.ram}` : ''}${camera} e bateria ${String(mergedSpecs.Bateria || '').split(',')[0]}.`.slice(0, 170);

    const commercialIntro = commercialSummaryForProduct(name, mergedSpecs, detected);
    const descLong = `<p>${commercialIntro}</p><ul>` +
      Object.entries(mergedSpecs).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('') +
      `</ul>`;

    return {
      name,
      slug,
      seoTitle: `${name} | Quality Celulares`,
      seoDescription: descShort.slice(0, 155),
      category,
      descriptionShort: descShort,
      descriptionLong: descLong,
      specs: mergedSpecs
    };
  }

  const storageLine = detected.storage ? `<li><strong>Armazenamento:</strong> ${detected.storage}</li>` : '<li><strong>Armazenamento:</strong> Confirmar versão exata</li>';
  const ramLine = detected.ram ? `<li><strong>Memória RAM:</strong> ${detected.ram}</li>` : '<li><strong>Memória RAM:</strong> Confirmar versão exata</li>';
  const descShort = (`${raw}${detected.storage ? ` ${detected.storage}` : ''}${detected.ram ? ` ${detected.ram}` : ''}. Cadastro gerado parcialmente; revise as especificações antes de publicar.`).slice(0, 170);
  const descLong = `<p>${commercialSummaryForProduct(raw, {}, detected)} Revise as especificações técnicas antes de publicar.</p><ul>${storageLine}${ramLine}<li><strong>Tela:</strong> Confirmar tecnologia e tamanho exatos do modelo</li><li><strong>Processador:</strong> Confirmar chipset exato do modelo</li><li><strong>Câmera traseira:</strong> Confirmar conjunto de câmeras</li><li><strong>Câmera frontal:</strong> Confirmar resolução</li><li><strong>Bateria:</strong> Confirmar capacidade e carregamento</li><li><strong>Rede:</strong> Confirmar 4G/5G</li><li><strong>NFC:</strong> Confirmar conforme versão/região</li></ul>`;

  return {
    name: raw,
    slug: gerarSlug(raw),
    seoTitle: raw,
    seoDescription: descShort,
    category,
    descriptionShort: descShort,
    descriptionLong: descLong,
    specs: {}
  };
}

function stripDangerousHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .trim();
}

function normalizeAiProductDraft(raw = {}, categories = []) {
  const category = normalizeCategoryValue(raw.category || raw.categoria || '', categories);
  const name = String(raw.name || raw.nome || '').trim();
  const slug = gerarSlug(raw.slug || name);

  return {
    name,
    slug,
    seoTitle: String(raw.seoTitle || raw.tituloSeo || raw.titleSeo || '').trim(),
    seoDescription: String(raw.seoDescription || raw.descricaoSeo || raw.descriptionSeo || '').trim(),
    category,
    descriptionShort: String(raw.descriptionShort || raw.descricaoCurta || '').trim(),
    descriptionLong: stripDangerousHtml(raw.descriptionLong || raw.descricaoLonga || ''),
    specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : {}
  };
}

function buildAiProductDraftPrompt({ query, categories = [] }) {
  const categoryText = categories
    .filter(c => c && (c.name || c.slug))
    .map(c => `- ${c.name || c.slug} | slug: ${c.slug || gerarSlug(c.name)}`)
    .join('\n');

  return `Você é um especialista em cadastro técnico-comercial de celulares, eletrônicos e acessórios para uma loja brasileira chamada Quality Celulares.

O usuário vai informar um produto. Gere um rascunho pronto para cadastro no site, com descrição curta, objetiva e especificações úteis.

PRODUTO INFORMADO PELO USUÁRIO:
${query}

CATEGORIAS DISPONÍVEIS:
${categoryText || '- smartphones | slug: smartphones'}

OBJETIVO DO CADASTRO:
- Ajudar o lojista a economizar tempo.
- Preencher campos com informações técnicas realmente úteis.
- Evitar texto genérico demais.
- Não entregar somente especificações técnicas: sempre abrir com um resumo comercial curto das qualidades do produto.
- Manter o padrão simples, comercial e profissional do site.

REGRAS OBRIGATÓRIAS:
- Responder em português do Brasil.
- Retornar APENAS JSON válido, sem markdown e sem explicações.
- Não inventar preço, estoque, garantia, disponibilidade, brinde ou condição comercial.
- Não dizer "lacrado", "novo", "usado", "original" ou "pronta entrega" se o usuário não informou.
- Não usar frases vagas como "tecnologia avançada", "recursos modernos", "alta qualidade" ou "excelente desempenho" sem especificação.
- Se o modelo informado tiver especificações públicas conhecidas, preencha com dados técnicos específicos.
- Se houver dúvida real sobre alguma especificação, use "Confirmar informação" naquele campo em vez de inventar.
- Se o usuário informou armazenamento/RAM no texto, preserve exatamente no nome e nas especificações.
- A descrição curta deve ter no máximo 170 caracteres e ser comercial, mas objetiva.
- A descrição longa deve começar com um parágrafo comercial breve, parecido com anúncio de loja: explique em 1 ou 2 frases as principais qualidades reais do produto e para quem ele é indicado.
- Depois desse resumo inicial, liste as especificações em tópicos.
- A descrição longa deve ser HTML simples usando apenas <p>, <strong>, <ul> e <li>.
- A categoria deve usar exatamente um slug disponível na lista de categorias.
- O slug deve ser minúsculo, sem acentos e sem caracteres especiais.

PADRÃO DA DESCRIÇÃO LONGA:
<p><strong>Nome do produto</strong> combina/entrega/oferece [principais qualidades reais do produto]. Ideal para quem busca [benefício prático: fotos, desempenho, bateria, tela, estudos, trabalho ou uso diário].</p>
<ul>
<li><strong>Tela:</strong> tamanho + tecnologia + taxa de atualização, se conhecido</li>
<li><strong>Processador:</strong> modelo/chipset, se conhecido</li>
<li><strong>Memória RAM:</strong> quantidade informada ou conhecida</li>
<li><strong>Armazenamento:</strong> quantidade informada ou conhecida</li>
<li><strong>Câmera traseira:</strong> sensores principais, se conhecido</li>
<li><strong>Câmera frontal:</strong> resolução, se conhecida</li>
<li><strong>Bateria:</strong> capacidade e carregamento, se conhecido</li>
<li><strong>Sistema:</strong> Android/iOS e versão/base, se conhecido</li>
<li><strong>Rede:</strong> 4G/5G, se conhecido</li>
<li><strong>Recursos:</strong> NFC, leitor digital, resistência à água ou outros, apenas se conhecido</li>
</ul>

NÃO FAÇA ASSIM:
- "Câmera de alta resolução"
- "Bateria de longa duração"
- "Tecnologia moderna"
- "Processador potente"
Essas frases só podem aparecer se acompanhadas de informação técnica concreta.

FORMATO OBRIGATÓRIO DO JSON:
{
  "name": "Nome comercial completo do produto",
  "slug": "slug-do-produto",
  "seoTitle": "Título SEO objetivo",
  "seoDescription": "Descrição SEO objetiva até 155 caracteres",
  "category": "slug-da-categoria",
  "descriptionShort": "Descrição curta objetiva e comercial",
  "descriptionLong": "<p>Texto curto...</p><ul><li><strong>Tela:</strong> ...</li></ul>",
  "specs": {
    "Tela": "...",
    "Processador": "...",
    "Memória RAM": "...",
    "Armazenamento": "...",
    "Câmera traseira": "...",
    "Câmera frontal": "...",
    "Bateria": "...",
    "Sistema": "...",
    "Rede": "...",
    "NFC": "..."
  }
}`;
}

function linesFromBody(value) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  return String(value || '')
    .split(/\r?\n|,/)
    .map(v => v.trim())
    .filter(Boolean);
}

function parseVariationColors(value) {
  return linesFromBody(value).map(line => {
    const parts = line.split('|').map(v => v.trim());
    const name = parts[0] || '';
    const hex = parts[1] || '';
    const image = parts[2] || '';
    return { name, hex, image };
  }).filter(c => c.name);
}


function parseVariationCombinations(value) {
  return linesFromBody(value).map(line => {
    const parts = line.split('|').map(v => v.trim());
    return {
      color: parts[0] || '',
      storage: parts[1] || '',
      ram: parts[2] || '',
      condition: parts[3] || '',
      image: parts[4] || '',
      stock: parts[5] !== undefined && parts[5] !== '' ? Number(parts[5]) : null
    };
  }).filter(c => c.color || c.storage || c.ram || c.condition);
}


function parseVariationLabels(value) {
  if (!value) return {};

  if (typeof value === 'object' && !Array.isArray(value)) return value;

  try {
    return JSON.parse(String(value || '{}'));
  } catch (e) {
    return {};
  }
}

function variationsFromBody(body, current = {}) {
  const currentVariations = current.variations || {};
  const enabledRaw = body.variationsEnabled ?? currentVariations.enabled ?? false;
  const labels = parseVariationLabels(body.variationLabels ?? currentVariations.labelsText ?? currentVariations.labels ?? {});

  const colors = parseVariationColors(body.variationColors ?? currentVariations.colorsText ?? '');
  const storage = linesFromBody(body.variationStorage ?? currentVariations.storageText ?? '');
  const ram = linesFromBody(body.variationRam ?? currentVariations.ramText ?? '');
  const condition = linesFromBody(body.variationCondition ?? currentVariations.conditionText ?? '');
  const combinations = parseVariationCombinations(body.variationCombinations ?? currentVariations.combinationsText ?? '');

  const hasAnyVariation = colors.length || storage.length || ram.length || condition.length || combinations.length;
  const enabled = enabledRaw === true || enabledRaw === 'true' || enabledRaw === 'on' || enabledRaw === '1' || !!hasAnyVariation;

  return {
    enabled,
    colors,
    storage,
    ram,
    condition,
    combinations,
    labels
  };
}


function variationsToText(variations = {}) {
  const colors = Array.isArray(variations.colors) ? variations.colors.map(c => [c.name, c.hex, c.image].filter(Boolean).join('|')).join('\n') : '';
  const combinations = Array.isArray(variations.combinations) ? variations.combinations.map(c => [c.color, c.storage, c.ram, c.condition, c.image, c.stock].filter((v, i) => i < 4 || (v !== undefined && v !== null && v !== '')).join('|')).join('\n') : '';
  return {
    colorsText: colors,
    storageText: Array.isArray(variations.storage) ? variations.storage.join('\n') : '',
    ramText: Array.isArray(variations.ram) ? variations.ram.join('\n') : '',
    conditionText: Array.isArray(variations.condition) ? variations.condition.join('\n') : '',
    labelsText: variations.labels ? JSON.stringify(variations.labels) : '',
    combinationsText: combinations
  };
}



function idListFromBody(value, current = []) {
  if (value === undefined || value === null) {
    if (Array.isArray(current)) return current.map(v => String(v || '').trim()).filter(Boolean).slice(0, 12);
    return linesFromBody(current).slice(0, 12);
  }

  let list = [];
  if (Array.isArray(value)) list = value;
  else list = String(value || '').split(/\r?\n|,|;/);

  const seen = new Set();
  return list
    .map(v => String(v || '').trim())
    .map(v => v.replace(/^QLT[-\s]*/i, '').trim())
    .filter(Boolean)
    .filter(v => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function tagsFromBody(value, current = []) {
  if (value === undefined || value === null) {
    return Array.isArray(current) ? current : linesFromBody(current);
  }

  let list = [];

  if (Array.isArray(value)) {
    list = value;
  } else {
    list = String(value || '').split(/\r?\n|,/);
  }

  const seen = new Set();
  return list
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .map(v => v.slice(0, 32))
    .filter(v => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}


function defaultInventoryPolicy(current = {}, body = null) {
  const inventory = current.inventory && typeof current.inventory === 'object' ? current.inventory : {};
  const currentSite = inventory.channelAvailability?.site || {};
  const source = body || {};
  const siteMode = source.inventorySiteMode ?? currentSite.mode ?? 'shared';
  return {
    itemId: inventory.itemId || '',
    stockControlled: booleanFromBody(source.stockControlled, inventory.stockControlled === true),
    allowNegative: booleanFromBody(source.allowNegative, inventory.allowNegative === true),
    minimumQuantity: Math.max(0, numberOrNull(source.minimumQuantity, inventory.minimumQuantity ?? 0) || 0),
    channelAvailability: {
      site: {
        mode: ['shared', 'limited', 'disabled'].includes(siteMode) ? siteMode : 'shared',
        enabled: siteMode !== 'disabled',
        limit: Math.max(0, numberOrNull(source.siteLimit, currentSite.limit) || 0) || null,
        physicalSafety: Math.max(0, numberOrNull(source.physicalSafety, currentSite.physicalSafety ?? 0) || 0)
      }
    }
  };
}

function combinationKey(combo = {}) {
  return [combo.color, combo.storage, combo.ram, combo.condition]
    .map(value => String(value || '').trim().toLowerCase())
    .join('|');
}

function ensureInventoryIdentity(product = {}, previous = null) {
  const previousInventory = previous?.inventory || {};
  const inventory = defaultInventoryPolicy(product);
  inventory.itemId = inventory.itemId || previousInventory.itemId || `PRD-${product.id || Date.now()}`;
  product.inventory = inventory;

  const previousByKey = new Map(
    (previous?.variations?.combinations || []).map(combo => [combinationKey(combo), combo.inventoryItemId])
  );

  if (Array.isArray(product?.variations?.combinations)) {
    product.variations.combinations = product.variations.combinations.map((combo, index) => ({
      ...combo,
      inventoryItemId: combo.inventoryItemId || previousByKey.get(combinationKey(combo)) || `VAR-${product.id || Date.now()}-${index + 1}`
    }));
  }
  return product;
}

function syncInventoryFromProduct(req, product, { reason = 'Ajuste pelo cadastro de produtos', initial = false } = {}) {
  const service = inventoryService(req.app);
  const policy = product.inventory || {};

  console.log(
    `📦 Diagnóstico estoque: ${product.name || product.id} | ` +
    `controlado=${policy.stockControlled === true} | ` +
    `item=${policy.itemId || 'sem-item'} | quantidade=${product.stock ?? 'não informada'}`
  );

  if (!policy.stockControlled) {
    console.log(`📦 Estoque ERP ignorado: controle desativado para ${product.name || product.id}`);
    return { controlled: false };
  }

  const syncOne = (inventoryItemId, quantity, label) => {
    if (!inventoryItemId) return null;
    const desired = Math.max(0, Number(quantity) || 0);
    service.configurarItem({
      inventoryItemId,
      minimumQuantity: Math.max(0, Number(policy.minimumQuantity) || 0)
    });
    const current = service.consultarSaldo({ inventoryItemId });
    if (current.physicalQuantity === desired) return current;
    return service.ajustarEstoque({
      inventoryItemId,
      newQuantity: desired,
      origin: 'cadastro_produtos',
      referenceType: 'product',
      referenceId: String(product.id),
      reason: initial ? `Entrada inicial: ${label}` : reason,
      createdBy: req.user?.name || req.user?.email || 'painel',
      allowNegative: policy.allowNegative === true
    }).balance;
  };

  const productBalance = syncOne(policy.itemId, product.stock, product.name || 'Produto');
  const variationBalances = [];
  for (const combo of product?.variations?.combinations || []) {
    variationBalances.push(syncOne(combo.inventoryItemId, combo.stock, `${product.name} / ${combinationKey(combo)}`));
  }
  console.log(`📦 Estoque ERP sincronizado: ${product.name || product.id} | físico: ${productBalance?.physicalQuantity ?? 0}`);
  return { controlled: true, productBalance, variationBalances };
}

function productErpActive(product = {}) {
  if (product.erp && typeof product.erp === 'object' && product.erp.active !== undefined) {
    return booleanFromBody(product.erp.active, true);
  }
  return booleanFromBody(product.active, true);
}

function productLvActive(product = {}) {
  if (product.virtualStore && typeof product.virtualStore === 'object' && product.virtualStore.active !== undefined) {
    return booleanFromBody(product.virtualStore.active, true);
  }
  return booleanFromBody(product.active, true);
}

function productFromBody(body, current = {}) {
  const submittedPrice = body.lvPrice ?? body.price;
  const priceValue = submittedPrice !== undefined && submittedPrice !== ''
    ? Number(submittedPrice)
    : (current.price ?? null);

  const stockValue = body.stock !== undefined && body.stock !== ''
    ? Math.max(0, Number(body.stock))
    : null;

  const variations = variationsFromBody(body, current);
  const comboStocks = Array.isArray(variations.combinations)
    ? variations.combinations
        .map(c => c.stock)
        .filter(v => v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)))
        .map(v => Math.max(0, Number(v)))
    : [];

  const finalStock = variations.enabled && comboStocks.length
    ? comboStocks.reduce((sum, value) => sum + value, 0)
    : (Number.isFinite(stockValue) ? stockValue : null);

  const numberOrNull = (value, fallback = null) => {
    if (value === undefined) return fallback;
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const currentCommercial = current.commercial || {};
  const commercial = {
    costPrice: numberOrNull(body.costPrice, currentCommercial.costPrice ?? null),
    erpPrice: numberOrNull(body.erpPrice, currentCommercial.erpPrice ?? current.price ?? null),
    marketplacePrice: numberOrNull(body.marketplacePrice, currentCommercial.marketplacePrice ?? null),
    promotionalPrice: numberOrNull(body.promotionalPrice, currentCommercial.promotionalPrice ?? null),
    desiredMarginPercent: numberOrNull(body.desiredMarginPercent, currentCommercial.desiredMarginPercent ?? null),
    expectedProfit: numberOrNull(body.expectedProfit, currentCommercial.expectedProfit ?? null),
    defaultCommissionPercent: numberOrNull(body.defaultCommissionPercent, currentCommercial.defaultCommissionPercent ?? null),
    cashPrice: numberOrNull(body.cashPrice, currentCommercial.cashPrice ?? null),
    installmentPrice: numberOrNull(body.installmentPrice, currentCommercial.installmentPrice ?? null),
    minimumPrice: numberOrNull(body.minimumPrice, currentCommercial.minimumPrice ?? null),
    minimumMarginPercent: numberOrNull(body.minimumMarginPercent, currentCommercial.minimumMarginPercent ?? null),
    discountPolicy: (body.discountPolicy ?? currentCommercial.discountPolicy ?? 'inherit').toString(),
    maximumDiscountPercent: numberOrNull(body.maximumDiscountPercent, currentCommercial.maximumDiscountPercent ?? null),
    maximumDiscountAmount: numberOrNull(body.maximumDiscountAmount, currentCommercial.maximumDiscountAmount ?? null),
    requiresAuthorization: body.requiresAuthorization === undefined
      ? Boolean(currentCommercial.requiresAuthorization)
      : (body.requiresAuthorization === true || body.requiresAuthorization === 'true')
  };

  return {
    name: (body.erpName ?? body.name ?? current.name ?? '').toString().trim(),
    // Espelhos legados preservam os serviços atuais enquanto o cadastro mestre evolui.
    sku: (body.sku ?? current.erp?.sku ?? current.sku ?? '').toString().trim(),
    code: (body.internalCode ?? current.erp?.internalCode ?? current.code ?? '').toString().trim(),
    barcode: (body.barcode ?? current.erp?.barcode ?? current.barcode ?? '').toString().trim(),
    brand: (body.brand ?? current.erp?.brand ?? current.brand ?? '').toString().trim(),
    slug: gerarSlug(body.slug || current.slug || body.name || current.name || ''),
    price: priceValue,
    commercial,
    stock: finalStock,
    inventory: defaultInventoryPolicy(current, body),
    image: (body.image || current.image || '').trim(),
    gallery: galleryFromBody(body.gallery, current.gallery),
    category: (body.siteCategory ?? body.category ?? current.category ?? '').toString().trim(),
    subcategory: (body.siteSubcategory ?? body.subcategory ?? body.subcategoria ?? current.subcategory ?? current.subcategoria ?? '').toString().trim(),
    tags: tagsFromBody(body.tags, current.tags),
    relatedManualIds: idListFromBody(body.relatedManualIds, current.relatedManualIds),
    crossSellIds: idListFromBody(body.crossSellIds, current.crossSellIds),
    showPrice: body.showPrice === true || body.showPrice === 'true',
    featured: body.featured === true || body.featured === 'true',
    // Compatibilidade do site público: `active` continua representando o canal LV.
    // O ERP passa a usar `erp.active`, sem alterar o formato esperado pelo publicador atual.
    active: booleanFromBody(body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)),
    erp: {
      ...(current.erp && typeof current.erp === 'object' ? current.erp : {}),
      sku: (body.sku ?? current.erp?.sku ?? current.sku ?? '').toString().trim(),
      internalCode: (body.internalCode ?? current.erp?.internalCode ?? '').toString().trim(),
      supplierCode: (body.supplierCode ?? current.erp?.supplierCode ?? '').toString().trim(),
      barcode: (body.barcode ?? current.erp?.barcode ?? current.barcode ?? '').toString().trim(),
      brand: (body.brand ?? current.erp?.brand ?? current.brand ?? '').toString().trim(),
      unit: (body.unit ?? current.erp?.unit ?? 'UN').toString().trim() || 'UN',
      category: (body.erpCategory ?? current.erp?.category ?? '').toString().trim(),
      subcategory: (body.erpSubcategory ?? current.erp?.subcategory ?? '').toString().trim(),
      mainSupplierId: (body.mainSupplierId ?? current.erp?.mainSupplierId ?? '').toString().trim(),
      preferredSupplierId: (body.preferredSupplierId ?? current.erp?.preferredSupplierId ?? '').toString().trim(),
      active: booleanFromBody(body.erpActive, productErpActive(current))
    },
    virtualStore: {
      ...(current.virtualStore && typeof current.virtualStore === 'object' ? current.virtualStore : {}),
      name: (body.lvName ?? current.virtualStore?.name ?? body.erpName ?? body.name ?? current.name ?? '').toString().trim(),
      price: numberOrNull(body.lvPrice, current.virtualStore?.price ?? current.price ?? null),
      active: booleanFromBody(body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)),
      seoTitle: (body.seoTitle ?? current.virtualStore?.seoTitle ?? '').toString().trim(),
      seoDescription: (body.seoDescription ?? current.virtualStore?.seoDescription ?? '').toString().trim(),
      channels: {
        ...(current.virtualStore?.channels && typeof current.virtualStore.channels === 'object' ? current.virtualStore.channels : {}),
        lojaVirtual: { enabled: booleanFromBody(body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)) },
        mercadoLivre: { enabled: false },
        shopee: { enabled: false },
        amazon: { enabled: false },
        magalu: { enabled: false }
      }
    },
    detailsEnabled: body.detailsEnabled === true || body.detailsEnabled === 'true',
    showVariationsOnCard: body.showVariationsOnCard === true || body.showVariationsOnCard === 'true',
    descriptionShort: (body.descriptionShort ?? current.descriptionShort ?? '').toString().trim(),
    descriptionLong: (body.descriptionLong ?? current.descriptionLong ?? '').toString().trim(),

    // Estoque ERP: preserva a identidade existente e aplica os campos
    // enviados pelo cadastro/modal (controle, mínimo, negativo e site).
    inventory: defaultInventoryPolicy(current, body),

    variations: Object.assign(
      variations,
      variationsToText(variations)
    )
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadDir = path.join(P(req.app).SITE_DIR, 'images', 'produtos');
    ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    cb(null, `${Date.now()}-${base || 'foto'}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: 8 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas.'));
    }
    cb(null, true);
  }
});

router.post('/upload-gallery', upload.array('galleryFiles', 4), (req, res) => {
  const files = (req.files || []).map(file => `images/produtos/${file.filename}`);

  return res.json({
    success: true,
    files
  });
});

router.get('/', (req, res) => {
  const contentDir = P(req.app).CONTENT_DIR;
  const file = path.join(contentDir, 'products.json');
  const data = readJson(file);

  const catsFile = path.join(contentDir, 'categories.json');
  const cats = readJson(catsFile);
  const subcatsFile = path.join(contentDir, 'subcategories.json');
  const subcats = readJson(subcatsFile);

  const imagesDir = path.join(P(req.app).SITE_DIR, 'images');
  const imagens = getAllImages(imagesDir);

  let flash = null;
  if (req.query.saved === 'produto') flash = '✅ Produto salvo com sucesso.';
  if (req.query.saved === 'duplicate') flash = '📄 Produto duplicado com sucesso. Edite o novo produto criado como cópia.';
  if (req.query.saved === 'all') flash = '✅ Alterações salvas com sucesso.';
  if (req.query.saved === 'bulk') {
    const updated = Math.max(0, Number(req.query.updated) || 0);
    const skipped = Math.max(0, Number(req.query.skipped) || 0);
    const errors = Math.max(0, Number(req.query.errors) || 0);
    flash = `✅ Operações em lote concluídas: ${updated} produto(s) alterado(s)` +
      (skipped ? ` · ${skipped} sem mudança` : '') +
      (errors ? ` · ⚠️ ${errors} com erro` : '') + '.';
  }
  if (req.query.saved === 'details_on') flash = '✅ Detalhes ativados nos produtos selecionados.';
  if (req.query.saved === 'details_off') flash = '✅ Detalhes desativados nos produtos selecionados.';
  if (req.query.deleted === '1') flash = '🗑️ Produto excluído com sucesso.';

  const invService = inventoryService(req.app);
  (data.items || []).forEach(item => {
    ensureInventoryIdentity(item, item);
    if (item.inventory?.stockControlled && item.inventory?.itemId) {
      item.inventoryBalance = invService.consultarSaldo({ inventoryItemId: item.inventory.itemId });
      item.stock = item.inventoryBalance.physicalQuantity;
    }
  });

  res.render('produtos', {
    items: data.items || [],
    categorias: cats.items || [],
    subcategorias: subcats.items || [],
    imagens,
    origemErp: req.query.origem === 'erp',
    flash
  });
});


router.post('/ai-fill', async (req, res) => {
  const query = String(req.body?.query || '').trim();

  try {
    if (!query) {
      return res.status(400).json({ success: false, message: 'Digite o nome/modelo do produto para a IA preencher.' });
    }

    const categorias = loadCategories(req.app);
    const draft = normalizeAiProductDraft(
      await callGeminiJson(buildAiProductDraftPrompt({ query, categories: categorias })),
      categorias
    );

    if (!draft.name) {
      draft.name = query;
      draft.slug = gerarSlug(query);
    }

    return res.json({ success: true, draft });
  } catch (error) {
    console.warn('⚠️ Cadastro IA usou rascunho local:', error.message || error);

    // Não deixa o painel travado se o Gemini oscilar ou se o modelo do .env falhar.
    // Preenche um rascunho básico para o usuário seguir trabalhando e mostra aviso no painel.
    const categorias = loadCategories(req.app);
    return res.json({
      success: true,
      warning: friendlyGeminiError(error),
      draft: buildLocalProductDraft(query, categorias)
    });
  }
});

router.post('/add', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const categorias = loadCategories(req.app);
  const novo = productFromBody(req.body);
  novo.id = Date.now();
  novo.category = normalizeCategoryValue(novo.category, categorias);
  novo.subcategory = normalizeSubcategoryValue(novo.subcategory, novo.category, categorias, loadSubcategories(req.app));

  if (!novo.name) {
    return res.redirect('/produtos?error=name');
  }

  novo.slug = slugUnico(
    gerarSlug(req.body.slug || novo.slug || novo.name),
    data.items,
    novo.id
  );

  ensureInventoryIdentity(novo);
  data.items.push(novo);

  try {
    syncInventoryFromProduct(req, novo, { initial: true });
  } catch (error) {
    console.error('⚠️ Falha ao inicializar estoque do produto:', error);
    return res.redirect('/produtos?error=inventory');
  }

  writeJson(file, data);
  console.log(`✅ Produto "${novo.name}" adicionado com slug "${novo.slug}".`);
  res.redirect('/produtos?saved=produto');
});

router.post('/update', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const id = Number(req.body.id);
  const item = data.items.find(p => Number(p.id) === id);

  if (!item) {
    if (wantsJson(req)) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    return res.redirect('/produtos?error=not_found');
  }

  const categorias = loadCategories(req.app);
  const previousItem = JSON.parse(JSON.stringify(item));
  Object.assign(item, productFromBody(req.body, item));

  // Persistência explícita dos status independentes. Essa atribuição final evita
  // que campos legados ou valores falsos sejam substituídos por defaults durante
  // a atualização completa do produto.
  if (req.body.erpActive !== undefined) {
    item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
    item.erp.active = booleanFromBody(req.body.erpActive, productErpActive(previousItem));
  }

  if (req.body.lvActive !== undefined || req.body.active !== undefined || req.body.publishSite !== undefined) {
    const submittedLvStatus = req.body.lvActive ?? req.body.active ?? req.body.publishSite;
    const lvActive = booleanFromBody(submittedLvStatus, productLvActive(previousItem));
    item.active = lvActive; // compatibilidade com o publicador atual
    item.virtualStore = item.virtualStore && typeof item.virtualStore === 'object' ? item.virtualStore : {};
    item.virtualStore.active = lvActive;
    item.virtualStore.channels = item.virtualStore.channels && typeof item.virtualStore.channels === 'object'
      ? item.virtualStore.channels
      : {};
    item.virtualStore.channels.lojaVirtual = {
      ...(item.virtualStore.channels.lojaVirtual && typeof item.virtualStore.channels.lojaVirtual === 'object'
        ? item.virtualStore.channels.lojaVirtual
        : {}),
      enabled: lvActive
    };
  }

  ensureInventoryIdentity(item, previousItem);
  item.category = normalizeCategoryValue(item.category, categorias);
  item.subcategory = normalizeSubcategoryValue(item.subcategory, item.category, categorias, loadSubcategories(req.app));

  item.slug = slugUnico(
    gerarSlug(req.body.slug || item.slug || item.name),
    data.items,
    item.id
  );

  try {
    const inventoryResult = syncInventoryFromProduct(req, item);
    if (inventoryResult?.productBalance) item.stock = inventoryResult.productBalance.physicalQuantity;
  } catch (error) {
    console.error('⚠️ Falha ao ajustar estoque:', error);
    if (wantsJson(req)) return res.status(400).json({ success: false, message: error.message || 'Erro ao ajustar estoque.' });
    return res.redirect('/produtos?error=inventory');
  }

  writeJson(file, data);
  console.log(`✏️ Produto atualizado: ${item.name || id} | slug: ${item.slug}`);

  if (wantsJson(req)) {
    return res.json({ success: true, message: '✅ Produto salvo com sucesso.', item });
  }

  res.redirect('/produtos?saved=produto');
});


// Atualização dedicada dos canais. Mantém a persistência de ERP e Loja Virtual
// independente do salvamento completo do cadastro e evita que campos legados
// restaurem `false` para `true` durante a atualização da linha.
router.post('/update-channel-status', (req, res) => {
  try {
    const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
    const data = readJson(file);
    data.items = Array.isArray(data.items) ? data.items : [];

    const submittedId = String(req.body.id ?? '').trim();
    const item = data.items.find(product => String(product.id) === submittedId);

    if (!item) {
      return res.status(404).json({ success: false, message: `Produto ${submittedId || '(sem ID)'} não encontrado.` });
    }

    const erpActive = booleanFromBody(req.body.erpActive, productErpActive(item));
    const lvActive = booleanFromBody(req.body.lvActive, productLvActive(item));

    item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
    item.erp.active = erpActive;
    item.active = lvActive;
    item.virtualStore = item.virtualStore && typeof item.virtualStore === 'object' ? item.virtualStore : {};
    item.virtualStore.active = lvActive;
    item.virtualStore.channels = item.virtualStore.channels && typeof item.virtualStore.channels === 'object'
      ? item.virtualStore.channels
      : {};
    item.virtualStore.channels.lojaVirtual = {
      ...(item.virtualStore.channels.lojaVirtual && typeof item.virtualStore.channels.lojaVirtual === 'object'
        ? item.virtualStore.channels.lojaVirtual
        : {}),
      enabled: lvActive
    };

    backupProductsJson(file);
    writeJson(file, data);

    return res.json({
      success: true,
      message: 'Status ERP e Loja Virtual salvos.',
      item: {
        id: item.id,
        erp: { active: item.erp.active },
        active: item.active,
        virtualStore: {
          active: item.virtualStore.active,
          channels: { lojaVirtual: { enabled: item.virtualStore.channels.lojaVirtual.enabled } }
        }
      }
    });
  } catch (error) {
    console.error('❌ Erro ao salvar status ERP/LV:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Erro interno ao gravar os status ERP/LV.'
    });
  }
});

router.post('/update-all', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const categorias = loadCategories(req.app);

  const ids = Array.isArray(req.body.id)
    ? req.body.id
    : req.body.id
      ? [req.body.id]
      : [];

  ids.forEach((rawId, index) => {
    const id = Number(rawId);
    const item = data.items.find(p => Number(p.id) === id);
    if (!item) return;

    const getField = (field) => {
      const value = req.body[field];
      return Array.isArray(value) ? value[index] : value;
    };

    const updated = productFromBody({
      name: getField('name'),
      erpName: getField('name'),
      sku: getField('sku'),
      internalCode: getField('internalCode'),
      supplierCode: getField('supplierCode'),
      barcode: getField('barcode'),
      brand: getField('brand'),
      unit: getField('unit'),
      erpCategory: getField('erpCategory'),
      erpSubcategory: getField('erpSubcategory'),
      erpActive: getField('erpActive'),
      lvName: getField('lvName'),
      lvPrice: getField('lvPrice'),
      seoTitle: getField('seoTitle'),
      seoDescription: getField('seoDescription'),
      slug: getField('slug'),
      price: getField('price'),
      costPrice: getField('costPrice'),
      cashPrice: getField('cashPrice'),
      installmentPrice: getField('installmentPrice'),
      minimumPrice: getField('minimumPrice'),
      minimumMarginPercent: getField('minimumMarginPercent'),
      discountPolicy: getField('discountPolicy'),
      maximumDiscountPercent: getField('maximumDiscountPercent'),
      maximumDiscountAmount: getField('maximumDiscountAmount'),
      requiresAuthorization: getField('requiresAuthorization'),
      stock: getField('stock'),
      stockControlled: getField('stockControlled'),
      allowNegative: getField('allowNegative'),
      minimumQuantity: getField('minimumQuantity'),
      inventorySiteMode: getField('inventorySiteMode'),
      siteLimit: getField('siteLimit'),
      physicalSafety: getField('physicalSafety'),
      image: getField('image'),
      gallery: getField('gallery'),
      category: getField('category'),
      subcategory: getField('subcategory'),
      showPrice: getField('showPrice'),
      featured: getField('featured'),
      lvActive: getField('lvActive') ?? getField('active'),
      active: getField('lvActive') ?? getField('active'),
      detailsEnabled: getField('detailsEnabled'),
      showVariationsOnCard: getField('showVariationsOnCard'),
      descriptionShort: getField('descriptionShort'),
      descriptionLong: getField('descriptionLong'),
      variationsEnabled: getField('variationsEnabled'),
      variationColors: getField('variationColors'),
      variationStorage: getField('variationStorage'),
      variationRam: getField('variationRam'),
      variationCondition: getField('variationCondition'),
      variationLabels: getField('variationLabels'),
      variationCombinations: getField('variationCombinations')
    }, item);

    if (!updated.name) updated.name = item.name;

    const previousItem = JSON.parse(JSON.stringify(item));
    Object.assign(item, updated);
    ensureInventoryIdentity(item, previousItem);
    syncInventoryFromProduct(req, item);
    item.category = normalizeCategoryValue(item.category, categorias);
  item.subcategory = normalizeSubcategoryValue(item.subcategory, item.category, categorias, loadSubcategories(req.app));

    item.slug = slugUnico(
      gerarSlug(getField('slug') || item.slug || item.name),
      data.items,
      item.id
    );
  });

  writeJson(file, data);
  console.log(`💾 Alterações em massa salvas: ${ids.length} produto(s).`);
  res.redirect('/produtos?saved=all');
});

router.post('/bulk-actions', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const ids = Array.isArray(req.body.selectedIds)
    ? req.body.selectedIds
    : req.body.selectedIds
      ? [req.body.selectedIds]
      : [];

  const selectedIds = new Set(ids.map(Number).filter(Number.isFinite));
  if (!selectedIds.size) {
    return res.redirect('/produtos?error=bulk_no_selection');
  }

  const enabledActions = new Set(
    Array.isArray(req.body.enabledActions)
      ? req.body.enabledActions
      : req.body.enabledActions
        ? [req.body.enabledActions]
        : []
  );

  if (!enabledActions.size) {
    return res.redirect('/produtos?error=bulk_no_action');
  }

  const categorias = loadCategories(req.app);
  const subcategorias = loadSubcategories(req.app);
  const hasCategory = enabledActions.has('category');
  const hasSubcategory = enabledActions.has('subcategory');
  const hasStockControlled = enabledActions.has('stockControlled');
  const hasMinimumQuantity = enabledActions.has('minimumQuantity');
  const hasErpActive = enabledActions.has('erpActive');
  const hasLvActive = enabledActions.has('lvActive');

  const requestedCategory = hasCategory
    ? normalizeCategoryValue((req.body.bulkCategory ?? '').toString().trim(), categorias)
    : null;

  const requestedSubcategoryRaw = (req.body.bulkSubcategory ?? '').toString().trim();
  const requestedMinimumQuantity = hasMinimumQuantity
    ? Math.max(0, Math.floor(Number(req.body.bulkMinimumQuantity) || 0))
    : null;
  const booleanValue = name => String(req.body[name] ?? '') === 'true';
  const requestedStockControlled = hasStockControlled
    ? booleanValue('bulkStockControlled')
    : null;

  let backupFile = null;
  try {
    backupFile = backupProductsJson(file);
  } catch (error) {
    console.error('❌ Falha ao criar backup antes das operações em lote:', error);
    return res.status(500).send('Não foi possível criar o backup de segurança do products.json. Nenhuma alteração foi aplicada.');
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const changedFields = new Set();
  const service = inventoryService(req.app);

  data.items.forEach(item => {
    if (!selectedIds.has(Number(item.id))) return;

    const before = JSON.stringify(item);

    try {
      ensureInventoryIdentity(item, item);
      const finalCategory = hasCategory ? requestedCategory : normalizeCategoryValue(item.category, categorias);

      if (hasCategory) {
        item.category = finalCategory;
        changedFields.add('categoria');
      }

      if (hasSubcategory) {
        item.subcategory = normalizeSubcategoryValue(
          requestedSubcategoryRaw,
          finalCategory,
          categorias,
          subcategorias
        );
        changedFields.add('subcategoria');
      } else if (hasCategory) {
        item.subcategory = normalizeSubcategoryValue(
          item.subcategory ?? item.subcategoria ?? '',
          finalCategory,
          categorias,
          subcategorias
        );
      }

      if (hasErpActive) {
        item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
        item.erp.active = booleanValue('bulkErpActive');
        changedFields.add('status ERP');
      }
      if (hasLvActive || enabledActions.has('active')) {
        const lvActive = hasLvActive ? booleanValue('bulkLvActive') : booleanValue('bulkActive');
        item.active = lvActive;
        item.virtualStore = item.virtualStore && typeof item.virtualStore === 'object' ? item.virtualStore : {};
        item.virtualStore.active = lvActive;
        item.virtualStore.channels = item.virtualStore.channels && typeof item.virtualStore.channels === 'object' ? item.virtualStore.channels : {};
        item.virtualStore.channels.lojaVirtual = { enabled: lvActive };
        changedFields.add('status LV');
      }
      if (enabledActions.has('showPrice')) {
        item.showPrice = booleanValue('bulkShowPrice');
        changedFields.add('preço');
      }
      if (enabledActions.has('detailsEnabled')) {
        item.detailsEnabled = booleanValue('bulkDetailsEnabled');
        changedFields.add('detalhes');
      }
      if (enabledActions.has('featured')) {
        item.featured = booleanValue('bulkFeatured');
        changedFields.add('vitrine');
      }

      if (hasStockControlled) {
        item.inventory.stockControlled = requestedStockControlled;
        changedFields.add('controle de estoque');
      }

      if (hasMinimumQuantity) {
        item.inventory.minimumQuantity = requestedMinimumQuantity;
        changedFields.add('estoque mínimo');
      }

      ensureInventoryIdentity(item, item);

      if (item.inventory?.stockControlled === true && item.inventory?.itemId && (hasStockControlled || hasMinimumQuantity)) {
        service.configurarItem({
          inventoryItemId: item.inventory.itemId,
          minimumQuantity: Math.max(0, Number(item.inventory.minimumQuantity) || 0)
        });

        if (hasStockControlled && requestedStockControlled === true) {
          syncInventoryFromProduct(req, item, {
            reason: 'Ativação do controle de estoque em lote',
            initial: false
          });
        }
      }

      if (JSON.stringify(item) === before) skipped++;
      else updated++;
    } catch (error) {
      errors++;
      console.error(`⚠️ Falha na operação em lote do produto ${item.name || item.id}:`, error);
    }
  });

  writeJson(file, data);
  console.log(
    `⚡ Operações em lote: ${updated} alterado(s), ${skipped} sem mudança, ${errors} erro(s) | ` +
    `${Array.from(changedFields).join(', ')} | backup: ${backupFile || 'não criado'}`
  );

  const params = new URLSearchParams({
    saved: 'bulk',
    updated: String(updated),
    skipped: String(skipped),
    errors: String(errors)
  });
  res.redirect(`/produtos?${params.toString()}`);
});



router.post('/duplicate', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const id = Number(req.body.id);
  const original = data.items.find(p => Number(p.id) === id);

  if (!original) {
    if (wantsJson(req)) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    return res.redirect('/produtos?error=not_found');
  }

  const novoId = Date.now();
  const nomeCopia = `${original.name || 'Produto'} (Cópia)`;

  const copia = JSON.parse(JSON.stringify(original));
  copia.id = novoId;
  copia.name = nomeCopia;
  copia.slug = slugUnico(
    gerarSlug(`${original.slug || original.name || 'produto'} copia`),
    data.items,
    novoId
  );

  // Quando o código interno QLT existir no futuro, ele não deve ser reaproveitado na cópia.
  delete copia.code;
  delete copia.internalCode;
  delete copia.codigo;
  delete copia.codigoInterno;
  delete copia.qltCode;

  data.items.push(copia);
  writeJson(file, data);

  console.log(`📄 Produto duplicado: ${original.name || id} -> ${copia.name} | slug: ${copia.slug}`);

  if (wantsJson(req)) {
    return res.json({ success: true, message: '📄 Produto duplicado com sucesso.', item: copia });
  }

  res.redirect('/produtos?saved=duplicate');
});

router.post('/del', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const id = Number(req.body.id);

  data.items = (data.items || []).filter(p => Number(p.id) !== id);
  writeJson(file, data);

  console.log(`🗑️ Produto ${id} excluído.`);
  res.redirect('/produtos?deleted=1');
});

export default router;