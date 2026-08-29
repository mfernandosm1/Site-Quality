(() => {
  const root = document.getElementById('receivablesApp');
  if (!root) return;

  let bootstrap = { titles:[], customers:[], catalogs:{}, summary:{} };
  try { bootstrap = JSON.parse(document.getElementById('receivablesBootstrap')?.textContent || '{}'); }
  catch (error) { console.error('Falha ao carregar o Contas a Receber.', error); }

  let titles = Array.isArray(bootstrap.titles) ? bootstrap.titles : [];
  const catalogs = bootstrap.catalogs || {};
  const cashboxes = Array.isArray(bootstrap.cashboxes) ? bootstrap.cashboxes : [];
  const conversations = Array.isArray(bootstrap.conversations) ? bootstrap.conversations : [];
  const whatsModal=document.getElementById('receiptWhatsAppModal');
  let whatsappReceiptId='';
  const body = document.getElementById('receivablesBody');
  const drawer = document.getElementById('receivableDrawer');
  const backdrop = document.getElementById('receivableDrawerBackdrop');
  const detail = document.getElementById('receivableDetail');
  const resultCount = document.getElementById('receivableResultCount');
  const receiveModal = document.getElementById('receivableReceiveModal');
  const receiveForm = document.getElementById('receivableReceiveForm');
  let duePreset = '';
  let currentDetail = null;
  let currentReceipt = null;

  const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  const decimal = value => Number(value || 0).toFixed(2).replace('.', ',');
  const parseMoney = value => Number(String(value ?? '').replace(/\./g, '').replace(',', '.')) || 0;
  const date = value => value ? new Date(String(value).length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('pt-BR') : '—';
  const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const ref = value => { const raw=String(value ?? '').trim(); if (/^\d+$/.test(raw)) return String(Number(raw)); return raw.replace(/\b([A-Z]{1,5})-0+(\d+)\b/g,'$1-$2').replace(/(Título|Recebimento|Comprovante)\s+0+(\d+)/gi,'$1 $2'); };
  const digits = value => String(value || '').replace(/\D/g, '');
  const documentMask = value => { const d=digits(value); return d.length===11?d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):d.length===14?d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5'):value||'—'; };
  const labels = { open:'Em aberto', partial:'Parcial', paid:'Recebido', cancelled:'Cancelado', reversed:'Estornado', created:'Título criado', received:'Recebimento registrado', receipt_reversed:'Recebimento estornado' };
  const creditLabels = { overdue:'Inadimplente', open:'Com saldo em aberto', clear:'Sem pendências', no_history:'Sem histórico' };
  const catalogName = (key,id) => (catalogs[key] || []).find(item => item.id === id)?.name || '—';
  const today = () => new Date().toISOString().slice(0,10);
  const addDays = days => { const d=new Date(`${today()}T12:00:00`); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); };

  function matchesDue(title) {
    const openDates = (title.installments || []).filter(item => Number(item.openBalance || 0) > 0).map(item => item.dueDate).filter(Boolean);
    const from = document.getElementById('receivableDueFrom').value;
    const to = document.getElementById('receivableDueTo').value;
    if (from && !openDates.some(value => value >= from)) return false;
    if (to && !openDates.some(value => value <= to)) return false;
    if (duePreset === 'today') return openDates.includes(today());
    if (duePreset === 'overdue') return openDates.some(value => value < today());
    if (duePreset === 'next7') return openDates.some(value => value >= today() && value <= addDays(7));
    if (duePreset === 'month') return openDates.some(value => value.slice(0,7) === today().slice(0,7));
    return true;
  }

  function filteredTitles() {
    const query = document.getElementById('receivableSearch').value;
    const status = document.getElementById('receivableStatus').value;
    const customer = document.getElementById('receivableCustomer').value;
    const method = document.getElementById('receivablePaymentMethod').value;
    const center = document.getElementById('receivableCostCenter').value;
    const account = document.getElementById('receivableAccount').value;
    return titles.filter(title => {
      if (status && title.status !== status) return false;
      if (customer && title.customerId !== customer) return false;
      if (method && title.paymentMethodId !== method) return false;
      if (center && title.costCenterId !== center) return false;
      if (account && title.accountId !== account) return false;
      if (!QualitySearch.matches([title.number,title.customerName,title.originLabel].join(' '), query)) return false;
      return matchesDue(title);
    });
  }

  function render() {
    const rows = filteredTitles();
    resultCount.textContent = `${rows.length} título(s)`;
    body.innerHTML = rows.map(title => {
      const next = (title.installments || []).find(item => Number(item.openBalance || 0) > 0);
      return `<tr class="receivable-row" tabindex="0" data-open="${esc(title.id)}" aria-label="Abrir título ${esc(ref(title.number))}"><td><b>${esc(ref(title.number))}</b></td><td>${esc(title.customerName)}<small>${esc(documentMask(title.customerDocument))}</small></td><td>${esc(title.originLabel || '—')}</td><td>${next ? date(next.dueDate) : '—'}</td><td>${money(title.netValue)}</td><td>${money(title.openBalance)}</td><td><span class="finance-status ${title.status==='paid'?'':'off'}">${esc(labels[title.status] || title.status)}</span></td></tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state"><strong>Nenhum título encontrado.</strong><br>Revise os filtros aplicados.</td></tr>';
  }

  function openDrawer() { backdrop.hidden=false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); document.body.classList.add('receivable-drawer-open'); }
  function closeDrawer() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); backdrop.hidden=true; document.body.classList.remove('receivable-drawer-open'); }

  function fold(id,title,content,open=false) {
    return `<details class="receivable-fold receivable-section-anchor" id="${esc(id)}" ${open?'open':''}><summary>${esc(title)}</summary><div class="receivable-fold-body">${content}</div></details>`;
  }

  function customerHeaderMeta(customer,title) {
    const c=customer || {};
    return `<div class="receivable-header-meta"><span><small>CPF/CNPJ</small><b>${esc(documentMask(c.document || title.customerDocument))}</b></span><span><small>Telefone</small><b>${esc(c.mobile || c.phone || '—')}</b></span><span><small>E-mail</small><b>${esc(c.email || '—')}</b></span></div>`;
  }

  function itemTotal(item={}) {
    const quantity=Number(item.quantity||1); const unit=Number(item.unitPrice||item.price||0); const discount=Number(item.discount||0);
    return Number(item.total ?? item.subtotal ?? ((quantity*unit)-discount));
  }

  function operationStatus(operation={}) {
    const map={finalized:'Finalizada',open:'Em andamento',cancelled:'Cancelada',draft:'Rascunho'};
    return map[operation.status] || operation.status || '—';
  }

  function operationBlock(operation,title) {
    if (!operation) return fold('ficha-operacao','Operação',`<p>${esc(title.originLabel || 'Operação não localizada.')}</p>`,false);
    const items = operation.snapshot?.items || operation.items || [];
    const payments = operation.snapshot?.payments || operation.payments || [];
    const serviceOrder = operation.snapshot?.serviceOrder || operation.serviceOrder || {};
    const products = items.map(item=>`<div class="receivable-product-row"><div><span>Produto / serviço</span><b>${esc(item.name || item.productName || 'Item')}</b></div><div><span>Qtd.</span><b>${Number(item.quantity||1)}</b></div><div><span>Unitário</span><b>${money(item.unitPrice||item.price)}</b></div><div><span>Desconto</span><b>${money(item.discount)}</b></div><div><span>Subtotal</span><strong>${money(itemTotal(item))}</strong></div>${item.notes||item.observation?`<div class="receivable-product-note">Observação: ${esc(item.notes||item.observation)}</div>`:''}<div class="receivable-product-note">Vendedor do item: ${esc(item.sellerNameSnapshot||item.sellerName||operation.sellerNameSnapshot||'—')}</div></div>`).join('') || '<p>Nenhum item localizado.</p>';
    const operationInfo=`<div class="receivable-operation-head"><div><h3>${operation.type==='service_order'?'O.S.':'Venda'} nº ${esc(operation.number)}</h3><small>${esc(title.originLabel||'Operação comercial')}</small></div><span class="receivable-status-pill">${esc(operationStatus(operation))}</span></div><div class="receivable-detail-grid"><div><span>Abertura</span><b>${dateTime(operation.dates?.openedAt||operation.createdAt)}</b></div><div><span>Finalização</span><b>${dateTime(operation.dates?.finalizedAt||operation.finalizedAt)}</b></div><div><span>Operador</span><b>${esc(operation.finalizedBy||operation.updatedBy||operation.createdBy||'—')}</b></div><div><span>Vendedor principal</span><b>${esc(operation.sellerNameSnapshot||operation.snapshot?.seller?.name||'—')}</b></div><div><span>Total</span><b>${money(operation.total||operation.snapshot?.totals?.total)}</b></div><div><span>Situação financeira</span><b>${esc(operation.financialStatus||'—')}</b></div></div>${operation.notes?`<div class="receivable-notes-box"><b>Observação da operação</b><br>${esc(operation.notes)}</div>`:''}`;
    const paymentRows=payments.map(payment=>`<div class="receivable-payment-original"><div><span>Forma de pagamento</span><b>${esc(payment.methodName||catalogName('paymentMethods',payment.methodId))}</b></div><div><span>Valor</span><b>${money(payment.amount)}</b></div><div><span>Parcelas</span><b>${Number(payment.installments||1)}x</b></div><div><span>Primeiro vencimento</span><b>${date(payment.dueDate||(payment.dueDates||[])[0])}</b></div></div>`).join('')||'<p>Pagamentos originais não localizados.</p>';
    return fold('ficha-operacao','Operação e itens',`${operationInfo}<div class="receivable-subsection"><h4>Produtos e serviços</h4><div class="receivable-product-table">${products}</div></div><div class="receivable-subsection"><h4>Condição da venda</h4>${paymentRows}</div>${operation.type==='service_order'?serviceOrderBlock(serviceOrder):''}`,false);
  }

  function checklistItems(value) {
    const items=Array.isArray(value?.items)?value.items:[];
    return items.length?`<div class="receivable-check-list">${items.map(item=>`<span>${item.checked===false?'○':'✓'} ${esc(item.label||item.name||item)}</span>`).join('')}</div>`:'<small>Sem itens marcados.</small>';
  }

  function serviceOrderBlock(os={}) {
    const content=`<div class="receivable-detail-grid"><div><span>Equipamento</span><b>${esc(os.equipment||os.device||'—')}</b></div><div><span>Marca</span><b>${esc(os.brand||'—')}</b></div><div><span>Modelo</span><b>${esc(os.model||'—')}</b></div><div><span>Acessórios</span><b>${esc(os.accessories||'—')}</b></div><div class="wide"><span>Defeito informado / diagnóstico</span><b>${esc(os.reportedProblem||os.issue||os.problem||'—')}</b></div><div class="wide"><span>Defeito constatado</span><b>${esc(os.diagnosis||os.detectedProblem||'—')}</b></div><div class="wide"><span>Serviços executados</span><b>${esc(os.workPerformed||os.servicePerformed||os.executedService||os.solution||'—')}</b></div></div><div class="receivable-check-grid"><div><h4>Check-in</h4>${checklistItems(os.checkin)}${os.checkin?.notes?`<p>${esc(os.checkin.notes)}</p>`:''}</div><div><h4>Checkout</h4>${checklistItems(os.checkout)}${os.checkout?.notes?`<p>${esc(os.checkout.notes)}</p>`:''}</div></div>`;
    return fold('ficha-os','Ordem de Serviço',content,false);
  }

  function receiptMethods(receipt={}) {
    const payments = Array.isArray(receipt.payments) && receipt.payments.length ? receipt.payments : [{ paymentMethodId:receipt.paymentMethodId, value:receipt.value }];
    return payments.map(item=>`${catalogName('paymentMethods',item.paymentMethodId)} · ${Number(item.installments||1)>1?`${Number(item.installments)}x · `:''}${money(item.value)}`).join(' | ');
  }

  function installmentsBlock(title) {
    const content=`<div class="receivable-installments">${(title.installments||[]).map(item=>`<div class="receivable-installment-row"><div><b>${item.number}/${item.total}</b><small>Vencimento ${date(item.dueDate)}</small></div><span class="finance-status ${item.status==='paid'?'':'off'}">${esc(labels[item.status]||item.status)}</span><div><small>Original / saldo</small><strong>${money(item.originalValue)} / ${money(item.openBalance)}</strong></div>${Number(item.openBalance||0)>0?`<button type="button" class="btn btn-success" data-receive="${esc(item.id)}">Receber</button>`:'<span class="receivable-paid-mark">✓ Quitada</span>'}</div>`).join('') || '<p>Sem parcelas.</p>'}</div>`;
    return fold('ficha-parcelas','Parcelas',content,true);
  }

  function receiptsBlock(receipts=[]) {
    const content=receipts.map(item=>{const when=item.receivedDateTime||item.createdAt||item.receivedAt;const parsed=when?new Date(when):null;const day=parsed&&!Number.isNaN(parsed.getTime())?parsed.toLocaleDateString('pt-BR'):'—';const hour=parsed&&!Number.isNaN(parsed.getTime())?parsed.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—';return `<article class="receivable-receipt-card ${item.status==='reversed'||item.reversalStatus==='reversed'?'is-reversed':''}"><header><div><b>${money(item.value)}</b><small>${day} <span aria-hidden="true">•</span> ${hour}${item.status==='reversed'||item.reversalStatus==='reversed'?' · ESTORNADO':''}</small></div><div class="receivable-receipt-actions"><button type="button" class="receivable-icon-action" data-print-receipt="${esc(item.id)}" title="Imprimir comprovante" aria-label="Imprimir comprovante"><span aria-hidden="true">🖨</span> Imprimir</button><button type="button" class="receivable-icon-action whatsapp" data-whatsapp-receipt="${esc(item.id)}" title="Enviar comprovante pelo WhatsApp" aria-label="Enviar comprovante pelo WhatsApp"><span aria-hidden="true">💬</span> WhatsApp</button>${item.status==='reversed'||item.reversalStatus==='reversed'?'':`<button type="button" class="receivable-reverse" data-reverse-receipt="${esc(item.id)}">Estornar</button>`}</div></header><p>${esc(receiptMethods(item))}</p><div class="receivable-receipt-meta"><div><span>Juros</span><b>${money(item.interest)}</b></div><div><span>Multa</span><b>${money(item.fine)}</b></div><div><span>Desconto</span><b>${money(item.discount)}</b></div><div><span>Operador</span><b>${esc(item.createdBy||'painel')}</b></div><div><span>Caixa</span><b>${esc(item.cashboxName||item.cashboxId||'—')}</b></div><div><span>Comprovante</span><b>${esc(ref(item.receiptNumber||'—'))}</b></div></div>${item.notes?`<p>Observação: ${esc(item.notes)}</p>`:''}${item.reverseReason?`<p><b>Motivo do estorno:</b> ${esc(item.reverseReason)} · ${dateTime(item.reversedAt)} · ${esc(item.reversedBy||'painel')}</p>`:''}</article>`}).join('')||'<p>Nenhum recebimento registrado.</p>';
    return fold('ficha-recebimentos','Recebimentos e comprovantes',content,false);
  }

  function creditBlock(summary={}) {
    return fold('ficha-historico-cliente','Histórico financeiro do cliente',`<div class="receivable-credit-summary"><div><span>Títulos</span><b>${Number(summary.titleCount||0)}</b></div><div><span>Em aberto</span><b>${Number(summary.openTitleCount||0)}</b></div><div><span>Vencidas</span><b>${Number(summary.overdueInstallmentCount||0)}</b></div><div><span>Total movimentado</span><b>${money(summary.totalGenerated)}</b></div><div><span>Saldo aberto</span><b>${money(summary.openBalance)}</b></div><div><span>Saldo vencido</span><b>${money(summary.overdueBalance)}</b></div></div><div class="receivable-related-list">${(summary.recentTitles||[]).map(item=>`<button type="button" data-related-title="${esc(item.id)}"><span>Título ${esc(ref(item.number))} · ${esc(item.originLabel)}</span><small>${esc(labels[item.status]||item.status)}</small><b>${money(item.openBalance)}</b></button>`).join('')||'<p>Este é o primeiro título financeiro do cliente.</p>'}</div>`,false);
  }

  function timelineBlock(data={}) {
    const operationEvents=(data.operation?.timeline||[]).map(item=>({at:item.at,label:item.label||item.type,actor:item.actor,type:item.type}));
    const titleEvents=(data.events||[]).map(item=>({at:item.at,label:labels[item.action]||item.action,actor:item.actor,type:item.action}));
    const receiptEvents=(data.receipts||[]).map(item=>({at:item.receivedDateTime||item.createdAt,label:`Recebimento ${ref(item.receiptNumber||'')} · ${money(item.value)}`,actor:item.createdBy,type:'received'}));
    const events=[...operationEvents,...titleEvents,...receiptEvents].filter(item=>item.at).sort((a,b)=>String(a.at).localeCompare(String(b.at)));
    const content=`<div class="receivable-timeline">${events.map(item=>`<div class="receivable-timeline-item"><b>${esc(item.label||'Evento')}</b><small>${dateTime(item.at)} · ${esc(item.actor||'painel')}</small></div>`).join('')||'<p>Sem eventos.</p>'}</div>`;
    return fold('ficha-timeline','Histórico',content,false);
  }

  function showDetail(data) {
    currentDetail=data;
    const title=data.item;
    detail.innerHTML = `<div class="receivable-drawer-header"><div class="receivable-header-main"><small>TÍTULO ${esc(ref(title.number))}</small><h2>${esc(title.customerName)}</h2><p>${esc(title.originLabel || 'Origem operacional')}</p>${customerHeaderMeta(data.customer,title)}</div><button type="button" data-close aria-label="Fechar">×</button></div><div class="receivable-drawer-body"><section class="receivable-detail-summary"><div><span>Valor</span><b>${money(title.netValue)}</b></div><div><span>Saldo</span><b>${money(title.openBalance)}</b></div><div><span>Situação</span><b>${esc(labels[title.status] || title.status)}</b></div><div><span>Em aberto do cliente</span><b>${money(data.creditSummary?.openBalance)}</b></div><div><span>Vencido</span><b>${money(data.creditSummary?.overdueBalance)}</b></div></section>${operationBlock(data.operation,title)}${installmentsBlock(title)}${receiptsBlock(data.receipts||[])}${timelineBlock(data)}</div>`;
    detail.querySelector('[data-close]').onclick=closeDrawer;
    detail.querySelectorAll('[data-related-title]').forEach(button=>button.onclick=()=>openDetail(button.dataset.relatedTitle));
    detail.querySelectorAll('[data-receive]').forEach(button=>button.onclick=()=>openReceiveModal(button.dataset.receive));
    detail.querySelectorAll('[data-print-receipt]').forEach(button=>button.onclick=()=>{ const receipt=(data.receipts||[]).find(item=>item.id===button.dataset.printReceipt); if(receipt) printReceipt(receipt,data); });
    detail.querySelectorAll('[data-whatsapp-receipt]').forEach(button=>button.onclick=()=>{ const receipt=(data.receipts||[]).find(item=>item.id===button.dataset.whatsappReceipt); if(receipt) shareReceiptWhatsApp(receipt,data); });
    detail.querySelectorAll('[data-reverse-receipt]').forEach(button=>button.onclick=()=>reverseReceipt(button.dataset.reverseReceipt));
    openDrawer();
  }


  function shareReceiptWhatsApp(receipt,data=currentDetail) {
    const customer=data?.customer||{}; const customerPhone=digits(customer.mobile||customer.phone||'').replace(/^55/,'');
    whatsappReceiptId=receipt.id;
    document.getElementById('receiptWhatsAppCustomer').textContent=`${customer.name||data?.item?.customerName||'Cliente'} · escolha imagem ou PDF`;
    const select=document.getElementById('receiptWhatsAppConversation'); select.value='';
    const match=conversations.find(item=>{const phone=digits(item.phone||'').replace(/^55/,'');return customerPhone&&phone&&(phone.endsWith(customerPhone)||customerPhone.endsWith(phone));});
    if(match) select.value=match.id;
    whatsModal.hidden=false; document.body.classList.add('receivable-modal-open');
  }
  function closeWhatsModal(){whatsModal.hidden=true;whatsappReceiptId='';document.body.classList.remove('receivable-modal-open');}
  async function sendReceiptWhatsApp(){
    if(!currentDetail||!whatsappReceiptId)return;
    const conversationId=document.getElementById('receiptWhatsAppConversation').value;
    const format=document.getElementById('receiptWhatsAppFormat').value;
    if(!conversationId)return alert('Selecione a conversa do cliente.');
    const button=document.getElementById('sendReceiptWhatsApp');button.disabled=true;button.textContent='Enviando…';
    try{const response=await fetch(`/erp/financeiro/api/contas-a-receber/${encodeURIComponent(currentDetail.item.id)}/recebimentos/${encodeURIComponent(whatsappReceiptId)}/whatsapp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId,format})});const data=await response.json();if(!data.success)throw new Error(data.message);alert(data.message);closeWhatsModal();}catch(error){alert(error.message||'Não foi possível enviar o comprovante.');}finally{button.disabled=false;button.textContent='Enviar comprovante';}
  }

  async function reverseReceipt(receiptId) {
    if(!currentDetail) return;
    const reason=prompt('Informe o motivo do estorno do recebimento:');
    if(reason===null) return; if(!reason.trim()) return alert('O motivo do estorno é obrigatório.');
    if(!confirm('Confirmar o estorno? O Caixa, o saldo e o histórico serão atualizados.')) return;
    try {
      const response=await fetch(`/erp/financeiro/api/contas-a-receber/${encodeURIComponent(currentDetail.item.id)}/recebimentos/${encodeURIComponent(receiptId)}/estornar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason.trim()})});
      const data=await response.json(); if(!data.success) throw new Error(data.message);
      const index=titles.findIndex(item=>item.id===data.item.id); if(index>=0) titles[index]=data.item; render(); await openDetail(data.item.id); alert(data.message);
    } catch(error) { alert(error.message||'Não foi possível estornar o recebimento.'); }
  }

  async function openDetail(id) {
    detail.innerHTML='<div class="receivable-drawer-loading">Carregando detalhes…</div>'; openDrawer();
    try { const response=await fetch(`/erp/financeiro/api/contas-a-receber/${encodeURIComponent(id)}`); const data=await response.json(); if(!data.success) throw new Error(data.message); showDetail(data); }
    catch(error) { detail.innerHTML=`<div class="receivable-drawer-loading">${esc(error.message || 'Não foi possível carregar o título.')}</div>`; }
  }

  function paymentMethodConfig(methodId='') {
    return (catalogs.paymentMethods||[]).find(item=>item.id===methodId) || null;
  }

  function methodAllowsInstallments(methodId='') {
    const method=paymentMethodConfig(methodId);
    return Boolean(method?.allowInstallments) && Number(method?.maxInstallments||1)>1;
  }

  function installmentOptions(methodId='', selected=1) {
    const method=paymentMethodConfig(methodId);
    const max=Math.max(1,Number(method?.maxInstallments||1));
    const current=Math.max(1,Math.min(max,Number(selected||1)));
    return Array.from({length:max},(_,index)=>index+1).map(qty=>`<option value="${qty}" ${current===qty?'selected':''}>${qty}x</option>`).join('');
  }

  function paymentRow(methodId='', value=0, installments=1) {
    const methods=(catalogs.paymentMethods||[]).filter(item=>item.active!==false && item.modules?.finance!==false);
    const showInstallments=methodAllowsInstallments(methodId);
    return `<div class="receivable-payment-row"><select class="receive-method" required><option value="">Selecione</option>${methods.map(item=>`<option value="${esc(item.id)}" ${item.id===methodId?'selected':''}>${esc(item.name)}</option>`).join('')}</select><input class="receive-payment-value" inputmode="decimal" value="${decimal(value)}" aria-label="Valor"><label class="receive-installments-wrap" ${showInstallments?'':'hidden'}><span>Parcelas</span><select class="receive-installments" aria-label="Quantidade de parcelas">${installmentOptions(methodId,installments)}</select></label><button type="button" class="btn btn-ghost" data-remove-payment aria-label="Remover forma">×</button></div>`;
  }

  function syncPaymentInstallments(row) {
    if(!row) return;
    const methodId=row.querySelector('.receive-method')?.value||'';
    const wrap=row.querySelector('.receive-installments-wrap');
    const select=row.querySelector('.receive-installments');
    const visible=methodAllowsInstallments(methodId);
    if(wrap) wrap.hidden=!visible;
    if(select) {
      const previous=Number(select.value||1);
      select.innerHTML=installmentOptions(methodId,visible?previous:1);
      if(!visible) select.value='1';
    }
  }

  function receiveCalculation() {
    const payments=[...receiveForm.querySelectorAll('.receivable-payment-row')].map(row=>parseMoney(row.querySelector('.receive-payment-value').value));
    const total=payments.reduce((sum,value)=>sum+value,0);
    const interest=parseMoney(document.getElementById('receiveInterest').value);
    const fine=parseMoney(document.getElementById('receiveFine').value);
    const discount=parseMoney(document.getElementById('receiveDiscount').value);
    const principal=Math.round((total-interest-fine+discount)*100)/100;
    document.getElementById('receivePaymentTotal').textContent=money(total);
    document.getElementById('receivePrincipalTotal').textContent=money(Math.max(0,principal));
    const max=Number(receiveForm.dataset.max||0);
    const remaining=Math.max(0,Math.round((max-Math.max(0,principal))*100)/100);
    document.getElementById('receiveRemaining').textContent=money(remaining);
    const difference=document.getElementById('receiveDifference');
    const invalid=principal<=0 || principal>max+0.001;
    if(principal<=0) difference.textContent='O total pago precisa cobrir juros e multa antes de baixar o saldo';
    else if(principal>max+0.001) difference.textContent=`Excede o saldo em ${money(principal-max)}`;
    else difference.textContent='Saldo após recebimento';
    document.getElementById('confirmReceivableReceipt').disabled=invalid;
  }

  function syncReceiptTotalFromCharges() {
    const rows=[...receiveForm.querySelectorAll('.receivable-payment-row')];
    if(rows.length!==1) return receiveCalculation();
    const max=Number(receiveForm.dataset.max||0);
    const interest=parseMoney(document.getElementById('receiveInterest').value);
    const fine=parseMoney(document.getElementById('receiveFine').value);
    const discount=parseMoney(document.getElementById('receiveDiscount').value);
    const total=Math.max(0,Math.round((max+interest+fine-discount)*100)/100);
    rows[0].querySelector('.receive-payment-value').value=decimal(total);
    receiveCalculation();
  }

  function openReceiveModal(installmentId) {
    if(!currentDetail) return;
    const title=currentDetail.item;
    const installment=(title.installments||[]).find(item=>item.id===installmentId);
    if(!installment || Number(installment.openBalance||0)<=0) return;
    receiveForm.reset();
    receiveForm.dataset.receivableId=title.id;
    receiveForm.dataset.installmentId=installment.id;
    receiveForm.dataset.requestKey=(globalThis.crypto?.randomUUID?.() || `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    receiveForm.dataset.max=String(Number(installment.openBalance||0));
    document.getElementById('receiveTitleLabel').textContent=`Título ${ref(title.number)} · ${title.customerName}`;
    document.getElementById('receiveInstallmentLabel').textContent=`Parcela ${installment.number}/${installment.total} · vencimento ${date(installment.dueDate)}`;
    document.getElementById('receiveOpenBalance').textContent=money(installment.openBalance);
    document.getElementById('receiveDate').value=today();
    const cashboxSelect=document.getElementById('receiveCashbox'); if(cashboxSelect) cashboxSelect.value=(cashboxes.find(item=>item.isOpen)||{}).id||'';
    document.getElementById('receiveInterest').value='0,00';
    document.getElementById('receiveFine').value='0,00';
    document.getElementById('receiveDiscount').value='0,00';
    document.getElementById('receivePayments').innerHTML=paymentRow(title.paymentMethodId,installment.openBalance);
    document.getElementById('receiveSuccess').hidden=true;
    document.getElementById('receiveFormContent').hidden=false;
    receiveModal.hidden=false;
    document.body.classList.add('receivable-modal-open');
    receiveCalculation();
  }

  function closeReceiveModal() {
    receiveModal.hidden=true;
    document.body.classList.remove('receivable-modal-open');
  }

  function collectReceiptPayload() {
    const payments=[...receiveForm.querySelectorAll('.receivable-payment-row')].map(row=>({
      paymentMethodId:row.querySelector('.receive-method').value,
      value:parseMoney(row.querySelector('.receive-payment-value').value),
      installments:Number(row.querySelector('.receive-installments')?.value||1)
    })).filter(item=>item.value>0);
    return {
      installmentId:receiveForm.dataset.installmentId,
      cashboxId:document.getElementById('receiveCashbox')?.value||'',
      requestKey:receiveForm.dataset.requestKey,
      receivedAt:document.getElementById('receiveDate').value,
      interest:parseMoney(document.getElementById('receiveInterest').value),
      fine:parseMoney(document.getElementById('receiveFine').value),
      discount:parseMoney(document.getElementById('receiveDiscount').value),
      notes:document.getElementById('receiveNotes').value.trim(),
      payments
    };
  }

  async function submitReceipt(event) {
    event.preventDefault();
    const button=document.getElementById('confirmReceivableReceipt');
    button.disabled=true; button.textContent='Registrando…';
    try {
      const id=receiveForm.dataset.receivableId;
      const response=await fetch(`/erp/financeiro/api/contas-a-receber/${encodeURIComponent(id)}/receber`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(collectReceiptPayload())});
      const data=await response.json();
      if(!data.success) throw new Error(data.message);
      currentReceipt=data.receipt;
      const index=titles.findIndex(item=>item.id===data.item.id); if(index>=0) titles[index]=data.item;
      render();
      document.getElementById('receiveFormContent').hidden=true;
      document.getElementById('receiveSuccess').hidden=false;
      document.getElementById('receiveSuccessMessage').textContent=data.message;
      document.getElementById('receiveSuccessValue').textContent=money(data.receipt.value);
      await openDetail(data.item.id);
      receiveModal.hidden=false;
      document.body.classList.add('receivable-modal-open');
    } catch(error) {
      alert(error.message || 'Não foi possível registrar o recebimento.');
    } finally {
      button.textContent='Confirmar recebimento'; receiveCalculation();
    }
  }

  function printReceipt(receipt, detailData=currentDetail) {
    const title=detailData?.item || {};
    const customer=detailData?.customer || {};
    const operation=detailData?.operation || {};
    const methods=(receipt.payments||[{paymentMethodId:receipt.paymentMethodId,value:receipt.value,installments:1}]).map(item=>`<tr><td>${esc(catalogName('paymentMethods',item.paymentMethodId))}${Number(item.installments||1)>1?` · ${Number(item.installments)}x`:''}</td><td>${money(item.value)}</td></tr>`).join('');
    const popup=window.open('','_blank','width=520,height=760');
    if(!popup){ alert('Permita pop-ups para imprimir o comprovante.'); return; }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprovante ${esc(receipt.receiptNumber||'')}</title><style>${window.QualityExportBrand?.css?.()||""}body{font-family:Arial,sans-serif;color:#111;margin:24px}.receipt{max-width:420px;margin:auto;border:1px solid #bbb;padding:24px}h1{text-align:center;font-size:20px;margin:0}h2{text-align:center;font-size:14px;margin:6px 0 22px}.line{border-top:1px dashed #777;margin:14px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid div span{display:block;font-size:11px;color:#555}.grid div b{font-size:13px}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:6px 0;border-bottom:1px solid #ddd;font-size:13px}td:last-child{text-align:right;font-weight:bold}.total{font-size:18px;text-align:right;margin:16px 0}.foot{text-align:center;font-size:11px;margin-top:22px}@media print{body{margin:0}.receipt{border:0}}</style></head><body><div class="receipt">${window.QualityExportBrand?.headerHtml?.({title:"COMPROVANTE DE RECEBIMENTO"})||"<h1>QUALITY ERP</h1><h2>COMPROVANTE DE RECEBIMENTO</h2>"}<div class="grid"><div><span>Comprovante</span><b>${esc(ref(receipt.receiptNumber||receipt.id||'—'))}</b></div><div><span>Data e hora</span><b>${dateTime(receipt.receivedDateTime||receipt.createdAt)}</b></div><div><span>Cliente</span><b>${esc(customer.name||title.customerName||'—')}</b></div><div><span>CPF/CNPJ</span><b>${esc(documentMask(customer.document||title.customerDocument))}</b></div><div><span>Título</span><b>${esc(ref(title.number||'—'))}</b></div><div><span>Origem</span><b>${esc(title.originLabel||operation.number||'—')}</b></div></div><div class="line"></div><b>Forma(s) de pagamento</b><table>${methods}</table>${Number(receipt.interest||0)>0?`<p>Juros: <b>${money(receipt.interest)}</b></p>`:''}${Number(receipt.fine||0)>0?`<p>Multa: <b>${money(receipt.fine)}</b></p>`:''}${Number(receipt.discount||0)>0?`<p>Desconto: <b>${money(receipt.discount)}</b></p>`:''}<div class="total">Recebido: <b>${money(receipt.value)}</b></div><p>Saldo restante: <b>${money(receipt.balanceAfter)}</b></p>${receipt.notes?`<p>Observação: ${esc(receipt.notes)}</p>`:''}<div class="line"></div><p class="foot">Operador: ${esc(receipt.createdBy||'painel')}<br>Obrigado pela preferência.</p></div><script>window.onload=()=>{window.print();}</script></body></html>`);
    popup.document.close();
    popup.focus();
  }

  body.addEventListener('click', event => { const row=event.target.closest('.receivable-row'); if(row) openDetail(row.dataset.open); });
  body.addEventListener('keydown', event => { const row=event.target.closest('.receivable-row'); if(row && (event.key==='Enter'||event.key===' ')){ event.preventDefault(); openDetail(row.dataset.open); } });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => { if(event.key==='Escape'){ if(!receiveModal.hidden) closeReceiveModal(); else if(drawer.classList.contains('open')) closeDrawer(); } });

  receiveModal.querySelectorAll('[data-close-receive]').forEach(button=>button.addEventListener('click',closeReceiveModal));
  receiveForm.addEventListener('submit',submitReceipt);
  receiveForm.addEventListener('input',receiveCalculation);
  receiveForm.addEventListener('change',receiveCalculation);
  ['receiveInterest','receiveFine','receiveDiscount'].forEach(id=>document.getElementById(id)?.addEventListener('input',syncReceiptTotalFromCharges));
  document.getElementById('addReceivePayment').addEventListener('click',()=>{ document.getElementById('receivePayments').insertAdjacentHTML('beforeend',paymentRow()); receiveCalculation(); });
  document.getElementById('receivePayments').addEventListener('click',event=>{ const button=event.target.closest('[data-remove-payment]'); if(!button)return; const rows=receiveForm.querySelectorAll('.receivable-payment-row'); if(rows.length===1)return; button.closest('.receivable-payment-row').remove(); receiveCalculation(); });
  document.getElementById('receivePayments').addEventListener('change',event=>{ if(event.target.matches('.receive-method')) syncPaymentInstallments(event.target.closest('.receivable-payment-row')); });
  document.getElementById('printCurrentReceipt').addEventListener('click',()=>{ if(currentReceipt) printReceipt(currentReceipt); });
  document.getElementById('finishCurrentReceipt').addEventListener('click',closeReceiveModal);
  whatsModal?.querySelectorAll('[data-close-whatsapp]').forEach(button=>button.addEventListener('click',closeWhatsModal));
  document.getElementById('sendReceiptWhatsApp')?.addEventListener('click',sendReceiptWhatsApp);

  ['receivableSearch','receivableStatus','receivableDueFrom','receivableDueTo','receivableCustomer','receivablePaymentMethod','receivableCostCenter','receivableAccount'].forEach(id => document.getElementById(id)?.addEventListener(id==='receivableSearch'?'input':'change', render));
  document.querySelectorAll('[data-due-preset]').forEach(button => button.addEventListener('click',()=>{ duePreset=button.dataset.duePreset; document.querySelectorAll('[data-due-preset]').forEach(item=>item.classList.toggle('active',item===button)); render(); }));
  document.getElementById('toggleAdvancedFilters').onclick=()=>{ const panel=document.getElementById('receivableAdvancedFilters'); panel.hidden=!panel.hidden; };
  document.getElementById('clearReceivableFilters').onclick=()=>{ ['receivableSearch','receivableStatus','receivableDueFrom','receivableDueTo','receivableCustomer','receivablePaymentMethod','receivableCostCenter','receivableAccount'].forEach(id=>document.getElementById(id).value=''); duePreset=''; document.querySelectorAll('[data-due-preset]').forEach(item=>item.classList.toggle('active',item.dataset.duePreset==='')); render(); };
  document.querySelectorAll('[data-summary-filter]').forEach(card=>card.addEventListener('click',()=>{ const type=card.dataset.summaryFilter; document.getElementById('clearReceivableFilters').click(); if(type==='open') document.getElementById('receivableStatus').value='open'; if(type==='today') duePreset='today'; if(type==='overdue') duePreset='overdue'; if(type==='received-month') document.getElementById('receivableStatus').value='paid'; document.querySelectorAll('[data-due-preset]').forEach(item=>item.classList.toggle('active',item.dataset.duePreset===duePreset)); render(); }));

  document.querySelector('[data-due-preset=""]')?.classList.add('active');
  
  if (bootstrap.initialTitleId) {
    setTimeout(()=>openDetail(bootstrap.initialTitleId),80);
  }
render();
})();
