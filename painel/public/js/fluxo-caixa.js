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
  const brand=()=>window.QualityExportBrand||null;
  const exportStyles=()=>`${brand()?.css?.()||''}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font:12px Arial,sans-serif}.report{padding:24px}.report>header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #b40000;padding-bottom:12px;margin-bottom:14px}.meta{text-align:right;display:flex;flex-direction:column;gap:4px}.filters{padding:10px 12px;background:#f2f3f5;border-radius:7px;margin:0 0 14px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.card{border:1px solid #d7dbe2;border-radius:9px;padding:10px}.card span{display:block;color:#555;font-size:10px;margin-bottom:5px}.card b{font-size:15px}.day{border:1px solid #d7dbe2;border-radius:9px;overflow:hidden;margin-bottom:10px;break-inside:avoid}.day>header{padding:9px 11px;background:#f7f7f8;display:flex;justify-content:space-between;gap:12px}.day>header div:last-child{font-size:10px;color:#555;text-align:right}.row{display:grid;grid-template-columns:minmax(220px,1fr) 80px 90px 110px 105px;gap:8px;align-items:center;padding:8px 11px;border-top:1px solid #e5e7eb}.row small{display:block;color:#666;margin-top:2px}.row .num{text-align:right}.entrada{color:#087a49}.saida{color:#bd2632}.empty{padding:28px;text-align:center;border:1px dashed #bbb;border-radius:9px;color:#666}footer{margin-top:16px;border-top:1px solid #ddd;padding-top:8px;color:#666;font-size:10px}@media print{.day{break-inside:avoid}.report{padding:12px}}`;
  const exportReportHtml=(logoSrc='')=>{const data=exportData(),count=data.days.reduce((sum,day)=>sum+day.rows.length,0),header=brand()?.headerHtml?.({title:'Fluxo de Caixa',logoSrc})||'<div><b>Quality ERP</b><br>Fluxo de Caixa</div>';return `<section class="report"><header>${header}<div class="meta"><b>${count} movimentação(ões)</b><span>Emitido em ${new Date().toLocaleString('pt-BR')}</span></div></header><p class="filters"><b>Filtros:</b> ${esc(activeFilterSummary())}</p><div class="cards">${data.cards.map(c=>`<div class="card"><span>${esc(c.label)}</span><b>${esc(c.value)}</b></div>`).join('')}</div>${data.days.length?data.days.map(d=>`<section class="day"><header><b>${esc(d.date)}</b><div>${d.totals.map(esc).join(' · ')}</div></header>${d.rows.map(r=>`<div class="row"><div><b>${esc(r.reference)}</b><small>${esc(r.meta)}</small></div><span>${esc(r.status)}</span><span>${esc(r.direction)}</span><b class="num ${r.direction==='Entrada'?'entrada':'saida'}">${esc(r.value)}</b><span class="num">${esc(r.balance)}</span></div>`).join('')}</section>`).join(''):'<div class="empty">Nenhuma movimentação encontrada no período.</div>'}<footer>Relatório gerado pelo Quality ERP com base nos filtros aplicados na tela.</footer></section>`};
  const closeExportMenu=()=>{const menu=document.querySelector('.cashflow-export-menu');if(menu)menu.open=false};
  const exportPdf=()=>{const popup=window.open('','_blank','width=1200,height=800');if(!popup){alert('Permita pop-ups para gerar o PDF.');return}popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Fluxo de Caixa</title><style>${exportStyles()}</style></head><body>${exportReportHtml()}<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script></body></html>`);popup.document.close();closeExportMenu()};

  const fitText=(ctx,text,maxWidth)=>{
    const raw=String(text||'—'); if(ctx.measureText(raw).width<=maxWidth) return raw;
    let value=raw; while(value.length>4 && ctx.measureText(value+'…').width>maxWidth) value=value.slice(0,-1);
    return value+'…';
  };
  const exportImage=async()=>{
    closeExportMenu();
    const data=exportData();
    const width=1600,pad=54,rowH=46,dayHeadH=40,cardH=72;
    const rowCount=data.days.reduce((sum,day)=>sum+day.rows.length,0),cardRows=Math.ceil(Math.max(1,data.cards.length)/3);
    const height=Math.max(760,285+(cardH+12)*cardRows+data.days.length*(dayHeadH+18)+rowCount*rowH);
    if(height>30000&&!confirm('O relatório ficou muito longo e a imagem será grande. Deseja continuar?')) return;
    const canvas=document.createElement('canvas'); canvas.width=width; canvas.height=height;
    const ctx=canvas.getContext('2d'); if(!ctx){alert('Não foi possível iniciar a exportação em imagem.');return;}
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.textBaseline='middle';
    let y=42;
    const logo=await brand()?.loadLogoImage?.();
    if(logo){const maxW=150,maxH=66,scale=Math.min(maxW/logo.width,maxH/logo.height,1);ctx.drawImage(logo,pad,y,logo.width*scale,logo.height*scale);}
    ctx.fillStyle='#111';ctx.font='700 28px Arial';ctx.fillText(brand()?.companyName?.()||'Quality ERP',logo?pad+175:pad,y+14);
    ctx.font='700 21px Arial';ctx.fillText('Fluxo de Caixa',logo?pad+175:pad,y+44);
    const count=data.days.reduce((sum,day)=>sum+day.rows.length,0);ctx.textAlign='right';ctx.font='700 16px Arial';ctx.fillText(`${count} movimentação(ões)`,width-pad,y+16);ctx.font='14px Arial';ctx.fillStyle='#555';ctx.fillText(`Emitido em ${new Date().toLocaleString('pt-BR')}`,width-pad,y+44);ctx.textAlign='left';
    y+=92;ctx.strokeStyle='#b40000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(width-pad,y);ctx.stroke();y+=25;
    ctx.fillStyle='#f2f3f5';ctx.fillRect(pad,y,width-pad*2,44);ctx.fillStyle='#333';ctx.font='13px Arial';ctx.fillText(fitText(ctx,'Filtros: '+activeFilterSummary(),width-pad*2-24),pad+12,y+22);y+=60;
    const gap=12,colW=(width-pad*2-gap*2)/3;
    data.cards.forEach((card,index)=>{const col=index%3,row=Math.floor(index/3),x=pad+col*(colW+gap),cy=y+row*(cardH+gap);ctx.strokeStyle='#d7dbe2';ctx.lineWidth=1;ctx.strokeRect(x,cy,colW,cardH);ctx.fillStyle='#666';ctx.font='13px Arial';ctx.fillText(fitText(ctx,card.label,colW-22),x+11,cy+22);ctx.fillStyle='#111';ctx.font='700 19px Arial';ctx.fillText(fitText(ctx,card.value,colW-22),x+11,cy+49);});
    y+=Math.ceil(Math.max(1,data.cards.length)/3)*(cardH+gap)+6;
    if(!data.days.length){ctx.fillStyle='#666';ctx.font='16px Arial';ctx.fillText('Nenhuma movimentação encontrada no período.',pad,y+35);}
    for(const day of data.days){
      ctx.fillStyle='#f7f7f8';ctx.fillRect(pad,y,width-pad*2,dayHeadH);ctx.fillStyle='#111';ctx.font='700 16px Arial';ctx.fillText(day.date,pad+12,y+20);ctx.textAlign='right';ctx.font='12px Arial';ctx.fillStyle='#555';ctx.fillText(fitText(ctx,day.totals.join(' · '),720),width-pad-12,y+20);ctx.textAlign='left';y+=dayHeadH;
      for(const row of day.rows){
        ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(width-pad,y);ctx.stroke();
        ctx.fillStyle='#111';ctx.font='700 13px Arial';ctx.fillText(fitText(ctx,row.reference,530),pad+12,y+15);ctx.fillStyle='#666';ctx.font='11px Arial';ctx.fillText(fitText(ctx,row.meta,530),pad+12,y+33);
        ctx.fillStyle='#333';ctx.font='12px Arial';ctx.fillText(row.status,pad+570,y+23);ctx.fillText(row.direction,pad+760,y+23);
        ctx.textAlign='right';ctx.font='700 13px Arial';ctx.fillStyle=row.direction==='Entrada'?'#087a49':'#bd2632';ctx.fillText(row.value,width-pad-190,y+23);ctx.fillStyle='#333';ctx.font='12px Arial';ctx.fillText(row.balance,width-pad-12,y+23);ctx.textAlign='left';y+=rowH;
      }
      y+=18;
    }
    ctx.strokeStyle='#ddd';ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(width-pad,y);ctx.stroke();ctx.fillStyle='#666';ctx.font='11px Arial';ctx.fillText('Relatório gerado pelo Quality ERP com base nos filtros aplicados na tela.',pad,y+20);
    const ok=brand()?.downloadCanvas?await brand().downloadCanvas(canvas,`fluxo-de-caixa-${iso(new Date())}.png`):false;
    if(!ok) alert('Não foi possível gerar a imagem deste relatório.');
  };
  document.getElementById('exportCashFlowPdf')?.addEventListener('click',exportPdf);
  document.getElementById('exportCashFlowImage')?.addEventListener('click',exportImage);
})();
