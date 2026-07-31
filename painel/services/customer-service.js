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
      version: '0.12.5',
      requiredFields: ['name'],
      visibleFields: ['personType','name','tradeName','document','stateRegistration','companyStatus','openingDate','legalNature','companySize','primaryCnae','birthDate','phone','mobile','email','zipCode','street','number','complement','district','city','state','classificationId','origin','notes']
    });
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
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (_) { return clone(fallback); }
  }

  writeJsonAtomic(file, data) {
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, file);
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
      tradeName: String(payload.tradeName || '').trim(),
      document: onlyDigits(payload.document),
      stateRegistration: String(payload.stateRegistration || '').trim(),
      companyStatus: String(payload.companyStatus || '').trim(),
      openingDate: String(payload.openingDate || '').trim(),
      legalNature: String(payload.legalNature || '').trim(),
      companySize: String(payload.companySize || '').trim(),
      primaryCnae: String(payload.primaryCnae || '').trim(),
      birthDate: String(payload.birthDate || '').trim(),
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
}
