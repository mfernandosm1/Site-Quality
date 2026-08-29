import fs from 'fs';
import path from 'path';

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function now(){ return new Date().toISOString(); }
function num(value){ const n=Number(value); return Number.isFinite(n)?n:0; }
function text(value){ return String(value ?? '').trim(); }
function normalizeFreight(value={}){
  const source=value&&typeof value==='object'?value:{};
  const payer=['none','issuer','recipient','third_party'].includes(text(source.payer))?text(source.payer):'none';
  return {
    payer,
    carrierId:text(source.carrierId),
    carrierName:text(source.carrierName),
    freightAmount:Math.max(0,num(source.freightAmount)),
    insuranceAmount:Math.max(0,num(source.insuranceAmount)),
    otherExpensesAmount:Math.max(0,num(source.otherExpensesAmount)),
    volumeQuantity:Math.max(0,Math.round(num(source.volumeQuantity))),
    species:text(source.species),
    brand:text(source.brand),
    netWeight:Math.max(0,num(source.netWeight)),
    grossWeight:Math.max(0,num(source.grossWeight))
  };
}
function freightTotal(value={}){const freight=normalizeFreight(value);return Math.round((freight.freightAmount+freight.insuranceAmount+freight.otherExpensesAmount)*100)/100;}
function same(a,b){ return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
function localDay(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
  catch(_){return date.toISOString().slice(0,10);}
}

function localDateParts(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
    return Object.fromEntries(parts.filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  }catch(_){
    return {year:String(date.getFullYear()),month:String(date.getMonth()+1).padStart(2,'0'),day:String(date.getDate()).padStart(2,'0'),hour:String(date.getHours()).padStart(2,'0'),minute:String(date.getMinutes()).padStart(2,'0'),second:String(date.getSeconds()).padStart(2,'0')};
  }
}
function localMinute(value=new Date()){
  const part=localDateParts(value);
  return `${part.hour}:${part.minute}`;
}
function localDateTimeKey(value=new Date()){
  const part=localDateParts(value);
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`;
}
function localDateTimeSecondKey(value=new Date()){
  const part=localDateParts(value);
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}:${part.second}`;
}
function validTime(value){ return /^([01]\d|2[0-3]):[0-5]\d$/.test(text(value)); }
function normalizeTimes(values,fallback=[]){
  const source=Array.isArray(values)?values:[];
  return [...new Set(source.map(text).filter(validTime))].sort();
}
function secondsOfDay(value=new Date()){
  const part=localDateParts(value);
  return Number(part.hour)*3600+Number(part.minute)*60+Number(part.second);
}

export default class CommerceService {
  constructor({ dataDir } = {}) {
    if (!dataDir) throw new Error('CommerceService: dataDir não informado.');
    this.dataDir = path.resolve(dataDir);
    this.cashboxesFile = path.join(this.dataDir, 'cashboxes.json');
    this.sessionsFile = path.join(this.dataDir, 'cash-sessions.json');
    this.movementsFile = path.join(this.dataDir, 'cash-movements.json');
    this.operationsFile = path.join(this.dataDir, 'operations.json');
    this.settingsFile = path.join(this.dataDir, 'commerce-settings.json');
    this._jsonCache = new Map();
    this.ensureStorage();
  }

  ensureStorage(){
    fs.mkdirSync(this.dataDir,{recursive:true});
    this.ensure(this.cashboxesFile,{version:'0.14.1',items:[{id:'caixa-principal',name:'Caixa principal',active:true,openingMode:'daily_simple',closingMode:'calculated',carryPreviousBalance:true,createdAt:now()}]});
    this.ensure(this.sessionsFile,{version:'0.14.4',items:[]});
    this.ensure(this.movementsFile,{version:'0.14.3',items:[]});
    this.ensure(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    this.ensure(this.settingsFile,{version:'0.13.3',defaultCashboxId:'caixa-principal',paymentMethods:[
      {id:'dinheiro',name:'Dinheiro',active:true,kind:'cash'},
      {id:'pix',name:'Pix',active:true,kind:'instant'},
      {id:'cartao-credito',name:'Cartão de crédito',active:true,kind:'card'},
      {id:'cartao-debito',name:'Cartão de débito',active:true,kind:'card'},
      {id:'boleto-crediario',name:'Boleto / crediário',active:true,kind:'receivable'}
    ]});
    this.migrateOperations();
  }
  ensure(file,data){ if(!fs.existsSync(file)) this.write(file,data); }
  read(file,fallback){
    try{
      const stat=fs.statSync(file),cached=this._jsonCache.get(file);
      if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
      const data=JSON.parse(fs.readFileSync(file,'utf8'));
      this._jsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});
      return data;
    }catch(_){return clone(fallback);}
  }
  write(file,data){
    const temp=`${file}.tmp`; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8'); fs.renameSync(temp,file);
    try{const stat=fs.statSync(file);this._jsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){this._jsonCache.delete(file);}
  }
  id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`; }

  migrateOperations(){
    const data=this.read(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    let changed=data.version!=='0.13.3';
    data.version='0.13.3';
    data.items=(Array.isArray(data.items)?data.items:[]).map(raw=>{
      const op={...raw};
      const openedAt=op.dates?.openedAt||op.createdAt||now();
      const updatedAt=op.dates?.updatedAt||op.updatedAt||openedAt;
      op.version=Math.max(1,Math.round(num(op.version)||1));
      op.dates={
        openedAt,
        updatedAt,
        finalizedAt:op.dates?.finalizedAt||op.finalizedAt||null,
        cancelledAt:op.dates?.cancelledAt||op.cancelledAt||null
      };
      op.operationalStatus=op.operationalStatus||(op.status==='finalized'?'completed':op.status==='cancelled'?'cancelled':'in_service');
      op.financialStatus=op.financialStatus||(num(op.amountPending)>0?'partial':op.status==='finalized'?'paid':'not_started');
      op.timeline=Array.isArray(op.timeline)?op.timeline:[];
      op.audit=Array.isArray(op.audit)?op.audit:[];
      op.links=op.links&&typeof op.links==='object'?op.links:{originalOperationId:null,originalItemId:null,exchangeIds:[],returnIds:[],warrantyIds:[]};
      op.snapshot=op.snapshot&&typeof op.snapshot==='object'?op.snapshot:null;
      op.details=text(op.details);
      op.coupon=op.coupon&&typeof op.coupon==='object'?op.coupon:null;
      op.couponDiscount=Math.max(0,num(op.couponDiscount||op.coupon?.discount));
      op.freight=normalizeFreight(op.freight);
      op.freightTotal=freightTotal(op.freight);
      op.fiscal=op.fiscal&&typeof op.fiscal==='object'?op.fiscal:{status:'none',documentId:null,updatedAt:null};
      if(!['none','pending','transmitted','rejected','cancelled'].includes(op.fiscal.status)) op.fiscal.status='none';
      if(!op.timeline.length) op.timeline.push({id:this.id('EVT'),type:'migration',label:'Operação incorporada à fundação v0.13.3',at:updatedAt,actor:'sistema'});
      changed=true;
      return op;
    });
    if(changed) this.write(this.operationsFile,data);
  }

  event(op,{type,label,actor='painel',details=null}={}){
    const entry={id:this.id('EVT'),type:text(type)||'update',label:text(label)||'Operação atualizada',at:now(),actor:text(actor)||'painel'};
    if(details!==null) entry.details=clone(details);
    op.timeline=Array.isArray(op.timeline)?op.timeline:[];
    op.audit=Array.isArray(op.audit)?op.audit:[];
    op.timeline.push(entry); op.audit.push(entry);
    return entry;
  }
  conflict(message,current){ const error=new Error(message); error.code='OPERATION_VERSION_CONFLICT'; error.status=409; error.current=current; return error; }

  listCashboxes(){ return this.read(this.cashboxesFile,{items:[]}).items.filter(i=>i.active!==false); }
  defaultCashboxSettings(cashboxId='caixa-principal'){
    return {
      cashboxId, closingMode:'manual', automaticClosingTime:'23:59', automaticShiftsEnabled:false, automaticShiftTimes:['08:00'], allowNegativeCash:false,
      requireNegativeReason:true, isDefault:cashboxId==='caixa-principal', requireItemVerification:false,
      requireSeller:false, useLoggedUserAsSeller:true, defaultSeller:'', defaultInstallments:1, firstDueDays:30, defaultOperationType:'sale',
      discountApprovalEnabled:true, discountApprovalTtlMinutes:5,
      visibleColumns:{reference:true,serial:false,color:false,size:false,seller:true,discount:true,commission:false,internalCode:false},
      enabledPaymentMethods:['dinheiro','pix','cartao-credito','cartao-debito','boleto-crediario'],
      allowedUsers:[], allowedSellers:[]
    };
  }
  setPaymentMethodsCatalog(methods=[]){
    const data=this.getSettings();
    const previous=Array.isArray(data.paymentMethods)?data.paymentMethods:[];
    const oldNameById=new Map(previous.map(item=>[text(item.id),text(item.name).toLowerCase()]));
    const next=(Array.isArray(methods)?methods:[]).map(method=>({
      ...clone(method), id:text(method.id), name:text(method.name), active:method.active!==false,
      kind:text(method.kind||method.eventType)||'other'
    })).filter(method=>method.id&&method.name);
    const nextByName=new Map(next.map(item=>[text(item.name).toLowerCase(),item.id]));
    const previousIds=new Set(previous.map(item=>text(item.id)).filter(Boolean));
    const newlyAvailable=next.filter(method=>method.active!==false&&method.modules?.pdv!==false&&!previousIds.has(method.id)).map(method=>method.id);
    data.paymentMethods=next;
    data.cashboxes=data.cashboxes&&typeof data.cashboxes==='object'?data.cashboxes:{};
    for(const [cashboxId,stored] of Object.entries(data.cashboxes)){
      const current=Array.isArray(stored.enabledPaymentMethods)?stored.enabledPaymentMethods:[];
      const migrated=[];
      for(const id of current){
        if(next.some(method=>method.id===id)){migrated.push(id);continue;}
        const oldName=oldNameById.get(text(id));
        const mapped=oldName?nextByName.get(oldName):null;
        if(mapped)migrated.push(mapped);
      }
      // Quando o caixa ainda usa apenas IDs legados, o catálogo financeiro passa
      // a ser a fonte de verdade e novas formas habilitadas no PDV entram sem exigir
      // uma segunda configuração escondida.
      const legacyOnly=current.length>0&&current.every(id=>!next.some(method=>method.id===id));
      stored.enabledPaymentMethods=legacyOnly
        ? next.filter(method=>method.active!==false&&method.modules?.pdv!==false).map(method=>method.id)
        : [...new Set([...(migrated.length?migrated:[]),...newlyAvailable])];
      data.cashboxes[cashboxId]=stored;
    }
    this.write(this.settingsFile,data);
    return clone(next);
  }
  paymentMethod(id=''){ return (this.getSettings().paymentMethods||[]).find(method=>text(method.id)===text(id))||null; }
  isCashMethod(id=''){
    const method=this.paymentMethod(id); if(!method)return text(id)==='dinheiro';
    const marker=text(`${method.id} ${method.code||''} ${method.name||''} ${method.kind||''} ${method.eventType||''}`).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return method.kind==='cash'||method.eventType==='cash'||marker.includes('dinheiro')||marker.includes(' cash');
  }
  getCashMethodId(){
    const methods=this.getSettings().paymentMethods||[];
    const method=methods.find(item=>item.active!==false&&this.isCashMethod(item.id));
    return text(method?.id)||'dinheiro';
  }
  isManualCashMovementMethod(id=''){
    const method=this.paymentMethod(id);
    if(!method) return this.isCashMethod(id);
    // Carteira/crédito de cliente é meio de pagamento da venda, não dinheiro/ativo
    // disponível para suprimento ou sangria manual do caixa.
    if(method.eventType==='wallet'||method.kind==='wallet'||text(method.id)==='PM-CARTEIRA') return false;
    return method.active!==false;
  }
  getSettings(){
    const data=this.read(this.settingsFile,{paymentMethods:[]});
    data.cashboxes=data.cashboxes&&typeof data.cashboxes==='object'?data.cashboxes:{};
    for(const cashbox of this.listCashboxes()){
      const stored=data.cashboxes[cashbox.id]||{};
      // Compatibilidade: em versões anteriores havia duas chaves para a mesma
      // decisão. Quando a flag explícita existe, ela prevalece; caso contrário,
      // usa o modo antigo apenas para migrar configurações legadas.
      const automatic=Object.prototype.hasOwnProperty.call(stored,'automaticShiftsEnabled')
        ? stored.automaticShiftsEnabled===true
        : stored.closingMode==='automatic';
      data.cashboxes[cashbox.id]={
        ...this.defaultCashboxSettings(cashbox.id),
        ...stored,
        cashboxId:cashbox.id,
        closingMode:automatic?'automatic':'manual',
        automaticShiftsEnabled:automatic
      };
    }
    return data;
  }
  getCashboxSettings(cashboxId='caixa-principal'){ return clone(this.getSettings().cashboxes?.[cashboxId]||this.defaultCashboxSettings(cashboxId)); }
  saveCashboxSettings(cashboxId,payload={},actor='painel'){
    const data=this.getSettings(); const current=data.cashboxes?.[cashboxId]||this.defaultCashboxSettings(cashboxId);
    const allowedColumns=['reference','serial','color','size','seller','discount','commission','internalCode'];
    const automatic=payload.closingMode==='automatic';
    const next={...current,cashboxId,
      // Uma única fonte de verdade: o modo da operação controla todo o ciclo.
      // Manual = nenhuma abertura/fechamento automático.
      // Automático = fecha e abre os turnos nos horários configurados.
      closingMode:automatic?'automatic':'manual',
      automaticClosingTime:validTime(payload.automaticClosingTime)?text(payload.automaticClosingTime):text(current.automaticClosingTime)||'23:59',
      automaticShiftsEnabled:automatic,
      automaticShiftTimes:normalizeTimes(payload.automaticShiftTimes, current.automaticShiftTimes||['08:00']),
      allowNegativeCash:payload.allowNegativeCash===true,requireNegativeReason:payload.requireNegativeReason!==false,
      isDefault:payload.isDefault===true,requireItemVerification:payload.requireItemVerification===true,requireSeller:payload.requireSeller===true,
      useLoggedUserAsSeller:payload.useLoggedUserAsSeller!==false,defaultSeller:text(payload.defaultSeller),defaultInstallments:Math.max(1,Math.round(num(payload.defaultInstallments)||1)),
      firstDueDays:Math.max(0,Math.round(num(payload.firstDueDays)||0)),defaultOperationType:payload.defaultOperationType==='service_order'?'service_order':'sale',
      discountApprovalEnabled:payload.discountApprovalEnabled!==false,
      discountApprovalTtlMinutes:Math.min(30,Math.max(1,Math.round(num(payload.discountApprovalTtlMinutes)||5))),
      visibleColumns:Object.fromEntries(allowedColumns.map(key=>[key,payload.visibleColumns?.[key]===true])),
      enabledPaymentMethods:[...new Set((Array.isArray(payload.enabledPaymentMethods)?payload.enabledPaymentMethods:[]).map(text).filter(Boolean))],
      allowedUsers:[...new Set((Array.isArray(payload.allowedUsers)?payload.allowedUsers:[]).map(text).filter(Boolean))],
      allowedSellers:[...new Set((Array.isArray(payload.allowedSellers)?payload.allowedSellers:[]).map(text).filter(Boolean))],
      updatedAt:now(),updatedBy:text(actor)||'painel'};
    data.cashboxes=data.cashboxes||{}; data.cashboxes[cashboxId]=next;
    if(next.isDefault){ data.defaultCashboxId=cashboxId; for(const key of Object.keys(data.cashboxes)) if(key!==cashboxId)data.cashboxes[key].isDefault=false; }
    this.write(this.settingsFile,data); return clone(next);
  }
  getOpenSession(cashboxId){ return this.read(this.sessionsFile,{items:[]}).items.find(s=>s.cashboxId===cashboxId && s.status==='open') || null; }
  findOpenSessionForUser(actor='painel', preferredCashboxId=''){
    const user=text(actor)||'painel';
    const cashboxes=this.listCashboxes();
    const openSessions=this.read(this.sessionsFile,{items:[]}).items.filter(item=>item.status==='open');
    const selected=text(preferredCashboxId);

    // O caixa é uma sessão física compartilhada. Uma abertura automática fica com
    // openedBy="sistema", mas continua disponível aos operadores autorizados.
    // Quando a tela informa explicitamente o caixa, a sessão aberta desse caixa é
    // a fonte da verdade, independentemente de quem executou a abertura.
    let session=selected ? openSessions.find(item=>item.cashboxId===selected) : null;

    // Sem caixa preferencial, mantém preferência pelo caixa aberto pelo próprio
    // operador e, em seguida, usa a sessão aberta mais recente (inclusive automática).
    if(!session){
      const own=openSessions.filter(item=>text(item.openedBy)===user);
      session=(own.length?own:openSessions)
        .sort((a,b)=>String(b.openedAt).localeCompare(String(a.openedAt)))[0]||null;
    }
    if(!session) return null;
    return {session:clone(session),cashbox:clone(cashboxes.find(item=>item.id===session.cashboxId)||{id:session.cashboxId,name:'Caixa'})};
  }
  getLastClosedSession(cashboxId){
    return this.read(this.sessionsFile,{items:[]}).items
      .filter(s=>s.cashboxId===cashboxId && s.status==='closed')
      .sort((a,b)=>String(b.closedAt||'').localeCompare(String(a.closedAt||'')))[0] || null;
  }
  getSuggestedOpeningBalance(cashboxId){
    const cashbox=this.listCashboxes().find(c=>c.id===cashboxId);
    if(cashbox?.carryPreviousBalance===false) return 0;
    const previous=this.getLastClosedSession(cashboxId);
    return previous ? num(previous.closingBalance ?? previous.expectedBalance) : 0;
  }
  getCashboxState(cashboxId, actor='painel'){
    const openSession=this.getOpenSession(cashboxId);
    const lastClosedSession=this.getLastClosedSession(cashboxId);
    const balance=openSession?this.getSessionBalance(openSession.id):this.getSuggestedOpeningBalance(cashboxId);
    const today=localDay();
    const actorName=text(actor)||'painel';
    const sessions=this.read(this.sessionsFile,{items:[]}).items;
    const openedTodayByUser=sessions.some(s=>s.cashboxId===cashboxId && text(s.openedBy)===actorName && localDay(s.openedAt)===today);
    return {openSession,lastClosedSession,balance,suggestedOpeningBalance:this.getSuggestedOpeningBalance(cashboxId),openedTodayByUser,today};
  }
  getSessionMovements(sessionId){
    return this.read(this.movementsFile,{items:[]}).items
      .filter(m=>m.sessionId===sessionId && m.status!=='void')
      .sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  }
  getSessionBalance(sessionId){
    const session=this.read(this.sessionsFile,{items:[]}).items.find(s=>s.id===sessionId);
    if(!session) return 0;
    // Saldo da gaveta: somente dinheiro físico altera o caixa operacional.
    const movements=this.getSessionMovements(sessionId).filter(m=>this.isCashMethod(m.methodId));
    return Math.round((num(session.openingBalance)+movements.reduce((sum,m)=>sum+num(m.signedAmount),0))*100)/100;
  }
  getSessionMethodBalances(sessionId){
    const session=this.read(this.sessionsFile,{items:[]}).items.find(s=>s.id===sessionId);
    if(!session) return [];
    const balances={};
    const add=(methodId,value)=>{ const key=text(methodId)||'dinheiro'; balances[key]=Math.round((num(balances[key])+num(value))*100)/100; };
    // A abertura pertence à gaveta física. Usa o ID REAL da forma Dinheiro
    // (ex.: PM-DINHEIRO), para casar com o cadastro financeiro exibido na tela.
    add(this.getCashMethodId(),num(session.openingBalance));
    for(const movement of this.getSessionMovements(sessionId)) add(movement.methodId,movement.signedAmount);
    return Object.entries(balances).map(([methodId,balance])=>({methodId,balance})).sort((a,b)=>a.methodId.localeCompare(b.methodId));
  }
  getSessionMethodBalance(sessionId,methodId='dinheiro'){
    const target=text(methodId)||'dinheiro';
    const row=this.getSessionMethodBalances(sessionId).find(item=>item.methodId===target);
    return Math.round(num(row?.balance)*100)/100;
  }
  getCashboxMethodBalances(cashboxId){
    const targetCashbox=text(cashboxId)||'caixa-principal';
    const balances={};
    const addBalance=(methodId,value)=>{ const key=text(methodId)||'dinheiro'; balances[key]=Math.round((num(balances[key])+num(value))*100)/100; };
    const allMovements=this.read(this.movementsFile,{items:[]}).items||[];
    for(const movement of allMovements){
      if(movement.cashboxId!==targetCashbox || movement.status==='void') continue;
      if(this.isCashMethod(movement.methodId)) continue; // dinheiro usa o saldo físico transportado do turno atual
      addBalance(movement.methodId,movement.signedAmount);
    }
    const openSession=this.getOpenSession(targetCashbox);
    const cashMethodId=this.getCashMethodId();
    balances[cashMethodId]=openSession?this.getSessionBalance(openSession.id):this.getSuggestedOpeningBalance(targetCashbox);
    return Object.entries(balances).map(([methodId,balance])=>({methodId,balance})).sort((a,b)=>a.methodId.localeCompare(b.methodId));
  }
  getCashboxMethodBalance(cashboxId,methodId='dinheiro'){
    const target=text(methodId)||'dinheiro';
    const row=this.getCashboxMethodBalances(cashboxId).find(item=>item.methodId===target);
    return Math.round(num(row?.balance)*100)/100;
  }
  getCashSessionSummary(sessionId){
    const sessions=this.read(this.sessionsFile,{items:[]}).items;
    const session=sessions.find(s=>s.id===sessionId)||null;
    if(!session) return null;
    const movements=this.getSessionMovements(sessionId);
    const byMethod={};
    const paymentReceiptTypes=new Set(['sale_receipt','receivable_receipt']);
    for(const movement of movements){
      const signed=num(movement.signedAmount);
      const isReceipt=paymentReceiptTypes.has(movement.type)&&signed>0;
      const isReversal=movement.type==='refund'&&signed<0;
      if(!isReceipt&&!isReversal) continue;
      const key=text(movement.methodId)||'outros';
      if(!byMethod[key]) byMethod[key]={methodId:key,entries:0,exits:0,total:0,count:0,reversals:0};
      byMethod[key].total=Math.round((byMethod[key].total+signed)*100)/100;
      if(isReceipt){byMethod[key].entries+=signed;byMethod[key].count+=1;}
      if(isReversal){byMethod[key].exits+=Math.abs(signed);byMethod[key].reversals+=1;}
    }
    const opening=num(session.openingBalance);
    const cashMovements=movements.filter(m=>this.isCashMethod(m.methodId));
    const cashEntries=cashMovements.filter(m=>num(m.signedAmount)>0).reduce((s,m)=>s+num(m.signedAmount),0);
    const cashExits=cashMovements.filter(m=>num(m.signedAmount)<0).reduce((s,m)=>s+Math.abs(num(m.signedAmount)),0);
    const supplies=movements.filter(m=>m.type==='supply'&&this.isCashMethod(m.methodId)).reduce((s,m)=>s+num(m.amount),0);
    const withdrawals=movements.filter(m=>['withdrawal','expense'].includes(m.type)&&this.isCashMethod(m.methodId)).reduce((s,m)=>s+num(m.amount),0);
    // Recebimentos operacionais: vendas, O.S. e baixas do Contas a Receber.
    // Suprimentos não entram aqui, pois são aportes manuais e não faturamento/recebimento.
    const receiptTypes=['sale_receipt','receivable_receipt'];
    const cashReceived=movements
      .filter(m=>receiptTypes.includes(m.type)&&this.isCashMethod(m.methodId)&&num(m.signedAmount)>0)
      .reduce((s,m)=>s+num(m.amount),0);
    const totalReceived=movements
      .filter(m=>receiptTypes.includes(m.type)&&num(m.signedAmount)>0)
      .reduce((s,m)=>s+num(m.amount),0);
    const expectedBalance=Math.round((opening+cashEntries-cashExits)*100)/100;
    return {
      session,openingBalance:opening,cashEntries,cashExits,supplies,withdrawals,
      cashReceived,totalReceived,
      // Compatibilidade com telas e fechamentos anteriores.
      cashSales:cashReceived,salesTotal:totalReceived,
      cashBalance:expectedBalance,expectedBalance,byMethod:Object.values(byMethod),movementCount:movements.length
    };
  }
  getOperationalFinancialSummary(referenceDate=''){
    const day=text(referenceDate)||localDay();
    const month=day.slice(0,7);
    const movements=this.read(this.movementsFile,{items:[]}).items.filter(m=>m.status!=='void');
    const movementDay=m=>localDay(m.createdAt);
    const amount=m=>Math.abs(num(m.signedAmount||m.amount));
    const round=value=>Math.round((value+Number.EPSILON)*100)/100;

    // Estes cards mostram fluxo operacional REALIZADO, não faturamento por competência.
    // Entrada: recebimentos de venda/O.S. + baixas de Contas a Receber.
    // Saída: pagamentos efetivos. Estornos reduzem o lado original e nunca entram
    // como uma nova entrada/saída. Suprimento e sangria continuam fora do operacional.
    const receiptTypes=new Set(['sale_receipt','receivable_receipt']);
    const receipts=movements.filter(m=>receiptTypes.has(m.type)&&num(m.signedAmount)>0);
    const receiptReversals=movements.filter(m=>m.type==='refund'&&num(m.signedAmount)<0);
    const expenses=movements.filter(m=>m.type==='expense'&&num(m.signedAmount)<0);
    const expenseReversals=movements.filter(m=>m.type==='payment_reversal'&&num(m.signedAmount)>0);

    const netFor=(positiveRows,reversalRows,predicate=()=>true)=>round(
      positiveRows.filter(predicate).reduce((total,item)=>total+amount(item),0)
      - reversalRows.filter(predicate).reduce((total,item)=>total+amount(item),0)
    );
    const todayPredicate=m=>movementDay(m)===day;
    const monthPredicate=m=>movementDay(m).slice(0,7)===month;

    const incomeToday=netFor(receipts,receiptReversals,todayPredicate);
    const expenseToday=netFor(expenses,expenseReversals,todayPredicate);
    const incomeMonth=netFor(receipts,receiptReversals,monthPredicate);
    const expenseMonth=netFor(expenses,expenseReversals,monthPredicate);
    const allIncome=netFor(receipts,receiptReversals);
    const allExpense=netFor(expenses,expenseReversals);
    return {
      today:{income:incomeToday,expense:expenseToday},
      month:{income:incomeMonth,expense:expenseMonth},
      balance:round(allIncome-allExpense),
      movementCount:movements.length,
      updatedAt:new Date().toISOString(),
      source:'commerce_cash_movements_net'
    };
  }

  getCashboxDailySummary(cashboxId,day=localDay()){
    const sessions=this.read(this.sessionsFile,{items:[]}).items.filter(s=>s.cashboxId===cashboxId);
    const sessionIds=new Set(sessions.map(s=>s.id));
    const movements=this.read(this.movementsFile,{items:[]}).items.filter(m=>sessionIds.has(m.sessionId)&&m.status!=='void'&&localDay(m.createdAt)===day);
    const receiptTypes=['sale_receipt','receivable_receipt'];
    const receivedToday=movements.filter(m=>receiptTypes.includes(m.type)&&num(m.signedAmount)>0).reduce((s,m)=>s+num(m.amount),0);
    const exitsToday=movements.filter(m=>num(m.signedAmount)<0&&!['refund'].includes(m.type)).reduce((s,m)=>s+Math.abs(num(m.signedAmount)),0);
    const reversalsToday=movements.filter(m=>m.type==='refund'&&num(m.signedAmount)<0).reduce((s,m)=>s+Math.abs(num(m.signedAmount)),0);
    return {day,receivedToday:Math.round(receivedToday*100)/100,exitsToday:Math.round(exitsToday*100)/100,reversalsToday:Math.round(reversalsToday*100)/100,netReceivedToday:Math.round((receivedToday-reversalsToday)*100)/100};
  }
  listCashSessions({cashboxId='',status='all',limit=30}={}){
    return this.read(this.sessionsFile,{items:[]}).items
      .filter(s=>(!cashboxId||s.cashboxId===cashboxId)&&(status==='all'||s.status===status))
      .sort((a,b)=>String(b.closedAt||b.openedAt||'').localeCompare(String(a.closedAt||a.openedAt||'')))
      .slice(0,Math.max(1,Number(limit)||30))
      .map(session=>({ ...session, summary:this.getCashSessionSummary(session.id) }));
  }
  openCashbox({cashboxId,openingBalance=null,openedBy='painel',allowAdditionalOpening=false}={}){
    if(this.getOpenSession(cashboxId)) throw new Error('Este caixa já está aberto.');
    const sessions=this.read(this.sessionsFile,{items:[]});
    const actor=text(openedBy)||'painel';
    const alreadyOpenedToday=sessions.items.some(s=>s.cashboxId===cashboxId && text(s.openedBy)===actor && localDay(s.openedAt)===localDay());
    if(alreadyOpenedToday && !allowAdditionalOpening){
      const error=new Error('Este usuário já abriu este caixa hoje. Use a abertura adicional somente quando precisar iniciar um novo turno.');
      error.code='CASHBOX_ALREADY_OPENED_TODAY';
      throw error;
    }
    const suggested=this.getSuggestedOpeningBalance(cashboxId);
    const session={id:this.id('CXS'),cashboxId,status:'open',openingBalance:openingBalance===null?suggested:num(openingBalance),openingBalanceSource:openingBalance===null?'previous_closing':'manual',openedAt:now(),openedBy:actor,openedDay:localDay(),closedAt:null,closedBy:null,closingBalance:null};
    sessions.items.push(session); this.write(this.sessionsFile,sessions); return session;
  }
  closeCashbox({cashboxId,closedBy='painel',countedBalance=null,notes=''}={}){
    const sessions=this.read(this.sessionsFile,{items:[]});
    const session=sessions.items.find(s=>s.cashboxId===cashboxId && s.status==='open');
    if(!session) throw new Error('Não existe caixa aberto.');
    if(countedBalance===null||countedBalance===undefined||countedBalance==='') throw new Error('Informe o dinheiro contado para fechar o caixa.');
    const counted=Math.round(num(countedBalance)*100)/100;
    if(counted<0) throw new Error('O dinheiro contado não pode ser negativo.');
    const summary=this.getCashSessionSummary(session.id);
    const expected=Math.round(num(summary?.expectedBalance)*100)/100;
    const difference=Math.round((counted-expected)*100)/100;
    const closingNotes=text(notes);
    if(Math.abs(difference)>=0.01 && !closingNotes) throw new Error('Informe uma observação para justificar a diferença do fechamento.');
    session.status='closed';
    session.closedAt=now();
    session.closedBy=text(closedBy)||'painel';
    session.expectedBalance=expected;
    session.closingBalance=counted;
    session.difference=difference;
    session.notes=closingNotes;
    session.closingMode='counted';
    session.closedDay=localDay();
    session.closingSummary=clone({
      openingBalance:summary?.openingBalance||0,
      supplies:summary?.supplies||0,
      withdrawals:summary?.withdrawals||0,
      cashSales:summary?.cashSales||0,
      salesTotal:summary?.salesTotal||0,
      byMethod:summary?.byMethod||[],
      movementCount:summary?.movementCount||0
    });
    this.write(this.sessionsFile,sessions);
    return clone(session);
  }
  processAutomaticCashboxes(referenceDate=new Date()){
    const currentDay=localDay(referenceDate);
    const currentSecond=secondsOfDay(referenceDate);
    const currentSecondKey=localDateTimeSecondKey(referenceDate);
    const results=[];

    const tagSession=(sessionId,fields={})=>{
      const sessions=this.read(this.sessionsFile,{items:[]});
      const stored=sessions.items.find(item=>item.id===sessionId);
      if(stored){ Object.assign(stored,fields); this.write(this.sessionsFile,sessions); }
    };

    const closeAutomatically=(cashboxId,meta,notes)=>{
      const open=this.getOpenSession(cashboxId);
      if(!open) return null;
      const summary=this.getCashSessionSummary(open.id);
      const expected=Math.round(num(summary?.expectedBalance)*100)/100;
      const closed=this.closeCashbox({cashboxId,closedBy:'sistema',countedBalance:expected,notes});
      tagSession(closed.id,{closingMode:'automatic',...meta});
      results.push({cashboxId,action:'closed',sessionId:closed.id,at:referenceDate.toISOString(),...meta});
      return closed;
    };

    const openAutomatically=(cashboxId,meta)=>{
      if(this.getOpenSession(cashboxId)) return null;
      const opened=this.openCashbox({cashboxId,openingBalance:null,openedBy:'sistema',allowAdditionalOpening:true});
      tagSession(opened.id,{openingMode:'automatic',...meta});
      results.push({cashboxId,action:'opened',sessionId:opened.id,at:referenceDate.toISOString(),...meta});
      return opened;
    };

    for(const cashbox of this.listCashboxes()){
      const settings=this.getCashboxSettings(cashbox.id);

      // Regra de segurança: sem a chave-mestra ativa, nenhuma rotina pode
      // abrir ou fechar o caixa automaticamente, mesmo que uma configuração
      // antiga ainda contenha closingMode='automatic'.
      if(settings.automaticShiftsEnabled!==true) continue;
      if(settings.closingMode!=='automatic') continue;

      if(settings.automaticShiftsEnabled===true){
        const shiftTimes=normalizeTimes(settings.automaticShiftTimes);
        for(const shiftTime of shiftTimes){
          const [hour,minute]=shiftTime.split(':').map(Number);
          const openingSecond=hour*3600+minute*60;
          const closingSecond=(openingSecond+86400-10)%86400;
          const eventKey=`${currentDay}T${shiftTime}`;
          let openSession=this.getOpenSession(cashbox.id);

          // Fecha somente na janela de 10 segundos anterior ao novo turno.
          // Para 00:00, a janela pertence ao fim do dia anterior e é tratada pelo ciclo normal.
          const inClosingWindow=openingSecond===0
            ? currentSecond>=86390
            : currentSecond>=closingSecond && currentSecond<openingSecond;
          if(openSession && inClosingWindow && openSession.automaticShiftEventKey!==eventKey){
            const openedKey=localDateTimeSecondKey(openSession.openedAt);
            const boundaryKey=openingSecond===0?`${currentDay}T23:59:50`:`${currentDay}T${shiftTime}:00`;
            if(openedKey<boundaryKey){
              closeAutomatically(cashbox.id,{automaticShiftEventKey:eventKey,automaticShiftTime:shiftTime,automaticCycleDay:currentDay},`Fechamento automático para início do turno das ${shiftTime}.`);
              openSession=null;
            }
          }

          // No horário exato (ou no primeiro ciclo posterior), abre apenas se ainda estiver fechado.
          if(currentSecond>=openingSecond){
            openSession=this.getOpenSession(cashbox.id);
            if(openSession) continue; // abertura manual cancela naturalmente a abertura automática pendente
            const lastClosed=this.getLastClosedSession(cashbox.id);
            const alreadyOpened=(this.read(this.sessionsFile,{items:[]}).items||[]).some(item=>
              item.cashboxId===cashbox.id && item.openingMode==='automatic' && item.automaticShiftEventKey===eventKey
            );
            if(alreadyOpened) continue;
            const closedKey=lastClosed?.closedAt?localDateTimeSecondKey(lastClosed.closedAt):'';
            const eventSecondKey=`${currentDay}T${shiftTime}:00`;
            // Se houve fechamento manual depois do início do turno, respeita a decisão e não reabre.
            if(lastClosed && closedKey>eventSecondKey && lastClosed.automaticShiftEventKey!==eventKey) continue;
            openAutomatically(cashbox.id,{automaticShiftEventKey:eventKey,automaticShiftTime:shiftTime,automaticCycleDay:currentDay,automaticSourceSessionId:lastClosed?.id||null});
          }
        }
        continue;
      }
    }
    return results;
  }

  addCashMovement({cashboxId,type,amount,methodId='dinheiro',description='',referenceType='manual',referenceId='',createdBy='painel',idempotencyKey='',metadata=null,occurredAt=''}={}){
    const session=this.getOpenSession(cashboxId); if(!session) throw new Error('Abra o caixa antes de movimentar valores.');
    const movementType=text(type)||'supply';
    const value=Math.round(Math.abs(num(amount))*100)/100; if(value<=0) throw new Error('Informe um valor maior que zero.');
    const manual=['supply','withdrawal','expense'].includes(movementType);
    const reason=text(description);
    if(manual && !reason) throw new Error('Informe o motivo da movimentação.');
    const direction=['expense','withdrawal','refund'].includes(movementType)?-1:1;
    const normalizedMethod=text(methodId)||this.getCashMethodId();
    if(manual && !this.isManualCashMovementMethod(normalizedMethod)) throw new Error('Esta forma de pagamento não pode ser usada em suprimento ou sangria do caixa.');
    const cashboxSettings=this.getCashboxSettings(cashboxId);
    const balanceAvailable=this.getCashboxMethodBalance(cashboxId,normalizedMethod);
    if(direction<0 && this.isCashMethod(normalizedMethod) && value>balanceAvailable+0.0001){
      if(cashboxSettings.allowNegativeCash!==true) throw new Error(`Saldo em dinheiro insuficiente. Disponível: R$ ${balanceAvailable.toFixed(2).replace('.',',')}. Ative a autorização de caixa negativo nas configurações deste caixa para prosseguir.`);
      if(cashboxSettings.requireNegativeReason!==false && !reason) throw new Error('Informe o motivo para autorizar o caixa negativo.');
    }
    if(direction<0 && manual && !this.isCashMethod(normalizedMethod) && value>balanceAvailable+0.0001){
      throw new Error(`Saldo da forma financeira insuficiente. Disponível: R$ ${balanceAvailable.toFixed(2).replace('.',',')}.`);
    }
    const movements=this.read(this.movementsFile,{items:[]});
    const uniqueKey=text(idempotencyKey);
    if(uniqueKey){ const existing=(movements.items||[]).find(item=>item.idempotencyKey===uniqueKey); if(existing) return clone(existing); }
    const balanceBefore=this.getCashboxMethodBalance(cashboxId,normalizedMethod);
    const movement={id:this.id('CXM'),sessionId:session.id,cashboxId,type:movementType,methodId:normalizedMethod,signedAmount:value*direction,amount:value,description:reason,referenceType,referenceId:text(referenceId),idempotencyKey:uniqueKey,metadata:metadata?clone(metadata):null,status:'posted',verified:false,verifiedAt:'',verifiedBy:'',createdAt:text(occurredAt)||now(),createdBy:text(createdBy)||'painel',balanceBefore,balanceAfter:balanceBefore===null?null:Math.round((balanceBefore+(value*direction))*100)/100};
    movements.items.push(movement); this.write(this.movementsFile,movements); return movement;
  }

  setCashMovementVerified(movementId,{verified=true,verifiedBy='painel'}={}){
    const id=text(movementId); if(!id) throw new Error('Movimentação inválida.');
    const data=this.read(this.movementsFile,{items:[]});
    const movement=(data.items||[]).find(item=>item.id===id);
    if(!movement) throw new Error('Movimentação não encontrada.');
    movement.verified=verified===true;
    movement.verifiedAt=movement.verified?now():'';
    movement.verifiedBy=movement.verified?(text(verifiedBy)||'painel'):'';
    this.write(this.movementsFile,data);
    return clone(movement);
  }

  findCashMovementByIdempotencyKey(idempotencyKey=''){
    const key=text(idempotencyKey);
    if(!key) return null;
    const movements=this.read(this.movementsFile,{items:[]});
    return clone((movements.items||[]).find(item=>item.idempotencyKey===key)||null);
  }

  listOperations({status='all'}={}){
    const items=this.read(this.operationsFile,{items:[]}).items;
    return items.filter(i=>status==='all'||i.status===status).sort((a,b)=>String(b.dates?.updatedAt||b.updatedAt).localeCompare(String(a.dates?.updatedAt||a.updatedAt)));
  }
  getOperation(id){ return this.read(this.operationsFile,{items:[]}).items.find(i=>i.id===id)||null; }

  saveOperation(payload={}, actor='painel'){
    const data=this.read(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    let op=payload.id?data.items.find(i=>i.id===payload.id):null;
    const creating=!op;
    if(payload.id&&!op) throw new Error('Operação não encontrada.');
    if(op && ['finalized','cancelled'].includes(op.status)) throw new Error('Operações finalizadas ou canceladas não podem ser alteradas diretamente.');
    if(op){
      const received=Math.round(num(payload.version));
      if(!received || received!==Math.round(num(op.version))) throw this.conflict('Esta operação foi alterada em outra aba. Recarregue os dados antes de continuar.',clone(op));
    }
    const before=op?clone(op):null;
    if(creating){
      const number=data.nextNumber||1; data.nextNumber=number+1;
      const stamp=now();
      op={id:this.id('OP'),number,type:'sale',status:'open',version:0,createdAt:stamp,createdBy:actor,dates:{openedAt:stamp,updatedAt:stamp,finalizedAt:null,cancelledAt:null,reversedAt:null},operationalStatus:'in_service',financialStatus:'not_started',timeline:[],audit:[],snapshot:null,fiscal:{status:'none',documentId:null,updatedAt:null},links:{originalOperationId:null,originalItemId:null,exchangeIds:[],returnIds:[],warrantyIds:[]}};
      data.items.push(op);
      this.event(op,{type:'created',label:'Operação criada',actor});
    }
    op.type=payload.type==='service_order'?'service_order':'sale';
    op.customerId=text(payload.customerId); op.customerNameSnapshot=text(payload.customerNameSnapshot);
    op.identifier=text(payload.identifier); op.sellerId=text(payload.sellerId); op.sellerNameSnapshot=text(payload.sellerNameSnapshot); op.customStatusId=text(payload.customStatusId)||op.customStatusId||''; op.customStatusName=text(payload.customStatusName)||op.customStatusName||'';
    op.notes=text(payload.notes); op.details=text(payload.details ?? op.details); op.serviceOrder=payload.serviceOrder&&typeof payload.serviceOrder==='object'?clone(payload.serviceOrder):{};
    op.coupon=payload.coupon&&typeof payload.coupon==='object'?clone(payload.coupon):null;
    op.freight=normalizeFreight(payload.freight);
    op.freightTotal=freightTotal(op.freight);
    op.cashboxId=text(payload.cashboxId)||'caixa-principal';
    op.items=(Array.isArray(payload.items)?payload.items:[]).map((item,index)=>({
      id:text(item.id)||this.id('OPI'), productId:text(item.productId), inventoryItemId:text(item.inventoryItemId), code:text(item.code), sku:text(item.sku),
      name:text(item.name)||`Item ${index+1}`, quantity:Math.max(0.001,num(item.quantity)||1), unitPrice:Math.max(0,num(item.unitPrice)), unitCost:Math.max(0,num(item.unitCost)),
      discount:Math.max(0,num(item.discount)), discountMode:item.discountMode==='percent'?'percent':'amount', discountPercent:Math.max(0,Math.min(100,num(item.discountPercent))), verified:item.verified===true, sellerId:text(item.sellerId)||text(payload.sellerId), sellerNameSnapshot:text(item.sellerNameSnapshot)||text(payload.sellerNameSnapshot), stockControlled:item.stockControlled===true, allowNegative:item.allowNegative===true
    }));
    op.payments=(Array.isArray(payload.payments)?payload.payments:[]).filter(p=>num(p.amount)>0).map(p=>({
      id:text(p.id)||this.id('PAY'), methodId:text(p.methodId)||'dinheiro', methodName:text(p.methodName), amount:Math.max(0,num(p.amount)), installments:Math.max(1,Math.round(num(p.installments)||1)), dueDate:text(p.dueDate), dueDates:(Array.isArray(p.dueDates)?p.dueDates:[]).map(text).filter(Boolean), installmentAmounts:(Array.isArray(p.installmentAmounts)?p.installmentAmounts:[]).map(value=>Math.max(0,num(value))), status:'paid', notes:text(p.notes)
    }));
    op.subtotal=op.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0); op.itemDiscountTotal=op.items.reduce((s,i)=>s+i.discount,0); op.couponDiscount=Math.min(Math.max(0,num(op.coupon?.discount)),Math.max(0,op.subtotal-op.itemDiscountTotal)); op.discountTotal=op.itemDiscountTotal+op.couponDiscount; op.freightTotal=freightTotal(op.freight); op.total=Math.max(0,op.subtotal-op.discountTotal)+op.freightTotal;
    op.amountPaid=op.payments.reduce((s,p)=>s+p.amount,0); op.amountPending=Math.max(0,op.total-op.amountPaid); op.change=Math.max(0,op.amountPaid-op.total);
    op.financialStatus=op.amountPaid<=0?'not_started':op.amountPending>0?'partial':'paid';
    op.operationalStatus=text(payload.operationalStatus)||op.operationalStatus||(op.type==='service_order'?'received':'in_service');
    op.version=Math.max(0,Math.round(num(op.version)))+1;
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),openedAt:op.dates?.openedAt||op.createdAt||now(),updatedAt:op.updatedAt,finalizedAt:op.dates?.finalizedAt||null,cancelledAt:op.dates?.cancelledAt||null};
    if(!creating){
      const changes=[];
      [['Cliente','customerNameSnapshot'],['Identificador','identifier'],['Vendedor','sellerNameSnapshot'],['Observação','notes'],['Detalhes','details'],['Tipo','type'],['Status personalizado','customStatusName']].forEach(([label,key])=>{if(!same(before?.[key],op[key]))changes.push(label)});
      if(!same(before?.items,op.items)) changes.push('Itens');
      if(!same(before?.payments,op.payments)) changes.push('Pagamentos');
      if(!same(before?.serviceOrder,op.serviceOrder)) changes.push('Dados da O.S.');
      if(!same(before?.coupon,op.coupon)) changes.push('Cupom');
      if(!same(before?.freight,op.freight)) changes.push('Frete / despesas');
      this.event(op,{type:'updated',label:changes.length?`Operação atualizada: ${changes.join(', ')}`:'Operação salva sem alterações de conteúdo',actor,details:{version:op.version}});
    }
    this.write(this.operationsFile,data); return clone(op);
  }

  updateOperationDetails(id, details='', actor='painel', origin='customer_record'){
    const cleanDetails=text(details);
    const data=this.read(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    const op=data.items.find(item=>String(item.id)===String(id));
    if(!op) throw new Error('Operação não encontrada.');
    const previous=text(op.details);
    if(previous===cleanDetails) return {operation:clone(op),entry:null};
    op.details=cleanDetails;
    const label=cleanDetails?'Detalhes da operação atualizados':'Detalhes da operação removidos';
    const entry=this.event(op,{type:'operation_details_updated',label,actor,details:{previous,current:cleanDetails,origin}});
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt};
    this.write(this.operationsFile,data);
    return {operation:clone(op),entry:clone(entry)};
  }

  appendOperationNote(id, note='', actor='painel', origin='customer_record'){
    const cleanNote=text(note);
    if(!cleanNote) throw new Error('Digite uma observação antes de salvar.');
    const data=this.read(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    const op=data.items.find(item=>String(item.id)===String(id));
    if(!op) throw new Error('Operação não encontrada.');
    const entry=this.event(op,{type:'operation_note_added',label:'Nova observação adicionada',actor,details:{note:cleanNote,origin}});
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt};
    this.write(this.operationsFile,data);
    return {operation:clone(op),entry:clone(entry)};
  }

  appendCustomerNote(id, note='', actor='painel'){
    return this.appendOperationNote(id,note,actor,'customer_record');
  }

  validateOperationForFinalization(operationOrId){
    const op=typeof operationOrId==='string'?this.getOperation(operationOrId):operationOrId;
    if(!op) throw new Error('Operação não encontrada.');
    if(op.status==='finalized') throw new Error('Operação já finalizada.');
    if(op.status==='cancelled') throw new Error('Operação cancelada não pode ser finalizada.');

    const items=Array.isArray(op.items)?op.items:[];
    if(!items.length) throw new Error('Adicione pelo menos um produto ou serviço antes de finalizar.');
    for(const item of items){
      const quantity=num(item.quantity);
      const unitPrice=num(item.unitPrice);
      const discount=num(item.discount);
      if(quantity<=0) throw new Error(`Informe uma quantidade válida para ${text(item.name)||'o item'}.`);
      if(unitPrice<=0) throw new Error(`O valor unitário de ${text(item.name)||'um item'} deve ser maior que zero.`);
      if(discount<0) throw new Error(`O desconto de ${text(item.name)||'um item'} não pode ser negativo.`);
      if((quantity*unitPrice)-discount<=0) throw new Error(`O subtotal de ${text(item.name)||'um item'} deve ser de pelo menos R$ 0,01.`);
    }

    const cashboxSettings=this.getCashboxSettings(op.cashboxId);
    if(cashboxSettings.requireSeller===true && !text(op.sellerNameSnapshot)) throw new Error('Informe o vendedor antes de finalizar.');
    if(cashboxSettings.requireItemVerification===true && items.some(item=>item.verified!==true)) throw new Error('Confira e marque todos os produtos como verificados antes de finalizar.');
    const allowedMethods=new Set(cashboxSettings.enabledPaymentMethods||[]);
    const total=Math.round(num(op.total)*100)/100;
    if(total<0.01) throw new Error('O total da operação deve ser de pelo menos R$ 0,01.');

    const payments=(Array.isArray(op.payments)?op.payments:[]).filter(p=>num(p.amount)>0);
    if(!payments.length) throw new Error('Informe o pagamento integral antes de finalizar.');
    const activePaymentMethods=new Set((this.getSettings().paymentMethods||[]).filter(method=>method.active!==false).map(method=>text(method.id)).filter(Boolean));
    for(const payment of payments){
      if(!text(payment.methodId)) throw new Error('Selecione a forma de pagamento antes de finalizar.');
      if(!activePaymentMethods.has(text(payment.methodId)) || (allowedMethods.size && !allowedMethods.has(text(payment.methodId)))) throw new Error('A forma de pagamento selecionada não está disponível neste caixa.');
      if(num(payment.amount)<=0) throw new Error('Todas as formas de pagamento devem possuir valor maior que zero.');
      if(Math.round(num(payment.installments))<1) throw new Error('O número de parcelas deve ser de pelo menos 1.');
    }

    const paid=Math.round(payments.reduce((sum,p)=>sum+num(p.amount),0)*100)/100;
    const pending=Math.round((total-paid)*100)/100;
    if(pending>0) throw new Error(`Ainda faltam R$ ${pending.toFixed(2).replace('.',',')} para concluir a operação.`);

    const change=Math.max(0,Math.round((paid-total)*100)/100);
    const cashPaid=Math.round(payments.filter(p=>this.isCashMethod(p.methodId)).reduce((sum,p)=>sum+num(p.amount),0)*100)/100;
    if(change>cashPaid) throw new Error('Somente pagamentos em dinheiro podem ultrapassar o total e gerar troco.');

    return {total,paid,change,payments:clone(payments)};
  }

  markOperationPosted(id, fields = {}, actor='painel'){
    const data=this.read(this.operationsFile,{items:[]});
    const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    Object.assign(op, fields, {updatedAt:now(), updatedBy:actor});
    op.dates={...(op.dates||{}),updatedAt:op.updatedAt}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'posted',label:'Estoque e caixa processados',actor});
    this.write(this.operationsFile,data); return clone(op);
  }

  finalizeOperation(id, actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(op.status==='finalized') throw new Error('Operação já finalizada.');
    if(op.status==='cancelled') throw new Error('Operação cancelada não pode ser finalizada.');
    const validation=this.validateOperationForFinalization(op);
    const stamp=now();
    op.status='finalized';
    op.operationalStatus='completed';
    op.financialStatus=Array.isArray(op.receivableIds)&&op.receivableIds.length?'pending_receipt':'paid';
    op.amountPaid=validation.paid;
    op.amountPending=0;
    op.change=validation.change;
    op.finalizedAt=stamp; op.finalizedBy=actor; op.updatedAt=stamp; op.updatedBy=actor;
    op.dates={...(op.dates||{}),openedAt:op.dates?.openedAt||op.createdAt||stamp,updatedAt:stamp,finalizedAt:stamp,cancelledAt:null};
    op.snapshot={createdAt:stamp,customer:{id:op.customerId||'',name:op.customerNameSnapshot||'Consumidor final',identifier:op.identifier||''},seller:{id:op.sellerId||'',name:op.sellerNameSnapshot||''},items:clone(op.items||[]),payments:clone(op.payments||[]),serviceOrder:clone(op.serviceOrder||{}),freight:clone(op.freight||{}),totals:{subtotal:op.subtotal||0,itemDiscountTotal:op.itemDiscountTotal||0,couponDiscount:op.couponDiscount||0,discountTotal:op.discountTotal||0,freightTotal:op.freightTotal||0,total:op.total||0,amountPaid:op.amountPaid||0,amountPending:op.amountPending||0,change:op.change||0}};
    op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'finalized',label:Array.isArray(op.receivableIds)&&op.receivableIds.length?'Operação finalizada com títulos financeiros gerados':'Operação finalizada com pagamento integral',actor,details:{status:op.status,financialStatus:op.financialStatus,total:op.total,amountPaid:op.amountPaid,change:op.change}});
    this.write(this.operationsFile,data); return clone(op);
  }

  cancelOperation(id,{reason='',expectedVersion=null}={},actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(expectedVersion!==null && Math.round(num(expectedVersion))!==Math.round(num(op.version))) throw this.conflict('Esta operação foi alterada em outra aba antes do cancelamento.',clone(op));
    if(op.status==='finalized'||op.inventoryPostedAt||op.cashPostedAt) throw new Error('Operação já processada. Use futuramente o fluxo de estorno/devolução.');
    if(op.status==='cancelled') throw new Error('Operação já cancelada.');
    const stamp=now(); op.status='cancelled'; op.operationalStatus='cancelled'; op.financialStatus='cancelled'; op.cancelReason=text(reason); op.cancelledAt=stamp; op.cancelledBy=actor; op.updatedAt=stamp; op.updatedBy=actor;
    op.dates={...(op.dates||{}),updatedAt:stamp,cancelledAt:stamp}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'cancelled',label:`Operação cancelada${op.cancelReason?`: ${op.cancelReason}`:''}`,actor});
    this.write(this.operationsFile,data); return clone(op);
  }

  addOperationAttachment(id,{dataUrl='',name='',kind='general',expectedVersion=null}={},actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(expectedVersion!==null && Math.round(num(expectedVersion))!==Math.round(num(op.version))) throw this.conflict('A operação mudou antes do envio da foto.',clone(op));
    if(op.type!=='service_order') throw new Error('Fotos estão disponíveis somente para O.S.');
    const current=Array.isArray(op.serviceOrder?.attachments)?op.serviceOrder.attachments:[];
    if(current.length>=3) throw new Error('Limite de 3 fotos por O.S. atingido.');
    const match=String(dataUrl||'').match(/^data:image\/(webp|jpeg|png);base64,(.+)$/i); if(!match) throw new Error('Imagem inválida.');
    const ext=match[1].toLowerCase()==='jpeg'?'jpg':match[1].toLowerCase();
    const buffer=Buffer.from(match[2],'base64'); if(buffer.length>2*1024*1024) throw new Error('A foto compactada ultrapassou 2 MB.');
    const dir=path.join(this.dataDir,'attachments',op.id); fs.mkdirSync(dir,{recursive:true});
    const idAttach=this.id('ATT'); const filename=`${idAttach}.${ext}`; fs.writeFileSync(path.join(dir,filename),buffer);
    const attachment={id:idAttach,name:text(name)||filename,kind:['checkin','checkout','general'].includes(kind)?kind:'general',filename,mime:`image/${ext==='jpg'?'jpeg':ext}`,size:buffer.length,createdAt:now(),createdBy:actor,url:`/erp/pdv/operacoes/${op.id}/anexos/${idAttach}`};
    op.serviceOrder={...(op.serviceOrder||{}),attachments:[...current,attachment]}; op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'attachment_added',label:`Foto adicionada à O.S.: ${attachment.name}`,actor,details:{attachmentId:idAttach,kind:attachment.kind,size:attachment.size}});
    this.write(this.operationsFile,data); return clone(op);
  }

  removeOperationAttachment(id,attachmentId,{expectedVersion=null}={},actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(expectedVersion!==null && Math.round(num(expectedVersion))!==Math.round(num(op.version))) throw this.conflict('A operação mudou antes da remoção da foto.',clone(op));
    const current=Array.isArray(op.serviceOrder?.attachments)?op.serviceOrder.attachments:[]; const attachment=current.find(a=>a.id===attachmentId); if(!attachment) throw new Error('Foto não encontrada.');
    const file=path.join(this.dataDir,'attachments',op.id,path.basename(attachment.filename||'')); try{if(fs.existsSync(file))fs.unlinkSync(file)}catch(_){}
    op.serviceOrder={...(op.serviceOrder||{}),attachments:current.filter(a=>a.id!==attachmentId)}; op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'attachment_removed',label:`Foto removida da O.S.: ${attachment.name||attachmentId}`,actor}); this.write(this.operationsFile,data); return clone(op);
  }

  duplicateOperation(id, actor='painel') {
    const source=this.getOperation(id); if(!source) throw new Error('Operação não encontrada.');
    const duplicated=this.saveOperation({
      type:source.type, customerId:source.customerId, customerNameSnapshot:source.customerNameSnapshot, identifier:source.identifier,
      sellerId:source.sellerId, sellerNameSnapshot:source.sellerNameSnapshot, notes:source.notes, cashboxId:source.cashboxId, freight:clone(source.freight||{}),
      items:(source.items||[]).map(item=>({...item,id:''})), payments:(source.payments||[]).map(item=>({...item,id:''})),
      serviceOrder:clone(source.serviceOrder||{}), operationalStatus:source.type==='service_order'?'received':'in_service'
    },actor);
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(item=>item.id===duplicated.id);
    op.links={...(op.links||{}),originalOperationId:source.id};
    this.event(op,{type:'duplicated',label:`Operação duplicada a partir da #${source.number}`,actor,details:{originalOperationId:source.id}});
    this.write(this.operationsFile,data); return clone(op);
  }

  mergeOpenSales(sourceIds=[], {customerSourceId='', identifierSourceId=''}={}, actor='painel') {
    const ids=[...new Set((Array.isArray(sourceIds)?sourceIds:[]).map(text).filter(Boolean))];
    if(ids.length<2) throw new Error('Selecione pelo menos duas vendas abertas para juntar.');
    const data=this.read(this.operationsFile,{version:'0.13.3',nextNumber:1,items:[]});
    const sources=ids.map(id=>data.items.find(item=>item.id===id));
    if(sources.some(item=>!item)) throw new Error('Uma das vendas selecionadas não foi encontrada. Atualize a busca e tente novamente.');
    if(sources.some(item=>item.type!=='sale')) throw new Error('Somente vendas podem ser juntadas. O.S. não participa desta operação.');
    if(sources.some(item=>item.status!=='open')) throw new Error('Somente vendas em aberto podem ser juntadas.');
    const cashboxId=text(sources[0].cashboxId)||'caixa-principal';
    if(sources.some(item=>(text(item.cashboxId)||'caixa-principal')!==cashboxId)) throw new Error('As vendas precisam pertencer ao mesmo caixa para serem juntadas.');

    const customerSource=sources.find(item=>item.id===text(customerSourceId))||null;
    const identifierSource=sources.find(item=>item.id===text(identifierSourceId))||null;
    const stamp=now();
    const number=data.nextNumber||1; data.nextNumber=number+1;
    const op={
      id:this.id('OP'),number,type:'sale',status:'open',version:1,createdAt:stamp,createdBy:actor,
      dates:{openedAt:stamp,updatedAt:stamp,finalizedAt:null,cancelledAt:null,reversedAt:null},
      operationalStatus:'in_service',financialStatus:'not_started',timeline:[],audit:[],snapshot:null,
      fiscal:{status:'none',documentId:null,updatedAt:null},
      links:{originalOperationId:null,originalItemId:null,exchangeIds:[],returnIds:[],warrantyIds:[],mergedFromOperationIds:ids},
      customerId:customerSource?text(customerSource.customerId):'',
      customerNameSnapshot:customerSource?text(customerSource.customerNameSnapshot):'',
      identifier:identifierSource?text(identifierSource.identifier):'',
      sellerId:text(sources[0].sellerId),sellerNameSnapshot:text(sources[0].sellerNameSnapshot),
      notes:`Venda gerada pela junção das vendas ${sources.map(item=>`#${item.number}`).join(', ')}.`,
      serviceOrder:{},cashboxId,
      freight:{payer:'third_party',carrierName:'',freightAmount:sources.reduce((sum,source)=>sum+freightTotal(source.freight),0),insuranceAmount:0,otherExpensesAmount:0,volumeQuantity:0,species:'',brand:'',netWeight:0,grossWeight:0},
      items:sources.flatMap(source=>(source.items||[]).map(item=>({...clone(item),id:this.id('OPI')}))),
      payments:[]
    };
    op.subtotal=op.items.reduce((sum,item)=>sum+num(item.quantity)*num(item.unitPrice),0);
    op.itemDiscountTotal=op.items.reduce((sum,item)=>sum+num(item.discount),0);
    op.couponDiscount=Math.min(Math.max(0,num(op.coupon?.discount)),Math.max(0,op.subtotal-op.itemDiscountTotal));
    op.discountTotal=op.itemDiscountTotal+op.couponDiscount;
    op.freight=normalizeFreight(op.freight); op.freightTotal=freightTotal(op.freight);
    op.total=Math.max(0,op.subtotal-op.discountTotal)+op.freightTotal; op.amountPaid=0; op.amountPending=op.total; op.change=0;
    this.event(op,{type:'created',label:'Operação criada por junção de vendas abertas',actor,details:{sourceOperationIds:ids,sourceNumbers:sources.map(item=>item.number)}});
    data.items.push(op);
    for(const source of sources){
      source.status='cancelled'; source.operationalStatus='cancelled'; source.financialStatus='cancelled';
      source.cancelReason=`Venda cancelada por junção na venda #${number}`; source.cancelledAt=stamp; source.cancelledBy=actor;
      source.updatedAt=stamp; source.updatedBy=actor; source.dates={...(source.dates||{}),updatedAt:stamp,cancelledAt:stamp};
      source.version=Math.max(1,num(source.version))+1;
      source.links={...(source.links||{}),mergedIntoOperationId:op.id};
      this.event(source,{type:'merged',label:`Venda juntada e substituída pela venda #${number}`,actor,details:{mergedIntoOperationId:op.id,mergedIntoNumber:number}});
    }
    this.write(this.operationsFile,data); return clone(op);
  }

  registerReturnLink(id,{returnId='',type='return',credit=0,reason=''}={},actor='painel') {
    const data=this.read(this.operationsFile,{items:[]});
    const op=data.items.find(item=>item.id===id);if(!op)throw new Error('Operação original não encontrada.');
    op.links=op.links&&typeof op.links==='object'?op.links:{originalOperationId:null,originalItemId:null,exchangeIds:[],returnIds:[],warrantyIds:[]};
    const key=type==='exchange'?'exchangeIds':'returnIds';
    op.links[key]=Array.isArray(op.links[key])?op.links[key]:[];
    if(returnId&&!op.links[key].includes(returnId))op.links[key].push(returnId);
    op.updatedAt=now();op.updatedBy=actor;op.dates={...(op.dates||{}),updatedAt:op.updatedAt};op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:type==='exchange'?'exchange_registered':'return_registered',label:`${type==='exchange'?'Troca':'Devolução'} registrada${returnId?` (${returnId})`:''}`,actor,details:{returnId,credit:num(credit),reason:text(reason)}});
    this.write(this.operationsFile,data);return clone(op);
  }

  reverseOperation(id,{reason='',effects={}}={},actor='painel') {
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(item=>item.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(op.status==='reversed'||op.reversedAt) throw new Error('Esta operação já foi estornada.');
    if(op.status!=='finalized') throw new Error('Somente operações concluídas podem ser estornadas.');
    const stamp=now(); op.status='reversed'; op.operationalStatus='reversed'; op.financialStatus='reversed';
    op.reverseReason=text(reason); op.reverseEffects=clone(effects||{}); op.reversedAt=stamp; op.reversedBy=actor; op.updatedAt=stamp; op.updatedBy=actor;
    op.dates={...(op.dates||{}),updatedAt:stamp,reversedAt:stamp}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'reversed',label:`Operação estornada${op.reverseReason?`: ${op.reverseReason}`:''}`,actor,details:clone(effects||{})});
    this.write(this.operationsFile,data); return clone(op);
  }

  registerPrint(id,{modelName='Documento',expectedVersion=null}={},actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(expectedVersion!==null && Math.round(num(expectedVersion))!==Math.round(num(op.version))) throw this.conflict('A operação mudou antes do registro da impressão.',clone(op));
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'printed',label:`Impressão realizada: ${text(modelName)||'Documento'}`,actor});
    this.write(this.operationsFile,data); return clone(op);
  }
}
