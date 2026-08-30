import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone = value => JSON.parse(JSON.stringify(value));
const digits = value => String(value ?? '').replace(/\D/g, '');
const ncmCode = value => { const code=digits(value).slice(0,8); return code.length===8&&code!=='00000000'?code:''; };
const text = value => String(value ?? '').normalize('NFC').trim();
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function escapeRegExp(value='') { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function slugify(value = '') {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function normalizeName(value = '') {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/\b(UNIDADE|UN|UND)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Regras propositalmente conservadoras. Elas existem só para categorias em que o
// nome do item identifica a mercadoria com alta confiança; itens ambíguos continuam
// sem preenchimento automático para revisão humana.
const NCM_TRUSTED = Object.freeze({
  smartphone:{ code:'85171300', reason:'Telefone inteligente (smartphone)' },
  lithiumBattery:{ code:'85076000', reason:'Acumulador de íon de lítio para aparelho móvel' },
  charger:{ code:'85044010', reason:'Carregador de acumuladores' },
  headphones:{ code:'85183000', reason:'Fone de ouvido, mesmo com microfone' },
  mouse:{ code:'84716053', reason:'Indicador/apontador (mouse)' },
  gameConsole:{ code:'95045000', reason:'Console/máquina de jogos de vídeo ou controlador reconhecível' },
  dataCable:{ code:'85444200', reason:'Condutor elétrico isolado, munido de peças de conexão' },
  penDrive:{ code:'85235190', reason:'Dispositivo de armazenamento não volátil (pen drive)' },
  memoryCard:{ code:'85235110', reason:'Cartão de memória' }
});
const PHONE_PART_WORDS = /\b(CAPA|CASE|PELICULA|TELA|FRONTAL|DISPLAY|LCD|BATERIA|FLEX|CONECTOR|TAMPA|CARCACA|VIDRO|ARO|CAMERA|BOTAO|ALTO FALANTE|MICROFONE|CARREGADOR|FONTE|CABO|FONE|HEADPHONE|HEADSET|SUPORTE|ADESIVO|LENTE|PLACA|GAVETA|CHIP|PECA|MODULO|TOUCH|DOCK|SENSOR|AURICULAR)\b/;
const PRIMARY_BATTERY_WORDS = /\b(PILHA|AG ?\d+|LR ?\d+|CR ?\d+|AA|AAA|AAAA|9V|ALCALINA|ZINCO)\b/;
function trustedNcmForName(value = '') {
  const name=normalizeName(value);
  if(!name) return null;

  if(/\bBATERIA\b/.test(name) && !PRIMARY_BATTERY_WORDS.test(name) && /\b(IPHONE|APPLE|SAMSUNG|MOTOROLA|MOTO|XIAOMI|REDMI|POCO|LG|ASUS|ZENFONE)\b/.test(name)) return NCM_TRUSTED.lithiumBattery;
  if(/\b(CARREGADOR|FONTE)\b/.test(name) && /\b(USB|TYPE C|TIPO C|LIGHTNING|IPHONE|APPLE|SAMSUNG|MOTOROLA|XIAOMI|TURBO|PD|GAN|INDUCAO|WIRELESS)\b/.test(name) && !/\bKIT\b/.test(name)) return NCM_TRUSTED.charger;
  if(/\b(FONE DE OUVIDO|FONE BLUETOOTH|HEADPHONE|HEADSET|EARPHONE|TWS)\b/.test(name) && !/\b(CAPA|CASE|ESTOJO|CABO|ADAPTADOR)\b/.test(name)) return NCM_TRUSTED.headphones;
  if(/\bMOUSE\b/.test(name) && !/\b(MOUSEPAD|MOUSE PAD|KIT)\b/.test(name)) return NCM_TRUSTED.mouse;
  if((/\b(CONSOLE|VIDEOGAME)\b/.test(name) && /\b(PLAYSTATION|PS4|PS5|XBOX)\b/.test(name)) || (/\bCONTROLE\b/.test(name) && /\b(PLAYSTATION|PS3|PS4|PS5|XBOX)\b/.test(name))) return NCM_TRUSTED.gameConsole;
  // Cabo simples de alimentação/dados com conectores. 'Adaptador' é excluído porque
  // pode incorporar circuito eletrônico e cair em outra classificação.
  if(/\bCABO\b/.test(name) && /\b(USB|USB C|TYPE C|TIPO C|MICRO USB|LIGHTNING)\b/.test(name) && !/\b(ADAPTADOR|CONVERSOR|HUB|DOCK|RCA|P2|AUXILIAR|AUDIO|KIT)\b/.test(name)) return NCM_TRUSTED.dataCable;
  if(/\b(PEN DRIVE|PENDRIVE|USB FLASH DRIVE)\b/.test(name)) return NCM_TRUSTED.penDrive;
  if(/\b(CARTAO DE MEMORIA|CARTAO MEMORIA|MEMORY CARD|MICRO SD|MICROSD)\b/.test(name) && !/\b(ADAPTADOR|LEITOR)\b/.test(name)) return NCM_TRUSTED.memoryCard;

  if(PHONE_PART_WORDS.test(name)) return null;
  if(/\bSMARTPHONE\b/.test(name)) return NCM_TRUSTED.smartphone;
  if(/\b(?:APPLE )?IPHONE (?:SE(?: \d{4})?|\d{1,2})(?:\b|$)/.test(name)) return NCM_TRUSTED.smartphone;
  if(/\bSAMSUNG\b/.test(name) && /\b(?:GALAXY )?(?:A|M|S|Z) ?\d{2,3}\b/.test(name) && /\b(32|64|128|256|512|1024) ?GB\b|\b(4G|5G|USADO|NOVO|LACRADO)\b/.test(name)) return NCM_TRUSTED.smartphone;
  if(/\bMOTOROLA\b/.test(name) && /\bMOTO [A-Z0-9]+\b/.test(name) && /\b(32|64|128|256|512) ?GB\b|\b(4G|5G|USADO|NOVO|LACRADO)\b/.test(name)) return NCM_TRUSTED.smartphone;
  if(/\b(XIAOMI|REDMI|POCO)\b/.test(name) && /\b(32|64|128|256|512) ?GB\b|\b(4G|5G|USADO|NOVO|LACRADO)\b/.test(name)) return NCM_TRUSTED.smartphone;
  if(/\bCELULAR\b/.test(name) && /\b(SAMSUNG|MOTOROLA|XIAOMI|REDMI|POCO)\b/.test(name) && /\b(ANDROID|4G|5G|USADO|NOVO|LACRADO|32|64|128|256|512)\b/.test(name)) return NCM_TRUSTED.smartphone;
  return null;
}
function legacyNcmLooksCompatible(nameValue='', ncm='') {
  const name=normalizeName(nameValue);
  const code=ncmCode(ncm);
  if(!code) return false;

  // O histórico do WM10 contém classificações antigas e algumas claramente
  // incompatíveis. Por isso o legado só é reaproveitado automaticamente quando
  // o próprio nome confirma um grupo que conseguimos validar com alta confiança.
  const trusted=trustedNcmForName(name);
  if(trusted) return trusted.code===code;

  // Películas só são aceitas no 3919.90.90 quando o nome deixa explícito que se
  // trata de material plástico/autoadesivo. "Película de vidro" fica fora.
  if(code==='39199090' && /\bPELICULA\b/.test(name) && /\b(HIDROGEL|PET|PLASTICA|PLASTICO|POLIMERO|AUTOADESIVA|AUTO ADESIVA)\b/.test(name) && !/\bVIDRO\b/.test(name)) return true;

  // Fora dos casos verificados acima, não copiamos NCM legado apenas por existir.
  return false;
}
function tokens(value = '') { return new Set(normalizeName(value).split(' ').filter(token => token.length > 1)); }
function fingerprint(value = '') {
  return normalizeName(value).replace(/(\d+)\s+(GB|TB|MB|CM|MM|M|W)/g, '$1$2').split(' ').filter(Boolean).sort().join(' ');
}
function jaccard(a, b) {
  const left = tokens(a); const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let same = 0; for (const item of left) if (right.has(item)) same += 1;
  return same / (left.size + right.size - same);
}
function bigrams(value = '') {
  const raw = normalizeName(value).replace(/\s+/g, '');
  if (raw.length < 2) return raw ? [raw] : [];
  const result = []; for (let i = 0; i < raw.length - 1; i += 1) result.push(raw.slice(i, i + 2));
  return result;
}
function dice(a, b) {
  const left = bigrams(a); const right = bigrams(b);
  if (!left.length || !right.length) return 0;
  const counts = new Map(); left.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  let hits = 0; right.forEach(item => { const count = counts.get(item) || 0; if (count > 0) { hits += 1; counts.set(item, count - 1); } });
  return (2 * hits) / (left.length + right.length);
}
function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  if (normalizeName(a) === normalizeName(b)) return 1;
  return Math.max(jaccard(a, b), dice(a, b));
}
function safeJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return clone(fallback); } }
function writeAtomic(file, data) { fs.mkdirSync(path.dirname(file), { recursive:true }); const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(tmp, file); }

export default class Wm10ProductImportService {
  constructor({ dataDir, productsFile, backupDir, inventoryService = null, timeoutMs = 45000 } = {}) {
    if (!dataDir || !productsFile) throw new Error('Importador WM10 Produtos: configuração incompleta.');
    this.dataDir = path.resolve(dataDir);
    this.productsFile = path.resolve(productsFile);
    this.backupDir = path.resolve(backupDir || path.join(this.dataDir, 'backups'));
    this.timeoutMs = timeoutMs;
    this.inventoryService = inventoryService;
    this.configFile = path.join(this.dataDir, 'wm10-product-import-settings.json');
    this.stateFile = path.join(this.dataDir, 'wm10-product-migration-state.json');
    this.reportFile = path.join(this.dataDir, 'wm10-product-last-report.json');
    this.familyStateFile = path.join(this.dataDir, 'wm10-product-family-state.json');
    this.sourceCacheFile = path.join(this.dataDir, 'wm10-product-source-cache.json');
    this.erpCategoriesFile = path.join(path.dirname(this.dataDir), 'catalog', 'categories.json');
    fs.mkdirSync(this.dataDir, { recursive:true });
    if (!fs.existsSync(this.configFile)) writeAtomic(this.configFile, {
      version:'1.0', baseUrl:'https://app.wm10.com.br/quality/sistema/api/produto/', categoryUrl:'https://app.wm10.com.br/quality/sistema/api/categoria/', cnpj:'', token:'', pageSize:500
    });
    else {
      const currentSettings = safeJson(this.configFile, {});
      // A API aceita até 500 registros por página neste importador. Usar o máximo
      // reduz aproximadamente pela metade a quantidade de chamadas tarifadas.
      if ((Number(currentSettings.pageSize) || 0) < 500) writeAtomic(this.configFile, { ...currentSettings, pageSize:500 });
    }
    if (!fs.existsSync(this.stateFile)) writeAtomic(this.stateFile, { version:'1.0', updatedAt:null, products:{} });
    if (!fs.existsSync(this.familyStateFile)) writeAtomic(this.familyStateFile, { version:'1.0', updatedAt:null, families:{} });
  }

  getSettings({ includeToken = false } = {}) {
    const value = safeJson(this.configFile, {});
    return { ...value, token:includeToken ? text(value.token) : '', tokenConfigured:Boolean(text(value.token)) };
  }
  saveSettings(payload = {}) {
    const current = this.getSettings({ includeToken:true });
    const settings = {
      version:'1.0',
      baseUrl:text(payload.baseUrl || current.baseUrl),
      categoryUrl:text(payload.categoryUrl || current.categoryUrl),
      cnpj:digits(payload.cnpj || current.cnpj),
      token:text(payload.token) || current.token,
      pageSize:Math.min(500, Math.max(1, Number.parseInt(payload.pageSize, 10) || current.pageSize || 250))
    };
    if (!/^https:\/\//i.test(settings.baseUrl)) throw new Error('A URL da API de produtos deve utilizar HTTPS.');
    if (settings.categoryUrl && !/^https:\/\//i.test(settings.categoryUrl)) throw new Error('A URL da API de categorias deve utilizar HTTPS.');
    if (!settings.cnpj) throw new Error('Informe o CNPJ da loja.');
    if (!settings.token) throw new Error('Informe o token da API WM10.');
    writeAtomic(this.configFile, settings);
    return this.getSettings();
  }
  buildUrl(baseUrl, settings, params = {}) {
    const url = new URL(baseUrl);
    url.searchParams.set('CNPJ', settings.cnpj); url.searchParams.set('TOKEN', settings.token);
    Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value)); });
    return url;
  }
  async request(baseUrl, settings, params = {}) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.buildUrl(baseUrl, settings, params), { headers:{ Accept:'application/json' }, signal:controller.signal });
      const raw = Buffer.from(await response.arrayBuffer());
      let body;
      const candidates = [];
      try { candidates.push(new TextDecoder('utf-8', { fatal:true }).decode(raw)); } catch (_) {}
      try { candidates.push(new TextDecoder('windows-1252').decode(raw)); } catch (_) {}
      candidates.push(raw.toString('latin1'));
      for (const candidate of [...new Set(candidates)]) { try { body = JSON.parse(candidate); break; } catch (_) {} }
      if (!body) throw new Error(`A API WM10 retornou JSON inválido (HTTP ${response.status}).`);
      if (!response.ok) throw new Error(`Falha na API WM10 (HTTP ${response.status}).`);
      if (!Array.isArray(body)) {
        const cause = Array.isArray(body?.causes) ? `: ${body.causes.join('; ')}` : '';
        throw new Error(`${body?.name || 'Erro retornado pela API WM10'}${cause}`);
      }
      return body;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('A consulta ao WM10 excedeu o tempo limite.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  async fetchAll(baseUrl, settings) {
    const rows = []; let page = 1; let declaredTotal = null;
    while (page <= 1000) {
      const batch = await this.request(baseUrl, settings, { pagina:page, limite:settings.pageSize });
      if (!batch.length) break;
      rows.push(...batch);
      const total = Number(batch[0]?.total); if (Number.isFinite(total) && total >= 0) declaredTotal = total;
      if (batch.length < settings.pageSize || (declaredTotal !== null && rows.length >= declaredTotal)) break;
      page += 1;
    }
    return { rows, pages:page, total:declaredTotal ?? rows.length };
  }
  saveSourceCache(rows = [], meta = {}) {
    const payload = {
      version:'1.0',
      createdAt:new Date().toISOString(),
      total:Array.isArray(rows) ? rows.length : 0,
      ...meta,
      rows:Array.isArray(rows) ? rows : []
    };
    writeAtomic(this.sourceCacheFile, payload);
    return payload;
  }
  getSourceCacheInfo() {
    const cache = safeJson(this.sourceCacheFile, null);
    if (!cache || !Array.isArray(cache.rows) || !cache.createdAt) return { available:false };
    const createdAt = new Date(cache.createdAt);
    const ageMs = Date.now() - createdAt.getTime();
    return {
      available:true,
      createdAt:cache.createdAt,
      ageMs:Number.isFinite(ageMs) ? Math.max(0, ageMs) : null,
      total:cache.declaredTotal ?? cache.total ?? cache.rows.length,
      rows:cache.rows.length,
      pages:Number(cache.pages) || 0,
      categoriesFound:cache.categoriesFound ?? null
    };
  }
  estimateRefreshCost() {
    const settings = this.getSettings({ includeToken:false });
    const cache = this.getSourceCacheInfo();
    const total = Number(cache.total) || 0;
    const pageSize = Math.max(1, Number(settings.pageSize) || 500);
    const productCalls = total > 0 ? Math.max(1, Math.ceil(total / pageSize)) : null;
    return { productCalls, estimatedCost:productCalls === null ? null : productCalls * 0.01, pageSize };
  }
  loadSourceCache({ maxAgeMs = null, requiredCodes = [] } = {}) {
    const cache = safeJson(this.sourceCacheFile, null);
    if (!cache || !Array.isArray(cache.rows) || !cache.createdAt) return null;
    const age = Date.now() - new Date(cache.createdAt).getTime();
    if (!Number.isFinite(age) || age < 0) return null;
    if (maxAgeMs !== null && maxAgeMs !== undefined && Number.isFinite(Number(maxAgeMs)) && Number(maxAgeMs) >= 0 && age > Number(maxAgeMs)) return null;
    if (Array.isArray(requiredCodes) && requiredCodes.length) {
      const wanted = new Set(requiredCodes.map(Number).filter(Number.isFinite));
      if (wanted.size) {
        const present = new Set(cache.rows.map(row => Number(row?.Cod_produto ?? row?.cod_produto)).filter(Number.isFinite));
        for (const code of wanted) if (!present.has(code)) return null;
      }
    }
    return cache;
  }
  async sourceRows({ preferCache = true, requiredCodes = [], maxAgeMs = null, allowRemoteFallback = true } = {}) {
    if (preferCache) {
      const cached = this.loadSourceCache({ maxAgeMs, requiredCodes });
      if (cached) return { rows:cached.rows, pages:cached.pages || 0, total:cached.declaredTotal ?? cached.total ?? cached.rows.length, cached:true, cachedAt:cached.createdAt, categoriesFound:cached.categoriesFound };
      if (!allowRemoteFallback) {
        throw new Error('Os dados locais do WM10 não contêm todos os registros necessários. Use “Atualizar dados do WM10” antes de continuar. Nenhuma consulta cobrada foi feita.');
      }
    }
    const settings = this.getSettings({ includeToken:true });
    const fetched = await this.fetchAll(settings.baseUrl, settings);
    this.saveSourceCache(fetched.rows, { pages:fetched.pages, declaredTotal:fetched.total });
    return { ...fetched, cached:false };
  }
  async testConnection() {
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Salve CNPJ e token antes de testar.');
    const products = await this.request(settings.baseUrl, settings, { pagina:1, limite:1 });
    return { ok:true, message:`Conexão válida. A API respondeu ${products.length ? 'com produto' : 'sem registros nesta página'}.` };
  }
  mapRow(row = {}) {
    const code = Number(row.Cod_produto ?? row.cod_produto);
    return {
      code,
      barcode:digits(row.Cod_barra ?? row.cod_barra),
      ncm:ncmCode(row.ncm ?? row.NCM),
      name:text(row.Nome ?? row.nome) || `Produto WM10 ${code}`,
      cost:number(row.Preco_compra ?? row.preco_compra),
      price:number(row.Preco_venda ?? row.preco_venda),
      unit:text(row.Unidade ?? row.unidade) || 'UN',
      stock:number(row.Estoque ?? row.estoque),
      reference:text(row.Referencia ?? row.referencia),
      color:text(row.Cor ?? row.cor),
      size:text(row.Tamanho ?? row.tamanho),
      brand:text(row.Marca ?? row.marca),
      collection:text(row.Colecao ?? row.colecao),
      active:Number(row.Ativo ?? row.ativo) !== 0,
      registeredAt:text(row.Data_cadastrou ?? row.data_cadastrou),
      updatedAt:text(row.Data_atualizou ?? row.data_atualizou),
      normalizedName:normalizeName(row.Nome ?? row.nome)
    };
  }
  qualityProducts() {
    const data = safeJson(this.productsFile, { items:[] });
    return Array.isArray(data) ? data : (data.items || []);
  }
  migrationState() { return safeJson(this.stateFile, { version:'1.0', products:{} }); }
  familyState() { return safeJson(this.familyStateFile, { version:'1.0', updatedAt:null, families:{} }); }
  familyId(key) { return `fam-${crypto.createHash('sha1').update(String(key || '')).digest('hex').slice(0, 12)}`; }
  detectVariantAttributes(item = {}) {
    const original = normalizeName(item.name);
    let base = original;
    const values = { color:'', storage:'', size:'', condition:'', voltage:'', type:'' };
    const colorAliases = [
      'PRETO','PRETA','BRANCO','BRANCA','AZUL','VERDE','VERMELHO','VERMELHA','ROSA','ROXO','ROXA','AMARELO','AMARELA','LARANJA','CINZA','GRAFITE','DOURADO','DOURADA','PRATA','PRATEADO','PRATEADA','BEGE','MARROM','TRANSPARENTE','TITANIO','NATURAL','MIDNIGHT','STARLIGHT','LILAS','ESMERALDA','TERRACOTA','MILITAR','ROSE'
    ];
    const sourceColor = normalizeName(item.color);
    const colorInName = colorAliases.find(value => new RegExp(`\\b${value}\\b`).test(base));
    const color = sourceColor && sourceColor !== 'SEM COR' ? sourceColor : colorInName;
    if (color) {
      values.color = text(item.color) && normalizeName(item.color) !== 'SEM COR' ? text(item.color) : color;
      // O WM10 frequentemente guarda Cor=PRETO e Nome=... PRETA (ou BRANCO/BRANCA).
      // Remove a forma realmente encontrada no nome para não quebrar a família.
      const escapedSource = escapeRegExp(sourceColor);
      const removeColor = colorInName || (sourceColor && new RegExp(`\\b${escapedSource}\\b`).test(base) ? sourceColor : '');
      if (removeColor) {
        const escapedRemove = escapeRegExp(removeColor);
        base = base.replace(new RegExp(`\\b${escapedRemove}\\b`, 'g'), ' ');
      }
    }
    const storageMatch = base.match(/\b(\d+(?:[.,]\d+)?)\s*(TB|GB|MB)\b/);
    if (storageMatch) { values.storage = `${storageMatch[1].replace(',','.')} ${storageMatch[2]}`; }
    const conditionMatch = base.match(/\b(USADO|USADA|SEMINOVO|SEMINOVA|NOVO|NOVA|VITRINE|RECONDICIONADO|RECONDICIONADA)\b/);
    if (conditionMatch) { values.condition = conditionMatch[1]; }
    const voltageMatch = base.match(/\b(110\s*V|127\s*V|220\s*V|BIVOLT)\b/);
    if (voltageMatch) { values.voltage = voltageMatch[1].replace(/\s+/g,''); base = base.replace(voltageMatch[0], ' '); }

    // Tipos simples de acessórios. São usados apenas como sugestão de variação.
    // Ex.: Película iPhone 14 3D / Privacidade / Vidro.
    const typeAliases = [
      'ANTI IMPACTO TRANSPARENTE','ANTI IMPACTO TRANSP','ANTI IMPACTO','CLEAR CASE','CARTEIRA','SILICONE','CASE',
      'CERAMICA 3D','PRIVACIDADE','HIDROGEL','CERAMICA','VIDRO','FOSCA','3D'
    ];
    const type = typeAliases.find(value => new RegExp(`\\b${value.replace(/\s+/g,'\\s+')}\\b`).test(base));
    if (type) { values.type = type; base = base.replace(new RegExp(`\\b${type.replace(/\s+/g,'\\s+')}\\b`, 'g'), ' '); }

    const sourceSize = normalizeName(item.size);
    const apparelSize = /^(PP|P|M|G|GG|XG|XGG|EG|EGG|\d{1,2})$/.test(sourceSize);
    if (sourceSize && !['SEM TAMANHO','UNICO','UNICA'].includes(sourceSize) && apparelSize) {
      values.size = text(item.size);
      const escaped = sourceSize.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      base = base.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
    } else if (sourceSize && !['SEM TAMANHO','UNICO','UNICA'].includes(sourceSize)) {
      // No WM10 o campo Tamanho é usado muitas vezes como compatibilidade/modelo (A22, A10 M10, iPhone 14).
      // Nesse caso ele faz parte da identidade da família e NÃO deve virar variação.
      if (!normalizeName(base).includes(sourceSize)) base = `${base} ${sourceSize}`;
    }
    base = base.replace(/\s+/g, ' ').trim();
    return { baseName:base || original, attributes:values, attributeCount:Object.values(values).filter(Boolean).length };
  }
  detectFamilies(mapped = []) {
    const groups = new Map();
    for (const item of mapped) {
      const detected = this.detectVariantAttributes(item);
      if (!detected.baseName || detected.baseName.length < 4) continue;
      const brand = normalizeName(item.brand);
      const key = `${detected.baseName}|${brand && brand !== 'SEM MARCA' ? brand : ''}`;
      const arr = groups.get(key) || [];
      arr.push({ ...item, familyBaseName:detected.baseName, variantAttributes:detected.attributes, variantAttributeCount:detected.attributeCount });
      groups.set(key, arr);
    }
    const saved = this.familyState();
    const families = [];
    for (const [key, members] of groups.entries()) {
      if (members.length < 2) continue;
      const signatures = new Set(members.map(member => JSON.stringify(member.variantAttributes)));
      const hasVariationSignal = members.some(member => member.variantAttributeCount > 0) && signatures.size > 1;
      if (!hasVariationSignal) continue;
      const id = this.familyId(key);
      const decision = saved.families?.[id] || null;
      const exactBase = members.find(member => normalizeName(member.name) === member.familyBaseName);
      const parentCode = Number(decision?.parentCode) || Number(exactBase?.code) || Number(members[0].code);
      const attributes = { color:new Set(), storage:new Set(), size:new Set(), condition:new Set(), voltage:new Set(), type:new Set() };
      members.forEach(member => Object.entries(member.variantAttributes || {}).forEach(([name,value]) => { if(value && attributes[name]) attributes[name].add(value); }));
      const roles = decision?.roles && typeof decision.roles === 'object' ? decision.roles : {};
      families.push({
        id,
        key,
        suggestedName:text(decision?.name) || text(exactBase?.name) || members[0].familyBaseName,
        status:decision?.status || 'suggested',
        nameEdited:decision?.nameEdited===true,
        parentCode,
        savedAt:decision?.at || null,
        attributes:Object.fromEntries(Object.entries(attributes).map(([name,set]) => [name,[...set]])),
        members:members.map(member => ({ ...member, role:roles[String(member.code)] || (Number(member.code) === parentCode ? 'parent' : 'variation') }))
      });
    }
    return families.sort((a,b) => b.members.length - a.members.length || a.suggestedName.localeCompare(b.suggestedName,'pt-BR'));
  }
  saveFamilyDecision({ familyId, name, parentCode, roles = {}, status='approved', nameEdited=false, kind='product', serviceCategory=null, user='painel' } = {}) {
    const id=text(familyId); if(!id) throw new Error('Família inválida.');
    if(!['approved','suggested'].includes(status)) throw new Error('Status da família inválido.');
    const parsedRoles={};
    for(const [code,role] of Object.entries(roles && typeof roles === 'object' ? roles : {})) {
      if(!['parent','variation','duplicate','separate','ignore'].includes(role)) continue;
      parsedRoles[String(Number(code))]=role;
    }
    const parent=Number(parentCode); if(!Number.isFinite(parent)) throw new Error('Escolha o produto pai da família.');
    parsedRoles[String(parent)]='parent';
    Object.keys(parsedRoles).forEach(code => { if(code !== String(parent) && parsedRoles[code] === 'parent') parsedRoles[code]='variation'; });
    const state=this.familyState(); state.families=state.families||{};
    state.families[id]={ name:text(name), nameEdited:nameEdited===true, parentCode:parent, roles:parsedRoles, kind:String(kind||'product').toLowerCase()==='service'?'service':'product', serviceCategory:serviceCategory&&serviceCategory.id?{id:serviceCategory.id,code:serviceCategory.code||'',name:serviceCategory.name||''}:null, status, at:new Date().toISOString(), by:user };
    state.updatedAt=new Date().toISOString(); writeAtomic(this.familyStateFile,state);
    return {id,...state.families[id]};
  }
  resetFamilyDecision({ familyId } = {}) {
    const id=text(familyId); if(!id) throw new Error('Família inválida.');
    const state=this.familyState(); state.families=state.families||{}; delete state.families[id]; state.updatedAt=new Date().toISOString(); writeAtomic(this.familyStateFile,state); return {id};
  }
  buildQualityIndex(quality = []) {
    const byWmCode=new Map(), byBarcode=new Map(), byName=new Map(), byRefBrand=new Map(), tokenIndex=new Map();
    quality.forEach((product,index)=>{
      const integration=product?.integrations?.wm10||{};
      const codes=[integration.productCode,...(Array.isArray(integration.productCodes)?integration.productCodes:[])].filter(v=>v!==undefined&&v!==null);
      codes.forEach(code=>byWmCode.set(String(code),product));
      const barcode=digits(product?.erp?.barcode||product?.barcode); if(barcode&&!byBarcode.has(barcode))byBarcode.set(barcode,product);
      const name=normalizeName(product?.name||product?.erp?.name); if(name&&!byName.has(name))byName.set(name,product);
      const ref=normalizeName(product?.erp?.supplierCode||product?.reference||''); const brand=normalizeName(product?.erp?.brand||product?.brand||'');
      if(ref){const key=`${ref}|${brand}`;if(!byRefBrand.has(key))byRefBrand.set(key,product);}
      for(const token of tokens(product?.name||product?.erp?.name||'')){if(token.length<3)continue;const arr=tokenIndex.get(token)||[];if(arr.length<200)arr.push(index);tokenIndex.set(token,arr);}
    });
    return {items:quality,byWmCode,byBarcode,byName,byRefBrand,tokenIndex};
  }
  findQualityMatch(item, index) {
    const wmCode=String(item.code); const linked=index.byWmCode.get(wmCode);
    if(linked)return {product:linked,confidence:1,reason:'Código WM10 já vinculado',exact:true};
    if(item.barcode){const match=index.byBarcode.get(item.barcode);if(match)return {product:match,confidence:1,reason:'Mesmo código de barras/EAN',exact:true};}
    const normalized=item.normalizedName; if(normalized){const match=index.byName.get(normalized);if(match)return {product:match,confidence:.99,reason:'Mesmo nome normalizado',exact:true};}
    if(item.reference){const ref=normalizeName(item.reference),brand=normalizeName(item.brand);const match=index.byRefBrand.get(`${ref}|${brand}`)||(!brand?[...index.byRefBrand.entries()].find(([key])=>key.startsWith(`${ref}|`))?.[1]:null);if(match)return {product:match,confidence:.96,reason:'Mesma referência e marca',exact:true};}
    const candidates=new Set(); for(const token of tokens(item.name)){for(const candidate of index.tokenIndex.get(token)||[]){candidates.add(candidate);if(candidates.size>=60)break;}if(candidates.size>=60)break;}
    let best=null; for(const candidateIndex of candidates){const product=index.items[candidateIndex];const score=nameSimilarity(item.name,product?.name||product?.erp?.name||'');if(!best||score>best.confidence)best={product,confidence:score,reason:'Nome semelhante',exact:false};}
    return best&&best.confidence>=.72?best:null;
  }
  analyze(rows) {
    const quality = this.qualityProducts(); const qualityIndex=this.buildQualityIndex(quality); const state = this.migrationState();
    const mapped = rows.map(row => this.mapRow(row)).filter(item => Number.isFinite(item.code));
    const byCode = new Map(); const duplicateCodes = new Set();
    mapped.forEach(item => { if (byCode.has(item.code)) duplicateCodes.add(item.code); else byCode.set(item.code, item); });

    // Compara WM10 × WM10 para achar nomes/EAN/referências repetidos antes de criar qualquer coisa.
    const barcodeGroups = new Map(); const nameGroups = new Map(); const tokenIndex = new Map();
    mapped.forEach((item, index) => {
      if (item.barcode) { const arr=barcodeGroups.get(item.barcode)||[]; arr.push(item); barcodeGroups.set(item.barcode, arr); }
      const fp=fingerprint(item.name); if (fp) { const arr=nameGroups.get(fp)||[]; arr.push(item); nameGroups.set(fp, arr); }
      for (const token of tokens(item.name)) { if (token.length < 3) continue; const arr=tokenIndex.get(token)||[]; if(arr.length<250) arr.push(index); tokenIndex.set(token,arr); }
    });
    const fuzzyWm10 = new Map();
    mapped.forEach((item,index)=>{
      const candidates=new Set(); for(const token of tokens(item.name)){ for(const candidate of tokenIndex.get(token)||[]){ if(candidate!==index)candidates.add(candidate); if(candidates.size>=40)break; } if(candidates.size>=40)break; }
      let best=null; for(const candidateIndex of candidates){ const other=mapped[candidateIndex]; const score=nameSimilarity(item.name,other.name); if(score>=.86&&(!best||score>best.score)) best={code:other.code,name:other.name,reason:'Nome muito semelhante',score}; }
      if(best) fuzzyWm10.set(item.code,best);
    });

    const families=this.detectFamilies(mapped);
    const report = { totalFound:mapped.length, new:[], review:[], existing:[], imported:[], ignored:[], legacy:[], invalid:[], families, familyCount:families.length, approvedFamilyCount:families.filter(f=>f.status==='approved').length, familyMemberCount:families.reduce((sum,f)=>sum+f.members.length,0), active:0, inactive:0, withStock:0, generatedAt:new Date().toISOString() };
    for (const item of mapped) {
      if (item.active) report.active += 1; else report.inactive += 1;
      if (item.stock > 0) report.withStock += 1;
      if (!item.name || duplicateCodes.has(item.code)) { report.invalid.push({ ...item, reason:duplicateCodes.has(item.code)?'Código repetido no retorno WM10':'Nome ausente' }); continue; }
      const saved = state.products?.[String(item.code)];
      if (saved?.status === 'imported' || saved?.status === 'linked') {
        report.imported.push({ ...item, migration:saved, reason:saved.status === 'linked' ? 'Vinculado anteriormente' : 'Importado anteriormente' }); continue;
      }
      if (saved?.status === 'ignored') { report.ignored.push({ ...item, migration:saved, reason:'Marcado para não importar' }); continue; }
      const match = this.findQualityMatch(item, qualityIndex);
      if (match?.exact) {
        report.existing.push({ ...item, match:{ productId:match.product.id, name:match.product.name, confidence:match.confidence, reason:match.reason } }); continue;
      }
      const wmDuplicates = [];
      if (item.barcode && (barcodeGroups.get(item.barcode)||[]).length > 1) wmDuplicates.push(...(barcodeGroups.get(item.barcode)||[]).filter(other => other.code !== item.code).map(other => ({ code:other.code, name:other.name, reason:'Mesmo EAN' })));
      const fp=fingerprint(item.name);
      if ((nameGroups.get(fp)||[]).length > 1) wmDuplicates.push(...(nameGroups.get(fp)||[]).filter(other => other.code !== item.code).map(other => ({ code:other.code, name:other.name, reason:'Mesmo nome/fingerprint' })));
      const fuzzyDuplicate=fuzzyWm10.get(item.code); if(fuzzyDuplicate) wmDuplicates.push(fuzzyDuplicate);
      const uniqueWmDuplicates = [...new Map(wmDuplicates.map(entry => [entry.code, entry])).values()];
      if ((match && match.confidence >= .72) || uniqueWmDuplicates.length) {
        report.review.push({ ...item, match:match ? { productId:match.product.id, name:match.product.name, confidence:match.confidence, reason:match.reason } : null, wmDuplicates:uniqueWmDuplicates, reason:uniqueWmDuplicates.length ? 'Possível duplicidade no WM10' : 'Possível correspondência no Quality' }); continue;
      }
      if (!item.active && item.stock <= 0) report.legacy.push({ ...item, reason:'Inativo e sem estoque — revisar antes de importar' });
      else report.new.push({ ...item, reason:'Sem correspondência encontrada' });
    }
    report.summary = { new:report.new.length, review:report.review.length, existing:report.existing.length, imported:report.imported.length, ignored:report.ignored.length, legacy:report.legacy.length, invalid:report.invalid.length, families:report.familyCount, approvedFamilies:report.approvedFamilyCount };
    // Mantém em memória a triagem já calculada. Importar um único produto não deve
    // reprocessar os ~11 mil itens apenas para validar um código que acabou de ser exibido.
    this.lastAnalysisReport = report;
    writeAtomic(this.reportFile, report);
    return report;
  }

  importableItemsFromLastAnalysis(selectedCodes = []) {
    const selected = [...new Set((selectedCodes || []).map(Number).filter(Number.isFinite))];
    if (!selected.length) return null;
    let report = this.lastAnalysisReport;
    if (!report || !Array.isArray(report.new) || !Array.isArray(report.review) || !Array.isArray(report.legacy)) {
      const persisted = safeJson(this.reportFile, null);
      if (persisted && Array.isArray(persisted.new) && Array.isArray(persisted.review) && Array.isArray(persisted.legacy)) report = persisted;
    }
    if (!report) return null;
    const allowed = new Map([...report.new, ...report.legacy, ...report.review].map(item => [Number(item.code), item]));
    return selected.every(code => allowed.has(code)) ? allowed : null;
  }
  async simulate({ useCache = true, forceRefresh = false } = {}) {
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure a API WM10 antes de simular.');
    const fetched = await this.sourceRows({ preferCache:!forceRefresh && Boolean(useCache), maxAgeMs:null, allowRemoteFallback:true });
    const report = this.analyze(fetched.rows);
    report.pages = fetched.pages; report.declaredTotal = fetched.total;
    report.sourceCached = Boolean(fetched.cached);
    report.sourceCachedAt = fetched.cachedAt || null;
    // A API de categorias não é consultada automaticamente: o retorno de produto não
    // traz o código da categoria e cada chamada ao WM10 é tarifada. Mantemos apenas
    // o último diagnóstico já salvo, quando existir.
    if (Number.isFinite(Number(fetched.categoriesFound))) report.categoriesFound = Number(fetched.categoriesFound);
    return report;
  }
  nextInternalCode(items) {
    let max=0; for (const item of items) { const match=String(item?.erp?.internalCode || item?.code || '').match(/^PRD-(\d+)$/i); if (match) max=Math.max(max, Number(match[1])||0); }
    return `PRD-${max+1}`;
  }
  uniqueSlug(base, items) {
    const raw=slugify(base)||'produto'; let candidate=raw; let n=2;
    const used=new Set(items.map(item=>String(item.slug||'')));
    while(used.has(candidate)){ candidate=`${raw}-${n}`; n+=1; }
    return candidate;
  }
  normalizeFieldOptions(fields = {}, { mode='import' } = {}) {
    const source = fields && typeof fields === 'object' ? fields : {};
    const defaults = mode === 'sync'
      ? { salePrice:false, cost:false, barcode:false, ncm:false, reference:false, brand:false, unit:false, active:false, stock:true, collection:false }
      : { salePrice:true, cost:false, barcode:true, ncm:true, reference:true, brand:true, unit:true, active:true, stock:false, collection:false };
    const value = key => source[key] === undefined ? defaults[key] : source[key] === true || source[key] === 'true' || source[key] === '1' || source[key] === 1;
    return {
      name:mode === 'import',
      salePrice:value('salePrice'), cost:value('cost'), barcode:value('barcode'), ncm:value('ncm'), reference:value('reference'),
      brand:value('brand'), unit:value('unit'), active:value('active'), stock:value('stock'), collection:value('collection')
    };
  }
  applyCatalogKind(product, kind = 'product', serviceCategory = null) {
    const normalized = String(kind || 'product').toLowerCase() === 'service' ? 'service' : 'product';
    product.erp = product.erp && typeof product.erp === 'object' ? product.erp : {};
    product.inventory = product.inventory && typeof product.inventory === 'object' ? product.inventory : {};
    product.migration = product.migration && typeof product.migration === 'object' ? product.migration : {};
    product.migration.catalogKind = normalized;
    if (normalized === 'service') {
      if (!serviceCategory || !serviceCategory.id) throw new Error('Não existe uma Categoria ERP ativa do tipo Serviço. Cadastre uma categoria de serviço antes de importar como serviço.');
      product.erp.categoryId = serviceCategory.id;
      product.erp.category = serviceCategory.code || '';
      product.erp.categoryName = serviceCategory.name || '';
      product.inventory.stockControlled = false;
      product.inventory.allowNegative = false;
      product.stock = 0;
      product.migration.needsErpCategory = false;
    }
    return product;
  }

  buildProduct(item, items, user, fields = {}) {
    const selected=this.normalizeFieldOptions(fields,{mode:'import'});
    const id = Date.now() + Math.floor(Math.random()*1000000);
    const internalCode=this.nextInternalCode(items); const importedAt=new Date().toISOString();
    const inventoryItemId=`PRD-${id}`;
    return {
      id, name:item.name,
      sku:selected.reference ? (item.reference || '') : '', code:internalCode,
      barcode:selected.barcode ? (item.barcode || '') : '', ncm:selected.ncm ? (item.ncm || '') : '', brand:selected.brand ? (item.brand || '') : '',
      slug:this.uniqueSlug(item.name, items), price:selected.salePrice ? item.price : 0, stock:selected.stock ? item.stock : 0,
      image:'', gallery:[], category:'', subcategory:'', tags:[], relatedManualIds:[], crossSellIds:[],
      showPrice:false, featured:false, active:false,
      commercial:{ costPrice:selected.cost ? item.cost : 0, erpPrice:selected.salePrice ? item.price : 0, marketplacePrice:null, promotionalPrice:null, desiredMarginPercent:null, expectedProfit:null, defaultCommissionPercent:null, cashPrice:null, installmentPrice:null, minimumPrice:null, minimumMarginPercent:null, discountPolicy:'inherit', maximumDiscountPercent:null, maximumDiscountAmount:null, requiresAuthorization:false },
      erp:{ sku:selected.reference ? (item.reference || '') : '', internalCode, supplierCode:selected.reference ? (item.reference || '') : '', searchAlias:'', barcode:selected.barcode ? (item.barcode || '') : '', ncm:selected.ncm ? (item.ncm || '') : '', fiscal:{ncm:selected.ncm ? (item.ncm || '') : ''}, brand:selected.brand ? (item.brand || '') : '', unit:selected.unit ? (item.unit || 'UN') : 'UN', category:'', subcategory:'', mainSupplierId:'', preferredSupplierId:'', active:selected.active ? item.active : true },
      virtualStore:{ name:item.name, price:selected.salePrice ? item.price : 0, active:false, seoTitle:'', seoDescription:'', channels:{ lojaVirtual:{enabled:false}, mercadoLivre:{enabled:false}, shopee:{enabled:false}, amazon:{enabled:false}, magalu:{enabled:false} } },
      inventory:{ itemId:inventoryItemId, stockControlled:true, allowNegative:false, minimumQuantity:0, channelAvailability:{ site:{ mode:'disabled', enabled:false, limit:null, physicalSafety:0 } } },
      detailsEnabled:false, showVariationsOnCard:false, descriptionShort:'', descriptionLong:'', variations:{ enabled:false, colors:[], storage:[], ram:[], condition:[], labels:[], combinations:[] },
      integrations:{ wm10:{ productCode:item.code, productCodes:[item.code], originalName:item.name, barcode:item.barcode, ncm:item.ncm, reference:item.reference, color:item.color, size:item.size, brand:item.brand, collection:item.collection, sourceActive:item.active, sourceStock:item.stock, sourceCost:item.cost, sourcePrice:item.price, registeredAt:item.registeredAt, updatedAt:item.updatedAt, importedAt, importedBy:user, lastSyncAt:importedAt, lastSyncFields:Object.keys(selected).filter(key=>selected[key]) } },
      migration:{ origin:'WM10', importedAt, importedBy:user, needsErpCategory:true }
    };
  }
  updateIntegrationSnapshot(product, item, user, fields) {
    product.integrations=product.integrations&&typeof product.integrations==='object'?product.integrations:{};
    const current=product.integrations.wm10||{};
    const codes=[...new Set([...(current.productCodes||[]),current.productCode,item.code].filter(v=>v!==undefined&&v!==null).map(Number).filter(Number.isFinite))];
    const now=new Date().toISOString();
    product.integrations.wm10={...current,productCode:current.productCode??item.code,productCodes:codes,originalName:item.name,barcode:item.barcode,ncm:item.ncm,reference:item.reference,color:item.color,size:item.size,brand:item.brand,collection:item.collection,sourceActive:item.active,sourceStock:item.stock,sourceCost:item.cost,sourcePrice:item.price,registeredAt:item.registeredAt,updatedAt:item.updatedAt,lastSyncAt:now,lastSyncBy:user,lastSyncFields:Object.keys(fields).filter(key=>fields[key])};
    return now;
  }
  applySelectedFields(product, item, fields, user) {
    const selected=this.normalizeFieldOptions(fields,{mode:'sync'});
    if(selected.name) product.name=item.name;
    product.erp=product.erp&&typeof product.erp==='object'?product.erp:{};
    product.commercial=product.commercial&&typeof product.commercial==='object'?product.commercial:{};
    product.inventory=product.inventory&&typeof product.inventory==='object'?product.inventory:{};
    if(selected.salePrice){ product.price=item.price; product.commercial.erpPrice=item.price; }
    if(selected.cost) product.commercial.costPrice=item.cost;
    if(selected.barcode){ product.barcode=item.barcode||''; product.erp.barcode=item.barcode||''; }
    if(selected.ncm&&item.ncm){ product.ncm=item.ncm; product.erp.ncm=item.ncm; product.erp.fiscal=product.erp.fiscal&&typeof product.erp.fiscal==='object'?product.erp.fiscal:{}; product.erp.fiscal.ncm=item.ncm; }
    if(selected.reference){ product.sku=item.reference||''; product.erp.sku=item.reference||''; product.erp.supplierCode=item.reference||''; }
    if(selected.brand){ product.brand=item.brand||''; product.erp.brand=item.brand||''; }
    if(selected.unit) product.erp.unit=item.unit||'UN';
    if(selected.active) product.erp.active=item.active;
    if(selected.collection){ product.erp.collection=item.collection||''; }
    if(selected.stock){
      product.inventory.itemId=product.inventory.itemId||`PRD-${product.id}`;
      product.inventory.stockControlled=true;
      product.inventory.allowNegative=product.inventory.allowNegative===true;
      product.inventory.minimumQuantity=Math.max(0,Number(product.inventory.minimumQuantity)||0);
      product.stock=item.stock;
    }
    this.updateIntegrationSnapshot(product,item,user,selected);
    return selected;
  }
  backupProducts() {
    fs.mkdirSync(this.backupDir,{recursive:true});
    const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const target=path.join(this.backupDir,`products-before-wm10-${stamp}.json`);
    if(fs.existsSync(this.productsFile)) fs.copyFileSync(this.productsFile,target); else writeAtomic(target,{items:[]});
    return target;
  }
  backupInventory() {
    if(!this.inventoryService) return [];
    const files=[this.inventoryService.stockFile,this.inventoryService.movementsFile].filter(Boolean);
    if(!files.length) return [];
    fs.mkdirSync(this.backupDir,{recursive:true}); const stamp=new Date().toISOString().replace(/[:.]/g,'-'); const saved=[];
    for(const file of files){ if(!fs.existsSync(file)) continue; const target=path.join(this.backupDir,`${path.basename(file,'.json')}-before-wm10-${stamp}.json`); fs.copyFileSync(file,target); saved.push(target); }
    return saved;
  }
  applyStock(product, item, user) {
    if(!this.inventoryService) throw new Error('Serviço de estoque não está disponível para sincronização.');
    const inventoryItemId=product?.inventory?.itemId||`PRD-${product.id}`;
    product.inventory=product.inventory||{}; product.inventory.itemId=inventoryItemId; product.inventory.stockControlled=true;
    this.inventoryService.configurarItem({inventoryItemId,minimumQuantity:Number(product.inventory.minimumQuantity)||0});
    const result=this.inventoryService.ajustarEstoque({inventoryItemId,newQuantity:item.stock,origin:'wm10_migration',referenceType:'wm10_product',referenceId:String(item.code),reason:'Ajuste de estoque pela sincronização WM10',reasonCode:'INVENTORY',classification:'inventory',createdBy:user,allowNegative:product.inventory.allowNegative===true});
    product.stock=Number(result?.balance?.physicalQuantity ?? item.stock) || 0;
    return result;
  }
  familyRoleCounts(decision = {}) {
    const roles=decision?.roles&&typeof decision.roles==='object'?decision.roles:{};
    const counts={parent:0,variation:0,duplicate:0,separate:0,ignore:0};
    Object.values(roles).forEach(role=>{if(counts[role]!==undefined)counts[role]+=1;});
    return counts;
  }

  selectedFamilyProfile(parentSource, variationItems = []) {
    const selected=[parentSource,...variationItems].filter(Boolean);
    const detected=selected.map(item=>({item,detected:this.detectVariantAttributes(item)}));
    const dimensions=['color','storage','size','condition','voltage','type'];
    const varying={};
    for(const dimension of dimensions){
      const values=new Set(detected.map(row=>normalizeName(row.detected.attributes?.[dimension]||'')).filter(Boolean));
      varying[dimension]=values.size>1;
      // Se o pai não tem valor e os filhos têm valores diferentes, também é uma dimensão real de variação.
      if(!varying[dimension] && variationItems.length>1){
        const childValues=new Set(detected.slice(1).map(row=>normalizeName(row.detected.attributes?.[dimension]||'')).filter(Boolean));
        varying[dimension]=childValues.size>1;
      }
    }

    const parentDetected=detected[0]?.detected||{attributes:{}};
    const stripFromParent=[];
    for(const dimension of dimensions){
      if(varying[dimension] && parentDetected.attributes?.[dimension]) stripFromParent.push(parentDetected.attributes[dimension]);
    }
    let autoName=text(parentSource?.name);
    for(const value of stripFromParent){
      const normalized=normalizeName(value);
      if(!normalized) continue;
      const escaped=normalized.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
      autoName=normalizeName(autoName).replace(new RegExp(`\\b${escaped}\\b`,'g'),' ').replace(/\s+/g,' ').trim();
    }
    // Mantém capitalização simples/legível do nome de origem quando nada precisou ser removido.
    if(!stripFromParent.length) autoName=text(parentSource?.name);
    else autoName=autoName.split(' ').map(token=>/^IPHONE$/i.test(token)?'iPhone':token).join(' ');

    const parentHasVaryingValue=dimensions.some(dimension=>varying[dimension] && parentDetected.attributes?.[dimension]);
    return { varying, autoName:autoName||text(parentSource?.name), parentHasVaryingValue };
  }

  comboForFamilyItem(item, index, fields = {}, profile = {}) {
    const combo=this.variationComboFromItem(item,index,fields);
    const detected=this.detectVariantAttributes(item);
    const attr=detected.attributes||{};
    const varying=profile.varying||{};
    combo.color=varying.color?(attr.color||''):'';
    combo.storage=varying.storage?(attr.storage||''):'';
    combo.condition=varying.condition?(attr.condition||''):'';
    combo.size=varying.size?(attr.size||''):'';
    combo.voltage=varying.voltage?(attr.voltage||''):'';
    combo.ram=varying.type?(attr.type||''):'';
    combo.label=[combo.color,combo.storage,combo.ram,combo.condition,combo.size,combo.voltage].filter(Boolean).join(' · ');
    return combo;
  }

  applyFamilyStructureToProduct(product, { decision, parentSource, sourceByCode, selectedFields, preserveInventoryIds=true } = {}) {
    const roles=decision?.roles&&typeof decision.roles==='object'?decision.roles:{};
    const parentCode=Number(decision?.parentCode);
    const variationCodes=Object.entries(roles).filter(([,role])=>role==='variation').map(([code])=>Number(code)).filter(Number.isFinite);
    const variationItems=variationCodes.map(code=>sourceByCode.get(code)).filter(Boolean);
    const profile=this.selectedFamilyProfile(parentSource,variationItems);

    const explicitName=decision?.nameEdited===true&&text(decision?.name);
    product.name=explicitName?text(decision.name):profile.autoName;
    product.slug=slugify(product.name)||product.slug;
    product.virtualStore={...(product.virtualStore||{}),name:product.name};

    const comboItems=[...(profile.parentHasVaryingValue?[parentSource]:[]),...variationItems];
    const previousByCode=new Map((product?.variations?.combinations||[]).map(combo=>[Number(combo.wm10Code),combo]));
    const combos=comboItems.map((item,index)=>{
      const combo=this.comboForFamilyItem(item,index,selectedFields,profile);
      const previous=previousByCode.get(Number(item.code));
      if(preserveInventoryIds&&previous?.inventoryItemId) combo.inventoryItemId=previous.inventoryItemId;
      if(preserveInventoryIds&&previous&&Number.isFinite(Number(previous.stock))) combo.stock=Number(previous.stock);
      if(preserveInventoryIds&&previous?.image) combo.image=previous.image;
      return combo;
    });

    const signature=combo=>[combo.color,combo.storage,combo.ram,combo.condition,combo.size,combo.voltage].map(v=>normalizeName(v)).join('|');
    const seen=new Set();
    for(const combo of combos){
      const key=signature(combo);
      if(!key) throw new Error(`A variação ${combo.sourceName||combo.wm10Code} ficou sem atributo variável. Revise pai/filhos.`);
      if(seen.has(key)) throw new Error(`Há duas variações com os mesmos atributos (${combo.label||combo.sourceName}). Marque uma delas como Duplicado ou Não importar.`);
      seen.add(key);
    }

    const colors=[...new Set(combos.map(c=>c.color).filter(Boolean))].map(name=>({name,hex:'',image:''}));
    const storage=[...new Set(combos.map(c=>c.storage).filter(Boolean))];
    const ram=[...new Set(combos.map(c=>c.ram).filter(Boolean))];
    const condition=[...new Set(combos.map(c=>c.condition).filter(Boolean))];
    const labels={};
    if(profile.varying.type) labels.ram='Tipo';
    if(profile.varying.condition) labels.condition='Estado';
    product.variations={enabled:combos.length>0,colors,storage,ram,condition,labels,combinations:combos};
    product.showVariationsOnCard=combos.length>0;
    product.stock=(selectedFields.stock||preserveInventoryIds)?combos.reduce((sum,c)=>sum+(Number(c.stock)||0),0):0;
    return { product, combos, profile, variationCodes };
  }
  variationComboFromItem(item, index, fields = {}) {
    const selected=this.normalizeFieldOptions(fields,{mode:'import'});
    const detected=this.detectVariantAttributes(item);
    const attr=detected.attributes||{};
    const inventoryItemId=`VAR-${Date.now()}-${item.code}-${index+1}`;
    return {
      color:attr.color||'', storage:attr.storage||'', ram:'', condition:attr.condition||'',
      size:attr.size||'', voltage:attr.voltage||'', label:[attr.color,attr.storage,attr.size,attr.condition,attr.voltage].filter(Boolean).join(' · '),
      image:'', stock:selected.stock?Math.max(0,Number(item.stock)||0):0, erpPrice:selected.salePrice?Number(item.price)||0:null, inventoryItemId,
      wm10Code:Number(item.code), barcode:selected.barcode?(item.barcode||''):'', reference:selected.reference?(item.reference||''):'',
      sourceName:item.name, brand:selected.brand?(item.brand||''):'', unit:selected.unit?(item.unit||'UN'):'UN',
      sourceActive:item.active, sourceStock:item.stock, sourcePrice:item.price, sourceCost:item.cost
    };
  }
  applyVariationStock(product, combo, user) {
    if(!this.inventoryService) throw new Error('Serviço de estoque não está disponível para a migração de variações.');
    const inventoryItemId=combo.inventoryItemId;
    this.inventoryService.configurarItem({inventoryItemId,minimumQuantity:0});
    return this.inventoryService.ajustarEstoque({inventoryItemId,newQuantity:Number(combo.stock)||0,origin:'wm10_migration',referenceType:'wm10_product_variation',referenceId:String(combo.wm10Code),reason:'Estoque inicial de variação pela migração WM10',reasonCode:'INVENTORY',classification:'inventory',createdBy:user,allowNegative:false});
  }
  async importApprovedFamilies({ fields = {}, familyIds = [], user='painel' } = {}) {
    const selectedFields=this.normalizeFieldOptions(fields,{mode:'import'});
    const familyState=this.familyState(); familyState.families=familyState.families||{};
    const requestedIds=[...new Set((Array.isArray(familyIds)?familyIds:[]).map(text).filter(Boolean))];
    let entries=Object.entries(familyState.families).filter(([,decision])=>decision?.status==='approved');
    if(requestedIds.length) entries=entries.filter(([id])=>requestedIds.includes(id));
    if(!entries.length) throw new Error('Não há famílias aprovadas para importar. Aprove pelo menos uma família primeiro.');
    if(entries.length>200) throw new Error('Por segurança, importe no máximo 200 famílias por lote.');

    const requiredCodes=[...new Set(entries.flatMap(([,decision])=>Object.entries(decision?.roles&&typeof decision.roles==='object'?decision.roles:{}).filter(([,role])=>['parent','variation','duplicate','separate','ignore'].includes(role)).map(([code])=>Number(code)).filter(Number.isFinite)))];
    const fetched=await this.sourceRows({preferCache:true,requiredCodes,maxAgeMs:null,allowRemoteFallback:false});
    const sourceItems=fetched.rows.map(row=>this.mapRow(row)).filter(item=>Number.isFinite(item.code));
    const sourceByCode=new Map(sourceItems.map(item=>[Number(item.code),item]));

    const data=safeJson(this.productsFile,{version:'1.0',items:[]}); data.items=Array.isArray(data)?data:(data.items||[]);
    const state=this.migrationState(); state.products=state.products||{};
    const backupFile=this.backupProducts(); const inventoryBackups=selectedFields.stock?this.backupInventory():[];
    const outcome={requestedFamilies:entries.length,importedFamilies:0,parentProducts:0,variations:0,separateProducts:0,duplicatesLinked:0,ignored:0,stockAdjusted:0,errors:[],backupFile,inventoryBackups,startedAt:new Date().toISOString(),familyIds:[],importedProducts:[]};

    for(const [familyId,decision] of entries){
      try{
        const roles=decision?.roles&&typeof decision.roles==='object'?decision.roles:{};
        const parentCode=Number(decision.parentCode);
        if(!Number.isFinite(parentCode)||roles[String(parentCode)]!=='parent') throw new Error('Produto pai inválido. Reabra e salve a família novamente.');
        const relevantCodes=Object.entries(roles).filter(([,role])=>['parent','variation','duplicate','separate','ignore'].includes(role)).map(([code])=>Number(code)).filter(Number.isFinite);
        const missing=relevantCodes.filter(code=>!sourceByCode.has(code));
        if(missing.length) throw new Error(`Alguns códigos não retornaram mais pelo WM10: ${missing.slice(0,10).join(', ')}.`);
        const already=relevantCodes.filter(code=>state.products[String(code)]&&['imported','linked'].includes(state.products[String(code)].status));
        if(already.length) throw new Error(`A família contém código(s) já migrado(s): ${already.slice(0,10).join(', ')}. Reabra a família para revisar.`);

        const parentSource=sourceByCode.get(parentCode);
        const parent=this.buildProduct(parentSource,data.items,user,selectedFields);
        this.applyCatalogKind(parent,decision?.kind,decision?.serviceCategory);
        parent.inventory={...(parent.inventory||{}),stockControlled:decision?.kind==='service'?false:true};
        const familyCodes=Object.entries(roles).filter(([,role])=>['parent','variation','duplicate'].includes(role)).map(([code])=>Number(code)).filter(Number.isFinite);
        const structured=this.applyFamilyStructureToProduct(parent,{decision,parentSource,sourceByCode,selectedFields,preserveInventoryIds:false});
        const combos=structured.combos;
        parent.slug=this.uniqueSlug(parent.name,data.items);
        parent.integrations=parent.integrations||{};
        parent.integrations.wm10={...(parent.integrations.wm10||{}),productCode:parentCode,productCodes:[...new Set(familyCodes)],familyId,familyName:parent.name,sourceRecords:familyCodes.map(code=>{const item=sourceByCode.get(code);return item?{code:item.code,name:item.name,barcode:item.barcode,reference:item.reference,color:item.color,size:item.size,stock:item.stock,price:item.price,cost:item.cost,active:item.active}:null;}).filter(Boolean)};
        parent.migration={...(parent.migration||{}),familyId,familyImportedAt:new Date().toISOString()};
        data.items.push(parent); outcome.parentProducts+=1; outcome.importedProducts.push({id:parent.id,code:parent.code,name:parent.name,slug:parent.slug,familyId});

        state.products[String(parentCode)]={status:'imported',productId:parent.id,productCode:parent.code,name:parent.name,at:new Date().toISOString(),by:user,familyId,lastSyncFields:Object.keys(selectedFields).filter(key=>selectedFields[key])};
        combos.forEach((combo,index)=>{
          const code=Number(combo.wm10Code);
          if(code===parentCode){
            state.products[String(code)]={...state.products[String(code)],variationIndex:index,variationInventoryItemId:combo.inventoryItemId};
            return;
          }
          state.products[String(code)]={status:'linked',productId:parent.id,productCode:parent.code,name:parent.name,variationIndex:index,variationInventoryItemId:combo.inventoryItemId,at:new Date().toISOString(),by:user,familyId,lastSyncFields:Object.keys(selectedFields).filter(key=>selectedFields[key])};
        });
        outcome.variations+=Object.values(roles).filter(role=>role==='variation').length;
        for(const [codeRaw,role] of Object.entries(roles)){
          const code=Number(codeRaw); if(!Number.isFinite(code))continue;
          if(role==='duplicate'){
            state.products[String(code)]={status:'linked',productId:parent.id,productCode:parent.code,name:parent.name,duplicateOf:parentCode,at:new Date().toISOString(),by:user,familyId}; outcome.duplicatesLinked+=1;
          } else if(role==='ignore'){
            state.products[String(code)]={status:'ignored',at:new Date().toISOString(),by:user,familyId}; outcome.ignored+=1;
          } else if(role==='separate'){
            const item=sourceByCode.get(code); const standalone=this.buildProduct(item,data.items,user,selectedFields); this.applyCatalogKind(standalone,decision?.kind,decision?.serviceCategory); standalone.inventory={...(standalone.inventory||{}),stockControlled:decision?.kind==='service'?false:true}; data.items.push(standalone);
            state.products[String(code)]={status:'imported',productId:standalone.id,productCode:standalone.code,name:standalone.name,at:new Date().toISOString(),by:user,familyId,lastSyncFields:Object.keys(selectedFields).filter(key=>selectedFields[key])};
            outcome.importedProducts.push({id:standalone.id,code:standalone.code,name:standalone.name,slug:standalone.slug,familyId,separate:true});
            outcome.separateProducts+=1;
            if(selectedFields.stock&&decision?.kind!=='service'){try{this.applyStock(standalone,item,user);outcome.stockAdjusted+=1;}catch(error){outcome.errors.push({familyId,code,message:`Produto separado importado, mas estoque não aplicado: ${error.message}`});}}
          }
        }
        if(selectedFields.stock&&decision?.kind!=='service'){
          for(const combo of combos){try{this.applyVariationStock(parent,combo,user);outcome.stockAdjusted+=1;}catch(error){outcome.errors.push({familyId,code:combo.wm10Code,message:`Variação importada, mas estoque não aplicado: ${error.message}`});}}
        }
        familyState.families[familyId]={...decision,name:parent.name,status:'imported',importedAt:new Date().toISOString(),importedBy:user,productId:parent.id,productCode:parent.code};
        outcome.importedFamilies+=1; outcome.familyIds.push(familyId);
      }catch(error){outcome.errors.push({familyId,message:error.message});}
    }
    writeAtomic(this.productsFile,data);
    state.updatedAt=new Date().toISOString(); writeAtomic(this.stateFile,state);
    familyState.updatedAt=new Date().toISOString(); writeAtomic(this.familyStateFile,familyState);
    outcome.finishedAt=new Date().toISOString(); writeAtomic(this.reportFile,{type:'family-import',...outcome});
    return outcome;
  }

  async repairImportedFamily({ familyId, user='painel' } = {}) {
    const id=text(familyId);
    if(!id) throw new Error('Família inválida.');
    const familyState=this.familyState(); familyState.families=familyState.families||{};
    const decision=familyState.families[id];
    if(!decision||decision.status!=='imported') throw new Error('Esta família ainda não foi importada.');

    const roles=decision?.roles&&typeof decision.roles==='object'?decision.roles:{};
    const parentCode=Number(decision.parentCode);
    if(!Number.isFinite(parentCode)||roles[String(parentCode)]!=='parent') throw new Error('Produto pai inválido nesta família.');

    const relevantCodes=Object.keys(roles).map(Number).filter(Number.isFinite);
    const fetched=await this.sourceRows({preferCache:true,requiredCodes:relevantCodes,maxAgeMs:null,allowRemoteFallback:false});
    const sourceItems=fetched.rows.map(row=>this.mapRow(row)).filter(item=>Number.isFinite(item.code));
    const sourceByCode=new Map(sourceItems.map(item=>[Number(item.code),item]));
    const parentSource=sourceByCode.get(parentCode);
    if(!parentSource) throw new Error(`O produto pai WM10 #${parentCode} não retornou mais pela API.`);

    const data=safeJson(this.productsFile,{version:'1.0',items:[]});
    const items=Array.isArray(data)?data:(data.items||[]);
    const state=this.migrationState(); state.products=state.products||{};
    const stateParent=state.products[String(parentCode)]||{};
    const productId=decision.productId||stateParent.productId;
    const productCode=decision.productCode||stateParent.productCode;
    const product=items.find(item=>String(item?.id||'')===String(productId||'')||String(item?.code||'')===String(productCode||''));
    if(!product) throw new Error('O produto importado desta família não foi localizado no cadastro do Quality.');

    const selectedFields={salePrice:true,barcode:true,ncm:true,reference:true,brand:true,unit:true,active:true,cost:false,stock:false,collection:false};
    const backupFile=this.backupProducts();
    const previousName=product.name;
    const previousSlug=product.slug;
    const structured=this.applyFamilyStructureToProduct(product,{decision,parentSource,sourceByCode,selectedFields,preserveInventoryIds:true});

    const desiredSlug=slugify(product.name);
    if(desiredSlug){
      const used=new Set(items.filter(item=>item!==product).map(item=>String(item?.slug||'').trim()).filter(Boolean));
      let finalSlug=desiredSlug; let suffix=2;
      while(used.has(finalSlug)){finalSlug=`${desiredSlug}-${suffix}`;suffix+=1;}
      product.slug=finalSlug;
    } else product.slug=previousSlug;

    const familyCodes=Object.entries(roles).filter(([,role])=>['parent','variation','duplicate'].includes(role)).map(([code])=>Number(code)).filter(Number.isFinite);
    product.integrations=product.integrations||{};
    product.integrations.wm10={...(product.integrations.wm10||{}),productCode:parentCode,productCodes:[...new Set(familyCodes)],familyId:id,familyName:product.name};
    product.migration={...(product.migration||{}),familyId:id,familyRepairedAt:new Date().toISOString(),familyRepairPreviousName:previousName};

    state.products[String(parentCode)]={...stateParent,status:'imported',productId:product.id,productCode:product.code,name:product.name,familyId:id,at:new Date().toISOString(),by:user};
    structured.combos.forEach((combo,index)=>{
      const code=Number(combo.wm10Code);
      if(code===parentCode){
        state.products[String(code)]={...state.products[String(code)],variationIndex:index,variationInventoryItemId:combo.inventoryItemId};
      } else {
        state.products[String(code)]={...(state.products[String(code)]||{}),status:'linked',productId:product.id,productCode:product.code,name:product.name,variationIndex:index,variationInventoryItemId:combo.inventoryItemId,familyId:id,at:new Date().toISOString(),by:user};
      }
    });
    for(const [codeRaw,role] of Object.entries(roles)){
      const code=Number(codeRaw); if(!Number.isFinite(code)) continue;
      if(role==='duplicate') state.products[String(code)]={...(state.products[String(code)]||{}),status:'linked',productId:product.id,productCode:product.code,name:product.name,duplicateOf:parentCode,familyId:id,at:new Date().toISOString(),by:user};
    }

    familyState.families[id]={...decision,name:product.name,status:'imported',repairedAt:new Date().toISOString(),repairedBy:user,productId:product.id,productCode:product.code};
    familyState.updatedAt=new Date().toISOString();
    state.updatedAt=new Date().toISOString();

    writeAtomic(this.productsFile,data);
    writeAtomic(this.stateFile,state);
    writeAtomic(this.familyStateFile,familyState);
    writeAtomic(this.reportFile,{type:'family-repair',familyId:id,productId:product.id,productCode:product.code,previousName,name:product.name,variations:structured.combos.length,backupFile,at:new Date().toISOString()});
    return {familyId:id,productId:product.id,productCode:product.code,previousName,name:product.name,slug:product.slug,variations:structured.combos.length,backupFile};
  }

  backfillNcmFromCache({ user='painel' } = {}) {
    const cache=this.loadSourceCache({maxAgeMs:null});
    if(!cache?.rows?.length) throw new Error('O cache local de produtos WM10 não está disponível. Atualize os dados do WM10 primeiro.');

    const mappedRows=cache.rows.map(row=>this.mapRow(row)).filter(item=>Number.isFinite(item.code));
    const sourceByCode=new Map(mappedRows.map(item=>[Number(item.code),item]));
    const sourceNcmsByName=new Map();
    for(const item of mappedRows){
      if(!item.ncm) continue;
      const key=normalizeName(item.name); if(!key) continue;
      const set=sourceNcmsByName.get(key)||new Set(); set.add(item.ncm); sourceNcmsByName.set(key,set);
    }

    const state=this.migrationState(); state.products=state.products||{};
    const data=safeJson(this.productsFile,{version:'1.0',items:[]}); const items=Array.isArray(data)?data:(data.items||[]); if(!Array.isArray(data))data.items=items;
    const stateCodesByProduct=new Map();
    for(const [codeRaw,migration] of Object.entries(state.products)){
      if(!migration||!['imported','linked'].includes(migration.status)||!migration.productId)continue;
      const list=stateCodesByProduct.get(String(migration.productId))||[]; list.push(Number(codeRaw)); stateCodesByProduct.set(String(migration.productId),list);
    }

    const categoryData=safeJson(this.erpCategoriesFile,{items:[]});
    const categories=Array.isArray(categoryData)?categoryData:(categoryData.items||[]);
    const categoryByKey=new Map();
    for(const category of categories){
      [category?.id,category?.code].filter(Boolean).forEach(key=>categoryByKey.set(String(key),category));
    }
    const isServiceProduct=product=>categoryByKey.get(String(product?.erp?.categoryId||product?.erp?.category||''))?.type==='service';

    let updated=0,alreadyFilled=0,withoutNcm=0,conflicts=0,serviceSkipped=0,fromWm10=0,fromExactName=0,fromTrustedRule=0,reviewExisting=0,legacySuspectSkipped=0;
    const conflictProducts=[],reviewProducts=[],filledProducts=[];
    const applyNcm=(product,ncm,source,reason='')=>{
      product.ncm=ncm;
      product.erp=product.erp&&typeof product.erp==='object'?product.erp:{};
      product.erp.ncm=ncm;
      product.erp.fiscal=product.erp.fiscal&&typeof product.erp.fiscal==='object'?product.erp.fiscal:{};
      product.erp.fiscal.ncm=ncm;
      product.integrations=product.integrations&&typeof product.integrations==='object'?product.integrations:{};
      product.integrations.wm10={...(product.integrations.wm10||{}),ncm,lastNcmBackfillAt:new Date().toISOString(),lastNcmBackfillBy:user,ncmBackfillSource:source};
      updated+=1;
      if(filledProducts.length<150) filledProducts.push({id:product.id,code:product.code||'',name:product.name||'',ncm,source,reason});
    };

    for(const product of items){
      const productName=product?.name||product?.virtualStore?.name||'';
      const trusted=trustedNcmForName(productName);
      const current=ncmCode(product?.erp?.fiscal?.ncm??product?.erp?.ncm??product?.ncm);

      if(isServiceProduct(product)){
        serviceSkipped+=1;
        if(current && reviewProducts.length<150) reviewProducts.push({id:product.id,code:product.code||'',name:productName,ncm:current,reason:'Produto cadastrado como Serviço; NCM normalmente não se aplica à prestação do serviço.'});
        continue;
      }

      if(current){
        alreadyFilled+=1;
        if(trusted&&trusted.code!==current){
          reviewExisting+=1;
          if(reviewProducts.length<150) reviewProducts.push({id:product.id,code:product.code||'',name:productName,ncm:current,suggestedNcm:trusted.code,reason:trusted.reason});
        }
        continue;
      }

      const integration=product?.integrations?.wm10||{};
      const codes=[...new Set([integration.productCode,...(integration.productCodes||[]),...(stateCodesByProduct.get(String(product.id))||[])].map(Number).filter(Number.isFinite))];
      const ncms=[...new Set(codes.map(code=>sourceByCode.get(code)?.ncm).filter(Boolean))];

      // Nome inequívoco ganha da classificação antiga do WM10. Isso corrige, por
      // exemplo, smartphones que no legado estavam em 8517.62.62/8517.14.x.
      if(trusted){
        applyNcm(product,trusted.code,'regra-segura',trusted.reason);
        fromTrustedRule+=1;
        continue;
      }

      if(ncms.length>1){
        conflicts+=1;
        conflictProducts.push({id:product.id,code:product.code||'',name:productName,ncms});
        continue;
      }
      if(ncms.length===1){
        if(!legacyNcmLooksCompatible(productName,ncms[0])){
          legacySuspectSkipped+=1;
          if(reviewProducts.length<150) reviewProducts.push({id:product.id,code:product.code||'',name:productName,ncm:ncms[0],reason:'NCM do legado WM10 parece incompatível com o tipo de peça; não foi preenchido automaticamente.'});
          continue;
        }
        applyNcm(product,ncms[0],'wm10-vinculo-exato','Mesmo código de produto vinculado ao cadastro WM10.');
        fromWm10+=1;
        continue;
      }

      const byName=[...(sourceNcmsByName.get(normalizeName(productName))||[])];
      if(byName.length===1 && legacyNcmLooksCompatible(productName,byName[0])){
        applyNcm(product,byName[0],'wm10-nome-exato','Nome normalizado idêntico no cache WM10 e apenas um NCM encontrado.');
        fromExactName+=1;
        continue;
      }

      withoutNcm+=1;
    }

    const backupFile=updated?this.backupProducts():null;
    if(updated)writeAtomic(this.productsFile,Array.isArray(data)?items:data);
    const report={type:'ncm-backfill',updated,alreadyFilled,withoutNcm,conflicts,serviceSkipped,fromWm10,fromExactName,fromTrustedRule,reviewExisting,legacySuspectSkipped,conflictProducts:conflictProducts.slice(0,100),reviewProducts:reviewProducts.slice(0,150),filledProducts:filledProducts.slice(0,150),backupFile,sourceCacheAt:cache.createdAt||null,finishedAt:new Date().toISOString()};
    writeAtomic(this.reportFile,report);
    return report;
  }


  async importSelected({ selectedCodes = [], fields = {}, itemKinds = {}, serviceCategory = null, user='painel' } = {}) {
    const selected=[...new Set(selectedCodes.map(Number).filter(Number.isFinite))];
    if(!selected.length) throw new Error('Selecione ao menos um produto para importar.');
    if(selected.length>1000) throw new Error('Por segurança, importe no máximo 1.000 produtos por lote.');
    const selectedFields=this.normalizeFieldOptions(fields,{mode:'import'});
    // Caminho rápido: reutiliza a última triagem que o operador acabou de analisar.
    // Só refaz a análise completa se não houver um relatório compatível em memória/arquivo.
    let allowed=this.importableItemsFromLastAnalysis(selected);
    if(!allowed){
      const fetched=await this.sourceRows({preferCache:true,requiredCodes:selected,maxAgeMs:null,allowRemoteFallback:false});
      const analysis=this.analyze(fetched.rows);
      allowed=new Map([...analysis.new,...analysis.legacy,...analysis.review].map(item=>[Number(item.code),item]));
    }
    // Itens em revisão podem ser importados quando o operador os seleciona explicitamente.
    // A triagem continua avisando sobre possível duplicidade; apenas correspondências exatas ('existing') permanecem bloqueadas.
    const blocked=selected.filter(code=>!allowed.has(code));
    if(blocked.length) throw new Error(`A simulação mudou ou há itens que não podem ser importados diretamente: ${blocked.slice(0,20).join(', ')}${blocked.length>20?'…':''}. Itens já existentes continuam protegidos contra duplicação. Faça nova simulação.`);
    const data=safeJson(this.productsFile,{version:'1.0',items:[]}); data.items=Array.isArray(data)?data:(data.items||[]);
    const backupFile=this.backupProducts(); const inventoryBackups=selectedFields.stock?this.backupInventory():[]; const state=this.migrationState(); state.products=state.products||{};
    const outcome={ requested:selected.length, imported:0, stockAdjusted:0, fields:selectedFields, errors:[], backupFile, inventoryBackups, startedAt:new Date().toISOString(), importedCodes:[] };
    const stockQueue=[];
    for(const code of selected){
      try{
        const item=allowed.get(code); const product=this.buildProduct(item,data.items,user,selectedFields); const kind=String(itemKinds?.[String(code)]||'product').toLowerCase()==='service'?'service':'product'; this.applyCatalogKind(product,kind,serviceCategory); data.items.push(product);
        if(selectedFields.stock&&kind!=='service') stockQueue.push({product,item});
        state.products[String(code)]={status:'imported',productId:product.id,productCode:product.code,name:product.name,at:new Date().toISOString(),by:user,lastSyncFields:Object.keys(selectedFields).filter(key=>selectedFields[key])};
        outcome.imported+=1; outcome.importedCodes.push(code);
      }catch(error){outcome.errors.push({code,message:error.message});}
    }
    writeAtomic(this.productsFile,data);
    if(selectedFields.stock){
      for(const {product,item} of stockQueue){ try{this.applyStock(product,item,user); outcome.stockAdjusted+=1;}catch(error){outcome.errors.push({code:item.code,message:`Produto importado, mas o estoque não foi aplicado: ${error.message}`});} }
      writeAtomic(this.productsFile,data);
    }
    state.updatedAt=new Date().toISOString(); writeAtomic(this.stateFile,state);
    outcome.finishedAt=new Date().toISOString(); writeAtomic(this.reportFile,{type:'import',...outcome});
    return outcome;
  }
  async syncSelected({ selectedCodes = [], fields = {}, user='painel' } = {}) {
    const selected=[...new Set(selectedCodes.map(Number).filter(Number.isFinite))];
    if(!selected.length) throw new Error('Selecione ao menos um produto já migrado para sincronizar.');
    if(selected.length>1000) throw new Error('Por segurança, sincronize no máximo 1.000 produtos por lote.');
    const selectedFields=this.normalizeFieldOptions(fields,{mode:'sync'});
    if(!Object.entries(selectedFields).some(([key,value])=>key!=='name'&&value)) throw new Error('Selecione ao menos um campo para sincronizar.');
    const fetched=await this.sourceRows({preferCache:true,requiredCodes:selected,maxAgeMs:null,allowRemoteFallback:false});
    const source=new Map(fetched.rows.map(row=>this.mapRow(row)).filter(item=>Number.isFinite(item.code)).map(item=>[Number(item.code),item]));
    const state=this.migrationState(); state.products=state.products||{};
    const data=safeJson(this.productsFile,{version:'1.0',items:[]}); const items=Array.isArray(data)?data:(data.items||[]); if(!Array.isArray(data)) data.items=items;
    const backupFile=this.backupProducts(); const inventoryBackups=selectedFields.stock?this.backupInventory():[];
    const outcome={requested:selected.length,synced:0,stockAdjusted:0,fields:selectedFields,errors:[],backupFile,inventoryBackups,startedAt:new Date().toISOString(),syncedCodes:[]};
    for(const code of selected){
      try{
        const migration=state.products[String(code)];
        if(!migration||!['imported','linked'].includes(migration.status)) throw new Error('Este código ainda não foi importado/vinculado no Quality.');
        const item=source.get(code); if(!item) throw new Error('Produto não retornou mais pela API WM10.');
        const product=items.find(row=>String(row.id)===String(migration.productId)); if(!product) throw new Error('Produto vinculado não foi encontrado no Quality.');
        this.applySelectedFields(product,item,selectedFields,user);
        if(selectedFields.stock){this.applyStock(product,item,user);outcome.stockAdjusted+=1;}
        migration.lastSyncAt=new Date().toISOString(); migration.lastSyncBy=user; migration.lastSyncFields=Object.keys(selectedFields).filter(key=>selectedFields[key]); migration.name=product.name;
        outcome.synced+=1; outcome.syncedCodes.push(code);
      }catch(error){outcome.errors.push({code,message:error.message});}
    }
    writeAtomic(this.productsFile,Array.isArray(data)?items:data); state.updatedAt=new Date().toISOString(); writeAtomic(this.stateFile,state);
    outcome.finishedAt=new Date().toISOString(); writeAtomic(this.reportFile,{type:'sync',...outcome});
    return outcome;
  }
  linkExisting({ wm10Code, productId, user='painel' } = {}) {
    const code=Number(wm10Code); if(!Number.isFinite(code)) throw new Error('Código WM10 inválido.');
    const data=safeJson(this.productsFile,{items:[]}); const items=Array.isArray(data)?data:(data.items||[]); const product=items.find(item=>String(item.id)===String(productId));
    if(!product) throw new Error('Produto do Quality não encontrado.');
    product.integrations=product.integrations&&typeof product.integrations==='object'?product.integrations:{}; const current=product.integrations.wm10||{};
    const codes=[...new Set([...(current.productCodes||[]),current.productCode,code].filter(v=>v!==undefined&&v!==null).map(Number).filter(Number.isFinite))];
    product.integrations.wm10={...current,productCode:current.productCode??code,productCodes:codes,lastLinkedAt:new Date().toISOString(),lastLinkedBy:user};
    writeAtomic(this.productsFile,Array.isArray(data)?items:{...data,items});
    const state=this.migrationState(); state.products=state.products||{}; state.products[String(code)]={status:'linked',productId:product.id,productCode:product.code,name:product.name,at:new Date().toISOString(),by:user}; state.updatedAt=new Date().toISOString(); writeAtomic(this.stateFile,state);
    return {code,productId:product.id,name:product.name};
  }
  setDecision({ wm10Code, decision, user='painel' } = {}) {
    const code=Number(wm10Code); if(!Number.isFinite(code)) throw new Error('Código WM10 inválido.');
    if(!['ignored','pending'].includes(decision)) throw new Error('Decisão de migração inválida.');
    const state=this.migrationState(); state.products=state.products||{};
    if(decision==='pending') delete state.products[String(code)];
    else state.products[String(code)]={status:'ignored',at:new Date().toISOString(),by:user};
    state.updatedAt=new Date().toISOString(); writeAtomic(this.stateFile,state); return {code,decision};
  }
  getLastReport(){ return safeJson(this.reportFile,null); }
  getProgress(){ const state=this.migrationState(); const entries=Object.values(state.products||{}); return {handled:entries.length,imported:entries.filter(x=>x.status==='imported').length,linked:entries.filter(x=>x.status==='linked').length,ignored:entries.filter(x=>x.status==='ignored').length,updatedAt:state.updatedAt}; }
}
