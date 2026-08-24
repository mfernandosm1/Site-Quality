(()=>{
  const form=document.querySelector('.cashflow-filters'); if(!form)return;
  const start=form.querySelector('[name=start]'),end=form.querySelector('[name=end]');
  const iso=d=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
  const setRange=(key)=>{const now=new Date(),a=new Date(now),b=new Date(now);a.setHours(12,0,0,0);b.setHours(12,0,0,0);
    if(key==='yesterday'){a.setDate(a.getDate()-1);b.setDate(b.getDate()-1)}
    else if(key==='this-week'){const n=(a.getDay()+6)%7;a.setDate(a.getDate()-n);b.setDate(a.getDate()+6)}
    else if(key==='this-month'){a.setDate(1);b.setMonth(b.getMonth()+1,0)}
    else if(key==='year'){a.setMonth(0,1);b.setMonth(11,31)}
    else if(['30','60','90'].includes(key)){a.setDate(a.getDate()-Number(key)+1)}
    start.value=iso(a);end.value=iso(b);form.submit();
  };
  document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>setRange(b.dataset.range)));

  document.querySelectorAll('[data-multi-filter]').forEach(box=>{
    const summary=box.querySelector('[data-multi-summary]');
    const checks=[...box.querySelectorAll('input[type=checkbox]')];
    const refresh=()=>{const selected=checks.filter(x=>x.checked);if(summary)summary.textContent=!selected.length?'Todas':selected.length===1?(selected[0].closest('label')?.innerText?.trim()||'1 selecionada'):`${selected.length} selecionadas`;};
    checks.forEach(x=>x.addEventListener('change',refresh));
    box.querySelector('[data-clear-multi]')?.addEventListener('click',()=>{checks.forEach(x=>x.checked=false);refresh();});
    refresh();
  });

  const originLabels=window.__cashFlowOriginLabels||{};
  const originLabel=v=>originLabels[String(v||'').toLowerCase()]||String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const drawer=document.querySelector('.cashflow-drawer'),backdrop=document.querySelector('.cashflow-drawer-backdrop'),content=document.getElementById('cashflowDrawerContent');
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const close=()=>{drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');backdrop.hidden=true};
  document.querySelectorAll('.cashflow-row').forEach(row=>row.addEventListener('click',()=>{const x=JSON.parse(row.dataset.item);const source=x.source;let href='';if(source==='payable')href=`/erp/financeiro/contas-a-pagar?titulo=${encodeURIComponent(x.originId)}`;else if(source==='receivable')href=`/erp/financeiro/contas-a-receber?titulo=${encodeURIComponent(x.originId)}`;else if(['sale','service_order'].includes(x.origin))href=`/erp/centro-operacoes?operacao=${encodeURIComponent(x.originId)}`;else if(x.originId)href='/erp/financeiro';content.innerHTML=`<span class="cashflow-drawer-kicker">${x.status==='realizado'?'Movimentação realizada':'Movimentação prevista'}</span><h2>${esc(x.reference)}</h2><dl><div><dt>Origem</dt><dd>${esc(originLabel(x.origin))}</dd></div><div><dt>Cliente/fornecedor</dt><dd>${esc(x.party)}${x.partyDocument?`<small class="cashflow-party-document">${esc(x.partyDocument)}</small>`:''}</dd></div><div><dt>Data e hora</dt><dd>${esc(new Date(x.dateTime).toLocaleString('pt-BR'))}</dd></div><div><dt>Tipo</dt><dd>${x.direction==='entrada'?'Entrada':'Saída'}</dd></div><div><dt>Valor</dt><dd>${money(x.value)}</dd></div><div><dt>Forma de pagamento</dt><dd>${esc(x.paymentMethodName||x.paymentMethodId)}</dd></div><div><dt>Parcelas</dt><dd>${esc(x.raw?.number?`${x.raw.number}/${x.raw.total||1}`:'—')}</dd></div><div><dt>Observações</dt><dd>${esc(x.notes)}</dd></div></dl>${href?`<a class="btn primary" href="${href}">Abrir origem</a>`:''}`;drawer.classList.add('is-open');drawer.setAttribute('aria-hidden','false');backdrop.hidden=false;}));
  document.querySelector('.cashflow-drawer-close')?.addEventListener('click',close);backdrop?.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});

  const date=v=>{if(!v)return '—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v};
  const selectedText=name=>{const el=form.querySelector(`[name="${name}"]`);return el?.options?.[el.selectedIndex]?.text?.trim()||''};
  const checkedLabels=name=>[...form.querySelectorAll(`input[type=checkbox][name="${name}"]:checked`)].map(el=>el.closest('label')?.innerText?.trim()||el.value);
  const activeFilterSummary=()=>{
    const parts=[`Período: ${date(start.value)} a ${date(end.value)}`,`Situação: ${selectedText('mode')}`];
    [['paymentMethodId','Forma de pagamento'],['origin','Origem'],['classification','Classificação financeira']].forEach(([name,label])=>{const labels=checkedLabels(name);if(labels.length)parts.push(`${label}: ${labels.join(', ')}`)});
    if(form.querySelector('[name="includeCashAdjustments"]')?.checked)parts.push('Inclui suprimentos e sangrias');
    return parts.join(' · ');
  };
  const exportData=()=>({
    cards:[...document.querySelectorAll('.cashflow-cards article')].map(card=>({label:card.querySelector('span')?.textContent?.trim()||'',value:card.querySelector('b')?.textContent?.trim()||''})),
    days:[...document.querySelectorAll('.cashflow-day')].map(day=>({
      date:day.querySelector('header strong')?.textContent?.trim()||'',
      totals:[...day.querySelectorAll('.cashflow-day-totals span')].map(x=>x.textContent.trim()),
      rows:[...day.querySelectorAll('.cashflow-row')].map(row=>{const x=JSON.parse(row.dataset.item);return {reference:x.reference||'—',meta:`${new Date(x.dateTime).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${originLabel(x.origin)}${x.party?` · ${x.party}`:''}`,status:x.status==='realizado'?'Realizado':'Previsto',direction:x.direction==='entrada'?'Entrada':'Saída',value:`${x.direction==='saida'?'- ':'+ '}${money(x.value)}`,balance:`Saldo ${money(x.runningBalance)}`}})
    }))
  });
  const exportStyles=()=>`*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font:12px Arial,sans-serif}.report{padding:24px}.report>header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #b40000;padding-bottom:12px;margin-bottom:14px}.brand h1{margin:0;color:#b40000;font-size:23px}.brand h2{margin:4px 0 0;font-size:16px}.meta{text-align:right;display:flex;flex-direction:column;gap:4px}.filters{padding:10px 12px;background:#f2f3f5;border-radius:7px;margin:0 0 14px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.card{border:1px solid #d7dbe2;border-radius:9px;padding:10px}.card span{display:block;color:#555;font-size:10px;margin-bottom:5px}.card b{font-size:15px}.day{border:1px solid #d7dbe2;border-radius:9px;overflow:hidden;margin-bottom:10px;break-inside:avoid}.day>header{padding:9px 11px;background:#f7f7f8;display:flex;justify-content:space-between;gap:12px}.day>header div:last-child{font-size:10px;color:#555;text-align:right}.row{display:grid;grid-template-columns:minmax(220px,1fr) 80px 90px 110px 105px;gap:8px;align-items:center;padding:8px 11px;border-top:1px solid #e5e7eb}.row small{display:block;color:#666;margin-top:2px}.row .num{text-align:right}.entrada{color:#087a49}.saida{color:#bd2632}.empty{padding:28px;text-align:center;border:1px dashed #bbb;border-radius:9px;color:#666}footer{margin-top:16px;border-top:1px solid #ddd;padding-top:8px;color:#666;font-size:10px}@media print{.day{break-inside:avoid}.report{padding:12px}}`;
  const exportReportHtml=()=>{const data=exportData(),count=data.days.reduce((s,d)=>s+d.rows.length,0);return `<section class="report"><header><div class="brand"><h1>Quality Celulares</h1><h2>Fluxo de Caixa</h2><small>Quality ERP</small></div><div class="meta"><b>${count} movimentação(ões)</b><span>Emitido em ${new Date().toLocaleString('pt-BR')}</span></div></header><p class="filters"><b>Filtros:</b> ${esc(activeFilterSummary())}</p><div class="cards">${data.cards.map(c=>`<div class="card"><span>${esc(c.label)}</span><b>${esc(c.value)}</b></div>`).join('')}</div>${data.days.length?data.days.map(d=>`<section class="day"><header><b>${esc(d.date)}</b><div>${d.totals.map(esc).join(' · ')}</div></header>${d.rows.map(r=>`<div class="row"><div><b>${esc(r.reference)}</b><small>${esc(r.meta)}</small></div><span>${esc(r.status)}</span><span>${esc(r.direction)}</span><b class="num ${r.direction==='Entrada'?'entrada':'saida'}">${esc(r.value)}</b><span class="num">${esc(r.balance)}</span></div>`).join('')}</section>`).join(''):'<div class="empty">Nenhuma movimentação encontrada no período.</div>'}<footer>Relatório gerado pelo Quality ERP com base nos filtros aplicados na tela.</footer></section>`};
  const closeExportMenu=()=>{const menu=document.querySelector('.cashflow-export-menu');if(menu)menu.open=false};
  const exportPdf=()=>{const popup=window.open('','_blank','width=1200,height=800');if(!popup){alert('Permita pop-ups para gerar o PDF.');return}popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fluxo de Caixa</title><style>${exportStyles()}</style></head><body>${exportReportHtml()}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);popup.document.close();closeExportMenu()};
  const exportImage=()=>{const width=1400,html=`<div xmlns="http://www.w3.org/1999/xhtml"><style>${exportStyles()}</style>${exportReportHtml()}</div>`,probe=document.createElement('div');probe.style.cssText=`position:fixed;left:-10000px;top:0;width:${width}px;background:#fff;`;probe.innerHTML=`<style>${exportStyles()}</style>${exportReportHtml()}`;document.body.appendChild(probe);const height=Math.max(800,Math.ceil(probe.scrollHeight+10));probe.remove();if(height>16000&&!confirm('O relatório ficou muito longo e a imagem será grande. Deseja continuar?'))return;const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`,blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);canvas.toBlob(file=>{if(!file){alert('Não foi possível gerar a imagem.');return}const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=`fluxo-de-caixa-${iso(new Date())}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)},'image/png')};img.onerror=()=>{URL.revokeObjectURL(url);alert('Não foi possível gerar a imagem deste relatório. Use a exportação em PDF.')};img.src=url;closeExportMenu()};
  document.getElementById('exportCashFlowPdf')?.addEventListener('click',exportPdf);
  document.getElementById('exportCashFlowImage')?.addEventListener('click',exportImage);
})();
