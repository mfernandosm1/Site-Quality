import fs from 'fs';
import path from 'path';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}


const CUSTOMER_FIELD_DEFINITIONS = [
  { key:'personType', label:'Tipo de pessoa', section:'main', locked:true, enabled:true, required:true, order:10 },
  { key:'document', label:'CPF / CNPJ', displayLabelPf:'CPF', displayLabelPj:'CNPJ', section:'main', enabled:true, required:false, order:20 },
  { key:'name', label:'Nome / Razão social', displayLabelPf:'Nome', displayLabelPj:'Razão social', section:'main', locked:true, enabled:true, required:true, order:30 },
  { key:'tradeName', label:'Nome fantasia', section:'main', personType:'pj', enabled:true, required:false, order:40 },
  { key:'stateRegistration', label:'RG / Inscrição estadual', displayLabelPf:'RG', displayLabelPj:'Inscrição estadual', section:'main', enabled:true, required:false, order:50 },
  { key:'companyStatus', label:'Situação cadastral', section:'main', personType:'pj', enabled:true, required:false, order:60 },
  { key:'openingDate', label:'Data de abertura', section:'main', personType:'pj', enabled:true, required:false, order:70 },
  { key:'legalNature', label:'Natureza jurídica', section:'main', personType:'pj', enabled:true, required:false, order:80 },
  { key:'companySize', label:'Porte', section:'main', personType:'pj', enabled:true, required:false, order:90 },
  { key:'primaryCnae', label:'Atividade principal (CNAE)', section:'main', personType:'pj', enabled:true, required:false, order:100 },
  { key:'birthDate', label:'Data de nascimento', section:'main', personType:'pf', enabled:true, required:false, order:110 },
  { key:'monthlyIncome', label:'Renda mensal', section:'main', personType:'pf', enabled:true, required:false, order:112 },
  { key:'profession', label:'Profissão', section:'main', personType:'pf', enabled:true, required:false, order:114 },
  { key:'spouseName', label:'Cônjuge', section:'main', personType:'pf', enabled:true, required:false, order:116 },
  { key:'fatherName', label:'Nome do pai', section:'main', personType:'pf', enabled:true, required:false, order:117 },
  { key:'motherName', label:'Nome da mãe', section:'main', personType:'pf', enabled:true, required:false, order:118 },
  { key:'creditLimit', label:'Limite de crédito', section:'relationship', enabled:true, required:false, order:5 },
  { key:'mobile', label:'Celular / WhatsApp', section:'main', enabled:true, required:false, order:120 },
  { key:'phone', label:'Telefone', section:'main', enabled:true, required:false, order:130 },
  { key:'email', label:'E-mail', section:'main', enabled:true, required:false, order:140 },
  { key:'zipCode', label:'CEP', section:'address', enabled:true, required:false, order:10 },
  { key:'state', label:'Estado', section:'address', enabled:true, required:false, order:20 },
  { key:'street', label:'Endereço', section:'address', enabled:true, required:false, order:30 },
  { key:'number', label:'Número', section:'address', enabled:true, required:false, order:40 },
  { key:'complement', label:'Complemento', section:'address', enabled:true, required:false, order:50 },
  { key:'district', label:'Bairro', section:'address', enabled:true, required:false, order:60 },
  { key:'city', label:'Cidade', section:'address', enabled:true, required:false, order:70 },
  { key:'classificationId', label:'Classificação', section:'relationship', enabled:true, required:false, order:10 },
  { key:'origin', label:'Origem do cliente', section:'relationship', enabled:true, required:false, order:20 },
  { key:'active', label:'Situação', section:'relationship', enabled:true, required:false, order:30 },
  { key:'notes', label:'Observações', section:'relationship', enabled:true, required:false, order:40 }
];

function defaultCustomerFieldSettings() {
  return CUSTOMER_FIELD_DEFINITIONS.map(item => ({ ...item }));
}

function isValidCpf(value = '') {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

function isValidCnpj(value = '') {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (baseLength) => {
    const weights = baseLength === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

export default class CustomerService {
  constructor({ dataDir } = {}) {
    if (!dataDir) throw new Error('CustomerService: dataDir não informado.');
    this.dataDir = path.resolve(dataDir);
    this.customersFile = path.join(this.dataDir, 'customers.json');
    this.classificationsFile = path.join(this.dataDir, 'classifications.json');
    this.settingsFile = path.join(this.dataDir, 'customer-settings.json');
    this._jsonCache = new Map();
    this.ensureStorage();
  }

  ensureStorage() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    this.ensureJsonFile(this.customersFile, { version: '0.12.5', nextCode: 1, items: [] });
    this.ensureJsonFile(this.classificationsFile, {
      version: '0.12.5',
      items: [
        { id: 'none', name: 'Nenhum', order: 0, active: true },
        { id: 'bronze', name: 'Bronze', order: 1, active: true },
        { id: 'prata', name: 'Prata', order: 2, active: true },
        { id: 'ouro', name: 'Ouro', order: 3, active: true },
        { id: 'diamante', name: 'Diamante', order: 4, active: true }
      ]
    });
    this.ensureJsonFile(this.settingsFile, {
      version: '0.26.0',
      fields: defaultCustomerFieldSettings()
    });
    this.migrateFieldSettings();
  }

  ensureJsonFile(file, initialData) {
    if (!fs.existsSync(file)) return this.writeJsonAtomic(file, initialData);
    try {
      const current = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!current || typeof current !== 'object') throw new Error('Estrutura inválida.');
    } catch (_) {
      try { fs.copyFileSync(file, `${file}.invalid-${Date.now()}.bak`); } catch (_) {}
      this.writeJsonAtomic(file, initialData);
    }
  }

  readJson(file, fallback) {
    try {
      const stat = fs.statSync(file);
      const cached = this._jsonCache.get(file);
      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.data;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      this._jsonCache.set(file, { mtimeMs:stat.mtimeMs, size:stat.size, data });
      return data;
    } catch (_) { return clone(fallback); }
  }

  writeJsonAtomic(file, data) {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, file);
    try { const stat=fs.statSync(file); this._jsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data}); } catch (_) { this._jsonCache.delete(file); }
  }

  migrateFieldSettings() {
    const current = this.readJson(this.settingsFile, {});
    const currentFields = Array.isArray(current.fields) ? current.fields : [];
    const legacyVisible = Array.isArray(current.visibleFields) ? current.visibleFields : null;
    const legacyRequired = Array.isArray(current.requiredFields) ? current.requiredFields : [];
    const byKey = new Map(currentFields.map(item => [String(item.key), item]));
    const fields = defaultCustomerFieldSettings().map(definition => {
      const saved = byKey.get(definition.key) || {};
      const enabled = definition.locked ? true : (saved.enabled !== undefined ? saved.enabled !== false : (legacyVisible ? legacyVisible.includes(definition.key) : definition.enabled));
      const required = definition.locked ? true : (saved.required !== undefined ? saved.required === true : legacyRequired.includes(definition.key));
      const displayLabel = String(definition.key === 'street' && normalizeText(saved.displayLabel) === 'rua' ? definition.label : (saved.displayLabel || definition.label)).trim() || definition.label;
      const displayLabelPf = definition.displayLabelPf
        ? String(saved.displayLabelPf || definition.displayLabelPf).trim().slice(0, 80) || definition.displayLabelPf
        : '';
      const displayLabelPj = definition.displayLabelPj
        ? String(saved.displayLabelPj || definition.displayLabelPj).trim().slice(0, 80) || definition.displayLabelPj
        : '';
      return { ...definition, ...saved, key:definition.key, label:definition.label, displayLabel, displayLabelPf, displayLabelPj, section:definition.section, personType:definition.personType || '', locked:Boolean(definition.locked), enabled, required: enabled && required, order:Number(saved.order || definition.order) };
    });
    const normalized = { version:'0.26.0', fields };
    if (JSON.stringify(current) !== JSON.stringify(normalized)) this.writeJsonAtomic(this.settingsFile, normalized);
    return normalized;
  }

  getFieldSettings() {
    return clone(this.migrateFieldSettings());
  }

  saveFieldSettings(payload = {}) {
    const current = this.getFieldSettings();
    const submitted = Array.isArray(payload.fields) ? payload.fields : [];
    const byKey = new Map(submitted.map(item => [String(item.key || ''), item]));
    const fields = current.fields.map(definition => {
      const input = byKey.get(definition.key) || {};
      const enabled = definition.locked ? true : input.enabled === true || input.enabled === 'true';
      const required = definition.locked ? true : enabled && (input.required === true || input.required === 'true');
      const order = Math.max(1, Number.parseInt(input.order, 10) || definition.order || 1);
      const displayLabel = String(input.displayLabel || definition.displayLabel || definition.label).trim().slice(0, 80) || definition.label;
      const displayLabelPf = definition.displayLabelPf
        ? String(input.displayLabelPf || definition.displayLabelPf).trim().slice(0, 80) || definition.displayLabelPf
        : '';
      const displayLabelPj = definition.displayLabelPj
        ? String(input.displayLabelPj || definition.displayLabelPj).trim().slice(0, 80) || definition.displayLabelPj
        : '';
      return { ...definition, displayLabel, displayLabelPf, displayLabelPj, enabled, required, order };
    });
    const result = { version:'0.26.0', fields };
    this.writeJsonAtomic(this.settingsFile, result);
    return clone(result);
  }

  resetFieldSettings() {
    const result = { version:'0.26.0', fields:defaultCustomerFieldSettings() };
    this.writeJsonAtomic(this.settingsFile, result);
    return clone(result);
  }

  listClassifications() {
    const data = this.readJson(this.classificationsFile, { items: [] });
    return (data.items || []).filter(item => item.active !== false).sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
  }

  listCustomers({ includeInactive = true } = {}) {
    const data = this.readJson(this.customersFile, { items: [] });
    return (data.items || [])
      .filter(item => includeInactive || item.active !== false)
      .sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }

  getCustomer(id) {
    const data = this.readJson(this.customersFile, { items: [] });
    return (data.items || []).find(item => String(item.id) === String(id)) || null;
  }

  findDuplicates(payload = {}, excludeId = '') {
    const document = onlyDigits(payload.document);
    const mobile = onlyDigits(payload.mobile);
    const phone = onlyDigits(payload.phone);
    const email = normalizeText(payload.email);
    return this.listCustomers({ includeInactive: true }).filter(item => {
      if (excludeId && String(item.id) === String(excludeId)) return false;
      const sameDocument = document && onlyDigits(item.document) === document;
      const sameMobile = mobile && onlyDigits(item.mobile) === mobile;
      const samePhone = phone && onlyDigits(item.phone) === phone;
      const sameEmail = email && normalizeText(item.email) === email;
      return sameDocument || sameMobile || samePhone || sameEmail;
    }).map(item => ({ id:item.id, code:item.code, name:item.name, document:item.document || '', mobile:item.mobile || '', email:item.email || '', active:item.active !== false }));
  }

  findByDocument(documentValue = '', excludeId = '') {
    const document = onlyDigits(documentValue);
    if (!document) return null;
    return this.listCustomers({ includeInactive: true }).find(item => {
      if (excludeId && String(item.id) === String(excludeId)) return false;
      return onlyDigits(item.document) === document;
    }) || null;
  }

  assertUniqueDocument(customer, excludeId = '') {
    if (!customer.document) return;
    const existing = this.findByDocument(customer.document, excludeId);
    if (!existing) return;

    const label = customer.personType === 'pj' ? 'CNPJ' : 'CPF';
    const error = new Error(
      `${label} já cadastrado para ${existing.name} (código ${existing.code})${existing.active === false ? ' — cliente inativo' : ''}.`
    );
    error.code = 'DOCUMENT_ALREADY_EXISTS';
    error.duplicates = [{
      id: existing.id,
      code: existing.code,
      name: existing.name,
      document: existing.document || '',
      mobile: existing.mobile || '',
      email: existing.email || '',
      active: existing.active !== false
    }];
    throw error;
  }

  sanitize(payload = {}) {
    const personType = payload.personType === 'pj' ? 'pj' : 'pf';
    return {
      personType,
      name: String(payload.name || '').trim(),
      tradeName: personType === 'pj' ? String(payload.tradeName || '').trim() : '',
      document: onlyDigits(payload.document),
      stateRegistration: String(payload.stateRegistration || '').trim(),
      companyStatus: String(payload.companyStatus || '').trim(),
      openingDate: String(payload.openingDate || '').trim(),
      legalNature: String(payload.legalNature || '').trim(),
      companySize: String(payload.companySize || '').trim(),
      primaryCnae: String(payload.primaryCnae || '').trim(),
      birthDate: String(payload.birthDate || '').trim(),
      monthlyIncome: Math.max(0, Number(String(payload.monthlyIncome ?? 0).replace(',', '.')) || 0),
      profession: String(payload.profession || '').trim(),
      spouseName: String(payload.spouseName || '').trim(),
      fatherName: String(payload.fatherName || '').trim(),
      motherName: String(payload.motherName || '').trim(),
      creditLimit: Math.max(0, Number(String(payload.creditLimit ?? 0).replace(',', '.')) || 0),
      phone: onlyDigits(payload.phone),
      mobile: onlyDigits(payload.mobile),
      email: String(payload.email || '').trim().toLowerCase(),
      zipCode: onlyDigits(payload.zipCode),
      street: String(payload.street || '').trim(),
      number: String(payload.number || '').trim(),
      complement: String(payload.complement || '').trim(),
      district: String(payload.district || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim().toUpperCase().slice(0, 2),
      classificationId: String(payload.classificationId || 'none').trim() || 'none',
      origin: String(payload.origin || '').trim(),
      notes: String(payload.notes || '').trim(),
      active: payload.active === false || payload.active === 'false' ? false : true,
      links: {
        whatsappIds: Array.isArray(payload?.links?.whatsappIds) ? payload.links.whatsappIds : [],
        quoteIds: Array.isArray(payload?.links?.quoteIds) ? payload.links.quoteIds : [],
        saleIds: Array.isArray(payload?.links?.saleIds) ? payload.links.saleIds : [],
        serviceOrderIds: Array.isArray(payload?.links?.serviceOrderIds) ? payload.links.serviceOrderIds : []
      }
    };
  }

  validate(customer) {
    if (!customer.name) throw new Error('O nome do cliente é obrigatório.');

    const settings = this.getFieldSettings();
    for (const field of settings.fields || []) {
      if (field.enabled === false || field.required !== true) continue;
      if (field.personType && field.personType !== customer.personType) continue;
      const value = customer[field.key];
      if (value === undefined || value === null || String(value).trim() === '') {
        throw new Error(`O campo ${field.displayLabel || field.label} é obrigatório.`);
      }
    }

    if (customer.document) {
      if (customer.personType === 'pf' && !isValidCpf(customer.document)) {
        throw new Error('CPF inválido. Confira os números informados.');
      }
      if (customer.personType === 'pj' && !isValidCnpj(customer.document)) {
        throw new Error('CNPJ inválido. Confira os números informados.');
      }
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw new Error('E-mail inválido.');
  }

  createCustomer(payload = {}, { createdBy = 'painel', allowDuplicate = false } = {}) {
    const customer = this.sanitize(payload);
    this.validate(customer);
    this.assertUniqueDocument(customer);
    const duplicates = this.findDuplicates(customer);
    if (duplicates.length && !allowDuplicate) {
      const error = new Error('Encontramos um possível cliente duplicado. Revise antes de continuar.');
      error.code = 'POSSIBLE_DUPLICATE';
      error.duplicates = duplicates;
      throw error;
    }
    const data = this.readJson(this.customersFile, { version:'0.12.5', nextCode:1, items:[] });
    const now = new Date().toISOString();
    const nextCode = Math.max(1, Number(data.nextCode) || 1);
    const record = {
      id: `CLI-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      code: String(nextCode).padStart(6, '0'),
      companyId: 'quality-principal',
      ...customer,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy
    };
    data.nextCode = nextCode + 1;
    data.items.push(record);
    this.writeJsonAtomic(this.customersFile, data);
    return record;
  }

  updateCustomer(id, payload = {}, { updatedBy = 'painel', allowDuplicate = false } = {}) {
    const data = this.readJson(this.customersFile, { version:'0.12.5', nextCode:1, items:[] });
    const index = (data.items || []).findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error('Cliente não encontrado.');
    const current = data.items[index];
    const customer = this.sanitize({ ...current, ...payload, links: current.links });
    this.validate(customer);
    this.assertUniqueDocument(customer, id);
    const duplicates = this.findDuplicates(customer, id);
    if (duplicates.length && !allowDuplicate) {
      const error = new Error('Encontramos um possível cliente duplicado. Revise antes de continuar.');
      error.code = 'POSSIBLE_DUPLICATE';
      error.duplicates = duplicates;
      throw error;
    }
    data.items[index] = { ...current, ...customer, updatedAt:new Date().toISOString(), updatedBy };
    this.writeJsonAtomic(this.customersFile, data);
    return data.items[index];
  }

  setActive(id, active, updatedBy = 'painel') {
    const current = this.getCustomer(id);
    if (!current) throw new Error('Cliente não encontrado.');
    return this.updateCustomer(id, { ...current, active: Boolean(active) }, { updatedBy, allowDuplicate:true });
  }

  setActiveMany(ids = [], active = false, updatedBy = 'painel') {
    const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map(id => String(id || '').trim()).filter(Boolean))];
    if (!uniqueIds.length) throw new Error('Selecione ao menos um cliente.');
    const data = this.readJson(this.customersFile, { version:'0.12.5', nextCode:1, items:[] });
    const found = new Set();
    const changedAt = new Date().toISOString();
    data.items = (data.items || []).map(customer => {
      if (!uniqueIds.includes(String(customer.id))) return customer;
      found.add(String(customer.id));
      return { ...customer, active:Boolean(active), updatedAt:changedAt, updatedBy };
    });
    const missing = uniqueIds.filter(id => !found.has(id));
    if (missing.length) throw new Error(`${missing.length} cliente(s) não foram encontrados.`);
    this.writeJsonAtomic(this.customersFile, data);
    return { changed:uniqueIds.length, active:Boolean(active) };
  }
}
