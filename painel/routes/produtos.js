import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import InventoryService from '../services/inventory-service.js';
import ErpCategoryService from '../services/erp-category-service.js';
import Wm10ProductImportService from '../services/wm10-product-import-service.js';
import { matchesSearchText, searchRelevanceScore } from '../utils/search.js';

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

const productsJsonCache = new Map();
function readJson(p) {
  try {
    const stat=fs.statSync(p),cached=productsJsonCache.get(p);
    if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
    const data=JSON.parse(fs.readFileSync(p,'utf-8'));
    productsJsonCache.set(p,{mtimeMs:stat.mtimeMs,size:stat.size,data});
    return data;
  } catch (e) {
    return { items: [] };
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  try{const stat=fs.statSync(p);productsJsonCache.set(p,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){productsJsonCache.delete(p);}
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

let imagesCache = { key:'', at:0, items:[] };
function getAllImagesCached(baseDir, ttlMs = 30000) {
  const key = path.resolve(baseDir || '');
  const now = Date.now();
  if (imagesCache.key === key && (now - imagesCache.at) < ttlMs) return imagesCache.items;
  const items = getAllImages(baseDir);
  imagesCache = { key, at:now, items };
  return items;
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


function nextInternalProductCode(items = []) {
  let max = 0;
  for (const item of items || []) {
    const raw = String(item?.erp?.internalCode || item?.code || '').trim();
    const match = raw.match(/^PRD-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]) || 0);
  }
  return `PRD-${max + 1}`;
}

function ensureInternalProductCodes(items = []) {
  let changed = false;
  let max = 0;

  // Primeiro descobre o maior número existente. Depois percorre na ordem do
  // cadastro: o primeiro dono de um código válido o mantém; duplicados recebem
  // um código novo. O algoritmo anterior não distinguia corretamente duas linhas
  // com o mesmo erp.internalCode.
  for (const item of items || []) {
    const raw = String(item?.erp?.internalCode || item?.code || '').trim();
    const match = raw.match(/^PRD-(\d+)$/i);
    if (match) max = Math.max(max, Number(match[1]) || 0);
  }

  const used = new Set();
  for (const item of items || []) {
    item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
    let raw = String(item.erp.internalCode || item.code || '').trim().toUpperCase();
    const valid = /^PRD-\d+$/i.test(raw);

    if (!valid || used.has(raw)) {
      do { max += 1; raw = `PRD-${max}`; } while (used.has(raw));
      changed = true;
    }

    used.add(raw);
    if (item.erp.internalCode !== raw || item.code !== raw) changed = true;
    item.erp.internalCode = raw;
    item.code = raw;
  }
  return changed;
}

function ensureUniqueInventoryIdentities(items = []) {
  let changed = false;
  const used = new Set();

  const uniqueId = base => {
    let candidate = String(base || '').trim();
    if (!candidate || used.has(candidate)) {
      const prefix = candidate.startsWith('VAR-') ? 'VAR' : 'PRD';
      let seed = Date.now();
      do { candidate = `${prefix}-${seed++}`; } while (used.has(candidate));
    }
    used.add(candidate);
    return candidate;
  };

  for (const product of items || []) {
    if (!product || typeof product !== 'object') continue;
    const isService = String(product?.erp?.type || '').toLowerCase() === 'service';
    if (isService) continue;

    product.inventory = product.inventory && typeof product.inventory === 'object' ? product.inventory : {};
    const originalParentId = String(product.inventory.itemId || '').trim();
    const preferredParentId = originalParentId || `PRD-${product.id || Date.now()}`;
    const parentDuplicate = originalParentId && used.has(originalParentId);
    const nextParentId = uniqueId(preferredParentId);
    if (nextParentId !== originalParentId) {
      product.inventory.itemId = nextParentId;
      // Quando a identidade foi duplicada, o saldo histórico pertence ao primeiro
      // cadastro. A cópia reparada começa em zero para não duplicar quantidade.
      if (parentDuplicate) product.stock = 0;
      changed = true;
    }

    if (Array.isArray(product?.variations?.combinations)) {
      product.variations.combinations = product.variations.combinations.map((combo, index) => {
        const originalVariationId = String(combo?.inventoryItemId || '').trim();
        const preferredVariationId = originalVariationId || `VAR-${product.id || Date.now()}-${index + 1}`;
        const variationDuplicate = originalVariationId && used.has(originalVariationId);
        const nextVariationId = uniqueId(preferredVariationId);
        if (nextVariationId === originalVariationId) return combo;
        changed = true;
        return {
          ...combo,
          inventoryItemId: nextVariationId,
          ...(variationDuplicate ? { stock: 0 } : {})
        };
      });
      if (product.variations.combinations.length) {
        product.stock = variationStockTotal(product);
      }
    }
  }

  return changed;
}

function validErpCategorySlug(value, categories = []) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = gerarSlug(raw);
  const found = (categories || []).find(category => {
    const id = String(category?.id ?? '').trim();
    const slug = String(category?.slug ?? '').trim();
    const name = String(category?.name ?? '').trim();
    return raw === id || raw === slug || raw === name || normalized === gerarSlug(slug) || normalized === gerarSlug(name);
  });

  return found ? String(found.slug || gerarSlug(found.name) || '').trim() : '';
}


function erpCategoryService(app) {
  return new ErpCategoryService({ panelDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), contentDir: P(app).CONTENT_DIR });
}

function wm10ProductImportService(app) {
  if (app.locals.wm10ProductImportService) return app.locals.wm10ProductImportService;
  const dataDir = path.join(PANEL_DIR, 'data', 'erp', 'products');
  const productsFile = path.join(P(app).CONTENT_DIR, 'products.json');
  const backupDir = path.resolve(PANEL_DIR, '..', 'Backup', 'Painel', 'products', 'wm10');
  app.locals.wm10ProductImportService = new Wm10ProductImportService({ dataDir, productsFile, backupDir, inventoryService: inventoryService(app) });
  console.log('🔄 Assistente de Migração WM10 · Produtos preparado.');
  return app.locals.wm10ProductImportService;
}
function loadErpCategories(app) {
  try { return erpCategoryService(app).tree({ includeInactive: true }); } catch (_) { return []; }
}
function validErpCategory(value, categories = []) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = gerarSlug(raw);
  return (categories || []).find(category => category.id === raw || gerarSlug(category.code || '') === normalized || gerarSlug(category.name || '') === normalized) || null;
}
function firstActiveServiceCategory(app) {
  return loadErpCategories(app).find(category => category?.type === 'service' && category?.active !== false) || null;
}

function serviceCategoryForProduct(product = {}, categories = []) {
  const value = product?.erp?.categoryId || product?.erp?.category || '';
  const category = validErpCategory(value, categories);
  if (category?.type === 'service') return category;
  if (String(product?.erp?.type || '').trim().toLowerCase() === 'service') return { type: 'service' };
  return null;
}

function cleanupLegacyServiceVariations(items = [], categories = []) {
  let changed = false;
  for (const item of items || []) {
    if (!serviceCategoryForProduct(item, categories)) continue;

    item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
    if (item.erp.type !== 'service') {
      item.erp.type = 'service';
      changed = true;
    }

    const hasLegacyVariations = item?.variations?.enabled === true
      || (Array.isArray(item?.variations?.combinations) && item.variations.combinations.length > 0)
      || ['colors', 'storage', 'ram', 'condition'].some(key => Array.isArray(item?.variations?.[key]) && item.variations[key].length > 0);

    if (hasLegacyVariations) {
      item.variations = emptyVariations();
      changed = true;
    }

    if (item.stock !== null) {
      item.stock = null;
      changed = true;
    }

    if (item?.inventory?.stockControlled !== false) {
      item.inventory = defaultInventoryPolicy(item, {
        stockControlled: 'false',
        allowNegative: 'false',
        inventorySiteMode: 'disabled',
        minimumQuantity: 0,
        siteLimit: 0,
        physicalSafety: 0
      });
      changed = true;
    }
  }
  return changed;
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
      stock: parts[5] !== undefined && parts[5] !== '' ? Number(parts[5]) : null,
      erpPrice: parts[6] !== undefined && parts[6] !== '' && Number.isFinite(Number(parts[6])) ? Number(parts[6]) : null
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

function reconcileVariationCombinations({ colors = [], storage = [], ram = [], condition = [], combinations = [] } = {}) {
  const dimensions = [
    ['color', colors.map(item => item?.name).filter(Boolean)],
    ['storage', storage],
    ['ram', ram],
    ['condition', condition]
  ].filter(([, values]) => Array.isArray(values) && values.length);

  if (!dimensions.length) return [];

  const allowed = Object.fromEntries(dimensions.map(([field, values]) => [field, new Set(values.map(String))]));
  const fields = ['color', 'storage', 'ram', 'condition'];
  const clean = [];
  const seen = new Set();

  const keyOf = combo => fields.map(field => String(combo?.[field] || '').trim()).join('|');
  const isValid = combo => fields.every(field => {
    const value = String(combo?.[field] || '').trim();
    if (!value) return true;
    return allowed[field]?.has(value) === true;
  });
  const pushUnique = combo => {
    const key = keyOf(combo);
    if (!key.replace(/\|/g, '')) return;
    if (seen.has(key)) return;
    seen.add(key);
    clean.push(combo);
  };

  (Array.isArray(combinations) ? combinations : []).filter(isValid).forEach(pushUnique);

  const generateForOrphan = (field, value) => {
    const otherDimensions = dimensions.filter(([name]) => name !== field);
    let partials = [{ color:'', storage:'', ram:'', condition:'', image:'', stock:null, erpPrice:null }];
    otherDimensions.forEach(([otherField, values]) => {
      partials = partials.flatMap(base => values.map(option => ({ ...base, [otherField]:option })));
    });
    if (!otherDimensions.length) partials = [{ color:'', storage:'', ram:'', condition:'', image:'', stock:null, erpPrice:null }];
    partials.forEach(base => pushUnique({ ...base, [field]:value }));
  };

  dimensions.forEach(([field, values]) => {
    values.forEach(value => {
      const represented = clean.some(combo => String(combo?.[field] || '').trim() === String(value));
      if (!represented) generateForOrphan(field, value);
    });
  });

  return clean;
}

function reconcileStoredVariationGrids(items = []) {
  let changed = false;
  (Array.isArray(items) ? items : []).forEach(product => {
    const variations = product?.variations;
    if (!variations || variations.enabled !== true) return;
    const previous = {
      inventory: product.inventory ? { ...product.inventory } : {},
      variations: {
        ...variations,
        combinations: Array.isArray(variations.combinations) ? variations.combinations.map(combo => ({ ...combo })) : []
      }
    };
    const next = reconcileVariationCombinations({
      colors: Array.isArray(variations.colors) ? variations.colors : [],
      storage: Array.isArray(variations.storage) ? variations.storage : [],
      ram: Array.isArray(variations.ram) ? variations.ram : [],
      condition: Array.isArray(variations.condition) ? variations.condition : [],
      combinations: Array.isArray(variations.combinations) ? variations.combinations : []
    });
    const beforeKeys = previous.variations.combinations.map(combinationKey).join('||');
    const afterKeys = next.map(combinationKey).join('||');
    if (beforeKeys === afterKeys && previous.variations.combinations.length === next.length) return;
    product.variations.combinations = next;
    ensureInventoryIdentity(product, previous);
    Object.assign(product.variations, variationsToText(product.variations));
    product.stock = variationStockTotal(product);
    changed = true;
  });
  return changed;
}

function variationsFromBody(body, current = {}) {
  const currentVariations = current.variations || {};
  const enabledRaw = body.variationsEnabled ?? currentVariations.enabled ?? false;
  const labels = parseVariationLabels(body.variationLabels ?? currentVariations.labelsText ?? currentVariations.labels ?? {});

  const colors = parseVariationColors(body.variationColors ?? currentVariations.colorsText ?? '');
  const storage = linesFromBody(body.variationStorage ?? currentVariations.storageText ?? '');
  const ram = linesFromBody(body.variationRam ?? currentVariations.ramText ?? '');
  const condition = linesFromBody(body.variationCondition ?? currentVariations.conditionText ?? '');
  let combinations = parseVariationCombinations(body.variationCombinations ?? currentVariations.combinationsText ?? '');

  // Mantém a grade de estoque coerente com as opções cadastradas.
  // Se uma nova opção foi incluída em um produto que já possuía variações,
  // cria somente as combinações necessárias para essa opção, preservando
  // estoque/preço das combinações existentes. Também remove combinações órfãs
  // quando uma opção deixa de existir.
  combinations = reconcileVariationCombinations({ colors, storage, ram, condition, combinations });

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


function emptyVariations() {
  return {
    enabled: false,
    colors: [],
    storage: [],
    ram: [],
    condition: [],
    combinations: [],
    labels: {},
    colorsText: '',
    storageText: '',
    ramText: '',
    conditionText: '',
    labelsText: '',
    combinationsText: ''
  };
}

function variationsToText(variations = {}) {
  const colors = Array.isArray(variations.colors) ? variations.colors.map(c => [c.name, c.hex, c.image].filter(Boolean).join('|')).join('\n') : '';
  const combinations = Array.isArray(variations.combinations) ? variations.combinations.map(c => [c.color, c.storage, c.ram, c.condition, c.image, c.stock, c.erpPrice].map(v => v === undefined || v === null ? '' : v).join('|').replace(/\|+$/,'')).join('\n') : '';
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

function variationCombinations(product = {}) {
  return Array.isArray(product?.variations?.combinations)
    ? product.variations.combinations.filter(combo => combo && typeof combo === 'object')
    : [];
}

function hasInventoryVariations(product = {}) {
  return variationCombinations(product).length > 0;
}

function variationStockTotal(product = {}) {
  return variationCombinations(product).reduce((sum, combo) => sum + Math.max(0, Number(combo?.stock) || 0), 0);
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

  const combinations = variationCombinations(product);
  const variationBalances = [];

  // Regra estrutural do Quality ERP:
  // - produto simples: saldo físico pertence ao item pai;
  // - produto com grade: saldo físico pertence SOMENTE às combinações.
  // O campo product.stock permanece apenas como espelho calculado para compatibilidade
  // com telas/relatórios legados; nunca é um segundo estoque editável.
  if (combinations.length) {
    // Se este cadastro já teve saldo no item pai antes de ganhar variações,
    // zera somente o saldo atual do pai (o histórico permanece intacto). Assim
    // não existe quantidade física paralela fora das combinações.
    if (policy.itemId) {
      const parentCurrent = service.consultarSaldo({ inventoryItemId: policy.itemId });
      if ((Number(parentCurrent?.physicalQuantity) || 0) !== 0) {
        service.ajustarEstoque({
          inventoryItemId: policy.itemId,
          newQuantity: 0,
          origin: 'cadastro_produtos',
          referenceType: 'product',
          referenceId: String(product.id),
          reason: 'Saldo do produto pai zerado: estoque passou a ser controlado pelas variações',
          createdBy: req.user?.name || req.user?.email || 'painel',
          allowNegative: true
        });
      }
    }

    for (const combo of combinations) {
      const balance = syncOne(combo.inventoryItemId, combo.stock, `${product.name} / ${combinationKey(combo)}`);
      variationBalances.push(balance);
      if (balance) combo.stock = balance.physicalQuantity;
    }
    const aggregatePhysical = variationBalances.reduce((sum, balance) => sum + (Number(balance?.physicalQuantity) || 0), 0);
    product.stock = aggregatePhysical;
    console.log(`📦 Estoque ERP por variações: ${product.name || product.id} | total calculado: ${aggregatePhysical}`);
    return { controlled: true, productBalance: null, variationBalances, aggregatePhysical, stockMode: 'variations' };
  }

  const productBalance = syncOne(policy.itemId, product.stock, product.name || 'Produto');
  if (productBalance) product.stock = productBalance.physicalQuantity;
  console.log(`📦 Estoque ERP sincronizado: ${product.name || product.id} | físico: ${productBalance?.physicalQuantity ?? 0}`);
  return { controlled: true, productBalance, variationBalances, aggregatePhysical: productBalance?.physicalQuantity ?? 0, stockMode: 'product' };
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
  // O modal de produto reúne várias abas em um único formulário. Quando ele informa
  // quais campos foram realmente alterados, preservamos os dados das outras abas
  // diretamente do registro atual. Isso evita que um valor vazio/desatualizado no
  // navegador apague Categoria LV, Subcategoria LV ou SEO ao salvar apenas ERP/estoque.
  const hasTouchedMetadata = Object.prototype.hasOwnProperty.call(body || {}, '__touchedFields');
  let touchedFields = new Set();
  if (hasTouchedMetadata) {
    try {
      const parsed = JSON.parse(String(body.__touchedFields || '[]'));
      touchedFields = new Set(Array.isArray(parsed) ? parsed.map(String) : []);
    } catch (_) {
      touchedFields = new Set(String(body.__touchedFields || '').split(',').map(v => v.trim()).filter(Boolean));
    }
  }
  const scopedValue = (key, submitted, fallback) => {
    if (!hasTouchedMetadata) return submitted !== undefined ? submitted : fallback;
    return touchedFields.has(key) ? (submitted !== undefined ? submitted : '') : fallback;
  };

  const submittedPrice = scopedValue('lvPrice', body.lvPrice ?? body.price, current.virtualStore?.price ?? current.price ?? null);
  const priceValue = submittedPrice !== undefined && submittedPrice !== '' && submittedPrice !== null
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
  const unifiedErpPrice = numberOrNull(body.erpPrice, currentCommercial.erpPrice ?? currentCommercial.salePrice ?? current.price ?? null);
  const commercial = {
    costPrice: numberOrNull(body.costPrice, currentCommercial.costPrice ?? null),
    erpPrice: unifiedErpPrice,
    salePrice: unifiedErpPrice,
    marketplacePrice: numberOrNull(body.marketplacePrice, currentCommercial.marketplacePrice ?? null),
    promotionalPrice: numberOrNull(body.promotionalPrice, currentCommercial.promotionalPrice ?? null),
    desiredMarginPercent: numberOrNull(body.desiredMarginPercent, currentCommercial.desiredMarginPercent ?? null),
    expectedProfit: numberOrNull(body.expectedProfit, currentCommercial.expectedProfit ?? null),
    defaultCommissionPercent: numberOrNull(body.defaultCommissionPercent, currentCommercial.defaultCommissionPercent ?? null),
    // Campos legados preservados apenas como espelho do preço ERP. Não são mais preços independentes.
    cashPrice: unifiedErpPrice,
    installmentPrice: unifiedErpPrice,
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
    code: (current.erp?.internalCode ?? current.code ?? '').toString().trim(),
    barcode: (body.barcode ?? current.erp?.barcode ?? current.barcode ?? '').toString().trim(),
    brand: (body.brand ?? current.erp?.brand ?? current.brand ?? '').toString().trim(),
    slug: gerarSlug(body.slug || current.slug || body.name || current.name || ''),
    price: priceValue,
    commercial,
    stock: finalStock,
    inventory: defaultInventoryPolicy(current, body),
    image: (body.image || current.image || '').trim(),
    gallery: galleryFromBody(body.gallery, current.gallery),
    category: scopedValue('category', body.siteCategory ?? body.category, current.category ?? '').toString().trim(),
    subcategory: scopedValue('subcategory', body.siteSubcategory ?? body.subcategory ?? body.subcategoria, current.subcategory ?? current.subcategoria ?? '').toString().trim(),
    tags: tagsFromBody(body.tags, current.tags),
    relatedManualIds: idListFromBody(body.relatedManualIds, current.relatedManualIds),
    crossSellIds: idListFromBody(body.crossSellIds, current.crossSellIds),
    showPrice: booleanFromBody(scopedValue('showPrice', body.showPrice, current.showPrice), Boolean(current.showPrice)),
    featured: booleanFromBody(scopedValue('featured', body.featured, current.featured), Boolean(current.featured)),
    // Compatibilidade do site público: `active` continua representando o canal LV.
    // O ERP passa a usar `erp.active`, sem alterar o formato esperado pelo publicador atual.
    active: booleanFromBody(scopedValue('lvActive', body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)), productLvActive(current)),
    erp: {
      ...(current.erp && typeof current.erp === 'object' ? current.erp : {}),
      sku: (body.sku ?? current.erp?.sku ?? current.sku ?? '').toString().trim(),
      internalCode: (current.erp?.internalCode ?? current.code ?? '').toString().trim(),
      supplierCode: (body.supplierCode ?? current.erp?.supplierCode ?? '').toString().trim(),
      searchAlias: (body.searchAlias ?? current.erp?.searchAlias ?? '').toString().trim(),
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
      name: scopedValue('lvName', body.lvName, current.virtualStore?.name ?? current.name ?? '').toString().trim(),
      price: numberOrNull(scopedValue('lvPrice', body.lvPrice, current.virtualStore?.price ?? current.price ?? null), current.virtualStore?.price ?? current.price ?? null),
      active: booleanFromBody(scopedValue('lvActive', body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)), productLvActive(current)),
      seoTitle: scopedValue('seoTitle', body.seoTitle, current.virtualStore?.seoTitle ?? '').toString().trim(),
      seoDescription: scopedValue('seoDescription', body.seoDescription, current.virtualStore?.seoDescription ?? '').toString().trim(),
      channels: {
        ...(current.virtualStore?.channels && typeof current.virtualStore.channels === 'object' ? current.virtualStore.channels : {}),
        lojaVirtual: { enabled: booleanFromBody(scopedValue('lvActive', body.lvActive ?? body.active ?? body.publishSite, productLvActive(current)), productLvActive(current)) },
        mercadoLivre: { enabled: false },
        shopee: { enabled: false },
        amazon: { enabled: false },
        magalu: { enabled: false }
      }
    },
    detailsEnabled: booleanFromBody(scopedValue('detailsEnabled', body.detailsEnabled, current.detailsEnabled), Boolean(current.detailsEnabled)),
    showVariationsOnCard: booleanFromBody(scopedValue('showVariationsOnCard', body.showVariationsOnCard, current.showVariationsOnCard), Boolean(current.showVariationsOnCard)),
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


// V1.7.3 - troca rápida da imagem principal diretamente pela listagem de Produtos.
router.post('/quick-main-image', upload.single('imageFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success:false, message:'Selecione uma imagem.' });
    const productId = String(req.body?.productId || '').trim();
    if (!productId) return res.status(400).json({ success:false, message:'Produto não informado.' });

    const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
    const data = readJson(file);
    data.items = Array.isArray(data.items) ? data.items : [];
    const item = data.items.find(product => String(product.id) === productId);
    if (!item) return res.status(404).json({ success:false, message:'Produto não encontrado.' });

    backupProductsJson(file);
    const image = `images/produtos/${req.file.filename}`;
    item.image = image;
    item.updatedAt = new Date().toISOString();
    writeJson(file, data);
    return res.json({ success:true, message:'Foto principal atualizada.', image, productId:item.id });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message || 'Não foi possível atualizar a foto principal.' });
  }
});

router.get('/importar-wm10', (req, res) => {
  const service = wm10ProductImportService(req.app);
  return res.render('produtos_importar_wm10', {
    wm10Settings: service.getSettings(),
    migrationProgress: service.getProgress(),
    lastReport: service.getLastReport(),
    sourceCacheInfo: service.getSourceCacheInfo(),
    refreshEstimate: service.estimateRefreshCost()
  });
});

router.post('/importar-wm10/configuracao', (req, res) => {
  try {
    const settings = wm10ProductImportService(req.app).saveSettings(req.body || {});
    return res.json({ success:true, message:'Configuração WM10 salva com segurança.', settings });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/testar', async (req, res) => {
  try {
    const result = await wm10ProductImportService(req.app).testConnection();
    return res.json({ success:true, ...result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/simular', async (req, res) => {
  try {
    const report = await wm10ProductImportService(req.app).simulate({
      useCache:req.body?.useCache !== false,
      forceRefresh:req.body?.forceRefresh === true
    });
    return res.json({ success:true, report });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/executar', async (req, res) => {
  try {
    const report = await wm10ProductImportService(req.app).importSelected({
      selectedCodes:Array.isArray(req.body?.selectedCodes) ? req.body.selectedCodes : [],
      fields:req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : {},
      itemKinds:req.body?.itemKinds && typeof req.body.itemKinds === 'object' ? req.body.itemKinds : {},
      serviceCategory:firstActiveServiceCategory(req.app),
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:`${report.imported} produto(s) importado(s).`, report });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/sincronizar', async (req, res) => {
  try {
    const report = await wm10ProductImportService(req.app).syncSelected({
      selectedCodes:Array.isArray(req.body?.selectedCodes) ? req.body.selectedCodes : [],
      fields:req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : {},
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:`${report.synced} produto(s) sincronizado(s).`, report });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/vincular', (req, res) => {
  try {
    const result = wm10ProductImportService(req.app).linkExisting({
      wm10Code:req.body?.wm10Code,
      productId:req.body?.productId,
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:'Produto WM10 vinculado ao cadastro existente.', result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/decisao', (req, res) => {
  try {
    const result = wm10ProductImportService(req.app).setDecision({
      wm10Code:req.body?.wm10Code,
      decision:String(req.body?.decision || ''),
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:result.decision === 'ignored' ? 'Produto marcado para não importar.' : 'Produto devolvido para a fila de análise.', result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/familia', (req, res) => {
  try {
    const result = wm10ProductImportService(req.app).saveFamilyDecision({
      familyId:req.body?.familyId,
      name:req.body?.name,
      parentCode:req.body?.parentCode,
      roles:req.body?.roles && typeof req.body.roles === 'object' ? req.body.roles : {},
      status:String(req.body?.status || 'approved'),
      nameEdited:req.body?.nameEdited === true,
      kind:String(req.body?.kind || 'product').toLowerCase() === 'service' ? 'service' : 'product',
      serviceCategory:String(req.body?.kind || 'product').toLowerCase() === 'service' ? firstActiveServiceCategory(req.app) : null,
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:'Família salva. Nenhum produto foi alterado ainda.', result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/familia/reabrir', (req, res) => {
  try {
    const result = wm10ProductImportService(req.app).resetFamilyDecision({ familyId:req.body?.familyId });
    return res.json({ success:true, message:'Família devolvida para sugestão.', result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});

router.post('/importar-wm10/familia/corrigir-importada', async (req, res) => {
  try {
    const result = await wm10ProductImportService(req.app).repairImportedFamily({
      familyId:req.body?.familyId,
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:`Família corrigida: ${result.name}.`, result });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});


router.post('/importar-wm10/familias/importar', async (req, res) => {
  try {
    const report = await wm10ProductImportService(req.app).importApprovedFamilies({
      familyIds:Array.isArray(req.body?.familyIds) ? req.body.familyIds : [],
      fields:req.body?.fields && typeof req.body.fields === 'object' ? req.body.fields : {},
      user:req.user?.name || req.user?.email || 'painel'
    });
    return res.json({ success:true, message:`${report.importedFamilies} família(s) importada(s).`, report });
  } catch (error) {
    return res.status(400).json({ success:false, message:error.message });
  }
});



router.get('/api/images', (req, res) => {
  try {
    const imagesDir = path.join(P(req.app).SITE_DIR, 'images');
    return res.json({ success:true, items:getAllImagesCached(imagesDir) });
  } catch (error) {
    return res.status(500).json({ success:false, message:error.message || 'Não foi possível listar as imagens.', items:[] });
  }
});

router.get('/', (req, res) => {
  const contentDir = P(req.app).CONTENT_DIR;
  const file = path.join(contentDir, 'products.json');
  const data = readJson(file);
  const workspaceNew = req.query.workspace === 'new';

  const catsFile = path.join(contentDir, 'categories.json');
  const cats = readJson(catsFile);
  const subcatsFile = path.join(contentDir, 'subcategories.json');
  const subcats = readJson(subcatsFile);
  const erpCategorias = loadErpCategories(req.app);

  const imagesDir = path.join(P(req.app).SITE_DIR, 'images');
  // A lista de imagens é carregada sob demanda pela API; não varrer o disco antes de renderizar Produtos.
  const imagens = [];

  let flash = null;
  if (req.query.saved === 'produto') flash = '✅ Produto salvo com sucesso.';
  if (req.query.saved === 'duplicate') flash = '📄 Produto duplicado com sucesso. Edite o novo produto criado como cópia.';
  if (req.query.saved === 'all') flash = '✅ Alterações salvas com sucesso.';
  if (req.query.saved === 'bulk') {
    const updated = Math.max(0, Number(req.query.updated) || 0);
    const skipped = Math.max(0, Number(req.query.skipped) || 0);
    const errors = Math.max(0, Number(req.query.errors) || 0);
    flash = `✅ ${updated} ${updated === 1 ? 'produto alterado' : 'produtos alterados'}` +
      (skipped ? ` · ${skipped} sem mudança` : '') +
      (errors ? ` · ⚠️ ${errors} com erro` : '') + '.';
  }
  if (req.query.saved === 'details_on') flash = '✅ Detalhes ativados nos produtos selecionados.';
  if (req.query.saved === 'details_off') flash = '✅ Detalhes desativados nos produtos selecionados.';
  if (req.query.deleted === '1') flash = '🗑️ Produto excluído com sucesso.';
  if (req.query.error === 'erp_category') flash = '⚠️ Selecione uma categoria do ERP antes de cadastrar o produto.';

  const cleanedLegacyServices = cleanupLegacyServiceVariations(data.items || [], erpCategorias);
  const reconciledVariationGrids = reconcileStoredVariationGrids(data.items || []);
  const ensuredInternalCodes = ensureInternalProductCodes(data.items || []);
  const ensuredInventoryIdentities = ensureUniqueInventoryIdentities(data.items || []);
  if (cleanedLegacyServices || reconciledVariationGrids || ensuredInternalCodes || ensuredInventoryIdentities) {
    backupProductsJson(file);
    writeJson(file, data);
  }

  const allItems = data.items || [];
  const listQuery = String(req.query.q || '').trim();
  const listCategory = String(req.query.categoria || '').trim();
  const listErpStatus = String(req.query.erpStatus || '').trim();
  // Ao entrar em Produtos pelo contexto da Loja Virtual, prioriza LV ativo.
  // No contexto ERP (?origem=erp) mantém todos os produtos, salvo filtro explícito.
  const hasExplicitLvStatus = Object.prototype.hasOwnProperty.call(req.query || {}, 'lvStatus');
  const listLvStatus = String(hasExplicitLvStatus ? (req.query.lvStatus || '') : (req.query.origem === 'erp' ? '' : 'true')).trim();
  const pageSize = Math.min(300, Math.max(20, Number(req.query.pageSize) || 50));

  let filteredItems = workspaceNew ? [] : allItems.filter(item => {
    if (listQuery) {
      const erp = item?.erp || {};
      const haystack = [item?.name, item?.slug, erp.internalCode, erp.sku, erp.barcode, erp.supplierCode, erp.searchAlias, erp.brand, erp.model].join(' ');
      if (!matchesSearchText(haystack, listQuery)) return false;
    }
    if (listCategory) {
      const category = String(item?.category || '');
      if (listCategory === '[vitrine]') { if (category) return false; }
      else if (category !== listCategory) return false;
    }
    if (listErpStatus) {
      const raw = item?.erp?.active !== undefined ? item.erp.active : item.active;
      const active = !['false','0','off','inativo'].includes(String(raw).toLowerCase()) && raw !== false;
      if (String(active) !== listErpStatus) return false;
    }
    if (listLvStatus) {
      const raw = item?.virtualStore?.active !== undefined ? item.virtualStore.active : item.active;
      const active = !['false','0','off','inativo'].includes(String(raw).toLowerCase()) && raw !== false;
      if (String(active) !== listLvStatus) return false;
    }
    return true;
  });

  // Em buscas textuais, resultados cujo nome/modelo realmente correspondem ao que foi
  // digitado ficam antes de coincidências encontradas apenas em SKU/código/barcode.
  // Isso evita, por exemplo, "redmi 12" trazer Redmi Note 15 no topo só porque "12"
  // existe em algum identificador técnico do produto.
  if (listQuery && filteredItems.length > 1) {
    filteredItems = filteredItems
      .map((item, originalIndex) => {
        const erp = item?.erp || {};
        const nameAndModel = [item?.name, erp.brand, erp.model].filter(Boolean).join(' ');
        const technicalFields = [item?.slug, erp.internalCode, erp.sku, erp.barcode, erp.supplierCode, erp.searchAlias].filter(Boolean).join(' ');
        return { item, originalIndex, score:searchRelevanceScore({ name:nameAndModel, fields:technicalFields, query:listQuery }) };
      })
      .sort((a,b) => b.score - a.score || a.originalIndex - b.originalIndex)
      .map(entry => entry.item);
  }

  const totalFiltered = filteredItems.length;
  const totalPages = workspaceNew ? 1 : Math.max(1, Math.ceil(totalFiltered / pageSize));
  const requestedPage = Math.max(1, Number(req.query.page) || 1);
  const currentPage = Math.min(requestedPage, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const renderItems = workspaceNew ? [] : filteredItems.slice(startIndex, startIndex + pageSize);

  if (!workspaceNew && renderItems.length) {
    const invService = inventoryService(req.app);
    const inventoryIds = [];

    renderItems.forEach(item => {
      ensureInventoryIdentity(item, item);
      if (item.inventory?.stockControlled !== true) return;
      const combinations = variationCombinations(item);
      if (combinations.length) {
        combinations.forEach(combo => { if (combo.inventoryItemId) inventoryIds.push(combo.inventoryItemId); });
      } else if (item.inventory?.itemId) {
        inventoryIds.push(item.inventory.itemId);
      }
    });

    const balances = invService.consultarSaldosEmLote({ inventoryItemIds: inventoryIds });

    renderItems.forEach(item => {
      if (item.inventory?.stockControlled !== true) return;
      const combinations = variationCombinations(item);
      if (combinations.length) {
        let physicalQuantity = 0, availableQuantity = 0, reservedQuantity = 0;
        combinations.forEach(combo => {
          if (!combo.inventoryItemId) return;
          const balance = balances.get(String(combo.inventoryItemId));
          if (!balance) return;
          combo.stock = Number(balance.physicalQuantity) || 0;
          physicalQuantity += Number(balance.physicalQuantity) || 0;
          availableQuantity += Number(balance.availableQuantity) || 0;
          reservedQuantity += Number(balance.reservedQuantity) || 0;
        });
        item.stock = physicalQuantity;
        item.inventoryBalance = { physicalQuantity, availableQuantity, reservedQuantity, derivedFromVariations: true };
        return;
      }
      if (item.inventory?.itemId) {
        item.inventoryBalance = balances.get(String(item.inventory.itemId)) || { physicalQuantity: 0, availableQuantity: 0, reservedQuantity: 0 };
        item.stock = Number(item.inventoryBalance.physicalQuantity) || 0;
      }
    });
  }

  res.render('produtos', {
    items: renderItems,
    categorias: cats.items || [],
    subcategorias: subcats.items || [],
    erpCategorias,
    imagens,
    origemErp: req.query.origem === 'erp',
    workspaceNew,
    workspaceType: String(req.query.type || 'product').toLowerCase() === 'service' ? 'service' : 'product',
    listState: {
      query:listQuery, category:listCategory, erpStatus:listErpStatus, lvStatus:listLvStatus,
      page:currentPage, pageSize, totalFiltered, totalPages, totalItems:allItems.length
    },
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
  const erpCategorias = loadErpCategories(req.app);
  // Segurança de cadastro: produtos novos começam fora da Loja Virtual.
  // A ativação ocorre somente quando o usuário selecionar explicitamente "Ativo".
  const createBody = { ...req.body };
  if (createBody.lvActive === undefined && createBody.active === undefined && createBody.publishSite === undefined) {
    createBody.lvActive = 'false';
  }
  const novo = productFromBody(createBody);
  const erpCategory = validErpCategory(createBody.erpCategory, erpCategorias);
  if (!erpCategory || erpCategory.active === false) return res.redirect('/produtos?error=erp_category');
  novo.id = Date.now();
  novo.erp = novo.erp && typeof novo.erp === 'object' ? novo.erp : {};
  novo.erp.categoryId = erpCategory.id;
  novo.erp.category = erpCategory.code;
  if (erpCategory.type === 'service') {
    novo.erp.type = 'service';
    // Serviço é sempre um cadastro vendável único. Não usa grade/variações de produto.
    // Isso garante preço, histórico e seleção independentes no PDV.
    novo.variations = emptyVariations();
    novo.stock = null;
    novo.inventory = defaultInventoryPolicy(novo, { stockControlled: 'false', allowNegative: 'false', inventorySiteMode: 'disabled', minimumQuantity: 0, siteLimit: 0, physicalSafety: 0 });
  }
  else {
    // Regra padrão do ERP: todo produto físico novo participa do controle de estoque.
    // Serviços permanecem fora do estoque pelo bloco acima.
    novo.inventory = defaultInventoryPolicy(novo, {
      stockControlled: 'true',
      allowNegative: String(novo?.inventory?.allowNegative === true),
      inventorySiteMode: novo?.inventory?.channelAvailability?.site?.mode || 'shared',
      minimumQuantity: novo?.inventory?.minimumQuantity ?? 0,
      siteLimit: novo?.inventory?.channelAvailability?.site?.limit ?? 0,
      physicalSafety: novo?.inventory?.channelAvailability?.site?.physicalSafety ?? 0
    });
  }
  novo.erp.internalCode = nextInternalProductCode(data.items);
  novo.code = novo.erp.internalCode;
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

function findProductBySubmittedId(items, rawId) {
  const submitted = String(rawId ?? '').trim();
  if (!submitted) return null;

  // IDs de produtos importados podem ser textuais. Nunca converter cegamente para
  // Number(), pois valores como QLT-.../IDs externos viram NaN e o produto some
  // apenas no momento de salvar. A comparação textual preserva a identidade real.
  let item = (items || []).find(product => String(product?.id ?? '').trim() === submitted);
  if (item) return item;

  // Compatibilidade com bases antigas em que o mesmo ID foi persistido como número
  // de um lado e string numérica do outro.
  if (/^-?\d+(?:\.0+)?$/.test(submitted)) {
    const numeric = Number(submitted);
    item = (items || []).find(product => {
      const candidate = String(product?.id ?? '').trim();
      return /^-?\d+(?:\.0+)?$/.test(candidate) && Number(candidate) === numeric;
    });
    if (item) return item;
  }

  // Fallback seguro para cadastros importados que usaram o código interno como
  // identidade no frontend em versões anteriores.
  return (items || []).find(product => {
    const codes = [
      product?.erp?.internalCode, product?.internalCode, product?.code,
      product?.codigo, product?.codigoInterno, product?.qltCode
    ].map(value => String(value ?? '').trim()).filter(Boolean);
    return codes.includes(submitted);
  }) || null;
}

router.post('/update', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  data.items = data.items || [];

  const submittedId = String(req.body.id ?? '').trim();
  const item = findProductBySubmittedId(data.items, submittedId);
  const id = item?.id ?? submittedId;

  if (!item) {
    if (wantsJson(req)) {
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    return res.redirect('/produtos?error=not_found');
  }

  const categorias = loadCategories(req.app);
  const erpCategorias = loadErpCategories(req.app);
  const previousItem = JSON.parse(JSON.stringify(item));

  // A nova categoria ERP usa identidade própria. O código legado continua salvo para
  // preservar integrações consolidadas que ainda leem item.erp.category.
  const submittedErpCategory = String(req.body.erpCategory || '').trim();
  const previousCategoryId = String(previousItem?.erp?.categoryId || '').trim();
  const previousCategoryCode = String(previousItem?.erp?.category || '').trim();
  const erpCategory = validErpCategory(submittedErpCategory || previousCategoryId || previousCategoryCode, erpCategorias);

  // A categoria ERP é obrigatória apenas no cadastro de novos produtos. Em uma
  // edição de produto legado, a ausência de categoria não pode impedir ajustes
  // independentes de estoque, status ou disponibilidade.
  Object.assign(item, productFromBody(req.body, item));
  item.erp = item.erp && typeof item.erp === 'object' ? item.erp : {};
  if (erpCategory) {
    item.erp.categoryId = erpCategory.id;
    item.erp.category = erpCategory.code;
    if (erpCategory.type === 'service') {
      item.erp.type = 'service';
      // Ao converter/salvar como serviço, remove qualquer grade antiga.
      // Serviços são cadastrados individualmente e usam o preço do bloco Comercial.
      item.variations = emptyVariations();
      item.stock = null;
      item.inventory = defaultInventoryPolicy(item, { stockControlled: 'false', allowNegative: 'false', inventorySiteMode: 'disabled', minimumQuantity: 0, siteLimit: 0, physicalSafety: 0 });
    }
  }
  item.erp.internalCode = previousItem.erp?.internalCode || previousItem.code || nextInternalProductCode(data.items);
  item.code = item.erp.internalCode;

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
    if (inventoryResult?.stockMode === 'variations') item.stock = Number(inventoryResult.aggregatePhysical) || 0;
    else if (inventoryResult?.productBalance) item.stock = inventoryResult.productBalance.physicalQuantity;
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
    const item = findProductBySubmittedId(data.items, rawId);
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
      searchAlias: getField('searchAlias'),
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
  const hasAllowNegative = enabledActions.has('allowNegative');
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
  const requestedAllowNegative = hasAllowNegative
    ? booleanValue('bulkAllowNegative')
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

      if (hasAllowNegative) {
        item.inventory.allowNegative = requestedAllowNegative;
        changedFields.add('venda com estoque zerado/negativo');
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

  const submittedId = String(req.body.id ?? '').trim();
  const original = findProductBySubmittedId(data.items, submittedId);
  const id = original?.id ?? submittedId;

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

  // Duplicar reaproveita os dados comerciais/cadastrais, mas NUNCA as identidades
  // técnicas do produto original. Código e inventoryItemId são chaves usadas pelo
  // estoque/contagens; copiá-las faz dois cadastros apontarem para o mesmo item físico.
  copia.erp = copia.erp && typeof copia.erp === 'object' ? copia.erp : {};
  const novoCodigo = nextInternalProductCode(data.items);
  copia.erp.internalCode = novoCodigo;
  copia.code = novoCodigo;
  delete copia.internalCode;
  delete copia.codigo;
  delete copia.codigoInterno;
  delete copia.qltCode;

  // A cópia é um novo item físico: começa com saldo zero e recebe identidades de
  // estoque próprias. Isso evita saldo fantasma e garante contagem independente.
  copia.stock = copia.erp?.type === 'service' ? null : 0;
  copia.inventory = copia.inventory && typeof copia.inventory === 'object' ? copia.inventory : {};
  copia.inventory.itemId = '';
  if (Array.isArray(copia?.variations?.combinations)) {
    copia.variations.combinations = copia.variations.combinations.map(combo => ({
      ...combo,
      stock: 0,
      inventoryItemId: ''
    }));
  }
  ensureInventoryIdentity(copia, null);

  data.items.push(copia);
  writeJson(file, data);

  // Registra/configura o novo item no módulo de estoque sem herdar movimentações
  // do produto de origem. Para serviços, syncInventoryFromProduct apenas ignora.
  try {
    syncInventoryFromProduct(req, copia, { initial: true });
  } catch (error) {
    console.error(`⚠️ Produto duplicado, mas falhou ao inicializar estoque de ${copia.name}:`, error);
  }

  console.log(
    `📄 Produto duplicado: ${original.name || id} -> ${copia.name} | ` +
    `código: ${copia.erp.internalCode} | estoque: ${copia.inventory?.itemId || 'não controlado'} | slug: ${copia.slug}`
  );

  if (wantsJson(req)) {
    return res.json({ success: true, message: '📄 Produto duplicado com sucesso.', item: copia });
  }

  res.redirect('/produtos?saved=duplicate');
});

router.post('/del', (req, res) => {
  const file = path.join(P(req.app).CONTENT_DIR, 'products.json');
  const data = readJson(file);
  const submittedId = String(req.body.id ?? '').trim();
  const target = findProductBySubmittedId(data.items || [], submittedId);
  const id = target?.id ?? submittedId;

  data.items = (data.items || []).filter(product => product !== target);
  writeJson(file, data);

  console.log(`🗑️ Produto ${id} excluído.`);
  res.redirect('/produtos?deleted=1');
});

export default router;