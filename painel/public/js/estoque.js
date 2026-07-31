(() => {
  const normalize = (value = '') => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const search = document.getElementById('inventorySearch');
  const category = document.getElementById('inventoryCategory');
  const subcategory = document.getElementById('inventorySubcategory');
  const status = document.getElementById('inventoryStatus');
  const clearButton = document.getElementById('inventoryClearFilters');
  const resultCount = document.getElementById('inventoryResultCount');
  const empty = document.getElementById('inventoryEmpty');
  const rows = [...document.querySelectorAll('[data-inventory-row]')];

  function applyFilters() {
    if (!search || !category || !subcategory || !status) return;
    const term = normalize(search.value);
    const selectedCategory = category.value;
    const selectedSubcategory = subcategory.value;
    const selectedStatus = status.value;
    let visible = 0;
    rows.forEach((row) => {
      const matches = (!term || normalize(row.dataset.search).includes(term)) &&
        (!selectedCategory || row.dataset.category === selectedCategory) &&
        (!selectedSubcategory || row.dataset.subcategory === selectedSubcategory) &&
        (!selectedStatus || row.dataset.status === selectedStatus);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    if (resultCount) resultCount.textContent = `${visible} produto(s) encontrado(s)`;
    if (empty) empty.hidden = visible !== 0;
  }
  [search, category, subcategory, status].filter(Boolean).forEach((field) => field.addEventListener(field === search ? 'input' : 'change', applyFilters));
  clearButton?.addEventListener('click', () => { search.value=''; category.value=''; subcategory.value=''; status.value=''; applyFilters(); search.focus(); });

  const drawer = document.getElementById('inventoryDrawer');
  const backdrop = document.getElementById('inventoryDrawerBackdrop');
  const closeButton = document.getElementById('inventoryDrawerClose');
  const form = document.getElementById('inventoryMovementForm');
  const message = document.getElementById('inventoryFormMessage');
  const historyList = document.getElementById('inventoryHistoryList');
  const reloadHistory = document.getElementById('inventoryReloadHistory');
  let currentButton = null;
  const RECENT_REASONS_KEY = 'quality_inventory_recent_reasons_v1';

  const number = (value) => Number(value) || 0;
  const formatDate = (value) => { try { return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); } catch { return value || ''; } };
  const esc = (value='') => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function setBalances(balance) {
    document.getElementById('drawerPhysical').textContent = number(balance.physicalQuantity);
    document.getElementById('drawerReserved').textContent = number(balance.reservedQuantity);
    document.getElementById('drawerAvailable').textContent = number(balance.availableQuantity);
    document.getElementById('drawerMinimum').textContent = number(balance.minimumQuantity);
  }

  function movementLabel(item, signed) {
    if (item.type === 'entrada_inicial') return 'Entrada inicial';
    const origin = String(item.origin || '');
    if (origin === 'estoque_operacao_manual') {
      if (signed > 0) return 'Entrada manual';
      if (signed < 0) return 'Saída manual';
      return 'Ajuste manual';
    }
    return signed >= 0 ? 'Entrada / ajuste positivo' : 'Saída / ajuste negativo';
  }

  function renderHistory(items = []) {
    if (!historyList) return;
    if (!items.length) { historyList.innerHTML = '<div class="inventory-history-empty">Nenhuma movimentação registrada para este produto.</div>'; return; }
    historyList.innerHTML = items.map(item => {
      const signed = number(item.signedQuantity);
      const direction = signed >= 0 ? 'entrada' : 'saida';
      const label = movementLabel(item, signed);
      return `<article class="inventory-history-item inventory-history-${direction}">
        <div class="inventory-history-icon">${signed >= 0 ? '↑' : '↓'}</div>
        <div class="inventory-history-content"><div><strong>${esc(label)}</strong><time>${esc(formatDate(item.createdAt))}</time></div><p>${esc(item.reason || 'Sem motivo informado')}</p><small>${esc(item.createdBy || 'painel')}</small><span class="inventory-history-balance">Saldo ${number(item.previousPhysicalQuantity)} → ${number(item.newPhysicalQuantity)}</span></div>
        <b class="inventory-history-quantity">${signed > 0 ? '+' : ''}${signed}</b>
      </article>`;
    }).join('');
  }

  async function loadHistory() {
    const itemId = document.getElementById('movementInventoryItemId')?.value;
    if (!itemId) return;
    historyList.innerHTML = '<div class="inventory-history-empty">Carregando histórico...</div>';
    try {
      const response = await fetch(`/erp/estoque/${encodeURIComponent(itemId)}/movimentos`, { headers:{Accept:'application/json'} });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Falha ao carregar histórico.');
      setBalances(data.balance);
      renderHistory(data.movements);
    } catch (error) { historyList.innerHTML = `<div class="inventory-history-empty inventory-history-error">${esc(error.message)}</div>`; }
  }

  function openDrawer(button) {
    currentButton = button;
    const id = button.dataset.inventoryItemId;
    document.getElementById('inventoryDrawerTitle').textContent = button.dataset.productName || 'Movimentar estoque';
    document.getElementById('inventoryDrawerItemId').textContent = id;
    document.getElementById('movementInventoryItemId').value = id;
    setBalances({physicalQuantity:button.dataset.physical,reservedQuantity:button.dataset.reserved,availableQuantity:button.dataset.available,minimumQuantity:button.dataset.minimum});
    form.reset(); document.getElementById('movementInventoryItemId').value=id; setReasonMetadata('', ''); selectOperation('entrada'); message.hidden=true;
    backdrop.hidden=false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); document.body.classList.add('inventory-drawer-open');
    loadHistory();
  }
  function closeDrawer() { drawer?.classList.remove('open'); drawer?.setAttribute('aria-hidden','true'); if(backdrop) backdrop.hidden=true; document.body.classList.remove('inventory-drawer-open'); currentButton=null; }

  function selectOperation(operation) {
    document.getElementById('movementOperation').value = operation;
    document.querySelectorAll('.inventory-operation-tab').forEach(tab => tab.classList.toggle('active',tab.dataset.operation===operation));
    const labels={entrada:'Quantidade de entrada',saida:'Quantidade de saída',ajuste:'Novo saldo físico'};
    const buttons={entrada:'Registrar entrada',saida:'Registrar saída',ajuste:'Registrar ajuste'};
    document.getElementById('movementQuantityLabel').textContent=labels[operation];
    document.getElementById('inventorySubmitMovement').textContent=buttons[operation];
    const quantityField = document.getElementById('movementQuantity');
    quantityField.min = operation === 'ajuste' ? '0' : '1';
    quantityField.step = '1';
    quantityField.placeholder = operation === 'ajuste' ? '0' : '1';
  }


  function getRecentReasons() {
    try {
      return JSON.parse(localStorage.getItem(RECENT_REASONS_KEY) || '[]')
        .filter(Boolean)
        .map(item => typeof item === 'string'
          ? { reason: item, reasonCode: '', classification: '' }
          : {
              reason: String(item.reason || '').trim(),
              reasonCode: String(item.reasonCode || '').trim(),
              classification: String(item.classification || '').trim()
            })
        .filter(item => item.reason)
        .slice(0, 5);
    } catch (_) { return []; }
  }

  function saveRecentReason(reason, reasonCode = '', classification = '') {
    const clean = String(reason || '').trim();
    if (!clean) return;
    const recent = { reason: clean, reasonCode: String(reasonCode || ''), classification: String(classification || '') };
    const list = [recent, ...getRecentReasons().filter(item => normalize(item.reason) !== normalize(clean))].slice(0, 5);
    localStorage.setItem(RECENT_REASONS_KEY, JSON.stringify(list));
    renderRecentReasons();
  }

  function setReasonMetadata(reasonCode = '', classification = '') {
    const reasonCodeField = document.getElementById('movementReasonCode');
    const classificationField = document.getElementById('movementClassification');
    if (reasonCodeField) reasonCodeField.value = String(reasonCode || '');
    if (classificationField) classificationField.value = String(classification || '');
  }

  function chooseReason(reason, button = null, reasonCode = '', classification = '') {
    const field = document.getElementById('movementReason');
    if (!field) return;
    field.value = reason;
    setReasonMetadata(reasonCode, classification);
    document.querySelectorAll('[data-reason]').forEach(item => item.classList.toggle('active', item === button));
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }

  function renderRecentReasons() {
    const group = document.getElementById('inventoryRecentReasons');
    const container = document.getElementById('inventoryRecentReasonChips');
    if (!group || !container) return;
    const list = getRecentReasons();
    group.hidden = !list.length;
    container.innerHTML = list.map(item => `<button type="button" data-reason="${esc(item.reason)}" data-reason-code="${esc(item.reasonCode)}" data-classification="${esc(item.classification)}">${esc(item.reason)}</button>`).join('');
  }

  document.addEventListener('click', (event) => {
    const quick = event.target.closest('[data-quick-quantity]');
    if (quick) {
      const field = document.getElementById('movementQuantity');
      if (field) { field.value = quick.dataset.quickQuantity; field.focus(); }
      document.querySelectorAll('[data-quick-quantity]').forEach(item => item.classList.toggle('active', item === quick));
      return;
    }
    const reasonButton = event.target.closest('[data-reason]');
    if (reasonButton) chooseReason(
      reasonButton.dataset.reason || reasonButton.textContent.trim(),
      reasonButton,
      reasonButton.dataset.reasonCode || '',
      reasonButton.dataset.classification || ''
    );
  });
  const movementReasonField = document.getElementById('movementReason');
  movementReasonField?.addEventListener('input', () => {
    const active = document.querySelector('[data-reason].active');
    if (!active || normalize(active.dataset.reason || '') !== normalize(movementReasonField.value)) {
      setReasonMetadata('', '');
      document.querySelectorAll('[data-reason]').forEach(item => item.classList.remove('active'));
    }
  });

  renderRecentReasons();

  document.querySelectorAll('.inventory-move-btn').forEach(btn => btn.addEventListener('click',()=>openDrawer(btn)));
  document.querySelectorAll('.inventory-operation-tab').forEach(tab => tab.addEventListener('click',()=>selectOperation(tab.dataset.operation)));
  closeButton?.addEventListener('click',closeDrawer); backdrop?.addEventListener('click',closeDrawer); document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
  reloadHistory?.addEventListener('click',loadHistory);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit=document.getElementById('inventorySubmitMovement');
    message.hidden=true; submit.disabled=true; const original=submit.textContent; submit.textContent='Salvando...';
    try {
      const payload=Object.fromEntries(new FormData(form).entries());
      const quantityValue = Number(payload.quantity);
      const isAdjustment = payload.operation === 'ajuste';
      const isValidQuantity = Number.isInteger(quantityValue) && (isAdjustment ? quantityValue >= 0 : quantityValue > 0);
      if (!isValidQuantity) {
        throw new Error(isAdjustment
          ? 'Informe um novo saldo físico inteiro, igual ou maior que zero.'
          : 'Informe uma quantidade inteira maior que zero.');
      }
      payload.quantity = quantityValue;
      const response=await fetch('/erp/estoque/movimentar',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok||!data.success) throw new Error(data.message||'Não foi possível registrar a movimentação.');
      setBalances(data.balance); renderHistory(data.movements);
      message.className='inventory-form-message success'; message.textContent=data.message; message.hidden=false;
      saveRecentReason(payload.reason, payload.reasonCode, payload.classification);
      document.getElementById('movementQuantity').value=''; document.getElementById('movementReason').value=''; setReasonMetadata('', '');
      document.querySelectorAll('[data-quick-quantity],[data-reason]').forEach(item => item.classList.remove('active'));
      if(currentButton){
        currentButton.dataset.physical=data.balance.physicalQuantity; currentButton.dataset.reserved=data.balance.reservedQuantity; currentButton.dataset.available=data.balance.availableQuantity;
        const row=currentButton.closest('tr'); const cells=row.querySelectorAll('.inventory-number');
        if(cells[0])cells[0].textContent=data.balance.physicalQuantity; if(cells[1])cells[1].textContent=data.balance.reservedQuantity; if(cells[2])cells[2].textContent=data.balance.availableQuantity;
        setTimeout(()=>window.location.reload(),650);
      }
    } catch(error){ message.className='inventory-form-message error'; message.textContent=error.message; message.hidden=false; }
    finally{ submit.disabled=false; submit.textContent=original; }
  });

  // Estoque v0.11.9 — Giro dos produtos
  const viewTabs = [...document.querySelectorAll('[data-inventory-view]')];
  const viewPanels = [...document.querySelectorAll('[data-inventory-panel]')];
  function selectInventoryView(view) {
    viewTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.inventoryView === view));
    viewPanels.forEach(panel => { panel.hidden = panel.dataset.inventoryPanel !== view; });
  }
  viewTabs.forEach(tab => tab.addEventListener('click', () => selectInventoryView(tab.dataset.inventoryView)));

  const giroDataElement = document.getElementById('inventoryGiroData');
  let giroProducts = [];
  try { giroProducts = JSON.parse(giroDataElement?.textContent || '[]'); } catch (_) { giroProducts = []; }

  const giroSearch = document.getElementById('giroSearch');
  const giroPeriod = document.getElementById('giroPeriod');
  const giroCategory = document.getElementById('giroCategory');
  const giroSubcategory = document.getElementById('giroSubcategory');
  const giroBrand = document.getElementById('giroBrand');
  const giroSituation = document.getElementById('giroSituation');
  const giroClear = document.getElementById('giroClearFilters');
  const giroBody = document.getElementById('giroTableBody');
  const giroEmpty = document.getElementById('giroEmpty');

  const uniqueBrands = [...new Set(giroProducts.map(item => String(item.brand || 'Sem marca definida').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b, 'pt-BR'));
  if (giroBrand) giroBrand.innerHTML = '<option value="">Todas</option>' + uniqueBrands.map(brand => `<option value="${esc(brand)}">${esc(brand)}</option>`).join('');

  function daysSince(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  }

  function dateOnly(value) {
    if (!value) return 'Nunca';
    try { return new Intl.DateTimeFormat('pt-BR').format(new Date(value)); } catch (_) { return 'Nunca'; }
  }

  function giroLabel(quantity) {
    if (quantity >= 10) return { key:'high', text:'Alto' };
    if (quantity >= 3) return { key:'medium', text:'Médio' };
    if (quantity >= 1) return { key:'low', text:'Baixo' };
    return { key:'none', text:'Sem giro' };
  }

  function enrichedGiroData() {
    const days = Number(giroPeriod?.value || 30);
    const cutoff = days > 0 ? Date.now() - (days * 86400000) : 0;
    return giroProducts.map(product => {
      const allSales = Array.isArray(product.sales) ? product.sales : [];
      const validAllSales = allSales.filter(sale => sale.createdAt && !Number.isNaN(new Date(sale.createdAt).getTime()));
      const periodSales = validAllSales.filter(sale => !cutoff || new Date(sale.createdAt).getTime() >= cutoff);
      const units = periodSales.reduce((sum, sale) => sum + Math.abs(Number(sale.quantity) || 0), 0);
      const allUnits = validAllSales.reduce((sum, sale) => sum + Math.abs(Number(sale.quantity) || 0), 0);
      const lastSale = validAllSales.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]?.createdAt || '';
      const identifiedCustomers = new Set(validAllSales.map(sale => sale.customerId || sale.customerName).filter(Boolean)).size;
      return { ...product, units, allUnits, lastSale, daysWithoutSale: daysSince(lastSale), identifiedCustomers, giro: giroLabel(units) };
    });
  }

  function renderGiro() {
    if (!giroBody) return;
    const term = normalize(giroSearch?.value || '');
    const selectedCategory = giroCategory?.value || '';
    const selectedSubcategory = giroSubcategory?.value || '';
    const selectedBrand = giroBrand?.value || '';
    const selectedSituation = giroSituation?.value || '';

    let items = enrichedGiroData().filter(item => {
      const matchesBase = (!term || normalize(item.name).includes(term)) &&
        (!selectedCategory || item.categorySlug === selectedCategory) &&
        (!selectedSubcategory || item.subcategorySlug === selectedSubcategory) &&
        (!selectedBrand || item.brand === selectedBrand);
      if (!matchesBase) return false;
      if (selectedSituation === 'sold') return item.units > 0;
      if (selectedSituation === 'never') return item.allUnits === 0;
      if (selectedSituation === 'stale30') return item.daysWithoutSale === null || item.daysWithoutSale >= 30;
      if (selectedSituation === 'stale60') return item.daysWithoutSale === null || item.daysWithoutSale >= 60;
      if (selectedSituation === 'stale90') return item.daysWithoutSale === null || item.daysWithoutSale >= 90;
      return true;
    });

    items.sort((a,b) => b.units - a.units || (a.daysWithoutSale ?? 999999) - (b.daysWithoutSale ?? 999999) || a.name.localeCompare(b.name,'pt-BR'));

    const top = items.find(item => item.units > 0);
    const totalUnits = items.reduce((sum,item) => sum + item.units, 0);
    const soldProducts = items.filter(item => item.units > 0).length;
    const neverSold = items.filter(item => item.allUnits === 0).length;
    const stale = items.filter(item => item.daysWithoutSale === null || item.daysWithoutSale >= 90).length;

    document.getElementById('giroTopName').textContent = top?.name || '—';
    document.getElementById('giroTopUnits').textContent = top ? `${top.units} unidade(s) no período` : 'Nenhuma venda no período';
    document.getElementById('giroUnits').textContent = totalUnits;
    document.getElementById('giroSoldProducts').textContent = soldProducts;
    document.getElementById('giroNeverSold').textContent = neverSold;
    document.getElementById('giroStale').textContent = stale;
    document.getElementById('giroResultCount').textContent = `${items.length} produto(s) encontrado(s)`;

    giroBody.innerHTML = items.map((item,index) => `
      <tr>
        <td class="inventory-giro-rank">${index + 1}</td>
        <td><div class="inventory-giro-product">${item.image ? `<img src="/${esc(String(item.image).replace(/^\/+/,''))}" alt="">` : '<span>📦</span>'}<div><strong>${esc(item.name)}</strong><br><small>${esc(item.inventoryItemId)}</small></div></div></td>
        <td><strong>${esc(item.categoryName)}</strong><br><small>${esc(item.subcategoryName)}</small></td>
        <td>${esc(item.brand || 'Sem marca definida')}</td>
        <td><strong>${item.units}</strong></td>
        <td>${dateOnly(item.lastSale)}</td>
        <td>${item.daysWithoutSale === null ? 'Nunca vendeu' : `${item.daysWithoutSale} dia(s)`}</td>
        <td>${number(item.availableQuantity)}</td>
        <td><span class="inventory-giro-status inventory-giro-${item.giro.key}">${item.giro.text}</span></td>
        <td>${item.identifiedCustomers > 0 ? item.identifiedCustomers : '<span title="As vendas manuais atuais ainda não possuem cliente vinculado.">Não identificado</span>'}</td>
      </tr>`).join('');
    if (giroEmpty) giroEmpty.hidden = items.length !== 0;
  }

  [giroSearch,giroPeriod,giroCategory,giroSubcategory,giroBrand,giroSituation].filter(Boolean).forEach(field => field.addEventListener(field === giroSearch ? 'input' : 'change', renderGiro));
  giroClear?.addEventListener('click', () => {
    giroSearch.value=''; giroPeriod.value='30'; giroCategory.value=''; giroSubcategory.value=''; giroBrand.value=''; giroSituation.value='';
    renderGiro(); giroSearch.focus();
  });
  renderGiro();


  // Estoque v0.11.9 — Pedido inteligente de reposição
  const restockPeriod = document.getElementById('restockPeriod');
  const restockCoverage = document.getElementById('restockCoverage');
  const restockRule = document.getElementById('restockRule');
  const restockGenerate = document.getElementById('restockGenerate');
  const restockSelectAll = document.getElementById('restockSelectAll');
  const restockMasterSelect = document.getElementById('restockMasterSelect');
  const restockBody = document.getElementById('restockTableBody');
  const restockEmpty = document.getElementById('restockEmpty');
  const restockPreview = document.getElementById('restockPreview');
  const restockCopy = document.getElementById('restockCopy');
  let restockItems = [];

  function salesInPeriod(product, days) {
    const cutoff = Date.now() - (days * 86400000);
    return (Array.isArray(product.sales) ? product.sales : [])
      .filter(sale => {
        const time = new Date(sale.createdAt || '').getTime();
        return Number.isFinite(time) && time >= cutoff;
      })
      .reduce((sum, sale) => sum + Math.abs(Number(sale.quantity) || 0), 0);
  }

  function restockPriority(item) {
    if (item.available <= 0 && item.sales > 0) return { key:'critical', label:'Crítica', rank:3 };
    if (item.available <= item.minimum && item.sales > 0) return { key:'high', label:'Alta', rank:2 };
    return { key:'medium', label:'Média', rank:1 };
  }

  function buildRestockItems() {
    const periodDays = Math.max(1, Number(restockPeriod?.value || 30));
    const coverageDays = Math.max(1, Number(restockCoverage?.value || 30));
    const rule = restockRule?.value || 'smart';

    restockItems = giroProducts.map(product => {
      const available = number(product.availableQuantity);
      const minimum = Math.max(0, number(product.minimumQuantity));
      const sales = salesInPeriod(product, periodDays);
      const dailyAverage = sales / periodDays;
      const coverageTarget = Math.ceil(dailyAverage * coverageDays);
      const target = Math.max(minimum, coverageTarget);
      const suggested = Math.max(0, target - available);
      const belowMinimum = available <= minimum;
      const hasTurnover = sales > 0;
      const include = rule === 'minimum'
        ? belowMinimum
        : rule === 'sales'
          ? hasTurnover && suggested > 0
          : belowMinimum || (hasTurnover && suggested > 0);
      const item = { ...product, available, minimum, sales, coverageTarget, target, suggested, selected:include && suggested > 0 };
      item.priority = restockPriority(item);
      return item;
    }).filter(item => {
      if (rule === 'minimum') return item.available <= item.minimum && item.suggested > 0;
      if (rule === 'sales') return item.sales > 0 && item.suggested > 0;
      return item.suggested > 0 && (item.available <= item.minimum || item.sales > 0);
    }).sort((a,b) => b.priority.rank - a.priority.rank || b.sales - a.sales || a.name.localeCompare(b.name,'pt-BR'));

    renderRestock();
  }

  function updateRestockSelectionState() {
    const selectable = restockItems.filter(item => item.suggested > 0);
    const selectedCount = selectable.filter(item => item.selected).length;
    if (restockMasterSelect) {
      restockMasterSelect.disabled = selectable.length === 0;
      restockMasterSelect.checked = selectable.length > 0 && selectedCount === selectable.length;
      restockMasterSelect.indeterminate = selectedCount > 0 && selectedCount < selectable.length;
    }
  }

  function updateRestockPreview() {
    const selected = restockItems.filter(item => item.selected && item.suggested > 0);
    const totalUnits = selected.reduce((sum,item) => sum + item.suggested, 0);
    const critical = selected.filter(item => item.priority.key === 'critical').length;
    document.getElementById('restockProductsCount').textContent = restockItems.length;
    document.getElementById('restockUnitsCount').textContent = totalUnits;
    document.getElementById('restockCriticalCount').textContent = critical;
    document.getElementById('restockSelectedCount').textContent = selected.length;
    updateRestockSelectionState();

    if (!restockPreview) return;
    if (!selected.length) {
      restockPreview.value = '';
      return;
    }
    const generatedAt = new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date());
    const lines = [
      '*PEDIDO DE REPOSIÇÃO — QUALITY*',
      `Gerado em ${generatedAt}`,
      '',
      ...selected.map((item,index) => `${index + 1}. *${item.name}*${item.code ? ` (${item.code})` : ''}
   Quantidade: *${item.suggested}* | Disponível: ${item.available} | Mínimo: ${item.minimum} | Vendas no período: ${item.sales}`),
      '',
      `*Total:* ${selected.length} produto(s) · ${totalUnits} unidade(s)`
    ];
    restockPreview.value = lines.join('\n');
  }

  function renderRestock() {
    if (!restockBody) return;
    restockBody.innerHTML = restockItems.map((item,index) => `
      <tr data-restock-index="${index}">
        <td><input type="checkbox" data-restock-select ${item.selected ? 'checked' : ''} aria-label="Selecionar ${esc(item.name)}"></td>
        <td><div class="inventory-giro-product">${item.image ? `<img src="/${esc(String(item.image).replace(/^\/+/,''))}" alt="">` : '<span>📦</span>'}<div><strong>${esc(item.name)}</strong><br><small>${esc(item.code || item.inventoryItemId)}</small></div></div></td>
        <td><strong>${item.available}</strong></td>
        <td>${item.minimum}</td>
        <td>${item.sales}</td>
        <td>${item.coverageTarget} un.</td>
        <td><span class="inventory-restock-priority inventory-restock-${item.priority.key}">${item.priority.label}</span></td>
        <td><input class="inventory-restock-qty" type="number" min="0" step="1" value="${item.suggested}" data-restock-qty aria-label="Quantidade para ${esc(item.name)}"></td>
      </tr>`).join('');
    if (restockEmpty) {
      restockEmpty.hidden = restockItems.length > 0;
      restockEmpty.textContent = restockItems.length ? '' : 'Nenhum produto precisa de reposição com os critérios selecionados.';
    }
    document.getElementById('restockResultCount').textContent = `${restockItems.length} produto(s) sugerido(s)`;
    if (restockGenerate) restockGenerate.textContent = 'Atualizar sugestão';
    updateRestockPreview();
  }

  restockGenerate?.addEventListener('click', buildRestockItems);
  [restockPeriod,restockCoverage,restockRule].filter(Boolean).forEach(field => field.addEventListener('change', buildRestockItems));
  restockBody?.addEventListener('change', (event) => {
    const row = event.target.closest('[data-restock-index]');
    if (!row) return;
    const item = restockItems[Number(row.dataset.restockIndex)];
    if (!item) return;
    if (event.target.matches('[data-restock-select]')) item.selected = event.target.checked;
    if (event.target.matches('[data-restock-qty]')) {
      item.suggested = Math.max(0, Math.floor(Number(event.target.value) || 0));
      event.target.value = item.suggested;
      if (item.suggested === 0) {
        item.selected = false;
        row.querySelector('[data-restock-select]').checked = false;
      }
    }
    updateRestockPreview();
  });
  restockMasterSelect?.addEventListener('change', () => {
    const shouldSelect = restockMasterSelect.checked;
    restockItems.forEach(item => { item.selected = shouldSelect && item.suggested > 0; });
    restockBody?.querySelectorAll('[data-restock-select]').forEach((checkbox, index) => {
      checkbox.checked = Boolean(restockItems[index]?.selected);
    });
    updateRestockPreview();
  });

  restockSelectAll?.addEventListener('click', () => {
    restockItems.forEach(item => { item.selected = item.suggested > 0; });
    renderRestock();
  });
  restockCopy?.addEventListener('click', async () => {
    const text = restockPreview?.value || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const original = restockCopy.textContent;
      restockCopy.textContent = 'Pedido copiado ✓';
      setTimeout(() => { restockCopy.textContent = original; }, 1600);
    } catch (_) {
      restockPreview.focus();
      restockPreview.select();
      document.execCommand('copy');
    }
  });

})();
