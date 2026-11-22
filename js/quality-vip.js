(()=>{'use strict';
 const api='/api/cliente',vip=api+'/vip',id=x=>document.getElementById(x);
 let csrf='',signedIn=false,hasAccess=false;
 function show(el,yes){if(el)el.hidden=!yes;}
 function toast(message){const el=id('qv-toast');el.textContent=message;show(el,!!message);if(message)setTimeout(()=>show(el,false),5200);}
 async function getJson(path,opts={}){
  const response=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json',...(opts.body?{'Content-Type':'application/json','X-Quality-Csrf':csrf}:{})},method:opts.method||'GET',...(opts.body?{body:JSON.stringify(opts.body)}:{}),cache:'no-store'});
  let data;try{data=await response.json();}catch{throw new Error('Serviço temporariamente indisponível.');}
  if(!response.ok||!data.ok)throw new Error(data.message||'Falha na solicitação.');return data;
 }
 function formatBRL(number){return Number(number).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
 function create(tag,cls='',value=''){const el=document.createElement(tag);if(cls)el.className=cls;if(value)el.textContent=value;return el;}
 function dateBrazil(value){if(!value)return '';const d=new Date(value);return isNaN(d)?'':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});}
 async function pay(planId){
  if(!signedIn){location.href='/entrar.html?next=%2Fvip-peliculas.html';return;}
  const btn=document.querySelector(`[data-vip-plan="${planId}"]`);if(btn){btn.disabled=true;btn.textContent='Abrindo pagamento…';}
  try{const data=await getJson(vip+'/checkout',{method:'POST',body:{planId}});location.assign(data.url);}catch(err){toast(err.message);if(btn){btn.disabled=false;btn.textContent='Escolher plano';}}
 }
 function renderPlans(data){const container=id('qv-plan-grid');container.replaceChildren();const names={mensal:'Mensal',trimestral:'Trimestral',semestral:'Semestral',anual:'Anual'};
  for(const plan of data.plans){const featured=plan.id==='trimestral';const box=create('article','qv-plan'+(featured?' qv-plan-featured':''));
   if(featured)box.appendChild(create('span','qv-plan-tag','RECOMENDADO'));
   box.appendChild(create('h3','',names[plan.id]||plan.label));box.appendChild(create('p','qv-plan-subtitle',plan.label+' de acesso'));
   const price=create('div','qv-plan-price',formatBRL(plan.price));price.appendChild(create('small','',' / período'));box.appendChild(price);
   box.appendChild(create('p','qv-plan-details','Acesso completo à tabela, direto pelo navegador.'));
   const btn=create('button','qv-button',data.paymentsEnabled?'Escolher plano':'Pagamento em preparação');btn.type='button';btn.dataset.vipPlan=plan.id;btn.disabled=!data.paymentsEnabled;btn.addEventListener('click',()=>pay(plan.id));box.appendChild(btn);container.appendChild(box);
  }
 }
 async function loadAccount(){
  const note=id('qv-account-status');try{
   const status=await getJson(vip+'/status');signedIn=status.authenticated;hasAccess=status.active;
   show(id('qv-member-login'),!signedIn);show(id('qv-member-inactive'),signedIn&&!hasAccess);show(id('qv-member-active'),signedIn&&hasAccess);
   note.textContent=!signedIn?'Entre na sua conta para acessar a ferramenta.':hasAccess?'Assinatura ativa. Boa consulta!':'Sua conta está pronta para contratar um acesso.';
   if(hasAccess)id('qv-expiration').textContent='Seu acesso está válido até '+dateBrazil(status.expiresAt)+'.';
  }catch(e){signedIn=false;hasAccess=false;note.textContent='Não foi possível consultar seu acesso: '+e.message;show(id('qv-member-login'),true);show(id('qv-member-inactive'),false);show(id('qv-member-active'),false);}
 }
 function renderResults(results){const root=id('qv-search-results');root.replaceChildren();
  if(!results.length){root.appendChild(create('p','','Nenhum modelo encontrado. Tente outra grafia ou um nome mais curto.'));return;}
  for(const item of results){const card=create('article','qv-result-card');card.appendChild(create('h3','',item.name));
   for(const [label,values] of [['Películas compatíveis',item.screens],['Capas compatíveis',item.cases]]){
    card.appendChild(create('h4','',label));
    if(!values?.length){card.appendChild(create('p','','Nenhuma relação cadastrada para este aparelho.'));continue;}
    const ul=create('ul');for(const value of values)ul.appendChild(create('li','',value));card.appendChild(ul);
   }
   root.appendChild(card);
  }
 }
 id('qv-search-form')?.addEventListener('submit',async event=>{
  event.preventDefault();if(!hasAccess)return;
  const q=id('qv-query').value.trim(),root=id('qv-search-results');if(q.length<2)return;
  root.textContent='Consultando a tabela…';
  try{const data=await getJson(vip+'/search?q='+encodeURIComponent(q));renderResults(data.results||[]);}catch(e){root.textContent=e.message;}
 });
 id('qv-refresh')?.addEventListener('click',()=>loadAccount());
 async function init(){
  try{const [plans,config]=await Promise.all([getJson(vip+'/plans'),getJson(api+'/config')]);csrf=String(config.csrf||'');renderPlans(plans);}catch(e){id('qv-plan-grid').textContent='Os planos estão temporariamente indisponíveis. Tente novamente mais tarde.';}
  await loadAccount();
  if(new URLSearchParams(location.search).has('pagamento')){
   toast('O acesso só será liberado após a confirmação do pagamento. Use Atualizar situação se necessário.');
   history.replaceState(null,'',location.pathname+location.hash);
  }
 }
 init();
})();
