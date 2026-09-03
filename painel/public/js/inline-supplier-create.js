(()=>{
  'use strict';
  const NEW='__quality_new_supplier__';
  const onlyDigits=v=>String(v||'').replace(/\D/g,'');
  let activeSelect=null, previousValue='', parentModal=null, parentAriaHidden=null, lastLookedUpCnpj='', inlineCepTimer=null, lastLookedUpCep='';

  function isValidCnpj(value){
    const cnpj=onlyDigits(value);
    if(cnpj.length!==14||/^(\d)\1{13}$/.test(cnpj))return false;
    const digit=baseLength=>{
      const weights=baseLength===12?[5,4,3,2,9,8,7,6,5,4,3,2]:[6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum=weights.reduce((t,w,i)=>t+Number(cnpj[i])*w,0), r=sum%11;
      return r<2?0:11-r;
    };
    return digit(12)===Number(cnpj[12])&&digit(13)===Number(cnpj[13]);
  }
  function formatDocument(value,type='pj'){
    const d=onlyDigits(value);
    if(type==='pf')return d.slice(0,11).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2');
    return d.slice(0,14).replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
  }
  function formatPhone(value){
    const d=onlyDigits(value).slice(0,11);
    return d.length<=10?d.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'):d.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2');
  }
  function formatCep(value){return onlyDigits(value).slice(0,8).replace(/(\d{5})(\d)/,'$1-$2');}

  function ensureUi(){
    if(document.getElementById('qualityInlineSupplierModal'))return;
    const style=document.createElement('style');
    style.textContent=`
      .quality-inline-supplier{position:fixed;inset:0;z-index:10040;display:grid;place-items:center;padding:18px}.quality-inline-supplier[hidden]{display:none!important}
      .quality-inline-supplier__backdrop{position:absolute;inset:0;background:rgba(0,0,0,.70);backdrop-filter:blur(2px)}
      .quality-inline-supplier__card{position:relative;width:min(820px,96vw);max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--text,#111827);border:1px solid var(--line,#e5e7eb);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.35)}
      .quality-inline-supplier__head{display:flex;justify-content:space-between;gap:16px;padding:16px 18px;border-bottom:1px solid var(--line,#e5e7eb);position:sticky;top:0;background:var(--card,#fff);z-index:2}
      .quality-inline-supplier__head small{font-size:9px;font-weight:900;letter-spacing:.08em;color:var(--blue,#2563eb)}.quality-inline-supplier__head h2{font-size:18px;margin:3px 0}.quality-inline-supplier__head p{font-size:11px;color:var(--muted,#6b7280);margin:0}
      .quality-inline-supplier__close{border:1px solid var(--line,#e5e7eb);background:var(--surface-soft,#f8fafc);color:inherit;width:34px;height:34px;border-radius:9px;font-size:20px}
      .quality-inline-supplier__body{padding:16px 18px}.quality-inline-supplier__section{border:1px solid var(--line,#e5e7eb);border-radius:11px;padding:12px;margin-bottom:12px}.quality-inline-supplier__section-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin:0 0 10px;color:var(--muted,#6b7280)}
      .quality-inline-supplier__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.quality-inline-supplier__grid label{display:grid;gap:5px;font-size:10px;font-weight:800;color:var(--muted,#6b7280)}
      .quality-inline-supplier__grid input,.quality-inline-supplier__grid select{width:100%;box-sizing:border-box;min-height:39px;padding:9px;border:1px solid var(--line,#e5e7eb);border-radius:9px;background:var(--surface-soft,var(--card,#fff));color:var(--text,#111827)}
      .quality-inline-supplier [hidden]{display:none!important}
      .quality-inline-supplier__full{grid-column:1/-1}.quality-inline-supplier__docrow,.quality-inline-supplier__ceprow{display:grid;grid-template-columns:1fr auto;gap:8px}.quality-inline-supplier__lookup{white-space:nowrap;min-height:39px}
      .quality-inline-supplier__hint{font-size:10px;color:var(--muted,#6b7280);margin-top:5px}.quality-inline-supplier__message{margin:10px 0 0;padding:9px 10px;border-radius:8px;font-size:11px;background:rgba(180,83,9,.12);color:var(--text,#111827)}.quality-inline-supplier__message.success{background:rgba(22,163,74,.12)}.quality-inline-supplier__message[hidden]{display:none}
      .quality-inline-supplier__actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid var(--line,#e5e7eb);position:sticky;bottom:0;background:var(--card,#fff);z-index:2}
      @media(max-width:700px){.quality-inline-supplier__grid{grid-template-columns:1fr}.quality-inline-supplier__full{grid-column:auto}.quality-inline-supplier__docrow,.quality-inline-supplier__ceprow{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    const modal=document.createElement('div');modal.id='qualityInlineSupplierModal';modal.className='quality-inline-supplier';modal.hidden=true;
    modal.innerHTML=`<div class="quality-inline-supplier__backdrop" data-inline-supplier-close></div><section class="quality-inline-supplier__card" role="dialog" aria-modal="true" aria-labelledby="qualityInlineSupplierTitle"><header class="quality-inline-supplier__head"><div><small>CADASTRO RÁPIDO</small><h2 id="qualityInlineSupplierTitle">Novo fornecedor</h2><p>Cadastre sem sair desta operação. Os mesmos dados ficarão disponíveis no cadastro mestre.</p></div><button type="button" class="quality-inline-supplier__close" data-inline-supplier-close aria-label="Fechar">×</button></header><form id="qualityInlineSupplierForm"><div class="quality-inline-supplier__body">
      <section class="quality-inline-supplier__section"><h3 class="quality-inline-supplier__section-title">Dados principais</h3><div class="quality-inline-supplier__grid">
        <label>Tipo de pessoa<select id="inlineSupplierPersonType"><option value="pj">Pessoa jurídica</option><option value="pf">Pessoa física</option></select></label>
        <label>Origem<select id="inlineSupplierOriginType"><option value="national">Nacional</option><option value="imported">Importado</option></select></label>
        <label class="quality-inline-supplier__full"><span id="inlineSupplierDocumentLabel">CNPJ</span><div class="quality-inline-supplier__docrow"><input id="inlineSupplierDocument" inputmode="numeric" autocomplete="off" maxlength="18"><button type="button" class="btn quality-inline-supplier__lookup" id="inlineSupplierCnpjLookup">Consultar CNPJ</button></div><span class="quality-inline-supplier__hint" id="inlineSupplierDocumentHint">Informe um CNPJ válido para preencher os dados automaticamente.</span></label>
        <label><span id="inlineSupplierNameLabel">Razão social *</span><input id="inlineSupplierName" maxlength="160" required></label>
        <label id="inlineSupplierTradeWrap">Nome fantasia<input id="inlineSupplierTradeName" maxlength="160"></label>
        <label><span id="inlineSupplierStateRegistrationLabel">Inscrição estadual</span><input id="inlineSupplierStateRegistration"></label>
        <label>Celular / WhatsApp<input id="inlineSupplierMobile" inputmode="tel"></label>
        <label>Telefone<input id="inlineSupplierPhone" inputmode="tel"></label>
        <label>E-mail<input id="inlineSupplierEmail" type="email"></label>
      </div></section>
      <section class="quality-inline-supplier__section"><h3 class="quality-inline-supplier__section-title">Endereço</h3><div class="quality-inline-supplier__grid">
        <label>CEP<div class="quality-inline-supplier__ceprow"><input id="inlineSupplierZipCode" name="zipCode" inputmode="numeric" maxlength="9"><button type="button" class="btn quality-inline-supplier__lookup" id="inlineSupplierCepLookup">Consultar CEP</button></div></label>
        <label>Estado<input id="inlineSupplierState" name="state" maxlength="2"></label>
        <label class="quality-inline-supplier__full">Endereço<input id="inlineSupplierStreet" name="street"></label>
        <label>Número<input id="inlineSupplierNumber" name="number"></label>
        <label>Complemento<input id="inlineSupplierComplement" name="complement"></label>
        <label>Bairro<input id="inlineSupplierDistrict" name="district"></label>
        <label>Cidade<input id="inlineSupplierCity" name="city"></label>
      </div></section>
      <p class="quality-inline-supplier__message" id="inlineSupplierMessage" hidden></p>
    </div><footer class="quality-inline-supplier__actions"><button type="button" class="btn btn-ghost" data-inline-supplier-close>Cancelar</button><button type="submit" class="btn btn-success" id="inlineSupplierSave">Cadastrar e selecionar</button></footer></form></section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-inline-supplier-close]').forEach(x=>x.addEventListener('click',close));
    document.getElementById('inlineSupplierPersonType').addEventListener('change',syncType);
    document.getElementById('inlineSupplierDocument').addEventListener('input',onDocumentInput);
    document.getElementById('inlineSupplierDocument').addEventListener('blur',()=>{ if(document.getElementById('inlineSupplierPersonType').value==='pj') lookupCnpj(true); });
    document.getElementById('inlineSupplierCnpjLookup').addEventListener('click',()=>lookupCnpj(false));
    document.getElementById('inlineSupplierCepLookup').addEventListener('click',()=>lookupCep(false));
    document.getElementById('inlineSupplierZipCode').addEventListener('input',e=>{
      e.target.value=formatCep(e.target.value);
      clearTimeout(inlineCepTimer);
      const cep=onlyDigits(e.target.value);
      if(cep.length===8&&cep!==lastLookedUpCep)inlineCepTimer=setTimeout(()=>lookupCep(true),260);
    });
    document.getElementById('inlineSupplierMobile').addEventListener('input',e=>{e.target.value=formatPhone(e.target.value);});
    document.getElementById('inlineSupplierPhone').addEventListener('input',e=>{e.target.value=formatPhone(e.target.value);});
    document.getElementById('qualityInlineSupplierForm').addEventListener('submit',save);
  }

  function setMessage(text='',type='error'){
    const msg=document.getElementById('inlineSupplierMessage'); if(!msg)return;
    msg.hidden=!text;msg.textContent=text;msg.className=`quality-inline-supplier__message${type==='success'?' success':''}`;
  }
  function syncType(){
    const pf=document.getElementById('inlineSupplierPersonType').value==='pf';
    document.getElementById('inlineSupplierDocumentLabel').textContent=pf?'CPF':'CNPJ';
    document.getElementById('inlineSupplierNameLabel').textContent=pf?'Nome completo *':'Razão social *';
    document.getElementById('inlineSupplierStateRegistrationLabel').textContent=pf?'RG':'Inscrição estadual';
    const tradeWrap=document.getElementById('inlineSupplierTradeWrap');
    const cnpjLookup=document.getElementById('inlineSupplierCnpjLookup');
    tradeWrap.hidden=pf;
    cnpjLookup.hidden=pf;
    if(pf)document.getElementById('inlineSupplierTradeName').value='';
    document.getElementById('inlineSupplierDocumentHint').textContent=pf?'Informe o CPF do fornecedor.':'Informe um CNPJ válido para preencher os dados automaticamente.';
    lastLookedUpCnpj=''; onDocumentInput();
  }
  function onDocumentInput(){
    const input=document.getElementById('inlineSupplierDocument'),type=document.getElementById('inlineSupplierPersonType').value;
    input.value=formatDocument(input.value,type);
    if(type==='pj'){
      const valid=isValidCnpj(input.value),btn=document.getElementById('inlineSupplierCnpjLookup');
      btn.disabled=!valid;
      document.getElementById('inlineSupplierDocumentHint').textContent=valid?'CNPJ válido. Os dados serão consultados automaticamente.':'Informe um CNPJ válido para preencher os dados automaticamente.';
    }
  }
  function suspendParent(select){
    parentModal=select?.closest?.('.receivable-modal')||null;
    parentAriaHidden=parentModal?.getAttribute('aria-hidden')??null;
    if(parentModal){parentModal.hidden=true;parentModal.setAttribute('aria-hidden','true');}
  }
  function restoreParent(){
    if(!parentModal)return;
    parentModal.hidden=false;
    if(parentAriaHidden===null)parentModal.removeAttribute('aria-hidden');else parentModal.setAttribute('aria-hidden',parentAriaHidden);
    parentModal=null;parentAriaHidden=null;
  }
  function open(select){
    ensureUi();activeSelect=select;previousValue=select.dataset.inlineSupplierPrevious??'';lastLookedUpCnpj='';
    const f=document.getElementById('qualityInlineSupplierForm');f.reset();document.getElementById('inlineSupplierPersonType').value='pj';syncType();setMessage();suspendParent(select);document.getElementById('qualityInlineSupplierModal').hidden=false;setTimeout(()=>document.getElementById('inlineSupplierDocument').focus(),30);
  }
  function close(){
    const modal=document.getElementById('qualityInlineSupplierModal');if(modal)modal.hidden=true;
    if(activeSelect&&activeSelect.value===NEW)activeSelect.value=previousValue||'';
    const target=activeSelect;restoreParent();activeSelect=null;setTimeout(()=>target?.focus?.(),0);
  }

  async function lookupCnpj(silent=false){
    const type=document.getElementById('inlineSupplierPersonType').value;if(type!=='pj')return;
    const cnpj=onlyDigits(document.getElementById('inlineSupplierDocument').value);
    if(!isValidCnpj(cnpj)){if(!silent)setMessage('Informe um CNPJ válido para consultar.');return;}
    if(cnpj===lastLookedUpCnpj)return;
    const btn=document.getElementById('inlineSupplierCnpjLookup');btn.disabled=true;
    if(!silent)setMessage('Consultando dados da empresa...','success');
    try{
      const r=await fetch(`/erp/fornecedores/consultar-cnpj/${cnpj}`,{headers:{'Content-Type':'application/json'}});
      const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw new Error(j.message||'Não foi possível consultar o CNPJ.');
      const c=j.company||{};
      const set=(id,val,formatter=null)=>{if(val!==undefined&&val!==null&&String(val).trim()!=='')document.getElementById(id).value=formatter?formatter(val):val;};
      set('inlineSupplierName',c.name);set('inlineSupplierTradeName',c.tradeName);set('inlineSupplierStateRegistration',c.stateRegistration);set('inlineSupplierEmail',c.email);set('inlineSupplierPhone',c.phone,formatPhone);set('inlineSupplierZipCode',c.zipCode,formatCep);set('inlineSupplierStreet',c.street);set('inlineSupplierNumber',c.number);set('inlineSupplierComplement',c.complement);set('inlineSupplierDistrict',c.district);set('inlineSupplierCity',c.city);set('inlineSupplierState',c.state);
      lastLookedUpCnpj=cnpj;setMessage(`Dados da empresa preenchidos automaticamente${c.status?` · situação: ${c.status}`:''}. Revise antes de salvar.`,'success');
    }catch(error){if(!silent)setMessage(error.message||'Não foi possível consultar o CNPJ.');}
    finally{btn.disabled=false;onDocumentInput();}
  }

  async function lookupCep(silent=false){
    const cep=onlyDigits(document.getElementById('inlineSupplierZipCode').value);if(cep.length!==8){if(!silent)setMessage('Informe um CEP com 8 números.');return;}if(silent&&cep===lastLookedUpCep)return;
    const btn=document.getElementById('inlineSupplierCepLookup');btn.disabled=true;
    try{
      const r=await fetch(`https://viacep.com.br/ws/${cep}/json/`),d=await r.json();if(!r.ok||d.erro)throw new Error('CEP não encontrado.');
      document.getElementById('inlineSupplierStreet').value=d.logradouro||'';document.getElementById('inlineSupplierDistrict').value=d.bairro||'';document.getElementById('inlineSupplierCity').value=d.localidade||'';document.getElementById('inlineSupplierState').value=d.uf||'';document.getElementById('inlineSupplierComplement').value=d.complemento||document.getElementById('inlineSupplierComplement').value;lastLookedUpCep=cep;setMessage('Endereço preenchido pelo CEP. Digite para pesquisar outros endereços da cidade.','success');const street=document.getElementById('inlineSupplierStreet');street?.focus();street?.select?.();
    }catch(error){lastLookedUpCep='';if(!silent)setMessage(error.message||'Não foi possível consultar o CEP.');}finally{btn.disabled=false;}
  }

  function addSupplierEverywhere(supplier){
    document.querySelectorAll('select[data-inline-supplier-create],#createSupplier,#supplierId,#payableSupplier,#purchaseSupplier,#xmlSupplier').forEach(select=>{if(!select||[...select.options].some(o=>o.value===supplier.id))return;const marker=[...select.options].find(o=>o.value===NEW);const option=new Option(supplier.name,supplier.id);marker?select.insertBefore(option,marker):select.add(option);select.__qualitySyncSearchSource?.();});
    window.dispatchEvent(new CustomEvent('quality:supplier-created',{detail:{supplier}}));
  }
  async function save(e){
    e.preventDefault();const btn=document.getElementById('inlineSupplierSave');btn.disabled=true;setMessage();
    try{
      const personType=document.getElementById('inlineSupplierPersonType').value;
      const payload={personType,originType:document.getElementById('inlineSupplierOriginType').value,document:onlyDigits(document.getElementById('inlineSupplierDocument').value),name:document.getElementById('inlineSupplierName').value,tradeName:personType==='pj'?document.getElementById('inlineSupplierTradeName').value:'',stateRegistration:document.getElementById('inlineSupplierStateRegistration').value,mobile:onlyDigits(document.getElementById('inlineSupplierMobile').value),phone:onlyDigits(document.getElementById('inlineSupplierPhone').value),email:document.getElementById('inlineSupplierEmail').value,zipCode:onlyDigits(document.getElementById('inlineSupplierZipCode').value),street:document.getElementById('inlineSupplierStreet').value,number:document.getElementById('inlineSupplierNumber').value,complement:document.getElementById('inlineSupplierComplement').value,district:document.getElementById('inlineSupplierDistrict').value,city:document.getElementById('inlineSupplierCity').value,state:document.getElementById('inlineSupplierState').value,active:true};
      const r=await fetch('/erp/fornecedores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json().catch(()=>({}));
      if(!r.ok||j.success===false)throw new Error(j.message||'Não foi possível cadastrar o fornecedor.');
      const target=activeSelect;addSupplierEverywhere(j.supplier);if(target){target.value=j.supplier.id;target.dataset.inlineSupplierPrevious=j.supplier.id;target.dispatchEvent(new Event('change',{bubbles:true}));}
      document.getElementById('qualityInlineSupplierModal').hidden=true;restoreParent();activeSelect=null;setTimeout(()=>target?.focus?.(),0);
    }catch(error){setMessage(error.message||'Não foi possível cadastrar o fornecedor.');}finally{btn.disabled=false;}
  }
  function bind(select){if(!select||select.dataset.inlineSupplierBound==='1')return;select.dataset.inlineSupplierBound='1';select.dataset.inlineSupplierCreate='1';if(![...select.options].some(o=>o.value===NEW)){const option=new Option('＋ Cadastrar novo fornecedor',NEW);option.dataset.inlineSupplierAction='1';select.add(option,Math.min(1,select.options.length));}select.dataset.inlineSupplierPrevious=select.value||'';select.addEventListener('focus',()=>{if(select.value!==NEW)select.dataset.inlineSupplierPrevious=select.value||''});select.addEventListener('change',()=>{if(select.value===NEW)open(select);else select.dataset.inlineSupplierPrevious=select.value||''});}
  function init(){ensureUi();document.querySelectorAll('[data-inline-supplier-create],#createSupplier,#supplierId').forEach(bind);}
  window.QualityInlineSupplier={bind,init,addSupplier:addSupplierEverywhere};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
