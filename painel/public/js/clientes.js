(() => {
  const normalize = (value='') => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const digits = (value='') => String(value || '').replace(/\D/g,'');
  const parse = id => { try { return JSON.parse(document.getElementById(id)?.textContent || '[]'); } catch (_) { return []; } };
  let customers = parse('customersData');
  const search = document.getElementById('customerSearch');
  const statusFilter = document.getElementById('customerStatusFilter');
  const typeFilter = document.getElementById('customerTypeFilter');
  const classificationFilter = document.getElementById('customerClassificationFilter');
  const rows = [...document.querySelectorAll('[data-customer-row]')];
  function filterRows(){let visible=0; const term=normalize(search?.value); rows.forEach(row=>{const show=(!term||normalize(row.dataset.search).includes(term))&&(!statusFilter.value||row.dataset.status===statusFilter.value)&&(!typeFilter.value||row.dataset.type===typeFilter.value)&&(!classificationFilter.value||row.dataset.classification===classificationFilter.value); row.hidden=!show;if(show)visible++;});document.getElementById('customerResultCount').textContent=`${visible} cliente(s) encontrado(s)`;document.getElementById('customersEmpty').hidden=visible!==0;}
  [search,statusFilter,typeFilter,classificationFilter].filter(Boolean).forEach(el=>el.addEventListener(el===search?'input':'change',filterRows));
  document.getElementById('customerClearFilters')?.addEventListener('click',()=>{search.value='';statusFilter.value='';typeFilter.value='';classificationFilter.value='';filterRows();search.focus();});

  const drawer=document.getElementById('customerDrawer'),backdrop=document.getElementById('customerDrawerBackdrop'),form=document.getElementById('customerForm'),message=document.getElementById('customerMessage'),duplicateBox=document.getElementById('customerDuplicateBox'),toggleActive=document.getElementById('customerToggleActive');
  const fields=['id','personType','name','tradeName','document','stateRegistration','companyStatus','openingDate','legalNature','companySize','primaryCnae','birthDate','mobile','phone','email','zipCode','street','number','complement','district','city','state','classificationId','origin','notes','active'];
  const byName = name => form.elements.namedItem(name);
  function openDrawer(customer=null){form.reset();message.hidden=true;duplicateBox.hidden=true;lastResolvedZip='';lastResolvedCnpj='';setZipStatus('');fields.forEach(name=>{const field=byName(name);if(field)field.value=customer?.[name] ?? (name==='personType'?'pf':name==='classificationId'?'none':name==='active'?'true':'');});if(documentField){documentField.value=formatDocument(documentField.value,personTypeField?.value);documentField.placeholder=personTypeField?.value==='pj'?'00.000.000/0000-00':'000.000.000-00';setDocumentStatus('');clearDocumentAction();updatePersonTypeFields();updateAgeInfo();}document.getElementById('customerDrawerTitle').textContent=customer?'Detalhes do cliente':'Novo cliente';document.getElementById('customerDrawerCode').textContent=customer?`Código ${customer.code}`:'Cadastro rápido ou completo';toggleActive.hidden=!customer; if(customer){toggleActive.textContent=customer.active===false?'Reativar cliente':'Inativar cliente';toggleActive.className=`btn ${customer.active===false?'success':'danger'}`;} selectTab('main');backdrop.hidden=false;drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';setTimeout(() => {
    if (customer) byName('name')?.focus();
    else documentField?.focus();
  }, 100);}
  function closeDrawer(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true;document.body.style.overflow='';}
  function selectTab(tab){document.querySelectorAll('[data-customer-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerTab===tab));document.querySelectorAll('[data-customer-panel]').forEach(panel=>panel.hidden=panel.dataset.customerPanel!==tab);}
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
    openButton.textContent = `Abrir cliente ${customer.code || ''}`.trim();
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
      setDocumentStatus(`${label} já cadastrado para ${existing.name} · código ${existing.code} · cliente ${status}.`, 'warning');
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
    const birth = new Date(`${dateValue}T12:00:00`);
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
    document.querySelectorAll('.customer-pj-field').forEach(el => { el.hidden = !isCompany; });
    document.querySelectorAll('.customer-pf-field').forEach(el => { el.hidden = isCompany; });
    const documentLabel = document.getElementById('customerDocumentLabel');
    if (documentLabel) documentLabel.textContent = isCompany ? 'CNPJ' : 'CPF';
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

      const numberField = byName('number');
      if (numberField && !numberField.value) numberField.focus();
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
  birthDateField?.addEventListener('input', updateAgeInfo);
  birthDateField?.addEventListener('change', updateAgeInfo);
  updateAgeInfo();

  function payload(){const data=Object.fromEntries(new FormData(form).entries());data.active=data.active!=='false';return data;}
  function showMessage(text,type='error'){message.className=`customer-message ${type}`;message.textContent=text;message.hidden=false;}
  function showDuplicates(items=[]){duplicateBox.innerHTML=`<strong>⚠ Possível duplicidade</strong>${items.map(item=>`<p><b>${item.name}</b> · código ${item.code}${item.mobile?` · ${item.mobile}`:''}</p>`).join('')}<button type="button" class="btn" id="customerForceSave">Salvar mesmo assim</button>`;duplicateBox.hidden=false;document.getElementById('customerForceSave')?.addEventListener('click',()=>save(true));}
  async function save(allowDuplicate=false){message.hidden=true;duplicateBox.hidden=true;if(!validateDocumentField()){selectTab('main');documentField?.focus();documentField?.reportValidity();return;}const data=payload();const id=data.id;const button=document.getElementById('customerSave');button.disabled=true;button.textContent='Salvando...';try{const response=await fetch(id?`/erp/clientes/${encodeURIComponent(id)}`:'/erp/clientes',{method:id?'PUT':'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({...data,allowDuplicate})});const result=await response.json();if(!response.ok||!result.success){
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
})();
