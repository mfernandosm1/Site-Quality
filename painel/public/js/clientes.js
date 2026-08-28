(() => {
  const normalize = (value='') => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const digits = (value='') => String(value || '').replace(/\D/g,'');
  const displayCode = value => String(value || '').replace(/^0+(?=\d)/, '') || '0';
  const parse = id => { try { return JSON.parse(document.getElementById(id)?.textContent || '[]'); } catch (_) { return []; } };
  let customers = parse('customersData');
  const customerFinancialSummaries = (() => { try { return JSON.parse(document.getElementById('customerFinancialData')?.textContent || '{}'); } catch (_) { return {}; } })();
  const customerFieldSettings = (() => { try { return JSON.parse(document.getElementById('customerFieldSettingsData')?.textContent || '{\"fields\":[]}'); } catch (_) { return { fields:[] }; } })();
  const search = document.getElementById('customerSearch');
  const statusFilter = document.getElementById('customerStatusFilter');
  const typeFilter = document.getElementById('customerTypeFilter');
  const classificationFilter = document.getElementById('customerClassificationFilter');
  const registrationFilter = document.getElementById('customerRegistrationFilter');
  const tableBody = document.getElementById('customersTableBody');
  const rows = [...document.querySelectorAll('[data-customer-row]')];
  const filtersForm = document.getElementById('customerFiltersForm');
  function submitFilters(){
    if (!filtersForm) return;
    const pageField = filtersForm.querySelector('input[name="page"]');
    if (pageField) pageField.remove();
    filtersForm.requestSubmit();
  }
  [statusFilter,typeFilter,classificationFilter,registrationFilter].filter(Boolean).forEach(el => el.addEventListener('change', submitFilters));
  document.getElementById('customerClearFilters')?.addEventListener('click', () => {
    window.location.href = '/erp/clientes';
  });


  const selectAll = document.getElementById('customerSelectAll');
  const bulkDeactivate = document.getElementById('customerBulkDeactivate');
  const bulkActivate = document.getElementById('customerBulkActivate');
  const bulkCount = document.getElementById('customerBulkCount');
  const rowSelections = [...document.querySelectorAll('.customer-row-select')];
  function selectedCustomerIds(){ return rowSelections.filter(input => input.checked).map(input => input.value); }
  function updateBulkSelection(){
    const selected = selectedCustomerIds();
    if (bulkCount) bulkCount.textContent = selected.length ? `${selected.length} selecionado(s)` : 'Nenhum selecionado';
    if (bulkDeactivate) bulkDeactivate.disabled = selected.length === 0;
    if (bulkActivate) bulkActivate.disabled = selected.length === 0;
    const visible = rowSelections.filter(input => !input.closest('[data-customer-row]')?.hidden);
    if (selectAll) {
      selectAll.checked = visible.length > 0 && visible.every(input => input.checked);
      selectAll.indeterminate = visible.some(input => input.checked) && !selectAll.checked;
    }
  }
  selectAll?.addEventListener('change', () => {
    rowSelections.forEach(input => { if (!input.closest('[data-customer-row]')?.hidden) input.checked = selectAll.checked; });
    updateBulkSelection();
  });
  rowSelections.forEach(input => input.addEventListener('change', updateBulkSelection));
  async function updateSelectedCustomers(active){
    const ids = selectedCustomerIds();
    if (!ids.length) return;
    const action = active ? 'Reativar' : 'Inativar';
    const complement = active ? 'Eles voltarão a aparecer nas novas operações.' : 'O histórico será preservado.';
    if (!confirm(`${action} ${ids.length} cliente(s) selecionado(s)? ${complement}`)) return;
    try {
      if (bulkDeactivate) bulkDeactivate.disabled = true;
      if (bulkActivate) bulkActivate.disabled = true;
      const response = await fetch('/erp/clientes/situacao/lote', {
        method:'PATCH', headers:{'Content-Type':'application/json', Accept:'application/json'},
        body:JSON.stringify({ ids, active })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Não foi possível ${active ? 'reativar' : 'inativar'} os clientes.`);
      alert(result.message);
      window.location.reload();
    } catch (error) {
      alert(error.message);
      updateBulkSelection();
    }
  }
  bulkDeactivate?.addEventListener('click', () => updateSelectedCustomers(false));
  bulkActivate?.addEventListener('click', () => updateSelectedCustomers(true));
  updateBulkSelection();

  const drawer=document.getElementById('customerDrawer'),backdrop=document.getElementById('customerDrawerBackdrop'),form=document.getElementById('customerForm'),message=document.getElementById('customerMessage'),duplicateBox=document.getElementById('customerDuplicateBox'),toggleActive=document.getElementById('customerToggleActive');
  const fields=['id','personType','name','tradeName','document','stateRegistration','companyStatus','openingDate','legalNature','companySize','primaryCnae','birthDate','monthlyIncome','profession','spouseName','fatherName','motherName','creditLimit','mobile','phone','email','zipCode','street','number','complement','district','city','state','classificationId','origin','notes','active'];
  const byName = name => form.elements.namedItem(name);
  function birthIsoToBr(value='') { const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value||''); }
  function birthBrToIso(value='') {
    const raw=String(value||'').trim(); if(!raw) return '';
    let day,month,year,match=raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if(match){day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);}
    else if((match=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/))){year=Number(match[1]);month=Number(match[2]);day=Number(match[3]);}
    else return null;
    const date=new Date(year,month-1,day,12); if(date.getFullYear()!==year||date.getMonth()!==month-1||date.getDate()!==day||date>new Date()||year<1890)return null;
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  function formatBirthInput(value=''){const valueDigits=digits(value).slice(0,8);if(valueDigits.length<=2)return valueDigits;if(valueDigits.length<=4)return `${valueDigits.slice(0,2)}/${valueDigits.slice(2)}`;return `${valueDigits.slice(0,2)}/${valueDigits.slice(2,4)}/${valueDigits.slice(4)}`;}

  const wm10TabButton=document.getElementById('customerWm10Tab');
  const wm10LegacyContent=document.getElementById('customerWm10LegacyContent');
  const wm10LegacyCache=new Map();
  let currentDrawerCustomer=null;
  const legacyEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const legacyDate=value=>{if(!value)return '—';const date=new Date(String(value).length===10?`${value}T12:00:00`:value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString('pt-BR');};
  function renderWm10Legacy(legacy={}){
    const observations=legacy.customerObservations||[], sales=(legacy.saleObservations||[]).filter(item=>String(item?.state||'').toUpperCase()==='C');
    const summary=legacy.wm10CustomerCode?`<div class="customer-wm10-summary"><div><span>Código WM10</span><strong>${legacyEscape(legacy.wm10CustomerCode)}</strong></div><div><span>Observações do cadastro</span><strong>${observations.length}</strong></div><div><span>Vendas concluídas com observação</span><strong>${sales.length}</strong></div></div>`:'';
    const customerObs=observations.length?`<section class="customer-wm10-box"><h4>Observação do cadastro no WM10</h4>${observations.map(item=>`<article class="customer-wm10-sale"><p class="customer-wm10-note">${legacyEscape(item.text||'')}</p></article>`).join('')}</section>`:`<div class="customer-wm10-empty">O snapshot atual da API de clientes não retornou o campo de observação do cadastro para este cliente.</div>`;
    const salesBlock=sales.length?`<section class="customer-wm10-box"><h4>Vendas concluídas com observação (${sales.length})</h4><div class="customer-wm10-sales">${sales.map(item=>`<article class="customer-wm10-sale"><header><strong>${item.saleCode?`Venda #${legacyEscape(item.saleCode)}`:'Venda WM10'}</strong><small>${legacyEscape(legacyDate(item.date))}</small></header><p class="customer-wm10-note">${legacyEscape(item.observation||'')}</p></article>`).join('')}</div></section>`:'<div class="customer-wm10-empty">Nenhuma venda concluída com observação foi localizada para este cliente.</div>';
    const migrationNote=legacy.migrated?`<small class="customer-wm10-muted">Histórico WM10 somente para consulta. Nenhum campo do cadastro do cliente é alterado por esta rotina.</small>`:'<small class="customer-wm10-muted">Este cliente ainda não possui histórico legado salvo.</small>';
    wm10LegacyContent.innerHTML=`${summary}${customerObs}${salesBlock}${migrationNote}`;
  }
  async function loadWm10Legacy(customer){
    if(!customer||!wm10LegacyContent)return;
    const id=String(customer.id||'');
    if(wm10LegacyCache.has(id)){renderWm10Legacy(wm10LegacyCache.get(id));return;}
    wm10LegacyContent.innerHTML='<div class="customer-wm10-loading">Carregando dados legados do WM10…</div>';
    try{
      const response=await fetch(`/erp/clientes/${encodeURIComponent(id)}/api/wm10-legado`,{headers:{Accept:'application/json'}});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Não foi possível consultar os dados do WM10.');
      wm10LegacyCache.set(id,result.legacy||{});
      if(currentDrawerCustomer&&String(currentDrawerCustomer.id)===id)renderWm10Legacy(result.legacy||{});
    }catch(error){if(currentDrawerCustomer&&String(currentDrawerCustomer.id)===id)wm10LegacyContent.innerHTML=`<div class="customer-wm10-empty">${legacyEscape(error.message)}</div>`;}
  }

  function openDrawer(customer=null){currentDrawerCustomer=customer;form.reset();message.hidden=true;duplicateBox.hidden=true;lastResolvedZip='';lastResolvedCnpj='';setZipStatus('');if(wm10TabButton)wm10TabButton.hidden=!customer;if(wm10LegacyContent)wm10LegacyContent.innerHTML='<p class="customer-wm10-muted">Selecione a aba para carregar os dados legados do WM10.</p>';fields.forEach(name=>{const field=byName(name);if(field)field.value=customer?.[name] ?? (name==='personType'?'pf':name==='classificationId'?'none':name==='active'?'true':'');});if(byName('birthDate'))byName('birthDate').value=birthIsoToBr(byName('birthDate').value);if(documentField){documentField.value=formatDocument(documentField.value,personTypeField?.value);documentField.placeholder=personTypeField?.value==='pj'?'00.000.000/0000-00':'000.000.000-00';setDocumentStatus('');clearDocumentAction();updatePersonTypeFields();updateAgeInfo();}document.getElementById('customerDrawerTitle').textContent=customer?'Detalhes do cliente':'Novo cliente';document.getElementById('customerDrawerCode').textContent=customer?`Código ${displayCode(customer.code)}`:'Cadastro rápido ou completo';toggleActive.hidden=!customer; if(customer){toggleActive.textContent=customer.active===false?'Reativar cliente':'Inativar cliente';toggleActive.className=`btn ${customer.active===false?'success':'danger'}`;} selectTab('main');backdrop.hidden=false;drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(() => {
    if (customer) byName('name')?.focus();
    else documentField?.focus();
  }, 100);}
  function closeDrawer(){currentDrawerCustomer=null;drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true;document.body.style.overflow='';}
  function selectTab(tab){document.querySelectorAll('[data-customer-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerTab===tab));document.querySelectorAll('[data-customer-panel]').forEach(panel=>panel.hidden=panel.dataset.customerPanel!==tab);if(tab==='wm10'&&currentDrawerCustomer)loadWm10Legacy(currentDrawerCustomer);}
  document.querySelectorAll('[data-customer-tab]').forEach(btn=>btn.addEventListener('click',()=>selectTab(btn.dataset.customerTab)));
  document.getElementById('customerNewButton')?.addEventListener('click',()=>openDrawer()); document.getElementById('customerDrawerClose')?.addEventListener('click',closeDrawer);backdrop?.addEventListener('click',closeDrawer);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
  document.querySelectorAll('.customer-edit').forEach(btn=>btn.addEventListener('click',()=>openDrawer(customers.find(item=>String(item.id)===String(btn.dataset.id)))));


  // Clientes ERP v0.12.6 — documento primeiro, documento único e reativação
  const personTypeField = byName('personType');
  const documentField = byName('document');
  let cnpjLookupTimer = null;
  let cnpjLookupController = null;
  let lastResolvedCnpj = '';

  function isValidCpf(value = '') {
    const cpf = digits(value);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calculateDigit = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
  }

  function isValidCnpj(value = '') {
    const cnpj = digits(value);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const calculateDigit = (baseLength) => {
      const weights = baseLength === 12
        ? [5,4,3,2,9,8,7,6,5,4,3,2]
        : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
  }

  function formatDocument(value = '', personType = 'pf') {
    const clean = digits(value).slice(0, personType === 'pj' ? 14 : 11);
    if (personType === 'pj') {
      return clean
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return clean
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})(\d)/, '$1-$2');
  }

  function getDocumentStatusElement() {
    if (!documentField) return null;
    let status = document.getElementById('customerDocumentStatus');
    if (status) return status;
    status = document.createElement('small');
    status.id = 'customerDocumentStatus';
    status.setAttribute('aria-live', 'polite');
    status.style.display = 'block';
    status.style.marginTop = '5px';
    status.style.minHeight = '14px';
    status.style.fontSize = '11px';
    documentField.insertAdjacentElement('afterend', status);
    return status;
  }

  function setDocumentStatus(text = '', type = 'neutral') {
    const status = getDocumentStatusElement();
    if (!status || !documentField) return;
    status.textContent = text;
    status.style.color = type === 'error'
      ? '#fca5a5'
      : type === 'success'
        ? '#86efac'
        : type === 'warning'
          ? '#fbbf24'
          : '#94a3b8';
    documentField.setCustomValidity(type === 'error' ? text : '');
    documentField.setAttribute('aria-invalid', type === 'error' ? 'true' : 'false');
    documentField.classList.toggle('customer-document-valid', type === 'success');
    documentField.classList.toggle('customer-document-invalid', type === 'error');
    documentField.classList.toggle('customer-document-warning', type === 'warning');
    if (type !== 'warning') clearDocumentAction();
  }

  function getDocumentActionsElement() {
    if (!documentField) return null;
    let actions = document.getElementById('customerDocumentActions');
    if (actions) return actions;
    actions = document.createElement('div');
    actions.id = 'customerDocumentActions';
    actions.className = 'customer-document-actions';
    actions.hidden = true;
    const status = getDocumentStatusElement();
    status?.insertAdjacentElement('afterend', actions);
    return actions;
  }

  function clearDocumentAction() {
    const actions = document.getElementById('customerDocumentActions');
    if (!actions) return;
    actions.innerHTML = '';
    actions.hidden = true;
  }

  function findCustomerByDocument(value = '') {
    const document = digits(value);
    const currentId = String(byName('id')?.value || '');
    if (!document) return null;
    return customers.find(item =>
      String(item.id || '') !== currentId &&
      digits(item.document) === document
    ) || null;
  }

  async function reactivateExistingCustomer(customer) {
    if (!customer?.id) return;
    try {
      const response = await fetch(`/erp/clientes/${encodeURIComponent(customer.id)}/situacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ active: true })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Não foi possível reativar o cliente.');
      showMessage('Cliente reativado com sucesso.', 'success');
      setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      showMessage(error.message);
    }
  }

  function showExistingCustomerAction(customer) {
    const actions = getDocumentActionsElement();
    if (!actions || !customer) return;
    actions.innerHTML = '';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'customer-document-open';
    openButton.textContent = `Abrir cliente ${displayCode(customer.code)}`;
    openButton.addEventListener('click', () => openDrawer(customer));
    actions.appendChild(openButton);

    if (customer.active === false) {
      const reactivateButton = document.createElement('button');
      reactivateButton.type = 'button';
      reactivateButton.className = 'customer-document-reactivate';
      reactivateButton.textContent = 'Reativar cliente';
      reactivateButton.addEventListener('click', () => reactivateExistingCustomer(customer));
      actions.prepend(reactivateButton);
    }

    actions.hidden = false;
  }

  function checkDocumentDuplicate({ focusName = false } = {}) {
    if (!documentField) return false;
    const personType = personTypeField?.value === 'pj' ? 'pj' : 'pf';
    const document = digits(documentField.value);
    const valid = personType === 'pj' ? isValidCnpj(document) : isValidCpf(document);
    if (!valid) return false;

    const label = personType === 'pj' ? 'CNPJ' : 'CPF';
    const existing = findCustomerByDocument(document);
    if (existing) {
      const status = existing.active === false ? 'inativo' : 'ativo';
      setDocumentStatus(`${label} já cadastrado para ${existing.name} · código ${displayCode(existing.code)} · cliente ${status}.`, 'warning');
      showExistingCustomerAction(existing);
      return true;
    }

    setDocumentStatus(`${label} válido e ainda não cadastrado.`, 'success');
    if (focusName && !String(byName('name')?.value || '').trim()) {
      setTimeout(() => byName('name')?.focus(), 80);
    }
    return false;
  }

  function calculateAge(dateValue = '') {
    if (!dateValue) return null;
    const iso = birthBrToIso(dateValue);
    if (!iso) return null;
    const birth = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    if (birth > today) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age >= 0 && age <= 130 ? age : null;
  }

  function updateAgeInfo() {
    const birthField = byName('birthDate');
    const info = document.getElementById('customerAgeInfo');
    if (!info) return;
    const age = calculateAge(birthField?.value);
    info.textContent = age === null ? '' : `${age} ano${age === 1 ? '' : 's'}`;
  }

  function updatePersonTypeFields() {
    const isCompany = personTypeField?.value === 'pj';
    if (!isCompany) {
      const tradeName = byName('tradeName');
      if (tradeName) tradeName.value = '';
    }
    document.querySelectorAll('.customer-pj-field').forEach(el => { el.hidden = !isCompany; });
    document.querySelectorAll('.customer-pf-field').forEach(el => { el.hidden = isCompany; });
    const documentLabel = document.getElementById('customerDocumentLabel');
    if (documentLabel) documentLabel.textContent = isCompany ? 'CNPJ' : 'CPF';
    applyCustomerFieldSettings();
  }

  function applyCustomerFieldSettings() {
    const fields = Array.isArray(customerFieldSettings.fields) ? customerFieldSettings.fields : [];
    fields.forEach(setting => {
      const control = byName(setting.key);
      const wrapper = control?.closest('.customer-field');
      if (!control || !wrapper) return;
      wrapper.dataset.configEnabled = setting.enabled === false ? 'false' : 'true';
      wrapper.style.order = String(Number(setting.order || 0));
      const matchesPerson = !setting.personType || setting.personType === personTypeField?.value;
      wrapper.hidden = setting.enabled === false || !matchesPerson;
      control.required = setting.required === true && matchesPerson && setting.enabled !== false;
      const label = wrapper.querySelector('label');
      if (label) {
        const base = String(setting.displayLabel || setting.label || label.textContent).replace(/\s*\*\s*$/, '').trim();
        label.textContent = `${base}${control.required ? ' *' : ''}`;
      }
    });
    document.querySelectorAll('[data-customer-panel]').forEach(panel => {
      const tabKey = panel.dataset.customerPanel;
      const visible = [...panel.querySelectorAll('.customer-field')].some(field => !field.hidden);
      const tab = document.querySelector(`[data-customer-tab="${tabKey}"]`);
      if (tab) tab.hidden = !visible;
    });
  }

  function assignCompanyField(name, value, { overwrite = false } = {}) {
    const field = byName(name);
    const next = String(value || '').trim();
    if (!field || !next) return false;
    if (!overwrite && String(field.value || '').trim()) return false;
    field.value = next;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function companyHasConflicts(company = {}) {
    const mapping = {
      name: company.name,
      tradeName: company.tradeName,
      stateRegistration: company.stateRegistration,
      companyStatus: company.companyStatus,
      openingDate: company.openingDate,
      legalNature: company.legalNature,
      companySize: company.companySize,
      primaryCnae: company.primaryCnae,
      email: company.email,
      phone: company.phone,
      mobile: company.mobile,
      zipCode: company.zipCode,
      street: company.street,
      number: company.number,
      complement: company.complement,
      district: company.district,
      city: company.city,
      state: company.state
    };
    return Object.entries(mapping).some(([name, value]) => {
      const field = byName(name);
      return field && String(field.value || '').trim() && String(value || '').trim()
        && normalize(field.value) !== normalize(value);
    });
  }

  function applyCompanyData(company = {}, overwrite = false) {
    const values = {
      name: company.name,
      tradeName: company.tradeName,
      stateRegistration: company.stateRegistration,
      companyStatus: company.companyStatus,
      openingDate: company.openingDate,
      legalNature: company.legalNature,
      companySize: company.companySize,
      primaryCnae: company.primaryCnaeCode && company.primaryCnae
        ? `${company.primaryCnaeCode} · ${company.primaryCnae}`
        : company.primaryCnae,
      email: company.email,
      phone: company.phone,
      mobile: company.mobile,
      zipCode: company.zipCode,
      street: company.street,
      number: company.number,
      complement: company.complement,
      district: company.district,
      city: company.city,
      state: company.state
    };
    Object.entries(values).forEach(([name, value]) => assignCompanyField(name, value, { overwrite }));
    if (company.zipCode) {
      const zip = digits(company.zipCode);
      const zipFieldLocal = byName('zipCode');
      if (zipFieldLocal) zipFieldLocal.value = formatZipCode(zip);
      lastResolvedZip = zip;
      setZipStatus('Endereço preenchido pela consulta do CNPJ.', 'success');
    }
  }

  async function lookupCnpj({ force = false } = {}) {
    if (!documentField || personTypeField?.value !== 'pj') return;
    const cnpj = digits(documentField.value);
    if (cnpj.length !== 14 || !isValidCnpj(cnpj)) return;
    if (findCustomerByDocument(cnpj)) {
      checkDocumentDuplicate();
      return;
    }
    if (!force && cnpj === lastResolvedCnpj) return;

    if (cnpjLookupController) cnpjLookupController.abort();
    cnpjLookupController = new AbortController();
    setDocumentStatus('CNPJ válido. Consultando empresa...');
    documentField.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`/erp/clientes/consulta-cnpj/${encodeURIComponent(cnpj)}`, {
        headers: { Accept: 'application/json' },
        signal: cnpjLookupController.signal
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Não foi possível consultar o CNPJ.');

      const company = result.company || {};
      const overwrite = companyHasConflicts(company)
        ? window.confirm('Alguns campos já possuem dados diferentes. Deseja substituí-los pelos dados encontrados no CNPJ?')
        : false;

      applyCompanyData(company, overwrite);
      lastResolvedCnpj = cnpj;
      setDocumentStatus(`CNPJ válido. Dados encontrados via ${company.provider || 'consulta pública'}.`, 'success');
    } catch (error) {
      if (error.name === 'AbortError') return;
      lastResolvedCnpj = '';
      setDocumentStatus(`CNPJ válido, mas a consulta não foi concluída: ${error.message}`, 'neutral');
    } finally {
      documentField.removeAttribute('aria-busy');
    }
  }

  function validateDocumentField({ showEmpty = false } = {}) {
    if (!documentField) return true;
    const personType = personTypeField?.value === 'pj' ? 'pj' : 'pf';
    const value = digits(documentField.value);
    documentField.value = formatDocument(value, personType);

    if (!value) {
      setDocumentStatus(showEmpty ? 'Documento não informado.' : '');
      return true;
    }

    const expectedLength = personType === 'pj' ? 14 : 11;
    if (value.length !== expectedLength) {
      setDocumentStatus(`${personType === 'pj' ? 'CNPJ' : 'CPF'} deve possuir ${expectedLength} números.`, 'error');
      return false;
    }

    const valid = personType === 'pj' ? isValidCnpj(value) : isValidCpf(value);
    if (!valid) {
      setDocumentStatus(`${personType === 'pj' ? 'CNPJ' : 'CPF'} inválido. Confira os números.`, 'error');
      return false;
    }

    if (personType === 'pf') {
      checkDocumentDuplicate();
      return true;
    }

    checkDocumentDuplicate();
    return true;
  }

  documentField?.addEventListener('input', () => {
    documentField.value = formatDocument(documentField.value, personTypeField?.value);
    clearDocumentAction();
    const length = digits(documentField.value).length;
    const expected = personTypeField?.value === 'pj' ? 14 : 11;
    if (!length) setDocumentStatus('');
    else if (length === expected) {
      const valid = validateDocumentField();
      if (valid && personTypeField?.value === 'pj') {
        clearTimeout(cnpjLookupTimer);
        cnpjLookupTimer = setTimeout(() => lookupCnpj(), 350);
      }
    }
    else setDocumentStatus(`Digite os ${expected} números do ${personTypeField?.value === 'pj' ? 'CNPJ' : 'CPF'}.`);
  });
  documentField?.addEventListener('blur', () => {
    const valid = validateDocumentField();
    if (!valid) return;
    if (personTypeField?.value === 'pj') lookupCnpj();
    else checkDocumentDuplicate({ focusName: true });
  });
  personTypeField?.addEventListener('change', () => {
    if (!documentField) return;
    documentField.value = formatDocument(documentField.value, personTypeField.value);
    documentField.placeholder = personTypeField.value === 'pj' ? '00.000.000/0000-00' : '000.000.000-00';
    lastResolvedCnpj = '';
    clearDocumentAction();
    updatePersonTypeFields();
    updateAgeInfo();
    const valid = validateDocumentField();
    if (valid && personTypeField.value === 'pj') lookupCnpj();
    setTimeout(() => documentField?.focus(), 60);
  });
  updatePersonTypeFields();
  if (documentField) documentField.placeholder = personTypeField?.value === 'pj' ? '00.000.000/0000-00' : '000.000.000-00';

  // Clientes ERP v0.12.1 — consulta automática de CEP
  const zipField = byName('zipCode');
  let zipLookupTimer = null;
  let zipLookupController = null;
  let lastResolvedZip = '';

  function formatZipCode(value = '') {
    const clean = digits(value).slice(0, 8);
    return clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5)}` : clean;
  }

  function getZipStatusElement() {
    if (!zipField) return null;
    let status = document.getElementById('customerZipStatus');
    if (status) return status;
    status = document.createElement('small');
    status.id = 'customerZipStatus';
    status.setAttribute('aria-live', 'polite');
    status.style.display = 'block';
    status.style.marginTop = '5px';
    status.style.minHeight = '14px';
    status.style.fontSize = '11px';
    status.style.color = '#94a3b8';
    zipField.insertAdjacentElement('afterend', status);
    return status;
  }

  function setZipStatus(text = '', type = 'neutral') {
    const status = getZipStatusElement();
    if (!status) return;
    status.textContent = text;
    status.style.color = type === 'error' ? '#fca5a5' : type === 'success' ? '#86efac' : '#94a3b8';
  }

  function setAddressField(name, value) {
    const field = byName(name);
    if (!field || !String(value || '').trim()) return;
    field.value = String(value).trim();
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function lookupZipCode({ force = false } = {}) {
    if (!zipField) return;
    const zip = digits(zipField.value).slice(0, 8);
    zipField.value = formatZipCode(zip);

    if (zip.length !== 8) {
      lastResolvedZip = '';
      setZipStatus(zip.length ? 'Digite os 8 números do CEP.' : '');
      return;
    }
    if (!force && zip === lastResolvedZip) return;

    if (zipLookupController) zipLookupController.abort();
    zipLookupController = new AbortController();
    setZipStatus('Buscando CEP...');
    zipField.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${zip}/json/`, {
        headers: { Accept: 'application/json' },
        signal: zipLookupController.signal
      });
      if (!response.ok) throw new Error('Falha ao consultar CEP.');
      const data = await response.json();
      if (data.erro) {
        lastResolvedZip = '';
        setZipStatus('CEP não encontrado. Preencha o endereço manualmente.', 'error');
        return;
      }

      setAddressField('street', data.logradouro);
      setAddressField('district', data.bairro);
      setAddressField('city', data.localidade);
      setAddressField('state', data.uf);
      lastResolvedZip = zip;
      setZipStatus('Endereço preenchido pelo CEP.', 'success');

      const streetField = byName('street');
      if (streetField) { streetField.focus(); streetField.select?.(); }
    } catch (error) {
      if (error.name === 'AbortError') return;
      lastResolvedZip = '';
      setZipStatus('Não foi possível consultar agora. Preencha manualmente.', 'error');
    } finally {
      zipField.removeAttribute('aria-busy');
    }
  }

  zipField?.addEventListener('input', () => {
    zipField.value = formatZipCode(zipField.value);
    clearTimeout(zipLookupTimer);
    const zip = digits(zipField.value);
    if (zip.length === 8) zipLookupTimer = setTimeout(() => lookupZipCode(), 250);
    else setZipStatus(zip.length ? 'Digite os 8 números do CEP.' : '');
  });
  zipField?.addEventListener('blur', () => lookupZipCode());

  const birthDateField = byName('birthDate');
  birthDateField?.addEventListener('input', () => { birthDateField.setCustomValidity(''); birthDateField.value=formatBirthInput(birthDateField.value); updateAgeInfo(); });
  birthDateField?.addEventListener('paste', event => {
    const pasted=event.clipboardData?.getData('text')?.trim() || '';
    if(!pasted) return;
    event.preventDefault();
    const iso=birthBrToIso(pasted);
    if(iso) birthDateField.value=birthIsoToBr(iso);
    else birthDateField.value=formatBirthInput(pasted);
    birthDateField.setCustomValidity('');
    updateAgeInfo();
  });
  birthDateField?.addEventListener('change', updateAgeInfo);
  updateAgeInfo();

  function payload(){const data=Object.fromEntries(new FormData(form).entries());const birthDate=birthBrToIso(data.birthDate);if(data.birthDate&&birthDate===null)throw new Error('BIRTH_DATE_INVALID');data.birthDate=birthDate||'';data.active=data.active!=='false';return data;}
  function showMessage(text,type='error'){message.className=`customer-message ${type}`;message.textContent=text;message.hidden=false;}
  function showDuplicates(items=[]){duplicateBox.innerHTML=`<strong>⚠ Possível duplicidade</strong>${items.map(item=>`<p><b>${item.name}</b> · código ${item.code}${item.mobile?` · ${item.mobile}`:''}</p>`).join('')}<button type="button" class="btn" id="customerForceSave">Salvar mesmo assim</button>`;duplicateBox.hidden=false;document.getElementById('customerForceSave')?.addEventListener('click',()=>save(true));}
  async function save(allowDuplicate=false){message.hidden=true;duplicateBox.hidden=true;if(!form.checkValidity()){const invalid=form.querySelector(':invalid');const panel=invalid?.closest('[data-customer-panel]');if(panel)selectTab(panel.dataset.customerPanel);invalid?.reportValidity();invalid?.focus();return;}if(!validateDocumentField()){selectTab('main');documentField?.focus();documentField?.reportValidity();return;}let data;try{data=payload();}catch(error){if(error.message==='BIRTH_DATE_INVALID'){const birthField=byName('birthDate');birthField?.setCustomValidity('Informe uma data válida no formato DD/MM/AAAA.');birthField?.reportValidity();birthField?.focus();return;}throw error;}const id=data.id;const button=document.getElementById('customerSave');button.disabled=true;button.textContent='Salvando...';try{const response=await fetch(id?`/erp/clientes/${encodeURIComponent(id)}`:'/erp/clientes',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...data,allowDuplicate})});const result=await response.json();if(!response.ok||!result.success){
      if(result.code==='DOCUMENT_ALREADY_EXISTS'){
        const existing=(result.duplicates||[])[0];
        if(existing){
          setDocumentStatus(`${data.personType==='pj'?'CNPJ':'CPF'} já cadastrado para ${existing.name} · código ${existing.code}${existing.active===false?' · cliente inativo':''}.`,'warning');
          showExistingCustomerAction(existing);
          selectTab('main');
          documentField?.focus();
          return;
        }
      }
      if(result.code==='POSSIBLE_DUPLICATE'){showDuplicates(result.duplicates||[]);return;}
      throw new Error(result.message||'Não foi possível salvar o cliente.');
    }showMessage(result.message,'success');setTimeout(()=>window.location.reload(),550);}catch(error){showMessage(error.message);}finally{button.disabled=false;button.textContent='Salvar cliente';}}
  form?.addEventListener('submit',e=>{e.preventDefault();save(false);});
  toggleActive?.addEventListener('click',async()=>{const id=byName('id').value;if(!id)return;const active=byName('active').value==='false';try{const response=await fetch(`/erp/clientes/${encodeURIComponent(id)}/situacao`,{method:'PATCH',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({active})});const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Falha ao atualizar situação.');window.location.reload();}catch(error){showMessage(error.message);}});

  const money = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const closeCustomerManageMenus = except => {
    document.querySelectorAll('.customer-manage[open]').forEach(item => {
      if (item !== except) item.removeAttribute('open');
    });
  };
  const positionCustomerManageMenu = details => {
    if (!details?.open) return;
    const trigger = details.querySelector('summary');
    const menu = details.querySelector('.customer-manage-menu');
    if (!trigger || !menu) return;

    const gap = 6;
    const viewportGap = 10;
    const triggerRect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(220, Math.min(300, menu.offsetWidth || 220));
    const menuHeight = menu.offsetHeight || 180;
    let left = triggerRect.right - menuWidth;
    left = Math.max(viewportGap, Math.min(left, window.innerWidth - menuWidth - viewportGap));

    const roomBelow = window.innerHeight - triggerRect.bottom - viewportGap;
    const roomAbove = triggerRect.top - viewportGap;
    let top = triggerRect.bottom + gap;
    if (roomBelow < menuHeight && roomAbove > roomBelow) top = triggerRect.top - menuHeight - gap;
    top = Math.max(viewportGap, Math.min(top, window.innerHeight - menuHeight - viewportGap));

    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  };
  document.querySelectorAll('.customer-manage').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      closeCustomerManageMenus(details);
      requestAnimationFrame(() => positionCustomerManageMenu(details));
    });
  });
  document.addEventListener('click', event => {
    const manage = event.target.closest('.customer-manage');
    if (!manage && !event.target.closest('.customer-finance-card')) closeCustomerManageMenus();
  });
  const repositionOpenCustomerMenu = () => {
    const openMenu = document.querySelector('.customer-manage[open]');
    if (openMenu) positionCustomerManageMenu(openMenu);
  };
  window.addEventListener('resize', repositionOpenCustomerMenu);
  window.addEventListener('scroll', repositionOpenCustomerMenu, true);
  document.addEventListener('keydown', event => { if(event.key==='Escape'){ closeCustomerManageMenus(); const modal=document.getElementById('customerFinanceModal'); if(modal)modal.hidden=true; }});
  const financeModal=document.getElementById('customerFinanceModal');
  document.querySelectorAll('.customer-finance').forEach(button=>button.addEventListener('click',()=>{
    const customer=customers.find(item=>String(item.id)===String(button.dataset.id))||{};
    const summary=customerFinancialSummaries[button.dataset.id]||{};
    const limit=Number(customer.creditLimit||0), used=Number(summary.openBalance||0), available=limit>0?Math.max(0,limit-used):null;
    document.getElementById('customerFinanceTitle').textContent=`Financeiro · ${customer.name||'Cliente'}`;
    document.getElementById('customerFinanceContent').innerHTML=`<div class="customer-finance-grid"><div><span>Limite de crédito</span><strong>${limit>0?money(limit):'Não configurado'}</strong></div><div><span>Disponível</span><strong>${available===null?'—':money(available)}</strong></div><div><span>Em aberto</span><strong>${money(summary.openBalance)}</strong></div><div><span>Vencido</span><strong>${money(summary.overdueBalance)}</strong></div><div><span>Títulos em aberto</span><strong>${Number(summary.openTitleCount||0)}</strong></div><div><span>Total recebido</span><strong>${money(summary.totalReceived)}</strong></div></div>${Number(summary.overdueBalance||0)>0?'<div class="customer-finance-alert">Cliente possui valores vencidos no Contas a Receber.</div>':''}`;
    financeModal.hidden=false;
    button.closest('details')?.removeAttribute('open');
  }));
  document.getElementById('customerFinanceClose')?.addEventListener('click',()=>financeModal.hidden=true);
  financeModal?.addEventListener('click',event=>{if(event.target===financeModal)financeModal.hidden=true;});

  const featureModal=document.getElementById('customerFeatureModal');
  const featureTitle=document.getElementById('customerFeatureTitle');
  const featureContent=document.getElementById('customerFeatureContent');
  if (featureModal && featureModal.parentElement !== document.body) document.body.appendChild(featureModal);
  const openFeature=(title,html)=>{featureTitle.textContent=title;featureContent.innerHTML=`<div class="customer-feature-body">${html}</div>`;featureModal.hidden=false;closeCustomerManageMenus();};
  const closeFeature=()=>{featureModal.hidden=true;featureContent.innerHTML='';};
  document.getElementById('customerFeatureClose')?.addEventListener('click',closeFeature);
  featureModal?.addEventListener('click',e=>{if(e.target===featureModal)closeFeature();});
  const fmtDate=value=>value?new Date(String(value).length===10?`${value}T12:00:00`:value).toLocaleDateString('pt-BR'):'—';
  const statusText={open:'Aberta',finalized:'Concluída',cancelled:'Cancelada',reversed:'Estornada'};
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  const ratingText={regular:'Regular',atencao:'Atenção',inadimplente:'Inadimplente',sem_historico:'Sem histórico suficiente'};
  document.querySelectorAll('.customer-credit-analysis').forEach(button=>button.addEventListener('click',async()=>{
    openFeature('Análise de crédito','Carregando...');
    try{const r=await fetch(`/erp/clientes/${encodeURIComponent(button.dataset.id)}/api/analise-credito`);const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||'Falha ao consultar.');const a=d.analysis,c=d.customer;const limit=Number(c.creditLimit||0),available=limit>0?Math.max(0,limit-Number(a.openBalance||0)):null;
      openFeature(`Análise de crédito · ${c.name}`,`<div class="credit-sections"><div><span class="credit-rating ${a.rating}">${ratingText[a.rating]||a.rating}</span></div><section class="credit-section"><h3>Crédito</h3><div class="customer-feature-grid"><div><span>Limite</span><strong>${limit>0?money(limit):'Não configurado'}</strong></div><div><span>Utilizado</span><strong>${money(a.openBalance)}</strong></div><div><span>Disponível</span><strong>${available===null?'—':money(available)}</strong></div><div><span>Vencido</span><strong>${money(a.overdueBalance)}</strong></div></div></section><section class="credit-section"><h3>Comportamento</h3><div class="customer-feature-grid"><div><span>Maior atraso</span><strong>${Math.round(a.maxDelayDays||0)} dias</strong></div><div><span>Média de atraso</span><strong>${Math.round(a.averageDelayDays||0)} dias</strong></div><div><span>Primeiro crediário</span><strong>${fmtDate(a.firstCreditAt)}</strong></div><div><span>Última compra</span><strong>${fmtDate(a.lastPurchaseAt)}</strong></div></div></section><section class="credit-section"><h3>Compras</h3><div class="customer-feature-grid"><div><span>Quantidade</span><strong>${a.operationCount}</strong></div><div><span>Total comprado</span><strong>${money(a.totalSales)}</strong></div><div><span>Total no crediário</span><strong>${money(a.totalCreditSales)}</strong></div><div><span>Maior compra</span><strong>${money(a.largestSale)}</strong></div><div><span>Ticket médio</span><strong>${money(a.averageTicket)}</strong></div></div></section><section class="credit-section"><h3>Parcelas</h3><div class="customer-feature-grid"><div><span>Pagas</span><strong>${a.paidInstallmentCount}</strong></div><div><span>Abertas</span><strong>${a.openInstallmentCount}</strong></div><div><span>Vencidas</span><strong>${a.overdueInstallmentCount}</strong></div><div><span>Total recebido</span><strong>${money(a.totalReceived)}</strong></div></div></section><section class="credit-section"><h3>Rentabilidade</h3><div class="customer-feature-grid"><div><span>Custo conhecido</span><strong>${money(a.knownCost)}</strong></div><div><span>Resultado bruto</span><strong>${money(a.grossProfit)}</strong></div><div><span>Resultado %</span><strong>${a.profitPercent==null?'—':a.profitPercent.toFixed(2)+'%'}</strong></div><div><span>Markup</span><strong>${a.markup==null?'—':a.markup.toFixed(2)}</strong></div></div>${a.itemsWithoutCost?`<p class="profit-warning">${a.itemsWithoutCost} item(ns) sem custo registrado não entraram no cálculo.</p>`:''}<div class="profit-table-wrap"><table class="profit-table"><thead><tr><th>Mês/Ano</th><th>Compra</th><th>Venda</th><th>Resultado</th><th>Resultado %</th><th>Markup</th></tr></thead><tbody>${(a.profitability||[]).map(r=>`<tr><td>${r.month==='sem-data'?'Sem data':r.month.split('-').reverse().join('/')}</td><td>${money(r.cost)}</td><td>${money(r.revenue)}</td><td>${money(r.profit)}</td><td>${r.profitPercent==null?'—':r.profitPercent.toFixed(2)+'%'}</td><td>${r.markup==null?'—':r.markup.toFixed(2)}</td></tr>`).join('')||'<tr><td colspan="6">Sem dados de rentabilidade.</td></tr>'}</tbody></table></div></section></div>`);
    }catch(e){openFeature('Análise de crédito',`<p>${e.message}</p>`);}
  }));

  async function showOperationDetail(customerId,operationId,backPage=1){
    openFeature('Operação do cliente','Carregando...');
    try{const r=await fetch(`/erp/clientes/${encodeURIComponent(customerId)}/api/operacoes/${encodeURIComponent(operationId)}`);const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||'Falha ao consultar operação.');const op=d.operation;const isWm10=op.origin==='wm10'||op.legacy===true;
      const items=(op.items||[]).map(i=>{const code=i.wm10ProductCode?`<small class="customer-legacy-item-code">WM10 #${escapeHtml(i.wm10ProductCode)}</small>`:'';const obs=i.observation?`<small>${escapeHtml(i.observation)}</small>`:'';return `<tr><td><strong>${escapeHtml(i.name||'Item')}</strong>${code}${obs}</td><td>${i.quantity}</td><td>${money(i.unitPrice)}</td><td>${money(Number(i.quantity||0)*Number(i.unitPrice||0)-Number(i.discount||0))}</td></tr>`;}).join('')||'<tr><td colspan="4">Sem itens.</td></tr>';
      const timeline=(op.timeline||[]).map(e=>{const note=e.type==='operation_note_added'?e.details?.note:'';return `<article><strong>${escapeHtml(e.label||e.type)}</strong>${note?`<p>${escapeHtml(note)}</p>`:''}<small>${fmtDate(e.at)} · ${escapeHtml(e.actor||'sistema')}</small></article>`;}).join('')||'<p>Sem eventos.</p>';
      const legacyDetails=op.details?`<p><strong>Observação complementar anterior:</strong> ${escapeHtml(op.details)}</p>`:'';
      const originBox=isWm10?`<div class="customer-legacy-warning"><strong>Histórico importado do WM10</strong><span>Somente consulta. Esta operação não movimenta estoque, caixa, financeiro ou comissão no Quality ERP.</span><small>Código original WM10: #${escapeHtml(op.wm10?.operationCode||op.number||'—')}</small></div>`:'';
      const actions=isWm10?'<button class="btn" id="backToHistory">← Voltar ao histórico</button>':`<button class="btn" id="backToHistory">← Voltar ao histórico</button> <a class="btn" target="_blank" href="/erp/pdv?operacao=${encodeURIComponent(op.id)}&imprimir=1">Imprimir</a>`;
      const logBlock=isWm10?'':`<section class="operation-detail-box"><h3>Histórico / log</h3><div class="operation-timeline">${timeline}</div><form id="operationNoteForm" class="operation-note-form"><label for="operationNoteText"><strong>Adicionar observação à operação</strong><small> O texto será acrescentado ao histórico sem apagar informações anteriores.</small></label><textarea id="operationNoteText" name="note" required placeholder="Ex.: Cliente retirou o aparelho, entrou em contato ou recebeu nova orientação."></textarea><div class="operation-note-actions"><button class="btn primary" type="submit">Adicionar observação</button></div></form></section>`;
      openFeature(`${op.type==='service_order'?'O.S.':'Venda'} #${op.number} · ${op.displayCustomer}`,`${actions}${originBox}<div class="operation-detail-box"><p><strong>Data:</strong> ${fmtDate(op.dates?.finalizedAt||op.dates?.openedAt||op.createdAt)} &nbsp; <strong>Situação:</strong> ${statusText[op.status]||op.status} &nbsp; <strong>Total:</strong> ${money(op.total)}</p><p><strong>Observação original:</strong> ${escapeHtml(op.notes||'—')}</p>${legacyDetails}<table class="operation-items"><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${items}</tbody></table></div>${logBlock}`);
      document.getElementById('backToHistory')?.addEventListener('click',()=>showHistory(customerId,backPage));
      if(!isWm10)document.getElementById('operationNoteForm')?.addEventListener('submit',async e=>{e.preventDefault();const note=String(new FormData(e.currentTarget).get('note')||'').trim();if(!note)return;const button=e.currentTarget.querySelector('button[type="submit"]');if(button)button.disabled=true;const rr=await fetch(`/erp/clientes/${encodeURIComponent(customerId)}/api/operacoes/${encodeURIComponent(operationId)}/observacoes`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note})});const dd=await rr.json();if(!rr.ok||!dd.success){if(button)button.disabled=false;alert(dd.message||'Não foi possível adicionar a observação.');return;}showOperationDetail(customerId,operationId,backPage);});
    }catch(e){openFeature('Operação do cliente',`<p>${e.message}</p>`);}
  }

  async function showHistory(id,page=1){openFeature('Histórico do cliente','Carregando...');try{const r=await fetch(`/erp/clientes/${encodeURIComponent(id)}/api/historico?page=${page}&pageSize=10`);const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||'Falha ao consultar.');const rows=d.items.map(op=>{const origin=op.origin==='wm10'?'<span class="customer-history-origin wm10">WM10</span>':'<span class="customer-history-origin">Quality</span>';return `<tr class="customer-history-row" data-operation-id="${escapeHtml(op.id)}"><td>#${escapeHtml(op.number)}</td><td>${op.type==='service_order'?'O.S.':'Venda'}</td><td>${fmtDate(op.dates?.finalizedAt||op.dates?.openedAt||op.createdAt)}</td><td>${money(op.total)}</td><td>${statusText[op.status]||op.status}</td><td>${origin}</td><td>${escapeHtml(op.notes||op.details||'Sem observação')}</td></tr>`;}).join('')||'<tr><td colspan="7">Nenhuma operação encontrada.</td></tr>';openFeature(`Histórico · ${d.customer.name}`,`<p>${d.total} operação(ões) encontrada(s). O selo <strong>WM10</strong> identifica o histórico importado, sem efeito em estoque ou financeiro.</p><table class="customer-history-table"><thead><tr><th>Nº</th><th>Tipo</th><th>Data</th><th>Total</th><th>Situação</th><th>Origem</th><th>Observação</th></tr></thead><tbody>${rows}</tbody></table><div class="customer-pagination"><button class="btn" id="historyPrev" ${d.page<=1?'disabled':''}>Anterior</button><span>Página ${d.page} de ${d.pages}</span><button class="btn" id="historyNext" ${d.page>=d.pages?'disabled':''}>Próxima</button></div>`);document.querySelectorAll('.customer-history-row').forEach(row=>row.addEventListener('click',()=>showOperationDetail(id,row.dataset.operationId,d.page)));document.getElementById('historyPrev')?.addEventListener('click',()=>showHistory(id,d.page-1));document.getElementById('historyNext')?.addEventListener('click',()=>showHistory(id,d.page+1));}catch(e){openFeature('Histórico do cliente',`<p>${e.message}</p>`);}}
  document.querySelectorAll('.customer-history').forEach(button=>button.addEventListener('click',()=>showHistory(button.dataset.id,1)));

  async function showCreditAccount(id){openFeature('Crediário do cliente','Carregando...');try{const r=await fetch(`/erp/clientes/${encodeURIComponent(id)}/api/crediario`);const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||'Falha ao consultar crediário.');const s=d.summary;const statusText={open:'Em aberto',partial:'Parcial',paid:'Recebido',cancelled:'Cancelado',reversed:'Estornado'};const rows=(d.titles||[]).map(t=>`<tr><td><b>${String(t.number||'').replace(/^0+/,'')||t.number}</b></td><td>${t.originLabel||'—'}</td><td>${fmtDate(t.issueDate||t.createdAt)}</td><td>${money(t.netValue)}</td><td>${money(t.openBalance)}</td><td><span class="credit-status credit-status-${t.status}">${statusText[t.status]||'Em aberto'}</span></td><td><a class="btn" target="_blank" rel="noopener" href="/erp/financeiro/contas-a-receber?cliente=${encodeURIComponent(id)}&titulo=${encodeURIComponent(t.id)}">Abrir ficha</a></td></tr>`).join('')||'<tr><td colspan="7">Nenhum título encontrado.</td></tr>';openFeature(`Central de crediário · ${d.customer.name}`,`<div class="credit-summary-row"><div class="credit-summary-card"><span>Limite</span><strong>${Number(s.creditLimit)>0?money(s.creditLimit):'Não configurado'}</strong></div><div class="credit-summary-card"><span>Disponível</span><strong>${s.availableCredit===null?'—':money(s.availableCredit)}</strong></div><div class="credit-summary-card"><span>Em aberto</span><strong>${money(s.openBalance)}</strong></div><div class="credit-summary-card"><span>Vencido</span><strong>${money(s.overdueBalance)}</strong></div></div><div class="credit-central-note">Clique em <b>Abrir ficha</b> para consultar produtos, parcelas, recebimentos, comprovantes e histórico completo.</div><div class="credit-table-wrap"><table class="credit-table"><thead><tr><th>Nº</th><th>Origem</th><th>Emissão</th><th>Valor</th><th>Saldo</th><th>Situação</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`);}catch(e){openFeature('Crediário do cliente',`<p>${e.message}</p>`);}}
  document.querySelectorAll('.customer-credit-account').forEach(button=>button.addEventListener('click',()=>showCreditAccount(button.dataset.id)));

  async function showWallet(id){openFeature('Carteira do cliente','Carregando...');try{const r=await fetch(`/erp/clientes/${encodeURIComponent(id)}/api/carteira`);const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||'Falha ao consultar.');const customer=customers.find(c=>String(c.id)===String(id))||{};const entries=(d.items||[]).map(i=>`<div class="wallet-entry"><span>${fmtDate(i.createdAt)}</span><strong class="wallet-${i.direction}">${i.direction==='credit'?'+':'-'} ${money(i.value)}</strong><span>${i.reason||i.type}</span><span>Saldo ${money(i.balanceAfter)}</span></div>`).join('')||'<p>Nenhum lançamento na carteira.</p>';openFeature(`Carteira · ${customer.name||'Cliente'}`,`<div class="wallet-summary"><span>Saldo atual</span><h2>${money(d.balance)}</h2></div><form class="wallet-form" id="walletForm"><select name="direction"><option value="credit">Adicionar crédito</option><option value="debit">Utilizar / debitar</option></select><input name="value" inputmode="decimal" placeholder="Valor" required><input name="reason" placeholder="Motivo: vale, devolução, cupom..." required><button class="btn" type="submit">Lançar</button></form><div>${entries}</div>`);document.getElementById('walletForm')?.addEventListener('submit',async e=>{e.preventDefault();const form=new FormData(e.currentTarget);const payload={direction:form.get('direction'),value:String(form.get('value')).replace('.','').replace(',','.'),reason:form.get('reason')};const rr=await fetch(`/erp/clientes/${encodeURIComponent(id)}/api/carteira`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const dd=await rr.json();if(!rr.ok||!dd.success){alert(dd.message||'Falha ao lançar.');return;}showWallet(id);});}catch(e){openFeature('Carteira do cliente',`<p>${e.message}</p>`);}}
  document.querySelectorAll('.customer-wallet').forEach(button=>button.addEventListener('click',()=>showWallet(button.dataset.id)));
})();
