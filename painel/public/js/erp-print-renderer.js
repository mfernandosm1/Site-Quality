(function(global){
  'use strict';
  const escapeHtml=(value='')=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function replaceVariables(template, variables={}){
    let html=String(template||'');
    Object.entries(variables).forEach(([key,value])=>{
      const re=new RegExp('{{\\s*'+String(key).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*}}','gi');
      html=html.replace(re,String(value??''));
    });
    return html;
  }
  const moneyBRL=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function equalInstallmentAmounts(total,count){
    const qty=Math.max(1,Math.round(Number(count)||1));
    const cents=Math.round(Math.max(0,Number(total)||0)*100);
    const base=Math.floor(cents/qty),remainder=cents-(base*qty);
    return Array.from({length:qty},(_,index)=>(base+(index<remainder?1:0))/100);
  }
  function formatDateBR(value){
    const raw=String(value||'').trim(); if(!raw)return '';
    const date=/^\d{4}-\d{2}-\d{2}$/.test(raw)?new Date(`${raw}T12:00:00`):new Date(raw);
    return Number.isNaN(date.getTime())?raw:date.toLocaleDateString('pt-BR');
  }
  function paymentPresentation(payment={}){
    const amount=Math.max(0,Number(payment.amount??payment.value)||0);
    const installments=Math.max(1,Math.round(Number(payment.installments)||1));
    const methodName=String(payment.methodName||payment.paymentMethodName||payment.name||payment.methodId||'Pagamento').trim()||'Pagamento';
    const rawValues=Array.isArray(payment.installmentAmounts)?payment.installmentAmounts.map(Number).filter(Number.isFinite):[];
    const values=rawValues.length===installments?rawValues:equalInstallmentAmounts(amount,installments);
    const dueDates=Array.isArray(payment.dueDates)?payment.dueDates.map(formatDateBR).filter(Boolean):[];
    if(!dueDates.length&&payment.dueDate)dueDates.push(formatDateBR(payment.dueDate));
    const uniform=values.length===installments&&values.every(value=>Math.abs(value-values[0])<0.005);
    const label=installments>1?(uniform?`${methodName} — ${installments}x de ${moneyBRL(values[0])}`:`${methodName} — ${installments} parcelas`):methodName;
    const details=(installments>1&&(dueDates.length||!uniform))?Array.from({length:installments},(_,index)=>({
      number:index+1,
      amount:Number(values[index]||0),
      dueDate:dueDates[index]||''
    })):[];
    return {methodName,amount,installments,values,dueDates,uniform,label,details};
  }
  function renderPayments(payments=[],options={}){
    const cfg={showInstallments:true,showInstallmentValue:true,showDueDates:true,showMethodTotal:true,...(options||{})};
    const rows=(Array.isArray(payments)?payments:[]).filter(payment=>Number(payment?.amount??payment?.value)>0);
    if(!rows.length)return '<div class="document-payment-empty">—</div>';
    return rows.map(payment=>{
      const view=paymentPresentation(payment);
      let label=view.methodName;
      if(cfg.showInstallments&&view.installments>1){
        label+=view.uniform&&cfg.showInstallmentValue?` — ${view.installments}x de ${moneyBRL(view.values[0])}`:` — ${view.installments} parcelas`;
      }
      const canDetail=view.installments>1&&((cfg.showDueDates&&view.dueDates.length)||(!view.uniform&&cfg.showInstallmentValue));
      const detailHtml=canDetail?`<div class="document-payment-details">${Array.from({length:view.installments},(_,index)=>{const due=view.dueDates[index]||'';return `<div class="document-payment-detail"><span>${index+1}/${view.installments}${cfg.showDueDates&&due?` · venc. ${escapeHtml(due)}`:''}</span>${cfg.showInstallmentValue?`<b>${moneyBRL(view.values[index]||0)}</b>`:''}</div>`;}).join('')}</div>`:'';
      return `<div class="document-payment"><div class="document-row document-payment-main"><span>${escapeHtml(label)}</span>${cfg.showMethodTotal?`<b>${moneyBRL(view.amount)}</b>`:''}</div>${detailHtml}</div>`;
    }).join('');
  }
  function styles(paper='thermal'){
    const thermal=paper!=='a4';
    return `@page{size:${thermal?'80mm auto':'A4 portrait'};margin:${thermal?'2mm':'14mm'}}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111}body{font-family:Arial,sans-serif;font-size:${thermal?'12.8px':'13px'};line-height:1.34}.document{width:${thermal?'76mm':'100%'};max-width:${thermal?'76mm':'190mm'};margin:0 auto;overflow-wrap:anywhere}.document-logo{display:block;max-width:64mm;max-height:20mm;object-fit:contain;margin:0 auto 7px}.doc-header{text-align:center;display:grid;gap:3px}.doc-company{font-size:16px}.receipt-block-header .doc-company{font-size:1.25em}.doc-status{display:table;margin:2px auto;border:1px solid #111;padding:2px 7px}.doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 8px}.document h3{font-size:12px;margin:5px 0 3px}.document hr{border:0;border-top:1px solid #aaa;margin:7px 0}.document-row,.doc-total{display:flex;justify-content:space-between;gap:10px;margin:3px 0}.document-item-discount{margin:-1px 0 3px 10px;font-size:.82em;color:#555}.document-item-discount b{white-space:nowrap}.document-payment+.document-payment{margin-top:4px}.document-payment-main span{min-width:0}.document-payment-main b{white-space:nowrap}.document-payment-details{margin:1px 0 4px 8px;padding-left:6px;border-left:1px dotted #999;font-size:.78em}.document-payment-detail{display:flex;justify-content:space-between;gap:8px;margin:1px 0}.document-payment-detail b{white-space:nowrap}.doc-total{font-size:1.1em;margin-top:6px}.document-items{width:100%;border-collapse:collapse;table-layout:fixed;font-size:.76em}.document-items th,.document-items td{padding:3px 1px;border-bottom:1px solid #bbb;text-align:left;vertical-align:top}.document-items th{white-space:nowrap;font-size:.96em}.document-items th:nth-child(1),.document-items td:nth-child(1){width:8%;white-space:nowrap}.document-items th:nth-child(2),.document-items td:nth-child(2){width:40%;overflow-wrap:anywhere}.document-items th:nth-child(3),.document-items td:nth-child(3){width:7%;white-space:nowrap;text-align:center}.document-items th:nth-child(4),.document-items td:nth-child(4),.document-items th:nth-child(5),.document-items td:nth-child(5),.document-items th:nth-child(6),.document-items td:nth-child(6){width:15%;white-space:nowrap;text-align:right;font-variant-numeric:tabular-nums}.document-items td:last-child{text-align:right}.os-receipt-items .document-items{display:block;width:100%;font-size:.82em}.os-receipt-items .document-items thead,.os-receipt-items .document-items tbody{display:block;width:100%}.os-receipt-items .document-items tr{display:grid;grid-template-columns:12% 22% 22% 22% 22%;width:100%;border-bottom:1px dotted #aaa;padding:2px 0}.os-receipt-items .document-items thead tr{border-bottom:1px solid #999;padding-bottom:3px}.os-receipt-items .document-items th,.os-receipt-items .document-items td{width:auto!important;border:0!important;padding:1px 1px!important;min-width:0}.os-receipt-items .document-items th:nth-child(1),.os-receipt-items .document-items td:nth-child(1){grid-column:1;grid-row:1;text-align:left}.os-receipt-items .document-items th:nth-child(2),.os-receipt-items .document-items td:nth-child(2){grid-column:2 / 6;grid-row:1;text-align:left;white-space:normal;overflow-wrap:anywhere;padding-left:2px!important}.os-receipt-items .document-items th:nth-child(3),.os-receipt-items .document-items td:nth-child(3){grid-column:2;grid-row:2;text-align:center}.os-receipt-items .document-items th:nth-child(4),.os-receipt-items .document-items td:nth-child(4){grid-column:3;grid-row:2;text-align:right}.os-receipt-items .document-items th:nth-child(5),.os-receipt-items .document-items td:nth-child(5){grid-column:4;grid-row:2;text-align:right}.os-receipt-items .document-items th:nth-child(6),.os-receipt-items .document-items td:nth-child(6){grid-column:5;grid-row:2;text-align:right}.os-receipt-items .document-items td:nth-child(n+3){white-space:nowrap;font-variant-numeric:tabular-nums}.os-receipt-items .document-items tbody tr:last-child{border-bottom:0}.receipt-items.hide-code th:nth-child(1),.receipt-items.hide-code td:nth-child(1){display:none}.receipt-items.hide-qty th:nth-child(3),.receipt-items.hide-qty td:nth-child(3){display:none}.receipt-items.hide-unit th:nth-child(4),.receipt-items.hide-unit td:nth-child(4){display:none}.receipt-items.hide-discount th:nth-child(5),.receipt-items.hide-discount td:nth-child(5){display:none}.receipt-items.hide-total th:nth-child(6),.receipt-items.hide-total td:nth-child(6){display:none}.sale-footer{display:grid;text-align:center;gap:5px;border-top:1px solid #aaa;margin-top:9px;padding-top:8px}.sale-footer strong{font-size:12px}.sale-footer span{font-size:10.5px}.printed-patterns{display:grid;grid-template-columns:1fr 1fr;gap:8mm;text-align:center}.password-block{margin-top:2px}.numeric-password{margin:0 0 8px}.password-pattern-title{text-align:center;font-weight:700;margin:2px 0 4px}.printed-pattern{display:block;width:21mm;height:21mm;margin:3px auto}.printed-patterns>div>b{font-size:9px}.signature{margin-top:20px}.document img{max-width:100%}@media print{html,body{width:${thermal?'76mm':'auto'}}}`;
  }
  function renderBody(model,variables){return replaceVariables(model?.content||'',variables);}
  function renderDocument(model,variables={},options={}){
    const paper=model?.paper||options.paper||'thermal';
    const body=renderBody(model,variables);
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(model?.name||'Impressão')}</title><style>${styles(paper)}</style></head><body><main class="document">${body}</main></body></html>`;
  }
  global.QualityERPPrintRenderer={escapeHtml,replaceVariables,renderBody,renderDocument,styles,moneyBRL,equalInstallmentAmounts,paymentPresentation,renderPayments};
})(window);
