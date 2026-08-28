import fs from 'fs';
import path from 'path';

const DEFAULT_IGNORED_CODES = [2, 755, 759, 760];
const clone = value => JSON.parse(JSON.stringify(value));
const digits = value => String(value ?? '').replace(/\D/g, '');
const isUsableWhatsAppNumber = value => {
  const number = digits(value);
  return number.length >= 10 && number.length <= 13;
};
const chooseWhatsAppContact = ({ mobile = '', phone = '' } = {}) => {
  if (isUsableWhatsAppNumber(mobile)) return { number:digits(mobile), source:'mobile' };
  if (isUsableWhatsAppNumber(phone)) return { number:digits(phone), source:'phone' };
  return { number:'', source:'' };
};
const MOJIBAKE_PATTERN = /(?:Ã[¡-¿]|Â[ -¿]|â(?:€|€™|€œ|€|€“|€”|€¦)|ðŸ)/g;
const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const countMatches = (value, pattern) => (String(value ?? '').match(pattern) || []).length;
const textQuality = value => ({
  replacementCount:countMatches(value, /\uFFFD/g),
  mojibakeCount:countMatches(value, MOJIBAKE_PATTERN),
  controlCount:countMatches(value, CONTROL_PATTERN)
});
const qualityScore = value => {
  const quality = textQuality(value);
  return quality.replacementCount * 10000 + quality.mojibakeCount * 500 + quality.controlCount * 1000;
};
function repairText(value) {
  const original = String(value ?? '');
  const normalized = original.normalize('NFC');
  if (!MOJIBAKE_PATTERN.test(normalized)) { MOJIBAKE_PATTERN.lastIndex = 0; return normalized.trim(); }
  MOJIBAKE_PATTERN.lastIndex = 0;
  try {
    const repaired = Buffer.from(normalized, 'latin1').toString('utf8').normalize('NFC');
    return (qualityScore(repaired) < qualityScore(normalized) ? repaired : normalized).trim();
  } catch (_) {
    return normalized.trim();
  }
}
const text = value => repairText(value);
const unique = values => [...new Set((values || []).map(item => text(item)).filter(Boolean))];
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const normalizeKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const CUSTOMER_OBSERVATION_KEYS = new Set(['obs','observacao','observacoes','observacaocliente','observacoescliente','observacaogeral','observacoesgerais']);
function extractEmails(value) {
  return unique(String(value || '').match(EMAIL_PATTERN) || []).map(item => item.toLowerCase());
}
function extractCustomerObservations(record = {}) {
  const found = [];
  for (const [key, value] of Object.entries(record || {})) {
    if (!CUSTOMER_OBSERVATION_KEYS.has(normalizeKey(key))) continue;
    const clean = text(value);
    if (!clean) continue;
    found.push({ field:key, text:clean });
  }
  const seen = new Set();
  return found.filter(item => {
    const key = normalizeKey(item.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const LOWERCASE_NAME_PARTICLES = new Set(['da','das','de','do','dos','e']);
function capitalizeNamePart(part, { first = false } = {}) {
  const raw = String(part || '').toLocaleLowerCase('pt-BR');
  if (!first && LOWERCASE_NAME_PARTICLES.has(raw)) return raw;
  return raw.replace(/(^|[-'])(\p{L})/gu, (_, separator, letter) => `${separator}${letter.toLocaleUpperCase('pt-BR')}`);
}
function normalizePersonName(value) {
  const original = text(value);
  if (!original) return '';
  const letters = original.replace(/[^\p{L}]/gu, '');
  if (!letters || original !== original.toLocaleUpperCase('pt-BR')) return original;
  return original
    .split(/\s+/)
    .filter(Boolean)
    .map((part, index) => capitalizeNamePart(part, { first:index === 0 }))
    .join(' ')
    .normalize('NFC');
}

function validDate(value) {
  const raw = text(value);
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : raw.slice(0, 10);
}

function isValidCpf(value = '') {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = length => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(value = '') {
  const cnpj = digits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = size => {
    const weights = size === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

export default class Wm10CustomerImportService {
  constructor({ dataDir, customerService, timeoutMs = 30000 } = {}) {
    if (!dataDir || !customerService) throw new Error('Importador WM10: configuração incompleta.');
    this.dataDir = path.resolve(dataDir);
    this.customerService = customerService;
    this.timeoutMs = timeoutMs;
    this.configFile = path.join(this.dataDir, 'wm10-import-settings.json');
    this.reportFile = path.join(this.dataDir, 'wm10-last-import.json');
    this.sourceCacheFile = path.join(this.dataDir, 'wm10-customer-source-cache.json');
    this.legacyDataFile = path.join(this.dataDir, 'wm10-customer-legacy-data.json');
    this.historyDataFile = path.join(this.dataDir, 'wm10-customer-history.json');
    this.archiveRoot = path.join(path.dirname(this.dataDir), 'wm10-arquivo-historico');
    this.archiveManifestFile = path.join(this.archiveRoot, '00_MANIFESTO', 'manifesto.json');
    this.wm10ProductCacheFile = path.join(path.dirname(this.dataDir), 'products', 'wm10-product-source-cache.json');
    this.diagnosticLogFile = path.join(this.dataDir, 'logs', 'wm10-import-encoding.log');
    fs.mkdirSync(this.dataDir, { recursive: true });
    this.ensureSettings();
    this.rollbackLegacyEmailAutofill();
    this.sanitizeLegacySaleObservations();
  }

  readJson(file, fallback = {}) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return clone(fallback); } }
  writeJson(file, data) { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(tmp, file); }

  defaultSettings() {
    return {
      version:'0.27.0',
      baseUrl:'https://app.wm10.com.br/quality/sistema/api/cliente/',
      salesBaseUrl:'https://app.wm10.com.br/quality/sistema/api/venda/',
      cnpj:'', token:'', pageSize:500, salesBatchSize:250,
      ignoredCodes:DEFAULT_IGNORED_CODES
    };
  }

  ensureSettings() {
    const defaults = this.defaultSettings();
    if (!fs.existsSync(this.configFile)) { this.writeJson(this.configFile, defaults); return; }
    const current = this.readJson(this.configFile, {});
    const previousVersion = text(current.version);
    const migratedPageSize = previousVersion && previousVersion !== '0.27.0' && Number(current.pageSize) === 100 ? 500 : Number(current.pageSize);
    const next = {
      ...defaults,
      ...current,
      version:'0.27.0',
      pageSize:Math.min(500, Math.max(1, migratedPageSize || defaults.pageSize)),
      salesBatchSize:Math.min(500, Math.max(25, Number(current.salesBatchSize) || defaults.salesBatchSize)),
      ignoredCodes:Array.isArray(current.ignoredCodes) ? current.ignoredCodes : defaults.ignoredCodes
    };
    if (JSON.stringify(next) !== JSON.stringify(current)) this.writeJson(this.configFile, next);
  }

  getSettings({ includeToken = false } = {}) {
    const defaults = this.defaultSettings();
    const value = { ...defaults, ...this.readJson(this.configFile, {}) };
    return {
      ...value,
      token:includeToken ? text(value.token) : '',
      tokenConfigured:Boolean(text(value.token)),
      pageSize:Math.min(500, Math.max(1, Number(value.pageSize) || defaults.pageSize)),
      salesBatchSize:Math.min(500, Math.max(25, Number(value.salesBatchSize) || defaults.salesBatchSize)),
      ignoredCodes:Array.isArray(value.ignoredCodes) ? value.ignoredCodes : DEFAULT_IGNORED_CODES
    };
  }

  saveSettings(payload = {}) {
    const current = this.getSettings({ includeToken:true });
    const ignoredCodes = String(payload.ignoredCodes ?? current.ignoredCodes.join(','))
      .split(',').map(item => Number.parseInt(item.trim(), 10)).filter(Number.isFinite);
    const settings = {
      version:'0.27.0',
      baseUrl:text(payload.baseUrl || current.baseUrl || this.defaultSettings().baseUrl),
      salesBaseUrl:text(payload.salesBaseUrl || current.salesBaseUrl || this.defaultSettings().salesBaseUrl),
      cnpj:digits(payload.cnpj || current.cnpj),
      token:text(payload.token) || current.token,
      pageSize:Math.min(500, Math.max(1, Number.parseInt(payload.pageSize, 10) || current.pageSize || 500)),
      salesBatchSize:Math.min(500, Math.max(25, Number.parseInt(payload.salesBatchSize, 10) || current.salesBatchSize || 250)),
      ignoredCodes:[...new Set(ignoredCodes.length ? ignoredCodes : DEFAULT_IGNORED_CODES)]
    };
    if (!settings.baseUrl.startsWith('https://') || !settings.salesBaseUrl.startsWith('https://')) throw new Error('As URLs da API devem utilizar HTTPS.');
    if (!settings.cnpj) throw new Error('Informe o CNPJ da loja.');
    if (!settings.token) throw new Error('Informe o token da API WM10.');
    this.writeJson(this.configFile, settings);
    return this.getSettings();
  }

  buildUrl(settings, params = {}, baseUrl = settings.baseUrl) {
    const url = new URL(baseUrl);
    url.searchParams.set('CNPJ', settings.cnpj);
    url.searchParams.set('TOKEN', settings.token);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
    }
    return url;
  }

  async requestRaw(settings, params = {}, baseUrl = settings.baseUrl) {
    const url = this.buildUrl(settings, params, baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { method:'GET', headers:{ Accept:'application/json' }, signal:controller.signal });
      return {
        ok:response.ok,
        status:response.status,
        contentType:text(response.headers.get('content-type')),
        raw:Buffer.from(await response.arrayBuffer())
      };
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('A consulta ao WM10 excedeu o tempo limite.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  decodeCandidates(raw) {
    const candidates = [];
    const add = (encoding, decoded) => {
      if (candidates.some(item => item.decoded === decoded)) return;
      let body = null;
      let parseError = '';
      try { body = JSON.parse(decoded); } catch (error) { parseError = error.message; }
      candidates.push({ encoding, decoded, body, parseError, score:qualityScore(decoded), ...textQuality(decoded) });
    };
    try { add('UTF-8', new TextDecoder('utf-8', { fatal:true }).decode(raw)); } catch (_) {}
    try { add('Windows-1252', new TextDecoder('windows-1252').decode(raw)); } catch (_) {}
    add('ISO-8859-1', raw.toString('latin1'));
    return candidates.sort((a, b) => Number(Boolean(a.parseError)) - Number(Boolean(b.parseError)) || a.score - b.score);
  }

  parseApiResponse(http, { allowReplacement = false } = {}) {
    const candidates = this.decodeCandidates(http.raw);
    const selected = candidates.find(item => !item.parseError);
    if (!selected) throw new Error(`A API WM10 retornou conteúdo inválido (HTTP ${http.status}).`);
    if (selected.replacementCount > 0 && !allowReplacement) {
      throw new Error('A API WM10 retornou o caractere de substituição �. A importação foi bloqueada para não gravar dados incorretos. Use o diagnóstico por registro.');
    }
    if (!http.ok) throw new Error(`Falha na API WM10 (HTTP ${http.status}).`);
    if (!Array.isArray(selected.body)) {
      const causes = Array.isArray(selected.body?.causes) ? `: ${selected.body.causes.join('; ')}` : '';
      throw new Error(`${selected.body?.name || 'Erro retornado pela API WM10'}${causes}`);
    }
    return { body:selected.body, encoding:selected.encoding, candidates };
  }

  async requestPage(page, settings) {
    const http = await this.requestRaw(settings, { pagina:page, limite:settings.pageSize });
    return this.parseApiResponse(http).body;
  }

  diagnosticFields(record = {}) {
    const keys = ['nome','razao','fantasia','cidade','bairro','endereco','complemento','email'];
    return Object.fromEntries(keys.filter(key => record?.[key] !== undefined).map(key => [key, String(record[key] ?? '')]));
  }

  appendDiagnosticLog(diagnostic) {
    fs.mkdirSync(path.dirname(this.diagnosticLogFile), { recursive:true });
    const safe = { ...diagnostic, hexPreview:diagnostic.hexPreview.slice(0, 512) };
    fs.appendFileSync(this.diagnosticLogFile, `${JSON.stringify(safe)}\n`, 'utf8');
  }

  async diagnoseRecord(customerCode) {
    const code = Number.parseInt(customerCode, 10);
    if (!Number.isFinite(code) || code <= 0) throw new Error('Informe um código WM10 válido.');
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure o CNPJ e o token antes de diagnosticar.');
    const http = await this.requestRaw(settings, { cod_cliente:code });
    const candidates = this.decodeCandidates(http.raw);
    const candidateSummaries = candidates.map(candidate => {
      const records = Array.isArray(candidate.body) ? candidate.body : [];
      const record = records.find(item => Number(item?.cod_cliente) === code) || records[0] || null;
      return {
        encoding:candidate.encoding,
        parseOk:!candidate.parseError,
        parseError:candidate.parseError,
        score:candidate.score,
        replacementCount:candidate.replacementCount,
        mojibakeCount:candidate.mojibakeCount,
        controlCount:candidate.controlCount,
        fields:this.diagnosticFields(record)
      };
    });
    const selected = candidates.find(item => !item.parseError) || null;
    const selectedRecords = Array.isArray(selected?.body) ? selected.body : [];
    const selectedRecord = selectedRecords.find(item => Number(item?.cod_cliente) === code) || selectedRecords[0] || null;
    const rawContainsReplacementUtf8 = http.raw.includes(Buffer.from([0xef, 0xbf, 0xbd]));
    const diagnostic = {
      generatedAt:new Date().toISOString(),
      customerCode:code,
      httpStatus:http.status,
      contentType:http.contentType || 'não informado',
      rawLength:http.raw.length,
      hexPreview:http.raw.subarray(0, 256).toString('hex').match(/.{1,2}/g)?.join(' ') || '',
      rawContainsReplacementUtf8,
      selectedEncoding:selected?.encoding || '',
      selectedFields:this.diagnosticFields(selectedRecord),
      candidates:candidateSummaries,
      conclusion:rawContainsReplacementUtf8
        ? 'O byte UTF-8 do caractere � já está presente na resposta bruta da API.'
        : candidateSummaries.some(item => item.parseOk && item.replacementCount === 0)
          ? 'Existe ao menos uma decodificação sem o caractere �. Compare os campos abaixo.'
          : 'Nenhuma decodificação válida eliminou os caracteres problemáticos.'
    };
    this.appendDiagnosticLog(diagnostic);
    return diagnostic;
  }

  async fetchAll() {
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure o CNPJ e o token antes de consultar o WM10.');
    const all = [];
    let page = 1;
    let declaredTotal = null;
    while (page <= 10000) {
      const rows = await this.requestPage(page, settings);
      if (!rows.length) break;
      all.push(...rows);
      const total = Number(rows[0]?.total);
      if (Number.isFinite(total) && total >= 0) declaredTotal = total;
      if (rows.length < settings.pageSize || (declaredTotal !== null && all.length >= declaredTotal)) break;
      page += 1;
    }
    return { rows:all, total:declaredTotal ?? all.length, pages:page, settings };
  }

  mapRecord(row = {}, { normalizeIndividualNames = true } = {}) {
    const personType = Number(row.tipo_pessoa) === 1 ? 'pj' : 'pf';
    const rawDocument = digits(personType === 'pj' ? row.cnpj : row.cpf);
    const documentValid = !rawDocument || (personType === 'pj' ? isValidCnpj(rawDocument) : isValidCpf(rawDocument));
    const originalName = text(personType === 'pj' ? (row.razao || row.nome || row.fantasia) : (row.nome || row.razao));
    const normalizedName = personType === 'pf' && normalizeIndividualNames ? normalizePersonName(originalName) : originalName;
    const phone = digits(`${row.ddi || ''}${row.telefone || ''}`);
    const mobile = digits(`${row.ddi || ''}${row.celular || ''}`);
    const whatsApp = chooseWhatsAppContact({ mobile, phone });
    const mapped = {
      personType,
      name:normalizedName || `Cliente WM10 ${row.cod_cliente}`,
      tradeName:personType === 'pj' ? text(row.fantasia) : '',
      document:documentValid ? rawDocument : '',
      stateRegistration:text(row.inscricao_estadual),
      birthDate:validDate(row.data_Nascimento),
      monthlyIncome:Math.max(0, Number(row.renda_mensal) || 0),
      spouseName:text(row.nome_conjuge), fatherName:text(row.nome_pai), motherName:text(row.nome_mae),
      phone, mobile,
      email:text(row.email).toLowerCase(), zipCode:digits(row.cep), street:text(row.endereco), number:text(row.endereco_numero),
      complement:text(row.complemento), district:text(row.bairro), city:text(row.cidade), state:text(row.estado).toUpperCase().slice(0,2),
      classificationId:'none', origin:'Importação WM10', notes:'', active:Number(row.ativo) !== 0,
      wm10:{
        customerCode:Number(row.cod_cliente), rawDocument, documentValid, originalName, nameNormalized:Boolean(personType === 'pf' && normalizeIndividualNames && originalName && normalizedName !== originalName), foreignDocument:text(row.documento_estrangeiro), sex:text(row.sexo),
        whatsAppNumber:whatsApp.number, whatsAppSource:whatsApp.source,
        countryCode:Number(row.cod_pais) || null, latitude:Number(row.latitude) || null, longitude:Number(row.longitude) || null,
        facebook:text(row.facebook), instagram:text(row.instagram), classificationCode:text(row.cod_cliente_classificacao),
        classificationUpdatedAt:text(row.cod_cliente_classificacao_atualizou), registeredAt:text(row.data_cadastrou), updatedAt:text(row.data_atualizou)
      }
    };
    return mapped;
  }

  analyze(rows, settings, { normalizeIndividualNames = true } = {}) {
    const existing = this.customerService.listCustomers({ includeInactive:true });
    const byExternal = new Map(existing.filter(item => item?.integrations?.wm10?.customerCode !== undefined).map(item => [String(item.integrations.wm10.customerCode), item]));
    const byDocument = new Map(existing.filter(item => digits(item.document)).map(item => [digits(item.document), item]));
    const ignored = new Set((settings.ignoredCodes || DEFAULT_IGNORED_CODES).map(Number));
    const report = { totalFound:rows.length, new:[], updates:[], ignored:[], invalid:[], duplicates:[], withoutWhatsApp:0, whatsAppFromMobile:0, whatsAppFromPhone:0, withoutBirthDate:0, active:0, inactive:0, individuals:0, companies:0 };
    const seenCodes = new Set();
    for (const row of rows) {
      const code = Number(row.cod_cliente);
      if (ignored.has(code)) { report.ignored.push({ code, name:text(row.nome || row.razao), reason:'Código configurado para ignorar' }); continue; }
      if (seenCodes.has(code)) { report.duplicates.push({ code, name:text(row.nome || row.razao), reason:'Código repetido no retorno da API' }); continue; }
      seenCodes.add(code);
      const mapped = this.mapRecord(row, { normalizeIndividualNames });
      if (!mapped.name) { report.invalid.push({ code, name:'', reason:'Nome ausente' }); continue; }
      if (mapped.wm10.rawDocument && !mapped.wm10.documentValid) report.invalid.push({ code, name:mapped.name, reason:'CPF/CNPJ inválido será preservado apenas como dado legado', warning:true });
      if (mapped.wm10.whatsAppSource === 'mobile') report.whatsAppFromMobile += 1;
      else if (mapped.wm10.whatsAppSource === 'phone') report.whatsAppFromPhone += 1;
      else report.withoutWhatsApp += 1;
      if (!mapped.birthDate) report.withoutBirthDate += 1;
      if (mapped.active) report.active += 1; else report.inactive += 1;
      if (mapped.personType === 'pj') report.companies += 1; else report.individuals += 1;
      const matchExternal = byExternal.get(String(code));
      const matchDocument = mapped.document ? byDocument.get(mapped.document) : null;
      const match = matchExternal || matchDocument;
      if (matchExternal && matchDocument && matchExternal.id !== matchDocument.id) {
        report.duplicates.push({ code, name:mapped.name, reason:'Código WM10 e documento apontam para clientes diferentes' });
      } else if (match) {
        report.updates.push({ code, name:mapped.name, document:mapped.document, city:mapped.city, state:mapped.state, customerId:match.id, matchBy:matchExternal ? 'Código WM10' : 'CPF/CNPJ', mapped });
      } else report.new.push({ code, name:mapped.name, document:mapped.document, city:mapped.city, state:mapped.state, mapped });
    }
    report.normalizedNames = [...report.new, ...report.updates].filter(item => item.mapped?.wm10?.nameNormalized).length;
    report.normalizeIndividualNames = Boolean(normalizeIndividualNames);
    return report;
  }

  readSourceCache() {
    const cache = this.readJson(this.sourceCacheFile, null);
    if (!cache || !Array.isArray(cache.rows)) return null;
    return cache;
  }

  getCacheInfo() {
    const cache = this.readSourceCache();
    const settings = this.getSettings();
    const localCount = this.customerService.listCustomers({ includeInactive:true }).length;
    const knownTotal = Number(cache?.total) || Number(this.getLastReport()?.totalFound) || localCount || 0;
    return {
      available:Boolean(cache), updatedAt:cache?.updatedAt || '', total:Number(cache?.total) || 0,
      rows:Array.isArray(cache?.rows) ? cache.rows.length : 0, pages:Number(cache?.pages) || 0,
      pageSize:settings.pageSize,
      estimatedRefreshRequests:knownTotal ? Math.max(1, Math.ceil(knownTotal / settings.pageSize)) : 1,
      estimatedRefreshCost:knownTotal ? Math.max(1, Math.ceil(knownTotal / settings.pageSize)) * 0.01 : 0.01
    };
  }

  async refreshSourceCache() {
    const fetched = await this.fetchAll();
    const cache = {
      version:'1.0', updatedAt:new Date().toISOString(), rows:fetched.rows,
      total:fetched.total, pages:fetched.pages, pageSize:fetched.settings.pageSize
    };
    this.writeJson(this.sourceCacheFile, cache);
    return { ...this.getCacheInfo(), requestCount:fetched.pages, actualCost:fetched.pages * 0.01 };
  }

  sourceFromCache() {
    const cache = this.readSourceCache();
    if (!cache) throw new Error('Ainda não existe snapshot local de clientes do WM10. Use “Atualizar dados do WM10” primeiro.');
    return { rows:cache.rows, total:Number(cache.total) || cache.rows.length, pages:Number(cache.pages) || 0, updatedAt:cache.updatedAt || '', settings:this.getSettings({ includeToken:true }) };
  }

  async simulate({ normalizeIndividualNames = true } = {}) {
    const fetched = this.sourceFromCache();
    const report = this.analyze(fetched.rows, fetched.settings, { normalizeIndividualNames });
    return { ...report, declaredTotal:fetched.total, pages:fetched.pages, sourceUpdatedAt:fetched.updatedAt, generatedAt:new Date().toISOString(), paidRequests:0 };
  }

  backupCustomers() {
    const source = this.customerService.customersFile;
    const backupDir = path.join(this.dataDir, 'backups');
    fs.mkdirSync(backupDir, { recursive:true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupDir, `customers-before-wm10-${stamp}.json`);
    fs.copyFileSync(source, target);
    return target;
  }

  mergePayload(current, mapped) {
    const result = { ...current };
    const fields = ['personType','name','tradeName','document','stateRegistration','birthDate','monthlyIncome','spouseName','fatherName','motherName','phone','mobile','email','zipCode','street','number','complement','district','city','state','active'];
    for (const field of fields) {
      const value = mapped[field];
      if (value !== '' && value !== null && value !== undefined) result[field] = value;
    }
    result.origin = current.origin || mapped.origin;
    return result;
  }

  async importNewOnly({ user = 'painel', normalizeIndividualNames = true, expectedNewCodes = [] } = {}) {
    const fetched = this.sourceFromCache();
    const analysis = this.analyze(fetched.rows, fetched.settings, { normalizeIndividualNames });
    if (analysis.duplicates.length) throw new Error(`Importação bloqueada: existem ${analysis.duplicates.length} conflito(s) que precisam ser revisados.`);

    const expected = [...new Set((expectedNewCodes || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const currentNewCodes = analysis.new.map(item => Number(item.code)).filter(Number.isFinite).sort((a, b) => a - b);
    if (expected.length && JSON.stringify(expected) !== JSON.stringify(currentNewCodes)) {
      throw new Error('A base do WM10 mudou depois da simulação. Faça uma nova simulação antes de importar.');
    }
    if (!analysis.new.length) throw new Error('Nenhum cliente novo foi encontrado para importar.');

    const backupFile = this.backupCustomers();
    const outcome = {
      mode:'new-only',
      imported:0,
      updated:0,
      preservedExisting:analysis.updates.length,
      ignored:analysis.ignored.length,
      warnings:analysis.invalid.length,
      errors:[],
      backupFile,
      startedAt:new Date().toISOString(),
      sourceUpdatedAt:fetched.updatedAt || '',
      paidRequests:0
    };

    for (const item of analysis.new) {
      try {
        const created = this.customerService.createCustomer(item.mapped, { createdBy:user, allowDuplicate:true });
        this.attachIntegration(created.id, item.mapped.wm10, user);
        outcome.imported += 1;
      } catch (error) { outcome.errors.push({ code:item.code, name:item.name, message:error.message }); }
    }

    outcome.finishedAt = new Date().toISOString();
    outcome.totalFound = analysis.totalFound;
    outcome.withoutWhatsApp = analysis.withoutWhatsApp;
    outcome.whatsAppFromMobile = analysis.whatsAppFromMobile;
    outcome.whatsAppFromPhone = analysis.whatsAppFromPhone;
    outcome.withoutBirthDate = analysis.withoutBirthDate;
    outcome.normalizedNames = analysis.new.filter(item => item.mapped?.wm10?.nameNormalized).length;
    outcome.normalizeIndividualNames = analysis.normalizeIndividualNames;
    this.writeJson(this.reportFile, outcome);
    return outcome;
  }

  async importAll(options = {}) {
    return this.importNewOnly(options);
  }

  attachIntegration(customerId, wm10, user) {
    const file = this.customerService.customersFile;
    const data = this.readJson(file, { version:'0.12.5', nextCode:1, items:[] });
    const index = (data.items || []).findIndex(item => String(item.id) === String(customerId));
    if (index < 0) throw new Error('Cliente importado não encontrado para vinculação WM10.');
    data.items[index] = {
      ...data.items[index],
      integrations:{ ...(data.items[index].integrations || {}), wm10:{ ...wm10, importedAt:new Date().toISOString(), importedBy:user } },
      updatedAt:new Date().toISOString(), updatedBy:user
    };
    this.writeJson(file, data);
  }

  rollbackLegacyEmailAutofill() {
    // v0.26.2: a migração de legado deve ser 100% somente leitura em relação
    // ao cadastro mestre. A versão anterior preencheu e-mails que estavam
    // vazios; este rollback desfaz APENAS esses preenchimentos identificados
    // pelo marcador wm10LegacyEmailFilledAt e somente se o cliente não foi
    // editado depois da migração.
    const file = this.customerService.customersFile;
    if (!file || !fs.existsSync(file) || !fs.existsSync(this.legacyDataFile)) return { reverted:0, preserved:0 };
    const data = this.readJson(file, { items:[] });
    const store = this.readJson(this.legacyDataFile, { customers:{} });
    let reverted = 0;
    let preserved = 0;
    const now = new Date().toISOString();
    for (const customer of data.items || []) {
      const marker = text(customer?.migration?.wm10LegacyEmailFilledAt);
      if (!marker) continue;
      const currentEmail = text(customer.email).toLowerCase();
      const entry = store.customers?.[customer.id] || {};
      const legacyEmails = new Set((entry.emails || []).map(item => text(item).toLowerCase()).filter(Boolean));
      const untouchedSinceAutofill = text(customer.updatedAt) === marker;
      if (!untouchedSinceAutofill || !currentEmail || !legacyEmails.has(currentEmail)) {
        preserved += 1;
        continue;
      }
      customer.email = '';
      customer.updatedAt = now;
      customer.updatedBy = 'wm10-legacy-rollback';
      customer.migration = {
        ...(customer.migration || {}),
        wm10LegacyEmailRollbackAt:now,
        wm10LegacyEmailRollbackValue:currentEmail
      };
      delete customer.migration.wm10LegacyEmailFilledAt;
      reverted += 1;
    }
    if (reverted) {
      const backupDir = path.join(this.dataDir, 'backups');
      fs.mkdirSync(backupDir, { recursive:true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(file, path.join(backupDir, `customers-before-wm10-legacy-email-rollback-${stamp}.json`));
      this.writeJson(file, data);
    }
    return { reverted, preserved };
  }

  sanitizeLegacySaleObservations() {
    // Mantém somente observações de vendas concluídas (estado C), inclusive
    // para os dados já pagos/baixados anteriormente. Não faz chamada à API.
    if (!fs.existsSync(this.legacyDataFile)) return { removed:0 };
    const store = this.readJson(this.legacyDataFile, null);
    if (!store || !store.customers || typeof store.customers !== 'object') return { removed:0 };
    let removed = 0;
    for (const entry of Object.values(store.customers)) {
      const before = Array.isArray(entry.saleObservations) ? entry.saleObservations : [];
      const after = before.filter(item => text(item?.state).toUpperCase() === 'C');
      removed += before.length - after.length;
      entry.saleObservations = after;
      entry.emails = this.collectLegacyEmails(entry);
    }
    if (removed) {
      store.updatedAt = new Date().toISOString();
      store.migration = { ...(store.migration || {}), completedSalesOnlyAt:store.updatedAt };
      this.writeJson(this.legacyDataFile, store);
    }
    return { removed };
  }

  readLegacyData() {
    const fallback = { version:'1.0', updatedAt:'', migration:{ processedCodes:[], startedAt:'', finishedAt:'', lastBatchAt:'' }, customers:{} };
    const data = this.readJson(this.legacyDataFile, fallback);
    data.version = '1.0';
    data.migration = { processedCodes:[], startedAt:'', finishedAt:'', lastBatchAt:'', ...(data.migration || {}) };
    data.customers = data.customers && typeof data.customers === 'object' ? data.customers : {};
    return data;
  }

  localCustomerMaps() {
    // Leia diretamente o arquivo persistido. A sincronizacao de vinculos WM10 pode
    // acontecer imediatamente antes desta rotina; usar listCustomers() aqui pode
    // devolver o cache em memoria anterior e fazer a migracao exibir 0 vinculados.
    const file = this.customerService.customersFile;
    const data = this.readJson(file, { items:[] });
    const customers = Array.isArray(data.items) ? data.items : [];
    const byWm10 = new Map();
    const byDocument = new Map();
    for (const customer of customers) {
      const code = customer?.integrations?.wm10?.customerCode;
      if (code !== undefined && code !== null && String(code) !== '') byWm10.set(String(code), customer);
      const document = digits(customer.document);
      if (document) byDocument.set(document, customer);
    }
    return { customers, byWm10, byDocument };
  }

  resolveLocalCustomer(row, maps) {
    const code = Number(row?.cod_cliente);
    const direct = maps.byWm10.get(String(code));
    if (direct) return direct;
    const mapped = this.mapRecord(row, { normalizeIndividualNames:false });
    return mapped.document ? maps.byDocument.get(mapped.document) || null : null;
  }

  syncMissingWm10Links(rows, user = 'painel') {
    const file = this.customerService.customersFile;
    const data = this.readJson(file, { version:'0.12.5', nextCode:1, items:[] });
    const byWm10 = new Map((data.items || []).filter(item => item?.integrations?.wm10?.customerCode !== undefined).map(item => [String(item.integrations.wm10.customerCode), item]));
    const byDocument = new Map((data.items || []).filter(item => digits(item.document)).map(item => [digits(item.document), item]));
    let changed = 0;
    const now = new Date().toISOString();
    const ignored = new Set((this.getSettings().ignoredCodes || []).map(Number));
    for (const row of rows || []) {
      const code = Number(row?.cod_cliente);
      if (!Number.isFinite(code) || ignored.has(code) || byWm10.has(String(code))) continue;
      const mapped = this.mapRecord(row, { normalizeIndividualNames:false });
      if (!mapped.document) continue;
      const customer = byDocument.get(mapped.document);
      if (!customer) continue;
      customer.integrations = { ...(customer.integrations || {}), wm10:{ ...(customer.integrations?.wm10 || {}), ...mapped.wm10, linkedAt:now, linkedBy:user } };
      customer.updatedAt = now;
      customer.updatedBy = user;
      byWm10.set(String(code), customer);
      changed += 1;
    }
    if (changed) this.writeJson(file, data);
    return changed;
  }

  mergeLegacyCustomerSource(entry, row = {}) {
    const mapped = this.mapRecord(row, { normalizeIndividualNames:false });
    const observations = extractCustomerObservations(row);
    entry.customerObservations = observations;
    entry.source = {
      email:mapped.email || '', phone:mapped.phone || '', mobile:mapped.mobile || '',
      facebook:mapped.wm10.facebook || '', instagram:mapped.wm10.instagram || '',
      foreignDocument:mapped.wm10.foreignDocument || '', sex:mapped.wm10.sex || '',
      registeredAt:mapped.wm10.registeredAt || '', updatedAt:mapped.wm10.updatedAt || ''
    };
    return entry;
  }

  collectLegacyEmails(entry = {}) {
    const values = [entry?.source?.email];
    for (const item of entry.customerObservations || []) values.push(...extractEmails(item.text));
    for (const item of entry.saleObservations || []) values.push(...extractEmails(item.observation));
    return unique(values).map(item => item.toLowerCase());
  }

  enrichBlankEmails(customerIds, store, user = 'painel') {
    const ids = new Set((customerIds || []).map(String));
    if (!ids.size) return 0;
    const file = this.customerService.customersFile;
    const data = this.readJson(file, { version:'0.12.5', nextCode:1, items:[] });
    let changed = 0;
    const now = new Date().toISOString();
    for (const customer of data.items || []) {
      if (!ids.has(String(customer.id)) || text(customer.email)) continue;
      const entry = store.customers?.[customer.id];
      const emails = this.collectLegacyEmails(entry);
      if (emails.length !== 1) continue;
      customer.email = emails[0];
      customer.updatedAt = now;
      customer.updatedBy = user;
      customer.migration = { ...(customer.migration || {}), wm10LegacyEmailFilledAt:now };
      changed += 1;
    }
    if (changed) this.writeJson(file, data);
    return changed;
  }

  prepareLegacyMigration({ user = 'painel' } = {}) {
    const source = this.sourceFromCache();
    this.syncMissingWm10Links(source.rows, user);
    const maps = this.localCustomerMaps();
    const store = this.readLegacyData();
    const linkedCodes = [];
    const now = new Date().toISOString();
    const ignored = new Set((this.getSettings().ignoredCodes || []).map(Number));
    for (const row of source.rows) {
      const code = Number(row?.cod_cliente);
      if (!Number.isFinite(code) || ignored.has(code)) continue;
      const customer = this.resolveLocalCustomer(row, maps);
      if (!customer) continue;
      linkedCodes.push(code);
      const current = store.customers[customer.id] || { customerId:customer.id, wm10CustomerCode:code, customerObservations:[], saleObservations:[], emails:[] };
      current.customerId = customer.id;
      current.wm10CustomerCode = code;
      current.customerName = customer.name || '';
      current.saleObservations = (Array.isArray(current.saleObservations) ? current.saleObservations : []).filter(item => text(item?.state).toUpperCase() === 'C');
      this.mergeLegacyCustomerSource(current, row);
      current.emails = this.collectLegacyEmails(current);
      current.updatedAt = now;
      store.customers[customer.id] = current;
    }
    const uniqueCodes = [...new Set(linkedCodes)].sort((a,b)=>a-b);
    const processed = new Set((store.migration.processedCodes || []).map(Number).filter(Number.isFinite));
    const pending = uniqueCodes.filter(code => !processed.has(code));
    const batchSize = this.getSettings().salesBatchSize;
    store.updatedAt = now;
    store.migration = {
      ...store.migration,
      sourceUpdatedAt:source.updatedAt || '', batchSize,
      totalCodes:uniqueCodes.length, pendingCodes:pending.length,
      startedAt:store.migration.startedAt || (pending.length ? now : ''),
      finishedAt:pending.length ? '' : (store.migration.finishedAt || now)
    };
    this.writeJson(this.legacyDataFile, store);
    const estimatedRequests = pending.length ? Math.ceil(pending.length / batchSize) : 0;
    const legacyEntries = Object.values(store.customers);
    return {
      totalCustomers:uniqueCodes.length, pendingCustomers:pending.length,
      processedCustomers:uniqueCodes.length - pending.length,
      batchSize, estimatedRequests, estimatedCost:estimatedRequests * 0.01,
      sourceUpdatedAt:source.updatedAt || '', complete:pending.length === 0,
      customersWithLegacyData:legacyEntries.filter(item => (item.customerObservations || []).length || (item.saleObservations || []).length).length,
      customerObservationCount:legacyEntries.reduce((sum,item)=>sum+(item.customerObservations || []).length,0),
      saleObservationCount:legacyEntries.reduce((sum,item)=>sum+(item.saleObservations || []).length,0)
    };
  }

  saleObservation(row = {}) {
    const state = text(row.estado).toUpperCase();
    if (state !== 'C') return null;
    const value = text(row.obs ?? row.observacao ?? row.observacao_geral ?? '');
    if (!value) return null;
    return {
      saleCode:String(row.cod_venda ?? row.Cod_venda ?? row.codigo ?? ''),
      date:text(row.data_venda || row.data || ''),
      type:Number(row.tipo_nota), state, observation:value
    };
  }

  async fetchSalesForCustomers(codes, settings) {
    const http = await this.requestRaw(settings, { cod_cliente:codes.join(','), tipo_nota:1, estado:'C' }, settings.salesBaseUrl);
    return this.parseApiResponse(http, { allowReplacement:true }).body;
  }

  async processNextLegacyBatch({ user = 'painel' } = {}) {
    const prepared = this.prepareLegacyMigration({ user });
    if (prepared.complete) return { ...prepared, processedNow:0, requestCount:0, filledEmailsNow:0 };
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure o CNPJ e o token antes de consultar as vendas do WM10.');
    const source = this.sourceFromCache();
    const maps = this.localCustomerMaps();
    const store = this.readLegacyData();
    const processed = new Set((store.migration.processedCodes || []).map(Number).filter(Number.isFinite));
    const ignored = new Set((settings.ignoredCodes || []).map(Number));
    const linkedRows = source.rows
      .map(row => ({ row, code:Number(row?.cod_cliente), customer:this.resolveLocalCustomer(row, maps) }))
      .filter(item => Number.isFinite(item.code) && !ignored.has(item.code) && item.customer && !processed.has(item.code));
    const batch = linkedRows.slice(0, settings.salesBatchSize);
    if (!batch.length) {
      store.migration.finishedAt = new Date().toISOString();
      store.migration.pendingCodes = 0;
      this.writeJson(this.legacyDataFile, store);
      return { ...this.prepareLegacyMigration({ user }), processedNow:0, requestCount:0, filledEmailsNow:0 };
    }

    const batchCodes = batch.map(item => item.code);
    const sales = await this.fetchSalesForCustomers(batchCodes, settings);
    const batchSet = new Set(batchCodes.map(String));
    const salesByCode = new Map();
    for (const sale of sales || []) {
      const code = String(Number(sale?.cod_cliente));
      if (!batchSet.has(code)) continue;
      const observation = this.saleObservation(sale);
      if (!observation) continue;
      if (!salesByCode.has(code)) salesByCode.set(code, []);
      salesByCode.get(code).push(observation);
    }

    const now = new Date().toISOString();
    for (const item of batch) {
      const customer = item.customer;
      const current = store.customers[customer.id] || { customerId:customer.id, wm10CustomerCode:item.code, customerObservations:[], saleObservations:[], emails:[] };
      current.customerId = customer.id;
      current.customerName = customer.name || '';
      current.wm10CustomerCode = item.code;
      this.mergeLegacyCustomerSource(current, item.row);
      const existing = new Map((current.saleObservations || []).map(obs => [`${obs.saleCode}|${obs.date}|${normalizeKey(obs.observation)}`, obs]));
      for (const observation of salesByCode.get(String(item.code)) || []) existing.set(`${observation.saleCode}|${observation.date}|${normalizeKey(observation.observation)}`, observation);
      current.saleObservations = [...existing.values()].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      current.emails = this.collectLegacyEmails(current);
      current.updatedAt = now;
      store.customers[customer.id] = current;
      processed.add(item.code);
    }
    store.updatedAt = now;
    store.migration.processedCodes = [...processed].sort((a,b)=>a-b);
    store.migration.lastBatchAt = now;
    this.writeJson(this.legacyDataFile, store);
    const progress = this.prepareLegacyMigration({ user });
    return { ...progress, processedNow:batch.length, requestCount:1, filledEmailsNow:0 };
  }

  readHistoryData() {
    const fallback = {
      version:'1.0', updatedAt:'',
      migration:{ saleProcessedCodes:[], serviceOrderProcessedCodes:[], startedAt:'', finishedAt:'', lastBatchAt:'', lastType:'' },
      customers:{}
    };
    const data = this.readJson(this.historyDataFile, fallback);
    data.version = '1.0';
    data.migration = {
      saleProcessedCodes:[], serviceOrderProcessedCodes:[], startedAt:'', finishedAt:'', lastBatchAt:'', lastType:'',
      ...(data.migration || {})
    };
    data.customers = data.customers && typeof data.customers === 'object' ? data.customers : {};
    return data;
  }

  wm10ProductMap() {
    const data = this.readJson(this.wm10ProductCacheFile, { rows:[] });
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const map = new Map();
    for (const row of rows) {
      const code = Number(row?.Cod_produto ?? row?.cod_produto);
      if (!Number.isFinite(code)) continue;
      map.set(String(code), {
        code,
        name:text(row?.Nome ?? row?.nome ?? row?.Nome_grade ?? ''),
        description:text(row?.Descricao ?? row?.descricao ?? ''),
        warranty:row?.Garantia ?? row?.garantia ?? null,
        reference:text(row?.Referencia ?? row?.referencia ?? ''),
        barcode:text(row?.Cod_barra ?? row?.cod_barra ?? '')
      });
    }
    return map;
  }

  normalizeHistoryItem(item = {}, productMap = new Map()) {
    const code = Number(item?.cod_produto ?? item?.Cod_produto ?? item?.codigo_produto);
    const product = Number.isFinite(code) ? productMap.get(String(code)) : null;
    const quantity = Number(item?.quantidade ?? item?.Quantidade ?? 0) || 0;
    const unitPrice = Number(item?.valor ?? item?.Valor ?? 0) || 0;
    const originalUnitPrice = Number(item?.valor_original ?? item?.Valor_original ?? unitPrice) || unitPrice;
    return {
      wm10ProductCode:Number.isFinite(code) ? code : null,
      name:product?.name || (Number.isFinite(code) ? `Produto WM10 #${code}` : 'Item legado WM10'),
      description:product?.description || '', reference:product?.reference || '', barcode:product?.barcode || '',
      warranty:product?.warranty ?? null,
      quantity, unitPrice, originalUnitPrice,
      discount:Math.max(0, (originalUnitPrice - unitPrice) * quantity),
      observation:text(item?.observacao_item ?? item?.obs ?? item?.observacao ?? ''),
      purchasePrice:Number(item?.preco_compra ?? item?.Preco_compra ?? 0) || 0,
      purchaseDate:text(item?.compra_data ?? item?.Compra_data ?? ''),
      commission:Number(item?.comissao ?? item?.Comissao ?? 0) || 0,
      wm10UserCode:item?.cod_usuario_executou ?? item?.Cod_usuario_executou ?? null
    };
  }

  normalizeHistoryOperation(row = {}, forcedType, productMap = new Map()) {
    const state = text(row?.estado ?? row?.Estado).toUpperCase();
    if (state !== 'C') return null;
    const typeNumber = Number(row?.tipo_nota ?? row?.Tipo_nota ?? forcedType);
    if (![1,4].includes(typeNumber)) return null;
    const customerCode = Number(row?.cod_cliente ?? row?.Cod_cliente);
    if (!Number.isFinite(customerCode)) return null;
    const saleCode = text(row?.cod_venda ?? row?.Cod_venda ?? row?.codigo ?? row?.Codigo);
    const openedAt = text(row?.data ?? row?.Data ?? '');
    const finalizedAt = text(row?.data_venda ?? row?.Data_venda ?? openedAt);
    const total = Number(row?.total ?? row?.Total ?? 0) || 0;
    const rawItems = Array.isArray(row?.itens) ? row.itens : (Array.isArray(row?.Itens) ? row.Itens : []);
    const items = rawItems.map(item => this.normalizeHistoryItem(item, productMap));
    const seed = [customerCode,typeNumber,saleCode,finalizedAt,total,items.map(i=>`${i.wm10ProductCode}:${i.quantity}:${i.unitPrice}`).join(',')].join('|');
    let hash = 2166136261;
    for (let i=0;i<seed.length;i+=1) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    const stableCode = saleCode || `SEM-COD-${(hash>>>0).toString(16).toUpperCase()}`;
    const paymentsRaw = Array.isArray(row?.pagamentos) ? row.pagamentos : (Array.isArray(row?.Pagamentos) ? row.Pagamentos : []);
    return {
      id:`WM10-${typeNumber}-${stableCode}`,
      origin:'wm10', legacy:true, readOnly:true,
      number:stableCode,
      type:typeNumber === 4 ? 'service_order' : 'sale',
      status:'finalized', operationalStatus:'completed', financialStatus:'legacy',
      createdAt:openedAt || finalizedAt,
      dates:{ openedAt:openedAt || finalizedAt, updatedAt:finalizedAt || openedAt, finalizedAt:finalizedAt || openedAt, cancelledAt:null },
      total, discount:Number(row?.desconto ?? row?.Desconto ?? 0) || 0,
      notes:text(row?.obs ?? row?.Obs ?? row?.observacao ?? ''), details:'',
      items,
      payments:paymentsRaw.map(payment => ({
        paymentMethodName:text(payment?.Forma_pagamento ?? payment?.forma_pagamento ?? payment?.nome ?? ''),
        installment:Number(payment?.Parcela ?? payment?.parcela ?? 0) || 0
      })),
      wm10:{
        operationCode:stableCode, customerCode, typeNumber, state:'C', storeCode:row?.Cod_loja ?? row?.cod_loja ?? null,
        cashboxCode:row?.cod_caixa_loja ?? row?.Cod_caixa_loja ?? null,
        statusCode:row?.cod_status_pedido ?? null, localSaleCode:row?.cod_local_venda ?? null,
        importedAt:new Date().toISOString()
      }
    };
  }

  prepareHistoryMigration({ user = 'painel' } = {}) {
    const source = this.sourceFromCache();
    this.syncMissingWm10Links(source.rows, user);
    const maps = this.localCustomerMaps();
    const ignored = new Set((this.getSettings().ignoredCodes || []).map(Number));
    const linkedCodes = [];
    const customerByCode = {};
    for (const row of source.rows) {
      const code = Number(row?.cod_cliente);
      if (!Number.isFinite(code) || ignored.has(code)) continue;
      const customer = this.resolveLocalCustomer(row, maps);
      if (!customer) continue;
      linkedCodes.push(code);
      customerByCode[String(code)] = { id:customer.id, name:customer.name || '' };
    }
    const uniqueCodes = [...new Set(linkedCodes)].sort((a,b)=>a-b);
    const store = this.readHistoryData();
    const saleDone = new Set((store.migration.saleProcessedCodes || []).map(Number).filter(Number.isFinite));
    const osDone = new Set((store.migration.serviceOrderProcessedCodes || []).map(Number).filter(Number.isFinite));
    const salePending = uniqueCodes.filter(code => !saleDone.has(code));
    const osPending = uniqueCodes.filter(code => !osDone.has(code));
    const batchSize = this.getSettings().salesBatchSize;
    const now = new Date().toISOString();
    const estimatedRequests = Math.ceil(salePending.length / batchSize) + Math.ceil(osPending.length / batchSize);
    const complete = estimatedRequests === 0;
    store.updatedAt = now;
    store.migration = {
      ...store.migration, sourceUpdatedAt:source.updatedAt || '', batchSize, totalCodes:uniqueCodes.length,
      salePendingCodes:salePending.length, serviceOrderPendingCodes:osPending.length,
      startedAt:store.migration.startedAt || (!complete ? now : ''),
      finishedAt:complete ? (store.migration.finishedAt || now) : ''
    };
    this.writeJson(this.historyDataFile, store);
    const operations = Object.values(store.customers || {}).flatMap(entry => Array.isArray(entry.operations) ? entry.operations : []);
    return {
      totalCustomers:uniqueCodes.length,
      processedCustomers:uniqueCodes.filter(code => saleDone.has(code) && osDone.has(code)).length,
      pendingCustomers:uniqueCodes.filter(code => !saleDone.has(code) || !osDone.has(code)).length,
      batchSize, estimatedRequests, estimatedCost:estimatedRequests * 0.01, complete,
      salePendingCustomers:salePending.length, serviceOrderPendingCustomers:osPending.length,
      saleCount:operations.filter(op=>op.type==='sale').length,
      serviceOrderCount:operations.filter(op=>op.type==='service_order').length,
      operationCount:operations.length,
      customersWithHistory:Object.values(store.customers || {}).filter(entry => (entry.operations || []).length).length,
      sourceUpdatedAt:source.updatedAt || ''
    };
  }

  async fetchHistoryForCustomers(codes, settings, typeNumber) {
    const http = await this.requestRaw(settings, { cod_cliente:codes.join(','), tipo_nota:typeNumber, estado:'C' }, settings.salesBaseUrl);
    return this.parseApiResponse(http, { allowReplacement:true }).body;
  }

  async processNextHistoryBatch({ user = 'painel' } = {}) {
    const prepared = this.prepareHistoryMigration({ user });
    if (prepared.complete) return { ...prepared, processedNow:0, requestCount:0 };
    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure o CNPJ e o token antes de consultar o histórico do WM10.');
    const source = this.sourceFromCache();
    const maps = this.localCustomerMaps();
    const ignored = new Set((settings.ignoredCodes || []).map(Number));
    const store = this.readHistoryData();
    const saleDone = new Set((store.migration.saleProcessedCodes || []).map(Number).filter(Number.isFinite));
    const osDone = new Set((store.migration.serviceOrderProcessedCodes || []).map(Number).filter(Number.isFinite));
    const linked = source.rows.map(row=>({ row, code:Number(row?.cod_cliente), customer:this.resolveLocalCustomer(row,maps) }))
      .filter(item=>Number.isFinite(item.code)&&!ignored.has(item.code)&&item.customer);
    let typeNumber = 1;
    let batch = linked.filter(item=>!saleDone.has(item.code)).slice(0,settings.salesBatchSize);
    if (!batch.length) { typeNumber = 4; batch = linked.filter(item=>!osDone.has(item.code)).slice(0,settings.salesBatchSize); }
    if (!batch.length) return { ...this.prepareHistoryMigration({ user }), processedNow:0, requestCount:0 };
    const codes = batch.map(item=>item.code);
    const rows = await this.fetchHistoryForCustomers(codes, settings, typeNumber);
    const productMap = this.wm10ProductMap();
    const batchSet = new Set(codes.map(String));
    const operationsByCode = new Map();
    for (const row of rows || []) {
      const code = String(Number(row?.cod_cliente ?? row?.Cod_cliente));
      if (!batchSet.has(code)) continue;
      const operation = this.normalizeHistoryOperation(row, typeNumber, productMap);
      if (!operation) continue;
      if (!operationsByCode.has(code)) operationsByCode.set(code, []);
      operationsByCode.get(code).push(operation);
    }
    const now = new Date().toISOString();
    for (const item of batch) {
      const current = store.customers[item.customer.id] || { customerId:item.customer.id, wm10CustomerCode:item.code, customerName:item.customer.name || '', operations:[] };
      current.customerId = item.customer.id; current.wm10CustomerCode = item.code; current.customerName = item.customer.name || '';
      const existing = new Map((current.operations || []).map(op=>[String(op.id),op]));
      // Ao reconsultar um tipo, a resposta da API passa a ser a fotografia canônica daquele tipo para esse cliente.
      for (const [key,op] of [...existing.entries()]) if (op.type === (typeNumber===4?'service_order':'sale')) existing.delete(key);
      for (const op of operationsByCode.get(String(item.code)) || []) existing.set(String(op.id),op);
      current.operations = [...existing.values()].sort((a,b)=>String(b.dates?.finalizedAt||b.createdAt||'').localeCompare(String(a.dates?.finalizedAt||a.createdAt||'')));
      current.updatedAt = now;
      store.customers[item.customer.id] = current;
      (typeNumber===1 ? saleDone : osDone).add(item.code);
    }
    store.updatedAt = now;
    store.migration.saleProcessedCodes = [...saleDone].sort((a,b)=>a-b);
    store.migration.serviceOrderProcessedCodes = [...osDone].sort((a,b)=>a-b);
    store.migration.lastBatchAt = now;
    store.migration.lastType = typeNumber===4 ? 'service_order' : 'sale';
    this.writeJson(this.historyDataFile, store);
    const progress = this.prepareHistoryMigration({ user });
    return { ...progress, processedNow:batch.length, requestCount:1, lastType:store.migration.lastType };
  }

  getHistoryForCustomer(customerId) {
    const store = this.readHistoryData();
    const entry = store.customers?.[customerId];
    return Array.isArray(entry?.operations) ? clone(entry.operations) : [];
  }

  getHistoryOperation(customerId, operationId) {
    return this.getHistoryForCustomer(customerId).find(op=>String(op.id)===String(operationId)) || null;
  }

  getLegacyInfo() {
    try { return this.prepareHistoryMigration({ user:'painel' }); }
    catch (_) {
      const store = this.readHistoryData();
      const operations = Object.values(store.customers || {}).flatMap(entry => Array.isArray(entry.operations) ? entry.operations : []);
      return {
        totalCustomers:Number(store.migration?.totalCodes)||0, processedCustomers:0, pendingCustomers:Number(store.migration?.totalCodes)||0,
        batchSize:this.getSettings().salesBatchSize, estimatedRequests:0, estimatedCost:0, complete:Boolean(store.migration?.finishedAt),
        salePendingCustomers:Number(store.migration?.salePendingCodes)||0, serviceOrderPendingCustomers:Number(store.migration?.serviceOrderPendingCodes)||0,
        saleCount:operations.filter(op=>op.type==='sale').length, serviceOrderCount:operations.filter(op=>op.type==='service_order').length,
        operationCount:operations.length, customersWithHistory:Object.values(store.customers||{}).filter(entry=>(entry.operations||[]).length).length
      };
    }
  }

  getLegacyForCustomer(customerId) {
    const customer = this.customerService.getCustomer(customerId);
    if (!customer) return null;
    const store = this.readLegacyData();
    const legacy = store.customers?.[customer.id] || null;
    const integration = customer?.integrations?.wm10 || {};
    return {
      customerId:customer.id,
      wm10CustomerCode:legacy?.wm10CustomerCode ?? integration.customerCode ?? '',
      source:{
        email:legacy?.source?.email || '', phone:legacy?.source?.phone || '', mobile:legacy?.source?.mobile || '',
        facebook:legacy?.source?.facebook || integration.facebook || '', instagram:legacy?.source?.instagram || integration.instagram || '',
        foreignDocument:legacy?.source?.foreignDocument || integration.foreignDocument || '', sex:legacy?.source?.sex || integration.sex || '',
        registeredAt:legacy?.source?.registeredAt || integration.registeredAt || '', updatedAt:legacy?.source?.updatedAt || integration.updatedAt || ''
      },
      emails:legacy?.emails || [],
      customerObservations:legacy?.customerObservations || [],
      saleObservations:(legacy?.saleObservations || []).filter(item => text(item?.state).toUpperCase() === 'C'),
      updatedAt:legacy?.updatedAt || '',
      migrated:Boolean(legacy)
    };
  }


  archiveEndpointUrl(settings, endpoint) {
    const base = new URL(settings.baseUrl);
    const root = base.href.replace(/cliente\/?(?:\?.*)?$/i, '');
    return new URL(String(endpoint).replace(/^\/+/, ''), root).href;
  }

  archiveTaskDefinitions() {
    const txTypes = [
      [0,'consignado'], [1,'venda'], [2,'orcamento'], [3,'venda_loja_virtual'], [4,'ordem_servico'], [5,'pre_venda']
    ];
    const states = [['A','aberta'],['C','concluida'],['D','cancelada'],['E','estornada']];
    const tasks = [
      { id:'clientes-p1', group:'01_CLIENTES', label:'Clientes · página 1', endpoint:'cliente/', params:{ pagina:1 }, paged:true, pageKind:'clientes' },
      { id:'classificacoes', group:'02_CLASSIFICACOES_CLIENTES', label:'Classificações de clientes', endpoint:'classificacao/', params:{} },
      { id:'lojas', group:'03_LOJAS', label:'Lojas', endpoint:'loja/', params:{} },
      { id:'usuarios', group:'04_USUARIOS_VENDEDORES', label:'Usuários / vendedores', endpoint:'usuario/', params:{} },
      { id:'categorias', group:'05_CATEGORIAS_PRODUTOS', label:'Categorias de produtos', endpoint:'Categoria/', params:{} },
      { id:'produtos-p1', group:'06_PRODUTOS', label:'Produtos · página 1', endpoint:'produto/', params:{ pagina:1 }, paged:true, pageKind:'produtos' },
      { id:'fotos-produtos', group:'07_FOTOS_PRODUTOS', label:'Fotos dos produtos', endpoint:'produto_foto/', params:{} },
      { id:'servicos', group:'08_SERVICOS', label:'Serviços', endpoint:'servico/', params:{} }
    ];
    for (const [type, typeName] of txTypes) for (const [state, stateName] of states) tasks.push({
      id:`mov-${type}-${state}`, group:`09_MOVIMENTACOES/${typeName}`, label:`${typeName.replaceAll('_',' ')} · ${stateName}`,
      endpoint:'venda/', params:{ tipo_nota:type, estado:state }
    });
    tasks.push({ id:'notas-fiscais-p1', group:'10_NOTAS_FISCAIS', label:'Notas fiscais · página 1', endpoint:'nota/', params:{ pagina:1 }, paged:true, pageKind:'notas' });
    return tasks;
  }

  readArchiveManifest() {
    const fallback = { version:'1.0', status:'not_started', createdAt:'', updatedAt:'', finishedAt:'', requestCount:0, estimatedCost:0, tasks:[], errors:[] };
    const manifest = this.readJson(this.archiveManifestFile, fallback);
    manifest.tasks = Array.isArray(manifest.tasks) ? manifest.tasks : [];
    manifest.errors = Array.isArray(manifest.errors) ? manifest.errors : [];
    return manifest;
  }

  archiveSafeName(value='') { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase() || 'dados'; }

  initializeArchive({ force = false } = {}) {
    fs.mkdirSync(path.join(this.archiveRoot, '00_MANIFESTO'), { recursive:true });
    let manifest = this.readArchiveManifest();
    if (!force && manifest.tasks.length) return this.getArchiveInfo();
    if (force && fs.existsSync(this.archiveRoot)) {
      const stamp = new Date().toISOString().replace(/[:.]/g,'-');
      const old = `${this.archiveRoot}-anterior-${stamp}`;
      fs.renameSync(this.archiveRoot, old);
      fs.mkdirSync(path.join(this.archiveRoot, '00_MANIFESTO'), { recursive:true });
    }
    const now = new Date().toISOString();
    const pageSize = this.getSettings().pageSize;
    const tasks = this.archiveTaskDefinitions().map(task=>({ ...task, params:{ ...task.params, ...(task.paged ? { limite:pageSize } : {}) }, status:'pending', attempts:0, requestCost:0.01 }));
    manifest = { version:'1.0', name:'Arquivo Histórico WM10', status:'ready', createdAt:now, updatedAt:now, finishedAt:'', requestCount:0, estimatedCost:tasks.length*0.01, tasks, errors:[], apiScope:'Todos os endpoints GET documentados + todas as movimentações em todos os tipos/estados', archiveRoot:this.archiveRoot };
    this.writeJson(this.archiveManifestFile, manifest);
    this.writeArchiveReadme();
    return this.getArchiveInfo();
  }

  writeArchiveReadme() {
    fs.mkdirSync(this.archiveRoot, { recursive:true });
    const body = [
      'ARQUIVO HISTÓRICO WM10 — SOMENTE CONSULTA', '',
      'Esta pasta é independente do banco operacional do Quality ERP.',
      'Nenhum arquivo daqui movimenta estoque, caixa, financeiro, comissão ou cadastros atuais.', '',
      'Pastas:',
      '01_CLIENTES', '02_CLASSIFICACOES_CLIENTES', '03_LOJAS', '04_USUARIOS_VENDEDORES',
      '05_CATEGORIAS_PRODUTOS', '06_PRODUTOS', '07_FOTOS_PRODUTOS', '08_SERVICOS',
      '09_MOVIMENTACOES (todos os tipos e estados)', '10_NOTAS_FISCAIS', '11_DADOS_JA_IMPORTADOS_LOCALMENTE', '',
      'Cada consulta salva uma cópia .json tratada e uma cópia .raw com os bytes recebidos da WM10.',
      'O token da API não é gravado neste arquivo histórico.',
      `Criado em: ${new Date().toISOString()}`
    ].join('\n');
    fs.writeFileSync(path.join(this.archiveRoot, 'LEIA-ME.txt'), body, 'utf8');
  }

  archiveTaskFilename(task) {
    if (task.paged) return `pagina-${String(task.params?.pagina || 1).padStart(4,'0')}`;
    if (task.id.startsWith('mov-')) return this.archiveSafeName(task.label);
    return this.archiveSafeName(task.id);
  }

  addPagedArchiveTasks(manifest, task, rows) {
    if (!task.paged || Number(task.params?.pagina || 1) !== 1 || !Array.isArray(rows) || !rows.length) return;
    const total = Number(rows[0]?.total);
    if (!Number.isFinite(total) || total <= rows.length) return;
    const pageSize = Number(task.params?.limite) || this.getSettings().pageSize;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const existing = new Set(manifest.tasks.map(item=>item.id));
    for (let page=2; page<=pages; page+=1) {
      const id = `${task.pageKind}-p${page}`;
      if (existing.has(id)) continue;
      manifest.tasks.push({ id, group:task.group, label:`${task.pageKind==='clientes'?'Clientes':'Produtos'} · página ${page}`, endpoint:task.endpoint, params:{ pagina:page, limite:pageSize }, paged:true, pageKind:task.pageKind, status:'pending', attempts:0, requestCost:0.01 });
    }
  }

  addNotesArchiveNextPage(manifest, task, rows) {
    if (task.pageKind !== 'notas' || !Array.isArray(rows) || !rows.length) return;
    const currentPage = Math.max(1, Number(task.params?.pagina || 1));
    const total = Number(rows[0]?.total);
    // Se a WM10 informar total, usamos o total para saber exatamente quantas páginas existem.
    if (Number.isFinite(total) && total > 0) {
      const inferredPageSize = Math.max(1, rows.length);
      const pages = Math.max(1, Math.ceil(total / inferredPageSize));
      for (let page=currentPage+1; page<=pages; page+=1) {
        const id=`notas-fiscais-p${page}`;
        if (manifest.tasks.some(item=>item.id===id)) continue;
        manifest.tasks.push({ id, group:'10_NOTAS_FISCAIS', label:`Notas fiscais · página ${page}`, endpoint:'nota/', params:{ pagina:page, limite:this.getSettings().pageSize }, paged:true, pageKind:'notas', status:'pending', attempts:0, requestCost:0.01 });
      }
      return;
    }
    // O endpoint de notas exige pagina, mas a documentação não informa limite/total.
    // Nesse cenário avançamos página a página até a WM10 devolver uma página vazia.
    const nextPage=currentPage+1;
    if (nextPage > 10000) return; // proteção contra loop de API defeituosa
    const id=`notas-fiscais-p${nextPage}`;
    if (!manifest.tasks.some(item=>item.id===id)) manifest.tasks.push({
      id, group:'10_NOTAS_FISCAIS', label:`Notas fiscais · página ${nextPage}`, endpoint:'nota/', params:{ pagina:nextPage, limite:this.getSettings().pageSize }, paged:true, pageKind:'notas', status:'pending', attempts:0, requestCost:0.01
    });
  }

  copyLocalWm10Bases() {
    const dir = path.join(this.archiveRoot, '11_DADOS_JA_IMPORTADOS_LOCALMENTE');
    fs.mkdirSync(dir, { recursive:true });
    const candidates = [
      [this.sourceCacheFile,'clientes-snapshot-local.json'], [this.legacyDataFile,'observacoes-legadas-clientes.json'], [this.historyDataFile,'historico-vendas-os-concluidas.json'], [this.wm10ProductCacheFile,'produtos-snapshot-local.json']
    ];
    for (const [source,name] of candidates) if (source && fs.existsSync(source)) fs.copyFileSync(source, path.join(dir,name));
  }

  async processNextArchiveTask() {
    let manifest = this.readArchiveManifest();
    if (!manifest.tasks.length) { this.initializeArchive(); manifest = this.readArchiveManifest(); }
    const task = manifest.tasks.find(item=>item.status!=='done');
    if (!task) {
      if (manifest.status !== 'complete') {
        manifest.status='complete'; manifest.finishedAt=new Date().toISOString(); manifest.updatedAt=manifest.finishedAt;
        this.copyLocalWm10Bases(); this.writeJson(this.archiveManifestFile, manifest);
      }
      return { ...this.getArchiveInfo(), processedNow:0 };
    }
    // O endpoint produto_foto da WM10 exige cod_produto e não oferece listagem em massa.
    // Não disparamos uma requisição paga por produto automaticamente (milhares de chamadas).
    // Em vez disso, registramos a limitação no arquivo histórico e seguimos com os demais dados.
    if (task.id === 'fotos-produtos') {
      const now = new Date().toISOString();
      const dir = path.join(this.archiveRoot, task.group);
      fs.mkdirSync(dir, { recursive:true });
      const productSnapshot = this.readJson(this.wm10ProductCacheFile, null);
      const products = Array.isArray(productSnapshot) ? productSnapshot : (Array.isArray(productSnapshot?.items) ? productSnapshot.items : (Array.isArray(productSnapshot?.products) ? productSnapshot.products : []));
      const index = products.map(item => ({
        cod_produto: Number(item?.cod_produto ?? item?.Cod_produto ?? item?.codigo ?? item?.id) || null,
        nome: text(item?.nome ?? item?.Nome ?? item?.name)
      })).filter(item => item.cod_produto);
      this.writeJson(path.join(dir, 'indice-produtos-para-fotos.json'), {
        archiveVersion:'1.1', capturedAt:now, endpoint:'produto_foto/',
        note:'A API WM10 exige cod_produto para consultar fotos. A consulta em massa não foi executada automaticamente para evitar uma requisição paga por produto.',
        endpointTemplate:'produto_foto/?cod_produto={COD_PRODUTO}',
        productCount:index.length, products:index
      });
      fs.writeFileSync(path.join(dir, 'LEIA-ME.txt'), [
        'FOTOS DOS PRODUTOS — WM10', '',
        'A API documentada exige o parâmetro cod_produto para este endpoint e não disponibiliza paginação/listagem em massa.',
        'Por segurança de custo, o backup completo NÃO dispara automaticamente uma requisição paga para cada produto.',
        'Foi preservado neste diretório um índice dos códigos de produtos disponíveis localmente para permitir uma coleta seletiva futura, se necessário.',
        'Esta etapa foi concluída sem consumo de requisição.'
      ].join('\n'), 'utf8');
      task.status='done'; task.finishedAt=now; task.rows=index.length; task.encoding='local'; task.bytes=0; task.skippedRemote=true;
      task.skipReason='Endpoint produto_foto exige cod_produto; coleta em massa automática desativada para evitar milhares de requisições pagas.';
      manifest.updatedAt=now;
      manifest.errors=(manifest.errors||[]).filter(item=>item.taskId!==task.id);
      manifest.estimatedCost=manifest.tasks.filter(item=>item.status!=='done' && item.id!=='fotos-produtos').length*0.01;
      manifest.status='running';
      this.writeJson(this.archiveManifestFile, manifest);
      return { ...this.getArchiveInfo(), processedNow:1, lastTask:{ id:task.id,label:task.label,rows:task.rows,localOnly:true } };
    }

    // Compatibilidade com manifestos criados na v0.28.0-v0.28.2: o endpoint nota/
    // da base real exige o parâmetro pagina, embora a documentação não o liste.
    if (task.id === 'notas-fiscais' || task.endpoint === 'nota/') {
      const pageSize = Number(this.getSettings().pageSize) || 500;
      if (!Number(task.params?.pagina)) {
        task.id='notas-fiscais-p1';
        task.label='Notas fiscais · página 1';
      }
      task.params={ ...(task.params||{}), pagina:Number(task.params?.pagina)||1, limite:Number(task.params?.limite)||pageSize };
      task.paged=true;
      task.pageKind='notas';
      manifest.updatedAt=new Date().toISOString();
      this.writeJson(this.archiveManifestFile, manifest);
    }

    const settings = this.getSettings({ includeToken:true });
    if (!settings.cnpj || !settings.token) throw new Error('Configure CNPJ e token antes de executar o arquivo histórico WM10.');
    task.status='running'; task.attempts=Number(task.attempts||0)+1; task.startedAt=new Date().toISOString();
    manifest.status='running'; manifest.updatedAt=task.startedAt; this.writeJson(this.archiveManifestFile, manifest);
    const endpointUrl = this.archiveEndpointUrl(settings, task.endpoint);
    try {
      const http = await this.requestRaw(settings, task.params || {}, endpointUrl);
      const dir = path.join(this.archiveRoot, task.group);
      fs.mkdirSync(dir,{recursive:true});
      const base = this.archiveTaskFilename(task);
      // Sempre preservamos os bytes recebidos antes de tentar interpretar a resposta.
      // Assim, mesmo quando a WM10 responde HTTP 200 com conteúdo não-JSON, nada é perdido.
      fs.writeFileSync(path.join(dir, `${base}.raw`), http.raw);

      let parsed;
      try {
        parsed = this.parseApiResponse(http, { allowReplacement:true });
      } catch (parseError) {
        // Algumas combinações de tipo/estado do endpoint de movimentações retornam HTTP 200,
        // porém com corpo vazio/HTML/texto não-JSON. Isso não deve interromper o backup inteiro.
        // Para movimentações, arquivamos o RAW, registramos aviso e seguimos.
        if (task.id.startsWith('mov-') && Number(http.status) === 200) {
          const now = new Date().toISOString();
          this.writeJson(path.join(dir, `${base}.json`), {
            archiveVersion:'1.2', endpoint:task.endpoint, filters:task.params||{}, capturedAt:now,
            encoding:'raw-only', count:0, data:[],
            warning:'A API WM10 respondeu HTTP 200 com conteúdo não interpretável como JSON. O conteúdo bruto foi preservado no arquivo .raw e esta combinação foi mantida como etapa concluída com aviso.',
            parseError:parseError.message
          });
          task.status='done'; task.finishedAt=now; task.rows=0; task.encoding='raw-only'; task.bytes=http.raw.length;
          task.completedWithWarning=true; task.warning=parseError.message;
          manifest.requestCount=Number(manifest.requestCount||0)+1;
          manifest.updatedAt=now;
          manifest.estimatedCost=manifest.tasks.filter(item=>item.status!=='done').length*0.01;
          manifest.errors=(manifest.errors||[]).filter(item=>item.taskId!==task.id);
          manifest.warnings=[...(manifest.warnings||[]).filter(item=>item.taskId!==task.id),{taskId:task.id,label:task.label,message:parseError.message,at:now}];
          if (!manifest.tasks.some(item=>item.status!=='done')) { manifest.status='complete'; manifest.finishedAt=now; this.copyLocalWm10Bases(); }
          this.writeJson(this.archiveManifestFile, manifest);
          return { ...this.getArchiveInfo(), processedNow:1, lastTask:{ id:task.id,label:task.label,rows:0,warning:true } };
        }

        // Na base real da WM10, o endpoint de notas pode encerrar a paginação retornando
        // HTTP 200 com corpo vazio/HTML/texto não-JSON, em vez de um array JSON vazio.
        // Se páginas anteriores já foram lidas com sucesso, tratamos isso como fim da paginação,
        // preservamos o RAW e concluímos o arquivo sem criar páginas extras nem repetir consultas.
        const notesPage = task.pageKind === 'notas' ? Math.max(1, Number(task.params?.pagina || 1)) : 0;
        if (task.pageKind === 'notas' && notesPage > 1 && Number(http.status) === 200) {
          const now = new Date().toISOString();
          const warning = `Fim da paginação de notas inferido na página ${notesPage}: a WM10 retornou HTTP 200 com conteúdo não-JSON. O corpo bruto foi preservado.`;
          this.writeJson(path.join(dir, `${base}.json`), {
            archiveVersion:'1.3', endpoint:task.endpoint, filters:task.params||{}, capturedAt:now,
            encoding:'raw-only', count:0, data:[], endOfPagination:true,
            warning, parseError:parseError.message
          });
          task.status='done'; task.finishedAt=now; task.rows=0; task.encoding='raw-only'; task.bytes=http.raw.length;
          task.completedWithWarning=true; task.endOfPagination=true; task.warning=warning;
          manifest.requestCount=Number(manifest.requestCount||0)+1;
          manifest.updatedAt=now;
          manifest.errors=(manifest.errors||[]).filter(item=>item.taskId!==task.id);
          manifest.warnings=[...(manifest.warnings||[]).filter(item=>item.taskId!==task.id),{taskId:task.id,label:task.label,message:warning,at:now}];
          manifest.estimatedCost=manifest.tasks.filter(item=>item.status!=='done').length*0.01;
          if (!manifest.tasks.some(item=>item.status!=='done')) {
            manifest.status='complete'; manifest.finishedAt=now; this.copyLocalWm10Bases();
          }
          this.writeJson(this.archiveManifestFile, manifest);
          return { ...this.getArchiveInfo(), processedNow:1, lastTask:{ id:task.id,label:task.label,rows:0,warning:true,endOfPagination:true } };
        }
        throw parseError;
      }
      const rows = parsed.body;
      this.writeJson(path.join(dir, `${base}.json`), {
        archiveVersion:'1.0', endpoint:task.endpoint, filters:task.params||{}, capturedAt:new Date().toISOString(), encoding:parsed.encoding,
        count:Array.isArray(rows)?rows.length:0, data:rows
      });
      this.addPagedArchiveTasks(manifest, task, rows);
      this.addNotesArchiveNextPage(manifest, task, rows);
      task.status='done'; task.finishedAt=new Date().toISOString(); task.rows=Array.isArray(rows)?rows.length:0; task.encoding=parsed.encoding; task.bytes=http.raw.length;
      manifest.requestCount=Number(manifest.requestCount||0)+1;
      manifest.updatedAt=task.finishedAt;
      manifest.estimatedCost=manifest.tasks.filter(item=>item.status!=='done').length*0.01;
      manifest.errors = (manifest.errors||[]).filter(item=>item.taskId!==task.id);
      if (!manifest.tasks.some(item=>item.status!=='done')) { manifest.status='complete'; manifest.finishedAt=task.finishedAt; this.copyLocalWm10Bases(); }
      this.writeJson(this.archiveManifestFile, manifest);
      return { ...this.getArchiveInfo(), processedNow:1, lastTask:{ id:task.id,label:task.label,rows:task.rows } };
    } catch (error) {
      task.status='error'; task.lastError=error.message; task.finishedAt=new Date().toISOString();
      manifest.status='paused'; manifest.updatedAt=task.finishedAt;
      manifest.errors=[...(manifest.errors||[]).filter(item=>item.taskId!==task.id),{taskId:task.id,label:task.label,message:error.message,at:task.finishedAt}];
      this.writeJson(this.archiveManifestFile, manifest);
      throw new Error(`${task.label}: ${error.message}`);
    }
  }

  retryArchiveErrors() {
    const manifest = this.readArchiveManifest();
    let changed=0;
    for (const task of manifest.tasks) if (task.status==='error') { task.status='pending'; task.lastError=''; changed+=1; }
    if (changed) { manifest.status='ready'; manifest.updatedAt=new Date().toISOString(); manifest.errors=[]; this.writeJson(this.archiveManifestFile,manifest); }
    return this.getArchiveInfo();
  }

  getArchiveInfo() {
    const manifest=this.readArchiveManifest();
    const total=manifest.tasks.length;
    const done=manifest.tasks.filter(item=>item.status==='done').length;
    const errors=manifest.tasks.filter(item=>item.status==='error').length;
    const pending=total-done;
    const rowsByGroup={};
    for (const task of manifest.tasks.filter(item=>item.status==='done')) rowsByGroup[task.group]=(rowsByGroup[task.group]||0)+Number(task.rows||0);
    return {
      available:total>0,status:manifest.status||'not_started',totalTasks:total,doneTasks:done,pendingTasks:pending,errorTasks:errors,
      requestCount:Number(manifest.requestCount||0),estimatedRequests:pending,estimatedCost:pending*0.01,actualCost:Number(manifest.requestCount||0)*0.01,
      createdAt:manifest.createdAt||'',updatedAt:manifest.updatedAt||'',finishedAt:manifest.finishedAt||'',archiveRoot:this.archiveRoot,rowsByGroup,
      nextTask:manifest.tasks.find(item=>item.status!=='done')?.label||'',errors:manifest.errors||[]
    };
  }

  getLastReport() { return this.readJson(this.reportFile, null); }
}
