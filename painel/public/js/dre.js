(()=>{
  const form=document.getElementById('dreFilters');
  if(!form)return;
  const start=form.querySelector('[name="start"]');
  const end=form.querySelector('[name="end"]');
  const pad=n=>String(n).padStart(2,'0');
  const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const monthStart=d=>new Date(d.getFullYear(),d.getMonth(),1);
  const monthEnd=d=>new Date(d.getFullYear(),d.getMonth()+1,0);
  const today=new Date(); today.setHours(12,0,0,0);
  const ranges={
    'last-3-months':()=>[new Date(today.getFullYear(),today.getMonth()-2,1),monthEnd(today)],
    'this-month':()=>[monthStart(today),monthEnd(today)],
    'previous-month':()=>[new Date(today.getFullYear(),today.getMonth()-1,1),new Date(today.getFullYear(),today.getMonth(),0)],
    'this-year':()=>[new Date(today.getFullYear(),0,1),new Date(today.getFullYear(),11,31)],
    'all':()=>[new Date(2000,0,1),new Date(2099,11,31)]
  };

  document.querySelectorAll('[data-quick]').forEach(button=>button.addEventListener('click',()=>{
    const range=ranges[button.dataset.quick]?.(); if(!range||!start||!end)return;
    start.value=iso(range[0]); end.value=iso(range[1]);
    if(typeof form.requestSubmit==='function') form.requestSubmit(); else form.submit();
  }));
  Object.entries(ranges).some(([key,getRange])=>{const [a,b]=getRange();if(start.value===iso(a)&&end.value===iso(b)){document.querySelector(`[data-quick="${key}"]`)?.classList.add('is-active');return true;}return false;});

  const childrenOf=key=>[...document.querySelectorAll('[data-dre-parent]')].filter(el=>el.dataset.dreParent===key);
  document.addEventListener('click',e=>{
    const row=e.target.closest('[data-dre-toggle]'); if(!row)return;
    const key=row.dataset.dreToggle;
    const children=childrenOf(key);
    if(!children.length)return;
    const opening=children.some(x=>x.hidden);
    children.forEach(x=>{x.hidden=!opening;});
    row.classList.toggle('is-open',opening);
    if(!opening) children.forEach(child=>{
      child.classList.remove('is-open');
      const nested=child.dataset.dreToggle;
      if(nested) childrenOf(nested).forEach(x=>{x.hidden=true;x.classList.remove('is-open');});
    });
  });

  const selectedText=name=>{const el=form.querySelector(`[name="${name}"]`);return el?.options?.[el.selectedIndex]?.text?.trim()||''};
  const date=v=>{if(!v)return '—';const [y,m,d]=String(v).split('-');return y&&m&&d?`${d}/${m}/${y}`:v};
  const filterSummary=()=>{
    const parts=[`Período: ${date(start.value)} a ${date(end.value)}`,`Regime: ${selectedText('basis')}`];
    if(form.querySelector('[name="classification"]')?.value)parts.push(`Classificação: ${selectedText('classification')}`);
    if(form.querySelector('[name="groupId"]')?.value)parts.push(`Grupo DRE: ${selectedText('groupId')}`);
    return parts.join(' · ');
  };
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards=()=>[...document.querySelectorAll('.dre-summary>div')].map(card=>({label:card.querySelector('span')?.textContent.trim()||'',value:card.querySelector('b')?.textContent.trim()||'',detail:card.querySelector('small')?.textContent.trim()||'',negative:card.querySelector('b')?.classList.contains('negative')}));
  const analysis=()=>[...document.querySelectorAll('.dre-insight-body p')].map(p=>p.textContent.trim()).filter(Boolean).join('\n');
  const exportTable=()=>{
    const table=document.querySelector('.dre-table'); if(!table)return '';
    const clone=table.cloneNode(true);
    clone.querySelectorAll('[hidden]').forEach(el=>el.removeAttribute('hidden'));
    clone.querySelectorAll('.dre-chevron').forEach(el=>el.remove());
    return clone.outerHTML;
  };
  const styles=()=>`${window.QualityExportBrand?.css?.()||''}*{box-sizing:border-box}body{margin:0;background:#fff;color:#151515;font:12px Arial,sans-serif}.report{padding:24px}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #b40000;padding-bottom:12px;margin-bottom:14px}.head h1{margin:0;color:#b40000;font-size:23px}.head h2{margin:4px 0 0;font-size:16px}.meta{text-align:right;color:#555}.filters{padding:10px 12px;background:#f2f3f5;border-radius:7px;margin:0 0 14px}.cards{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.card{border:1px solid #d7dbe2;border-radius:9px;padding:10px}.card span,.card small{display:block;color:#666}.card b{display:block;font-size:15px;margin:4px 0}.negative{color:#bd2632}.positive{color:#087a49}.analysis{border:1px solid #d7dbe2;border-radius:9px;padding:12px;margin-bottom:14px;line-height:1.55}.analysis h3{margin:0 0 8px}.analysis p{margin:0 0 7px;line-height:1.5}.analysis p:last-child{margin-bottom:0}.finance-table{width:100%;border-collapse:collapse}.finance-table th,.finance-table td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}.finance-table th:nth-child(n+2),.finance-table td:nth-child(n+2){text-align:right}.finance-table small{display:block;color:#666;margin-top:2px}.dre-account-row td:first-child{padding-left:25px}.dre-detail-row td:first-child{padding-left:45px}.dre-section-label td{font-weight:800;background:#eef7f2}.dre-expense-label td{background:#fff0f0}.dre-subtotal-row,.dre-result-row{font-size:13px;font-weight:700;background:#f4f4f4}footer{margin-top:14px;padding-top:8px;border-top:1px solid #ddd;color:#666;font-size:10px}@media print{.report{padding:10px}.cards{grid-template-columns:repeat(5,1fr)}tr{break-inside:avoid}}`;
  const reportHtml=(logoSrc='')=>`<section class="report"><header class="head">${window.QualityExportBrand?.headerHtml?.({title:'DRE Gerencial',logoSrc})||'<div><b>Quality ERP</b><br>DRE Gerencial</div>'}<div class="meta"><b>${esc(filterSummary())}</b><br>Emitido em ${esc(new Date().toLocaleString('pt-BR'))}</div></header><div class="filters"><b>Filtros aplicados:</b> ${esc(filterSummary())}</div><div class="cards">${cards().map(c=>`<div class="card"><span>${esc(c.label)}</span><b class="${c.negative?'negative':'positive'}">${esc(c.value)}</b><small>${esc(c.detail)}</small></div>`).join('')}</div><section class="analysis"><h3>Análise gerencial</h3>${analysis().split('\n').filter(Boolean).map(line=>`<p>${esc(line)}</p>`).join('')}</section>${exportTable()}<footer>Relatório gerado pelo Quality ERP com base nos filtros aplicados.</footer></section>`;
  const closeMenu=()=>{const menu=document.querySelector('.dre-export-menu');if(menu)menu.open=false};
  const exportPdf=()=>{const popup=window.open('','_blank','width=1200,height=800');if(!popup){alert('Permita pop-ups para gerar o PDF.');return}popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>DRE Gerencial</title><style>${styles()}</style></head><body>${reportHtml()}<script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`);popup.document.close();closeMenu();};
  const exportImage=async()=>{const width=1500,logoSrc=await window.QualityExportBrand?.getLogoDataUrl?.()||'',inner=`<div xmlns="http://www.w3.org/1999/xhtml"><style>${styles()}</style>${reportHtml(logoSrc)}</div>`,probe=document.createElement('div');probe.style.cssText=`position:fixed;left:-10000px;top:0;width:${width}px;background:#fff;`;probe.innerHTML=`<style>${styles()}</style>${reportHtml(logoSrc)}`;document.body.appendChild(probe);const height=Math.max(850,Math.ceil(probe.scrollHeight+10));probe.remove();if(height>18000&&!confirm('O relatório ficou muito longo e a imagem será grande. Deseja continuar?'))return;const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${inner}</foreignObject></svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);canvas.toBlob(file=>{if(!file){alert('Não foi possível gerar a imagem.');return}const imageUrl=URL.createObjectURL(file),a=document.createElement('a');a.href=imageUrl;a.download=`dre-${iso(new Date())}.png`;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(imageUrl),1500)},'image/png')};img.onerror=()=>{URL.revokeObjectURL(url);alert('Não foi possível gerar a imagem. Use a exportação em PDF.')};img.src=url;closeMenu();};
  document.getElementById('exportDrePdf')?.addEventListener('click',exportPdf);
  document.getElementById('exportDreImage')?.addEventListener('click',exportImage);
})();
