import fs from 'fs';
import path from 'path';

function text(value=''){ return String(value ?? '').trim(); }
function num(value=0){ const n=Number(value); return Number.isFinite(n) ? n : 0; }
function round2(value=0){ return Math.round((num(value)+Number.EPSILON)*100)/100; }
function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function isoDate(value=''){
  if(!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return String(value).slice(0,10);
  return date.toISOString().slice(0,10);
}
function dateMs(value=''){
  const valueText=text(value);
  if(!valueText) return NaN;
  const direct=new Date(valueText).getTime();
  if(Number.isFinite(direct)) return direct;
  const local=new Date(`${valueText.slice(0,10)}T12:00:00`).getTime();
  return local;
}
function startOfDayMs(value=''){
  const d=text(value)||new Date().toISOString().slice(0,10);
  return new Date(`${d.slice(0,10)}T00:00:00`).getTime();
}
function endOfDayMs(value=''){
  const d=text(value)||new Date().toISOString().slice(0,10);
  return new Date(`${d.slice(0,10)}T23:59:59.999`).getTime();
}
function monthKey(value=''){
  const d=isoDate(value);
  return /^\d{4}-\d{2}/.test(d) ? d.slice(0,7) : '';
}
function monthLabel(key=''){
  const [year,month]=String(key).split('-');
  if(!year||!month) return key;
  return `${month}/${year}`;
}
function normalize(value=''){
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}
function readJson(file,fallback={items:[]}){
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch (_) { return JSON.parse(JSON.stringify(fallback)); }
}
function itemsOf(data){ return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []); }
function percent(value,total){ return total ? round2((num(value)/num(total))*100) : 0; }
function safeMargin(profit,revenue){ return revenue ? round2((num(profit)/num(revenue))*100) : 0; }
function safeMarkup(revenue,cost){ return cost ? round2(num(revenue)/num(cost)) : null; }
function daysBetween(fromMs,toMs){ return Math.max(0,Math.floor((toMs-fromMs)/86400000)); }

function genericVariationLabel(value=''){ return /^varia(?:ç|c)[aã]o\s*\d+$/i.test(text(value)); }
function userFacingActor(value=''){
  const clean=text(value);
  return !clean || normalize(clean)==='painel' ? 'Sistema / legado' : clean;
}
function countStatusLabel(value=''){
  const key=normalize(value).replace(/\s+/g,'_');
  return ({completed:'Concluída',concluida:'Concluída',in_progress:'Em andamento',em_andamento:'Em andamento',open:'Em andamento',cancelled:'Cancelada',canceled:'Cancelada'})[key] || text(value) || '—';
}
function productKindLabel(value=''){ return value==='service'?'Serviço':'Produto'; }
function inferredKindFromItem(item={},operationType=''){
  const explicit=normalize(item.erpType||item.type||item.productType);
  if(explicit==='service'||explicit==='servico')return 'service';
  const name=normalize(item.name);
  const serviceWords=/(^|\b)(servico|servicos|mao de obra|formatacao|limpeza de virus|desbloqueio|instalacao|reparo|diagnostico|configuracao)(\b|$)/;
  if(serviceWords.test(name))return 'service';
  return 'product';
}
function safeJsonPreview(value,limit=900){
  if(value===undefined||value===null)return '';
  try{const raw=JSON.stringify(value);return raw.length>limit?`${raw.slice(0,limit)}…`:raw;}catch(_){return text(value).slice(0,limit);}
}

export default class ReportService {
  constructor({ panelDir, contentDir, commerceService, inventoryService, purchaseService, payablesService, dreService, returnService }={}){
    this.panelDir=path.resolve(panelDir||'.');
    this.contentDir=path.resolve(contentDir||'.');
    this.commerceService=commerceService;
    this.inventoryService=inventoryService;
    this.purchaseService=purchaseService;
    this.payablesService=payablesService;
    this.dreService=dreService;
    this.returnService=returnService;
    this._wm10HistoryCache=null;
  }

  defaultFilters(){
    const now=new Date();
    const to=now.toISOString().slice(0,10);
    const from=new Date(now.getFullYear(),now.getMonth(),1,12).toISOString().slice(0,10);
    return { from,to,type:'all',seller:'all',q:'',top:50,staleDays:90,productSort:'quantity',productKind:'all',turnoverView:'all',inactiveDays:30,customerMode:'inactive',customerWindow:'90',customerInactiveRange:'30plus',customerInactiveSort:'recent' };
  }

  normalizeFilters(filters={}){
    const defaults=this.defaultFilters();
    const from=/^\d{4}-\d{2}-\d{2}$/.test(text(filters.from))?text(filters.from):defaults.from;
    const to=/^\d{4}-\d{2}-\d{2}$/.test(text(filters.to))?text(filters.to):defaults.to;
    const type=['all','sale','service_order'].includes(text(filters.type))?text(filters.type):'all';
    const seller=text(filters.seller)||'all';
    const q=text(filters.q);
    const top=clamp(Math.round(num(filters.top)||50),10,500);
    const staleDays=clamp(Math.round(num(filters.staleDays)||90),1,3650);
    const productSort=['quantity','revenue','profit','margin','discount'].includes(text(filters.productSort))?text(filters.productSort):'quantity';
    const productKind=['all','product','service'].includes(text(filters.productKind))?text(filters.productKind):'all';
    const turnoverView=['all','no_sales','slow','normal','high','atypical'].includes(text(filters.turnoverView))?text(filters.turnoverView):'all';
    const inactiveDays=clamp(Math.round(num(filters.inactiveDays)||30),1,3650);
    const customerMode=['inactive','frequency','quantity','value','returns'].includes(text(filters.customerMode))?text(filters.customerMode):'inactive';
    const customerWindow=['30','90','180','270','365','all'].includes(text(filters.customerWindow))?text(filters.customerWindow):'90';
    const customerInactiveRange=['30plus','30_59','60_89','90_179','180_299','300plus','never'].includes(text(filters.customerInactiveRange))?text(filters.customerInactiveRange):'30plus';
    const customerInactiveSort=['recent','oldest','purchases','value'].includes(text(filters.customerInactiveSort))?text(filters.customerInactiveSort):'recent';
    const normalized={from,to,type,seller,q,top,staleDays,productSort,productKind,turnoverView,inactiveDays,customerMode,customerWindow,customerInactiveRange,customerInactiveSort};
    if(startOfDayMs(normalized.from)>endOfDayMs(normalized.to)){
      normalized.from=to; normalized.to=from;
    }
    return normalized;
  }

  operationDate(operation={}){
    return operation.finalizedAt || operation.dates?.finalizedAt || operation.dates?.updatedAt || operation.updatedAt || operation.createdAt || '';
  }

  finalizedOperations(filters={}){
    const f=this.normalizeFilters(filters);
    const fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to);
    return (this.commerceService?.listOperations?.({status:'all'})||[]).filter(operation=>{
      if(operation.status!=='finalized') return false;
      if(f.type!=='all' && operation.type!==f.type) return false;
      const when=dateMs(this.operationDate(operation));
      if(!Number.isFinite(when)||when<fromMs||when>toMs) return false;
      if(f.seller!=='all'){
        const sellerIds=new Set([
          text(operation.sellerId),
          ...(operation.items||[]).map(item=>text(item.sellerId))
        ].filter(Boolean));
        const sellerNames=new Set([
          text(operation.sellerNameSnapshot),
          ...(operation.items||[]).map(item=>text(item.sellerNameSnapshot))
        ].filter(Boolean));
        const wanted=text(f.seller);
        const legacy=wanted.startsWith('legacy:')?wanted.slice(7):'';
        const userId=wanted.startsWith('user:')?wanted.slice(5):wanted;
        if(!sellerIds.has(userId) && !(legacy && [...sellerNames].some(name=>normalize(name)===legacy)) && !sellerNames.has(wanted)) return false;
      }
      if(f.q){
        const hay=normalize([
          operation.number,operation.customerNameSnapshot,operation.identifier,operation.sellerNameSnapshot,
          ...(operation.items||[]).flatMap(item=>[item.code,item.sku,item.name,item.sellerNameSnapshot])
        ].join(' '));
        if(!hay.includes(normalize(f.q))) return false;
      }
      return true;
    });
  }

  operationRows(filters={}){
    const f=this.normalizeFilters(filters);
    const operations=this.finalizedOperations(f);
    const catalog=this.productCatalog();
    const rows=[];
    for(const operation of operations){
      const items=Array.isArray(operation.snapshot?.items)&&operation.snapshot.items.length ? operation.snapshot.items : (operation.items||[]);
      const subtotal=items.reduce((sum,item)=>sum+(num(item.quantity)||1)*num(item.unitPrice),0);
      const itemDiscountTotal=items.reduce((sum,item)=>sum+num(item.discount),0);
      const couponDiscount=Math.max(0,num(operation.snapshot?.totals?.couponDiscount ?? operation.couponDiscount ?? operation.coupon?.discount));
      const distributable=Math.max(0,subtotal-itemDiscountTotal);
      items.forEach((item,index)=>{
        const quantity=Math.max(0.001,num(item.quantity)||1);
        const gross=round2(quantity*num(item.unitPrice));
        const itemDiscount=round2(Math.min(gross,Math.max(0,num(item.discount))));
        const afterItemDiscount=Math.max(0,gross-itemDiscount);
        const couponShare=round2(distributable>0 ? couponDiscount*(afterItemDiscount/distributable) : (index===0?couponDiscount:0));
        const discount=round2(itemDiscount+couponShare);
        const revenue=round2(Math.max(0,gross-discount));
        const cost=round2(quantity*num(item.unitCost));
        const profit=round2(revenue-cost);
        const sellerId=text(item.sellerId)||text(operation.snapshot?.seller?.id)||text(operation.sellerId);
        const seller=text(item.sellerNameSnapshot)||text(operation.snapshot?.seller?.name)||text(operation.sellerNameSnapshot)||'Sem vendedor';
        if(f.seller!=='all'){
          const wanted=text(f.seller),legacy=wanted.startsWith('legacy:')?wanted.slice(7):'',userId=wanted.startsWith('user:')?wanted.slice(5):wanted;
          if(!(sellerId&&sellerId===userId) && !(legacy&&normalize(seller)===legacy) && seller!==wanted) return;
        }
        if(f.q){
          const operationHay=normalize([operation.number,operation.customerNameSnapshot,operation.identifier,operation.sellerNameSnapshot].join(' '));
          const itemHay=normalize([item.code,item.sku,item.name,item.sellerNameSnapshot].join(' '));
          if(!operationHay.includes(normalize(f.q)) && !itemHay.includes(normalize(f.q))) return;
        }
        const productId=text(item.productId),inventoryItemId=text(item.inventoryItemId),historicalCode=text(item.code)||text(item.sku);
        const currentMeta=catalog.byInventory.get(inventoryItemId)||catalog.byProduct.get(productId)||catalog.byCode.get(normalize(historicalCode))||null;
        const currentProductName=text(currentMeta?.name);
        const productRemoved=Boolean(currentMeta?.removed===true || (catalog.hasCatalog && productId && !currentMeta));
        const kind=currentMeta?.kind || inferredKindFromItem(item,operation.type);
        rows.push({
          operationId:operation.id,number:operation.number,type:operation.type,date:isoDate(this.operationDate(operation)),
          customerId:text(operation.customerId)||text(operation.snapshot?.customer?.id),customer:text(operation.snapshot?.customer?.name)||text(operation.customerNameSnapshot)||'Consumidor final',
          sellerId,seller,productId,inventoryItemId,code:text(currentMeta?.code)||historicalCode,
          sku:text(currentMeta?.sku)||text(item.sku),product:currentProductName||text(item.name)||'Item sem nome',historicalProduct:text(item.name)||'',productRemoved,kind,
          brand:text(currentMeta?.brand),category:text(currentMeta?.category),quantity,unitPrice:round2(num(item.unitPrice)),unitCost:round2(num(item.unitCost)),
          gross,itemDiscount,couponDiscount:couponShare,discount,revenue,cost,profit,margin:safeMargin(profit,revenue),markup:safeMarkup(revenue,cost)
        });
      });
    }
    return rows;
  }

  productCatalog(){
    const products=itemsOf(readJson(path.join(this.contentDir,'products.json'),{items:[]}));
    const byInventory=new Map(),byProduct=new Map(),byCode=new Map();
    const flattened=[];
    // Compras recentes ajudam a resolver grades antigas cujo cadastro ainda traz
    // rótulos genéricos como “Variação 1”. O cadastro atual continua sendo a fonte
    // principal; a compra entra apenas como pista de nome/grade quando faltar detalhe.
    const purchaseHints=new Map();
    try{
      for(const purchase of (this.purchaseService?.list?.({})||[])){
        for(const item of (purchase.items||[])){
          const inventoryItemId=text(item.inventoryItemId); if(!inventoryItemId)continue;
          const label=text(item.variationLabel);
          const fullName=text(item.productName) || [text(item.baseProductName),label].filter(Boolean).join(' · ');
          if(!fullName&&!label)continue;
          const when=dateMs(purchase.entryDate||purchase.issueDate||purchase.createdAt)||0;
          const previous=purchaseHints.get(inventoryItemId);
          if(!previous||when>=previous.when) purchaseHints.set(inventoryItemId,{when,label,fullName,baseName:text(item.baseProductName),code:text(item.productCode),sku:text(item.sku),brand:text(item.brand)});
        }
      }
    }catch(_){ }
    for(const product of products){
      const explicitType=normalize(product.erp?.type||product.type);
      const base={
        productId:text(product.id),name:text(product.name)||text(product.virtualStore?.name)||'Produto',
        code:text(product.erp?.internalCode)||text(product.code)||text(product.id),sku:text(product.erp?.sku)||text(product.sku),
        brand:text(product.erp?.brand)||text(product.brand),category:text(product.erp?.categoryName)||text(product.erp?.category)||text(product.category),
        cost:round2(num(product.commercial?.costPrice)),price:round2(num(product.commercial?.erpPrice ?? product.price)),active:product.erp?.active!==false,
        stockControlled:product.inventory?.stockControlled!==false,includeInValuation:product.inventory?.includeInValuation!==false,
        kind:explicitType==='service'?'service':'product'
      };
      const combos=Array.isArray(product.variations?.combinations)?product.variations.combinations:[];
      if(combos.length){
        combos.forEach((combo,index)=>{
          const inventoryItemId=text(combo.inventoryItemId);
          const hint=purchaseHints.get(inventoryItemId)||{};
          const values=combo.values&&typeof combo.values==='object'?Object.values(combo.values).map(text).filter(Boolean):[];
          const rawLabel=text(combo.label);
          const meaningfulValues=values.filter(value=>!genericVariationLabel(value));
          const label=(!rawLabel||genericVariationLabel(rawLabel))
            ? (meaningfulValues.join(' · ')||text(hint.label)||(!genericVariationLabel(rawLabel)?rawLabel:'')||`Variação ${index+1}`)
            : rawLabel;
          let fullName=label?`${base.name} · ${label}`:base.name;
          if((genericVariationLabel(label)||!label) && text(hint.fullName)) fullName=text(hint.fullName);
          const row={...base,inventoryItemId,name:fullName,variationLabel:label,
            cost:round2(num(combo.costPrice ?? combo.cost ?? base.cost)),price:round2(num(combo.erpPrice ?? combo.price ?? base.price))};
          flattened.push(row); if(row.inventoryItemId)byInventory.set(row.inventoryItemId,row);
        });
      } else {
        const row={...base,inventoryItemId:text(product.inventory?.itemId)||`PRD-${text(product.id)}`,variationLabel:''};
        flattened.push(row); if(row.inventoryItemId)byInventory.set(row.inventoryItemId,row);
      }
      if(base.productId)byProduct.set(base.productId,base);
      for(const code of [base.code,base.sku,text(product.id)]) if(code)byCode.set(normalize(code),base);
    }
    // Se um produto foi excluído do cadastro, preserva somente uma referência
    // histórica para relatórios/auditoria. Isso não recria o produto e não o torna
    // vendável; apenas evita exibir IDs incompreensíveis no passado.
    for(const [inventoryItemId,hint] of purchaseHints){
      if(byInventory.has(inventoryItemId))continue;
      const historical={productId:'',inventoryItemId,name:text(hint.fullName)||`Item ${inventoryItemId}`,variationLabel:text(hint.label),code:text(hint.code),sku:text(hint.sku),brand:text(hint.brand),category:'',cost:0,price:0,active:false,stockControlled:true,includeInValuation:true,kind:'product',removed:true};
      byInventory.set(inventoryItemId,historical); flattened.push(historical);
      if(historical.code)byCode.set(normalize(historical.code),historical);
    }
    return {items:flattened,byInventory,byProduct,byCode,hasCatalog:products.length>0};
  }

  sellers(filters={}){
    const scoped={...this.normalizeFilters(filters),seller:'all',q:''};
    const operations=this.finalizedOperations(scoped);
    const options=new Map();
    const userDb=readJson(path.join(this.panelDir,'data','erp','users','users.json'),{items:[]});
    for(const user of itemsOf(userDb)){
      if(user?.active===false) continue;
      const id=text(user.id),name=text(user.displayName)||text(user.name)||text(user.username);
      if(!id||!name) continue;
      if(user.seller===false || user.canSell===false) continue;
      options.set(`user:${id}`,{value:`user:${id}`,id,name,legacy:false});
    }
    const addHistorical=(id,name)=>{
      const cleanName=text(name); if(!cleanName||cleanName==='Sem vendedor') return;
      if(id){
        const key=`user:${id}`; if(!options.has(key)) options.set(key,{value:key,id,name:cleanName,legacy:false});
        return;
      }
      const key=`legacy:${normalize(cleanName)}`; if(!options.has(key)) options.set(key,{value:key,id:'',name:cleanName,legacy:true});
    };
    for(const operation of operations){
      addHistorical(text(operation.sellerId),text(operation.sellerNameSnapshot));
      for(const item of operation.items||[]) addHistorical(text(item.sellerId),text(item.sellerNameSnapshot));
    }
    return [...options.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }

  erpHistoricalCutoff(){
    try{
      const dates=(this.commerceService?.listOperations?.({status:'all'})||[])
        .filter(operation=>operation?.status==='finalized')
        .map(operation=>isoDate(this.operationDate(operation)))
        .filter(Boolean)
        .sort();
      if(!dates.length)return '';
      const [year,month]=dates[0].split('-').map(Number);
      if(!year||!month)return '';
      const cutoff=new Date(year,month-1,0,12,0,0,0);
      return cutoff.toISOString().slice(0,10);
    }catch(_){return '';}
  }

  wm10HistoryRecords(){
    const base=path.join(this.panelDir,'data','erp','wm10-arquivo-historico','09_MOVIMENTACOES');
    const sources=[
      {type:'sale',file:path.join(base,'venda','venda_concluida.json')},
      {type:'service_order',file:path.join(base,'ordem_servico','ordem_servico_concluida.json')}
    ];
    let fingerprint='';
    for(const source of sources){
      try{const stat=fs.statSync(source.file);fingerprint+=`${source.file}:${stat.size}:${stat.mtimeMs}|`;}catch(_){fingerprint+=`${source.file}:missing|`;}
    }
    if(this._wm10HistoryCache?.fingerprint===fingerprint)return this._wm10HistoryCache.records;
    const records=[];
    for(const source of sources){
      const db=readJson(source.file,{data:[]});
      const rows=Array.isArray(db?.data)?db.data:itemsOf(db);
      for(const operation of rows){
        const date=isoDate(operation.data_venda||operation.data);
        if(!date)continue;
        const opItems=Array.isArray(operation.itens)?operation.itens:[];
        const revenue=round2(num(operation.total));
        const cost=round2(opItems.reduce((sum,item)=>sum+Math.max(0,num(item.quantidade)||1)*Math.max(0,num(item.preco_compra)),0));
        records.push({
          source:'wm10',type:source.type,date,number:text(operation.cod_venda),
          revenue,cost,profit:round2(revenue-cost),discount:round2(num(operation.desconto)),
          itemCount:round2(opItems.reduce((sum,item)=>sum+Math.max(0,num(item.quantidade)||1),0))
        });
      }
    }
    records.sort((a,b)=>a.date.localeCompare(b.date)||num(a.number)-num(b.number));
    this._wm10HistoryCache={fingerprint,records};
    return records;
  }

  historicalFinancials(filters={}){
    const f=this.normalizeFilters(filters),cutoff=this.erpHistoricalCutoff();
    const info={available:false,included:false,readOnly:true,source:'WM10',sourceLabel:'WM10 histórico',cutoff,scopedOut:false};
    if(!cutoff)return {items:[],totals:{revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0},info};
    info.available=true;
    // O histórico legado é deliberadamente apenas financeiro. Se o usuário filtrar
    // vendedor ou texto/produto, não misturamos dados globais da WM10 com uma visão
    // específica do ERP atual.
    if(f.seller!=='all'||f.q){info.scopedOut=true;return {items:[],totals:{revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0},info};}
    const maxTo=endOfDayMs(cutoff),fromMs=startOfDayMs(f.from),toMs=Math.min(endOfDayMs(f.to),maxTo);
    if(fromMs>toMs)return {items:[],totals:{revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0},info};
    const byMonth=new Map();
    for(const row of this.wm10HistoryRecords()){
      if(f.type!=='all'&&row.type!==f.type)continue;
      const when=dateMs(row.date);if(!Number.isFinite(when)||when<fromMs||when>toMs)continue;
      const key=monthKey(row.date);if(!key)continue;
      const current=byMonth.get(key)||{month:key,label:monthLabel(key),source:'wm10',sourceLabel:'WM10 histórico',historical:true,revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0};
      current.revenue+=row.revenue;current.cost+=row.cost;current.profit+=row.profit;current.discount+=row.discount;current.itemCount+=row.itemCount;current.salesCount++;byMonth.set(key,current);
    }
    const items=[...byMonth.values()].sort((a,b)=>a.month.localeCompare(b.month)).map(row=>({...row,revenue:round2(row.revenue),cost:round2(row.cost),profit:round2(row.profit),discount:round2(row.discount),itemCount:round2(row.itemCount),margin:safeMargin(row.profit,row.revenue),markup:safeMarkup(row.revenue,row.cost)}));
    const totals=items.reduce((acc,row)=>{acc.revenue+=row.revenue;acc.cost+=row.cost;acc.profit+=row.profit;acc.discount+=row.discount;acc.itemCount+=row.itemCount;acc.salesCount+=row.salesCount;return acc;},{revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0});
    Object.keys(totals).forEach(key=>totals[key]=round2(totals[key]));totals.margin=safeMargin(totals.profit,totals.revenue);totals.markup=safeMarkup(totals.revenue,totals.cost);
    info.included=items.length>0;
    return {items,totals,info};
  }

  overview(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f),operations=this.finalizedOperations(f),history=this.historicalFinancials(f);
    const current={
      revenue:round2(rows.reduce((s,r)=>s+r.revenue,0)),
      cost:round2(rows.reduce((s,r)=>s+r.cost,0)),
      discount:round2(rows.reduce((s,r)=>s+r.discount,0)),
      items:round2(rows.reduce((s,r)=>s+r.quantity,0)),
      sales:operations.length
    };
    current.profit=round2(current.revenue-current.cost);
    const byMonth=new Map();
    rows.forEach(row=>{
      const key=monthKey(row.date);if(!key)return;
      const currentRow=byMonth.get(key)||{month:key,label:monthLabel(key),source:'erp',sourceLabel:'Quality ERP',historical:false,revenue:0,cost:0,profit:0,discount:0,itemCount:0,sales:new Set()};
      currentRow.revenue+=row.revenue;currentRow.cost+=row.cost;currentRow.profit+=row.profit;currentRow.discount+=row.discount;currentRow.itemCount+=row.quantity;currentRow.sales.add(row.operationId);byMonth.set(key,currentRow);
    });
    const erpTimeline=[...byMonth.values()].map(row=>({month:row.month,label:row.label,source:row.source,sourceLabel:row.sourceLabel,historical:false,revenue:round2(row.revenue),cost:round2(row.cost),profit:round2(row.profit),discount:round2(row.discount),itemCount:round2(row.itemCount),salesCount:row.sales.size,margin:safeMargin(row.profit,row.revenue),markup:safeMarkup(row.revenue,row.cost)}));
    const timeline=[...history.items,...erpTimeline].sort((a,b)=>a.month.localeCompare(b.month));
    const revenue=round2(current.revenue+history.totals.revenue),cost=round2(current.cost+history.totals.cost),profit=round2(revenue-cost),discount=round2(current.discount+history.totals.discount),items=round2(current.items+history.totals.itemCount),sales=current.sales+history.totals.salesCount,ticket=sales?round2(revenue/sales):0;
    return {filters:f,cards:{revenue,cost,profit,margin:safeMargin(profit,revenue),discount,sales,items,ticket,currentRevenue:current.revenue,historicalRevenue:history.totals.revenue},timeline,sellers:this.sellers(f),history:history.info};
  }

  profitability(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f),history=this.historicalFinancials(f),byMonth=new Map();
    rows.forEach(row=>{
      const key=monthKey(row.date);if(!key)return;
      const current=byMonth.get(key)||{month:key,label:monthLabel(key),source:'erp',sourceLabel:'Quality ERP',historical:false,revenue:0,cost:0,profit:0,discount:0,items:0,sales:new Set()};
      current.revenue+=row.revenue;current.cost+=row.cost;current.profit+=row.profit;current.discount+=row.discount;current.items+=row.quantity;current.sales.add(row.operationId);byMonth.set(key,current);
    });
    const erpItems=[...byMonth.values()].map(row=>({month:row.month,label:row.label,source:row.source,sourceLabel:row.sourceLabel,historical:false,revenue:round2(row.revenue),cost:round2(row.cost),profit:round2(row.profit),margin:safeMargin(row.profit,row.revenue),markup:safeMarkup(row.revenue,row.cost),discount:round2(row.discount),itemCount:round2(row.items),salesCount:row.sales.size}));
    const items=[...history.items,...erpItems].sort((a,b)=>a.month.localeCompare(b.month));
    const totals=items.reduce((acc,row)=>{acc.revenue+=row.revenue;acc.cost+=row.cost;acc.profit+=row.profit;acc.discount+=row.discount;acc.itemCount+=row.itemCount;acc.salesCount+=row.salesCount;return acc;},{revenue:0,cost:0,profit:0,discount:0,itemCount:0,salesCount:0});
    Object.keys(totals).forEach(key=>{if(typeof totals[key]==='number')totals[key]=round2(totals[key]);});totals.margin=safeMargin(totals.profit,totals.revenue);totals.markup=safeMarkup(totals.revenue,totals.cost);
    return {filters:f,items,totals,sellers:this.sellers(f),history:history.info};
  }

  topProducts(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f),catalog=this.productCatalog(),stock=this.inventoryService?.readJson?.(this.inventoryService.stockFile,{items:[]})||{items:[]};
    const stockMap=new Map(itemsOf(stock).map(item=>[text(item.inventoryItemId),num(item.physicalQuantity)]));
    const grouped=new Map();
    rows.forEach(row=>{
      const key=row.inventoryItemId||row.productId||row.code||normalize(row.product);
      const current=grouped.get(key)||{key,productId:row.productId,inventoryItemId:row.inventoryItemId,code:row.code,product:row.product,quantity:0,revenue:0,cost:0,profit:0,discount:0,sales:new Set(),lastSale:''};
      current.quantity+=row.quantity;current.revenue+=row.revenue;current.cost+=row.cost;current.profit+=row.profit;current.discount+=row.discount;current.sales.add(row.operationId);if(row.date>current.lastSale)current.lastSale=row.date;grouped.set(key,current);
    });
    const result=[...grouped.values()].map(row=>{
      const meta=catalog.byInventory.get(row.inventoryItemId)||catalog.byProduct.get(row.productId)||catalog.byCode.get(normalize(row.code))||{};
      const sourceRow=rows.find(item=>(row.inventoryItemId&&item.inventoryItemId===row.inventoryItemId)||(row.productId&&item.productId===row.productId));
      const kind=meta.kind||sourceRow?.kind||'product';
      return {productId:row.productId,inventoryItemId:row.inventoryItemId,code:meta.code||row.code,product:meta.name||row.product,brand:meta.brand||sourceRow?.brand||'',category:meta.category||sourceRow?.category||'',kind,productRemoved:sourceRow?.productRemoved===true,quantity:round2(row.quantity),revenue:round2(row.revenue),cost:round2(row.cost),profit:round2(row.profit),margin:safeMargin(row.profit,row.revenue),discount:round2(row.discount),salesCount:row.sales.size,currentStock:round2(stockMap.get(row.inventoryItemId)||0),lastSale:row.lastSale};
    }).filter(row=>f.productKind==='all'||row.kind===f.productKind);
    const sorters={
      quantity:(a,b)=>b.quantity-a.quantity||b.revenue-a.revenue,
      revenue:(a,b)=>b.revenue-a.revenue||b.quantity-a.quantity,
      profit:(a,b)=>b.profit-a.profit||b.revenue-a.revenue,
      margin:(a,b)=>b.margin-a.margin||b.profit-a.profit,
      discount:(a,b)=>b.discount-a.discount||b.revenue-a.revenue
    };
    result.sort(sorters[f.productSort]||sorters.quantity);
    result.splice(f.top);
    const totals=result.reduce((a,r)=>{a.quantity+=r.quantity;a.revenue+=r.revenue;a.cost+=r.cost;a.profit+=r.profit;a.discount+=r.discount;return a;},{quantity:0,revenue:0,cost:0,profit:0,discount:0});
    Object.keys(totals).forEach(k=>totals[k]=round2(totals[k])); totals.margin=safeMargin(totals.profit,totals.revenue);
    return {filters:f,items:result,totals,sellers:this.sellers(f)};
  }

  turnover(filters={}){
    const f=this.normalizeFilters(filters),catalog=this.productCatalog();
    const movements=itemsOf(this.inventoryService?.readJson?.(this.inventoryService.movementsFile,{items:[]})||{items:[]});
    const stock=itemsOf(this.inventoryService?.readJson?.(this.inventoryService.stockFile,{items:[]})||{items:[]});
    const fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to),nowMs=Date.now();
    const stockMap=new Map(stock.map(item=>[text(item.inventoryItemId),num(item.physicalQuantity)]));
    const grouped=new Map();
    const ensure=(id)=>{
      if(!grouped.has(id)) grouped.set(id,{inventoryItemId:id,salesQty:0,purchaseQty:0,netMovement:0,movementCount:0,movementsAfterTo:0,lastSale:'',lastPurchase:'',lastMovement:''});
      return grouped.get(id);
    };
    for(const movement of movements){
      const id=text(movement.inventoryItemId); if(!id)continue;
      const row=ensure(id),when=dateMs(movement.createdAt),signed=num(movement.signedQuantity ?? (movement.direction==='saida'?-num(movement.quantity):num(movement.quantity)));
      const date=isoDate(movement.createdAt);
      if(Number.isFinite(when)&&when<=toMs){
        if(String(movement.classification).toLowerCase()==='sale' && date>row.lastSale) row.lastSale=date;
        if(String(movement.classification).toLowerCase()==='purchase' && date>row.lastPurchase) row.lastPurchase=date;
        if(date>row.lastMovement) row.lastMovement=date;
      }
      if(Number.isFinite(when)&&when>toMs) row.movementsAfterTo+=signed;
      if(!Number.isFinite(when)||when<fromMs||when>toMs) continue;
      row.netMovement+=signed; row.movementCount++;
      if(String(movement.classification).toLowerCase()==='sale') row.salesQty+=Math.abs(signed||num(movement.quantity));
      if(String(movement.classification).toLowerCase()==='purchase') row.purchaseQty+=Math.abs(signed||num(movement.quantity));
    }
    for(const id of stockMap.keys()) ensure(id);
    const periodDays=Math.max(1,daysBetween(fromMs,toMs)+1);
    const allResult=[...grouped.values()].map(row=>{
      const meta=catalog.byInventory.get(row.inventoryItemId)||{};
      const current=num(stockMap.get(row.inventoryItemId));
      const closing=round2(current-row.movementsAfterTo);
      const opening=round2(closing-row.netMovement);
      const average=Math.max(0,(Math.max(0,opening)+Math.max(0,closing))/2);
      const turnover=average>0?round2(row.salesQty/average):(row.salesQty>0?row.salesQty:null);
      const dailySales=row.salesQty/periodDays;
      const coverageDays=dailySales>0?round2(Math.max(0,closing)/dailySales):null;
      const lastSaleMs=row.lastSale?endOfDayMs(row.lastSale):NaN;
      const daysWithoutSale=Number.isFinite(lastSaleMs)?daysBetween(lastSaleMs,Math.min(nowMs,toMs)):null;
      const unitCost=round2(num(meta.cost)),unitPrice=round2(num(meta.price));
      const stockControlled=meta.stockControlled!==false,includeInValuation=meta.includeInValuation!==false;
      const movementReference=Math.max(1,row.salesQty+row.purchaseQty);
      const atypicalStock=closing>=1000 && closing>=movementReference*100;
      let status='normal';
      if(atypicalStock&&closing>0) status='atypical';
      else if(closing<=0 && row.salesQty<=0 && row.purchaseQty<=0) status='empty';
      else if(daysWithoutSale!==null && daysWithoutSale>=f.staleDays && closing>0) status='stale';
      else if(row.salesQty<=0 && closing>0) status='no_sales';
      else if(coverageDays!==null && coverageDays>90) status='slow';
      else if(row.salesQty>0 && (turnover||0)>=2) status='high';
      const valuationExcluded=!stockControlled||!includeInValuation||atypicalStock;
      const rawCapital=round2(Math.max(0,closing)*unitCost);
      return {inventoryItemId:row.inventoryItemId,productId:meta.productId||'',code:meta.code||'',product:meta.name||`Item ${row.inventoryItemId}`,brand:meta.brand||'',category:meta.category||'',openingStock:round2(opening),currentStock:round2(closing),soldQty:round2(row.salesQty),purchasedQty:round2(row.purchaseQty),turnover,coverageDays,lastSale:row.lastSale,lastPurchase:row.lastPurchase,daysWithoutSale,status,unitCost,unitPrice,stockControlled,includeInValuation,atypicalStock,valuationExcluded,capitalAtCost:valuationExcluded?0:rawCapital,rawCapitalAtCost:rawCapital,salesPotential:round2(Math.max(0,closing)*unitPrice)};
    }).filter(row=>{
      if(!f.q)return true; return normalize([row.code,row.product,row.brand,row.category].join(' ')).includes(normalize(f.q));
    }).sort((a,b)=>{
      const priority={atypical:0,stale:1,no_sales:2,slow:3,normal:4,high:5,empty:6};
      return (priority[a.status]??9)-(priority[b.status]??9) || (b.daysWithoutSale||0)-(a.daysWithoutSale||0) || b.rawCapitalAtCost-a.rawCapitalAtCost;
    });
    const viewMatches=row=>{
      if(f.turnoverView==='all') return true;
      if(f.turnoverView==='no_sales') return row.currentStock>0 && row.soldQty<=0 && !row.atypicalStock;
      return row.status===f.turnoverView;
    };
    const result=allResult.filter(viewMatches);
    const validStockRows=allResult.filter(r=>r.stockControlled&&!r.atypicalStock);
    const atypicalRows=allResult.filter(r=>r.stockControlled&&r.atypicalStock);
    const statusCounts={
      all:allResult.filter(r=>r.status!=='empty').length,
      no_sales:allResult.filter(r=>r.currentStock>0&&r.soldQty<=0&&!r.atypicalStock).length,
      slow:allResult.filter(r=>r.status==='slow').length,
      normal:allResult.filter(r=>r.status==='normal').length,
      high:allResult.filter(r=>r.status==='high').length,
      atypical:atypicalRows.length,
      empty:allResult.filter(r=>r.status==='empty').length
    };
    const totals={
      items:allResult.length,
      activeItems:allResult.filter(r=>r.status!=='empty').length,
      stock:round2(validStockRows.reduce((s,r)=>s+r.currentStock,0)),
      physicalStock:round2(allResult.filter(r=>r.stockControlled).reduce((s,r)=>s+r.currentStock,0)),
      atypicalStockUnits:round2(atypicalRows.reduce((s,r)=>s+r.currentStock,0)),
      sold:round2(allResult.reduce((s,r)=>s+r.soldQty,0)),
      capitalAtCost:round2(allResult.reduce((s,r)=>s+r.capitalAtCost,0)),
      rawCapitalAtCost:round2(allResult.reduce((s,r)=>s+r.rawCapitalAtCost,0)),
      excludedCapital:round2(allResult.filter(r=>r.valuationExcluded).reduce((s,r)=>s+r.rawCapitalAtCost,0)),
      excludedItems:allResult.filter(r=>r.valuationExcluded&&r.rawCapitalAtCost>0).length,
      staleCapital:round2(allResult.filter(r=>['stale','no_sales'].includes(r.status)).reduce((s,r)=>s+r.capitalAtCost,0)),
      staleItems:allResult.filter(r=>['stale','no_sales'].includes(r.status)).length,
      shown:result.length,
      statusCounts
    };
    return {filters:f,items:result,allItems:allResult,totals,sellers:this.sellers(f)};
  }

  sellerPerformance(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f),allRevenue=rows.reduce((s,r)=>s+r.revenue,0),grouped=new Map();
    rows.forEach(row=>{
      const key=row.seller||'Sem vendedor',current=grouped.get(key)||{seller:key,items:0,revenue:0,cost:0,profit:0,discount:0,sales:new Set()};
      current.items+=row.quantity;current.revenue+=row.revenue;current.cost+=row.cost;current.profit+=row.profit;current.discount+=row.discount;current.sales.add(row.operationId);grouped.set(key,current);
    });
    const items=[...grouped.values()].map(row=>({seller:row.seller,salesCount:row.sales.size,itemCount:round2(row.items),pa:row.sales.size?round2(row.items/row.sales.size):0,revenue:round2(row.revenue),ticket:row.sales.size?round2(row.revenue/row.sales.size):0,participation:percent(row.revenue,allRevenue),discount:round2(row.discount),cost:round2(row.cost),profit:round2(row.profit),margin:safeMargin(row.profit,row.revenue)})).sort((a,b)=>b.revenue-a.revenue);
    return {filters:f,items,totals:{revenue:round2(allRevenue),salesCount:new Set(rows.map(r=>r.operationId)).size,itemCount:round2(rows.reduce((s,r)=>s+r.quantity,0)),discount:round2(rows.reduce((s,r)=>s+r.discount,0)),profit:round2(rows.reduce((s,r)=>s+r.profit,0))},sellers:this.sellers(f)};
  }

  discounts(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f),grouped=new Map();
    rows.forEach(row=>{
      const key=row.seller||'Sem vendedor',current=grouped.get(key)||{seller:key,sales:new Set(),discountedSales:new Set(),gross:0,discount:0,revenue:0,items:0,maxDiscountPercent:0};
      current.sales.add(row.operationId);current.gross+=row.gross;current.discount+=row.discount;current.revenue+=row.revenue;current.items+=row.quantity;
      if(row.discount>0){current.discountedSales.add(row.operationId);current.maxDiscountPercent=Math.max(current.maxDiscountPercent,percent(row.discount,row.gross));}
      grouped.set(key,current);
    });
    const items=[...grouped.values()].map(row=>({seller:row.seller,salesCount:row.sales.size,salesWithDiscount:row.discountedSales.size,gross:round2(row.gross),discount:round2(row.discount),discountPercent:percent(row.discount,row.gross),averageDiscountPerDiscountedSale:row.discountedSales.size?round2(row.discount/row.discountedSales.size):0,maxDiscountPercent:round2(row.maxDiscountPercent),revenue:round2(row.revenue)})).sort((a,b)=>b.discount-a.discount);
    const detail=rows.filter(row=>row.discount>0).sort((a,b)=>b.discount-a.discount).slice(0,300);
    return {filters:f,items,detail,totals:{gross:round2(rows.reduce((s,r)=>s+r.gross,0)),discount:round2(rows.reduce((s,r)=>s+r.discount,0)),revenue:round2(rows.reduce((s,r)=>s+r.revenue,0)),discountPercent:percent(rows.reduce((s,r)=>s+r.discount,0),rows.reduce((s,r)=>s+r.gross,0))},sellers:this.sellers(f)};
  }

  salesDetails(filters={}){
    const f=this.normalizeFilters(filters),rows=this.operationRows(f).sort((a,b)=>String(b.date).localeCompare(String(a.date))||num(b.number)-num(a.number));
    const items=rows.slice(0,1000);
    const totals={quantity:round2(rows.reduce((s,r)=>s+r.quantity,0)),gross:round2(rows.reduce((s,r)=>s+r.gross,0)),discount:round2(rows.reduce((s,r)=>s+r.discount,0)),revenue:round2(rows.reduce((s,r)=>s+r.revenue,0)),cost:round2(rows.reduce((s,r)=>s+r.cost,0)),profit:round2(rows.reduce((s,r)=>s+r.profit,0))};
    totals.margin=safeMargin(totals.profit,totals.revenue);
    return {filters:f,items,totals,truncated:rows.length>items.length,totalRows:rows.length,sellers:this.sellers(f)};
  }

  paymentMethods(filters={}){
    const f=this.normalizeFilters(filters),operations=this.finalizedOperations(f),grouped=new Map();
    let total=0,count=0;
    for(const operation of operations){
      const payments=Array.isArray(operation.snapshot?.payments)&&operation.snapshot.payments.length?operation.snapshot.payments:(operation.payments||[]);
      for(const payment of payments){
        const value=round2(num(payment.amount)); if(value<=0)continue;
        const id=text(payment.methodId)||text(payment.paymentMethodId)||'sem-forma';
        const name=text(payment.methodName)||text(payment.paymentMethodName)||id||'Sem forma';
        const key=normalize(name)||id;
        const current=grouped.get(key)||{id,name,total:0,count:0,operations:new Set()};
        current.total+=value;current.count++;current.operations.add(operation.id);grouped.set(key,current);total+=value;count++;
      }
    }
    const items=[...grouped.values()].map(row=>({id:row.id,name:row.name,total:round2(row.total),count:row.count,salesCount:row.operations.size,participation:percent(row.total,total)})).sort((a,b)=>b.total-a.total);
    return {filters:f,items,totals:{total:round2(total),count,salesCount:operations.length},sellers:this.sellers(f)};
  }

  purchases(filters={}){
    const f=this.normalizeFilters(filters),fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to),catalog=this.productCatalog();
    const effectiveInfo=purchase=>{
      const hasFiscal=Boolean(text(purchase.invoiceNumber)||text(purchase.accessKey)||text(purchase.fiscalDocument?.accessKey)||text(purchase.fiscalDocument?.xmlFile));
      const raw=hasFiscal?(purchase.issueDate||purchase.entryDate||purchase.createdAt):(purchase.createdAt||purchase.entryDate||purchase.issueDate);
      return {date:isoDate(raw),raw,source:hasFiscal?'NF / XML':'Cadastro',hasFiscal};
    };
    const all=(this.purchaseService?.list?.({})||[]).filter(purchase=>purchase.status==='completed');
    const items=all.filter(purchase=>{
      const info=effectiveInfo(purchase),when=dateMs(info.raw);if(!Number.isFinite(when)||when<fromMs||when>toMs)return false;
      if(!f.q)return true;
      const hay=normalize([purchase.number,purchase.supplierName,purchase.supplierDocument,purchase.invoiceNumber,purchase.accessKey,purchase.createdBy,purchase.completedBy,...(purchase.items||[]).flatMap(item=>[item.productName,item.baseProductName,item.variationLabel,item.productCode,item.sku,item.barcode,item.brand])].join(' '));
      return hay.includes(normalize(f.q));
    });
    const suppliers=new Map(),responsibles=new Map(),periods=new Map(),observations=new Map();
    let itemCount=0,total=0,withFiscal=0,manual=0;
    const resolveItem=item=>{
      const meta=catalog.byInventory.get(text(item.inventoryItemId))||catalog.byProduct.get(text(item.productId))||catalog.byCode.get(normalize(text(item.productCode)||text(item.sku)))||{};
      return {key:text(item.inventoryItemId)||text(item.productId)||text(item.productCode)||normalize(item.productName),inventoryItemId:text(item.inventoryItemId),productId:text(item.productId),code:text(meta.code)||text(item.productCode)||text(item.sku),product:text(meta.name)||text(item.productName)||text(item.baseProductName)||'Produto',brand:text(meta.brand)||text(item.brand),variation:text(meta.variationLabel)||text(item.variationLabel),removed:meta.removed===true};
    };
    for(const purchase of items){
      const dateInfo=effectiveInfo(purchase),date=dateInfo.date,responsible=userFacingActor(purchase.completedBy||purchase.createdBy||purchase.updatedBy),purchaseTotal=round2(num(purchase.total));
      const quantity=(purchase.items||[]).reduce((sum,item)=>sum+num(item.quantity),0);itemCount+=quantity;total+=purchaseTotal;if(dateInfo.hasFiscal)withFiscal++;else manual++;
      const supplierKey=text(purchase.supplierId)||text(purchase.supplierName)||'Sem fornecedor',supplier=suppliers.get(supplierKey)||{supplierId:text(purchase.supplierId),supplier:text(purchase.supplierName)||'Sem fornecedor',purchases:0,items:0,total:0,lastPurchase:''};
      supplier.purchases++;supplier.items+=quantity;supplier.total+=purchaseTotal;if(date>supplier.lastPurchase)supplier.lastPurchase=date;suppliers.set(supplierKey,supplier);
      const responsibleRow=responsibles.get(responsible)||{responsible,purchases:0,items:0,total:0,lastPurchase:''};responsibleRow.purchases++;responsibleRow.items+=quantity;responsibleRow.total+=purchaseTotal;if(date>responsibleRow.lastPurchase)responsibleRow.lastPurchase=date;responsibles.set(responsible,responsibleRow);
      const periodKey=monthKey(date),period=periods.get(periodKey)||{month:periodKey,label:monthLabel(periodKey),purchases:0,items:0,total:0};period.purchases++;period.items+=quantity;period.total+=purchaseTotal;periods.set(periodKey,period);
      for(const item of purchase.items||[]){
        const meta=resolveItem(item),unitCost=round2(num(item.unitCost)),qty=round2(num(item.quantity)),lineTotal=round2(unitCost*qty),key=meta.key;if(!key)continue;
        const obs=observations.get(key)||{...meta,rows:[]};obs.rows.push({purchaseId:purchase.id,purchaseNumber:purchase.number||'',supplierId:text(purchase.supplierId),supplier:text(purchase.supplierName)||'Sem fornecedor',date,unitCost,quantity:qty,total:lineTotal,responsible,dateSource:dateInfo.source});observations.set(key,obs);
      }
    }
    const bySupplier=[...suppliers.values()].map(row=>({...row,items:round2(row.items),total:round2(row.total),averageTicket:row.purchases?round2(row.total/row.purchases):0})).sort((a,b)=>b.total-a.total);
    const byResponsible=[...responsibles.values()].map(row=>({...row,items:round2(row.items),total:round2(row.total),averageTicket:row.purchases?round2(row.total/row.purchases):0})).sort((a,b)=>b.total-a.total);
    const byPeriod=[...periods.values()].filter(row=>row.month).map(row=>({...row,items:round2(row.items),total:round2(row.total),averageTicket:row.purchases?round2(row.total/row.purchases):0})).sort((a,b)=>a.month.localeCompare(b.month));
    const comparisons=[],costTrends=[],topPurchased=[],paidMore=[],boughtBetter=[];
    for(const product of observations.values()){
      const supplierMap=new Map();
      for(const row of product.rows){
        const key=row.supplierId||normalize(row.supplier),current=supplierMap.get(key)||{supplierId:row.supplierId,supplier:row.supplier,quantity:0,total:0,minCost:null,maxCost:null,lastCost:0,lastDate:'',purchases:new Set()};
        current.quantity+=row.quantity;current.total+=row.total;current.minCost=current.minCost===null?row.unitCost:Math.min(current.minCost,row.unitCost);current.maxCost=current.maxCost===null?row.unitCost:Math.max(current.maxCost,row.unitCost);if(row.date>=current.lastDate){current.lastDate=row.date;current.lastCost=row.unitCost;}current.purchases.add(row.purchaseId);supplierMap.set(key,current);
      }
      const supplierRows=[...supplierMap.values()].map(row=>({...row,quantity:round2(row.quantity),total:round2(row.total),averageCost:row.quantity?round2(row.total/row.quantity):0,purchaseCount:row.purchases.size})).sort((a,b)=>a.averageCost-b.averageCost);
      const totalQty=round2(product.rows.reduce((sum,row)=>sum+row.quantity,0)),totalValue=round2(product.rows.reduce((sum,row)=>sum+row.total,0));
      const latest=[...product.rows].sort((a,b)=>b.date.localeCompare(a.date))[0]||{};
      topPurchased.push({product:product.product,code:product.code,variation:product.variation,removed:product.removed,quantity:totalQty,total:totalValue,averageCost:totalQty?round2(totalValue/totalQty):0,purchases:new Set(product.rows.map(row=>row.purchaseId)).size,suppliers:supplierRows.length,lastPurchase:latest.date||'',lastSupplier:latest.supplier||''});
      if(supplierRows.length>=2){
        const best=supplierRows[0],highest=supplierRows[supplierRows.length-1],spread=round2(highest.averageCost-best.averageCost),spreadPercent=best.averageCost?round2((spread/best.averageCost)*100):0;
        const extraPaid=round2(supplierRows.reduce((sum,row)=>sum+Math.max(0,(row.averageCost-best.averageCost)*row.quantity),0));
        const savedVsHighest=round2((highest.averageCost-best.averageCost)*best.quantity);
        const supplierSignals=supplierRows.map(row=>({...row,extraVsBest:round2(Math.max(0,(row.averageCost-best.averageCost)*row.quantity)),savingVsHighest:round2(Math.max(0,(highest.averageCost-row.averageCost)*row.quantity))}));
        const comparison={product:product.product,code:product.code,inventoryItemId:product.inventoryItemId,variation:product.variation,removed:product.removed,suppliers:supplierSignals,bestSupplier:best.supplier,bestCost:best.averageCost,highestSupplier:highest.supplier,highestCost:highest.averageCost,spread,spreadPercent,extraPaid,savedVsHighest,potentialSaving:extraPaid,totalQuantity:round2(supplierRows.reduce((sum,row)=>sum+row.quantity,0))};
        comparisons.push(comparison);
        supplierSignals.filter(row=>row.extraVsBest>0).forEach(row=>paidMore.push({product:product.product,code:product.code,variation:product.variation,removed:product.removed,supplier:row.supplier,quantity:row.quantity,averageCost:row.averageCost,bestSupplier:best.supplier,bestCost:best.averageCost,extraPaid:row.extraVsBest,differenceUnit:round2(row.averageCost-best.averageCost),differencePercent:best.averageCost?round2((row.averageCost-best.averageCost)/best.averageCost*100):0,lastDate:row.lastDate||''}));
        if(best.quantity>0 && spread>0) boughtBetter.push({product:product.product,code:product.code,variation:product.variation,removed:product.removed,supplier:best.supplier,quantity:best.quantity,averageCost:best.averageCost,highestSupplier:highest.supplier,highestCost:highest.averageCost,advantage:savedVsHighest,differenceUnit:spread,differencePercent:spreadPercent,lastDate:best.lastDate||''});
      }
      const chronological=[...product.rows].filter(row=>row.unitCost>0).sort((a,b)=>a.date.localeCompare(b.date));
      if(chronological.length>=2){
        const first=chronological[0],last=chronological[chronological.length-1],minRow=chronological.reduce((a,b)=>b.unitCost<a.unitCost?b:a),maxRow=chronological.reduce((a,b)=>b.unitCost>a.unitCost?b:a),change=round2(last.unitCost-first.unitCost),changePercent=first.unitCost?round2(change/first.unitCost*100):0;
        costTrends.push({product:product.product,code:product.code,variation:product.variation,removed:product.removed,firstDate:first.date,firstCost:first.unitCost,lastDate:last.date,lastCost:last.unitCost,change,changePercent,minCost:minRow.unitCost,maxCost:maxRow.unitCost,purchases:chronological.length});
      }
    }
    comparisons.sort((a,b)=>b.extraPaid-a.extraPaid||b.spreadPercent-a.spreadPercent);
    paidMore.sort((a,b)=>b.extraPaid-a.extraPaid||b.differencePercent-a.differencePercent);
    boughtBetter.sort((a,b)=>b.advantage-a.advantage||b.differencePercent-a.differencePercent);
    costTrends.sort((a,b)=>Math.abs(b.changePercent)-Math.abs(a.changePercent));
    topPurchased.sort((a,b)=>b.quantity-a.quantity||b.total-a.total||a.product.localeCompare(b.product,'pt-BR'));
    const details=items.map(p=>{const info=effectiveInfo(p);return {id:p.id,number:p.number,date:info.date,dateSource:info.source,supplier:p.supplierName||'Sem fornecedor',invoiceNumber:p.invoiceNumber||'',itemCount:round2((p.items||[]).reduce((sum,item)=>sum+num(item.quantity),0)),total:round2(p.total),responsible:userFacingActor(p.completedBy||p.createdBy||p.updatedBy)};}).sort((a,b)=>b.date.localeCompare(a.date)||String(b.number).localeCompare(String(a.number)));
    const topResponsible=[...byResponsible].sort((a,b)=>b.total-a.total)[0]||null;
    const topPeriod=[...byPeriod].sort((a,b)=>b.total-a.total)[0]||null;
    const topSupplier=bySupplier[0]||null;
    const extraPaidTotal=round2(comparisons.reduce((sum,row)=>sum+row.extraPaid,0));
    const savedVsHighestTotal=round2(comparisons.reduce((sum,row)=>sum+row.savedVsHighest,0));
    const topLoss=[...comparisons].sort((a,b)=>b.extraPaid-a.extraPaid)[0]||null;
    const topSaving=[...comparisons].sort((a,b)=>b.savedVsHighest-a.savedVsHighest)[0]||null;
    return {filters:f,items:details,bySupplier,byResponsible,byPeriod,comparisons:comparisons.slice(0,100),paidMore:paidMore.slice(0,150),boughtBetter:boughtBetter.slice(0,150),costTrends:costTrends.slice(0,100),topPurchased:topPurchased.slice(0,100),totals:{purchases:items.length,itemCount:round2(itemCount),total:round2(total),averageTicket:items.length?round2(total/items.length):0,supplierCount:bySupplier.length,responsibleCount:byResponsible.length,withFiscal,manual,comparisonItems:comparisons.length,paidMoreItems:paidMore.length,boughtBetterItems:boughtBetter.length,extraPaidTotal,savedVsHighestTotal,topLoss,topSaving,topResponsible,topPeriod,topSupplier},sellers:this.sellers(f)};
  }

  expenses(filters={}){
    const f=this.normalizeFilters(filters),fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to);
    const financeDir=path.join(this.panelDir,'data','erp','finance');
    let payables=[];
    try { payables=this.payablesService?.list?.({view:'all',type:'expense'})||[]; } catch(_error) { payables=[]; }
    if(!payables.length) payables=itemsOf(readJson(path.join(financeDir,'payables.json'),{items:[]}));
    const installments=itemsOf(readJson(path.join(financeDir,'payable-installments.json'),{items:[]}));
    const payments=itemsOf(readJson(path.join(financeDir,'payable-payments.json'),{items:[]}));
    const costCenters=itemsOf(readJson(path.join(financeDir,'cost-centers.json'),{items:[]}));
    const accounts=itemsOf(readJson(path.join(financeDir,'chart-of-accounts.json'),{items:[]}));
    const costCenterMap=new Map(costCenters.map(item=>[text(item.id),text(item.name)||text(item.code)]));
    const accountMap=new Map(accounts.map(item=>[text(item.id),text(item.name)||text(item.code)]));
    const isExpense=item=>{
      const status=normalize(item.status); if(['reversed','cancelled','canceled'].includes(status))return false;
      const entryType=normalize(item.entryType),origin=normalize(item.origin);
      if(['purchase','compra'].includes(entryType)||origin.includes('purchase')||origin.includes('compra'))return false;
      return !entryType || ['expense','despesa'].includes(entryType) || !origin.includes('sale');
    };
    const matchesSearch=item=>!f.q||normalize([item.number,item.supplierName,item.description,item.documentNumber,item.accountId,item.accountName,item.costCenterId,item.costCenterName].join(' ')).includes(normalize(f.q));
    const expensePayables=payables.filter(item=>isExpense(item)&&matchesSearch(item));
    const expenseById=new Map(expensePayables.map(item=>[text(item.id),item]));
    const inPeriod=value=>{const when=dateMs(value);return Number.isFinite(when)&&when>=fromMs&&when<=toMs;};
    // A despesa mensal deve considerar apenas a parcela que pertence ao período.
    // Somar o valor integral de um financiamento parcelado distorce completamente o mês.
    let periodInstallments=installments.filter(row=>expenseById.has(text(row.payableId))&&!['reversed','cancelled','canceled'].includes(normalize(row.status))&&inPeriod(row.dueDate));
    const payablesWithInstallments=new Set(installments.map(row=>text(row.payableId)));
    const standalone=expensePayables.filter(item=>!payablesWithInstallments.has(text(item.id))&&inPeriod(item.competenceDate||item.issueDate||item.createdAt)).map(item=>({id:`virtual:${item.id}`,payableId:item.id,dueDate:item.competenceDate||item.issueDate||isoDate(item.createdAt),originalValue:num(item.netValue??item.total??item.grossValue),value:num(item.netValue??item.total??item.grossValue),openBalance:num(item.openBalance),status:item.status,__virtual:true}));
    periodInstallments=[...periodInstallments,...standalone];
    const paymentsByInstallment=new Map();
    payments.filter(row=>normalize(row.status)!=='reversed').forEach(row=>{const id=text(row.installmentId);if(!id)return;paymentsByInstallment.set(id,round2((paymentsByInstallment.get(id)||0)+num(row.value)));});
    const periodPayments=payments.filter(payment=>normalize(payment.status)!=='reversed'&&expenseById.has(text(payment.payableId))&&inPeriod(payment.paidAt||payment.createdAt));
    const months=new Map(),groups=new Map(),titleRows=new Map();
    for(const installment of periodInstallments){
      const item=expenseById.get(text(installment.payableId)); if(!item)continue;
      const key=monthKey(installment.dueDate);if(!key)continue;
      const value=round2(num(installment.originalValue??installment.value));
      const paidValue=installment.__virtual?Math.max(0,value-num(installment.openBalance)):Math.min(value,num(paymentsByInstallment.get(text(installment.id))||Math.max(0,value-num(installment.openBalance))));
      const openValue=round2(Math.max(0,num(installment.openBalance)));
      months.set(key,round2((months.get(key)||0)+value));
      const group=costCenterMap.get(text(item.costCenterId))||text(item.costCenterName)||'Sem centro de custo';
      const account=accountMap.get(text(item.accountId))||text(item.accountName)||text(item.description)||'Sem plano de contas';
      const groupKey=`${group}@@${account}`,current=groups.get(groupKey)||{group,account,total:0,months:{},count:0,paid:0,open:0};
      current.total+=value;current.count++;current.paid+=paidValue;current.open+=openValue;current.months[key]=round2((current.months[key]||0)+value);groups.set(groupKey,current);
      const titleKey=text(item.id),title=titleRows.get(titleKey)||{id:item.id,number:item.number||'',date:isoDate(installment.dueDate),supplier:item.supplierName||'',description:item.description||'Despesa',group,account,total:0,paid:0,open:0,installments:0,status:normalize(item.status)};
      title.total+=value;title.paid+=paidValue;title.open+=openValue;title.installments++; if(isoDate(installment.dueDate)<title.date)title.date=isoDate(installment.dueDate);titleRows.set(titleKey,title);
    }
    const committed=round2(periodInstallments.reduce((sum,row)=>sum+num(row.originalValue??row.value),0));
    const paidSelected=round2([...groups.values()].reduce((sum,row)=>sum+num(row.paid),0));
    const open=round2([...groups.values()].reduce((sum,row)=>sum+num(row.open),0));
    const cashPaid=round2(periodPayments.reduce((sum,item)=>sum+num(item.value),0));
    const monthKeys=[...months.keys()].sort();
    const items=[...groups.values()].map(row=>({...row,total:round2(row.total),paid:round2(row.paid),open:round2(row.open),share:percent(row.total,committed)})).sort((a,b)=>b.total-a.total||a.group.localeCompare(b.group,'pt-BR'));
    const byCenter=new Map();items.forEach(row=>byCenter.set(row.group,round2((byCenter.get(row.group)||0)+row.total)));
    const centers=[...byCenter.entries()].map(([name,total])=>({name,total,share:percent(total,committed)})).sort((a,b)=>b.total-a.total);
    const topExpenses=[...titleRows.values()].map(row=>({...row,total:round2(row.total),paid:round2(row.paid),open:round2(row.open)})).sort((a,b)=>b.total-a.total).slice(0,50);
    return {filters:f,months:monthKeys.map(key=>({key,label:monthLabel(key),total:round2(months.get(key))})),items,centers,topExpenses,totals:{total:committed,paid:paidSelected,cashPaid,open,count:periodInstallments.length,titles:titleRows.size,paymentCount:periodPayments.length,topCenter:centers[0]||null,topAccount:items[0]||null},sellers:this.sellers(f)};
  }


  customerInactivity(filters={}){
    const f=this.normalizeFilters(filters),referenceDate=new Date().toISOString().slice(0,10),referenceMs=endOfDayMs(referenceDate);
    const customers=itemsOf(readJson(path.join(this.panelDir,'data','erp','customers','customers.json'),{items:[]}));
    const wm10History=readJson(path.join(this.panelDir,'data','erp','customers','wm10-customer-history.json'),{customers:{}})?.customers||{};
    const currentOps=(this.commerceService?.listOperations?.({status:'all'})||[]).filter(operation=>operation.status==='finalized'&&text(operation.customerId));
    const currentByCustomer=new Map();
    for(const operation of currentOps){
      const id=text(operation.customerId); if(!id)continue;
      if(!currentByCustomer.has(id)) currentByCustomer.set(id,[]);
      currentByCustomer.get(id).push({...operation,__historySource:'erp'});
    }
    const returnsByCustomer=new Map();
    for(const record of (this.returnService?.list?.({})||[])){
      if(record.status!=='completed'||!text(record.customerId))continue;
      const id=text(record.customerId);
      if(!returnsByCustomer.has(id))returnsByCustomer.set(id,[]);
      returnsByCustomer.get(id).push(record);
    }
    const windowDays=f.customerWindow==='all'?null:Number(f.customerWindow||90);
    const windowFromMs=windowDays===null?null:referenceMs-(Math.max(1,windowDays)-1)*86400000;
    const rangeMatches=(days,status)=>{
      if(f.customerInactiveRange==='never') return status==='never';
      if(days===null) return false;
      if(f.customerInactiveRange==='30_59') return days>=30&&days<=59;
      if(f.customerInactiveRange==='60_89') return days>=60&&days<=89;
      if(f.customerInactiveRange==='90_179') return days>=90&&days<=179;
      if(f.customerInactiveRange==='180_299') return days>=180&&days<=299;
      if(f.customerInactiveRange==='300plus') return days>=300;
      return days>=30;
    };
    const stageFor=days=>{
      if(days===null)return {key:'never',label:'Nunca comprou'};
      if(days>=300)return {key:'inactive',label:'Inativo · 300+ dias'};
      if(days>=180)return {key:'cold',label:'Reativação fria · 180–299 dias'};
      if(days>=90)return {key:'attention',label:'Atenção · 90–179 dias'};
      if(days>=60)return {key:'reactivation',label:'Reativação · 60–89 dias'};
      if(days>=30)return {key:'hot',label:'Reativação quente · 30–59 dias'};
      return {key:'recent',label:'Compra recente · até 29 dias'};
    };
    const rows=[];
    let neverBought=0,inactive=0,reactivation=0,recent=0,totalHistoricalValue=0,wm10Customers=0,erpCustomers=0,combinedCustomers=0,windowPurchases=0,windowItems=0,windowValue=0,repeatCustomers=0;
    let returnCustomers=0,windowReturnRecords=0,windowExchangeRecords=0,windowRefundRecords=0,windowReturnUnits=0,windowReturnValue=0;
    for(const customer of customers){
      if(customer?.active===false) continue;
      const id=text(customer.id);
      const wm10Ops=(wm10History?.[id]?.operations||[]).map(operation=>({...operation,__historySource:'wm10'}));
      const erpOps=currentByCustomer.get(id)||[];
      if(wm10Ops.length) wm10Customers++;
      if(erpOps.length) erpCustomers++;
      if(wm10Ops.length&&erpOps.length) combinedCustomers++;
      const dedupe=new Map();
      for(const op of [...wm10Ops,...erpOps]){
        const key=text(op.id)||`${op.__historySource||'history'}-${op.number}-${this.operationDate(op)}`;
        if(key) dedupe.set(key,op);
      }
      const ops=[...dedupe.values()].filter(op=>op.status==='finalized'||op.legacy===true).map(op=>{
        const d=isoDate(this.operationDate(op)||op.createdAt),ms=dateMs(d),value=round2(num(op.total??op.snapshot?.totals?.total));
        const sourceItems=Array.isArray(op.snapshot?.items)&&op.snapshot.items.length?op.snapshot.items:(op.items||[]);
        const itemQuantity=round2(sourceItems.reduce((sum,item)=>sum+Math.max(0,num(item.quantity)||1),0));
        const origin=op.__historySource==='wm10'||op.legacy===true||text(op.origin)==='wm10'?'wm10':'erp';
        return {...op,__date:d,__ms:ms,__value:value,__items:itemQuantity,__origin:origin};
      }).filter(op=>Number.isFinite(op.__ms)&&op.__ms<=referenceMs).sort((a,b)=>a.__ms-b.__ms);
      let lastDate='',lastValue=0,lastOrigin='',lastNumber='',lastType='',total=0,wm10Count=0,erpCount=0;
      for(const op of ops){
        if(op.__origin==='wm10') wm10Count++; else erpCount++;
        if(op.__date&&op.__date>=lastDate){lastDate=op.__date;lastValue=op.__value;lastOrigin=op.__origin;lastNumber=text(op.number);lastType=text(op.type)||'sale';}
        total+=op.__value;
      }
      const daysWithoutPurchase=lastDate?daysBetween(endOfDayMs(lastDate),referenceMs):null;
      const stage=stageFor(daysWithoutPurchase),status=stage.key==='never'?'never':stage.key==='inactive'?'inactive':daysWithoutPurchase>=30?'reactivation':'recent';
      if(status==='never') neverBought++; else if(status==='inactive') inactive++; else if(status==='reactivation') reactivation++; else recent++;
      const customerHay=normalize([customer.name,customer.tradeName,customer.document,customer.phone,customer.mobile,customer.email,customer.city,customer.state].join(' '));
      if(f.q&&!customerHay.includes(normalize(f.q))) continue;
      const windowOps=ops.filter(op=>windowFromMs===null||op.__ms>=windowFromMs);
      const windowTotal=round2(windowOps.reduce((sum,op)=>sum+op.__value,0)),windowItemCount=round2(windowOps.reduce((sum,op)=>sum+num(op.__items),0)),windowCount=windowOps.length;
      const returnRows=(returnsByCustomer.get(id)||[]).map(record=>({...record,__ms:dateMs(record.createdAt)})).filter(record=>Number.isFinite(record.__ms)&&record.__ms<=referenceMs&&(windowFromMs===null||record.__ms>=windowFromMs));
      const exchangeCount=returnRows.filter(record=>record.type==='exchange').length,refundCount=returnRows.filter(record=>record.type==='return').length;
      const returnUnits=round2(returnRows.reduce((sum,record)=>sum+(record.items||[]).reduce((itemSum,item)=>itemSum+num(item.quantity),0),0));
      const returnValue=round2(returnRows.reduce((sum,record)=>sum+num(record.totalCredit),0));
      const lastReturn=returnRows.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
      if(f.customerMode==='inactive'){
        if(!rangeMatches(daysWithoutPurchase,status)) continue;
      } else if(f.customerMode==='returns'){
        if(!returnRows.length) continue;
      } else if(!windowCount) continue;
      if(f.customerMode!=='inactive'&&f.customerMode!=='returns'){
        windowPurchases+=windowCount;windowItems+=windowItemCount;windowValue+=windowTotal;if(windowCount>=2)repeatCustomers++;
      }
      if(f.customerMode==='returns'){
        returnCustomers++;windowReturnRecords+=returnRows.length;windowExchangeRecords+=exchangeCount;windowRefundRecords+=refundCount;windowReturnUnits+=returnUnits;windowReturnValue+=returnValue;
      }
      totalHistoricalValue+=total;
      rows.push({
        id,code:text(customer.code),name:text(customer.name)||text(customer.tradeName)||'Cliente',document:text(customer.document),mobile:text(customer.mobile)||text(customer.phone),email:text(customer.email),city:text(customer.city),state:text(customer.state),
        lastPurchase:lastDate,daysWithoutPurchase,status,stage:stage.key,stageLabel:stage.label,purchases:ops.length,totalSpent:round2(total),lastValue,lastOrigin,lastNumber,lastType,wm10Purchases:wm10Count,erpPurchases:erpCount,hasWm10History:wm10Count>0,hasErpHistory:erpCount>0,
        windowPurchases:windowCount,windowItems:windowItemCount,windowValue:windowTotal,windowTicket:windowCount?round2(windowTotal/windowCount):0,windowFirstPurchase:windowOps[0]?.__date||'',windowLastPurchase:windowOps.at(-1)?.__date||'',
        windowReturnRecords:returnRows.length,windowExchangeRecords:exchangeCount,windowRefundRecords:refundCount,windowReturnUnits:returnUnits,windowReturnValue:returnValue,windowLastReturn:lastReturn?.createdAt||'',windowLastReturnNumber:lastReturn?.number||'',windowLastReturnType:lastReturn?.type||''
      });
    }
    if(f.customerMode==='frequency') rows.sort((a,b)=>b.windowPurchases-a.windowPurchases||b.windowValue-a.windowValue||a.name.localeCompare(b.name,'pt-BR'));
    else if(f.customerMode==='quantity') rows.sort((a,b)=>b.windowItems-a.windowItems||b.windowPurchases-a.windowPurchases||b.windowValue-a.windowValue||a.name.localeCompare(b.name,'pt-BR'));
    else if(f.customerMode==='value') rows.sort((a,b)=>b.windowValue-a.windowValue||b.windowPurchases-a.windowPurchases||a.name.localeCompare(b.name,'pt-BR'));
    else if(f.customerMode==='returns') rows.sort((a,b)=>b.windowReturnRecords-a.windowReturnRecords||b.windowReturnUnits-a.windowReturnUnits||b.windowReturnValue-a.windowReturnValue||a.name.localeCompare(b.name,'pt-BR'));
    else if(f.customerInactiveSort==='oldest') rows.sort((a,b)=>(b.daysWithoutPurchase??-1)-(a.daysWithoutPurchase??-1)||b.totalSpent-a.totalSpent);
    else if(f.customerInactiveSort==='purchases') rows.sort((a,b)=>b.purchases-a.purchases||b.totalSpent-a.totalSpent||((a.daysWithoutPurchase??99999)-(b.daysWithoutPurchase??99999)));
    else if(f.customerInactiveSort==='value') rows.sort((a,b)=>b.totalSpent-a.totalSpent||b.purchases-a.purchases||((a.daysWithoutPurchase??99999)-(b.daysWithoutPurchase??99999)));
    else rows.sort((a,b)=>((a.daysWithoutPurchase??99999)-(b.daysWithoutPurchase??99999))||b.totalSpent-a.totalSpent);
    return {filters:f,items:rows.slice(0,1000),totals:{customers:customers.filter(c=>c?.active!==false).length,inactive,reactivation,recent,neverBought,totalHistoricalValue:round2(totalHistoricalValue),shown:rows.length,wm10Customers,erpCustomers,combinedCustomers,windowPurchases,windowItems:round2(windowItems),windowValue:round2(windowValue),repeatCustomers,windowCustomers:rows.length,returnCustomers,windowReturnRecords,windowExchangeRecords,windowRefundRecords,windowReturnUnits:round2(windowReturnUnits),windowReturnValue:round2(windowReturnValue)},sellers:this.sellers(f),history:{wm10:true,erp:true},customerWindow:{days:windowDays,from:windowFromMs===null?'':isoDate(new Date(windowFromMs)),to:referenceDate}};
  }

  financialHealth(filters={}){
    const f=this.normalizeFilters(filters),financeDir=path.join(this.panelDir,'data','erp','finance');
    const dre=this.dreService?.query?.({start:f.from,end:f.to,basis:'competence'})||{summary:{},rows:[],analysis:''};
    const s=dre.summary||{};
    const receivableInstallments=itemsOf(readJson(path.join(financeDir,'receivable-installments.json'),{items:[]}));
    const payableInstallments=itemsOf(readJson(path.join(financeDir,'payable-installments.json'),{items:[]}));
    const today=new Date().toISOString().slice(0,10),horizon30=isoDate(new Date(Date.now()+30*86400000));
    const liveRows=rows=>rows.filter(row=>!['reversed','cancelled','canceled','void'].includes(normalize(row.status))&&num(row.openBalance)>0);
    const receivablesOpenRows=liveRows(receivableInstallments),payablesOpenRows=liveRows(payableInstallments);
    const receivablesOpen=round2(receivablesOpenRows.reduce((sum,row)=>sum+num(row.openBalance),0));
    const payablesOpen=round2(payablesOpenRows.reduce((sum,row)=>sum+num(row.openBalance),0));
    const receivablesOverdue=round2(receivablesOpenRows.filter(row=>text(row.dueDate)&&isoDate(row.dueDate)<today).reduce((sum,row)=>sum+num(row.openBalance),0));
    const payablesOverdue=round2(payablesOpenRows.filter(row=>text(row.dueDate)&&isoDate(row.dueDate)<today).reduce((sum,row)=>sum+num(row.openBalance),0));
    const dueUntil30=rows=>round2(rows.filter(row=>{const due=isoDate(row.dueDate);return due&&due<=horizon30;}).reduce((sum,row)=>sum+num(row.openBalance),0));
    const receivablesNext30=dueUntil30(receivablesOpenRows),payablesNext30=dueUntil30(payablesOpenRows);
    const receivablesOverdueRate=receivablesOpen?percent(receivablesOverdue,receivablesOpen):0;
    const payablesOverdueRate=payablesOpen?percent(payablesOverdue,payablesOpen):0;
    const workingPosition=round2(receivablesNext30-payablesNext30);
    const coverage=payablesNext30?round2(receivablesNext30/payablesNext30):null;
    const revenue=round2(num(s.incomeBeforeCmv??s.netRevenue??s.revenue));
    const grossProfit=round2(num(s.grossProfit));
    const expenses=round2(num(s.expenses));
    const result=round2(num(s.result));
    const margin=round2(num(s.margin));
    const cmv=round2(num(s.cmv));
    const expenseRatio=revenue?percent(expenses,revenue):0,cmvRatio=revenue?percent(cmv,revenue):0;
    const turnover=this.turnover({...f,q:'',turnoverView:'all'}),capitalAtCost=round2(num(turnover.totals?.capitalAtCost)),staleCapital=round2(num(turnover.totals?.staleCapital)),staleRatio=capitalAtCost?percent(staleCapital,capitalAtCost):0;
    const indicator=(id,label,value,status,help)=>({id,label,value,status,help});
    const indicators=[];
    indicators.push(indicator('result','Resultado do período',result,result<0?'risk':margin<10?'warning':'good',result<0?'Receitas menos custos e despesas ficaram negativas.':`Margem gerencial de ${margin.toLocaleString('pt-BR',{maximumFractionDigits:1})}%.`));
    indicators.push(indicator('margin','Margem do resultado',margin,margin<5?'risk':margin<10?'warning':'good',margin<5?'Margem muito apertada ou negativa.':margin<10?'Margem positiva, mas ainda sensível a aumento de custos.':'Margem acima de 10% no período.'));
    indicators.push(indicator('receivables','Recebíveis vencidos',receivablesOverdueRate,receivablesOverdueRate>=25?'risk':receivablesOverdueRate>=10?'warning':'good',`${round2(receivablesOverdue).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} vencidos de ${round2(receivablesOpen).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em aberto.`));
    indicators.push(indicator('payables','Contas a pagar vencidas',payablesOverdueRate,payablesOverdue>0?(payablesOverdueRate>=10?'risk':'warning'):'good',`${round2(payablesOverdue).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} vencidos de ${round2(payablesOpen).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em aberto.`));
    indicators.push(indicator('stock','Capital sem giro',staleRatio,staleRatio>=35?'risk':staleRatio>=20?'warning':'good',`${round2(staleCapital).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} de ${round2(capitalAtCost).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} do capital analisado em estoque.`));
    indicators.push(indicator('position','Posição a receber × pagar',workingPosition,workingPosition<0?'warning':'good',coverage===null?'Sem contas a pagar em aberto para calcular cobertura.':`Nos próximos 30 dias, a receber equivale a ${coverage.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}× o valor a pagar.`));
    const risks=indicators.filter(row=>row.status==='risk').length,warnings=indicators.filter(row=>row.status==='warning').length;
    const overall=risks>=2||(result<0&&payablesOverdue>0)?'critical':risks>0||warnings>=2?'attention':'good';
    const alerts=[];
    if(result<0) alerts.push({tone:'risk',title:'Resultado negativo',text:`O período está ${Math.abs(result).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} abaixo do ponto de equilíbrio no DRE gerencial.`});
    else if(margin<10) alerts.push({tone:'warning',title:'Margem apertada',text:`O resultado é positivo, mas a margem de ${margin.toLocaleString('pt-BR',{maximumFractionDigits:1})}% deixa pouco espaço para aumento de custos ou queda de vendas.`});
    if(expenseRatio>=50) alerts.push({tone:expenseRatio>=70?'risk':'warning',title:'Despesas pesando na receita',text:`Despesas após o CMV equivalem a ${expenseRatio.toLocaleString('pt-BR',{maximumFractionDigits:1})}% da receita considerada no período.`});
    if(receivablesOverdue>0) alerts.push({tone:receivablesOverdueRate>=25?'risk':'warning',title:'Recebimentos atrasados',text:`Há ${receivablesOverdue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} vencidos a receber (${receivablesOverdueRate.toLocaleString('pt-BR',{maximumFractionDigits:1})}% do aberto).`});
    if(payablesOverdue>0) alerts.push({tone:payablesOverdueRate>=10?'risk':'warning',title:'Contas vencidas',text:`Há ${payablesOverdue.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} em contas a pagar vencidas.`});
    if(staleRatio>=20) alerts.push({tone:staleRatio>=35?'risk':'warning',title:'Capital parado em estoque',text:`${staleRatio.toLocaleString('pt-BR',{maximumFractionDigits:1})}% do capital analisado em estoque está em itens sem giro/sem vendas.`});
    if(workingPosition<0) alerts.push({tone:'warning',title:'Obrigações acima dos recebíveis',text:`Nos próximos 30 dias, os valores a pagar superam os recebíveis previstos/em atraso em ${Math.abs(workingPosition).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}. Isso não considera saldo bancário disponível.`});
    if(!alerts.length) alerts.push({tone:'good',title:'Sem alerta forte pelos dados atuais',text:'Os principais indicadores gerenciais desta leitura não mostram um ponto crítico. Continue acompanhando margem, vencimentos e estoque parado.'});
    return {filters:f,totals:{revenue,grossProfit,expenses,result,margin,cmv,expenseRatio,cmvRatio,receivablesOpen,receivablesOverdue,receivablesOverdueRate,receivablesNext30,payablesOpen,payablesOverdue,payablesOverdueRate,payablesNext30,workingPosition,coverage,capitalAtCost,staleCapital,staleRatio,risks,warnings,overall},indicators,alerts,dreAnalysis:text(dre.analysis),sellers:this.sellers(f)};
  }

  returns(filters={}){
    const f=this.normalizeFilters(filters);
    const source=this.returnService?.list?.({from:f.from,to:f.to,q:f.q})||[];
    const salesRows=this.operationRows({...f,type:'sale',seller:'all',q:''});
    const soldByKey=new Map();
    for(const row of salesRows){const key=text(row.inventoryItemId)||text(row.productId)||normalize(row.product);soldByKey.set(key,(soldByKey.get(key)||0)+Number(row.quantity||0));}
    const productMap=new Map(),reasonMap=new Map(),supplierMap=new Map();
    const dispositionLabels={sellable:'Voltou ao estoque vendável',quarantine:'Problema / garantia',discarded:'Baixa / descarte',none:'Sem movimentação de estoque'};
    const history=[];
    let units=0,credit=0,wallet=0,receivable=0,problemUnits=0,sellableUnits=0,quarantineUnits=0;
    for(const record of source){
      credit+=Number(record.totalCredit||0);wallet+=Number(record.financial?.walletCredit||0);receivable+=Number(record.financial?.receivableApplied||0);
      const recUnits=(record.items||[]).reduce((sum,item)=>sum+Number(item.quantity||0),0);units+=recUnits;
      const reasonKey=text(record.reasonCode)||'other';const reason=reasonMap.get(reasonKey)||{id:reasonKey,label:text(record.reasonLabel)||'Outro',records:0,units:0,value:0,problem:record.problemReason===true};reason.records++;reason.units+=recUnits;reason.value+=Number(record.totalCredit||0);reasonMap.set(reasonKey,reason);
      for(const item of record.items||[]){
        const q=Number(item.quantity||0),key=text(item.inventoryItemId)||text(item.productId)||normalize(item.name);
        const row=productMap.get(key)||{key,product:item.name||'Item',code:item.code||'',inventoryItemId:item.inventoryItemId||'',returnedQty:0,occurrences:0,creditValue:0,problemQty:0,sellableQty:0,quarantineQty:0,reasons:new Map(),suppliers:new Set()};
        row.returnedQty+=q;row.occurrences++;row.creditValue+=Number(item.totalCredit||0);if(record.problemReason){row.problemQty+=q;problemUnits+=q;}if(item.disposition==='sellable'){row.sellableQty+=q;sellableUnits+=q;}if(item.disposition==='quarantine'){row.quarantineQty+=q;quarantineUnits+=q;}row.reasons.set(record.reasonLabel,(row.reasons.get(record.reasonLabel)||0)+q);if(item.sourceSupplierName)row.suppliers.add(item.sourceSupplierName);productMap.set(key,row);
        if(record.problemReason&&item.sourceSupplierName){const sup=supplierMap.get(item.sourceSupplierName)||{supplier:item.sourceSupplierName,units:0,occurrences:0,value:0,products:new Set()};sup.units+=q;sup.occurrences++;sup.value+=Number(item.totalCredit||0);sup.products.add(item.name||'Item');supplierMap.set(item.sourceSupplierName,sup);}
      }
      history.push({id:record.id,number:record.number,type:record.type,typeLabel:record.type==='exchange'?'Troca':'Devolução',date:record.createdAt,originalOperationId:record.originalOperationId,originalOperationNumber:record.originalOperationNumber,customer:record.customerName,reason:record.reasonLabel,reasonDetail:record.reason,units:recUnits,totalCredit:round2(record.totalCredit),receivableApplied:round2(record.financial?.receivableApplied),walletCredit:round2(record.financial?.walletCredit),createdBy:record.createdBy,items:(record.items||[]).map(item=>({name:item.name,quantity:item.quantity,disposition:item.disposition,dispositionLabel:dispositionLabels[item.disposition]||item.disposition,supplier:item.sourceSupplierName||''}))});
    }
    const products=[...productMap.values()].map(row=>{const sold=Number(soldByKey.get(row.key)||0);return {...row,reasons:[...row.reasons.entries()].sort((a,b)=>b[1]-a[1]).map(([label,quantity])=>({label,quantity})),suppliers:[...row.suppliers],soldQty:round2(sold),returnRate:sold>0?round2(row.returnedQty/sold*100):null,problemRate:sold>0?round2(row.problemQty/sold*100):null,returnedQty:round2(row.returnedQty),creditValue:round2(row.creditValue),problemQty:round2(row.problemQty),sellableQty:round2(row.sellableQty),quarantineQty:round2(row.quarantineQty)};}).sort((a,b)=>b.problemQty-a.problemQty||b.returnedQty-a.returnedQty||b.creditValue-a.creditValue);
    const reasons=[...reasonMap.values()].map(row=>({...row,units:round2(row.units),value:round2(row.value)})).sort((a,b)=>b.units-a.units||b.records-a.records);
    const suppliers=[...supplierMap.values()].map(row=>({...row,units:round2(row.units),value:round2(row.value),products:[...row.products]})).sort((a,b)=>b.units-a.units||b.occurrences-a.occurrences);
    return {filters:f,totals:{records:source.length,exchanges:source.filter(row=>row.type==='exchange').length,returns:source.filter(row=>row.type==='return').length,units:round2(units),credit:round2(credit),walletCredit:round2(wallet),receivableApplied:round2(receivable),problemUnits:round2(problemUnits),sellableUnits:round2(sellableUnits),quarantineUnits:round2(quarantineUnits)},products,reasons,suppliers,history,sellers:[]};
  }

  stockCounts(filters={}){
    const f=this.normalizeFilters(filters),fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to);
    const counts=itemsOf(readJson(path.join(this.panelDir,'data','erp','inventory','counts.json'),{items:[]}));
    const rows=counts.filter(item=>{
      const when=dateMs(item.completedAt||item.startedAt||item.createdAt); if(!Number.isFinite(when)||when<fromMs||when>toMs)return false;
      if(f.q&&!normalize([item.id,item.type,item.status,item.createdBy,item.completedBy,item.notes].join(' ')).includes(normalize(f.q)))return false;
      return true;
    }).map(item=>({
      id:text(item.id),type:text(item.type)||'partial',status:text(item.status)||'open',statusLabel:countStatusLabel(item.status),startedAt:isoDate(item.startedAt||item.createdAt),completedAt:isoDate(item.completedAt),createdBy:userFacingActor(item.createdBy),completedBy:userFacingActor(item.completedBy),items:Array.isArray(item.items)?item.items.length:0,divergences:num(item.divergenceCount),adjustments:Array.isArray(item.adjustmentMovementIds)?item.adjustmentMovementIds.length:0,notes:text(item.notes)
    })).sort((a,b)=>String(b.completedAt||b.startedAt).localeCompare(String(a.completedAt||a.startedAt)));
    return {filters:f,items:rows,totals:{counts:rows.length,completed:rows.filter(r=>r.status==='completed').length,items:rows.reduce((s,r)=>s+r.items,0),divergences:rows.reduce((s,r)=>s+r.divergences,0),adjustments:rows.reduce((s,r)=>s+r.adjustments,0)},sellers:this.sellers(f)};
  }

  audit(filters={}){
    const f=this.normalizeFilters(filters),fromMs=startOfDayMs(f.from),toMs=endOfDayMs(f.to),catalog=this.productCatalog();
    const logs=itemsOf(readJson(path.join(this.panelDir,'data','kernel','logs.json'),{items:[]}));
    const kernelAudits=itemsOf(readJson(path.join(this.panelDir,'data','kernel','audits.json'),{items:[]}));
    const financeAudits=itemsOf(readJson(path.join(this.panelDir,'data','erp','finance','audit.json'),{items:[]}));
    const stockMovements=itemsOf(readJson(path.join(this.panelDir,'data','erp','inventory','movements.json'),{items:[]}));
    const matches=row=>{const when=dateMs(row.at||row.createdAt);return Number.isFinite(when)&&when>=fromMs&&when<=toMs;};
    const qMatches=(parts)=>!f.q||normalize(parts.join(' ')).includes(normalize(f.q));

    const allActions=logs.filter(item=>matches(item)&&['operational','error','system','security'].includes(text(item.category))&&qMatches([item.id,item.module,item.action,item.actor,item.result,item.label,item.route,item.entityId,item.documentId,item.ip]));
    const actions=allActions.slice().reverse().slice(0,800).map(item=>({kind:'system',id:item.id,date:isoDate(item.at),at:item.at,module:item.module||'system',action:item.action||'',actor:userFacingActor(item.actor),result:item.result||'',label:item.label||'',route:item.route||'',method:item.method||'',statusCode:num(item.statusCode),durationMs:num(item.durationMs),ip:text(item.ip),device:text(item.device),details:item.details||null,detailsPreview:safeJsonPreview(item.details)}));

    const detailedKernel=kernelAudits.filter(item=>matches(item)&&qMatches([item.id,item.module,item.action,item.actor,item.entityType,item.entityId,item.documentId,item.reason,safeJsonPreview(item.before),safeJsonPreview(item.after)])).map(item=>({kind:'audit',source:'kernel',id:item.id,at:item.at,module:item.module||'system',action:item.action||'',actor:userFacingActor(item.actor),entityType:text(item.entityType),entityId:text(item.entityId),documentId:text(item.documentId),reason:text(item.reason),before:item.before??null,after:item.after??null,beforePreview:safeJsonPreview(item.before),afterPreview:safeJsonPreview(item.after),ip:text(item.ip)}));
    const detailedFinance=financeAudits.filter(item=>matches(item)&&qMatches([item.id,item.action,item.actor,item.catalog,item.itemId,item.reason,safeJsonPreview(item.before),safeJsonPreview(item.after)])).map(item=>({kind:'audit',source:'finance',id:item.id,at:item.at,module:'financeiro',action:item.action||'',actor:userFacingActor(item.actor),entityType:text(item.catalog)||'financeiro',entityId:text(item.itemId||item.payableId||item.receivableId||item.entryId),documentId:'',reason:text(item.reason),before:item.before??null,after:item.after??null,beforePreview:safeJsonPreview(item.before),afterPreview:safeJsonPreview(item.after),ip:''}));
    const detailed=[...detailedKernel,...detailedFinance].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,600);

    const allStock=stockMovements.filter(item=>matches(item)&&qMatches([item.id,item.inventoryItemId,item.reason,item.reasonCode,item.classification,item.createdBy,item.referenceId]));
    const stock=allStock.slice().reverse().slice(0,800).map(item=>{
      const meta=catalog.byInventory.get(text(item.inventoryItemId))||{};
      return {kind:'stock',id:item.id,date:isoDate(item.createdAt),at:item.createdAt,module:'estoque',action:item.type||item.classification||'',classification:text(item.classification),actor:userFacingActor(item.createdBy),result:'success',label:item.reason||'',inventoryItemId:item.inventoryItemId||'',product:meta.name||`Item ${text(item.inventoryItemId)}`,code:meta.code||'',before:num(item.previousPhysicalQuantity),after:num(item.newPhysicalQuantity),quantity:num(item.signedQuantity??item.quantity),referenceType:text(item.referenceType),referenceId:item.referenceId||'',reasonCode:text(item.reasonCode),origin:text(item.origin)};
    });
    const actors=new Set([...allActions.map(r=>userFacingActor(r.actor)),...allStock.map(r=>userFacingActor(r.createdBy)),...detailed.map(r=>r.actor)].filter(Boolean));
    return {filters:f,actions,detailed,stock,totals:{actions:allActions.length,detailed:detailedKernel.length+detailedFinance.length,stockMovements:allStock.length,errors:allActions.filter(r=>r.result==='error').length,actors:actors.size},sellers:this.sellers(f)};
  }


  query(view='overview',filters={}){
    const name=text(view)||'overview';
    if(name==='overview') return this.overview(filters);
    if(name==='profitability') return this.profitability(filters);
    if(name==='products') return this.topProducts(filters);
    if(name==='turnover') return this.turnover(filters);
    if(name==='sellers') return this.sellerPerformance(filters);
    if(name==='discounts') return this.discounts(filters);
    if(name==='sales') return this.salesDetails(filters);
    if(name==='payments') return this.paymentMethods(filters);
    if(name==='purchases') return this.purchases(filters);
    if(name==='returns') return this.returns(filters);
    if(name==='expenses') return this.expenses(filters);
    if(name==='health') return this.financialHealth(filters);
    if(name==='customers') return this.customerInactivity(filters);
    if(name==='counts') return this.stockCounts(filters);
    if(name==='audit') return this.audit(filters);
    throw new Error('Relatório não reconhecido.');
  }
}
