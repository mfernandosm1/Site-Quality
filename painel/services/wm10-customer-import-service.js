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
    this.diagnosticLogFile = path.join(this.dataDir, 'logs', 'wm10-import-encoding.log');
    fs.mkdirSync(this.dataDir, { recursive: true });
    if (!fs.existsSync(this.configFile)) this.writeJson(this.configFile, { version:'0.25.0', baseUrl:'https://app.wm10.com.br/quality/sistema/api/cliente/', cnpj:'', token:'', pageSize:100, ignoredCodes:DEFAULT_IGNORED_CODES });
  }

  readJson(file, fallback = {}) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return clone(fallback); } }
  writeJson(file, data) { const tmp = `${file}.tmp`; fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8'); fs.renameSync(tmp, file); }

  getSettings({ includeToken = false } = {}) {
    const value = this.readJson(this.configFile, {});
    return { ...value, token:includeToken ? text(value.token) : '', tokenConfigured:Boolean(text(value.token)), ignoredCodes:Array.isArray(value.ignoredCodes) ? value.ignoredCodes : DEFAULT_IGNORED_CODES };
  }

  saveSettings(payload = {}) {
    const current = this.getSettings({ includeToken:true });
    const ignoredCodes = String(payload.ignoredCodes ?? current.ignoredCodes.join(','))
      .split(',').map(item => Number.parseInt(item.trim(), 10)).filter(Number.isFinite);
    const settings = {
      version:'0.25.0',
      baseUrl:text(payload.baseUrl || current.baseUrl || 'https://app.wm10.com.br/quality/sistema/api/cliente/'),
      cnpj:digits(payload.cnpj || current.cnpj),
      token:text(payload.token) || current.token,
      pageSize:Math.min(500, Math.max(1, Number.parseInt(payload.pageSize, 10) || current.pageSize || 100)),
      ignoredCodes:[...new Set(ignoredCodes.length ? ignoredCodes : DEFAULT_IGNORED_CODES)]
    };
    if (!settings.baseUrl.startsWith('https://')) throw new Error('A URL da API deve utilizar HTTPS.');
    if (!settings.cnpj) throw new Error('Informe o CNPJ da loja.');
    if (!settings.token) throw new Error('Informe o token da API WM10.');
    this.writeJson(this.configFile, settings);
    return this.getSettings();
  }

  buildUrl(settings, params = {}) {
    const url = new URL(settings.baseUrl);
    url.searchParams.set('CNPJ', settings.cnpj);
    url.searchParams.set('TOKEN', settings.token);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && String(value) !== '') url.searchParams.set(key, String(value));
    }
    return url;
  }

  async requestRaw(settings, params = {}) {
    const url = this.buildUrl(settings, params);
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

  parseApiResponse(http) {
    const candidates = this.decodeCandidates(http.raw);
    const selected = candidates.find(item => !item.parseError);
    if (!selected) throw new Error(`A API WM10 retornou conteúdo inválido (HTTP ${http.status}).`);
    if (selected.replacementCount > 0) {
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

  async simulate({ normalizeIndividualNames = true } = {}) {
    const fetched = await this.fetchAll();
    const report = this.analyze(fetched.rows, fetched.settings, { normalizeIndividualNames });
    return { ...report, declaredTotal:fetched.total, pages:fetched.pages, generatedAt:new Date().toISOString() };
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
    const fetched = await this.fetchAll();
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
      startedAt:new Date().toISOString()
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

  getLastReport() { return this.readJson(this.reportFile, null); }
}
