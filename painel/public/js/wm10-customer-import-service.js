import fs from 'fs';
import path from 'path';

const DEFAULT_IGNORED_CODES = [2, 755, 759, 760];
const clone = value => JSON.parse(JSON.stringify(value));
const digits = value => String(value ?? '').replace(/\D/g, '');
const text = value => String(value ?? '').trim();

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

  async requestPage(page, settings) {
    const url = new URL(settings.baseUrl);
    url.searchParams.set('CNPJ', settings.cnpj);
    url.searchParams.set('TOKEN', settings.token);
    url.searchParams.set('pagina', String(page));
    url.searchParams.set('limite', String(settings.pageSize));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { method:'GET', headers:{ Accept:'application/json' }, signal:controller.signal });
      const bytes = new Uint8Array(await response.arrayBuffer());
      const decode = encoding => new TextDecoder(encoding).decode(bytes);
      const candidates = [decode('utf-8'), decode('windows-1252')];
      const score = value => (value.match(/\uFFFD/g) || []).length + (value.match(/Ã.|Â.|â€|ðŸ/g) || []).length;
      candidates.sort((a, b) => score(a) - score(b));
      let body;
      try { body = JSON.parse(candidates[0]); } catch (_) { throw new Error(`A API WM10 retornou conteúdo inválido (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(`Falha na API WM10 (HTTP ${response.status}).`);
      if (!Array.isArray(body)) {
        const causes = Array.isArray(body?.causes) ? `: ${body.causes.join('; ')}` : '';
        throw new Error(`${body?.name || 'Erro retornado pela API WM10'}${causes}`);
      }
      return body;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('A consulta ao WM10 excedeu o tempo limite.');
      throw error;
    } finally { clearTimeout(timer); }
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

  mapRecord(row = {}) {
    const personType = Number(row.tipo_pessoa) === 1 ? 'pj' : 'pf';
    const rawDocument = digits(personType === 'pj' ? row.cnpj : row.cpf);
    const documentValid = !rawDocument || (personType === 'pj' ? isValidCnpj(rawDocument) : isValidCpf(rawDocument));
    const mapped = {
      personType,
      name:text(personType === 'pj' ? (row.razao || row.nome || row.fantasia) : (row.nome || row.razao)) || `Cliente WM10 ${row.cod_cliente}`,
      tradeName:personType === 'pj' ? text(row.fantasia) : '',
      document:documentValid ? rawDocument : '',
      stateRegistration:text(row.inscricao_estadual),
      birthDate:validDate(row.data_Nascimento),
      monthlyIncome:Math.max(0, Number(row.renda_mensal) || 0),
      spouseName:text(row.nome_conjuge), fatherName:text(row.nome_pai), motherName:text(row.nome_mae),
      phone:digits(`${row.ddi || ''}${row.telefone || ''}`), mobile:digits(`${row.ddi || ''}${row.celular || ''}`),
      email:text(row.email).toLowerCase(), zipCode:digits(row.cep), street:text(row.endereco), number:text(row.endereco_numero),
      complement:text(row.complemento), district:text(row.bairro), city:text(row.cidade), state:text(row.estado).toUpperCase().slice(0,2),
      classificationId:'none', origin:'Importação WM10', notes:'', active:Number(row.ativo) !== 0,
      wm10:{
        customerCode:Number(row.cod_cliente), rawDocument, documentValid, foreignDocument:text(row.documento_estrangeiro), sex:text(row.sexo),
        countryCode:Number(row.cod_pais) || null, latitude:Number(row.latitude) || null, longitude:Number(row.longitude) || null,
        facebook:text(row.facebook), instagram:text(row.instagram), classificationCode:text(row.cod_cliente_classificacao),
        classificationUpdatedAt:text(row.cod_cliente_classificacao_atualizou), registeredAt:text(row.data_cadastrou), updatedAt:text(row.data_atualizou)
      }
    };
    return mapped;
  }

  analyze(rows, settings) {
    const existing = this.customerService.listCustomers({ includeInactive:true });
    const byExternal = new Map(existing.filter(item => item?.integrations?.wm10?.customerCode !== undefined).map(item => [String(item.integrations.wm10.customerCode), item]));
    const byDocument = new Map(existing.filter(item => digits(item.document)).map(item => [digits(item.document), item]));
    const ignored = new Set((settings.ignoredCodes || DEFAULT_IGNORED_CODES).map(Number));
    const report = { totalFound:rows.length, new:[], updates:[], ignored:[], invalid:[], duplicates:[], withoutWhatsApp:0, withoutBirthDate:0, active:0, inactive:0, individuals:0, companies:0 };
    const seenCodes = new Set();
    for (const row of rows) {
      const code = Number(row.cod_cliente);
      if (ignored.has(code)) { report.ignored.push({ code, name:text(row.nome || row.razao), reason:'Código configurado para ignorar' }); continue; }
      if (seenCodes.has(code)) { report.duplicates.push({ code, name:text(row.nome || row.razao), reason:'Código repetido no retorno da API' }); continue; }
      seenCodes.add(code);
      const mapped = this.mapRecord(row);
      if (!mapped.name) { report.invalid.push({ code, name:'', reason:'Nome ausente' }); continue; }
      if (mapped.wm10.rawDocument && !mapped.wm10.documentValid) report.invalid.push({ code, name:mapped.name, reason:'CPF/CNPJ inválido será preservado apenas como dado legado', warning:true });
      if (!mapped.mobile) report.withoutWhatsApp += 1;
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
    return report;
  }

  async simulate() {
    const fetched = await this.fetchAll();
    const report = this.analyze(fetched.rows, fetched.settings);
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

  async importAll({ user = 'painel' } = {}) {
    const fetched = await this.fetchAll();
    const analysis = this.analyze(fetched.rows, fetched.settings);
    if (analysis.duplicates.length) throw new Error(`Importação bloqueada: existem ${analysis.duplicates.length} conflito(s) que precisam ser revisados.`);
    const backupFile = this.backupCustomers();
    const outcome = { imported:0, updated:0, ignored:analysis.ignored.length, warnings:analysis.invalid.length, errors:[], backupFile, startedAt:new Date().toISOString() };
    for (const item of analysis.new) {
      try {
        const created = this.customerService.createCustomer(item.mapped, { createdBy:user, allowDuplicate:true });
        this.attachIntegration(created.id, item.mapped.wm10, user);
        outcome.imported += 1;
      } catch (error) { outcome.errors.push({ code:item.code, name:item.name, message:error.message }); }
    }
    for (const item of analysis.updates) {
      try {
        const current = this.customerService.getCustomer(item.customerId);
        this.customerService.updateCustomer(item.customerId, this.mergePayload(current, item.mapped), { updatedBy:user, allowDuplicate:true });
        this.attachIntegration(item.customerId, item.mapped.wm10, user);
        outcome.updated += 1;
      } catch (error) { outcome.errors.push({ code:item.code, name:item.name, message:error.message }); }
    }
    outcome.finishedAt = new Date().toISOString();
    outcome.totalFound = analysis.totalFound;
    outcome.withoutWhatsApp = analysis.withoutWhatsApp;
    outcome.withoutBirthDate = analysis.withoutBirthDate;
    this.writeJson(this.reportFile, outcome);
    return outcome;
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
