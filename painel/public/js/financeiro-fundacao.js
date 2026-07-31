(() => {
  const root = document.getElementById('financeApp');
  if (!root) return;
  let catalogs = JSON.parse(root.dataset.catalogs || '{}');
  let current = 'paymentMethods';
  let showInactive = false;
  let submitting = false;
  let dirty = false;
  const dialog = document.getElementById('financeDialog');
  const form = document.getElementById('financeForm');
  const submitButton = document.getElementById('financeSubmitButton');
  const catalogPanel = document.getElementById('financeCatalogPanel');
  const generalPanel = document.getElementById('financeGeneralPanel');
  const receivablesPanel = document.getElementById('financeReceivablesPanel');
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const meta = {
    paymentMethods: ['Formas de pagamento', 'Configure utilização, parcelamento, juros, recebimento e parâmetros fiscais.'],
    categoriesAccounts: ['Centros de custo e planos de conta', 'Cada Plano de Conta fica organizado dentro de um Centro de Custo, preservando relatórios e integrações.']
  };

  function statusBadge(item) { return `<span class="finance-status ${item.active === false ? 'off' : ''}">${item.active === false ? 'Inativo' : 'Ativo'}</span>`; }
  function actions(catalog, item) { return `<div class="finance-row-actions"><button type="button" data-edit="${esc(item.id)}" data-catalog="${catalog}">Editar</button><button type="button" data-toggle="${esc(item.id)}" data-catalog="${catalog}" data-active="${item.active !== false}">${item.active === false ? 'Ativar' : 'Inativar'}</button></div>`; }
  function money(value) { return number(value).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
  function toast(message, type = 'success') {
    let node = document.querySelector('.finance-toast');
    if (!node) { node = document.createElement('div'); node.className = 'finance-toast'; document.body.appendChild(node); }
    node.className = `finance-toast ${type}`; node.textContent = message; clearTimeout(node._timer); node._timer = setTimeout(() => node.remove(), 2800);
  }

  function renderPaymentMethods() {
    document.getElementById('financeHead').innerHTML = '<tr><th>Forma</th><th>Recebimento</th><th>Parcelamento</th><th>Fiscal</th><th>Situação</th><th></th></tr>';
    const visibleItems = (catalogs.paymentMethods || []).filter(item => showInactive ? item.active === false : item.active !== false);
    document.getElementById('financeBody').innerHTML = visibleItems.map(item => {
      const installments = item.allowInstallments ? `Até ${number(item.maxInstallments, 1)}x${number(item.minimumInstallmentValue) > 0 ? ` · mín. ${money(item.minimumInstallmentValue)}` : ''}` : 'À vista';
      const receipt = item.autoSettle ? 'Baixa automática' : `${number(item.settlementDays)} dia(s)`;
      const fiscal = [item.nfcePaymentCode && `NFC-e ${item.nfcePaymentCode}`, item.fiscalType && item.fiscalType !== 'other' && item.fiscalType.replaceAll('_',' ')].filter(Boolean).join(' · ') || 'Não parametrizado';
      return `<tr><td><b>${esc(item.name)}</b><small>${esc(item.code || '')}</small></td><td>${esc(receipt)}<small>${number(item.feePercent) ? `Taxa ${number(item.feePercent)}%` : 'Sem taxa cadastrada'}</small></td><td>${esc(installments)}<small>${item.passInterestToCustomer ? 'Juros repassados' : 'Sem repasse automático'}</small></td><td>${esc(fiscal)}</td><td>${statusBadge(item)}</td><td>${actions('paymentMethods', item)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="finance-empty">Nenhuma forma de pagamento encontrada.</td></tr>';
  }

  function renderCategoriesAccounts() {
    document.getElementById('financeHead').innerHTML = '<tr><th>Centro de custo / plano de conta</th><th>Classificação</th><th>Código</th><th>Situação</th><th></th></tr>';
    const centers = catalogs.categories || [];
    const accounts = catalogs.accounts || [];
    const rows = [];
    const visibleCenters = centers.filter(center => showInactive ? center.active === false || accounts.some(a => a.categoryId === center.id && a.active === false) : center.active !== false);
    visibleCenters.forEach(center => {
      rows.push(`<tr class="finance-category-row"><td><b>◼ ${esc(center.name)}</b><small>Centro de custo</small></td><td>${esc(center.nature || '—')}</td><td>${esc(center.code || '—')}</td><td>${statusBadge(center)}</td><td>${actions('categories', center)}</td></tr>`);
      const linked = accounts.filter(account => account.categoryId === center.id && (showInactive ? account.active === false : account.active !== false));
      if (!linked.length) rows.push(`<tr class="finance-account-empty"><td colspan="5">Nenhum Plano de Conta ${showInactive ? 'inativo' : 'ativo'} neste Centro de Custo.</td></tr>`);
      linked.sort((a,b) => String(a.code || a.name).localeCompare(String(b.code || b.name), 'pt-BR', { numeric:true })).forEach(account => rows.push(`<tr class="finance-account-row"><td><span class="finance-tree-line">↳</span><b>${esc(account.name)}</b><small>Plano de conta</small></td><td>${esc(center.nature || account.type || '—')}</td><td>${esc(account.code || '—')}</td><td>${statusBadge(account)}</td><td>${actions('accounts', account)}</td></tr>`));
    });
    document.getElementById('financeBody').innerHTML = rows.join('') || `<tr><td colspan="5" class="finance-empty">Nenhum cadastro ${showInactive ? 'inativo' : 'ativo'} encontrado.</td></tr>`;
  }

  function render() {
    const special = current === 'general' || current === 'receivables';
    catalogPanel.hidden = special;
    generalPanel.hidden = current !== 'general';
    receivablesPanel.hidden = current !== 'receivables';
    if (special) return;
    document.getElementById('catalogTitle').textContent = meta[current][0];
    document.getElementById('catalogDescription').textContent = meta[current][1];
    const filters = `<div class="finance-status-filter"><button type="button" data-status-view="active" class="${showInactive ? '' : 'active'}">Ativos</button><button type="button" data-status-view="inactive" class="${showInactive ? 'active' : ''}">Inativos</button></div>`;
    document.getElementById('catalogActions').innerHTML = current === 'categoriesAccounts'
      ? `${filters}<button type="button" class="btn" data-new-catalog="categories">+ Novo centro de custo</button><button type="button" class="btn btn-primary" data-new-catalog="accounts">+ Novo plano de conta</button>`
      : `${filters}<button type="button" class="btn btn-primary" data-new-catalog="paymentMethods">+ Nova forma</button>`;
    current === 'paymentMethods' ? renderPaymentMethods() : renderCategoriesAccounts();
  }

  function setField(name, value) { if (form.elements[name]) form.elements[name].value = value ?? ''; }
  function setCheck(name, value) { if (form.elements[name]) form.elements[name].checked = value === true; }
  function open(catalog, item = {}) {
    form.reset(); submitting = false; dirty = false; submitButton.disabled = false; submitButton.textContent = 'Salvar cadastro';
    setField('catalog', catalog); setField('id', item.id); setField('name', item.name); setField('code', item.code); setCheck('active', item.active !== false);
    document.getElementById('financeFormTitle').textContent = item.id ? 'Editar cadastro' : ({ categories:'Novo centro de custo', accounts:'Novo plano de conta', paymentMethods:'Nova forma de pagamento' }[catalog]);
    document.querySelector('.finance-category-field').hidden = catalog !== 'accounts';
    document.querySelector('.finance-type-field').hidden = catalog !== 'categories';
    document.querySelector('.payment-config').hidden = catalog !== 'paymentMethods';
    if (catalog === 'categories') setField('type', item.nature || 'despesa');
    if (catalog === 'accounts') {
      const select = form.elements.categoryId;
      select.innerHTML = '<option value="">Selecione</option>' + (catalogs.categories || []).filter(c => c.active !== false || c.id === item.categoryId).map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.nature || '')}</option>`).join('');
      setField('categoryId', item.categoryId);
    }
    if (catalog === 'paymentMethods') {
      ['autoSettle','allowInstallments','passInterestToCustomer','changeAllowed','generatesReceivable','requireIdentifiedCustomer','requireValidDocument','requireCreditReceipt'].forEach(name => setCheck(name, item[name] === true));
      ['maxInstallments','minimumInstallmentValue','settlementDays','feePercent','monthlyInterestPercent','firstDueDays','installmentIntervalDays','lateGraceDays','lateFineFixed','lateFinePercent','lateInterestPercent','lateAdministrativeFeePercent','lateInterestPeriod','lateInterestType','nfcePaymentCode','fiscalType','acquirerCode'].forEach(name => setField(name, item[name] ?? ({ maxInstallments:1, installmentIntervalDays:30, lateInterestPeriod:'daily', lateInterestType:'simple', fiscalType:'other' }[name] ?? 0)));
      setField('cardBrandRequired', String(item.cardBrandRequired === true));
      ['sales','purchases','pdv','serviceOrders','finance'].forEach(key => setCheck(`modules.${key}`, item.modules?.[key] === true));
    }
    dialog.showModal();
    requestAnimationFrame(() => form.elements.name?.focus());
  }

  function closeDialog(force = false) {
    if (submitting) return;
    if (!force && dirty && !confirm('Descartar as alterações não salvas?')) return;
    dirty = false; form.reset(); if (dialog.open) dialog.close();
  }
  form.addEventListener('input', () => { if (dialog.open) dirty = true; });
  dialog.querySelector('.finance-dialog-close').addEventListener('click', () => closeDialog());
  dialog.querySelector('.finance-dialog-cancel').addEventListener('click', () => closeDialog());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(); });

  document.getElementById('financeTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-tab]'); if (!button) return;
    current = button.dataset.tab; showInactive = false;
    document.querySelectorAll('#financeTabs [data-tab]').forEach(item => item.classList.toggle('active', item === button)); render();
  });
  document.getElementById('catalogActions').addEventListener('click', event => {
    const status = event.target.closest('[data-status-view]'); if (status) { showInactive = status.dataset.statusView === 'inactive'; return render(); }
    const add = event.target.closest('[data-new-catalog]'); if (add) open(add.dataset.newCatalog);
  });
  document.getElementById('financeBody').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit]'); if (edit) return open(edit.dataset.catalog, (catalogs[edit.dataset.catalog] || []).find(i => i.id === edit.dataset.edit) || {});
    const toggle = event.target.closest('[data-toggle]'); if (!toggle) return;
    toggle.disabled = true;
    try {
      const response = await fetch(`/erp/financeiro/api/catalogos/${toggle.dataset.catalog}/${encodeURIComponent(toggle.dataset.toggle)}/situacao`, { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ active:toggle.dataset.active !== 'true' }) });
      const result = await response.json(); if (!result.success) throw new Error(result.message);
      const list = catalogs[toggle.dataset.catalog]; const index = list.findIndex(i => i.id === result.item.id); if (index >= 0) list[index] = result.item;
      toast(result.message); render();
    } catch (error) { toast(error.message || 'Não foi possível atualizar.', 'error'); toggle.disabled = false; }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submitting) return;
    if (!form.reportValidity()) return;
    const data = new FormData(form); const catalog = data.get('catalog');
    const payload = { id:data.get('id'), name:data.get('name'), code:data.get('code'), active:data.has('active') };
    if (catalog === 'categories') payload.nature = data.get('type');
    if (catalog === 'accounts') { payload.categoryId = data.get('categoryId'); const center = (catalogs.categories || []).find(i => i.id === payload.categoryId); payload.type = center?.nature || 'despesa'; }
    if (catalog === 'paymentMethods') {
      ['autoSettle','allowInstallments','passInterestToCustomer','changeAllowed','generatesReceivable','requireIdentifiedCustomer','requireValidDocument','requireCreditReceipt'].forEach(name => payload[name] = data.has(name));
      ['maxInstallments','minimumInstallmentValue','settlementDays','feePercent','monthlyInterestPercent','firstDueDays','installmentIntervalDays','lateGraceDays','lateFineFixed','lateFinePercent','lateInterestPercent','lateAdministrativeFeePercent'].forEach(name => payload[name] = data.get(name));
      ['lateInterestPeriod','lateInterestType'].forEach(name => payload[name] = data.get(name));
      ['nfcePaymentCode','fiscalType','acquirerCode'].forEach(name => payload[name] = data.get(name));
      payload.cardBrandRequired = data.get('cardBrandRequired') === 'true'; payload.modules = {};
      ['sales','purchases','pdv','serviceOrders','finance'].forEach(key => payload.modules[key] = data.has(`modules.${key}`));
    }
    submitting = true; submitButton.disabled = true; submitButton.textContent = 'Salvando…';
    try {
      const response = await fetch(`/erp/financeiro/api/catalogos/${catalog}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload) });
      const result = await response.json(); if (!result.success) throw new Error(result.message);
      const list = catalogs[catalog]; const index = list.findIndex(i => i.id === result.item.id); index >= 0 ? list[index] = result.item : list.push(result.item);
      dirty = false; dialog.close(); toast(result.message); render();
    } catch (error) { toast(error.message || 'Não foi possível salvar.', 'error'); }
    finally { submitting = false; submitButton.disabled = false; submitButton.textContent = 'Salvar cadastro'; }
  });
  render();
})();
