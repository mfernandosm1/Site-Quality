(()=>{
  const root=document.querySelector('[data-reports-page]'); if(!root)return;
  const form=document.getElementById('reportsFilters'),sellerSelect=document.getElementById('reportsSeller');
  const summary=document.getElementById('reportsSummary'),body=document.getElementById('reportsBody'),context=document.getElementById('reportsContext');
  const tabs=[...document.querySelectorAll('[data-report-view]')];
  const topFilter=document.querySelector('[data-top-filter]'),staleFilter=document.querySelector('[data-stale-filter]'),productSortFilter=document.querySelector('[data-product-sort-filter]'),customerInactiveRangeFilter=document.querySelector('[data-customer-inactive-range-filter]'),customerInactiveSortFilter=document.querySelector('[data-customer-inactive-sort-filter]'),customerModeFilter=document.querySelector('[data-customer-mode-filter]'),customerWindowFilter=document.querySelector('[data-customer-window-filter]'),movementFilter=document.querySelector('[data-movement-filter]'),sellerFilter=document.querySelector('[data-seller-filter]'),searchFilter=document.querySelector('[data-search-filter]'),dateFilters=[...document.querySelectorAll('[data-date-filter]')];
  const productKindInput=document.getElementById('reportsProductKind'),turnoverViewInput=document.getElementById('reportsTurnoverView'),quickPeriodButtons=[...document.querySelectorAll('[data-report-period]')];
  const defaults=window.QUALITY_REPORT_DEFAULTS||{};
  const views=new Set(['overview','profitability','products','turnover','sellers','discounts','sales','payments','purchases','returns','expenses','health','customers','counts','audit']);
  let activeView=views.has(location.hash.slice(1))?location.hash.slice(1):'overview';
  let currentData=null,requestToken=0;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const number=(value,digits=0)=>Number(value||0).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const pct=value=>`${number(value,1)}%`;
  const date=value=>{if(!value)return '—';const [y,m,d]=String(value).slice(0,10).split('-');return y&&m&&d?`${d}/${m}/${y}`:String(value)};
  const typeLabel=value=>value==='service_order'?'O.S.':'Venda';
  const statusLabel=value=>({atypical:'Estoque atípico',stale:'Sem giro',no_sales:'Sem venda no período',slow:'Baixo giro',high:'Giro alto',normal:'Giro regular',empty:'Sem estoque / sem movimento'})[value]||value||'Giro regular';
  const currentFilters=()=>{
    const values=Object.fromEntries(new FormData(form).entries());
    if(movementFilter?.hidden)values.type='all';
    if(sellerFilter?.hidden)values.seller='all';
    if(searchFilter?.hidden)values.q='';
    return values;
  };
  const card=(label,value,help='',tone='')=>`<article class="report-stat ${tone}"><span>${esc(label)}</span><strong>${esc(value)}</strong>${help?`<small>${esc(help)}</small>`:''}</article>`;
  const panel=(title,subtitle,content,note='')=>`<section class="report-panel"><header><div><h2>${esc(title)}</h2>${subtitle?`<small>${esc(subtitle)}</small>`:''}</div></header>${content}${note?`<div class="report-note">${esc(note)}</div>`:''}</section>`;
  const empty=(message='Nenhum registro encontrado para os filtros selecionados.')=>`<div class="report-empty">${esc(message)}</div>`;
  const productCell=row=>`<div class="report-product-cell"><b>${esc(row.product||'Produto')}</b><small>${esc([row.code,row.brand,row.category,row.productRemoved?'Cadastro removido':''].filter(Boolean).join(' · '))}</small></div>`;
  const operationLink=row=>row.operationId?`<a href="/erp/centro-operacoes?operacao=${encodeURIComponent(row.operationId)}">#${esc(row.number)}</a>`:`#${esc(row.number)}`;
  const sourceBadge=row=>`<span class="report-source-badge ${row?.historical?'wm10':'erp'}">${esc(row?.historical?'WM10 histórico':'Quality ERP')}</span>`;
  const foldSection=(title,subtitle,badge,content,{note='',tone=1,open=false}={})=>`<details class="report-fold-section tone-${tone}" ${open?'open':''}><summary><span><b>${esc(title)}</b><small>${esc(subtitle||'')}</small></span><strong>${esc(badge||'')}</strong></summary><div class="report-fold-content">${content}${note?`<div class="report-note">${esc(note)}</div>`:''}</div></details>`;
  const historyBanner=history=>history?.included?`<div class="report-history-banner"><span>📦</span><div><b>Histórico financeiro importado da WM10</b><small>Somente leitura e somente para Resumo/Lucratividade até ${date(history.cutoff)}. Não alimenta comissões, vendedores, produtos, estoque ou formas de pagamento.</small></div></div>`:(history?.scopedOut?`<div class="report-history-banner"><span>ℹ️</span><div><b>Histórico WM10 não misturado nesta consulta</b><small>Ao filtrar vendedor ou texto específico, o relatório mostra somente o Quality ERP para evitar comparar dados globais antigos com uma visão específica.</small></div></div>`:'');

  function table(headers,rows,{footer=null,className='',wrapClass=''}={}){
    if(!rows.length)return empty();
    const head=`<thead><tr>${headers.map(h=>`<th class="${h.num?'num':''}">${esc(h.label)}</th>`).join('')}</tr></thead>`;
    const bodyRows=rows.map((row,rowIndex)=>`<tr>${headers.map(h=>`<td class="${[h.num?'num':'',h.className||''].filter(Boolean).join(' ')}">${h.html?h.html(row,rowIndex):esc(h.value?row[h.value]??'—':'—')}</td>`).join('')}</tr>`).join('');
    const foot=footer?`<tfoot><tr>${headers.map((h,index)=>`<td class="${h.num?'num':''}">${footer(h,index)}</td>`).join('')}</tr></tfoot>`:'';
    return `<div class="report-table-wrap ${wrapClass}"><table class="report-table ${className}">${head}<tbody>${bodyRows}</tbody>${foot}</table></div>`;
  }

  function setSellerOptions(items=[]){
    const selected=sellerSelect.value||'all';
    const normalized=(items||[]).filter(Boolean).map(item=>typeof item==='string'?{value:item,name:item,legacy:true}:item).filter(item=>item?.value&&item?.name);
    sellerSelect.innerHTML='<option value="all">Todos</option>'+normalized.map(item=>`<option value="${esc(item.value)}">${esc(item.name)}${item.legacy?' · histórico':''}</option>`).join('');
    sellerSelect.value=normalized.some(item=>item.value===selected)?selected:'all';
  }

  function renderContext(data){
    const f=data.filters||currentFilters(),selectedSeller=sellerSelect?.selectedOptions?.[0]?.textContent?.replace(/ · histórico$/,'')||'';
    const range=`${date(f.from)} a ${date(f.to)}`;
    const movement=f.type==='all'?'Vendas + O.S.':f.type==='sale'?'Vendas':'O.S.';
    const salesViews=new Set(['overview','profitability','products','sellers','discounts','sales','payments']);
    const labels=activeView==='customers'?[]:[range];
    if(salesViews.has(activeView)){
      labels.push(movement);
      if(f.seller&&f.seller!=='all')labels.push(`Vendedor: ${selectedSeller||f.seller}`);else labels.push('Todos os vendedores');
    }else if(activeView==='purchases')labels.push('Data da NF/XML quando houver; data de cadastro quando não houver documento fiscal');
    else if(activeView==='returns')labels.push('Trocas/devoluções registradas no período · crédito líquido dos itens');
    else if(activeView==='expenses')labels.push('Contas a Pagar classificadas como despesa');
    else if(activeView==='health')labels.push('Leitura gerencial do Quality ERP · não substitui a contabilidade');
    else if(activeView==='turnover')labels.push('Movimentações de estoque');
    else if(activeView==='customers'){
      const mode={inactive:'Reativação',frequency:'Mais retornam',quantity:'Mais itens comprados',value:'Maior valor'}[f.customerMode]||'Clientes';
      const windowLabel=f.customerWindow==='all'?'Todo o histórico':f.customerWindow==='30'?'30 dias':f.customerWindow==='90'?'3 meses':f.customerWindow==='180'?'6 meses':f.customerWindow==='270'?'9 meses':'12 meses';
      const rangeLabel={_:'', '30plus':'30+ dias','30_59':'30–59 dias','60_89':'60–89 dias','90_179':'90–179 dias','180_299':'180–299 dias','300plus':'300+ dias','never':'Nunca compraram'}[f.customerInactiveRange]||'30+ dias';
      labels.push(mode); if(f.customerMode==='inactive')labels.push(rangeLabel);else labels.push(windowLabel);
    }
    else if(activeView==='counts')labels.push('Histórico de contagens');
    else if(activeView==='audit')labels.push('Auditoria do sistema');
    if(f.q)labels.push(`Busca: “${f.q}”`);
    context.textContent=labels.join(' · ');
  }

  function renderOverview(data){
    const c=data.cards||{},timeline=data.timeline||[],historicalNote=historyBanner(data.history);
    const revenueHelp=data.history?.included?`${money(c.historicalRevenue||0)} históricos + ${money(c.currentRevenue||0)} do ERP`:'Valor líquido vendido';
    summary.innerHTML=card('Faturamento',money(c.revenue),revenueHelp,'info')+card('Custo vendido',money(c.cost),'Custo histórico/registrado nos itens')+card('Lucro bruto',money(c.profit),`Margem ${pct(c.margin)}`,c.profit>=0?'positive':'negative')+card('Descontos',money(c.discount),'Descontos registrados','negative')+card('Vendas / O.S.',number(c.sales),'Operações concluídas')+card('Itens',number(c.items,Number(c.items)%1?1:0),'Quantidade vendida')+card('Ticket médio',money(c.ticket),'Média por operação');
    if(!timeline.length){body.innerHTML=historicalNote+panel('Evolução mensal','Receita, custo e lucro por mês',empty());return;}
    const max=Math.max(1,...timeline.map(row=>row.revenue));
    const chart=`<div class="report-chart">${timeline.map(row=>`<div class="report-chart-row"><span>${esc(row.label)}${row.historical?' · WM10':''}</span><div class="report-chart-track"><i style="width:${Math.max(2,Math.min(100,row.revenue/max*100))}%"></i></div><b>${money(row.revenue)}</b></div>`).join('')}</div>`;
    const t=table([
      {label:'Mês',value:'label'},{label:'Origem',html:r=>sourceBadge(r)},{label:'Faturamento',num:true,html:r=>money(r.revenue)},{label:'Custo',num:true,html:r=>money(r.cost)},{label:'Lucro',num:true,html:r=>`<span class="${r.profit>=0?'positive':'negative'}">${money(r.profit)}</span>`},{label:'Margem',num:true,html:r=>pct(r.margin)},{label:'Descontos',num:true,html:r=>money(r.discount)}
    ],timeline,{wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=historicalNote+panel('Evolução mensal','Compare os meses do histórico importado com a operação atual do Quality ERP',chart+t,'Dados WM10 são apenas informativos e nunca são gravados novamente nos módulos operacionais.');
  }

  function renderProfitability(data){
    const t=data.totals||{},rows=data.items||[],historicalNote=historyBanner(data.history);
    summary.innerHTML=card('Faturamento',money(t.revenue),data.history?.included?'WM10 histórico + Quality ERP':'Receita líquida','info')+card('Custo',money(t.cost),'CMV dos itens')+card('Lucro bruto',money(t.profit),`Margem ${pct(t.margin)}`,t.profit>=0?'positive':'negative')+card('Markup',t.markup===null?'—':number(t.markup,2),'Venda ÷ custo')+card('Descontos',money(t.discount),'Total registrado','negative');
    const content=table([
      {label:'Mês/Ano',value:'label'},{label:'Origem',html:r=>sourceBadge(r)},{label:'Preço de compra',num:true,html:r=>money(r.cost)},{label:'Preço de venda',num:true,html:r=>money(r.revenue)},{label:'Resultado',num:true,html:r=>`<span class="${r.profit>=0?'positive':'negative'}">${money(r.profit)}</span>`},{label:'Margem',num:true,html:r=>pct(r.margin)},{label:'Markup',num:true,html:r=>r.markup===null?'—':number(r.markup,2)},{label:'Vendas',num:true,html:r=>number(r.salesCount)},{label:'Itens',num:true,html:r=>number(r.itemCount,Number(r.itemCount)%1?1:0)}
    ],rows,{footer:(h,i)=>i===0?'Total':i===2?money(t.cost):i===3?money(t.revenue):i===4?money(t.profit):i===5?pct(t.margin):i===6?(t.markup===null?'—':number(t.markup,2)):'',wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=historicalNote+panel('Lucratividade','Até o mês anterior ao início do Quality ERP, os valores podem vir do arquivo histórico da WM10. A partir daí, usa somente o ERP atual.',content,'O histórico WM10 é somente leitura e não participa de comissões, vendedores, produtos, pagamentos ou estoque.');
  }

  function renderProducts(data){
    const t=data.totals||{},rows=data.items||[],kind=data.filters?.productKind||'all';
    summary.innerHTML=card('Unidades',number(t.quantity,Number(t.quantity)%1?1:0),'Itens do ranking')+card('Faturamento',money(t.revenue),kind==='service'?'Receita dos serviços':kind==='product'?'Receita dos produtos':'Receita do ranking','info')+card('Lucro',money(t.profit),`Margem ${pct(t.margin)}`,t.profit>=0?'positive':'negative')+card('Descontos',money(t.discount),'No ranking','negative');
    const segmented=`<div class="report-segmented no-print" data-product-kind-switch>
      <button type="button" data-kind="all" class="${kind==='all'?'active':''}">Visão geral</button>
      <button type="button" data-kind="product" class="${kind==='product'?'active':''}">📦 Produtos</button>
      <button type="button" data-kind="service" class="${kind==='service'?'active':''}">🛠️ Serviços</button>
    </div>`;
    const content=table([
      {label:'#',num:true,html:(_r,i)=>i+1},{label:kind==='service'?'Serviço':kind==='product'?'Produto':'Produto / serviço',html:productCell},{label:'Tipo',html:r=>r.kind==='service'?'Serviço':'Produto'},{label:'Qtd.',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Vendas',num:true,html:r=>number(r.salesCount)},{label:'Faturamento',num:true,html:r=>money(r.revenue)},{label:'Custo',num:true,html:r=>money(r.cost)},{label:'Lucro',num:true,html:r=>`<span class="${r.profit>=0?'positive':'negative'}">${money(r.profit)}</span>`},{label:'Margem',num:true,html:r=>pct(r.margin)},{label:'Desconto',num:true,html:r=>money(r.discount)},{label:'Estoque',num:true,html:r=>r.kind==='service'?'—':number(r.currentStock,Number(r.currentStock)%1?1:0)},{label:'Última venda',html:r=>date(r.lastSale)}
    ],rows);
    const sortLabels={quantity:'quantidade vendida',revenue:'faturamento',profit:'lucro',margin:'margem',discount:'desconto concedido'};
    const title=kind==='service'?'Serviços mais vendidos':kind==='product'?'Produtos mais vendidos':'Produtos e serviços mais vendidos';
    body.innerHTML=segmented+panel(title,`Ranking Top ${data.filters?.top||50} por ${sortLabels[data.filters?.productSort]||'quantidade vendida'}`,content,'Nomes e categorias acompanham o cadastro atual. Se um item histórico tiver sido removido do cadastro, ele permanece no histórico identificado como removido.');
    body.querySelectorAll('[data-product-kind-switch] [data-kind]').forEach(button=>button.addEventListener('click',()=>{
      if(productKindInput)productKindInput.value=button.dataset.kind||'all';
      load();
    }));
  }


  function renderTurnover(data){
    const t=data.totals||{},rows=data.items||[],counts=t.statusCounts||{},selected=data.filters?.turnoverView||'all';
    const atypicalHelp=t.atypicalStockUnits?`Exclui ${number(t.atypicalStockUnits,Number(t.atypicalStockUnits)%1?1:0)} unidade(s) atípicas dos indicadores`:'Unidades físicas válidas para análise';
    summary.innerHTML=card('Itens cadastrados',number(t.items),'Itens/variações com controle conhecido')+card('Estoque analisado',number(t.stock,Number(t.stock)%1?1:0),atypicalHelp,'info')+card('Vendidos no período',number(t.sold,Number(t.sold)%1?1:0),'Saídas classificadas como venda')+card('Capital em estoque',money(t.capitalAtCost),t.excludedItems?`Sem ${number(t.excludedItems)} saldo(s) fora da valorização`:'Pelo custo atual','info')+card('Capital sem giro',money(t.staleCapital),`${number(t.staleItems)} produto(s) sem venda/giro`,'negative')+(t.atypicalStockUnits?card('Estoque atípico',number(t.atypicalStockUnits,Number(t.atypicalStockUnits)%1?1:0),`${money(t.excludedCapital)} fora da valorização`,'warning'):'');
    const quick=[['all','Todos',counts.all],['no_sales','Sem vendas',counts.no_sales],['slow','Baixo giro',counts.slow],['normal','Giro regular',counts.normal],['high','Giro alto',counts.high],['atypical','Atípico',counts.atypical]];
    const quickHtml=`<div class="turnover-quick">${quick.map(([key,label,count])=>`<button type="button" data-turnover-view="${key}" class="${selected===key?'active':''}">${esc(label)} · ${number(count||0)}</button>`).join('')}</div>`;
    const headers=[
      {label:'Status',html:r=>`<span class="report-status ${esc(r.status)}">${esc(statusLabel(r.status))}</span>`},{label:'Produto',html:productCell},{label:'Estoque inicial',num:true,html:r=>number(r.openingStock,Number(r.openingStock)%1?1:0)},{label:'Comprado',num:true,html:r=>number(r.purchasedQty,Number(r.purchasedQty)%1?1:0)},{label:'Vendido',num:true,html:r=>number(r.soldQty,Number(r.soldQty)%1?1:0)},{label:'Estoque atual',num:true,html:r=>number(r.currentStock,Number(r.currentStock)%1?1:0)},{label:'Giro',num:true,html:r=>r.turnover===null?'—':number(r.turnover,2)},{label:'Cobertura',num:true,html:r=>r.coverageDays===null?'—':`${number(r.coverageDays,0)} dias`},{label:'Última venda',html:r=>date(r.lastSale)},{label:'Dias sem venda',num:true,html:r=>r.daysWithoutSale===null?'Nunca':number(r.daysWithoutSale)},{label:'Capital estoque',num:true,html:r=>r.valuationExcluded?`<span title="Saldo desconsiderado da valorização até revisão">${money(r.rawCapitalAtCost)} ⚠</span>`:money(r.capitalAtCost)}
    ];
    const groups=[
      {key:'atypical',title:'Estoque atípico',subtitle:'Saldos extremamente fora do padrão e excluídos dos indicadores financeiros até revisão',tone:'danger',rows:rows.filter(r=>r.status==='atypical')},
      {key:'no_sales',title:'Sem vendas no período',subtitle:`Itens com estoque atual e nenhuma saída de venda no período. “Sem giro” destaca quem passou de ${data.filters?.staleDays||90} dias.`,tone:'danger',rows:rows.filter(r=>r.currentStock>0&&r.soldQty<=0&&!r.atypicalStock)},
      {key:'slow',title:'Baixo giro',subtitle:'Itens que vendem, mas carregam cobertura elevada de estoque',tone:3,rows:rows.filter(r=>r.status==='slow')},
      {key:'normal',title:'Giro regular',subtitle:'Itens com vendas e giro dentro da faixa intermediária',tone:1,rows:rows.filter(r=>r.status==='normal')},
      {key:'high',title:'Giro alto',subtitle:'Itens com rotação forte no período',tone:'success',rows:rows.filter(r=>r.status==='high')},
      {key:'empty',title:'Sem estoque / sem movimento',subtitle:'Cadastros sem saldo e sem compras/vendas no período; ficam recolhidos para não poluir a análise',tone:4,rows:rows.filter(r=>r.status==='empty')}
    ].filter(group=>group.rows.length);
    const sections=groups.map(group=>foldSection(group.title,group.subtitle,`${number(group.rows.length)} item(ns)`,table(headers,group.rows,{wrapClass:'report-table-wrap-unbounded'}),{tone:group.tone,open:selected!=='all'})).join('');
    body.innerHTML=quickHtml+(sections||panel('Giro de Mercadorias / Estoque Parado','Nenhum item encontrado nesta visão.',empty()))+`<div class="report-note">O card <b>Estoque analisado</b> soma unidades físicas controladas, mas exclui saldos atípicos como o operacional de 9.998 unidades. O saldo físico bruto atual é ${number(t.physicalStock,Number(t.physicalStock)%1?1:0)} unidade(s); ${number(t.atypicalStockUnits||0,Number(t.atypicalStockUnits||0)%1?1:0)} estão marcadas como atípicas e ficam fora dos indicadores até revisão.</div>`;
    body.querySelectorAll('[data-turnover-view]').forEach(button=>button.addEventListener('click',()=>{if(turnoverViewInput)turnoverViewInput.value=button.dataset.turnoverView||'all';load();}));
  }

  function renderSellers(data){
    const t=data.totals||{},rows=data.items||[];
    summary.innerHTML=card('Faturamento',money(t.revenue),'Equipe no período','info')+card('Vendas',number(t.salesCount),'Operações únicas')+card('Itens',number(t.itemCount,Number(t.itemCount)%1?1:0),'Produtos/serviços')+card('Lucro',money(t.profit),'Resultado bruto',t.profit>=0?'positive':'negative')+card('Descontos',money(t.discount),'Concedidos pela equipe','negative');
    const content=table([
      {label:'Vendedor',value:'seller'},{label:'Vendas',num:true,html:r=>number(r.salesCount)},{label:'Itens',num:true,html:r=>number(r.itemCount,Number(r.itemCount)%1?1:0)},{label:'P.A.',num:true,html:r=>number(r.pa,2)},{label:'Faturamento',num:true,html:r=>money(r.revenue)},{label:'Ticket médio',num:true,html:r=>money(r.ticket)},{label:'Participação',num:true,html:r=>pct(r.participation)},{label:'Descontos',num:true,html:r=>money(r.discount)},{label:'Lucro',num:true,html:r=>`<span class="${r.profit>=0?'positive':'negative'}">${money(r.profit)}</span>`},{label:'Margem',num:true,html:r=>pct(r.margin)}
    ],rows);
    body.innerHTML=panel('Desempenho de Vendedores','Aproveitamento, P.A., ticket, participação, descontos e rentabilidade na mesma visão.',content);
  }

  function renderDiscounts(data){
    const t=data.totals||{},rows=data.items||[],detail=data.detail||[];
    summary.innerHTML=card('Valor original',money(t.gross),'Antes dos descontos')+card('Descontos',money(t.discount),pct(t.discountPercent),'negative')+card('Venda líquida',money(t.revenue),'Depois dos descontos','info');
    const ranking=table([
      {label:'Vendedor',value:'seller'},{label:'Vendas',num:true,html:r=>number(r.salesCount)},{label:'Com desconto',num:true,html:r=>number(r.salesWithDiscount)},{label:'Valor original',num:true,html:r=>money(r.gross)},{label:'Descontos',num:true,html:r=>`<span class="negative">${money(r.discount)}</span>`},{label:'% médio',num:true,html:r=>pct(r.discountPercent)},{label:'Maior % em item',num:true,html:r=>pct(r.maxDiscountPercent)},{label:'Venda líquida',num:true,html:r=>money(r.revenue)}
    ],rows);
    const details=table([
      {label:'Data',html:r=>date(r.date)},{label:'Venda',html:operationLink},{label:'Vendedor',value:'seller'},{label:'Produto',html:productCell},{label:'Original',num:true,html:r=>money(r.gross)},{label:'Desconto',num:true,html:r=>`<span class="negative">${money(r.discount)}</span>`},{label:'% desconto',num:true,html:r=>pct(r.gross?100*r.discount/r.gross:0)},{label:'Líquido',num:true,html:r=>money(r.revenue)}
    ],detail);
    body.innerHTML=panel('Quem mais está dando desconto?','Ranking por vendedor',ranking)+`<div style="height:12px"></div>`+panel('Itens com desconto','Maiores descontos do período',details);
  }

  function renderSales(data){
    const t=data.totals||{},rows=data.items||[];
    summary.innerHTML=card('Venda líquida',money(t.revenue),'Total dos itens','info')+card('Custo',money(t.cost),'Custo histórico')+card('Lucro',money(t.profit),`Margem ${pct(t.margin)}`,t.profit>=0?'positive':'negative')+card('Descontos',money(t.discount),'Total concedido','negative')+card('Itens',number(t.quantity,Number(t.quantity)%1?1:0),`${number(data.totalRows||rows.length)} linha(s)`);
    const content=table([
      {label:'Data',html:r=>date(r.date)},{label:'Venda',html:operationLink},{label:'Tipo',html:r=>typeLabel(r.type)},{label:'Cliente',value:'customer'},{label:'Vendedor',value:'seller'},{label:'Produto',html:productCell},{label:'Qtd.',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Custo',num:true,html:r=>money(r.cost)},{label:'Original',num:true,html:r=>money(r.gross)},{label:'Desconto',num:true,html:r=>money(r.discount)},{label:'Líquido',num:true,html:r=>money(r.revenue)},{label:'Lucro',num:true,html:r=>`<span class="${r.profit>=0?'positive':'negative'}">${money(r.profit)}</span>`},{label:'Margem',num:true,html:r=>pct(r.margin)}
    ],rows);
    body.innerHTML=panel('Vendas Detalhadas','Substitui as visões separadas de “Itens da Venda” e “Custo e Venda Detalhado”.',content,data.truncated?`Mostrando 1.000 de ${data.totalRows} linhas. Refine os filtros para ver um período mais específico.`:'');
  }

  function renderPayments(data){
    const t=data.totals||{},rows=data.items||[];
    summary.innerHTML=card('Total nas formas',money(t.total),'Valores informados nas operações','info')+card('Lançamentos',number(t.count),'Linhas de pagamento')+card('Vendas / O.S.',number(t.salesCount),'Operações concluídas');
    const content=table([
      {label:'Forma de pagamento',value:'name'},{label:'Vendas / O.S.',num:true,html:r=>number(r.salesCount)},{label:'Lançamentos',num:true,html:r=>number(r.count)},{label:'Total',num:true,html:r=>money(r.total)},{label:'Participação',num:true,html:r=>pct(r.participation)}
    ],rows,{footer:(h,i)=>i===0?'Total':i===3?money(t.total):''});
    body.innerHTML=panel('Formas de Pagamento na Venda','Participação das formas informadas no fechamento das vendas e O.S.',content,'Esta visão representa a forma negociada na venda. Recebimentos efetivos de crediário continuam no Contas a Receber / Fluxo de Caixa.');
  }

  function renderPurchases(data){
    const t=data.totals||{},rows=data.items||[],suppliers=data.bySupplier||[],responsibles=data.byResponsible||[],periods=data.byPeriod||[],comparisons=data.comparisons||[],paidMore=data.paidMore||[],boughtBetter=data.boughtBetter||[],trends=data.costTrends||[],topPurchased=data.topPurchased||[];
    const loss=t.topLoss,saving=t.topSaving;
    summary.innerHTML=card('Compras',number(t.purchases),'Concluídas no período','info')+
      card('Itens',number(t.itemCount,Number(t.itemCount)%1?1:0),'Quantidade comprada')+
      card('Valor',money(t.total),'Total comprado','info')+
      card('Ticket médio',money(t.averageTicket),'Média por compra','warning')+
      card('Fornecedores',number(t.supplierCount),'Fornecedores usados')+
      card('NF / XML',number(t.withFiscal),`${number(t.manual)} manual(is)`,t.manual?'warning':'positive')+
      (t.topResponsible?.responsible?card('Quem mais comprou',t.topResponsible.responsible,`${money(t.topResponsible.total)} · ${number(t.topResponsible.purchases)} compra(s)`,'info'):'')+
      (loss&&loss.extraPaid>0?card('Onde paguei mais',`${money(loss.extraPaid)} a mais`,`${loss.product} · ${loss.highestSupplier}: ${money(loss.highestCost)} vs melhor ${money(loss.bestCost)}`,'negative'):'')+
      (saving&&saving.savedVsHighest>0?card('Onde comprei melhor',`${money(saving.savedVsHighest)} abaixo`,`${saving.product} · ${saving.bestSupplier}: ${money(saving.bestCost)} vs mais caro ${money(saving.highestCost)}`,'positive'):'');
    if(!rows.length){body.innerHTML=panel('Compras','Análise de compras e fornecedores',empty());return;}
    const productTable=table([
      {label:'#',num:true,html:(_r,i)=>i+1},{label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.variation,r.removed?'Cadastro removido':''].filter(Boolean).join(' · '))}</small></div>`},{label:'Qtd. comprada',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Compras',num:true,html:r=>number(r.purchases)},{label:'Fornecedores',num:true,html:r=>number(r.suppliers)},{label:'Valor comprado',num:true,html:r=>money(r.total)},{label:'Custo médio',num:true,html:r=>money(r.averageCost)},{label:'Última compra',html:r=>`<div class="report-product-cell"><b>${date(r.lastPurchase)}</b><small>${esc(r.lastSupplier||'')}</small></div>`}
    ],topPurchased,{wrapClass:'report-table-wrap-unbounded'});
    const comparisonTable=table([
      {label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.variation,r.removed?'Cadastro removido':''].filter(Boolean).join(' · '))}</small></div>`},
      {label:'Fornecedores / custo médio',html:r=>`<div class="report-comparison-suppliers">${(r.suppliers||[]).map((supplier,index)=>`<span class="${index===0?'best':''}" title="${supplier.extraVsBest>0?`Neste período, este fornecedor ficou ${money(supplier.extraVsBest)} acima do menor custo observado para as unidades compradas.`:'Menor custo médio observado no período.'}">${esc(supplier.supplier)}: ${money(supplier.averageCost)}</span>`).join('')}</div>`},
      {label:'Melhor preço',num:true,html:r=>`<span class="positive">${money(r.bestCost)}</span>`},{label:'Maior preço',num:true,html:r=>`<span class="negative">${money(r.highestCost)}</span>`},{label:'Diferença unit.',num:true,html:r=>`${money(r.spread)} · ${pct(r.spreadPercent)}`},{label:'Quanto paguei a mais',num:true,html:r=>r.extraPaid>0?`<span class="negative">${money(r.extraPaid)}</span>`:'—'},{label:'Quanto ficou abaixo do mais caro',num:true,html:r=>r.savedVsHighest>0?`<span class="positive">${money(r.savedVsHighest)}</span>`:'—'}
    ],comparisons,{wrapClass:'report-table-wrap-unbounded'});
    const paidMoreTable=table([
      {label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.variation].filter(Boolean).join(' · '))}</small></div>`},{label:'Fornecedor onde pagou mais',html:r=>esc(r.supplier)},{label:'Qtd.',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Custo médio pago',num:true,html:r=>`<span class="negative">${money(r.averageCost)}</span>`},{label:'Melhor fornecedor observado',html:r=>esc(r.bestSupplier)},{label:'Melhor preço',num:true,html:r=>`<span class="positive">${money(r.bestCost)}</span>`},{label:'Diferença unit.',num:true,html:r=>`${money(r.differenceUnit)} · ${pct(r.differencePercent)}`},{label:'Total pago a mais',num:true,html:r=>`<span class="negative">${money(r.extraPaid)}</span>`},{label:'Última compra',html:r=>date(r.lastDate)}
    ],paidMore,{wrapClass:'report-table-wrap-unbounded'});
    const boughtBetterTable=table([
      {label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.variation].filter(Boolean).join(' · '))}</small></div>`},{label:'Fornecedor melhor',html:r=>`<span class="positive">${esc(r.supplier)}</span>`},{label:'Qtd.',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Preço comprado',num:true,html:r=>`<span class="positive">${money(r.averageCost)}</span>`},{label:'Fornecedor mais caro observado',html:r=>esc(r.highestSupplier)},{label:'Preço mais alto',num:true,html:r=>money(r.highestCost)},{label:'Diferença unit.',num:true,html:r=>`${money(r.differenceUnit)} · ${pct(r.differencePercent)}`},{label:'Diferença favorável',num:true,html:r=>`<span class="positive">${money(r.advantage)}</span>`},{label:'Última compra',html:r=>date(r.lastDate)}
    ],boughtBetter,{wrapClass:'report-table-wrap-unbounded'});
    const trendTable=table([
      {label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.variation].filter(Boolean).join(' · '))}</small></div>`},{label:'Primeira compra',html:r=>`${date(r.firstDate)} · ${money(r.firstCost)}`},{label:'Última compra',html:r=>`${date(r.lastDate)} · ${money(r.lastCost)}`},{label:'Variação',num:true,html:r=>`<span class="${r.change<=0?'positive':'negative'}">${r.change>=0?'+':''}${money(r.change)} · ${r.changePercent>=0?'+':''}${pct(r.changePercent)}</span>`},{label:'Menor custo',num:true,html:r=>money(r.minCost)},{label:'Maior custo',num:true,html:r=>money(r.maxCost)},{label:'Compras',num:true,html:r=>number(r.purchases)}
    ],trends,{wrapClass:'report-table-wrap-unbounded'});
    const responsibleTable=table([{label:'Responsável',value:'responsible'},{label:'Compras',num:true,html:r=>number(r.purchases)},{label:'Itens',num:true,html:r=>number(r.items,Number(r.items)%1?1:0)},{label:'Total',num:true,html:r=>money(r.total)},{label:'Ticket médio',num:true,html:r=>money(r.averageTicket)},{label:'Última compra',html:r=>date(r.lastPurchase)}],responsibles,{wrapClass:'report-table-wrap-unbounded'});
    const periodTable=table([{label:'Período',value:'label'},{label:'Compras',num:true,html:r=>number(r.purchases)},{label:'Itens',num:true,html:r=>number(r.items,Number(r.items)%1?1:0)},{label:'Valor',num:true,html:r=>money(r.total)},{label:'Ticket médio',num:true,html:r=>money(r.averageTicket)}],periods,{wrapClass:'report-table-wrap-unbounded'});
    const supplierTable=table([{label:'Fornecedor',value:'supplier'},{label:'Compras',num:true,html:r=>number(r.purchases)},{label:'Itens',num:true,html:r=>number(r.items,Number(r.items)%1?1:0)},{label:'Total',num:true,html:r=>money(r.total)},{label:'Ticket médio',num:true,html:r=>money(r.averageTicket)},{label:'Última compra',html:r=>date(r.lastPurchase)}],suppliers,{wrapClass:'report-table-wrap-unbounded'});
    const detailTable=table([{label:'Data usada',html:r=>`<div class="report-product-cell"><b>${date(r.date)}</b><small>${esc(r.dateSource)}</small></div>`},{label:'Compra',value:'number'},{label:'Fornecedor',value:'supplier'},{label:'NF',html:r=>esc(r.invoiceNumber||'—')},{label:'Responsável',value:'responsible'},{label:'Itens',num:true,html:r=>number(r.itemCount,Number(r.itemCount)%1?1:0)},{label:'Total',num:true,html:r=>money(r.total)}],rows,{wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=foldSection('Produtos mais comprados','Ranking somente pelas entradas de compra; não depende de venda nem de saída de estoque',`${number(topPurchased.length)} item(ns)`,productTable,{tone:1,open:true})+
      (paidMore.length?foldSection('🔴 Onde paguei mais','Lista todos os casos em que uma compra ficou acima do melhor custo médio observado para o mesmo item/variação',`${number(paidMore.length)} caso(s)`,paidMoreTable,{tone:'danger',note:'“Total pago a mais” considera somente as unidades realmente compradas naquele fornecedor e compara com o melhor custo médio observado no período.'}):'')+
      (boughtBetter.length?foldSection('🟢 Onde comprei melhor','Itens comprados no fornecedor de menor custo observado e a diferença para o fornecedor mais caro do mesmo período',`${number(boughtBetter.length)} item(ns)`,boughtBetterTable,{tone:'success',note:'A diferença favorável é uma referência de negociação: mostra quanto essas unidades ficaram abaixo do maior custo médio observado, não uma economia contábil garantida.'}):'')+
      (comparisons.length?foldSection('Comparativo completo por fornecedor','Matriz do mesmo produto/variação em todos os fornecedores usados no período',`${number(comparisons.length)} comparação(ões)`,comparisonTable,{tone:2,note:'Use esta visão para conferir todos os preços médios lado a lado. Preços podem mudar entre datas, lotes e condições comerciais.'}):'')+
      (trends.length?foldSection('Evolução do custo de compra','Itens comprados mais de uma vez e como o custo mudou',`${number(trends.length)} item(ns)`,trendTable,{tone:3}):'')+
      foldSection('Compras por responsável','Quem cadastrou/concluiu as compras no sistema',`${number(responsibles.length)} responsável(is)`,responsibleTable,{tone:4,note:'Registros anteriores ao login multiusuário podem aparecer como Sistema / legado.'})+
      foldSection('Compras por período','A data usada é a emissão da NF/XML quando existe documento fiscal; sem NF, usa a data de cadastro no ERP',`${number(periods.length)} período(s)`,periodTable,{tone:1})+
      foldSection('Compras por fornecedor','Concentração de reposição e ticket médio por fornecedor',`${number(suppliers.length)} fornecedor(es)`,supplierTable,{tone:2})+
      foldSection('Compras detalhadas','Documento, responsável e origem da data de cada compra',`${number(rows.length)} compra(s)`,detailTable,{tone:1});
  }

  function renderReturns(data){
    const t=data.totals||{},products=data.products||[],reasons=data.reasons||[],suppliers=data.suppliers||[],history=data.history||[];
    summary.innerHTML=card('Trocas / devoluções',number(t.records),'Registros no período','info')+card('Unidades retornadas',number(t.units,Number(t.units)%1?1:0),`${number(t.problemUnits,Number(t.problemUnits)%1?1:0)} com motivo de problema`,t.problemUnits?'warning':'')+card('Crédito gerado',money(t.credit),'Valor líquido dos itens','info')+card('Abatido no crediário',money(t.receivableApplied),'Redução de títulos em aberto','positive')+card('Crédito em carteira',money(t.walletCredit),'Saldo disponível ao cliente','positive')+card('Em quarentena',number(t.quarantineUnits,Number(t.quarantineUnits)%1?1:0),'Não voltou ao estoque vendável',t.quarantineUnits?'negative':'');
    const productTable=table([
      {label:'Produto / variação',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.inventoryItemId].filter(Boolean).join(' · '))}</small></div>`},
      {label:'Vendidas no período',num:true,html:r=>number(r.soldQty,Number(r.soldQty)%1?1:0)},
      {label:'Retornadas',num:true,html:r=>number(r.returnedQty,Number(r.returnedQty)%1?1:0)},
      {label:'Taxa retorno',num:true,html:r=>r.returnRate===null?'—':`<span class="${r.returnRate>=15?'negative':r.returnRate>=7?'warning':''}">${pct(r.returnRate)}</span>`},
      {label:'Com problema',num:true,html:r=>`<span class="${r.problemQty>0?'negative':''}">${number(r.problemQty,Number(r.problemQty)%1?1:0)}</span>`},
      {label:'Taxa problema',num:true,html:r=>r.problemRate===null?'—':`<span class="${r.problemRate>=10?'negative':r.problemRate>=5?'warning':''}">${pct(r.problemRate)}</span>`},
      {label:'Crédito',num:true,html:r=>money(r.creditValue)},
      {label:'Motivos',html:r=>esc((r.reasons||[]).slice(0,3).map(x=>`${x.label}: ${number(x.quantity,Number(x.quantity)%1?1:0)}`).join(' · ')||'—')},
      {label:'Fornecedor associado',html:r=>esc((r.suppliers||[]).join(', ')||'—')}
    ],products,{wrapClass:'report-table-wrap-unbounded'});
    const reasonTable=table([{label:'Motivo',html:r=>`<div class="report-product-cell"><b>${esc(r.label)}</b><small>${r.problem?'Classificado como problema/defeito':'Motivo comercial/operacional'}</small></div>`},{label:'Registros',num:true,html:r=>number(r.records)},{label:'Unidades',num:true,html:r=>number(r.units,Number(r.units)%1?1:0)},{label:'Valor',num:true,html:r=>money(r.value)}],reasons,{wrapClass:'report-table-wrap-unbounded'});
    const supplierTable=table([{label:'Fornecedor associado',value:'supplier'},{label:'Ocorrências',num:true,html:r=>number(r.occurrences)},{label:'Unidades com problema',num:true,html:r=>number(r.units,Number(r.units)%1?1:0)},{label:'Valor relacionado',num:true,html:r=>money(r.value)},{label:'Produtos',html:r=>esc((r.products||[]).slice(0,5).join(', '))}],suppliers,{wrapClass:'report-table-wrap-unbounded'});
    const historyTable=table([{label:'Data',html:r=>{const d=new Date(r.date);return Number.isNaN(d.getTime())?date(r.date):d.toLocaleString('pt-BR')}},{label:'Registro',html:r=>`<b>${esc(r.number)}</b><small>${esc(r.typeLabel)}</small>`},{label:'Venda original',html:r=>`<a href="/erp/pdv?operacao=${encodeURIComponent(r.originalOperationId)}">#${esc(r.originalOperationNumber)}</a>`},{label:'Cliente',value:'customer'},{label:'Motivo',html:r=>`<div class="report-product-cell"><b>${esc(r.reason)}</b><small>${esc(r.reasonDetail||'')}</small></div>`},{label:'Itens',html:r=>esc((r.items||[]).map(item=>`${item.quantity}× ${item.name} (${item.dispositionLabel})`).join(' · '))},{label:'Crédito',num:true,html:r=>money(r.totalCredit)},{label:'Responsável',value:'createdBy'}],history,{wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=foldSection('Produtos com mais trocas / problemas','Taxa de retorno compara unidades devolvidas com unidades vendidas no mesmo período selecionado',`${number(products.length)} produto(s)`,productTable,{tone:'danger',open:true,note:'Quando a venda original ocorreu fora do período selecionado, a taxa pode ficar sem denominador; o total de devoluções continua correto.'})+foldSection('Principais motivos','Ajuda a separar defeito/garantia de motivos comerciais como cor, modelo ou desistência',`${number(reasons.length)} motivo(s)`,reasonTable,{tone:2})+(suppliers.length?foldSection('Fornecedores associados a problemas','Usa a compra anterior mais recente encontrada para o mesmo produto/variação; é uma pista para investigação, não prova automática de origem do defeito',`${number(suppliers.length)} fornecedor(es)`,supplierTable,{tone:3}):'')+foldSection('Histórico de trocas e devoluções','Venda original, itens, destino físico, crédito e responsável',`${number(history.length)} registro(s)`,historyTable,{tone:1});
  }

  function renderExpenses(data){
    const t=data.totals||{},rows=data.items||[],months=data.months||[],centers=data.centers||[],topExpenses=data.topExpenses||[];
    const topCenter=t.topCenter?.name?`${t.topCenter.name} · ${pct(t.topCenter.share)}`:'—',topAccount=t.topAccount?.account?`${t.topAccount.account} · ${pct(t.topAccount.share)}`:'—';
    summary.innerHTML=card('Despesas do período',money(t.total),`${number(t.count)} parcela(s) · ${number(t.titles)} conta(s)`,'negative')+card('Pago destas despesas',money(t.paid),'Valor já baixado','positive')+card('Saídas pagas no período',money(t.cashPaid),`${number(t.paymentCount)} pagamento(s) efetivos`,'info')+card('Em aberto',money(t.open),'Saldo ainda pendente',t.open?'warning':'positive')+card('Maior centro de custo',topCenter,'Onde está concentrado o gasto','warning')+card('Maior conta',topAccount,'Plano de contas com maior valor','negative');
    if(!rows.length){body.innerHTML=panel('Despesa Mensal','Por competência, centro de custo e plano de contas',empty('Nenhuma despesa encontrada no período. O relatório considera as Contas a Pagar do tipo despesa; compras de mercadorias ficam separadas em Compras.'));return;}
    const centerTable=table([{label:'Centro de custo',value:'name'},{label:'Participação',num:true,html:r=>pct(r.share)},{label:'Total',num:true,html:r=>money(r.total)}],centers,{wrapClass:'report-table-wrap-unbounded'});
    const centerOverview=foldSection('Onde o dinheiro está indo','Participação de cada centro de custo no período',`${money(t.total)}`,centerTable,{tone:1});
    const rowsByCenter=new Map();rows.forEach(row=>{if(!rowsByCenter.has(row.group))rowsByCenter.set(row.group,[]);rowsByCenter.get(row.group).push(row);});
    const centerSections=centers.map((center,index)=>{
      const centerRows=rowsByCenter.get(center.name)||[];
      const headers=[{label:'Conta / plano de contas',html:r=>`<div class="report-product-cell"><b>${esc(r.account)}</b><small>${number(r.count)} lançamento(s) · ${pct(r.share)}</small></div>`},...months.map(m=>({label:m.label,num:true,html:r=>money(r.months?.[m.key]||0)})),{label:'Pago',num:true,html:r=>money(r.paid)},{label:'Em aberto',num:true,html:r=>money(r.open)},{label:'Total',num:true,html:r=>money(r.total)}];
      const centerTotal=centerRows.reduce((sum,row)=>sum+Number(row.total||0),0),centerPaid=centerRows.reduce((sum,row)=>sum+Number(row.paid||0),0),centerOpen=centerRows.reduce((sum,row)=>sum+Number(row.open||0),0);
      const tableHtml=table(headers,centerRows,{footer:(h,i)=>i===0?'Total do centro':i===headers.length-1?money(centerTotal):i===headers.length-2?money(centerOpen):i===headers.length-3?money(centerPaid):money(centerRows.reduce((sum,row)=>sum+Number(row.months?.[months[i-1]?.key]||0),0)),wrapClass:'report-table-wrap-unbounded'});
      return foldSection(center.name,`${pct(center.share)} das despesas · ${number(centerRows.reduce((sum,row)=>sum+Number(row.count||0),0))} lançamento(s)`,money(center.total),tableHtml,{tone:(index%4)+1});
    }).join('');
    const largest=table([{label:'#',num:true,html:(_r,i)=>i+1},{label:'Despesa',html:r=>`<div class="report-product-cell"><b>${esc(r.description)}</b><small>${esc([r.number,r.supplier,r.group,r.account].filter(Boolean).join(' · '))}</small></div>`},{label:'Data',html:r=>date(r.date)},{label:'Total',num:true,html:r=>money(r.total)},{label:'Pago',num:true,html:r=>money(r.paid)},{label:'Em aberto',num:true,html:r=>money(r.open)}],topExpenses,{wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=centerOverview+centerSections+foldSection('Maiores despesas do período','Ordenadas pelo maior valor para facilitar decisões de corte e renegociação',`${number(topExpenses.length)} conta(s)`,largest,{tone:3,note:'Compras de mercadorias não entram aqui; ficam na aba Compras. O relatório mensal considera apenas as parcelas que pertencem ao período selecionado.'});
  }

  function renderCustomers(data){
    const t=data.totals||{},rows=data.items||[],mode=data.filters?.customerMode||'inactive',window=data.filters?.customerWindow||'90';
    const windowLabel=window==='all'?'todo o histórico':window==='30'?'últimos 30 dias':window==='90'?'últimos 3 meses':window==='180'?'últimos 6 meses':window==='270'?'últimos 9 meses':'últimos 12 meses';
    if(mode==='inactive'){
      const rangeLabel={'30plus':'30+ dias','30_59':'30–59 dias','60_89':'60–89 dias','90_179':'90–179 dias','180_299':'180–299 dias','300plus':'300+ dias','never':'Nunca compraram'}[data.filters?.customerInactiveRange]||'30+ dias';
      const sortLabel={recent:'mais recentes primeiro',oldest:'mais antigos primeiro',purchases:'mais compras no histórico',value:'maior valor no histórico'}[data.filters?.customerInactiveSort]||'mais recentes primeiro';
      summary.innerHTML=card('Reativação 30–299 dias',number(t.reactivation),'Ainda vale tentar trazer de volta','warning')+card('Inativos 300+ dias',number(t.inactive),'Clientes antigos sem retorno','negative')+card('Compra recente',number(t.recent),'Até 29 dias','positive')+card('Nunca compraram',number(t.neverBought),'Sem movimentação conhecida','warning')+card('Histórico WM10',number(t.wm10Customers),'Clientes com histórico importado','info')+card('Histórico ERP',number(t.erpCustomers),'Clientes com movimentação no ERP');
      const content=table([
        {label:'Situação',html:r=>`<span class="report-stage ${esc(r.stage||'')}" title="Classificação pela quantidade de dias desde a última compra">${esc(r.stageLabel||'—')}</span>`},
        {label:'Cliente',html:r=>`<div class="report-product-cell"><a href="/erp/clientes/${encodeURIComponent(r.id)}/ficha">${esc(r.name)}</a><small>${esc([r.code,r.mobile,r.city&&r.state?`${r.city}/${r.state}`:r.city].filter(Boolean).join(' · '))}</small></div>`},
        {label:'Última compra',html:r=>`<div class="report-product-cell"><b>${date(r.lastPurchase)}</b><small>${r.lastOrigin==='wm10'?'WM10':r.lastOrigin==='erp'?'Quality ERP':'Sem histórico'}${r.lastNumber?` · #${esc(r.lastNumber)}`:''}</small></div>`},
        {label:'Dias sem comprar',num:true,html:r=>r.daysWithoutPurchase===null?'Nunca':number(r.daysWithoutPurchase)},{label:'Compras no histórico',num:true,html:r=>number(r.purchases)},{label:'Total histórico',num:true,html:r=>money(r.totalSpent)},{label:'Último valor',num:true,html:r=>money(r.lastValue)}
      ],rows,{wrapClass:'report-table-wrap-unbounded'});
      const note=data.totals?.shown>1000?'Mostrando os primeiros 1.000 clientes. Use a busca para refinar.':'A reativação usa todo o histórico WM10 + Quality ERP até hoje. 30–299 dias é tratado como faixa de reativação; 300+ dias fica separado como inativo antigo.';
      body.innerHTML=`<div class="report-customer-mode-note"><b>Faixa:</b> ${esc(rangeLabel)} · <b>Ordem:</b> ${esc(sortLabel)}. Para contatos mais quentes, comece por 30–59 ou 60–89 dias e use “Mais recentes primeiro”.</div>`+panel('Clientes inativos / Reativação','Priorize quem ainda tem chance de retorno sem misturar com clientes abandonados há muito tempo.',content,note);
      return;
    }
    const title=mode==='frequency'?'Clientes que mais retornam / compram':mode==='quantity'?'Clientes que mais compram em quantidade':'Clientes que mais compram em valor';
    summary.innerHTML=card('Clientes no período',number(t.windowCustomers),windowLabel,'info')+card('Compras / retornos',number(t.windowPurchases),'Operações concluídas')+card('Itens comprados',number(t.windowItems,Number(t.windowItems)%1?1:0),'Quantidade dos itens')+card('Valor comprado',money(t.windowValue),'Total no período','positive')+card('Clientes recorrentes',number(t.repeatCustomers),'2 ou mais compras no período','info')+card('Ticket médio',money(t.windowPurchases?t.windowValue/t.windowPurchases:0),'Média por compra');
    const content=table([
      {label:'#',num:true,html:(_r,i)=>i+1},{label:'Cliente',html:r=>`<div class="report-product-cell"><a href="/erp/clientes/${encodeURIComponent(r.id)}/ficha">${esc(r.name)}</a><small>${esc([r.code,r.mobile,r.city&&r.state?`${r.city}/${r.state}`:r.city].filter(Boolean).join(' · '))}</small></div>`},
      {label:'Compras / retornos',num:true,html:r=>number(r.windowPurchases)},{label:'Itens',num:true,html:r=>number(r.windowItems,Number(r.windowItems)%1?1:0)},{label:'Valor',num:true,html:r=>`<span class="positive">${money(r.windowValue)}</span>`},{label:'Ticket médio',num:true,html:r=>money(r.windowTicket)},{label:'Primeira no período',html:r=>date(r.windowFirstPurchase)},{label:'Última no período',html:r=>date(r.windowLastPurchase)},{label:'Última geral',html:r=>date(r.lastPurchase)}
    ],rows,{wrapClass:'report-table-wrap-unbounded'});
    body.innerHTML=`<div class="report-customer-mode-note">Janela atual: <b>${esc(windowLabel)}</b>. O ranking combina o histórico importado da WM10 com as compras do Quality ERP, sem criar movimentações financeiras ou alterar o cadastro.</div>`+panel(title,mode==='frequency'?'Ordenado pela quantidade de compras/retornos.':mode==='quantity'?'Ordenado pela soma das quantidades dos itens comprados.':'Ordenado pelo valor total comprado.',content,rows.length>=1000?'Mostrando os primeiros 1.000 clientes. Use a busca para refinar.':'');
  }

  function renderHealth(data){
    const t=data.totals||{},indicators=data.indicators||[],alerts=data.alerts||[];
    const overall={good:{label:'Boa',tone:'positive',help:'Sem alerta gerencial forte nos indicadores avaliados.'},attention:{label:'Atenção',tone:'warning',help:'Existem pontos que merecem acompanhamento.'},critical:{label:'Crítica',tone:'negative',help:'Há sinais que pedem ação e conferência imediata.'}}[t.overall]||{label:'Em análise',tone:'',help:''};
    summary.innerHTML=card('Saúde gerencial',overall.label,overall.help,overall.tone)+card('Resultado do período',money(t.result),`Margem ${pct(t.margin)}`,t.result>=0?'positive':'negative')+card('Recebíveis em aberto',money(t.receivablesOpen),`${money(t.receivablesOverdue)} vencidos`,t.receivablesOverdue?'warning':'positive')+card('Contas a pagar',money(t.payablesOpen),`${money(t.payablesOverdue)} vencidos`,t.payablesOverdue?'negative':'')+card('Posição próximos 30 dias',money(t.workingPosition),t.coverage===null?'Sem contas a pagar nos próximos 30 dias':`Receber ${money(t.receivablesNext30)} · pagar ${money(t.payablesNext30)}`,t.workingPosition>=0?'positive':'warning')+card('Capital sem giro',money(t.staleCapital),`${pct(t.staleRatio)} do capital analisado`,t.staleRatio>=35?'negative':t.staleRatio>=20?'warning':'positive');
    const indicatorValue=row=>row.id==='margin'||row.id==='receivables'||row.id==='payables'||row.id==='stock'?pct(row.value):money(row.value);
    const grid=`<div class="health-grid">${indicators.map(row=>`<article class="health-indicator ${esc(row.status)}"><span>${esc(row.label)}</span><b>${esc(indicatorValue(row))}</b><small>${esc(row.help||'')}</small></article>`).join('')}</div>`;
    const alertHtml=`<div class="health-grid">${alerts.map(row=>`<article class="health-alert ${esc(row.tone)}"><b>${esc(row.title)}</b><small>${esc(row.text)}</small></article>`).join('')}</div>`;
    const disclaimer=`<div class="report-history-banner"><span>🩺</span><div><b>Diagnóstico gerencial do ERP</b><small>Usa DRE gerencial, contas a receber/pagar e estoque para apontar tendências. Ajuda na gestão diária, mas não substitui balancete, escrituração, conciliações e análise formal da contabilidade.</small></div></div>`;
    body.innerHTML=disclaimer+panel('Indicadores de saúde','Leitura rápida dos pontos que mais afetam caixa, resultado e capital',grid)+`<div style="height:10px"></div>`+panel('Pontos de atenção','O que merece acompanhamento neste período',alertHtml,data.dreAnalysis||'');
  }

  function renderCounts(data){
    const t=data.totals||{},rows=data.items||[];
    summary.innerHTML=card('Contagens',number(t.counts),'No período')+card('Concluídas',number(t.completed),'Finalizadas')+card('Itens contados',number(t.items),'Linhas de contagem')+card('Divergências',number(t.divergences),'Encontradas',t.divergences?'negative':'')+card('Ajustes',number(t.adjustments),'Movimentos gerados');
    const content=table([
      {label:'Contagem',html:r=>`<a href="/erp/estoque/contagens/${encodeURIComponent(r.id)}">${esc(r.id)}</a>`},{label:'Tipo',html:r=>r.type==='total'?'Total':'Parcial'},{label:'Status',html:r=>esc(r.statusLabel||r.status)},{label:'Início',html:r=>date(r.startedAt)},{label:'Conclusão',html:r=>date(r.completedAt)},{label:'Responsável',html:r=>esc(r.completedBy||r.createdBy||'Sistema / legado')},{label:'Itens',num:true,html:r=>number(r.items)},{label:'Divergências',num:true,html:r=>number(r.divergences)},{label:'Ajustes',num:true,html:r=>number(r.adjustments)}
    ],rows);
    body.innerHTML=panel('Histórico de Contagens de Estoque','Auditoria das contagens parciais e totais já realizadas.',content);
  }

  function renderAudit(data){
    const t=data.totals||{},actions=data.actions||[],stock=data.stock||[],detailed=data.detailed||[];
    summary.innerHTML=card('Ações registradas',number(t.actions),'Logs operacionais')+card('Alterações detalhadas',number(t.detailed),'Antes / depois')+card('Movimentos de estoque',number(t.stockMovements),'Entradas, saídas e ajustes')+card('Erros',number(t.errors),'Falhas registradas',t.errors?'negative':'')+card('Usuários/atores',number(t.actors),'Responsáveis encontrados');
    const detailsTable=table([
      {label:'Data/hora',html:r=>{const d=new Date(r.at);return Number.isNaN(d.getTime())?date(r.at):d.toLocaleString('pt-BR')}},{label:'Módulo',value:'module'},{label:'Ação',value:'action'},{label:'Usuário',value:'actor'},{label:'Registro',html:r=>`<div class="report-product-cell"><b>${esc(r.entityType||'Registro')}</b><small>${esc([r.entityId,r.documentId].filter(Boolean).join(' · '))}</small></div>`},{label:'Motivo',html:r=>esc(r.reason||'—')},{label:'Alteração',html:r=>`<div class="report-detail-json">${r.beforePreview?`<details><summary>Antes</summary><code>${esc(r.beforePreview)}</code></details>`:''}${r.afterPreview?`<details><summary>Depois</summary><code>${esc(r.afterPreview)}</code></details>`:''}${!r.beforePreview&&!r.afterPreview?'—':''}</div>`}
    ],detailed);
    const actionsTable=table([
      {label:'Data/hora',html:r=>{const d=new Date(r.at);return Number.isNaN(d.getTime())?date(r.date):d.toLocaleString('pt-BR')}},{label:'Módulo',value:'module'},{label:'Ação',value:'action'},{label:'Usuário',value:'actor'},{label:'Resultado',html:r=>`<span class="${r.result==='error'?'negative':''}">${esc(r.result||'—')}</span>`},{label:'HTTP',html:r=>esc([r.method,r.statusCode||''].filter(Boolean).join(' '))},{label:'IP',value:'ip'},{label:'Descrição',html:r=>`<div class="report-product-cell"><b>${esc(r.label||r.action)}</b><small>${esc(r.route||'')}${r.durationMs?` · ${number(r.durationMs)} ms`:''}</small></div>`}
    ],actions);
    const stockTable=table([
      {label:'Data/hora',html:r=>{const d=new Date(r.at);return Number.isNaN(d.getTime())?date(r.date):d.toLocaleString('pt-BR')}},{label:'Usuário',value:'actor'},{label:'Produto',html:r=>`<div class="report-product-cell"><b>${esc(r.product)}</b><small>${esc([r.code,r.inventoryItemId].filter(Boolean).join(' · '))}</small></div>`},{label:'Movimento',html:r=>`<div class="report-product-cell"><b>${esc(r.label||r.action)}</b><small>${esc([r.classification,r.reasonCode,r.referenceType,r.referenceId].filter(Boolean).join(' · '))}</small></div>`},{label:'Antes',num:true,html:r=>number(r.before,Number(r.before)%1?1:0)},{label:'Mov.',num:true,html:r=>number(r.quantity,Number(r.quantity)%1?1:0)},{label:'Depois',num:true,html:r=>number(r.after,Number(r.after)%1?1:0)}
    ],stock);
    const auditSection=(title,subtitle,count,content,note='')=>`<details class="report-audit-section"><summary><span><b>${esc(title)}</b><small>${esc(subtitle)}</small></span><strong>${number(count)}</strong></summary><div class="report-audit-content">${content}${note?`<div class="report-note">${esc(note)}</div>`:''}</div></details>`;
    body.innerHTML=auditSection('Alterações detalhadas','Quem alterou, qual registro e valores antes/depois',detailed.length,detailsTable,'Novas ações auditáveis registram o usuário logado. Registros antigos identificados como “Sistema / legado” foram criados antes do login multiusuário.')+auditSection('Auditoria operacional','Requisições, falhas, módulo, rota, IP e tempo de resposta',actions.length,actionsTable)+auditSection('Auditoria do estoque','Produto, referência, saldo anterior, movimento e novo saldo',stock.length,stockTable);
  }


  const renderers={overview:renderOverview,profitability:renderProfitability,products:renderProducts,turnover:renderTurnover,sellers:renderSellers,discounts:renderDiscounts,sales:renderSales,payments:renderPayments,purchases:renderPurchases,returns:renderReturns,expenses:renderExpenses,health:renderHealth,customers:renderCustomers,counts:renderCounts,audit:renderAudit};

  async function load(){
    const token=++requestToken;
    body.innerHTML='<div class="reports-loading">Gerando relatório...</div>'; summary.innerHTML=''; context.textContent='';
    const params=new URLSearchParams(currentFilters());
    try{
      const response=await fetch(`/erp/api/relatorios/${encodeURIComponent(activeView)}?${params.toString()}`,{headers:{Accept:'application/json'},cache:'no-store'});
      const data=await response.json();
      if(token!==requestToken)return;
      if(!response.ok||data.success===false)throw new Error(data.message||'Não foi possível gerar o relatório.');
      currentData=data; setSellerOptions(data.sellers||[]); renderContext(data); (renderers[activeView]||renderOverview)(data);
    }catch(error){if(token!==requestToken)return;currentData=null;body.innerHTML=`<div class="reports-error">${esc(error.message||'Erro ao gerar relatório.')}</div>`;}
  }

  function activate(view,{loadData=true}={}){
    if(!views.has(view))view='overview';activeView=view;location.hash=view==='overview'?'':view;
    tabs.forEach(button=>button.classList.toggle('active',button.dataset.reportView===view));
    const salesViews=['overview','profitability','products','sellers','discounts','sales','payments'];
    const searchableViews=['overview','profitability','products','discounts','sales','payments','purchases','returns','expenses','customers','counts','audit'];
    root.dataset.activeView=view;
    topFilter.hidden=view!=='products';productSortFilter.hidden=view!=='products';staleFilter.hidden=view!=='turnover';customerModeFilter.hidden=view!=='customers';
    const customerMode=form.elements.customerMode?.value||'inactive';
    customerInactiveRangeFilter.hidden=view!=='customers'||customerMode!=='inactive';customerInactiveSortFilter.hidden=view!=='customers'||customerMode!=='inactive';customerWindowFilter.hidden=view!=='customers'||customerMode==='inactive';
    dateFilters.forEach(label=>label.hidden=view==='customers');quickPeriodButtons.forEach(button=>button.hidden=view==='customers');
    movementFilter.hidden=!salesViews.includes(view);sellerFilter.hidden=!salesViews.includes(view);searchFilter.hidden=!searchableViews.includes(view);
    const placeholders={purchases:'Fornecedor, produto, NF, compra ou responsável...',expenses:'Despesa, fornecedor, conta ou centro de custo...',customers:'Cliente, documento, telefone, e-mail ou cidade...',counts:'Contagem, responsável, tipo ou status...',audit:'Usuário, ação, módulo, produto, rota ou registro...',returns:'Cliente, produto, motivo, fornecedor ou venda...',products:'Produto, código, categoria...',sales:'Produto, cliente, venda, código...',discounts:'Produto, cliente, venda, código...'};
    if(form.elements.q)form.elements.q.placeholder=placeholders[view]||'Buscar neste relatório...';
    if(loadData)load();
  }

  form.elements.customerMode?.addEventListener('change',()=>{const mode=form.elements.customerMode.value||'inactive';customerInactiveRangeFilter.hidden=activeView!=='customers'||mode!=='inactive';customerInactiveSortFilter.hidden=activeView!=='customers'||mode!=='inactive';customerWindowFilter.hidden=activeView!=='customers'||mode==='inactive';if(activeView==='customers')load();});
  form.elements.customerWindow?.addEventListener('change',()=>{if(activeView==='customers')load();});
  form.elements.customerInactiveRange?.addEventListener('change',()=>{if(activeView==='customers')load();});
  form.elements.customerInactiveSort?.addEventListener('change',()=>{if(activeView==='customers')load();});
  tabs.forEach(button=>button.addEventListener('click',()=>activate(button.dataset.reportView)));
  form.addEventListener('submit',event=>{event.preventDefault();load();});
  window.addEventListener('hashchange',()=>{const view=location.hash.slice(1)||'overview';if(view!==activeView&&views.has(view))activate(view)});

  const isoLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  document.querySelectorAll('[data-report-period]').forEach(button=>button.addEventListener('click',()=>{
    const now=new Date(),kind=button.dataset.reportPeriod;let from=new Date(now),to=new Date(now);
    if(kind==='month')from=new Date(now.getFullYear(),now.getMonth(),1);
    if(kind==='previous'){from=new Date(now.getFullYear(),now.getMonth()-1,1);to=new Date(now.getFullYear(),now.getMonth(),0);}
    if(kind==='90')from=new Date(now.getFullYear(),now.getMonth(),now.getDate()-89);
    if(kind==='year')from=new Date(now.getFullYear(),0,1);
    form.elements.from.value=isoLocal(from);form.elements.to.value=isoLocal(to);load();
  }));

  document.getElementById('reportsPrint')?.addEventListener('click',()=>window.print());
  document.getElementById('reportsExportCsv')?.addEventListener('click',()=>{
    const tables=[...body.querySelectorAll('table.report-table')];if(!tables.length){alert('Não há tabela para exportar neste relatório.');return;}
    const sections=[];
    tables.forEach((table,index)=>{
      const title=table.closest('.report-panel')?.querySelector('h2')?.textContent?.trim()||`Tabela ${index+1}`;
      sections.push([`"${title.replace(/"/g,'""')}"`]);
      [...table.rows].forEach(row=>sections.push([...row.cells].map(cell=>`"${cell.innerText.replace(/\s+/g,' ').trim().replace(/"/g,'""')}"`).join(';')));
      sections.push(['']);
    });
    const blob=new Blob(['\ufeff'+sections.flat().join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`quality-relatorio-${activeView}-${form.elements.from.value}-a-${form.elements.to.value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  });

  activate(activeView,{loadData:false});
  if(defaults.from)form.elements.from.value=defaults.from;if(defaults.to)form.elements.to.value=defaults.to;load();
})();
