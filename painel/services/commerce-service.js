import fs from 'fs';
import path from 'path';

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function now(){ return new Date().toISOString(); }
function num(value){ const n=Number(value); return Number.isFinite(n)?n:0; }
function text(value){ return String(value ?? '').trim(); }
function same(a,b){ return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
function localDay(value=new Date()){
  const date=value instanceof Date?value:new Date(value);
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
  catch(_){return date.toISOString().slice(0,10);}
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
  read(file,fallback){ try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(_){return clone(fallback);} }
  write(file,data){ const temp=`${file}.tmp`; fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8'); fs.renameSync(temp,file); }
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
  getSettings(){ return this.read(this.settingsFile,{paymentMethods:[]}); }
  getOpenSession(cashboxId){ return this.read(this.sessionsFile,{items:[]}).items.find(s=>s.cashboxId===cashboxId && s.status==='open') || null; }
  findOpenSessionForUser(actor='painel', preferredCashboxId=''){
    const user=text(actor)||'painel';
    const cashboxes=this.listCashboxes();
    const sessions=this.read(this.sessionsFile,{items:[]}).items.filter(item=>item.status==='open' && text(item.openedBy)===user);
    const selected=text(preferredCashboxId);
    const session=(selected?sessions.find(item=>item.cashboxId===selected):null)||sessions.sort((a,b)=>String(b.openedAt).localeCompare(String(a.openedAt)))[0]||null;
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
    const movements=this.getSessionMovements(sessionId).filter(m=>m.methodId==='dinheiro');
    return Math.round((num(session.openingBalance)+movements.reduce((sum,m)=>sum+num(m.signedAmount),0))*100)/100;
  }
  getCashSessionSummary(sessionId){
    const sessions=this.read(this.sessionsFile,{items:[]}).items;
    const session=sessions.find(s=>s.id===sessionId)||null;
    if(!session) return null;
    const movements=this.getSessionMovements(sessionId);
    const byMethod={};
    for(const movement of movements){
      const key=text(movement.methodId)||'outros';
      if(!byMethod[key]) byMethod[key]={methodId:key,entries:0,exits:0,total:0,count:0};
      const signed=num(movement.signedAmount);
      byMethod[key].count+=1;
      byMethod[key].total=Math.round((byMethod[key].total+signed)*100)/100;
      if(signed>=0) byMethod[key].entries+=signed; else byMethod[key].exits+=Math.abs(signed);
    }
    const opening=num(session.openingBalance);
    const cashMovements=movements.filter(m=>m.methodId==='dinheiro');
    const cashEntries=cashMovements.filter(m=>num(m.signedAmount)>0).reduce((s,m)=>s+num(m.signedAmount),0);
    const cashExits=cashMovements.filter(m=>num(m.signedAmount)<0).reduce((s,m)=>s+Math.abs(num(m.signedAmount)),0);
    const supplies=movements.filter(m=>m.type==='supply'&&m.methodId==='dinheiro').reduce((s,m)=>s+num(m.amount),0);
    const withdrawals=movements.filter(m=>['withdrawal','expense'].includes(m.type)&&m.methodId==='dinheiro').reduce((s,m)=>s+num(m.amount),0);
    // Recebimentos operacionais: vendas, O.S. e baixas do Contas a Receber.
    // Suprimentos não entram aqui, pois são aportes manuais e não faturamento/recebimento.
    const receiptTypes=['sale_receipt','receivable_receipt'];
    const cashReceived=movements
      .filter(m=>receiptTypes.includes(m.type)&&m.methodId==='dinheiro'&&num(m.signedAmount)>0)
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
  addCashMovement({cashboxId,type,amount,methodId='dinheiro',description='',referenceType='manual',referenceId='',createdBy='painel',idempotencyKey='',metadata=null,occurredAt=''}={}){
    const session=this.getOpenSession(cashboxId); if(!session) throw new Error('Abra o caixa antes de movimentar valores.');
    const movementType=text(type)||'supply';
    const value=Math.round(Math.abs(num(amount))*100)/100; if(value<=0) throw new Error('Informe um valor maior que zero.');
    const manual=['supply','withdrawal','expense'].includes(movementType);
    const reason=text(description);
    if(manual && !reason) throw new Error('Informe o motivo da movimentação.');
    const direction=['expense','withdrawal','refund'].includes(movementType)?-1:1;
    const normalizedMethod=['supply','withdrawal'].includes(movementType)?'dinheiro':(text(methodId)||'dinheiro');
    if(direction<0 && normalizedMethod==='dinheiro' && value>this.getSessionBalance(session.id)+0.0001){
      throw new Error(`Saldo em dinheiro insuficiente. Disponível: R$ ${this.getSessionBalance(session.id).toFixed(2).replace('.',',')}.`);
    }
    const movements=this.read(this.movementsFile,{items:[]});
    const uniqueKey=text(idempotencyKey);
    if(uniqueKey){ const existing=(movements.items||[]).find(item=>item.idempotencyKey===uniqueKey); if(existing) return clone(existing); }
    const balanceBefore=normalizedMethod==='dinheiro'?this.getSessionBalance(session.id):null;
    const movement={id:this.id('CXM'),sessionId:session.id,cashboxId,type:movementType,methodId:normalizedMethod,signedAmount:value*direction,amount:value,description:reason,referenceType,referenceId:text(referenceId),idempotencyKey:uniqueKey,metadata:metadata?clone(metadata):null,status:'posted',createdAt:text(occurredAt)||now(),createdBy:text(createdBy)||'painel',balanceBefore,balanceAfter:balanceBefore===null?null:Math.round((balanceBefore+(value*direction))*100)/100};
    movements.items.push(movement); this.write(this.movementsFile,movements); return movement;
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
      op={id:this.id('OP'),number,type:'sale',status:'open',version:0,createdAt:stamp,createdBy:actor,dates:{openedAt:stamp,updatedAt:stamp,finalizedAt:null,cancelledAt:null},operationalStatus:'in_service',financialStatus:'not_started',timeline:[],audit:[],snapshot:null,links:{originalOperationId:null,originalItemId:null,exchangeIds:[],returnIds:[],warrantyIds:[]}};
      data.items.push(op);
      this.event(op,{type:'created',label:'Operação criada',actor});
    }
    op.type=payload.type==='service_order'?'service_order':'sale';
    op.customerId=text(payload.customerId); op.customerNameSnapshot=text(payload.customerNameSnapshot);
    op.identifier=text(payload.identifier); op.sellerId=text(payload.sellerId); op.sellerNameSnapshot=text(payload.sellerNameSnapshot);
    op.notes=text(payload.notes); op.serviceOrder=payload.serviceOrder&&typeof payload.serviceOrder==='object'?clone(payload.serviceOrder):{};
    op.cashboxId=text(payload.cashboxId)||'caixa-principal';
    op.items=(Array.isArray(payload.items)?payload.items:[]).map((item,index)=>({
      id:text(item.id)||this.id('OPI'), productId:text(item.productId), inventoryItemId:text(item.inventoryItemId),
      name:text(item.name)||`Item ${index+1}`, quantity:Math.max(0.001,num(item.quantity)||1), unitPrice:Math.max(0,num(item.unitPrice)), unitCost:Math.max(0,num(item.unitCost)),
      discount:Math.max(0,num(item.discount)), sellerId:text(item.sellerId)||text(payload.sellerId), sellerNameSnapshot:text(item.sellerNameSnapshot)||text(payload.sellerNameSnapshot), stockControlled:item.stockControlled===true, allowNegative:item.allowNegative===true
    }));
    op.payments=(Array.isArray(payload.payments)?payload.payments:[]).filter(p=>num(p.amount)>0).map(p=>({
      id:text(p.id)||this.id('PAY'), methodId:text(p.methodId)||'dinheiro', methodName:text(p.methodName), amount:Math.max(0,num(p.amount)), installments:Math.max(1,Math.round(num(p.installments)||1)), dueDate:text(p.dueDate), dueDates:(Array.isArray(p.dueDates)?p.dueDates:[]).map(text).filter(Boolean), installmentAmounts:(Array.isArray(p.installmentAmounts)?p.installmentAmounts:[]).map(value=>Math.max(0,num(value))), status:'paid', notes:text(p.notes)
    }));
    op.subtotal=op.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0); op.discountTotal=op.items.reduce((s,i)=>s+i.discount,0); op.total=Math.max(0,op.subtotal-op.discountTotal);
    op.amountPaid=op.payments.reduce((s,p)=>s+p.amount,0); op.amountPending=Math.max(0,op.total-op.amountPaid); op.change=Math.max(0,op.amountPaid-op.total);
    op.financialStatus=op.amountPaid<=0?'not_started':op.amountPending>0?'partial':'paid';
    op.operationalStatus=text(payload.operationalStatus)||op.operationalStatus||(op.type==='service_order'?'received':'in_service');
    op.version=Math.max(0,Math.round(num(op.version)))+1;
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),openedAt:op.dates?.openedAt||op.createdAt||now(),updatedAt:op.updatedAt,finalizedAt:op.dates?.finalizedAt||null,cancelledAt:op.dates?.cancelledAt||null};
    if(!creating){
      const changes=[];
      [['Cliente','customerNameSnapshot'],['Identificador','identifier'],['Vendedor','sellerNameSnapshot'],['Observação','notes'],['Tipo','type']].forEach(([label,key])=>{if(!same(before?.[key],op[key]))changes.push(label)});
      if(!same(before?.items,op.items)) changes.push('Itens');
      if(!same(before?.payments,op.payments)) changes.push('Pagamentos');
      if(!same(before?.serviceOrder,op.serviceOrder)) changes.push('Dados da O.S.');
      this.event(op,{type:'updated',label:changes.length?`Operação atualizada: ${changes.join(', ')}`:'Operação salva sem alterações de conteúdo',actor,details:{version:op.version}});
    }
    this.write(this.operationsFile,data); return clone(op);
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

    const total=Math.round(num(op.total)*100)/100;
    if(total<0.01) throw new Error('O total da operação deve ser de pelo menos R$ 0,01.');

    const payments=(Array.isArray(op.payments)?op.payments:[]).filter(p=>num(p.amount)>0);
    if(!payments.length) throw new Error('Informe o pagamento integral antes de finalizar.');
    const activePaymentMethods=new Set((this.getSettings().paymentMethods||[]).filter(method=>method.active!==false).map(method=>text(method.id)).filter(Boolean));
    for(const payment of payments){
      if(!text(payment.methodId)) throw new Error('Selecione a forma de pagamento antes de finalizar.');
      if(!activePaymentMethods.has(text(payment.methodId))) throw new Error('A forma de pagamento selecionada não está disponível.');
      if(num(payment.amount)<=0) throw new Error('Todas as formas de pagamento devem possuir valor maior que zero.');
      if(Math.round(num(payment.installments))<1) throw new Error('O número de parcelas deve ser de pelo menos 1.');
    }

    const paid=Math.round(payments.reduce((sum,p)=>sum+num(p.amount),0)*100)/100;
    const pending=Math.round((total-paid)*100)/100;
    if(pending>0) throw new Error(`Ainda faltam R$ ${pending.toFixed(2).replace('.',',')} para concluir a operação.`);

    const change=Math.max(0,Math.round((paid-total)*100)/100);
    const cashPaid=Math.round(payments.filter(p=>p.methodId==='dinheiro').reduce((sum,p)=>sum+num(p.amount),0)*100)/100;
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
    op.snapshot={createdAt:stamp,customer:{id:op.customerId||'',name:op.customerNameSnapshot||'Consumidor final',identifier:op.identifier||''},seller:{id:op.sellerId||'',name:op.sellerNameSnapshot||''},items:clone(op.items||[]),payments:clone(op.payments||[]),serviceOrder:clone(op.serviceOrder||{}),totals:{subtotal:op.subtotal||0,discountTotal:op.discountTotal||0,total:op.total||0,amountPaid:op.amountPaid||0,amountPending:op.amountPending||0,change:op.change||0}};
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

  registerPrint(id,{modelName='Documento',expectedVersion=null}={},actor='painel'){
    const data=this.read(this.operationsFile,{items:[]}); const op=data.items.find(i=>i.id===id); if(!op) throw new Error('Operação não encontrada.');
    if(expectedVersion!==null && Math.round(num(expectedVersion))!==Math.round(num(op.version))) throw this.conflict('A operação mudou antes do registro da impressão.',clone(op));
    op.updatedAt=now(); op.updatedBy=actor; op.dates={...(op.dates||{}),updatedAt:op.updatedAt}; op.version=Math.max(1,num(op.version))+1;
    this.event(op,{type:'printed',label:`Impressão realizada: ${text(modelName)||'Documento'}`,actor});
    this.write(this.operationsFile,data); return clone(op);
  }
}
