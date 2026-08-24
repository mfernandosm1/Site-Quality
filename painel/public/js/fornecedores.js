(() => {
  const byId = id => document.getElementById(id);
  const parseJson = id => {
    try { return JSON.parse(byId(id)?.textContent || '[]'); } catch (_) { return []; }
  };
  const onlyDigits = value => String(value || '').replace(/\D/g, '');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  let suppliers = parseJson('suppliersData');
  const supplierFieldSettings = (()=>{ try{return JSON.parse(byId('supplierFieldSettingsData')?.textContent||'{}');}catch(_){return {fields:[]};} })();
  const supplierFieldMap = new Map((supplierFieldSettings.fields||[]).map(field=>[field.key,field]));
  let editingId = '';
  let existingSupplier = null;
  let supplierCepTimer = null;
  let lastSupplierCep = '';

  const drawer = byId('supplierDrawer');
  const backdrop = byId('supplierDrawerBackdrop');
  const form = byId('supplierForm');
  const saveButton = byId('supplierSave');
  const documentInput = byId('supplierDocument');
  const personType = byId('supplierPersonType');
  const documentState = byId('supplierDocumentState');
  const cnpjLookup = byId('supplierCnpjLookup');


  function applyFieldSettings() {
    const idMap = {personType:'supplierPersonType',originType:'supplierOriginType',document:'supplierDocument',name:'supplierName',tradeName:'supplierTradeName',stateRegistration:'supplierStateRegistration',municipalRegistration:'supplierMunicipalRegistration',birthDate:'supplierBirthDate',contactName:'supplierContactName',mobile:'supplierMobile',phone:'supplierPhone',email:'supplierEmail',website:'supplierWebsite',zipCode:'supplierZipCode',state:'supplierState',street:'supplierStreet',number:'supplierNumber',complement:'supplierComplement',district:'supplierDistrict',city:'supplierCity',defaultMarkup:'supplierDefaultMarkup',currency:'supplierCurrency',averageDeliveryDays:'supplierAverageDeliveryDays',minimumOrderQuantity:'supplierMinimumOrderQuantity',minimumOrderValue:'supplierMinimumOrderValue',orderDays:'supplierOrderDays',paymentTerms:'supplierPaymentTerms',preferredPaymentMethod:'supplierPreferredPaymentMethod',freightNotes:'supplierFreightNotes',internalAlert:'supplierInternalAlert',notes:'supplierNotes'};
    for (const [key,id] of Object.entries(idMap)) {
      const input=byId(id), setting=supplierFieldMap.get(key); if(!input||!setting) continue;
      const wrapper=input.closest('.supplier-field'); if(wrapper) wrapper.hidden=setting.visible===false;
      input.required=Boolean(setting.required && setting.visible!==false);
      const label=wrapper?.querySelector('label'); if(label && setting.label) label.textContent=`${setting.label}${input.required?' *':''}`;
    }
    cnpjLookup.hidden = personType.value === 'pf' || supplierFieldSettings.cnpjLookupEnabled === false || supplierFieldMap.get('document')?.visible === false;
  }

  function fieldRequired(key){ return Boolean(supplierFieldMap.get(key)?.required && supplierFieldMap.get(key)?.visible !== false); }

  function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const digit = length => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
  }

  function isValidCnpj(value) {
    const cnpj = onlyDigits(value);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const digit = baseLength => {
      const weights = baseLength === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    return digit(12) === Number(cnpj[12]) && digit(13) === Number(cnpj[13]);
  }

  function formatDocument(value, type = personType.value) {
    const d = onlyDigits(value);
    if (type === 'pf') return d.slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2');
    return d.slice(0,14).replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
  }

  function formatPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }

  function formatCep(value) {
    return onlyDigits(value).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  }

  function updatePersonTypeFields() {
    const isPf = personType.value === 'pf';

    // Primeiro aplica as preferências gerais; depois a regra PF/PJ prevalece.
    // Isso evita que Configurações → Fornecedores volte a exibir campos empresariais para pessoa física.
    applyFieldSettings();

    document.querySelectorAll('.supplier-pf-only').forEach(el => {
      if (!isPf) {
        el.hidden = true;
        el.querySelectorAll('input,select,textarea').forEach(control => { control.required = false; });
      }
    });
    document.querySelectorAll('.supplier-pj-only').forEach(el => {
      if (isPf) {
        el.hidden = true;
        el.querySelectorAll('input,select,textarea').forEach(control => {
          control.required = false;
          if(control.name !== 'personType') control.value = '';
        });
      }
    });

    const nameSetting=supplierFieldMap.get('name');
    byId('supplierNameLabel').textContent = `${isPf ? 'Nome completo' : (nameSetting?.label || 'Razão social')}${fieldRequired('name')?' *':''}`;
    byId('supplierDocumentLabel').textContent = `${isPf ? 'CPF' : 'CNPJ'}${fieldRequired('document')?' *':''}`;
    byId('supplierRegistrationLabel').textContent = 'Inscrição estadual';
    documentInput.maxLength = isPf ? 14 : 18;
    documentInput.setAttribute('aria-label', isPf ? 'CPF' : 'CNPJ');
    cnpjLookup.hidden = isPf || supplierFieldSettings.cnpjLookupEnabled === false || supplierFieldMap.get('document')?.visible === false;
  }

  function renderContacts(items = []) {
    const list = byId('supplierContactsList');
    list.innerHTML = '';
    const contacts = items.length ? items : [];
    contacts.forEach((contact, index) => addContactRow(contact, index));
  }

  function addContactRow(contact = {}, index = Date.now()) {
    const row = document.createElement('div');
    row.className = 'supplier-contact-row';
    row.innerHTML = `
      <div><label>Nome</label><input data-contact-field="name" value="${escapeHtml(contact.name || '')}"></div>
      <div><label>Setor</label><input data-contact-field="department" value="${escapeHtml(contact.department || '')}" placeholder="Vendas, financeiro..."></div>
      <div><label>WhatsApp</label><input data-contact-field="mobile" inputmode="tel" value="${escapeHtml(formatPhone(contact.mobile || ''))}"></div>
      <div><label>E-mail</label><input data-contact-field="email" type="email" value="${escapeHtml(contact.email || '')}"></div>
      <button class="btn danger supplier-contact-remove" type="button">Remover</button>
    `;
    row.querySelector('[data-contact-field="mobile"]').addEventListener('input', event => {
      event.target.value = formatPhone(event.target.value);
    });
    row.querySelector('.supplier-contact-remove').addEventListener('click', () => row.remove());
    byId('supplierContactsList').appendChild(row);
  }

  function collectContacts() {
    return [...document.querySelectorAll('.supplier-contact-row')].map((row, index) => ({
      id: `CONT-${editingId || 'NEW'}-${index + 1}`,
      name: row.querySelector('[data-contact-field="name"]').value.trim(),
      department: row.querySelector('[data-contact-field="department"]').value.trim(),
      mobile: onlyDigits(row.querySelector('[data-contact-field="mobile"]').value),
      email: row.querySelector('[data-contact-field="email"]').value.trim().toLowerCase()
    })).filter(item => item.name || item.department || item.mobile || item.email);
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function validateDocument(checkDuplicate = true) {
    const digits = onlyDigits(documentInput.value);
    const documentRequired=fieldRequired('document');
    const valid = !digits ? !documentRequired : (personType.value === 'pf' ? isValidCpf(digits) : isValidCnpj(digits));
    documentInput.value = formatDocument(digits);

    documentState.className = `supplier-document-state ${valid ? 'ok' : 'error'}`;
    documentState.textContent = !digits && !documentRequired ? 'Documento opcional' : (valid
      ? `✓ ${personType.value === 'pf' ? 'CPF' : 'CNPJ'} válido`
      : `✕ ${personType.value === 'pf' ? 'CPF' : 'CNPJ'} inválido ou incompleto`);

    const duplicate = checkDuplicate ? findExistingByDocument() : null;
    if (checkDuplicate) {
      if (duplicate) showExistingCard(duplicate);
      else hideExistingCard();
    }

    const nameOk=!fieldRequired('name') || byId('supplierName').value.trim();
    saveButton.disabled = !valid || !nameOk || Boolean(duplicate);
    updatePersonTypeFields();
    cnpjLookup.disabled = personType.value !== 'pj' || !digits || !valid || Boolean(duplicate) || supplierFieldSettings.cnpjLookupEnabled === false;
    return valid;
  }


  function formatStatusDate(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR');
  }

  function findExistingByDocument() {
    const document = onlyDigits(documentInput.value);
    if (!document) return null;
    return suppliers.find(item =>
      String(item.id) !== String(editingId || '') &&
      onlyDigits(item.document) === document
    ) || null;
  }

  function hideExistingCard() {
    existingSupplier = null;
    const card = byId('supplierExistingCard');
    card.hidden = true;
    card.classList.remove('inactive');
    byId('supplierReactivateExisting').hidden = true;
  }

  function showExistingCard(record) {
    existingSupplier = record;
    const card = byId('supplierExistingCard');
    const active = record.active !== false;
    card.hidden = false;
    card.classList.toggle('inactive', !active);

    byId('supplierExistingTitle').textContent = active
      ? 'Este fornecedor já está cadastrado'
      : 'Este fornecedor já existe, mas está inativo';

    const location = record.city
      ? `${record.city}${record.state ? `/${record.state}` : ''}`
      : 'Cidade não informada';

    byId('supplierExistingSummary').textContent =
      `Código ${record.code || '—'} · ${record.name || 'Fornecedor sem nome'} · ${location}`;

    byId('supplierExistingStatus').textContent = active
      ? 'Situação: Ativo. Abra o cadastro existente para consultar ou editar.'
      : `Situação: Inativo${record.updatedAt ? ` · última atualização em ${formatStatusDate(record.updatedAt)}` : ''}.`;

    byId('supplierReactivateExisting').hidden = active;
    saveButton.disabled = true;
  }

  function checkExistingSupplier() {
    if (!validateDocument(false)) {
      hideExistingCard();
      return null;
    }
    const found = findExistingByDocument();
    if (found) showExistingCard(found);
    else hideExistingCard();
    return found;
  }

  function setMessage(text = '', type = 'error') {
    const el = byId('supplierMessage');
    el.hidden = !text;
    el.className = `supplier-message ${type}`;
    el.textContent = text;
  }

  function setTab(name) {
    document.querySelectorAll('[data-supplier-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.supplierTab === name));
    document.querySelectorAll('[data-supplier-panel]').forEach(panel => panel.hidden = panel.dataset.supplierPanel !== name);
  }

  function openDrawer(record = null) {
    editingId = record?.id || '';
    existingSupplier = null;
    form.reset();
    hideExistingCard();
    setMessage();
    setTab('main');

    byId('supplierDrawerTitle').textContent = record ? 'Detalhes do fornecedor' : 'Novo fornecedor';
    byId('supplierDrawerCode').textContent = record?.code ? `Código ${record.code}` : '';
    byId('supplierToggleActive').hidden = !record;

    const values = record || { personType:'pj', originType:'national', currency:'BRL', active:true };
    Object.entries(values).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (!field || typeof value === 'object') return;
      field.value = value === true ? 'true' : value === false ? 'false' : value ?? '';
    });

    documentInput.value = formatDocument(values.document || '', values.personType || 'pj');
    byId('supplierMobile').value = formatPhone(values.mobile || '');
    byId('supplierPhone').value = formatPhone(values.phone || '');
    byId('supplierZipCode').value = formatCep(values.zipCode || '');

    form.querySelectorAll('input[name="shippingMethods"],input[name="suppliedCategories"]').forEach(input => {
      const source = input.name === 'shippingMethods' ? (values.shippingMethods || []) : (values.suppliedCategories || []);
      input.checked = source.includes(input.value);
    });
    renderContacts(values.contacts || []);
    updatePersonTypeFields();

    const documentLocked = Boolean(record && supplierFieldSettings.allowDocumentEdit !== true);
    documentInput.disabled = documentLocked;
    personType.disabled = documentLocked;
    documentInput.title = documentLocked
      ? 'A alteração de CPF/CNPJ está bloqueada nas Configurações de Fornecedores.'
      : '';
    personType.title = documentInput.title;
    if (documentLocked) {
      documentState.textContent = 'Documento protegido. A liberação é feita em Configurações → Fornecedores.';
      documentState.className = 'supplier-document-state valid';
    }

    byId('supplierToggleActive').textContent = values.active === false ? 'Reativar' : 'Inativar';
    byId('supplierToggleActive').className = values.active === false ? 'btn success' : 'btn danger';

    backdrop.hidden = false;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    validateDocument();
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
  }

  function collect() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.id = editingId;
    data.active = data.active !== 'false';
    data.defaultMarkup = Number(data.defaultMarkup || 0);
    if (editingId && supplierFieldSettings.allowDocumentEdit !== true) {
      const current = suppliers.find(item => String(item.id) === String(editingId));
      data.document = onlyDigits(current?.document || '');
      data.personType = current?.personType || 'pj';
    } else {
      data.document = onlyDigits(data.document);
    }
    if (data.personType === 'pf') {
      data.tradeName = '';
      data.stateRegistration = '';
      data.municipalRegistration = '';
      data.contactName = '';
      data.website = '';
    }
    data.zipCode = onlyDigits(data.zipCode);
    data.phone = onlyDigits(data.phone);
    data.mobile = onlyDigits(data.mobile);
    data.shippingMethods = [...form.querySelectorAll('input[name="shippingMethods"]:checked')].map(input => input.value);
    data.suppliedCategories = [...form.querySelectorAll('input[name="suppliedCategories"]:checked')].map(input => input.value);
    data.contacts = collectContacts();
    return data;
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) throw new Error(payload.message || 'Não foi possível concluir a operação.');
    return payload;
  }

  function applyFilters() {
    const search = normalize(byId('supplierSearch').value);
    const status = byId('supplierStatusFilter').value;
    const type = byId('supplierTypeFilter').value;
    const origin = byId('supplierOriginFilter').value;
    let visible = 0;

    document.querySelectorAll('[data-supplier-row]').forEach(row => {
      const show = QualitySearch.matches(row.dataset.search, search)
        && (!status || row.dataset.status === status)
        && (!type || row.dataset.type === type)
        && (!origin || row.dataset.origin === origin);
      row.hidden = !show;
      if (show) visible += 1;
    });

    byId('supplierResultCount').textContent = `${visible} fornecedor(es) encontrado(s)`;
    byId('suppliersEmpty').hidden = visible > 0;
  }

  document.querySelectorAll('[data-supplier-tab]').forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.supplierTab)));
  byId('supplierNewButton').addEventListener('click', () => openDrawer());
  byId('supplierDrawerClose').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDrawer(); });

  document.querySelectorAll('.supplier-edit').forEach(btn => btn.addEventListener('click', () => {
    openDrawer(suppliers.find(item => String(item.id) === String(btn.dataset.id)));
  }));

  ['supplierSearch','supplierStatusFilter','supplierTypeFilter','supplierOriginFilter'].forEach(id => byId(id).addEventListener('input', applyFilters));
  byId('supplierClearFilters').addEventListener('click', () => {
    ['supplierSearch','supplierStatusFilter','supplierTypeFilter','supplierOriginFilter'].forEach(id => byId(id).value = '');
    applyFilters();
  });

  personType.addEventListener('change', () => {
    documentInput.value = '';
    hideExistingCard();
    updatePersonTypeFields();
    validateDocument();
  });
  documentInput.addEventListener('input', () => validateDocument());
  documentInput.addEventListener('blur', checkExistingSupplier);
  byId('supplierName').addEventListener('input', validateDocument);
  byId('supplierMobile').addEventListener('input', event => { event.target.value = formatPhone(event.target.value); });
  byId('supplierPhone').addEventListener('input', event => { event.target.value = formatPhone(event.target.value); });
  byId('supplierZipCode').addEventListener('input', event => {
    event.target.value = formatCep(event.target.value);
    clearTimeout(supplierCepTimer);
    const cep = onlyDigits(event.target.value);
    if (cep.length === 8 && cep !== lastSupplierCep) supplierCepTimer = setTimeout(() => lookupSupplierCep(true), 260);
  });
  byId('supplierAddContact').addEventListener('click', () => addContactRow());

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateDocument()) return setMessage(fieldRequired('document') ? `Informe um ${personType.value === 'pf' ? 'CPF' : 'CNPJ'} válido.` : 'O documento informado é inválido.');
    const duplicate = findExistingByDocument();
    if (duplicate) {
      showExistingCard(duplicate);
      return setMessage(
        duplicate.active === false
          ? 'Este fornecedor já existe e está inativo. Reative ou abra o cadastro existente.'
          : 'Este fornecedor já está cadastrado. Abra o cadastro existente.',
        'error'
      );
    }
    saveButton.disabled = true;
    try {
      const data = collect();
      const payload = await request(editingId ? `/erp/fornecedores/${editingId}` : '/erp/fornecedores', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(data)
      });
      setMessage(payload.message, 'success');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      const duplicate = findExistingByDocument();
      if (duplicate) showExistingCard(duplicate);
      setMessage(error.message);
      validateDocument();
    }
  });

  byId('supplierToggleActive').addEventListener('click', async () => {
    const current = suppliers.find(item => String(item.id) === String(editingId));
    if (!current) return;
    try {
      const payload = await request(`/erp/fornecedores/${editingId}/situacao`, {
        method: 'PATCH',
        body: JSON.stringify({ active: current.active === false })
      });
      setMessage(payload.message, 'success');
      setTimeout(() => window.location.reload(), 400);
    } catch (error) {
      setMessage(error.message);
    }
  });


  byId('supplierOpenExisting').addEventListener('click', () => {
    if (!existingSupplier) return;
    openDrawer(existingSupplier);
  });

  byId('supplierReactivateExisting').addEventListener('click', async () => {
    if (!existingSupplier || existingSupplier.active !== false) return;
    const button = byId('supplierReactivateExisting');
    button.disabled = true;
    try {
      const payload = await request(`/erp/fornecedores/${existingSupplier.id}/situacao`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true })
      });
      const reactivated = payload.supplier || { ...existingSupplier, active: true };
      suppliers = suppliers.map(item =>
        String(item.id) === String(reactivated.id) ? reactivated : item
      );
      existingSupplier = reactivated;
      setMessage('Fornecedor reativado com sucesso. O cadastro foi aberto para revisão.', 'success');
      openDrawer(reactivated);
    } catch (error) {
      setMessage(error.message || 'Não foi possível reativar o fornecedor.');
    } finally {
      button.disabled = false;
    }
  });

  async function lookupSupplierCep(silent = false) {
    const cep = onlyDigits(byId('supplierZipCode').value);
    if (cep.length !== 8) {
      if (!silent) setMessage('Informe um CEP com 8 números.');
      return;
    }
    if (silent && cep === lastSupplierCep) return;
    const button = byId('supplierCepLookup');
    if (button) button.disabled = true;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { headers:{ Accept:'application/json' } });
      const data = await response.json();
      if (!response.ok || data.erro) throw new Error('CEP não encontrado.');
      byId('supplierStreet').value = data.logradouro || '';
      byId('supplierDistrict').value = data.bairro || '';
      byId('supplierCity').value = data.localidade || '';
      byId('supplierState').value = data.uf || '';
      byId('supplierComplement').value = data.complemento || '';
      lastSupplierCep = cep;
      setMessage('Endereço preenchido pelo CEP. Digite para pesquisar outros endereços da cidade.', 'success');
      byId('supplierStreet')?.focus();
      byId('supplierStreet')?.select?.();
    } catch (error) {
      lastSupplierCep = '';
      if (!silent) setMessage(error.message || 'Não foi possível consultar o CEP.');
    } finally {
      if (button) button.disabled = false;
    }
  }

  byId('supplierCepLookup').addEventListener('click', () => lookupSupplierCep(false));

  cnpjLookup.addEventListener('click', async () => {
    if (personType.value !== 'pj' || !validateDocument() || findExistingByDocument()) return;
    const cnpj = onlyDigits(documentInput.value);
    cnpjLookup.disabled = true;
    byId('supplierLookupInfo').textContent = 'Consultando dados da empresa...';
    try {
      const payload = await request(`/erp/fornecedores/consultar-cnpj/${cnpj}`);
      const company = payload.company || {};
      byId('supplierName').value = company.name || byId('supplierName').value;
      byId('supplierTradeName').value = company.tradeName || byId('supplierTradeName').value;
      byId('supplierStateRegistration').value = company.stateRegistration || byId('supplierStateRegistration').value;
      byId('supplierEmail').value = company.email || byId('supplierEmail').value;
      byId('supplierPhone').value = formatPhone(company.phone || byId('supplierPhone').value);
      byId('supplierZipCode').value = formatCep(company.zipCode || byId('supplierZipCode').value);
      byId('supplierStreet').value = company.street || byId('supplierStreet').value;
      byId('supplierNumber').value = company.number || byId('supplierNumber').value;
      byId('supplierComplement').value = company.complement || byId('supplierComplement').value;
      byId('supplierDistrict').value = company.district || byId('supplierDistrict').value;
      byId('supplierCity').value = company.city || byId('supplierCity').value;
      byId('supplierState').value = company.state || byId('supplierState').value;
      byId('supplierLookupInfo').textContent = `✓ Empresa localizada. Situação: ${company.status || 'não informada'}. Consulta em ${new Date().toLocaleString('pt-BR')}.`;
      setMessage('Dados da empresa preenchidos. Revise antes de salvar.', 'success');
      validateDocument();
    } catch (error) {
      byId('supplierLookupInfo').textContent = 'A consulta externa não respondeu. O documento é válido e o cadastro pode ser preenchido manualmente.';
      setMessage(error.message || 'Não foi possível consultar o CNPJ.');
    } finally {
      cnpjLookup.disabled = false;
      validateDocument();
    }
  });

  applyFieldSettings();
  validateDocument();
})();
