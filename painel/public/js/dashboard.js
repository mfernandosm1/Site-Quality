(function(){
  const root=document.querySelector('[data-dashboard-root]');
  if(!root) return;

  const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const labels={today:'Hoje',week:'Esta semana',month:'Mês',last_month:'Mês passado',year:'Ano',all:'Todo período'};
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let activePeriod=root.dataset.initialPeriod||'month';
  let rankingMode='value';
  let controller=null;
  let attentionPage=0;
  let agendaPage=0;
  const attentionPageSize=3;
  const agendaPageSize=3;

  function setLoading(isLoading){
    root.classList.toggle('is-loading',isLoading);
  }

  function setPeriodUI(period){
    activePeriod=labels[period]?period:'month';
    const label=document.querySelector('[data-period-label]');
    if(label) label.textContent=labels[activePeriod];
    document.querySelectorAll('[data-period]').forEach(link=>link.classList.toggle('active',link.dataset.period===activePeriod));
  }

  function metric(name,value,isMoney=true){
    const el=document.querySelector(`[data-metric="${name}"]`);
    if(el) el.textContent=isMoney?money(value):String(value??0);
  }

  function renderAttention(items){
    const host=document.querySelector('[data-attention-list]');
    if(!host) return;
    const panel=host.closest('.attention-panel');
    if(!items.length){
      panel?.classList.remove('has-due-today','has-overdue-payable');
      host.innerHTML='<div class="attention-empty">Nenhuma pendência crítica detectada agora.</div>';
      return;
    }

    // Contas vencidas e as que vencem hoje ficam sempre presas no topo. Vencidas
    // recebem prioridade visual vermelha; "vence hoje" mantém o destaque amarelo.
    const overduePayable=items.find(item=>item.kind==='payable_overdue');
    const dueToday=items.find(item=>item.kind==='payable_due_today');
    const regularItems=items.filter(item=>!['payable_overdue','payable_due_today'].includes(item.kind));
    panel?.classList.toggle('has-overdue-payable',Boolean(overduePayable));
    panel?.classList.toggle('has-due-today',Boolean(dueToday) && !overduePayable);

    const pageCount=Math.max(1,Math.ceil(regularItems.length/attentionPageSize));
    attentionPage=Math.min(attentionPage,pageCount-1);
    const start=attentionPage*attentionPageSize;
    const pageItems=regularItems.slice(start,start+attentionPageSize);
    const overdueCard=overduePayable?`<a href="${escapeHtml(overduePayable.href)}" class="attention-item ${escapeHtml(overduePayable.level)} overdue-payable"><span class="attention-icon">${escapeHtml(overduePayable.icon)}</span><strong>${escapeHtml(overduePayable.label)}<small class="attention-overdue-badge">${/^[1]\s/.test(String(overduePayable.label||''))?'VENCIDA':'VENCIDAS'}</small></strong><span>→</span></a>`:'';
    const dueTodayCard=dueToday?`<a href="${escapeHtml(dueToday.href)}" class="attention-item ${escapeHtml(dueToday.level)} due-today"><span class="attention-icon">${escapeHtml(dueToday.icon)}</span><strong>${escapeHtml(dueToday.label)}<small class="attention-today-badge">VENCE HOJE</small></strong><span>→</span></a>`:'';
    const cards=pageItems.map(item=>`<a href="${escapeHtml(item.href)}" class="attention-item ${escapeHtml(item.level)}"><span class="attention-icon">${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.label)}</strong><span>→</span></a>`).join('');
    const pager=regularItems.length>attentionPageSize?`<div class="attention-pager"><button type="button" data-attention-prev ${attentionPage===0?'disabled':''} aria-label="Parte anterior">←</button><span>Parte ${attentionPage+1} de ${pageCount}</span><button type="button" data-attention-next ${attentionPage===pageCount-1?'disabled':''} aria-label="Próxima parte">→</button></div>`:'';
    host.innerHTML=overdueCard+dueTodayCard+cards+pager;
    host.querySelector('[data-attention-prev]')?.addEventListener('click',()=>{attentionPage=Math.max(0,attentionPage-1);renderAttention(items);});
    host.querySelector('[data-attention-next]')?.addEventListener('click',()=>{attentionPage=Math.min(pageCount-1,attentionPage+1);renderAttention(items);});
  }

  function relativeAgendaTime(value){
    if(!value) return 'sem data';
    const due=new Date(value);
    if(Number.isNaN(due.getTime())) return 'data inválida';
    const diff=due.getTime()-Date.now();
    const abs=Math.abs(diff);
    const mins=Math.max(1,Math.round(abs/60000));
    let duration='';
    if(mins<60) duration=`${mins} min`;
    else if(mins<1440){
      const hours=Math.floor(mins/60), rest=mins%60;
      duration=rest?`${hours}h ${rest}min`:`${hours}h`;
    }else{
      const days=Math.floor(mins/1440), hours=Math.floor((mins%1440)/60);
      duration=hours?`${days}d ${hours}h`:`${days}d`;
    }
    return diff<0?`atrasada há ${duration}`:`restam ${duration}`;
  }

  function formatAgendaDate(value){
    if(!value) return 'Sem data definida';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
  }

  function renderAgenda(agenda={}){
    const host=document.querySelector('[data-agenda-list]');
    if(!host) return;
    const items=Array.isArray(agenda.next)?agenda.next:[];
    if(!items.length){ host.innerHTML='<div class="attention-empty">Nenhum compromisso pendente.</div>'; return; }
    const pageCount=Math.max(1,Math.ceil(items.length/agendaPageSize));
    agendaPage=Math.min(agendaPage,pageCount-1);
    const start=agendaPage*agendaPageSize;
    const pageItems=items.slice(start,start+agendaPageSize);
    const cards=pageItems.map(item=>{
      const due=item.dueAt?new Date(item.dueAt):null;
      const overdue=due&&!Number.isNaN(due.getTime())&&due.getTime()<Date.now();
      const classes=`dashboard-agenda-item${overdue?' overdue':''}${!item.dueAt?' undated':''}`;
      const time=relativeAgendaTime(item.dueAt);
      const priority=item.priority==='high'?'Alta':item.priority==='low'?'Baixa':'Normal';
      const customer=item.customerName?`<div><span>Cliente</span><strong>${escapeHtml(item.customerName)}</strong></div>`:'';
      const description=item.description?escapeHtml(item.description):'Sem observações adicionais.';
      return `<article class="${classes}" style="--agenda-owner-color:${escapeHtml(item.ownerColor||'#64748b')}">
        <span class="dashboard-agenda-owner-dot"></span>
        <span class="dashboard-agenda-main">
          <span class="dashboard-agenda-owner"><strong>${escapeHtml(item.owner||'Sem responsável')}</strong><small>${overdue?'<span class="dashboard-agenda-overdue-flag">🚩 Atrasada</span> · ':''}${escapeHtml(time)}</small></span>
          <span class="dashboard-agenda-task"><em>${escapeHtml(item.typeName||'Tarefa')}</em><b>${escapeHtml(item.title||'')}</b></span>
          <div class="dashboard-agenda-details" data-agenda-details hidden>
            <div><span>Quando</span><strong>${escapeHtml(formatAgendaDate(item.dueAt))}</strong></div>
            <div><span>Prioridade</span><strong>${escapeHtml(priority)}</strong></div>
            ${customer}
            <p>${description}</p>
            <a href="${escapeHtml(item.href||'/erp/agenda')}">Abrir na agenda →</a>
          </div>
        </span>
        <button type="button" class="dashboard-agenda-more" data-agenda-expand aria-expanded="false">Ver mais</button>
      </article>`;
    }).join('');
    const pager=pageCount>1?`<div class="attention-pager"><button type="button" data-agenda-prev ${agendaPage===0?'disabled':''} aria-label="Parte anterior">←</button><span>Parte ${agendaPage+1} de ${pageCount}</span><button type="button" data-agenda-next ${agendaPage===pageCount-1?'disabled':''} aria-label="Próxima parte">→</button></div>`:'';
    host.innerHTML=cards+pager;
    host.querySelectorAll('[data-agenda-expand]').forEach(button=>button.addEventListener('click',()=>{
      const card=button.closest('.dashboard-agenda-item');
      const details=card?.querySelector('[data-agenda-details]');
      if(!details) return;
      const open=details.hidden;
      details.hidden=!open;
      button.setAttribute('aria-expanded',open?'true':'false');
      button.textContent=open?'Menos':'Ver mais';
      card.classList.toggle('expanded',open);
    }));
    host.querySelector('[data-agenda-prev]')?.addEventListener('click',()=>{agendaPage=Math.max(0,agendaPage-1);renderAgenda(agenda);});
    host.querySelector('[data-agenda-next]')?.addEventListener('click',()=>{agendaPage=Math.min(pageCount-1,agendaPage+1);renderAgenda(agenda);});
  }

  function customerHref(item){
    return String(item.id||'').startsWith('CLI-')?`/erp/clientes/${encodeURIComponent(item.id)}`:`/erp/centro-operacoes?q=${encodeURIComponent(item.name||'')}`;
  }

  function rankingHtml(items,mode){
    if(!items.length) return '<div class="attention-empty">Ainda não há vendas suficientes para formar o ranking.</div>';
    return items.map((item,index)=>`<a href="${customerHref(item)}"><span class="ranking-position">${index+1}</span><span class="ranking-name"><strong>${escapeHtml(item.name)}</strong><small>${mode==='value'?`${item.count} compra${item.count===1?'':'s'}`:money(item.value)}</small></span><b>${mode==='value'?money(item.value):`${item.count}x`}</b></a>`).join('');
  }

  function renderRanking(ranking){
    const value=document.querySelector('[data-ranking-list="value"]');
    const count=document.querySelector('[data-ranking-list="count"]');
    if(value) value.innerHTML=rankingHtml(ranking.byValue||[],'value');
    if(count) count.innerHTML=rankingHtml(ranking.byCount||[],'count');
  }

  function renderChart(items,range){
    const max=Math.max(1,...items.map(item=>Number(item.value||0)));
    const points=items.map((item,index)=>{
      const x=items.length<=1?50:(index/(items.length-1))*100;
      const y=92-((Number(item.value||0)/max)*76);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const line=document.querySelector('[data-chart-line]');
    if(line) line.setAttribute('points',points);
    const maxEl=document.querySelector('[data-chart-max]'); if(maxEl) maxEl.textContent=money(max);
    const halfEl=document.querySelector('[data-chart-half]'); if(halfEl) halfEl.textContent=money(max/2);
    const axis=document.querySelector('[data-chart-axis]');
    if(axis){
      axis.style.setProperty('--chart-days',String(Math.max(1,items.length)));
      axis.innerHTML=items.map(item=>{
        const parts=String(item.date||'').split('-');
        const label=parts.length===3?`${parts[2]}/${parts[1]}`:String(item.date||'');
        return `<span title="${label}">${label}</span>`;
      }).join('');
    }
    const title=document.querySelector('[data-chart-title]'); if(title) title.textContent=activePeriod==='last_month'?'Movimento diário do mês passado':'Movimento diário do mês';
    const chartLink=document.querySelector('[data-chart-link]');
    if(chartLink&&items.length) chartLink.href=`/erp/centro-operacoes?tipo=all&situacao=finalized&de=${encodeURIComponent(items[0].date)}&ate=${encodeURIComponent(items[items.length-1].date)}`;
    const host=document.querySelector('[data-chart-points]');
    if(host){
      host.innerHTML=items.map((item,index)=>{
        const left=items.length<=1?50:(index/(items.length-1))*100;
        const bottom=(Number(item.value||0)/max)*76+8;
        const date=String(item.date||'').split('-').reverse().join('/');
        return `<a href="/erp/centro-operacoes?tipo=all&situacao=finalized&de=${encodeURIComponent(item.date)}&ate=${encodeURIComponent(item.date)}" class="chart-point" style="left:${left}%;bottom:${bottom}%;" title="${date} · ${money(item.value)} · ${Number(item.count||0)} operação(ões)"></a>`;
      }).join('');
    }
  }

  let customerLocationsLoaded=false;
  let customerLocationsLoading=false;
  let customerLocations=[];
  let selectedCustomerLocation=null;
  let cityCustomerController=null;
  let citySearchTimer=null;
  let municipalityGeoPromise=null;

  const normalizeGeo=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const cityGeoKey=(city,state)=>`${normalizeGeo(city)}|${String(state||'').trim().toUpperCase()}`;

  function customerMapQuery(customer,item){
    if(customer){
      // O CEP ajuda o Google Maps a tolerar pequenas diferenças/erros na grafia da rua.
      const zip=String(customer.zipCode||'').replace(/\D/g,'');
      const precise=[zip?`CEP ${zip}`:'',customer.street,customer.number,customer.district,customer.city||item?.city,customer.state||item?.state,'Brasil'].filter(Boolean).join(', ');
      if(precise)return precise;
      if(customer.address)return customer.address;
    }
    return [item?.city,item?.state,'Brasil'].filter(Boolean).join(', ');
  }
  function mapEmbedUrlFor(customer,item){
    return `https://www.google.com/maps?q=${encodeURIComponent(customerMapQuery(customer,item))}&output=embed`;
  }
  function mapExternalUrlFor(customer,item){
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerMapQuery(customer,item))}`;
  }

  function openCustomerAddressMap(customer,item=selectedCustomerLocation){
    const stage=document.querySelector('[data-customer-map-stage]');
    if(!stage||!customer)return;
    stage.innerHTML=`<div class="dashboard-map-frame-wrap">
      <iframe class="dashboard-map-frame" title="Mapa de ${escapeHtml(customer.name||'cliente')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${mapEmbedUrlFor(customer,item)}"></iframe>
      <div class="dashboard-map-frame-bar dashboard-map-customer-bar"><strong>📍 ${escapeHtml(customer.name||'Cliente')}</strong><span>${escapeHtml(customer.address||customerMapQuery(customer,item))}</span><button type="button" data-back-city>← Clientes da cidade</button><a href="${mapExternalUrlFor(customer,item)}" target="_blank" rel="noopener">Abrir no Google Maps ↗</a></div>
    </div>`;
    stage.querySelector('[data-back-city]')?.addEventListener('click',()=>renderCityPanel(item));
  }

  function renderCityCustomers(item,data){
    const host=document.querySelector('[data-city-customer-results]');
    if(!host)return;
    const items=Array.isArray(data.items)?data.items:[];
    if(!items.length){
      host.innerHTML='<div class="dashboard-city-empty">Nenhum cliente encontrado nesta pesquisa.</div>';
      return;
    }
    host.innerHTML=`<div class="dashboard-city-result-meta">${Number(data.total||0).toLocaleString('pt-BR')} cliente(s) encontrado(s)${Number(data.total||0)>items.length?` · mostrando ${items.length}`:''}</div>
      <div class="dashboard-city-customer-list">${items.map(customer=>`<div class="dashboard-city-customer-row">
        <span><b>${escapeHtml(customer.name||'Cliente')}</b><small>${escapeHtml(customer.address||'Endereço não informado')}</small></span>
        <div><a href="/erp/clientes/${encodeURIComponent(customer.id)}/ficha" title="Abrir ficha">Ficha</a><button type="button" data-customer-map='${JSON.stringify(customer).replace(/'/g,'&#39;')}'>📍 Ver endereço</button></div>
      </div>`).join('')}</div>`;
    host.querySelectorAll('[data-customer-map]').forEach(button=>button.addEventListener('click',()=>{
      try{openCustomerAddressMap(JSON.parse(button.dataset.customerMap),item);}catch(_){ }
    }));
  }

  async function loadCityCustomers(item,q=''){
    if(!item)return;
    if(cityCustomerController)cityCustomerController.abort();
    cityCustomerController=new AbortController();
    const host=document.querySelector('[data-city-customer-results]');
    if(host)host.innerHTML='<div class="dashboard-map-loading compact">Carregando clientes…</div>';
    try{
      const url=`/api/dashboard/customer-location-customers?city=${encodeURIComponent(item.city)}&state=${encodeURIComponent(item.state||'')}&q=${encodeURIComponent(q||'')}`;
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:cityCustomerController.signal});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível carregar os clientes.');
      renderCityCustomers(item,data);
    }catch(error){
      if(error.name==='AbortError')return;
      if(host)host.innerHTML=`<div class="dashboard-map-fallback compact"><strong>Não foi possível carregar os clientes.</strong><span>${escapeHtml(error.message||'Tente novamente.')}</span></div>`;
    }
  }

  function renderCityPanel(item){
    const stage=document.querySelector('[data-customer-map-stage]');
    if(!stage)return;
    if(!item){
      stage.innerHTML='<div class="dashboard-map-fallback"><strong>Nenhuma cidade disponível.</strong><span>Cadastre cidade/UF nos clientes para habilitar esta visualização.</span></div>';
      return;
    }
    selectedCustomerLocation=item;
    stage.innerHTML=`<div class="dashboard-city-panel">
      <header><span><b>📍 ${escapeHtml(item.city)}${item.state?`/${escapeHtml(item.state)}`:''}</b><small>${Number(item.count||0).toLocaleString('pt-BR')} cliente(s) cadastrados nesta cidade</small></span><button type="button" data-all-cities-map>🗺️ Mapa geral</button></header>
      <div class="dashboard-city-search"><input type="search" placeholder="Buscar cliente nesta cidade…" data-city-customer-search><small>O mapa usa rua + número + CEP. Se um endereço estiver incompleto, você ainda pode abrir a ficha e corrigir.</small></div>
      <div data-city-customer-results></div>
    </div>`;
    stage.querySelector('[data-all-cities-map]')?.addEventListener('click',openAllCitiesMap);
    const input=stage.querySelector('[data-city-customer-search]');
    input?.addEventListener('input',()=>{
      clearTimeout(citySearchTimer);
      citySearchTimer=setTimeout(()=>loadCityCustomers(item,input.value),220);
    });
    loadCityCustomers(item);
  }

  function loadScriptOnce(src,test){
    if(test?.())return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-dynamic-src="${src}"]`);
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const script=document.createElement('script');script.src=src;script.async=true;script.dataset.dynamicSrc=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
    });
  }
  function loadStyleOnce(href){
    if(document.querySelector(`link[data-dynamic-href="${href}"]`))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.dynamicHref=href;document.head.appendChild(link);
  }

  async function municipalityGeo(){
    if(municipalityGeoPromise)return municipalityGeoPromise;
    municipalityGeoPromise=(async()=>{
      const base='https://cdn.jsdelivr.net/gh/kelvins/municipios-brasileiros@main/json/';
      const [municipiosResponse,estadosResponse]=await Promise.all([fetch(base+'municipios.json'),fetch(base+'estados.json')]);
      if(!municipiosResponse.ok||!estadosResponse.ok)throw new Error('Base geográfica indisponível.');
      const [municipios,estados]=await Promise.all([municipiosResponse.json(),estadosResponse.json()]);
      const ufByCode=new Map((Array.isArray(estados)?estados:[]).map(state=>[Number(state.codigo_uf),String(state.uf||'').toUpperCase()]));
      const byCity=new Map();
      (Array.isArray(municipios)?municipios:[]).forEach(city=>{
        const uf=ufByCode.get(Number(city.codigo_uf))||'';
        if(!uf)return;
        byCity.set(cityGeoKey(city.nome,uf),{lat:Number(city.latitude),lng:Number(city.longitude)});
      });
      return byCity;
    })().catch(error=>{municipalityGeoPromise=null;throw error;});
    return municipalityGeoPromise;
  }

  async function openAllCitiesMap(){
    const stage=document.querySelector('[data-customer-map-stage]');
    if(!stage||!customerLocations.length)return;
    stage.innerHTML='<div class="dashboard-map-loading"><strong>Montando mapa geral…</strong><span>Carregando somente agora a base leve de municípios.</span></div>';
    try{
      loadStyleOnce('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');
      const [,geo]=await Promise.all([
        loadScriptOnce('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',()=>window.L),
        municipalityGeo()
      ]);
      stage.innerHTML=`<div class="dashboard-all-cities-shell"><div class="dashboard-all-cities-toolbar"><span><b>🗺️ Mapa geral de clientes</b><small>Um marcador por cidade; o tamanho representa a concentração de clientes.</small></span><button type="button" data-back-selected-city>← Cidade selecionada</button></div><div class="dashboard-all-cities-map" data-all-cities-map></div><div class="dashboard-map-note">Os marcadores desta visão representam o centro de cada cidade. Para ver a localização de um cliente específico, selecione a cidade e use “📍 Ver no mapa”.</div></div>`;
      stage.querySelector('[data-back-selected-city]')?.addEventListener('click',()=>renderCityPanel(selectedCustomerLocation||customerLocations[0]));
      const mapHost=stage.querySelector('[data-all-cities-map]');
      const map=window.L.map(mapHost,{zoomControl:true,preferCanvas:true});
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
      const max=Math.max(1,...customerLocations.map(item=>Number(item.count||0)));
      const markers=[];
      customerLocations.forEach(location=>{
        const point=geo.get(cityGeoKey(location.city,location.state));
        if(!point||!Number.isFinite(point.lat)||!Number.isFinite(point.lng))return;
        const radius=Math.max(5,Math.min(18,5+Math.sqrt(Number(location.count||0)/max)*13));
        const marker=window.L.circleMarker([point.lat,point.lng],{radius,weight:2,fillOpacity:.55});
        marker.bindTooltip(`${escapeHtml(location.city)}/${escapeHtml(location.state||'')} · ${Number(location.count||0).toLocaleString('pt-BR')} cliente(s)`);
        marker.bindPopup(`<strong>${escapeHtml(location.city)}/${escapeHtml(location.state||'')}</strong><br>${Number(location.count||0).toLocaleString('pt-BR')} cliente(s)<br><small>Clique novamente no ranking para abrir os clientes.</small>`);
        marker.on('click',()=>{selectedCustomerLocation=location;});
        marker.addTo(map);markers.push(marker);
      });
      if(markers.length){const group=window.L.featureGroup(markers);map.fitBounds(group.getBounds().pad(.10),{maxZoom:8});}
      else map.setView([-14.2,-51.9],4);
      setTimeout(()=>map.invalidateSize(),60);
    }catch(error){
      stage.innerHTML=`<div class="dashboard-map-fallback"><strong>Não foi possível montar o mapa geral.</strong><span>${escapeHtml(error.message||'A lista por cidade continua disponível ao lado.')}</span><button type="button" class="dashboard-map-open" data-back-city-list>Voltar à cidade</button></div>`;
      stage.querySelector('[data-back-city-list]')?.addEventListener('click',()=>renderCityPanel(selectedCustomerLocation||customerLocations[0]));
    }
  }

  function renderLocationRanking(data){
    const host=document.querySelector('[data-customer-map-ranking]');
    if(!host)return;
    const locations=Array.isArray(data.locations)?data.locations:[];
    customerLocations=locations;
    const max=Math.max(1,...locations.map(item=>Number(item.count||0)));
    host.innerHTML=`<div class="dashboard-location-summary"><strong>${Number(data.locatedCustomers||0).toLocaleString('pt-BR')}</strong><span>clientes com cidade cadastrada</span><small>${Number(data.withoutCity||0).toLocaleString('pt-BR')} sem cidade informada · ${locations.length} cidade(s)</small></div>
      <div class="dashboard-location-tools"><button type="button" data-all-cities-map>🗺️ Mapa geral</button><input type="search" placeholder="Buscar cidade…" data-location-search></div>
      <div class="dashboard-location-list" data-location-list></div>`;
    const list=host.querySelector('[data-location-list]');
    const drawRows=(query='')=>{
      const normalized=normalizeGeo(query);
      const visible=locations.filter(item=>!normalized||normalizeGeo(`${item.city} ${item.state}`).includes(normalized));
      list.innerHTML=visible.map(item=>{
        const index=locations.indexOf(item);
        return `<button type="button" class="dashboard-location-row${selectedCustomerLocation===item?' active':''}" data-location-index="${index}" title="Ver clientes de ${escapeHtml(item.city)}"><span><b>${escapeHtml(item.city)}</b><small>${escapeHtml(item.state||'')}</small></span><i><u style="width:${Math.max(4,(Number(item.count||0)/max)*100).toFixed(1)}%"></u></i><strong>${Number(item.count||0).toLocaleString('pt-BR')}</strong></button>`;
      }).join('')||'<div class="dashboard-city-empty">Nenhuma cidade encontrada.</div>';
      list.querySelectorAll('[data-location-index]').forEach(button=>button.addEventListener('click',()=>{
        const item=locations[Number(button.dataset.locationIndex)||0];
        if(!item)return;
        selectedCustomerLocation=item;
        list.querySelectorAll('[data-location-index]').forEach(row=>row.classList.toggle('active',row===button));
        renderCityPanel(item);
      }));
    };
    drawRows();
    host.querySelector('[data-location-search]')?.addEventListener('input',event=>drawRows(event.target.value));
    host.querySelector('[data-all-cities-map]')?.addEventListener('click',openAllCitiesMap);
    selectedCustomerLocation=locations[0]||null;
    renderCityPanel(selectedCustomerLocation);
  }

  async function loadCustomerLocations(){
    if(customerLocationsLoaded||customerLocationsLoading)return;
    customerLocationsLoading=true;
    const stage=document.querySelector('[data-customer-map-stage]');
    if(stage)stage.innerHTML='<div class="dashboard-map-loading">Carregando concentração de clientes…</div>';
    try{
      const response=await fetch('/api/dashboard/customer-locations',{headers:{Accept:'application/json'}});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível carregar as localizações.');
      renderLocationRanking(data);
      customerLocationsLoaded=true;
    }catch(error){
      if(stage)stage.innerHTML=`<div class="dashboard-map-fallback"><strong>Não foi possível carregar as cidades.</strong><span>${escapeHtml(error.message||'Tente novamente mais tarde.')}</span></div>`;
    }finally{customerLocationsLoading=false;}
  }

  function render(data){
    const d=data.dashboard;
    setPeriodUI(d.range.preset);
    metric('revenue',d.metrics.revenue,true);
    metric('salesCount',d.metrics.salesCount,false);
    const salesBreakdown=document.querySelector('[data-metric-breakdown="sales"]');
    if(salesBreakdown){
      const sales=Number(d.metrics.saleCount||0);
      const serviceOrders=Number(d.metrics.serviceOrderCount||0);
      salesBreakdown.textContent=`${sales} ${sales===1?'venda':'vendas'} + ${serviceOrders} O.S. = ${sales+serviceOrders}`;
    }
    metric('accountsReceivable',d.metrics.accountsReceivable,true);
    metric('accountsPayable',d.metrics.accountsPayable,true);
    metric('accountsPaid',d.metrics.accountsPaid,true);
    const revenueLink=document.querySelector('[data-metric-link="revenue"]');
    if(revenueLink) revenueLink.href=`/erp/centro-operacoes?tipo=all&situacao=finalized&de=${d.range.from}&ate=${d.range.to}`;
    const salesLink=document.querySelector('[data-metric-link="sales"]');
    if(salesLink) salesLink.href=`/erp/centro-operacoes?tipo=all&situacao=finalized&de=${d.range.from}&ate=${d.range.to}`;
    const paidLink=document.querySelector('[data-metric-link="accountsPaid"]');
    if(paidLink) paidLink.href=`/erp/financeiro/contas-a-pagar?view=paid&status=paid&dueFrom=${encodeURIComponent(d.range.from)}&dueTo=${encodeURIComponent(d.range.to)}`;
    attentionPage=0;
    agendaPage=0;
    renderAgenda(d.agenda||{});
    renderAttention(d.attention||[]);
    renderRanking(d.ranking||{byValue:[],byCount:[]});
    renderChart(d.revenueChart||[],d.revenueChartRange);
  }

  async function load(period,{pushState=false}={}){
    if(controller) controller.abort();
    controller=new AbortController();
    setPeriodUI(period);
    setLoading(true);
    try{
      const response=await fetch(`/api/dashboard?periodo=${encodeURIComponent(period)}`,{headers:{Accept:'application/json'},signal:controller.signal});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!data.ok) throw new Error(data.error||'Falha ao carregar dashboard');
      render(data);
      if(pushState){
        const url=new URL(window.location.href);
        if(period==='month') url.searchParams.delete('periodo'); else url.searchParams.set('periodo',period);
        history.pushState({period},'',url);
      }
    }catch(error){
      if(error.name==='AbortError') return;
      console.error('Dashboard:',error);
      const host=document.querySelector('[data-attention-list]');
      if(host) host.innerHTML='<div class="attention-empty">Não foi possível carregar os indicadores. A navegação do ERP continua disponível normalmente.</div>';
      const agendaHost=document.querySelector('[data-agenda-list]');
      if(agendaHost) agendaHost.innerHTML='<div class="attention-empty">Não foi possível carregar a agenda agora.</div>';
    }finally{ setLoading(false); }
  }

  document.querySelectorAll('[data-period]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault(); load(link.dataset.period,{pushState:true});
  }));

  document.querySelectorAll('[data-ranking]').forEach(button=>button.addEventListener('click',()=>{
    rankingMode=button.dataset.ranking;
    document.querySelectorAll('[data-ranking]').forEach(item=>item.classList.toggle('active',item===button));
    document.querySelectorAll('[data-ranking-list]').forEach(list=>{ list.hidden=list.dataset.rankingList!==rankingMode; });
  }));

  const customerMapDetails=document.querySelector('[data-customer-map-details]');
  customerMapDetails?.addEventListener('toggle',()=>{
    if(customerMapDetails.open) loadCustomerLocations();
  });

  window.addEventListener('popstate',()=>{
    const period=new URLSearchParams(location.search).get('periodo')||'month';
    load(period);
  });

  setPeriodUI(activePeriod);
  requestAnimationFrame(()=>load(activePeriod));
})();
