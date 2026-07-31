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

export default class SupplierService {
  constructor({ dataDir } = {}) {
    if (!dataDir) throw new Error('SupplierService: dataDir não informado.');
    this.dataDir = path.resolve(dataDir);
    this.suppliersFile = path.join(this.dataDir, 'suppliers.json');
    this.settingsFile = path.join(this.dataDir, 'supplier-settings.json');
    this.ensureStorage();
  }

  ensureStorage() {
    fs.mkdirSync(this.dataDir, { recursive: true });
    this.ensureJsonFile(this.suppliersFile, {
      version: '0.12.7',
      nextCode: 1,
      items: []
    });
    this.ensureJsonFile(this.settingsFile, {
      version: '0.12.7',
      requiredFields: ['name', 'document'],
      visibleFields: [
        'personType','originType','name','tradeName','document',
        'stateRegistration','municipalRegistration','contactName',
        'phone','mobile','email','website','zipCode','street','number',
        'complement','district','city','state','defaultMarkup',
        'paymentTerms','preferredPaymentMethod','currency','notes'
      ]
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

  listSuppliers({ includeInactive = true } = {}) {
    const data = this.readJson(this.suppliersFile, { items: [] });
    return (data.items || [])
      .filter(item => includeInactive || item.active !== false)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }

  getSupplier(id) {
    const data = this.readJson(this.suppliersFile, { items: [] });
    return (data.items || []).find(item => String(item.id) === String(id)) || null;
  }

  findDuplicates(payload = {}, excludeId = '') {
    const document = onlyDigits(payload.document);
    if (!document) return [];

    return this.listSuppliers({ includeInactive: true })
      .filter(item => {
        if (excludeId && String(item.id) === String(excludeId)) return false;
        return onlyDigits(item.document) === document;
      })
      .map(item => ({
        id: item.id,
        code: item.code,
        name: item.name,
        tradeName: item.tradeName || '',
        document: item.document || '',
        mobile: item.mobile || '',
        phone: item.phone || '',
        email: item.email || '',
        city: item.city || '',
        state: item.state || '',
        active: item.active !== false,
        updatedAt: item.updatedAt || '',
        createdAt: item.createdAt || ''
      }));
  }

  sanitize(payload = {}) {
    const personType = payload.personType === 'pf' ? 'pf' : 'pj';
    const originType = payload.originType === 'imported' ? 'imported' : 'national';

    return {
      personType,
      originType,
      name: String(payload.name || '').trim(),
      tradeName: String(payload.tradeName || '').trim(),
      document: onlyDigits(payload.document),
      stateRegistration: String(payload.stateRegistration || '').trim(),
      municipalRegistration: String(payload.municipalRegistration || '').trim(),
      contactName: String(payload.contactName || '').trim(),
      birthDate: String(payload.birthDate || '').trim(),
      phone: onlyDigits(payload.phone),
      mobile: onlyDigits(payload.mobile),
      email: String(payload.email || '').trim().toLowerCase(),
      website: String(payload.website || '').trim(),
      zipCode: onlyDigits(payload.zipCode),
      street: String(payload.street || '').trim(),
      number: String(payload.number || '').trim(),
      complement: String(payload.complement || '').trim(),
      district: String(payload.district || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim().toUpperCase().slice(0, 2),
      defaultMarkup: Math.max(0, Number(payload.defaultMarkup) || 0),
      averageDeliveryDays: Math.max(0, Number(payload.averageDeliveryDays) || 0),
      minimumOrderQuantity: Math.max(0, Number(payload.minimumOrderQuantity) || 0),
      minimumOrderValue: Math.max(0, Number(payload.minimumOrderValue) || 0),
      orderDays: String(payload.orderDays || '').trim(),
      freightNotes: String(payload.freightNotes || '').trim(),
      paymentTerms: String(payload.paymentTerms || '').trim(),
      preferredPaymentMethod: String(payload.preferredPaymentMethod || '').trim(),
      currency: ['BRL', 'USD'].includes(String(payload.currency || '').toUpperCase())
        ? String(payload.currency).toUpperCase()
        : 'BRL',
      suppliedCategories: Array.isArray(payload.suppliedCategories)
        ? [...new Set(payload.suppliedCategories.map(item => String(item || '').trim()).filter(Boolean))]
        : [],
      shippingMethods: Array.isArray(payload.shippingMethods)
        ? [...new Set(payload.shippingMethods.map(item => String(item || '').trim()).filter(Boolean))]
        : [],
      contacts: Array.isArray(payload.contacts)
        ? payload.contacts
            .map((item, index) => ({
              id: String(item?.id || `CONT-${Date.now()}-${index}`).trim(),
              name: String(item?.name || '').trim(),
              department: String(item?.department || '').trim(),
              mobile: onlyDigits(item?.mobile),
              email: String(item?.email || '').trim().toLowerCase()
            }))
            .filter(item => item.name || item.department || item.mobile || item.email)
        : [],
      internalAlert: String(payload.internalAlert || '').trim(),
      notes: String(payload.notes || '').trim(),
      active: payload.active === false || payload.active === 'false' ? false : true,
      externalLookup: {
        source: String(payload?.externalLookup?.source || '').trim(),
        status: String(payload?.externalLookup?.status || '').trim(),
        consultedAt: String(payload?.externalLookup?.consultedAt || '').trim()
      },
      links: {
        productIds: Array.isArray(payload?.links?.productIds) ? payload.links.productIds : [],
        purchaseOrderIds: Array.isArray(payload?.links?.purchaseOrderIds) ? payload.links.purchaseOrderIds : [],
        payableIds: Array.isArray(payload?.links?.payableIds) ? payload.links.payableIds : []
      },
      statistics: {
        linkedProducts: Math.max(0, Number(payload?.statistics?.linkedProducts) || 0),
        activeProducts: Math.max(0, Number(payload?.statistics?.activeProducts) || 0),
        totalPurchased: Math.max(0, Number(payload?.statistics?.totalPurchased) || 0),
        lastPurchaseAt: String(payload?.statistics?.lastPurchaseAt || '').trim()
      }
    };
  }

  validate(supplier) {
    if (!supplier.name) throw new Error('O nome ou razão social do fornecedor é obrigatório.');
    if (!supplier.document) throw new Error('O CPF ou CNPJ do fornecedor é obrigatório.');

    if (supplier.personType === 'pf' && !isValidCpf(supplier.document)) {
      throw new Error('CPF inválido. Confira os números informados.');
    }

    if (supplier.personType === 'pj' && !isValidCnpj(supplier.document)) {
      throw new Error('CNPJ inválido. Confira os números informados.');
    }

    if (supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplier.email)) {
      throw new Error('E-mail inválido.');
    }

    const invalidContact = (supplier.contacts || []).find(
      contact => contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
    );
    if (invalidContact) throw new Error(`E-mail inválido no contato ${invalidContact.name || 'adicional'}.`);
  }

  createSupplier(payload = {}, { createdBy = 'painel' } = {}) {
    const supplier = this.sanitize(payload);
    this.validate(supplier);

    const duplicates = this.findDuplicates(supplier);
    if (duplicates.length) {
      const error = new Error('Já existe um fornecedor com este CPF/CNPJ.');
      error.code = 'DUPLICATE_SUPPLIER';
      error.duplicates = duplicates;
      throw error;
    }

    const data = this.readJson(this.suppliersFile, {
      version: '0.12.7',
      nextCode: 1,
      items: []
    });

    const now = new Date().toISOString();
    const nextCode = Math.max(1, Number(data.nextCode) || 1);
    const record = {
      id: `FOR-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      code: String(nextCode).padStart(6, '0'),
      companyId: 'quality-principal',
      ...supplier,
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy
    };

    data.nextCode = nextCode + 1;
    data.items.push(record);
    this.writeJsonAtomic(this.suppliersFile, data);
    return record;
  }

  updateSupplier(id, payload = {}, { updatedBy = 'painel' } = {}) {
    const data = this.readJson(this.suppliersFile, {
      version: '0.12.7',
      nextCode: 1,
      items: []
    });
    const index = (data.items || []).findIndex(item => String(item.id) === String(id));
    if (index < 0) throw new Error('Fornecedor não encontrado.');

    const current = data.items[index];
    const supplier = this.sanitize({
      ...current,
      ...payload,
      links: current.links,
      statistics: current.statistics
    });
    this.validate(supplier);

    const duplicates = this.findDuplicates(supplier, id);
    if (duplicates.length) {
      const error = new Error('Já existe outro fornecedor com este CPF/CNPJ.');
      error.code = 'DUPLICATE_SUPPLIER';
      error.duplicates = duplicates;
      throw error;
    }

    data.items[index] = {
      ...current,
      ...supplier,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    this.writeJsonAtomic(this.suppliersFile, data);
    return data.items[index];
  }

  setActive(id, active, updatedBy = 'painel') {
    const current = this.getSupplier(id);
    if (!current) throw new Error('Fornecedor não encontrado.');
    return this.updateSupplier(
      id,
      { ...current, active: Boolean(active) },
      { updatedBy }
    );
  }
}
