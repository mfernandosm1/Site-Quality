(()=>{
  'use strict';
  const boot=JSON.parse(document.getElementById('payablesBootstrap')?.textContent||'{}');
  const initialParams=new URLSearchParams(window.location.search);
  let titles=boot.titles||[], current=null, currentPayment=null,
      duePreset=initialParams.has('dueFrom')||initialParams.has('dueTo')?'':(initialParams.get('duePreset')||'month'),
      payableView=['all','paid','reversed'].includes(initialParams.get('view'))?initialParams.get('view'):'active',
      selectedPayables=new Set();
  const defaultCashboxId=boot.defaultCashboxId||boot.cashboxes?.find(item=>item.isOpen)?.id||boot.cashboxes?.[0]?.id||'caixa-principal';
  const $=id=>document.getElementById(id);
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const date=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR'):'—';
  const dateTime=v=>v?new Date(v).toLocaleString('pt-BR'):'—';
  const today=()=>{const now=new Date(),year=now.getFullYear(),month=String(now.getMonth()+1).padStart(2,'0'),day=String(now.getDate()).padStart(2,'0');return `${year}-${month}-${day}`};
  const currentMonth=()=>today().slice(0,7);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parseMoney=v=>Math.round((Number(String(v||0).replace(/\./g,'').replace(',','.'))||0)*100)/100;
  const decimal=v=>Number(v||0).toFixed(2).replace('.',',');
  const labels={open:'Em aberto',partial:'Parcial',paid:'Pago',cancelled:'Estornada',reversed:'Estornada',created:'Conta criada',classification_updated:'Classificação atualizada',partial_payment:'Pagamento parcial',payment:'Pagamento',reversed_action:'Conta estornada',cancelled_payment:'Pagamento cancelado',payment_reversed:'Pagamento estornado',payment_method_forecast_updated:'Forma prevista alterada',installment_payment_method_updated:'Forma de pagamento da parcela alterada',installment_updated:'Parcela atualizada',installments_bulk_updated:'Parcelas atualizadas em massa'};
  const catalogName=(group,id)=>boot.catalogs?.[group]?.find(item=>item.id===id)?.name||id||'—';
  const nextOpen=t=>(t.installments||[]).find(i=>Number(i.openBalance||0)>0);
  const nextOpenValue=t=>{const installment=nextOpen(t);return installment?Number(installment.openBalance??installment.originalValue??0):Number(t.openBalance||0)};
  const ref=value=>String(value??'').replace(/\b([A-Z]{1,5})-0+(\d+)\b/g,'$1-$2');
  const purchaseRef=t=>{const text=[t?.description,t?.documentNumber,t?.originId].filter(Boolean).join(' '),m=text.match(/COM-0*\d+/i);return m?ref(m[0].toUpperCase()):''};
  const referenceOf=t=>{const purchase=purchaseRef(t),doc=String(t?.documentNumber||'').trim();if(purchase){if(doc&&!/^COM-0*\d+$/i.test(doc))return `Nota ${ref(doc)} · Compra ${purchase}`;return `Compra ${purchase}`}return ref(t?.notes||doc||t?.description||'—')};

  function normalizeSearch(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function searchableSelect(select,{placeholder='Pesquisar…',linkedCostSelect=null}={}){
    if(!select||select.dataset.searchReady==='1')return;
    select.dataset.searchReady='1';
    let source=Array.from(select.options).map(option=>({
      value:option.value,
      label:option.textContent,
      costCenter:option.dataset.costCenter||''
    }));
    const input=document.createElement('input');
    input.type='search';
    input.className='payable-select-search';
    input.placeholder=placeholder;
    input.autocomplete='off';
    input.setAttribute('aria-label',placeholder);
    select.parentNode.insertBefore(input,select);
    const refresh=()=>{
      const selected=select.value;
      const term=normalizeSearch(input.value);
      const center=linkedCostSelect?.value||'';
      const rows=source.filter((item,index)=>index===0||((!center||!item.costCenter||item.costCenter===center)&&(!term||normalizeSearch(item.label).includes(term))));
      select.innerHTML=rows.map((item,index)=>`<option value="${esc(item.value)}"${item.value===selected?' selected':''}>${esc(item.label)}</option>`).join('');
      if(selected&&!rows.some(item=>item.value===selected))select.value='';
    };
    select.__qualitySyncSearchSource=()=>{
      source=Array.from(select.options).map(option=>({value:option.value,label:option.textContent,costCenter:option.dataset.costCenter||''}));
      refresh();
    };
    input.addEventListener('input',refresh);
    input.addEventListener('focus',()=>refreshClassificationCatalogs().catch(()=>{}));
    linkedCostSelect?.addEventListener('change',()=>{input.value='';refresh();select.dispatchEvent(new Event('change',{bubbles:true}))});
    refresh();
  }
  const expenseAccounts=()=> (boot.catalogs?.accounts||[]).filter(item=>item.active!==false&&item.type!=='receita'&&item.hiddenFromCatalog!==true);
  function accountOptions(selected='',blankLabel='Selecione o plano de contas'){
    return `<option value="">${esc(blankLabel)}</option>`+expenseAccounts().map(item=>{const center=(boot.catalogs?.costCenters||[]).find(c=>c.id===(item.costCenterId||item.categoryId));return `<option value="${esc(item.id)}" data-cost-center="${esc(item.costCenterId||item.categoryId||'')}" ${item.id===selected?'selected':''}>${esc(center?`${center.name} › ${item.name}`:item.name)}</option>`}).join('');
  }
  function syncAccountSelect(select,{blankLabel='Selecione o plano de contas'}={}){
    if(!select)return;
    const selected=select.value;
    select.innerHTML=accountOptions(selected,blankLabel);
    if(selected&&![...select.options].some(option=>option.value===selected))select.value='';
    select.__qualitySyncSearchSource?.();
  }
  let classificationCatalogLoadedAt=0,classificationCatalogPromise=null;
  async function refreshClassificationCatalogs(force=false){
    if(!force&&Date.now()-classificationCatalogLoadedAt<1500)return;
    if(classificationCatalogPromise)return classificationCatalogPromise;
    classificationCatalogPromise=(async()=>{
      const [accountsResponse,centersResponse]=await Promise.all([fetch('/erp/financeiro/api/catalogos/accounts'),fetch('/erp/financeiro/api/catalogos/costCenters')]);
      const [accountsData,centersData]=await Promise.all([accountsResponse.json(),centersResponse.json()]);
      if(!accountsData.success)throw new Error(accountsData.message||'Não foi possível atualizar os Planos de Conta.');
      if(!centersData.success)throw new Error(centersData.message||'Não foi possível atualizar os Centros de Custo.');
      boot.catalogs=boot.catalogs||{};boot.catalogs.accounts=accountsData.items||[];boot.catalogs.costCenters=centersData.items||[];
      classificationCatalogLoadedAt=Date.now();
      syncAccountSelect($('payableAccount'),{blankLabel:'Todos'});
      syncAccountSelect($('createAccount'));
      document.querySelectorAll('[data-classification-account]').forEach(select=>syncAccountSelect(select,{blankLabel:'Selecione'}));
    })().finally(()=>{classificationCatalogPromise=null});
    return classificationCatalogPromise;
  }
  function initClassificationSearch(root=document){
    const account=root.querySelector('[data-classification-account]');
    searchableSelect(account,{placeholder:'Pesquisar plano de contas'});
  }

  function selectedMultiValues(name){return [...document.querySelectorAll(`[data-payable-multi-filter] input[name="${name}"]:checked`)].map(input=>input.value).filter(Boolean)}
  function refreshPayableMulti(box){
    if(!box)return;
    const checked=[...box.querySelectorAll('input[type="checkbox"]:checked')];
    const summary=box.querySelector('[data-payable-multi-summary]');
    if(summary) summary.textContent=!checked.length?'Todas':(checked.length===1?checked[0].closest('label')?.querySelector('span')?.textContent?.trim()||'1 selecionada':`${checked.length} selecionadas`);
  }
  function initPayableMultiFilters(){
    document.querySelectorAll('[data-payable-multi-filter]').forEach(box=>{
      const name=box.querySelector('input[type="checkbox"]')?.name;
      const initial=name?initialParams.getAll(name):[];
      if(initial.length) box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=initial.includes(input.value));
      box.querySelector('[data-clear-payable-multi]')?.addEventListener('click',event=>{event.preventDefault();box.querySelectorAll('input[type="checkbox"]').forEach(input=>input.checked=false);refreshPayableMulti(box);load().catch(e=>alert(e.message))});
      box.addEventListener('change',event=>{if(!event.target.matches('input[type="checkbox"]'))return;refreshPayableMulti(box);clearTimeout(window.__payableTimer);window.__payableTimer=setTimeout(()=>load().catch(e=>alert(e.message)),120)});
      refreshPayableMulti(box);
    });
  }

  function query(){
    const p=new URLSearchParams();
    [['search','payableSearch'],['status','payableStatus'],['type','payableType'],['dueFrom','payableDueFrom'],['dueTo','payableDueTo']].forEach(([k,id])=>{const v=$(id)?.value?.trim();if(v)p.set(k,v)});
    ['supplierId','paymentMethodId','accountId'].forEach(name=>selectedMultiValues(name).forEach(value=>p.append(name,value)));
    if(duePreset)p.set('duePreset',duePreset);
    p.set('view',payableView);
    return p;
  }

  function sortTitles(items){
    const mode=$('payableSort')?.value||'dueAsc';
    return [...items].sort((a,b)=>{
      if(mode==='valueDesc')return Number(b.openBalance||0)-Number(a.openBalance||0);
      if(mode==='createdDesc')return String(b.createdAt||'').localeCompare(String(a.createdAt||''));
      const ad=nextOpen(a)?.dueDate||'9999-12-31',bd=nextOpen(b)?.dueDate||'9999-12-31';
      return mode==='dueDesc'?bd.localeCompare(ad):ad.localeCompare(bd);
    });
  }

  function dueClass(t){
    const due=nextOpen(t)?.dueDate;
    if(!due||Number(t.openBalance||0)<=0)return '';
    if(due<today())return 'payable-row-overdue';
    if(due===today())return 'payable-row-today';
    return '';
  }

  function updateViewTabs(){
    document.querySelectorAll('[data-payable-view]').forEach(button=>{
      const active=button.dataset.payableView===payableView;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }
  function updateViewCounts(counts={}){
    if(Number.isFinite(Number(counts.all))&&$('allPayablesCount')) $('allPayablesCount').textContent=counts.all;
    if(Number.isFinite(Number(counts.active))) $('activePayablesCount').textContent=counts.active;
    if(Number.isFinite(Number(counts.paid))) $('paidPayablesCount').textContent=counts.paid;
    if(Number.isFinite(Number(counts.reversed))) $('reversedPayablesCount').textContent=counts.reversed;
  }
  function setPayableView(view,{reload=true}={}){
    clearBulkSelection();
    payableView=['all','paid','reversed'].includes(view)?view:'active';
    if(['active','all'].includes(payableView)&&['paid','reversed'].includes($('payableStatus')?.value)) $('payableStatus').value='';
    if(payableView==='paid'&&$('payableStatus')) $('payableStatus').value='paid';
    if(payableView==='reversed'&&$('payableStatus')) $('payableStatus').value='reversed';
    updateViewTabs();
    updateDateFilterLabels();
    if(reload) load().catch(error=>alert(error.message));
  }
  function usesPaymentDate(){return payableView==='paid'||['paid','partial'].includes($('payableStatus')?.value||'')}
  function updateDateFilterLabels(){
    const paymentMode=usesPaymentDate();
    if($('payablePeriodTitle')) $('payablePeriodTitle').textContent=paymentMode?'Período de pagamento':'Período de vencimento';
    if($('payableDateColumnTitle')) $('payableDateColumnTitle').textContent=payableView==='paid'?'Data do pagamento':payableView==='all'?'Vencimento(s)':'Próximo vencimento';
  }

  function selectablePayable(t){return payableView==='active'&&['open','partial'].includes(t.status)&&!!nextOpen(t)}
  function selectedItems(){return titles.filter(t=>selectedPayables.has(t.id)&&selectablePayable(t)).map(t=>({title:t,installment:nextOpen(t)}))}
  function updateBulkSelectionUi(){
    const selected=selectedItems(),button=$('paySelectedPayables'),master=$('selectAllPayables'),available=titles.filter(selectablePayable);
    const total=selected.reduce((sum,item)=>sum+Number(item.installment.openBalance||0),0);
    if(button){button.hidden=!selected.length;button.textContent=selected.length?`Pagar selecionadas (${selected.length}) · ${money(total)}`:'Pagar selecionadas'}
    if(master){master.disabled=payableView!=='active'||!available.length;master.checked=available.length>0&&available.every(item=>selectedPayables.has(item.id));master.indeterminate=!master.checked&&available.some(item=>selectedPayables.has(item.id));}
  }
  function clearBulkSelection(){selectedPayables.clear();updateBulkSelectionUi()}

  function render(){
    const body=$('payablesBody'), sorted=sortTitles(titles);
    $('payableResultCount').textContent=`${titles.length} conta(s)`;
    const visibleTotal=titles.reduce((sum,t)=>sum+Number((t.visibleValue??(payableView==='paid'?t.paidValue:payableView==='all'?t.netValue:t.openBalance))||0),0);
    const visibleInstallments=titles.reduce((sum,t)=>sum+Number(t.visibleInstallmentCount||0),0);
    if($('payableVisibleTotal')) $('payableVisibleTotal').textContent=`Total exibido: ${money(visibleTotal)}${visibleInstallments?` · ${visibleInstallments} parcela(s)`:''}`;
    if(!sorted.length){body.innerHTML='<tr><td colspan="8" class="empty-state"><strong>Nenhuma conta encontrada.</strong></td></tr>';bindRows();updateBulkSelectionUi();return;}
    const mode=$('payableSort')?.value||'dueAsc';
    const paidView=payableView==='paid';
    const groupedByDate=!paidView&&['dueAsc','dueDesc'].includes(mode);
    const totals=new Map();
    if(groupedByDate){
      sorted.forEach(t=>{const due=nextOpen(t)?.dueDate||'';if(!due)return;const current=totals.get(due)||{count:0,value:0};current.count+=1;current.value+=nextOpenValue(t);totals.set(due,current)});
    }
    let lastDate='';
    body.innerHTML=sorted.map(t=>{
      const n=nextOpen(t);
      const displayDate=paidView?t.latestPaymentDate:n?.dueDate;
      const displayValue=Number((t.visibleValue??(paidView?t.paidValue:payableView==='all'?t.netValue:nextOpenValue(t)))||0);
      let group='';
      if(groupedByDate&&displayDate&&displayDate!==lastDate){
        lastDate=displayDate;
        const summary=totals.get(displayDate)||{count:0,value:0};
        group=`<tr class="payable-date-group"><td colspan="8"><div><span><b>${date(displayDate)}</b><small>${summary.count} conta(s)</small></span><strong>Total do dia: ${money(summary.value)}</strong></div></td></tr>`;
      }
      const selectable=selectablePayable(t),checked=selectedPayables.has(t.id);
      return `${group}<tr class="receivable-row ${paidView?'':dueClass(t)}${checked?' is-selected':''}" tabindex="0" data-open="${esc(t.id)}"><td class="payable-select-column">${selectable?`<input type="checkbox" class="payable-row-select" data-select-payable="${esc(t.id)}" ${checked?'checked':''} aria-label="Selecionar ${esc(ref(t.number))}">`:''}</td><td><b>${esc(ref(t.number))}</b></td><td>${esc(t.supplierName)}<small>${esc(ref(t.description))}</small></td><td>${esc(referenceOf(t))}</td><td><span class="payable-due-indicator">${date(displayDate)}</span></td><td>${money(displayValue)}</td><td><b>${money(t.openBalance)}</b></td><td><span class="finance-status status-${esc(t.status)}">${esc(labels[t.status]||t.status)}</span></td></tr>`;
    }).join('');
    bindRows();updateBulkSelectionUi();
  }

  function updateSummary(summary={}){
    const cards=[['total-period',summary.totalPeriod,'parcela(s)'],['open',summary.open,'parcela(s)'],['today',summary.dueToday,'parcela(s)'],['overdue',summary.overdue,'parcela(s)'],['paid-month',summary.paidMonth,'pagamento(s)'],['this-week',summary.thisWeek,'parcela(s)'],['next-week',summary.nextWeek,'parcela(s)'],['next-30',summary.next30Days,'parcela(s)']];
    cards.forEach(([key,item,label])=>{const card=document.querySelector(`[data-summary-filter="${key}"]`);if(!card||!item)return;card.querySelector('strong').textContent=money(item.value);card.querySelector('small').textContent=`${Number(item.count||0)} ${label}`});
  }

  function setListLoading(show,{allRecords=false}={}){
    const app=$('payablesApp');
    app?.classList.toggle('is-loading',show);
    let notice=$('payableLoadingNotice');
    if(!notice&&app){notice=document.createElement('div');notice.id='payableLoadingNotice';notice.className='payable-loading-notice';notice.setAttribute('role','status');app.appendChild(notice)}
    if(notice){notice.textContent=allRecords?'Carregando todos os registros. Em bases maiores isso pode levar alguns segundos…':'Atualizando contas a pagar…';notice.hidden=!show}
  }

  async function load({allRecords=false}={}){
    setListLoading(true,{allRecords});
    try{
      const r=await fetch(`/erp/financeiro/api/contas-a-pagar?${query()}`),d=await r.json();
      if(!d.success)throw new Error(d.message);
      titles=d.items; selectedPayables=new Set([...selectedPayables].filter(id=>titles.some(t=>t.id===id&&selectablePayable(t)))); updateViewCounts(d.counts); updateSummary(d.summary); render();
    }finally{setListLoading(false)}
  }

  function bindRows(){
    document.querySelectorAll('[data-open]').forEach(row=>{
      row.onclick=event=>{if(event.target.closest('input,button,select,a,label'))return;openDetail(row.dataset.open)};
      row.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.matches('input,button,select,a')){e.preventDefault();openDetail(row.dataset.open)}};
    });
    document.querySelectorAll('[data-select-payable]').forEach(input=>{
      input.onclick=event=>event.stopPropagation();
      input.onchange=()=>{if(input.checked)selectedPayables.add(input.dataset.selectPayable);else selectedPayables.delete(input.dataset.selectPayable);input.closest('[data-open]')?.classList.toggle('is-selected',input.checked);updateBulkSelectionUi()};
    });
  }
  function openDrawer(){const modal=$('payableDrawer');if(!modal)return;modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('receivable-modal-open')}
  function closeDrawer(){const modal=$('payableDrawer');if(!modal)return;modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('receivable-modal-open')}

  function progress(item){
    const total=Number(item.originalValue||0),paid=Number(item.paidValue||0),percent=total>0?Math.min(100,Math.round((paid/total)*100)):0;
    return `<div class="payable-progress"><span style="width:${percent}%"></span></div><small>${percent}% pago</small>`;
  }
  function paymentMethods(payment){return (payment.payments||[]).map(x=>`${x.paymentMethodName||catalogName('paymentMethods',x.paymentMethodId)} · ${money(x.value)}`).join(' + ')||'—'}
  function isReversedStatus(status){return ['cancelled','reversed'].includes(status)}
  function installmentState(title,item){
    if(isReversedStatus(title.status))return {key:'reversed',label:'Estornada'};
    const original=Number(item.originalValue||0),paid=Number(item.paidValue||0),open=Number(item.openBalance||0);
    if(original>0&&paid+0.005>=original&&open<=0.005)return {key:'paid',label:'Quitada'};
    if(paid>0)return {key:'partial',label:'Parcial'};
    return {key:'open',label:'Em aberto'};
  }
  function eventDescription(event){
    const meta=event.meta||event.data||event.details||{};
    if(event.action==='installment_updated'){
      const previous=event.previous||meta.previous||{},currentMeta=event.current||meta.current||{};
      const changes=[];
      if(Number(previous.value)!==Number(currentMeta.value))changes.push(`valor: ${money(previous.value)} → ${money(currentMeta.value)}`);
      if(previous.dueDate!==currentMeta.dueDate)changes.push(`vencimento: ${date(previous.dueDate)} → ${date(currentMeta.dueDate)}`);
      if(previous.paymentMethodId!==currentMeta.paymentMethodId)changes.push(`forma: ${esc(catalogName('paymentMethods',previous.paymentMethodId))} → ${esc(catalogName('paymentMethods',currentMeta.paymentMethodId))}`);
      if(String(previous.notes||'')!==String(currentMeta.notes||''))changes.push('observação alterada');
      return `Parcela ${esc(event.installmentNumber||meta.installmentNumber||'—')}${changes.length?` · ${changes.join(' · ')}`:''}`;
    }
    if(event.action==='installment_payment_method_updated'){
      const previous=catalogName('paymentMethods',meta.previousPaymentMethodId),next=catalogName('paymentMethods',meta.paymentMethodId);
      return `Parcela ${esc(meta.installmentNumber||'—')} · ${esc(previous)} → ${esc(next)}`;
    }
    if(event.action==='classification_updated'){const previous=meta.previous||{},currentMeta=meta.current||{};return `Centro de custo: ${esc(catalogName('costCenters',previous.costCenterId))} → ${esc(catalogName('costCenters',currentMeta.costCenterId))} · Plano de contas: ${esc(catalogName('accounts',previous.accountId))} → ${esc(catalogName('accounts',currentMeta.accountId))}`;}
    if(event.action==='reversed_action'&&meta.reason)return `Motivo: ${esc(meta.reason)}`;
    if(event.action==='partial_payment'||event.action==='payment'){
      const value=meta.value??meta.amount??meta.paymentValue;
      return value!=null?`Valor: ${money(value)}`:'';
    }
    return '';
  }

  async function postJson(url,body={}){
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!data.success)throw new Error(data.message||'Não foi possível concluir a operação.');
    return data;
  }
  function paymentsForInstallment(installmentId){return (current?.payments||[]).filter(item=>item.installmentId===installmentId)}
  function paymentRows(installment,titleReversed){
    const rows=paymentsForInstallment(installment.id);
    if(!rows.length)return '';
    return `<details class="payable-inline-payments"><summary>Movimentações da parcela (${rows.length})</summary><div>${rows.map(p=>{const reversed=p.status==='reversed';return `<article class="${reversed?'is-reversed':''}"><div><b>${money(p.value)}</b><small>${dateTime(p.createdAt||p.paidAt)} · ${esc(paymentMethods(p))}${reversed?' · ESTORNADO':''}</small></div><div class="payable-payment-actions"><button type="button" class="btn btn-small" data-print-payment="${esc(p.id)}">Imprimir</button>${!reversed&&!titleReversed?`<button type="button" class="btn btn-small btn-danger" data-reverse-payment="${esc(p.id)}">Desfazer pagamento</button>`:''}</div></article>`}).join('')}</div></details>`;
  }
  function renderOperationalRow(t,i){
    const state=installmentState(t,i),reversed=isReversedStatus(t.status),canEdit=!reversed&&Number(i.paidValue||0)<=Number(i.originalValue||0),canPay=!reversed&&Number(i.openBalance||0)>0;
    const methodId=i.paymentMethodId||t.paymentMethodId||'';
    const canSplit=canEdit&&Number(i.paidValue||0)===0;
    return `<article class="payable-operation-row is-${state.key}" data-installment-row="${esc(i.id)}">
      <div class="payable-operation-main">
        <div class="payable-row-tools">
          <label class="payable-join-check" title="Selecionar esta parcela para juntar"><input type="checkbox" data-join-installment="${esc(i.id)}" ${Number(i.paidValue||0)>0||reversed?'disabled':''}><span class="sr-only">Selecionar parcela ${i.number}/${i.total}</span></label>
          ${canSplit?`<button type="button" class="payable-icon-action" data-split-installment="${esc(i.id)}" title="Quebrar parcela" aria-label="Quebrar parcela">−</button>`:'<span class="payable-tool-placeholder" aria-hidden="true"></span>'}
          <strong class="payable-installment-number">${i.number}/${i.total}</strong>
        </div>
        <label class="payable-inline-field payable-value-field"><span>Valor</span><div><input inputmode="decimal" data-edit-value value="${decimal(i.originalValue)}" ${canEdit?'':'disabled'}>${canEdit?`<button type="button" class="payable-icon-action is-update" data-save-installment="${esc(i.id)}" title="Atualizar parcela" aria-label="Atualizar parcela">↻</button>`:''}</div></label>
        <label class="payable-inline-field"><span>Vencimento</span><input type="date" data-edit-due value="${esc(i.dueDate||'')}" ${canEdit?'':'disabled'}></label>
        <label class="payable-inline-field"><span>Forma</span><select data-edit-method ${canEdit?'':'disabled'}>${paymentOptions(methodId)}</select></label>
        <label class="payable-inline-field"><span>Caixa</span><select data-edit-cashbox disabled>${(boot.cashboxes||[]).map(box=>`<option value="${esc(box.id)}" ${box.id===(t.cashboxId||defaultCashboxId)?'selected':''}>${esc(box.name)}</option>`).join('')}</select></label>
        <label class="payable-inline-field payable-operation-notes"><span>Observação</span><input data-edit-notes value="${esc(i.notes||'')}" placeholder="Opcional" ${canEdit?'':'disabled'}></label>
        <div class="payable-operation-status"><span>Situação</span><button type="button" class="payable-status-action is-${state.key}" ${canPay?'data-pay="'+esc(i.id)+'"':Number(i.paidValue||0)>0&&!reversed?'data-toggle-payments="'+esc(i.id)+'"':'disabled'}>${canPay?'Pagar':state.key==='paid'?'Pago':reversed?'Estornada':'Ver'}</button><small>${state.key==='partial'?`${money(i.openBalance)} restante`:state.key==='paid'?'Quitada':money(i.openBalance)}</small></div>
      </div>
      <div class="payable-operation-progress"><span style="width:${Math.min(100,Math.round(Number(i.originalValue||0)>0?Number(i.paidValue||0)/Number(i.originalValue||0)*100:0))}%"></span></div>
      ${paymentRows(i,reversed)}
    </article>`;
  }
  async function saveInstallmentRow(button){
    const row=button.closest('[data-installment-row]'),id=row.dataset.installmentRow;
    button.disabled=true;button.textContent='Salvando…';
    try{await postJson(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/parcelas/${encodeURIComponent(id)}/atualizar`,{value:parseMoney(row.querySelector('[data-edit-value]').value),dueDate:row.querySelector('[data-edit-due]').value,paymentMethodId:row.querySelector('[data-edit-method]').value,notes:row.querySelector('[data-edit-notes]').value});await load();await openDetail(current.item.id)}catch(error){alert(error.message);button.disabled=false;button.textContent='Salvar linha'}
  }
  async function splitInstallmentRow(id){
    const installment=(current.item.installments||[]).find(item=>item.id===id);if(!installment)return;
    const raw=prompt(`Valor da primeira parte da parcela ${installment.number}/${installment.total}:`,decimal(Number(installment.originalValue||0)/2));if(raw===null)return;
    try{await postJson(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/parcelas/${encodeURIComponent(id)}/quebrar`,{value:parseMoney(raw)});await load();await openDetail(current.item.id)}catch(error){alert(error.message)}
  }
  async function joinSelectedInstallments(){
    const ids=[...$('payableDetail').querySelectorAll('[data-join-installment]:checked')].map(item=>item.dataset.joinInstallment);
    if(ids.length<2){alert('Selecione ao menos duas parcelas sem pagamento para juntar.');return}
    if(!confirm(`Juntar ${ids.length} parcelas em uma única parcela?`))return;
    try{await postJson(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/parcelas/juntar`,{installmentIds:ids});await load();await openDetail(current.item.id)}catch(error){alert(error.message)}
  }

  function toggleBulkInstallmentEditor(show){
    const box=$('payableDetail')?.querySelector('[data-bulk-installment-editor]');
    if(!box)return;
    box.hidden=!show;
    if(show){
      const active=(current?.item?.installments||[]).filter(item=>Number(item.openBalance||0)>0).sort((a,b)=>Number(a.number||0)-Number(b.number||0));
      const first=active[0];
      const due=box.querySelector('[data-bulk-first-due]');
      const method=box.querySelector('[data-bulk-method]');
      if(due&&!due.value)due.value=first?.dueDate||today();
      if(method&&!method.value)method.value=first?.paymentMethodId||current?.item?.paymentMethodId||'';
      requestAnimationFrame(()=>due?.focus());
    }
  }
  function syncBulkInstallmentFields(){
    const box=$('payableDetail')?.querySelector('[data-bulk-installment-editor]');if(!box)return;
    [['dueDate','[data-bulk-first-due]'],['paymentMethodId','[data-bulk-method]'],['notes','[data-bulk-notes]'],['value','[data-bulk-value]']].forEach(([key,selector])=>{const input=box.querySelector(selector),check=box.querySelector(`[data-bulk-apply="${key}"]`);if(input&&check)input.disabled=!check.checked});
    const monthly=box.querySelector('[data-bulk-monthly]'),dueCheck=box.querySelector('[data-bulk-apply="dueDate"]');if(monthly&&dueCheck)monthly.disabled=!dueCheck.checked;
  }
  async function saveBulkInstallments(){
    const box=$('payableDetail')?.querySelector('[data-bulk-installment-editor]');if(!box)return;
    const apply={value:box.querySelector('[data-bulk-apply="value"]')?.checked===true,dueDate:box.querySelector('[data-bulk-apply="dueDate"]')?.checked===true,paymentMethodId:box.querySelector('[data-bulk-apply="paymentMethodId"]')?.checked===true,notes:box.querySelector('[data-bulk-apply="notes"]')?.checked===true};
    if(!Object.values(apply).some(Boolean)){alert('Selecione ao menos um campo para aplicar em massa.');return}
    const active=(current?.item?.installments||[]).filter(item=>Number(item.openBalance||0)>0);
    if(!active.length){alert('Não há parcelas em aberto para alterar.');return}
    const payload={apply,monthly:box.querySelector('[data-bulk-monthly]')?.checked!==false,firstDueDate:box.querySelector('[data-bulk-first-due]')?.value||'',paymentMethodId:box.querySelector('[data-bulk-method]')?.value||'',notes:box.querySelector('[data-bulk-notes]')?.value||'',value:apply.value?parseMoney(box.querySelector('[data-bulk-value]')?.value||'0'):undefined};
    if(apply.dueDate&&!payload.firstDueDate){alert('Informe o primeiro vencimento.');return}
    if(apply.paymentMethodId&&!payload.paymentMethodId){alert('Selecione a forma de pagamento.');return}
    if(apply.value&&!(payload.value>0)){alert('Informe um valor maior que zero.');return}
    const fields=[apply.dueDate?'vencimentos':'',apply.paymentMethodId?'forma de pagamento':'',apply.notes?'observação':'',apply.value?'valor de cada parcela':''].filter(Boolean).join(', ');
    if(!confirm(`Aplicar ${fields} em ${active.length} parcela(s) em aberto?${apply.value?' O total da conta poderá ser alterado.':''}`))return;
    const button=box.querySelector('[data-save-bulk-installments]');if(button){button.disabled=true;button.textContent='Aplicando…'}
    try{await postJson(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/parcelas/atualizar-em-massa`,payload);await load();await openDetail(current.item.id)}catch(error){alert(error.message);if(button){button.disabled=false;button.textContent='Aplicar alterações'}}
  }

  async function openDetail(id){
    openDrawer(); $('payableDetail').innerHTML='<div class="payable-central-loading">Carregando…</div>'; 
    try{
      await refreshClassificationCatalogs().catch(()=>{});
      const r=await fetch(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(id)}`),d=await r.json();
      if(!d.success)throw new Error(d.message);
      current=d; const t=d.item,reversed=isReversedStatus(t.status),events=[...(d.events||[])].sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
      const competencies=(t.competencies||[t.competenceDate]).filter(Boolean).map(v=>String(v).slice(0,7));
      const isPurchaseOrigin=t.entryType==='purchase'||String(t.origin||'').toLowerCase().includes('compra');
      const originLabel=isPurchaseOrigin?'Compra':'Manual';
      const rows=(t.installments||[]).map(i=>renderOperationalRow(t,i)).join('');
      $('payableDetail').innerHTML=`<div class="payable-central-header"><div><small>CONTA ${esc(ref(t.number))} · ORIGEM ${esc(originLabel)}</small><h2>${esc(t.supplierName)}</h2><p>${esc(ref(t.description))}${purchaseRef(t)?` · ${esc(referenceOf(t))}`:(t.documentNumber?` · Documento ${esc(ref(t.documentNumber))}`:'')}</p></div><button type="button" data-close aria-label="Fechar">×</button></div>
      <div class="payable-central-body">
        ${reversed?`<section class="payable-reversed-notice"><strong>Conta estornada</strong><span>Esta conta permanece disponível somente para consulta e auditoria.</span></section>`:''}
        <section class="payable-central-summary"><div><span>Total</span><b>${money(t.netValue)}</b></div><div><span>Total pago</span><b>${money(t.paidValue)}</b></div><div><span>Total a pagar</span><b>${reversed?'—':money(t.openBalance)}</b></div><div><span>Situação</span><b class="payable-state payable-state-${reversed?'reversed':t.status}">${esc(labels[t.status]||t.status)}</b></div></section>
        <section class="payable-central-finance"><header><div class="payable-finance-heading"><span>FINANCEIRO DA CONTA</span><h3>Parcelas</h3></div><div class="payable-central-actions"><button type="button" class="btn btn-small payable-bulk-edit-trigger" data-bulk-installments title="Alterar todas as parcelas em aberto de uma vez">Alterar em massa</button><button type="button" class="payable-icon-action is-join" data-join-selected title="Juntar parcelas selecionadas" aria-label="Juntar parcelas selecionadas">+</button><details class="payable-help"><summary title="Ajuda sobre as ações" aria-label="Ajuda sobre as ações">?</summary><div><b>Legenda</b><p><strong>Alterar em massa</strong> aplica vencimentos, forma, observação ou valor em todas as parcelas em aberto.</p><p><strong>−</strong> Quebrar uma parcela.</p><p><strong>↻</strong> Atualizar valor, vencimento, forma e observação.</p><p><strong>+</strong> Juntar duas ou mais parcelas selecionadas.</p></div></details></div></header><div class="payable-bulk-installment-editor" data-bulk-installment-editor hidden><div class="payable-bulk-installment-head"><div><strong>Alteração em massa</strong><small>Aplica somente nas parcelas que ainda possuem saldo em aberto.</small></div><button type="button" class="btn btn-ghost btn-small" data-close-bulk-installments>Fechar</button></div><div class="payable-bulk-installment-grid"><label class="payable-bulk-option"><span><input type="checkbox" data-bulk-apply="dueDate" checked> Atualizar vencimentos</span><input type="date" data-bulk-first-due></label><label class="payable-bulk-option"><span><input type="checkbox" data-bulk-apply="paymentMethodId"> Atualizar forma</span><select data-bulk-method disabled>${paymentOptions('')}</select></label><label class="payable-bulk-option"><span><input type="checkbox" data-bulk-apply="notes"> Atualizar observação</span><input data-bulk-notes placeholder="Observação para todas" disabled></label><label class="payable-bulk-option"><span><input type="checkbox" data-bulk-apply="value"> Atualizar valor de cada parcela</span><input data-bulk-value inputmode="decimal" placeholder="0,00" disabled></label></div><label class="payable-bulk-monthly"><input type="checkbox" data-bulk-monthly checked> A partir do primeiro vencimento, avançar as próximas parcelas mês a mês.</label><div class="payable-bulk-installment-actions"><small>Campos não marcados permanecem como estão.</small><button type="button" class="btn btn-success btn-small" data-save-bulk-installments>Aplicar alterações</button></div></div><div class="payable-operation-columns" aria-hidden="true"><span>Parc.</span><span>Valor</span><span>Vencimento</span><span>Forma</span><span>Caixa</span><span>Observação</span><span>Situação</span></div><div class="payable-operation-list">${rows||'<p>Nenhuma parcela cadastrada.</p>'}</div><div class="payable-operation-legend" aria-label="Legenda das ações das parcelas"><span><b class="payable-legend-icon">−</b>Quebrar parcela</span><span><b class="payable-legend-icon">↻</b>Atualizar valor, vencimento, forma e observação</span><span><b class="payable-legend-icon">+</b>Juntar duas ou mais parcelas selecionadas</span></div></section>
        <section class="payable-central-totals"><div><span>Total</span><b>${money(t.netValue)}</b></div><div><span>Total pago</span><b>${money(t.paidValue)}</b></div><div><span>Total a pagar</span><b>${reversed?'—':money(t.openBalance)}</b></div></section>
        <section class="payable-classification-box"><header><div><span>CLASSIFICAÇÃO</span><h3>Plano de contas</h3></div>${!reversed?'<button type="button" class="btn btn-small" data-edit-classification>Editar</button>':''}</header><div class="payable-classification-view"><div><span>Plano de contas</span><b>${esc(catalogName('accounts',t.accountId))}</b></div><div><span>Centro de custo automático</span><b>${esc(catalogName('costCenters',t.costCenterId))}</b></div></div>${!reversed?`<form class="payable-classification-form" data-classification-form hidden><label><span>Plano de contas *</span><select data-classification-account required><option value="">Selecione</option>${(boot.catalogs?.accounts||[]).filter(x=>x.active!==false&&x.type!=='receita'&&x.hiddenFromCatalog!==true).map(x=>{const center=(boot.catalogs?.costCenters||[]).find(c=>c.id===(x.costCenterId||x.categoryId));return `<option value="${esc(x.id)}" ${x.id===t.accountId?'selected':''}>${esc(center?`${center.name} › ${x.name}`:x.name)}</option>`}).join('')}</select><small>O Centro de custo é definido automaticamente pelo Plano de contas.</small></label><div><button type="button" class="btn btn-ghost btn-small" data-cancel-classification>Cancelar</button><button type="submit" class="btn btn-success btn-small">Salvar classificação</button></div></form>`:''}</section>
        <details class="payable-collapsible"><summary>Competências <span>${competencies.length}</span></summary><div class="payable-competence-tags">${competencies.map(v=>`<span>${esc(v.split('-').reverse().join('/'))}</span>`).join('')||'<span>Não informada</span>'}</div></details>
        <details class="payable-collapsible"><summary>Histórico geral <span>${events.length}</span></summary><div class="payable-timeline">${events.map(e=>{const detail=eventDescription(e);return `<article class="event-${esc(e.action)}"><span></span><div><b>${esc(labels[e.action]||e.action)}</b>${detail?`<p>${detail}</p>`:''}<small>${dateTime(e.at)} · ${esc(e.actor)}</small></div></article>`}).join('')||'<p>Sem movimentações.</p>'}</div></details>
        ${t.notes?`<details class="payable-collapsible"><summary>Observações da conta</summary><p>${esc(t.notes)}</p></details>`:''}
        ${!reversed?`<div class="payable-central-footer ${isPurchaseOrigin?'is-purchase-origin':''}">${isPurchaseOrigin?`<div class="payable-origin-guidance"><span>Financeiro gerado pela compra</span><small>Para remover este financeiro, estorne a compra completa no módulo Compras.</small></div><a class="btn btn-ghost" href="/erp/compras" title="Abrir o módulo Compras">Ir para Compras</a>`:`<button class="btn btn-ghost" data-cancel-title>${Number(t.paidValue||0)>0?'Estornar conta e pagamentos':'Estornar conta'}</button>`}</div>`:''}
      </div>`;
      const root=$('payableDetail');
      root.querySelector('[data-close]').onclick=closeDrawer;
      root.querySelectorAll('[data-pay]').forEach(b=>b.onclick=()=>openPayment(b.dataset.pay));
      root.querySelectorAll('[data-save-installment]').forEach(b=>b.onclick=()=>saveInstallmentRow(b));
      root.querySelectorAll('[data-split-installment]').forEach(b=>b.onclick=()=>splitInstallmentRow(b.dataset.splitInstallment));
      root.querySelector('[data-join-selected]')?.addEventListener('click',joinSelectedInstallments);
      root.querySelector('[data-bulk-installments]')?.addEventListener('click',()=>toggleBulkInstallmentEditor(true));
      root.querySelector('[data-close-bulk-installments]')?.addEventListener('click',()=>toggleBulkInstallmentEditor(false));
      root.querySelectorAll('[data-bulk-apply]').forEach(input=>input.addEventListener('change',syncBulkInstallmentFields));
      root.querySelector('[data-save-bulk-installments]')?.addEventListener('click',saveBulkInstallments);
      syncBulkInstallmentFields();
      root.querySelectorAll('[data-toggle-payments]').forEach(b=>b.onclick=()=>b.closest('[data-installment-row]')?.querySelector('details')?.toggleAttribute('open'));
      root.querySelectorAll('[data-print-payment]').forEach(b=>b.onclick=()=>{const p=(d.payments||[]).find(x=>x.id===b.dataset.printPayment);if(p)printReceipt(p,d)});
      root.querySelectorAll('[data-reverse-payment]').forEach(b=>b.onclick=()=>reversePayment(b.dataset.reversePayment));
      root.querySelector('[data-cancel-title]')?.addEventListener('click',cancelTitle);
      root.querySelector('[data-edit-classification]')?.addEventListener('click',async()=>{await refreshClassificationCatalogs(true).catch(()=>{});syncAccountSelect(root.querySelector('[data-classification-account]'),{blankLabel:'Selecione'});root.querySelector('.payable-classification-view').hidden=true;root.querySelector('[data-classification-form]').hidden=false;initClassificationSearch(root)});
      root.querySelector('[data-cancel-classification]')?.addEventListener('click',()=>{root.querySelector('[data-classification-form]').hidden=true;root.querySelector('.payable-classification-view').hidden=false});
      root.querySelector('[data-classification-form]')?.addEventListener('submit',saveClassification);
    }catch(error){$('payableDetail').innerHTML=`<div class="payable-central-header"><div><small>CONTAS A PAGAR</small><h2>Não foi possível abrir</h2><p>${esc(error.message)}</p></div><button type="button" data-close>×</button></div>`;$('payableDetail').querySelector('[data-close]').onclick=closeDrawer}
  }

  function syncBodyLock(){const modalOpen=Array.from(document.querySelectorAll('.receivable-modal')).some(item=>!item.hidden);document.body.classList.toggle('receivable-modal-open',modalOpen)}
  function modal(id,show){const element=$(id);if(!element)return;element.hidden=!show;element.setAttribute('aria-hidden',String(!show));syncBodyLock()}
  function nextMonthValue(value){const [year,month]=String(value||currentMonth()).split('-').map(Number);const next=new Date(year,month,1);return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`}
  function addMonthsToDate(value,months=1){const source=String(value||today());const [year,month,day]=source.split('-').map(Number);const targetMonth=(month-1)+months,targetYear=year+Math.floor(targetMonth/12),normalizedMonth=((targetMonth%12)+12)%12;const lastDay=new Date(targetYear,normalizedMonth+1,0).getDate();return `${targetYear}-${String(normalizedMonth+1).padStart(2,'0')}-${String(Math.min(day||1,lastDay)).padStart(2,'0')}`}
  function distributeCents(total,count){const cents=Math.round(Number(total||0)*100),base=Math.floor(cents/count),remainder=cents-(base*count);return Array.from({length:count},(_,index)=>(base+(index<remainder?1:0))/100)}
  function competenceItems(){return Array.from(document.querySelectorAll('.payable-competence-row')).map(row=>({competence:row.querySelector('[data-competence-input]')?.value||'',value:parseMoney(row.querySelector('[data-competence-value]')?.value)})).filter(item=>item.competence)}
  function updateCreateTotal(){const items=competenceItems(),total=items.reduce((sum,item)=>sum+item.value,0);$('createGrandTotal').textContent=money(total);$('createTotalHint').textContent=`${items.length} competência${items.length===1?'':'s'}`;updatePaymentPlanSummary()}
  function renderCompetenceRows(values){const unit=parseMoney($('createValue')?.value);const rows=(values?.length?values:[{competence:currentMonth(),value:unit}]).map(item=>typeof item==='string'?{competence:item,value:unit}:item);$('competenceRows').innerHTML=rows.map((item,index)=>`<article class="payable-competence-row"><header><div><b>Competência ${index+1}</b>${index===0?'<span class="payable-competence-primary">Principal</span>':''}</div>${index?'<button type="button" class="btn btn-ghost" data-remove-competence aria-label="Remover competência">×</button>':''}</header><div class="payable-competence-fields"><label><span>Mês/Ano</span><input type="month" data-competence-input value="${esc(item.competence)}" required></label><label><span>Valor</span><input data-competence-value inputmode="decimal" value="${esc(decimal(item.value||unit))}" required></label></div></article>`).join('');$('competenceRows').querySelectorAll('[data-remove-competence]').forEach((button,index)=>button.onclick=()=>{const items=competenceItems();items.splice(index+1,1);renderCompetenceRows(items)});$('competenceRows').oninput=updateCreateTotal;updateCreateTotal()}
  function addCompetence(){const items=competenceItems(),last=items.at(-1)||{competence:currentMonth(),value:parseMoney($('createValue').value)};items.push({competence:nextMonthValue(last.competence),value:last.value||parseMoney($('createValue').value)});renderCompetenceRows(items);const target=$('competenceRows').lastElementChild;target?.scrollIntoView({behavior:'smooth',block:'center'});requestAnimationFrame(()=>target?.querySelector('[data-competence-input]')?.focus())}
  let classificationManuallyChanged=false,classificationSuggestionTimer=null,applyingClassificationSuggestion=false;
  async function suggestCreateClassification(){
    if(classificationManuallyChanged)return;
    const supplierId=$('createSupplier')?.value||'',description=$('createDescription')?.value?.trim()||'';
    if(!supplierId&&!description)return;
    try{
      const params=new URLSearchParams({supplierId,description}),response=await fetch(`/erp/financeiro/api/contas-a-pagar/sugestao-classificacao?${params}`),data=await response.json();
      if(!data.success||!data.suggestion?.accountId)return;
      const select=$('createAccount');if(!select||![...select.options].some(option=>option.value===data.suggestion.accountId))return;
      applyingClassificationSuggestion=true;select.value=data.suggestion.accountId;select.dispatchEvent(new Event('change',{bubbles:true}));applyingClassificationSuggestion=false;
      const hint=$('createAccountHint');if(hint){hint.textContent=`Sugerido pelo histórico: ${data.suggestion.costCenterName} › ${data.suggestion.accountName}. Você pode alterar.`;hint.hidden=false;}
    }catch(_){/* sugestão não pode bloquear o cadastro */}
  }
  function scheduleClassificationSuggestion(){clearTimeout(classificationSuggestionTimer);classificationSuggestionTimer=setTimeout(suggestCreateClassification,350)}
  function openCreate(){closeDrawer();$('payableCreateForm').reset();classificationManuallyChanged=false;if($('createAccountHint')){$('createAccountHint').textContent='';$('createAccountHint').hidden=true;}$('createIssueDate').value=today();if($('createCashbox'))$('createCashbox').value=defaultCashboxId;if($('planInstallmentQuantity'))$('planInstallmentQuantity').value='1';if($('planFirstDueDate'))$('planFirstDueDate').value=today();if($('planPaymentMethod'))$('planPaymentMethod').value='';renderCompetenceRows([{competence:currentMonth(),value:0}]);renderPaymentPlanRows([{paymentMethodId:'',value:0,installmentCount:1,firstDueDate:today()}]);modal('payableCreateModal',true);refreshClassificationCatalogs(true).catch(()=>{});requestAnimationFrame(()=>$('createSupplier')?.focus())}
  function paymentPlanItems(){return [...document.querySelectorAll('.payable-plan-row')].map(row=>({paymentMethodId:row.querySelector('[data-plan-method]')?.value||'',value:parseMoney(row.querySelector('[data-plan-value]')?.value),installmentCount:Number(row.querySelector('[data-plan-installments]')?.value||1),firstDueDate:row.querySelector('[data-plan-due]')?.value||''}))}
  function paymentPlanRow(item={},index=0,total=1){return `<article class="payable-plan-row"><strong class="payable-plan-number">Parcela ${index+1}/${total}</strong><div class="payable-plan-fields"><label><span>Forma</span><select data-plan-method required>${paymentOptions(item.paymentMethodId||'')}</select></label><label><span>Valor</span><input data-plan-value inputmode="decimal" value="${esc(decimal(item.value||0))}" required></label><label><span>Parcelas</span><input data-plan-installments type="number" min="1" max="120" value="${esc(item.installmentCount||1)}" required></label><label><span>Primeiro vencimento</span><input data-plan-due type="date" value="${esc(item.firstDueDate||today())}" required></label></div><button type="button" class="btn btn-ghost" data-remove-plan aria-label="Remover forma">×</button></article>`}
  function renderPaymentPlanRows(items){const rows=items?.length?items:[{paymentMethodId:'',value:0,installmentCount:1,firstDueDate:today()}];$('paymentPlanRows').innerHTML=rows.map((item,index)=>paymentPlanRow(item,index,rows.length)).join('');updatePaymentPlanSummary()}
  function updatePaymentPlanSummary(){if(!$('paymentPlanRows'))return;const expense=competenceItems().reduce((sum,item)=>sum+item.value,0),plan=paymentPlanItems().reduce((sum,item)=>sum+item.value,0),diff=Math.round((expense-plan)*100)/100,status=$('paymentPlanStatus');$('paymentPlanExpenseTotal').textContent=money(expense);$('paymentPlanTotal').textContent=money(plan);status.className='';if(expense>0&&Math.abs(diff)<.01){status.textContent='✓ Composição conferida';status.classList.add('is-ok')}else if(diff>0){status.textContent=`Faltam ${money(diff)}`;status.classList.add('is-pending')}else if(diff<0){status.textContent=`Excedeu ${money(Math.abs(diff))}`;status.classList.add('is-error')}else{status.textContent='Informe a composição';status.classList.add('is-pending')}}
  function redistributePaymentPlan(items){if(!$('autoDistributePlan')?.checked||!items.length)return items;const expense=competenceItems().reduce((sum,item)=>sum+item.value,0),values=distributeCents(expense,items.length),firstDue=items[0]?.firstDueDate||today();return items.map((item,index)=>({...item,value:values[index],installmentCount:1,firstDueDate:addMonthsToDate(firstDue,index)}))}
  function addPaymentPlan(){let items=paymentPlanItems();const first=items[0]||{},due=first.firstDueDate||today();items.push({paymentMethodId:first.paymentMethodId||'',value:0,installmentCount:1,firstDueDate:addMonthsToDate(due,items.length)});items=redistributePaymentPlan(items);renderPaymentPlanRows(items);const target=$('paymentPlanRows').lastElementChild;target?.scrollIntoView({behavior:'smooth',block:'center'});requestAnimationFrame(()=>target?.querySelector('[data-plan-method]')?.focus())}
  function generatePaymentPlan(){const quantity=Math.min(120,Math.max(1,Number($('planInstallmentQuantity')?.value||1)));const existing=paymentPlanItems(),first=existing[0]||{};const firstDue=$('planFirstDueDate')?.value||first.firstDueDate||today();const method=$('planPaymentMethod')?.value||first.paymentMethodId||'';if(!method){alert('Selecione a forma de pagamento antes de gerar as parcelas.');$('planPaymentMethod')?.focus();return}let items=Array.from({length:quantity},(_,index)=>({paymentMethodId:method,value:0,installmentCount:1,firstDueDate:addMonthsToDate(firstDue,index)}));items=redistributePaymentPlan(items);renderPaymentPlanRows(items);$('paymentPlanRows')?.firstElementChild?.querySelector('[data-plan-value]')?.focus()}
  async function saveCreate(e){e.preventDefault();const b=$('savePayable');b.disabled=true;try{const competenceItemsPayload=competenceItems();if(!competenceItemsPayload.length)throw new Error('Informe ao menos uma competência.');if(competenceItemsPayload.some(item=>item.value<=0))throw new Error('Informe o valor de todas as competências.');const paymentPlan=paymentPlanItems();if(!paymentPlan.length)throw new Error('Informe ao menos uma forma no plano de pagamento.');if(paymentPlan.some(item=>!item.paymentMethodId||item.value<=0||item.installmentCount<1||!item.firstDueDate))throw new Error('Preencha forma, valor, parcelas e primeiro vencimento em toda a composição.');const grossValue=competenceItemsPayload.reduce((sum,item)=>sum+item.value,0),planTotal=paymentPlan.reduce((sum,item)=>sum+item.value,0);if(Math.abs(grossValue-planTotal)>.009)throw new Error(`A composição financeira deve fechar exatamente ${money(grossValue)}.`);const payload={supplierId:$('createSupplier').value,description:$('createDescription').value,documentNumber:$('createDocument').value,grossValue,unitValue:parseMoney($('createValue').value),issueDate:$('createIssueDate').value,competenceItems:competenceItemsPayload,competencies:competenceItemsPayload.map(item=>item.competence),competenceDate:`${competenceItemsPayload[0].competence}-01`,paymentPlan,accountId:$('createAccount').value,cashboxId:$('createCashbox')?.value||defaultCashboxId,notes:$('createNotes').value};const r=await fetch('/erp/financeiro/api/contas-a-pagar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),d=await r.json();if(!d.success)throw new Error(d.message);modal('payableCreateModal',false);await load();await openDetail(d.item.id)}catch(err){alert(err.message)}finally{b.disabled=false}}


  async function saveClassification(event){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type=submit]');
    button.disabled=true;button.textContent='Salvando…';
    try{const data=await postJson(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/classificacao`,{accountId:form.querySelector('[data-classification-account]').value});await load();await openDetail(data.item.id)}catch(error){alert(error.message)}finally{button.disabled=false;button.textContent='Salvar classificação'}
  }

  function editInstallmentMethod(installmentId){const box=$('payableDetail').querySelector(`[data-installment-method-box="${CSS.escape(installmentId)}"]`);if(!box)return;box.querySelector('.payable-installment-method-current').hidden=true;box.querySelector('.payable-installment-method-editor').hidden=false;box.querySelector('[data-installment-method-select]')?.focus()}
  function cancelInstallmentMethod(button){const box=button.closest('[data-installment-method-box]');if(!box)return;box.querySelector('.payable-installment-method-editor').hidden=true;box.querySelector('.payable-installment-method-current').hidden=false}
  async function saveInstallmentMethod(installmentId,button){const box=button.closest('[data-installment-method-box]'),select=box?.querySelector('[data-installment-method-select]');if(!select?.value){select?.focus();alert('Selecione uma forma de pagamento.');return}button.disabled=true;button.textContent='Salvando…';try{const r=await fetch(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/parcelas/${encodeURIComponent(installmentId)}/forma-pagamento`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentMethodId:select.value})}),d=await r.json();if(!d.success)throw new Error(d.message);await load();await openDetail(current.item.id)}catch(error){alert(error.message);button.disabled=false;button.textContent='Salvar'}}
  function paymentOptions(selected=''){return `<option value="">Selecione</option>${(boot.catalogs?.paymentMethods||[]).filter(x=>x.active!==false&&x.modules?.purchases!==false).map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('')}`}
  function paymentRow(method='',value=''){return `<div class="receivable-payment-row"><select class="payable-payment-method" required>${paymentOptions(method)}</select><input class="payable-payment-value" inputmode="decimal" value="${esc(value===''?'':decimal(value))}" placeholder="0,00" required><button type="button" class="btn btn-ghost" data-remove-payment aria-label="Remover">×</button></div>`}
  function paymentCalculation(){const max=Number($('payablePaymentForm').dataset.max||0),total=[...document.querySelectorAll('.payable-payment-value')].reduce((sum,input)=>sum+parseMoney(input.value),0),interest=parseMoney($('paymentInterest').value),fine=parseMoney($('paymentFine').value),discount=parseMoney($('paymentDiscount').value),principal=Math.round((total-interest-fine+discount)*100)/100,remaining=Math.max(0,Math.round((max-principal)*100)/100);$('paymentTotal').textContent=money(total);$('paymentPrincipal').textContent=money(Math.max(0,principal));$('paymentRemaining').textContent=money(remaining);const invalid=principal<=0||principal>max+.001||[...document.querySelectorAll('.payable-payment-method')].some(x=>!x.value);$('paymentDifferenceLabel').textContent=principal>max+.001?'Valor excedente':'Saldo após pagamento';$('confirmPayablePayment').disabled=invalid}
  function openPayment(id){const t=current.item,i=t.installments.find(x=>x.id===id);$('payablePaymentForm').reset();$('payablePaymentForm').dataset.id=t.id;$('payablePaymentForm').dataset.installment=id;$('payablePaymentForm').dataset.requestKey=crypto.randomUUID?.()||`p-${Date.now()}`;$('payablePaymentForm').dataset.max=String(Number(i.openBalance||0));$('paymentTitleLabel').textContent=`${t.number} · ${t.supplierName}`;$('paymentInstallmentLabel').textContent=`Parcela ${i.number}/${i.total} · ${date(i.dueDate)}`;$('paymentOpenBalance').textContent=money(i.openBalance);$('paymentDate').value=today();if($('paymentCashbox'))$('paymentCashbox').value=t.cashboxId||defaultCashboxId;$('paymentInterest').value='0,00';$('paymentFine').value='0,00';$('paymentDiscount').value='0,00';$('payablePaymentRows').innerHTML=paymentRow(i.paymentMethodId||t.paymentMethodId,i.openBalance);$('paymentSuccess').hidden=true;$('paymentFormContent').hidden=false;modal('payablePaymentModal',true);paymentCalculation()}
  function collectPayment(){return {installmentId:$('payablePaymentForm').dataset.installment,requestKey:$('payablePaymentForm').dataset.requestKey,paidAt:$('paymentDate').value,interest:parseMoney($('paymentInterest').value),fine:parseMoney($('paymentFine').value),discount:parseMoney($('paymentDiscount').value),cashboxId:$('paymentCashbox').value,notes:$('paymentNotes').value,payments:[...document.querySelectorAll('.receivable-payment-row')].map(row=>({paymentMethodId:row.querySelector('.payable-payment-method').value,value:parseMoney(row.querySelector('.payable-payment-value').value)})).filter(x=>x.value>0)}}
  async function savePayment(e){e.preventDefault();const f=e.currentTarget,b=$('confirmPayablePayment');b.disabled=true;b.textContent='Registrando…';try{const r=await fetch(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(f.dataset.id)}/pagar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(collectPayment())}),d=await r.json();if(!d.success)throw new Error(d.message);currentPayment=d.payment;$('paymentFormContent').hidden=true;$('paymentSuccess').hidden=false;$('paymentSuccessMessage').textContent=d.message;$('paymentSuccessValue').textContent=money(d.payment.value);await load();await openDetail(f.dataset.id);modal('payablePaymentModal',true)}catch(err){alert(err.message)}finally{b.textContent='Confirmar pagamento';paymentCalculation()}}

  function bulkRow(item){
    const t=item.title,i=item.installment,method=i.paymentMethodId||t.paymentMethodId||'',cashbox=t.cashboxId||defaultCashboxId;
    return `<article class="payable-bulk-row" data-bulk-payable="${esc(t.id)}" data-bulk-installment="${esc(i.id)}" data-bulk-value="${Number(i.openBalance||0)}">
      <div class="payable-bulk-ident"><strong>${esc(ref(t.number))} · ${esc(t.supplierName||'Sem fornecedor')}</strong><small>${esc(ref(t.description||referenceOf(t)))} · Parcela ${i.number}/${i.total} · vence ${date(i.dueDate)}</small></div>
      <div class="payable-bulk-value"><span>Valor</span><strong>${money(i.openBalance)}</strong></div>
      <label><span>Data</span><input type="date" data-bulk-date value="${today()}" required></label>
      <label><span>Forma</span><select data-bulk-method required>${paymentOptions(method)}</select></label>
      <label><span>Caixa</span><select data-bulk-cashbox required>${(boot.cashboxes||[]).map(box=>`<option value="${esc(box.id)}" ${box.id===cashbox?'selected':''}>${esc(box.name)}${box.isOpen?' · Aberto':' · Fechado'}</option>`).join('')}</select></label>
    </article>`;
  }
  function openBulkPayment(){
    const items=selectedItems();if(!items.length){alert('Selecione ao menos uma conta em aberto.');return}
    $('bulkPaymentRows').innerHTML=items.map(bulkRow).join('');
    $('bulkApplyDate').value=today();$('bulkApplyMethod').value='';$('bulkApplyCashbox').value='';$('bulkPaymentNotes').value='';
    $('bulkPaymentCount').textContent=String(items.length);$('bulkPaymentTotal').textContent=money(items.reduce((sum,item)=>sum+Number(item.installment.openBalance||0),0));
    $('bulkPaymentStatus').hidden=true;$('bulkPaymentStatus').textContent='';$('confirmBulkPayables').disabled=false;$('confirmBulkPayables').textContent='Confirmar pagamentos';
    modal('payableBulkPaymentModal',true);
  }
  function applyBulkDefaults(){
    const applyDate=$('bulkApplyDate').value,applyMethod=$('bulkApplyMethod').value,applyCashbox=$('bulkApplyCashbox').value;
    document.querySelectorAll('.payable-bulk-row').forEach(row=>{if(applyDate)row.querySelector('[data-bulk-date]').value=applyDate;if(applyMethod)row.querySelector('[data-bulk-method]').value=applyMethod;if(applyCashbox)row.querySelector('[data-bulk-cashbox]').value=applyCashbox});
  }
  function collectBulkPayment(){
    const notes=$('bulkPaymentNotes').value.trim(),batchKey=crypto.randomUUID?.()||`bulk-${Date.now()}`;
    return {items:[...document.querySelectorAll('.payable-bulk-row')].map((row,index)=>{
      const paymentMethodId=row.querySelector('[data-bulk-method]').value,paidAt=row.querySelector('[data-bulk-date]').value,cashboxId=row.querySelector('[data-bulk-cashbox]').value,value=Number(row.dataset.bulkValue||0);
      if(!paidAt)throw new Error(`Informe a data do pagamento na linha ${index+1}.`);if(!paymentMethodId)throw new Error(`Selecione a forma de pagamento na linha ${index+1}.`);if(!cashboxId)throw new Error(`Selecione o caixa na linha ${index+1}.`);
      return {payableId:row.dataset.bulkPayable,installmentId:row.dataset.bulkInstallment,requestKey:`${batchKey}-${index}`,paidAt,cashboxId,notes,payments:[{paymentMethodId,value}],interest:0,fine:0,discount:0};
    })};
  }
  async function saveBulkPayments(e){
    e.preventDefault();const button=$('confirmBulkPayables');button.disabled=true;button.textContent='Registrando…';
    try{
      const payload=collectBulkPayment(),response=await fetch('/erp/financeiro/api/contas-a-pagar/pagar-em-lote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();
      if(!response.ok&&!data.partial)throw new Error(data.message||'Não foi possível registrar os pagamentos.');
      const paidIds=new Set((data.results||[]).map(item=>item.payableId));paidIds.forEach(id=>selectedPayables.delete(id));
      await load();
      if(data.failures?.length){$('bulkPaymentStatus').hidden=false;$('bulkPaymentStatus').textContent=`${data.results?.length||0} pagamento(s) concluído(s). ${data.failures.length} não concluído(s): ${data.failures.map(item=>`${item.number||item.payableId}: ${item.message}`).join(' | ')}`;button.disabled=false;button.textContent='Tentar pendentes novamente';return}
      modal('payableBulkPaymentModal',false);clearBulkSelection();alert(`${data.results?.length||0} pagamento(s) registrado(s) com sucesso.`);
    }catch(error){alert(error.message);button.disabled=false;button.textContent='Confirmar pagamentos'}
  }

  function printReceipt(payment,detail=current){const t=detail?.item||{},supplier=detail?.supplier||{},methods=(payment.payments||[]).map(x=>`<tr><td>${esc(x.paymentMethodName||catalogName('paymentMethods',x.paymentMethodId))}</td><td>${money(x.value)}</td></tr>`).join('');const popup=window.open('','_blank','width=560,height=760');if(!popup){alert('Permita pop-ups para imprimir o comprovante.');return}popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Comprovante ${esc(payment.paymentNumber||'')}</title><style>body{font-family:Arial,sans-serif;color:#111;margin:24px}.receipt{max-width:440px;margin:auto;border:1px solid #bbb;padding:24px}h1{text-align:center;font-size:20px;margin:0}h2{text-align:center;font-size:14px;margin:6px 0 22px}.line{border-top:1px dashed #777;margin:14px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.grid span{display:block;font-size:11px;color:#555}.grid b{font-size:13px}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:7px 0;border-bottom:1px solid #ddd;font-size:13px}td:last-child{text-align:right;font-weight:bold}.total{font-size:18px;text-align:right;margin:16px 0}.foot{text-align:center;font-size:11px;margin-top:22px}@media print{body{margin:0}.receipt{border:0}}</style></head><body><div class="receipt"><h1>QUALITY CELULARES</h1><h2>COMPROVANTE DE PAGAMENTO</h2><div class="grid"><div><span>Comprovante</span><b>${esc(ref(payment.paymentNumber||payment.id||'—'))}</b></div><div><span>Data e hora</span><b>${dateTime(payment.createdAt||payment.paidAt)}</b></div><div><span>Fornecedor</span><b>${esc(supplier.name||t.supplierName||'—')}</b></div><div><span>CPF/CNPJ</span><b>${esc(supplier.document||t.supplierDocument||'—')}</b></div><div><span>Conta</span><b>${esc(ref(t.number||'—'))}</b></div><div><span>Documento</span><b>${esc(t.documentNumber||'—')}</b></div></div><div class="line"></div><b>Forma(s) de pagamento</b><table>${methods}</table>${Number(payment.interest||0)>0?`<p>Juros: <b>${money(payment.interest)}</b></p>`:''}${Number(payment.fine||0)>0?`<p>Multa: <b>${money(payment.fine)}</b></p>`:''}${Number(payment.discount||0)>0?`<p>Desconto: <b>${money(payment.discount)}</b></p>`:''}<div class="total">Pago: <b>${money(payment.value)}</b></div><p>Saldo restante da parcela: <b>${money(payment.balanceAfter)}</b></p>${payment.notes?`<p>Observação: ${esc(payment.notes)}</p>`:''}<div class="line"></div><p class="foot">Operador: ${esc(payment.createdBy||'painel')}</p></div><script>window.onload=()=>window.print()</script></body></html>`);popup.document.close()}


  function activeFilterSummary(){
    const parts=[];
    const add=(label,id,formatter)=>{const el=$(id);if(!el||!el.value)return;const value=formatter?formatter(el.value,el):el.options?.[el.selectedIndex]?.text||el.value;parts.push(`${label}: ${value}`)};
    add('Busca','payableSearch',v=>v);add('Situação','payableStatus');add('Origem','payableType');add('Vencimento inicial','payableDueFrom',date);add('Vencimento final','payableDueTo',date);
    [['supplierId','Fornecedor'],['paymentMethodId','Forma de pagamento'],['accountId','Classificação financeira']].forEach(([name,label])=>{const values=[...document.querySelectorAll(`[data-payable-multi-filter] input[name="${name}"]:checked`)].map(input=>input.closest('label')?.querySelector('span')?.textContent?.trim()).filter(Boolean);if(values.length)parts.push(`${label}: ${values.join(', ')}`)});
    if(duePreset){const label=document.querySelector(`[data-due-preset="${duePreset}"]`)?.textContent?.trim();if(label)parts.push(`Período rápido: ${label}`)}
    return parts.length?parts.join(' · '):'Todos os registros';
  }
  function exportRows(){return sortTitles(titles).map(t=>{const installment=nextOpen(t);return {number:ref(t.number||'—'),supplier:t.supplierName||'—',description:t.description||'',reference:referenceOf(t),due:date(installment?.dueDate),value:money(nextOpenValue(t)),paid:money(t.paidValue),balance:money(t.openBalance),status:labels[t.status]||t.status||'—',method:catalogName('paymentMethods',installment?.paymentMethodId||t.paymentMethodId),costCenter:catalogName('costCenters',t.costCenterId),account:catalogName('accounts',t.accountId)}})}
  function exportReportHtml(){
    const rows=exportRows(),total=rows.length,active=titles.filter(item=>!isReversedStatus(item.status)),reversed=titles.filter(item=>isReversedStatus(item.status)),totalOriginal=active.reduce((sum,item)=>sum+Number(item.netValue||0),0),totalPaid=active.reduce((sum,item)=>sum+Number(item.paidValue||0),0),totalBalance=active.reduce((sum,item)=>sum+Number(item.openBalance||0),0),reversedValue=reversed.reduce((sum,item)=>sum+Number(item.netValue||0),0);
    return `<section class="report"><header><div><h1>Quality Celulares</h1><h2>Relatório de Contas a Pagar</h2><small>Quality ERP v0.18.8</small></div><div class="meta"><b>${total} conta(s)</b><span>Emitido em ${dateTime(new Date().toISOString())}</span><span>Operador: painel</span></div></header><p class="filters"><b>Filtros:</b> ${esc(activeFilterSummary())}</p><table><thead><tr><th>Nº</th><th>Fornecedor / descrição</th><th>Documento</th><th>Vencimento</th><th>Forma</th><th>Situação</th><th class="num">Valor</th><th class="num">Pago</th><th class="num">Saldo</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.status==='Estornada'?'is-reversed':''}"><td>${esc(r.number)}</td><td><b>${esc(r.supplier)}</b><small>${esc(r.description)}</small></td><td>${esc(r.document)}</td><td>${esc(r.due)}</td><td>${esc(r.method)}</td><td>${esc(r.status)}</td><td class="num">${esc(r.value)}</td><td class="num">${esc(r.paid)}</td><td class="num"><b>${r.status==='Estornada'?'—':esc(r.balance)}</b></td></tr>`).join('')||'<tr><td colspan="9">Nenhum registro encontrado.</td></tr>'}</tbody><tfoot><tr><td colspan="6">Totais ativos dos resultados filtrados</td><td class="num">${money(totalOriginal)}</td><td class="num">${money(totalPaid)}</td><td class="num">${money(totalBalance)}</td></tr><tr class="reversed-total"><td colspan="8">Contas estornadas (${reversed.length})</td><td class="num">${money(reversedValue)}</td></tr></tfoot></table><footer>Relatório gerado pelo Quality ERP · Contas estornadas são apresentadas apenas para conferência e não compõem os totais financeiros ativos.</footer></section>`;
  }
  function exportStyles(){return `*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font:11px Arial,sans-serif}.report{padding:22px}.report>header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #b40000;padding-bottom:12px;margin-bottom:12px}h1{margin:0;color:#b40000;font-size:22px}h2{margin:4px 0 0;font-size:15px}.meta{text-align:right;display:flex;flex-direction:column;gap:4px}.filters{padding:9px;background:#f1f1f1;border-radius:6px;margin:0 0 12px}table{width:100%;border-collapse:collapse;table-layout:auto}thead{display:table-header-group}th{background:#171717;color:#fff;text-align:left;padding:7px 6px;font-size:9px}td{padding:7px 6px;border-bottom:1px solid #ddd;vertical-align:top}td small{display:block;color:#555;margin-top:2px}.num{text-align:right;white-space:nowrap}tr.is-reversed td{color:#8b1d1d;background:#fff3f3;text-decoration:none}tfoot td{font-weight:bold;background:#eee;border-top:2px solid #777}.reversed-total td{background:#fff0f0;color:#8b1d1d}footer{text-align:center;color:#666;margin-top:16px;font-size:9px}@page{size:A4 landscape;margin:10mm}@media print{.report{padding:0}tr{break-inside:avoid}}`}
  function closeExportMenu(){document.querySelector('.payable-export-menu')?.removeAttribute('open')}
  function exportPdf(){
    const popup=window.open('','_blank','width=1200,height=800');if(!popup){alert('Permita pop-ups para gerar o PDF.');return}popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contas a Pagar</title><style>${exportStyles()}</style></head><body>${exportReportHtml()}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);popup.document.close();closeExportMenu();
  }
  async function exportImage(){
    const width=1600,rowHeight=44,height=Math.max(700,260+exportRows().length*rowHeight),html=`<div xmlns="http://www.w3.org/1999/xhtml"><style>${exportStyles()}body{width:${width}px}.report{width:${width}px}</style>${exportReportHtml()}</div>`,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`,blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);canvas.toBlob(file=>{if(!file){alert('Não foi possível gerar a imagem.');return}const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=`contas-a-pagar-${today()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)},'image/png')};img.onerror=()=>{URL.revokeObjectURL(url);alert('Não foi possível gerar a imagem deste relatório. Use a exportação em PDF.')};img.src=url;closeExportMenu();
  }

  async function reversePayment(paymentId){const payment=(current?.payments||[]).find(item=>item.id===paymentId);if(!payment)return;const reason=prompt(`Motivo do estorno do pagamento ${payment.paymentNumber||''}:`,'Lançamento incorreto');if(reason===null)return;if(!confirm(`Estornar o pagamento de ${money(payment.value)}?\n\nO Caixa, Fluxo, DRE e DFC serão revertidos e a parcela voltará para aberto/parcial.`))return;try{const r=await fetch(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(current.item.id)}/pagamentos/${encodeURIComponent(paymentId)}/estornar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})}),d=await r.json();if(!d.success)throw new Error(d.message);await load();await openDetail(current.item.id)}catch(error){alert(error.message)}}

  function cancelTitle(){if(current?.item?.entryType==='purchase'||String(current?.item?.origin||'').toLowerCase().includes('compra')){alert('Esta conta foi gerada por uma compra. Para remover todo o financeiro, estorne a compra completa no módulo Compras.');return}$('payableReverseForm').reset();modal('payableReverseModal',true);requestAnimationFrame(()=>$('reverseReason')?.focus())}
  async function reverseTitle(e){e.preventDefault();const id=current.item.id,b=$('confirmPayableReverse');b.disabled=true;b.textContent='Estornando…';try{const r=await fetch(`/erp/financeiro/api/contas-a-pagar/${encodeURIComponent(id)}/estornar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:$('reverseReason').value,reversePayments:Number(current?.item?.paidValue||0)>0})}),d=await r.json();if(!d.success)throw new Error(d.message);modal('payableReverseModal',false);await load();await openDetail(id)}catch(err){alert(err.message)}finally{b.disabled=false;b.textContent='Estornar conta'}}

  $('selectAllPayables')?.addEventListener('change',event=>{titles.filter(selectablePayable).forEach(item=>{if(event.target.checked)selectedPayables.add(item.id);else selectedPayables.delete(item.id)});render()});
  $('paySelectedPayables')?.addEventListener('click',openBulkPayment);$('applyBulkPaymentDefaults')?.addEventListener('click',applyBulkDefaults);$('payableBulkPaymentForm')?.addEventListener('submit',saveBulkPayments);document.querySelectorAll('[data-close-bulk-payment]').forEach(x=>x.onclick=()=>modal('payableBulkPaymentModal',false));
  $('exportPayablesPdf')?.addEventListener('click',exportPdf);$('exportPayablesImage')?.addEventListener('click',exportImage);
  // Tooltips do Contas a Pagar em camada global, fora do overflow dos modais.
  const payableFloatingTip=document.createElement('div');
  payableFloatingTip.className='payable-floating-tooltip';
  document.body.appendChild(payableFloatingTip);
  const hidePayableTip=()=>{payableFloatingTip.hidden=true;};
  const showPayableTip=tip=>{const text=tip?.dataset?.tooltip;if(!text)return;payableFloatingTip.textContent=text;payableFloatingTip.hidden=false;const rect=tip.getBoundingClientRect();requestAnimationFrame(()=>{const box=payableFloatingTip.getBoundingClientRect();let left=rect.left+rect.width/2-box.width/2;left=Math.max(12,Math.min(left,window.innerWidth-box.width-12));let top=rect.top-box.height-10;if(top<12)top=Math.min(window.innerHeight-box.height-12,rect.bottom+10);payableFloatingTip.style.left=`${left}px`;payableFloatingTip.style.top=`${top}px`;});};
  document.addEventListener('mouseover',e=>{const tip=e.target.closest?.('.payable-info-tip');if(tip)showPayableTip(tip)});
  document.addEventListener('mouseout',e=>{if(e.target.closest?.('.payable-info-tip'))hidePayableTip()});
  document.addEventListener('focusin',e=>{const tip=e.target.closest?.('.payable-info-tip');if(tip)showPayableTip(tip)});
  document.addEventListener('focusout',e=>{if(e.target.closest?.('.payable-info-tip'))hidePayableTip()});
  document.addEventListener('scroll',hidePayableTip,true);window.addEventListener('resize',hidePayableTip);

  $('newPayable').onclick=openCreate;$('createSupplier')?.addEventListener('change',scheduleClassificationSuggestion);$('createDescription')?.addEventListener('input',scheduleClassificationSuggestion);$('createAccount')?.addEventListener('change',()=>{if(!applyingClassificationSuggestion){classificationManuallyChanged=Boolean($('createAccount').value);if(classificationManuallyChanged&&$('createAccountHint')){$('createAccountHint').textContent='Plano selecionado manualmente. O Centro de custo será vinculado automaticamente.';$('createAccountHint').hidden=false;}}});$('addCompetence').onclick=addCompetence;$('addCompetenceBottom')?.addEventListener('click',addCompetence);$('addPaymentPlan').onclick=addPaymentPlan;$('generatePaymentPlan')?.addEventListener('click',generatePaymentPlan);$('autoDistributePlan')?.addEventListener('change',()=>renderPaymentPlanRows(redistributePaymentPlan(paymentPlanItems())));$('payableCreateForm').onsubmit=saveCreate;$('payablePaymentForm').onsubmit=savePayment;$('payableReverseForm').onsubmit=reverseTitle;$('payableDrawerBackdrop').onclick=closeDrawer;$('createValue').addEventListener('input',()=>{const value=parseMoney($('createValue').value);document.querySelectorAll('[data-competence-value]').forEach(input=>input.value=decimal(value));updateCreateTotal();if($('autoDistributePlan')?.checked)renderPaymentPlanRows(redistributePaymentPlan(paymentPlanItems()))});
  document.querySelectorAll('[data-close-create]').forEach(x=>x.onclick=()=>modal('payableCreateModal',false));document.querySelectorAll('[data-close-payment]').forEach(x=>x.onclick=()=>modal('payablePaymentModal',false));document.querySelectorAll('[data-close-reverse]').forEach(x=>x.onclick=()=>modal('payableReverseModal',false));
  $('paymentPlanRows').addEventListener('input',updatePaymentPlanSummary);$('paymentPlanRows').addEventListener('change',event=>{if($('autoDistributePlan')?.checked&&event.target.matches('[data-plan-due]')&&event.target.closest('.payable-plan-row')===$('paymentPlanRows').firstElementChild)renderPaymentPlanRows(redistributePaymentPlan(paymentPlanItems()));else updatePaymentPlanSummary()});$('paymentPlanRows').addEventListener('click',event=>{const button=event.target.closest('[data-remove-plan]');if(!button)return;const rows=document.querySelectorAll('.payable-plan-row');if(rows.length===1)return;button.closest('.payable-plan-row').remove();renderPaymentPlanRows(redistributePaymentPlan(paymentPlanItems()))});
  $('addPayablePayment').onclick=()=>{$('payablePaymentRows').insertAdjacentHTML('beforeend',paymentRow());paymentCalculation()};$('payablePaymentRows').onclick=e=>{const b=e.target.closest('[data-remove-payment]');if(!b)return;if(document.querySelectorAll('.receivable-payment-row').length===1)return;b.closest('.receivable-payment-row').remove();paymentCalculation()};$('payablePaymentForm').addEventListener('input',paymentCalculation);$('payablePaymentForm').addEventListener('change',paymentCalculation);$('printPayableReceipt').onclick=()=>currentPayment&&printReceipt(currentPayment);$('finishPayablePayment').onclick=()=>modal('payablePaymentModal',false);
  $('togglePayableFilters').onclick=()=>{$('payableAdvancedFilters').hidden=!$('payableAdvancedFilters').hidden};$('clearPayableFilters').onclick=()=>{document.querySelectorAll('#payablesApp input:not([type="checkbox"]),#payablesApp select').forEach(x=>x.value='');document.querySelectorAll('[data-payable-multi-filter] input[type="checkbox"]').forEach(x=>x.checked=false);document.querySelectorAll('[data-payable-multi-filter]').forEach(refreshPayableMulti);$('payableSort').value='dueAsc';duePreset='';document.querySelectorAll('[data-due-preset]').forEach(x=>x.classList.toggle('active',x.dataset.duePreset===''));load().catch(e=>alert(e.message))};
  document.querySelectorAll('[data-due-preset]').forEach(b=>b.onclick=()=>{duePreset=b.dataset.duePreset;document.querySelectorAll('[data-due-preset]').forEach(x=>x.classList.toggle('active',x===b));load({allRecords:duePreset===''}).catch(e=>alert(e.message))});
  document.querySelectorAll('[data-summary-filter]').forEach(card=>card.onclick=()=>{const type=card.dataset.summaryFilter;$('clearPayableFilters').click();if(type==='total-period'){setPayableView('all',{reload:false});duePreset='month';}if(type==='open'){setPayableView('active',{reload:false});$('payableStatus').value='open';}if(type==='today'){setPayableView('active',{reload:false});duePreset='today';}if(type==='overdue'){setPayableView('active',{reload:false});duePreset='overdue';}if(type==='paid-month'){setPayableView('paid',{reload:false});$('payableStatus').value='paid';duePreset='month';}if(['this-week','next-week','next-30'].includes(type)){const start=new Date(`${today()}T12:00:00`);let from=new Date(start),to=new Date(start);if(type==='this-week')to.setDate(to.getDate()+7);if(type==='next-week'){from.setDate(from.getDate()+8);to=new Date(start);to.setDate(to.getDate()+14)}if(type==='next-30'){to.setDate(to.getDate()+30)}const iso=value=>value.toISOString().slice(0,10);$('payableDueFrom').value=iso(from);$('payableDueTo').value=iso(to);duePreset='';$('payableAdvancedFilters').hidden=false;}document.querySelectorAll('[data-due-preset]').forEach(x=>x.classList.toggle('active',x.dataset.duePreset===duePreset));load().catch(e=>alert(e.message))});
  document.querySelectorAll('[data-payable-view]').forEach(button=>button.addEventListener('click',()=>setPayableView(button.dataset.payableView)));
  $('payableStatus')?.addEventListener('change',()=>{const status=$('payableStatus').value;if(status==='reversed')setPayableView('reversed',{reload:false});else if(status==='paid')setPayableView('paid',{reload:false});else if(['paid','reversed'].includes(payableView))setPayableView('active',{reload:false});updateDateFilterLabels();clearTimeout(window.__payableTimer);window.__payableTimer=setTimeout(()=>load().catch(e=>alert(e.message)),100)});
  ['payableSearch','payableType','payableDueFrom','payableDueTo'].forEach(id=>$(id)?.addEventListener(id==='payableSearch'?'input':'change',()=>{clearTimeout(window.__payableTimer);window.__payableTimer=setTimeout(()=>load().catch(e=>alert(e.message)),250)}));$('payableSort')?.addEventListener('change',render);
  document.addEventListener('keydown',event=>{if(event.key==='F2'){event.preventDefault();if($('payableCreateModal').hidden)openCreate()}if(event.ctrlKey&&event.key==='Enter'&&!$('payableCreateModal').hidden){event.preventDefault();$('payableCreateForm').requestSubmit()}if(event.key==='Escape'){if(!$('payableBulkPaymentModal').hidden)modal('payableBulkPaymentModal',false);else if(!$('payableReverseModal').hidden)modal('payableReverseModal',false);else if(!$('payablePaymentModal').hidden)modal('payablePaymentModal',false);else if(!$('payableCreateModal').hidden)modal('payableCreateModal',false);else closeDrawer()}});
  // Respeita filtros vindos de links da Dashboard antes da primeira carga.
  if(initialParams.get('status')&&$('payableStatus')) $('payableStatus').value=initialParams.get('status');
  if(initialParams.get('dueFrom')&&$('payableDueFrom')) $('payableDueFrom').value=initialParams.get('dueFrom');
  if(initialParams.get('dueTo')&&$('payableDueTo')) $('payableDueTo').value=initialParams.get('dueTo');
  if(payableView==='paid'&&$('payableStatus')) $('payableStatus').value='paid';
  if(payableView==='reversed'&&$('payableStatus')) $('payableStatus').value='reversed';
  updateViewTabs();
  updateDateFilterLabels();
  window.addEventListener('storage',event=>{if(event.key==='quality:finance-catalogs-updated')refreshClassificationCatalogs(true).catch(()=>{})});
  window.addEventListener('focus',()=>refreshClassificationCatalogs().catch(()=>{}));
  initPayableMultiFilters();
  searchableSelect($('createAccount'),{placeholder:'Pesquisar plano de contas'});
  window.QualityQuickDatePicker?.init({wrapper:'.payables-period-filter',from:'#payableDueFrom',to:'#payableDueTo',mode:'financial'});document.querySelectorAll('[data-due-preset]').forEach(x=>x.classList.toggle('active',x.dataset.duePreset===duePreset));renderCompetenceRows([{competence:currentMonth(),value:0}]);renderPaymentPlanRows([{paymentMethodId:'',value:0,installmentCount:1,firstDueDate:today()}]);bindRows();render();load().catch(e=>alert(e.message));
})();
