(() => {
  const root = document.getElementById('financeApp');
  if (!root) return;
  let catalogs = JSON.parse(root.dataset.catalogs || '{}');
  let current = 'paymentMethods';
  let showInactive = false;
  let submitting = false;
  let dirty = false;
  let catalogSearch = '';
  let searchTimer = null;
  const expandedCostCenters = new Set();
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
      const salesPaid = item.salesPaid !== undefined ? item.salesPaid === true : item.autoSettle === true;
      const purchasePaid = item.purchasePaid === true;
      const receipt = `Venda: ${salesPaid ? 'Baixa automática' : `${number(item.settlementDays)} dia(s)`} · Compras: ${purchasePaid ? 'Baixa automática' : 'Em aberto'}`;
      const fiscal = [item.nfcePaymentCode && `NFC-e ${item.nfcePaymentCode}`, item.fiscalType && item.fiscalType !== 'other' && item.fiscalType.replaceAll('_',' ')].filter(Boolean).join(' · ') || 'Não parametrizado';
      return `<tr><td><b>${esc(item.name)}</b><small>${esc(item.code || '')}</small></td><td>${esc(receipt)}<small>${number(item.feePercent) ? `Taxa ${number(item.feePercent)}%` : 'Sem taxa cadastrada'}</small></td><td>${esc(installments)}<small>${item.passInterestToCustomer ? 'Juros repassados' : 'Sem repasse automático'}</small></td><td>${esc(fiscal)}</td><td>${statusBadge(item)}</td><td>${actions('paymentMethods', item)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="finance-empty">Nenhuma forma de pagamento encontrada.</td></tr>';
  }

  function normalizeSearch(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  function renderCategoriesAccounts() {
    document.getElementById('financeHead').innerHTML = '<tr><th>Centro de custo / plano de conta</th><th>Classificação</th><th>Código</th><th>Situação</th><th></th></tr>';
    const centers = (catalogs.costCenters || []).filter(center => center.hiddenFromCatalog !== true);
    const accounts = (catalogs.accounts || []).filter(account => account.hiddenFromCatalog !== true);
    const rows = [];
    const query = normalizeSearch(catalogSearch);
    const visibleCenters = centers
      .filter(center => showInactive ? center.active === false || accounts.some(a => (a.costCenterId || a.categoryId) === center.id && a.active === false) : center.active !== false)
      .sort((a, b) => number(a.order, 999) - number(b.order, 999) || String(a.name).localeCompare(String(b.name), 'pt-BR'));
    visibleCenters.forEach(center => {
      const linked = accounts
        .filter(account => (account.costCenterId || account.categoryId) === center.id && (showInactive ? account.active === false : account.active !== false))
        .sort((a,b) => number(a.order, 999) - number(b.order, 999) || String(a.code || a.name).localeCompare(String(b.code || b.name), 'pt-BR', { numeric:true }));
      const centerMatches = !query || normalizeSearch(`${center.name} ${center.code || ''}`).includes(query);
      const filteredAccounts = query ? linked.filter(account => normalizeSearch(`${account.name} ${account.code || ''}`).includes(query)) : linked;
      if (query && !centerMatches && !filteredAccounts.length) return;

      const isExpanded = query ? true : expandedCostCenters.has(center.id);
      rows.push(`<tr class="finance-category-row ${isExpanded ? 'is-expanded' : ''}" data-expand-center="${esc(center.id)}" tabindex="0" aria-expanded="${isExpanded}"><td><b><span class="finance-category-arrow" aria-hidden="true">${isExpanded ? '▾' : '▸'}</span>${esc(center.name)}</b><small>Centro de custo · ${linked.length} plano${linked.length === 1 ? '' : 's'} de conta</small></td><td>${esc(center.nature || '—')}</td><td>${esc(center.code || '—')}</td><td>${statusBadge(center)}</td><td>${actions('costCenters', center)}</td></tr>`);

      if (!isExpanded) return;
      const shownAccounts = query && !centerMatches ? filteredAccounts : linked;
      if (!shownAccounts.length) rows.push(`<tr class="finance-account-empty"><td colspan="5">Nenhum Plano de Conta ${showInactive ? 'inativo' : 'ativo'} neste Centro de Custo.</td></tr>`);
      shownAccounts.forEach(account => rows.push(`<tr class="finance-account-row" data-parent-center="${esc(center.id)}"><td><span class="finance-tree-line">↳</span><b>${esc(account.name)}</b><small>Plano de conta vinculado a ${esc(center.name)}</small></td><td>${esc(center.nature || account.type || '—')}<small>Centro e DRE herdados automaticamente</small></td><td>${esc(account.code || '—')}</td><td>${statusBadge(account)}</td><td>${actions('accounts', account)}</td></tr>`));
    });
    document.getElementById('financeBody').innerHTML = rows.join('') || `<tr><td colspan="5" class="finance-empty">Nenhum resultado encontrado.</td></tr>`;
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
      ? `<label class="finance-catalog-search-old"><input type="search" id="financeCatalogSearch" placeholder="Pesquisar centro ou plano de conta" value="${esc(catalogSearch)}" autocomplete="off"></label>${filters}<button type="button" class="btn" data-new-catalog="costCenters">+ Novo centro de custo</button><button type="button" class="btn btn-primary" data-new-catalog="accounts">+ Novo plano de conta</button>`
      : `${filters}<button type="button" class="btn btn-primary" data-new-catalog="paymentMethods">+ Nova forma</button>`;
    current === 'paymentMethods' ? renderPaymentMethods() : renderCategoriesAccounts();
  }

  function setField(name, value) { if (form.elements[name]) form.elements[name].value = value ?? ''; }
  function setCheck(name, value) { if (form.elements[name]) form.elements[name].checked = value === true; }
  function open(catalog, item = {}) {
    form.reset(); submitting = false; dirty = false; submitButton.disabled = false; submitButton.textContent = 'Salvar cadastro';
    setField('catalog', catalog); setField('id', item.id); setField('name', item.name); setField('code', item.code); setCheck('active', item.active !== false);
    document.getElementById('financeFormTitle').textContent = item.id ? 'Editar cadastro' : ({ costCenters:'Novo centro de custo', accounts:'Novo plano de conta', paymentMethods:'Nova forma de pagamento' }[catalog]);
    document.querySelector('.finance-category-field').hidden = catalog !== 'accounts';
    document.querySelector('.finance-type-field').hidden = catalog !== 'costCenters';
    document.querySelector('.payment-config').hidden = catalog !== 'paymentMethods';
    const codeField=document.querySelector('.finance-code-field'), codeInput=form.elements.code, codeAuto=codeField?.querySelector('.finance-code-auto');
    if(codeField&&codeInput){
      const automatic=catalog==='accounts';
      codeInput.readOnly=automatic;
      codeInput.placeholder=automatic?'Gerado automaticamente':'';
      if(automatic&&!item.id) codeInput.value='';
      if(codeAuto) codeAuto.hidden=!automatic;
    }
    if (catalog === 'costCenters') setField('type', item.nature || 'despesa');
    if (catalog === 'accounts') {
      const select = form.elements.costCenterId;
      select.innerHTML = '<option value="">Selecione</option>' + (catalogs.costCenters || []).filter(c => c.active !== false || c.id === (item.costCenterId || item.categoryId)).map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.nature || '')}</option>`).join('');
      setField('costCenterId', item.costCenterId || item.categoryId);
    }
    if (catalog === 'paymentMethods') {
      const cashRule = String(item.code||'').trim().toUpperCase()==='DIN' || String(item.name||'').trim().toLowerCase()==='dinheiro' || item.id==='PM-DINHEIRO';
      setCheck('salesPaid', cashRule ? true : (item.salesPaid !== undefined ? item.salesPaid === true : item.autoSettle === true));
      setCheck('purchasePaid', cashRule ? true : item.purchasePaid === true);
      ['salesPaid','purchasePaid'].forEach(name=>{if(form.elements[name]){form.elements[name].disabled=cashRule;form.elements[name].closest('label')?.classList.toggle('is-system-locked',cashRule);}});
      setCheck('creditCashOnSale', item.creditCashOnSale !== false);
      setCheck('debitCashOnPurchase', item.debitCashOnPurchase !== false);
      ['allowInstallments','passInterestToCustomer','changeAllowed','generatesReceivable','requireIdentifiedCustomer','requireValidDocument','requireCreditReceipt'].forEach(name => setCheck(name, item[name] === true));
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
    current = button.dataset.tab; showInactive = false; catalogSearch = '';
    document.querySelectorAll('#financeTabs [data-tab]').forEach(item => item.classList.toggle('active', item === button)); render();
  });
  document.getElementById('catalogActions').addEventListener('click', event => {
    const status = event.target.closest('[data-status-view]'); if (status) { showInactive = status.dataset.statusView === 'inactive'; return render(); }
    const add = event.target.closest('[data-new-catalog]'); if (add) open(add.dataset.newCatalog);
  });
  document.getElementById('catalogActions').addEventListener('input', event => {
    if (event.target.id !== 'financeCatalogSearch') return;
    clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = setTimeout(() => { catalogSearch = value; renderCategoriesAccounts(); }, 140);
  });
  document.getElementById('financeBody').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit]'); if (edit) return open(edit.dataset.catalog, (catalogs[edit.dataset.catalog] || []).find(i => i.id === edit.dataset.edit) || {});
    const centerRow = event.target.closest('[data-expand-center]');
    if (centerRow && !event.target.closest('.finance-row-actions')) {
      const id = centerRow.dataset.expandCenter;
      expandedCostCenters.has(id) ? expandedCostCenters.delete(id) : expandedCostCenters.add(id);
      return renderCategoriesAccounts();
    }
    const toggle = event.target.closest('[data-toggle]'); if (!toggle) return;
    toggle.disabled = true;
    try {
      const response = await fetch(`/erp/financeiro/api/catalogos/${toggle.dataset.catalog}/${encodeURIComponent(toggle.dataset.toggle)}/situacao`, { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ active:toggle.dataset.active !== 'true' }) });
      const result = await response.json(); if (!result.success) throw new Error(result.message);
      const list = catalogs[toggle.dataset.catalog]; const index = list.findIndex(i => i.id === result.item.id); if (index >= 0) list[index] = result.item;
      toast(result.message); render();
    } catch (error) { toast(error.message || 'Não foi possível atualizar.', 'error'); toggle.disabled = false; }
  });


  document.getElementById('financeBody').addEventListener('keydown', event => {
    const centerRow = event.target.closest('[data-expand-center]');
    if (!centerRow || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    const id = centerRow.dataset.expandCenter;
    expandedCostCenters.has(id) ? expandedCostCenters.delete(id) : expandedCostCenters.add(id);
    renderCategoriesAccounts();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault(); if (submitting) return;
    if (!form.reportValidity()) return;
    const data = new FormData(form); const catalog = data.get('catalog');
    const payload = { id:data.get('id'), name:data.get('name'), code:data.get('code'), active:data.has('active') };
    if (catalog === 'accounts') delete payload.code;
    if (catalog === 'costCenters') payload.nature = data.get('type');
    if (catalog === 'accounts') { payload.costCenterId = data.get('costCenterId'); payload.categoryId = payload.costCenterId; const center = (catalogs.costCenters || []).find(i => i.id === payload.costCenterId); payload.type = center?.nature || 'despesa'; }
    if (catalog === 'paymentMethods') {
      const cashRule = String(data.get('code')||'').trim().toUpperCase()==='DIN' || String(data.get('name')||'').trim().toLowerCase()==='dinheiro' || data.get('id')==='PM-DINHEIRO';
      payload.salesPaid = cashRule ? true : data.has('salesPaid');
      payload.purchasePaid = cashRule ? true : data.has('purchasePaid');
      payload.creditCashOnSale = data.has('creditCashOnSale');
      payload.debitCashOnPurchase = data.has('debitCashOnPurchase');
      ['allowInstallments','passInterestToCustomer','changeAllowed','generatesReceivable','requireIdentifiedCustomer','requireValidDocument','requireCreditReceipt'].forEach(name => payload[name] = data.has(name));
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
      if(catalog==='accounts'||catalog==='costCenters'){
        try{localStorage.setItem('quality:finance-catalogs-updated',JSON.stringify({at:Date.now(),catalog,itemId:result.item.id}));}catch(_){/* armazenamento pode estar indisponível */}
      }
      dirty = false; dialog.close(); toast(result.message); render();
    } catch (error) { toast(error.message || 'Não foi possível salvar.', 'error'); }
    finally { submitting = false; submitButton.disabled = false; submitButton.textContent = 'Salvar cadastro'; }
  });
  // Tooltip em top-layer real: <dialog> também usa top-layer e ignora z-index comuns.
  const floatingTip=document.createElement('div');
  floatingTip.className='finance-floating-tooltip';
  const supportsPopover=typeof floatingTip.showPopover==='function';
  if(supportsPopover) floatingTip.setAttribute('popover','manual');
  else floatingTip.hidden=true;
  document.body.appendChild(floatingTip);
  const hideFloatingTip=()=>{try{if(supportsPopover){if(floatingTip.matches(':popover-open'))floatingTip.hidePopover();}else floatingTip.hidden=true;}catch(_){floatingTip.hidden=true;}};
  const showFloatingTip=tip=>{const text=tip?.dataset?.tooltip;if(!text)return;floatingTip.textContent=text;try{if(supportsPopover){if(!floatingTip.matches(':popover-open'))floatingTip.showPopover();}else floatingTip.hidden=false;}catch(_){floatingTip.hidden=false;}const rect=tip.getBoundingClientRect();requestAnimationFrame(()=>{const box=floatingTip.getBoundingClientRect();let left=rect.left+rect.width/2-box.width/2;left=Math.max(12,Math.min(left,window.innerWidth-box.width-12));let top=rect.top-box.height-10;if(top<12)top=Math.min(window.innerHeight-box.height-12,rect.bottom+10);floatingTip.style.left=`${left}px`;floatingTip.style.top=`${top}px`;});};
  dialog.addEventListener('mouseover',e=>{const tip=e.target.closest('.help-tip');if(tip)showFloatingTip(tip)});
  dialog.addEventListener('mouseout',e=>{if(e.target.closest('.help-tip'))hideFloatingTip()});
  dialog.addEventListener('focusin',e=>{const tip=e.target.closest('.help-tip');if(tip)showFloatingTip(tip)});
  dialog.addEventListener('focusout',e=>{if(e.target.closest('.help-tip'))hideFloatingTip()});
  dialog.addEventListener('scroll',hideFloatingTip,true);window.addEventListener('resize',hideFloatingTip);

  render();
})();
