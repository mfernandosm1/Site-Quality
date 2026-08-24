import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { matchesSearchText } from '../utils/search.js';

const clone = value => JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const businessDate = (date=new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const clean = value => String(value ?? '').trim();
const amount = value => Math.round((Number(value) || 0) * 100) / 100;
const filterValues = value => {
  const source = Array.isArray(value) ? value : (value === undefined || value === null || value === '' ? [] : [value]);
  return [...new Set(source.map(clean).filter(Boolean))];
};
const dateOnly = value => clean(value) || businessDate();
const normalizeText = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const entryTypeOf = item => {
  const explicit = clean(item?.entryType).toLowerCase();
  if (['purchase', 'compra'].includes(explicit)) return 'purchase';
  if (['expense', 'despesa'].includes(explicit)) return 'expense';
  const origin = clean(item?.origin).toLowerCase();
  return origin.includes('purchase') || origin.includes('compra') ? 'purchase' : 'expense';
};


function normalizeCompetencies(payload={}) {
  const source=Array.isArray(payload.competencies)?payload.competencies:[payload.competenceDate||payload.issueDate];
  const values=[];
  for (const raw of source) {
    const value=clean(raw);
    if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) continue;
    const month=value.slice(0,7);
    if (!values.includes(month)) values.push(month);
  }
  return values.length?values:[businessDate().slice(0,7)];
}

function addDays(value, days) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function addMonths(value, months) {
  const date = new Date(`${dateOnly(value)}T12:00:00`);
  const originalDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + Number(months || 0));
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(originalDay, lastDay));
  return date.toISOString().slice(0, 10);
}

export default class PayablesService {
  constructor({ dataDir, financeService, supplierService, commerceService }) {
    this.dataDir = dataDir;
    this.financeService = financeService;
    this.supplierService = supplierService;
    this.commerceService = commerceService;
    this._jsonCache = new Map();
    fs.mkdirSync(dataDir, { recursive:true });
    this.ensure();
  }
  file(name) { return path.join(this.dataDir, name); }
  read(name, fallback={ version:'0.18.0', items:[] }) {
    const target=this.file(name);
    try{
      const stat=fs.statSync(target),cached=this._jsonCache.get(target);
      if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
      const data=JSON.parse(fs.readFileSync(target,'utf8'));
      this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});
      return data;
    }catch(_){return clone(fallback);}
  }
  write(name, data) {
    const target=this.file(name); const temp=`${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, target);
    try{const stat=fs.statSync(target);this._jsonCache.set(target,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){this._jsonCache.delete(target);}
  }
  ensure() {
    for (const name of ['payables.json','payable-installments.json','payable-payments.json','payable-events.json','payable-attachments.json']) {
      if (!fs.existsSync(this.file(name))) this.write(name, { version:'0.18.0', items:[] });
    }
  }
  actor(value) { return clean(value) || 'painel'; }
  event(payableId, action, actor='painel', details={}) {
    const db=this.read('payable-events.json'); db.items=db.items||[];
    db.items.unshift({ id:`PEV-${crypto.randomUUID()}`, payableId, action, at:now(), actor:this.actor(actor), ...details });
    db.items=db.items.slice(0,5000); this.write('payable-events.json',db);
  }
  resolveSupplier(supplierId='') {
    if (!clean(supplierId)) return null;
    const supplier=this.supplierService.getSupplier(supplierId);
    if (!supplier) throw new Error('Fornecedor não encontrado.');
    if (supplier.active===false) throw new Error('O fornecedor selecionado está inativo.');
    return supplier;
  }
  classificationByAccount(accountId='') {
    const id=clean(accountId);
    if (!id) return null;
    const accounts=this.financeService.listCatalog('accounts',{includeInactive:false});
    const centers=this.financeService.listCatalog('costCenters',{includeInactive:false});
    const account=accounts.find(row=>row.id===id);
    if (!account || account.type==='receita' || account.hiddenFromCatalog===true) throw new Error('Selecione um Plano de contas de despesa válido.');
    const costCenterId=clean(account.costCenterId||account.categoryId);
    const costCenter=centers.find(row=>row.id===costCenterId);
    if (!costCenter || costCenter.nature==='receita' || costCenter.hiddenFromCatalog===true) throw new Error('O Plano de contas selecionado não possui um Centro de custo de despesa válido.');
    return {account,costCenter,accountId:account.id,costCenterId:costCenter.id};
  }
  suggestClassification({supplierId='',description=''}={}) {
    const supplier=clean(supplierId), descriptionKey=normalizeText(description);
    if (!supplier && !descriptionKey) return null;
    const activeAccounts=new Map(this.financeService.listCatalog('accounts',{includeInactive:false}).filter(row=>row.type!=='receita'&&row.hiddenFromCatalog!==true).map(row=>[row.id,row]));
    const titles=(this.read('payables.json').items||[]).filter(row=>!['cancelled','reversed'].includes(row.status)&&activeAccounts.has(clean(row.accountId)));
    const queryTokens=descriptionKey.split(/\s+/).filter(token=>token.length>1);
    const scored=[];
    titles.forEach((row,index)=>{
      const rowSupplier=clean(row.supplierId), rowText=normalizeText(row.description);
      const rowTokens=new Set(rowText.split(/\s+/).filter(token=>token.length>1));
      let score=0;
      if (supplier && rowSupplier===supplier) score+=70;
      if (descriptionKey && rowText===descriptionKey) score+=120;
      else if (descriptionKey && (rowText.includes(descriptionKey)||descriptionKey.includes(rowText))) score+=65;
      if (queryTokens.length) {
        const overlap=queryTokens.filter(token=>rowTokens.has(token)).length;
        score+=(overlap/queryTokens.length)*55;
      }
      // histórico mais recente vence empates, sem superar uma correspondência melhor
      score+=Math.max(0,10-Math.min(index,10));
      if (score>=55) scored.push({row,score});
    });
    scored.sort((a,b)=>b.score-a.score||String(b.row.updatedAt||b.row.createdAt||'').localeCompare(String(a.row.updatedAt||a.row.createdAt||'')));
    const best=scored[0];
    if (!best) return null;
    const classification=this.classificationByAccount(best.row.accountId);
    return { accountId:classification.accountId, costCenterId:classification.costCenterId, accountName:classification.account.name, costCenterName:classification.costCenter.name, score:Math.round(best.score), sourcePayableId:best.row.id, sourceNumber:best.row.number||'' };
  }
  nextNumber() {
    const items=this.read('payables.json').items||[];
    const next=items.reduce((max,item)=>Math.max(max,Number(String(item.number||'').replace(/\D/g,''))||0),0)+1;
    return `CP-${String(next).padStart(6,'0')}`;
  }
  list(filters={}) {
    const titles=this.read('payables.json').items||[];
    const installments=this.read('payable-installments.json').items||[];
    const payments=this.read('payable-payments.json').items||[];
    // O cadastro mestre é a fonte atual do nome do fornecedor. O nome gravado
    // no título permanece apenas como fotografia histórica/fallback.
    const supplierMap=new Map(
      (this.supplierService?.listSuppliers({ includeInactive:true })||[])
        .map(supplier=>[clean(supplier.id), supplier])
    );
    const withCurrentSupplier=titles.map(item=>{
      const supplier=supplierMap.get(clean(item.supplierId));
      return supplier ? { ...item, supplierName:clean(supplier.name)||item.supplierName } : item;
    });
    const term=clean(filters.search);
    const today=businessDate();
    const monthStart=`${today.slice(0,7)}-01`;
    const monthEnd=new Date(`${monthStart}T12:00:00`); monthEnd.setMonth(monthEnd.getMonth()+1); monthEnd.setDate(0);
    return withCurrentSupplier.filter(item=>{
      const rows=installments.filter(row=>row.payableId===item.id);
      const itemPayments=payments.filter(row=>row.payableId===item.id&&row.status!=='reversed');
      const hasActivePayment=itemPayments.length>0;
      if (filters.status==='overdue') {
        if (['cancelled','reversed','paid'].includes(item.status)) return false;
      } else if (filters.status==='paid') {
        // A consulta "Paga" é usada para localizar pagamentos efetuados.
        // Portanto, inclui também contas ainda parciais que já possuem ao menos
        // uma parcela/pagamento registrado.
        if (!hasActivePayment) return false;
      } else if (filters.status && item.status!==filters.status) return false;
      if (filters.view==='active' && !['open','partial'].includes(item.status)) return false;
      if (filters.view==='paid' && !hasActivePayment) return false;
      if (filters.view==='all' && ['cancelled','reversed'].includes(item.status)) return false;
      if (filters.view==='reversed' && !['cancelled','reversed'].includes(item.status)) return false;
      if (filters.type && entryTypeOf(item)!==filters.type) return false;
      const supplierIds=filterValues(filters.supplierId);
      const paymentMethodIds=filterValues(filters.paymentMethodId);
      const costCenterIds=filterValues(filters.costCenterId);
      const accountIds=filterValues(filters.accountId);
      if (supplierIds.length && !supplierIds.includes(clean(item.supplierId))) return false;
      if (paymentMethodIds.length && !paymentMethodIds.includes(clean(item.paymentMethodId)) && !installments.some(row=>row.payableId===item.id&&paymentMethodIds.includes(clean(row.paymentMethodId)))) return false;
      if (costCenterIds.length && !costCenterIds.includes(clean(item.costCenterId))) return false;
      if (accountIds.length && !accountIds.includes(clean(item.accountId))) return false;
      const paymentDates=itemPayments.map(row=>clean(row.paidAt||row.createdAt).slice(0,10)).filter(Boolean);
      const openDates=rows.filter(row=>Number(row.openBalance||0)>0).map(row=>row.dueDate).filter(Boolean);
      const allDueDates=rows.filter(row=>!['cancelled','reversed'].includes(clean(row.status).toLowerCase())).map(row=>clean(row.dueDate).slice(0,10)).filter(Boolean);
      const filterByPaymentDate=filters.status==='paid'||filters.view==='paid';
      const relevantDates=filterByPaymentDate?paymentDates:(filters.view==='all'?[...paymentDates,...openDates]:openDates);
      if (filters.status==='overdue' && !openDates.some(value=>value<today)) return false;
      if (filters.dueFrom && !relevantDates.some(value=>value>=filters.dueFrom)) return false;
      if (filters.dueTo && !relevantDates.some(value=>value<=filters.dueTo)) return false;
      if (filters.duePreset==='today' && !relevantDates.includes(today)) return false;
      if (filters.duePreset==='overdue' && !openDates.some(value=>value<today)) return false;
      if (filters.duePreset==='next7' && !relevantDates.some(value=>value>=today&&value<=addDays(today,7))) return false;
      if (filters.duePreset==='month' && !relevantDates.some(value=>value>=monthStart&&value<=monthEnd.toISOString().slice(0,10))) return false;
      if (filters.duePreset==='nextMonth') {
        const nextStart=new Date(`${monthStart}T12:00:00`); nextStart.setMonth(nextStart.getMonth()+1);
        const nextEnd=new Date(nextStart); nextEnd.setMonth(nextEnd.getMonth()+1); nextEnd.setDate(0);
        if (!relevantDates.some(value=>value>=nextStart.toISOString().slice(0,10)&&value<=nextEnd.toISOString().slice(0,10))) return false;
      }
      if (filters.duePreset==='thisWeek' && !relevantDates.some(value=>value>=today&&value<=addDays(today,7))) return false;
      if (!matchesSearchText([item.number,item.supplierName,item.description,item.documentNumber].join(' '),term)) return false;
      return true;
    }).map(item=>{
      const itemPayments=payments.filter(row=>row.payableId===item.id&&row.status!=='reversed');
      const itemInstallments=installments.filter(row=>row.payableId===item.id&&!['cancelled','reversed'].includes(clean(row.status).toLowerCase()));
      const latestPayment=[...itemPayments].sort((a,b)=>String(b.paidAt||b.createdAt||'').localeCompare(String(a.paidAt||a.createdAt||'')))[0];
      const matchesDate=date=>{
        const value=clean(date).slice(0,10); if(!value) return false;
        if(filters.dueFrom&&value<filters.dueFrom) return false;
        if(filters.dueTo&&value>filters.dueTo) return false;
        if(filters.duePreset==='today'&&value!==today) return false;
        if(filters.duePreset==='overdue'&&value>=today) return false;
        if((filters.duePreset==='next7'||filters.duePreset==='thisWeek')&&(value<today||value>addDays(today,7))) return false;
        if(filters.duePreset==='month'&&(value<monthStart||value>monthEnd.toISOString().slice(0,10))) return false;
        if(filters.duePreset==='nextMonth') { const a=new Date(`${monthStart}T12:00:00`);a.setMonth(a.getMonth()+1);const b=new Date(a);b.setMonth(b.getMonth()+1);b.setDate(0);if(value<a.toISOString().slice(0,10)||value>b.toISOString().slice(0,10))return false; }
        return true;
      };
      const hasDateFilter=Boolean(filters.dueFrom||filters.dueTo||filters.duePreset);
      let visibleValue=0, visibleInstallmentCount=0;
      if(filters.view==='paid'||filters.status==='paid') {
        const rows=itemPayments.filter(row=>!hasDateFilter||matchesDate(row.paidAt||row.createdAt));
        visibleValue=amount(rows.reduce((sum,row)=>sum+Number(row.value||0),0)); visibleInstallmentCount=rows.length;
      } else if(filters.view==='all') {
        // Ativas + Pagas usa a mesma regra do card Total do período:
        // pagamentos efetuados na janela + parcelas ainda abertas com vencimento
        // na janela. A chave da parcela impede duplicidade em pagamento parcial.
        const rowsByInstallment=new Map();
        itemPayments.forEach(payment=>{
          if(hasDateFilter&&!matchesDate(payment.paidAt||payment.createdAt))return;
          const installment=itemInstallments.find(row=>clean(row.id)===clean(payment.installmentId));
          if(installment)rowsByInstallment.set(installment.id,installment);
        });
        itemInstallments.forEach(row=>{
          if(Number(row.openBalance||0)<=0)return;
          if(hasDateFilter&&!matchesDate(row.dueDate))return;
          rowsByInstallment.set(row.id,row);
        });
        const rows=[...rowsByInstallment.values()];
        visibleValue=amount(rows.reduce((sum,row)=>sum+Number(row.originalValue||row.value||0),0)); visibleInstallmentCount=rows.length;
      } else {
        const rows=itemInstallments.filter(row=>Number(row.openBalance||0)>0&&(!hasDateFilter||matchesDate(row.dueDate)));
        visibleValue=amount(rows.reduce((sum,row)=>sum+Number(row.openBalance||0),0)); visibleInstallmentCount=rows.length;
      }
      // Quando há filtro de vencimento na visão ativa, a linha deve representar
      // somente as parcelas que pertencem ao período filtrado. Caso contrário,
      // um título com parcelas em agosto e setembro passa no filtro de setembro,
      // mas o front-end exibe o primeiro vencimento em aberto de agosto.
      const displayInstallments=(filters.view==='active'&&hasDateFilter)
        ? itemInstallments.filter(row=>Number(row.openBalance||0)>0&&matchesDate(row.dueDate))
        : itemInstallments;
      return { ...item, installments:displayInstallments, latestPaymentDate:clean(latestPayment?.paidAt||latestPayment?.createdAt).slice(0,10), paymentCount:itemPayments.length, visibleValue, visibleInstallmentCount };
    })
      .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  get(id) { return this.list().find(item=>item.id===id)||null; }
  payments(id) { return (this.read('payable-payments.json').items||[]).filter(item=>item.payableId===id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); }
  activePayments(id) { return this.payments(id).filter(item=>item.status!=='reversed'); }
  events(id) { return (this.read('payable-events.json').items||[]).filter(item=>item.payableId===id).sort((a,b)=>String(b.at).localeCompare(String(a.at))); }
  dashboardSummary(filters={}, referenceDate='') {
    if (typeof filters==='string') { referenceDate=filters; filters={}; }
    const today=clean(referenceDate)||businessDate();
    const titles=this.read('payables.json').items||[];
    const installments=this.read('payable-installments.json').items||[];
    const payments=this.read('payable-payments.json').items||[];
    const supplierMap=new Map(
      (this.supplierService?.listSuppliers({ includeInactive:true })||[])
        .map(supplier=>[clean(supplier.id),supplier])
    );
    const normalizedTitles=titles.map(item=>{
      const supplier=supplierMap.get(clean(item.supplierId));
      return supplier ? { ...item, supplierName:clean(supplier.name)||item.supplierName } : item;
    });
    const term=clean(filters.search);

    // Os cards são calculados por PARCELA/PAGAMENTO. Uma conta parcelada não pode
    // levar o saldo total do título para um período só porque uma de suas parcelas
    // vence nele. Filtros de cadastro continuam sendo aplicados no título.
    const eligibleTitles=normalizedTitles.filter(item=>{
      if (['cancelled','reversed'].includes(item.status)) return false;
      if (filters.type && entryTypeOf(item)!==filters.type) return false;
      const supplierIds=filterValues(filters.supplierId);
      const paymentMethodIds=filterValues(filters.paymentMethodId);
      const costCenterIds=filterValues(filters.costCenterId);
      const accountIds=filterValues(filters.accountId);
      if (supplierIds.length && !supplierIds.includes(clean(item.supplierId))) return false;
      if (costCenterIds.length && !costCenterIds.includes(clean(item.costCenterId))) return false;
      if (accountIds.length && !accountIds.includes(clean(item.accountId))) return false;
      if (paymentMethodIds.length && !paymentMethodIds.includes(clean(item.paymentMethodId)) && !installments.some(row=>row.payableId===item.id&&paymentMethodIds.includes(clean(row.paymentMethodId)))) return false;
      if (!matchesSearchText([item.number,item.supplierName,item.description,item.documentNumber].join(' '),term)) return false;
      return true;
    });
    const eligibleIds=new Set(eligibleTitles.map(item=>item.id));
    const activeIds=new Set(eligibleTitles.filter(item=>['open','partial'].includes(item.status)).map(item=>item.id));

    const monthStart=`${today.slice(0,7)}-01`;
    const monthEndDate=new Date(`${monthStart}T12:00:00`); monthEndDate.setMonth(monthEndDate.getMonth()+1); monthEndDate.setDate(0);
    let periodFrom=clean(filters.dueFrom), periodTo=clean(filters.dueTo);
    if (!periodFrom && !periodTo) {
      if (filters.duePreset==='today') periodFrom=periodTo=today;
      else if (filters.duePreset==='overdue') periodTo=addDays(today,-1);
      else if (filters.duePreset==='next7' || filters.duePreset==='thisWeek') { periodFrom=today; periodTo=addDays(today,7); }
      else if (filters.duePreset==='month') { periodFrom=monthStart; periodTo=monthEndDate.toISOString().slice(0,10); }
      else if (filters.duePreset==='nextMonth') {
        const nextStart=new Date(`${monthStart}T12:00:00`); nextStart.setMonth(nextStart.getMonth()+1);
        const nextEnd=new Date(nextStart); nextEnd.setMonth(nextEnd.getMonth()+1); nextEnd.setDate(0);
        periodFrom=nextStart.toISOString().slice(0,10); periodTo=nextEnd.toISOString().slice(0,10);
      }
    }
    const inPeriod=date=>{
      const value=clean(date).slice(0,10);
      if (!value) return false;
      if (periodFrom && value<periodFrom) return false;
      if (periodTo && value>periodTo) return false;
      return true;
    };
    const hasPeriod=Boolean(periodFrom||periodTo);
    const openRows=installments.filter(row=>activeIds.has(row.payableId)&&Number(row.openBalance||0)>0&&(!hasPeriod||inPeriod(row.dueDate)));
    const validPayments=payments.filter(row=>row.status!=='reversed'&&eligibleIds.has(row.payableId));
    // Sem filtro de período, "Pagos no período" usa o mês corrente. Com um filtro
    // ativo, usa exatamente a mesma janela selecionada pelo operador.
    const paymentRows=validPayments.filter(row=>{
      const paidDate=clean(row.paidAt||row.createdAt).slice(0,10);
      return hasPeriod ? inPeriod(paidDate) : paidDate.slice(0,7)===today.slice(0,7);
    });
    // Total do período = tudo que efetivamente pertence ao período operacional:
    // (1) parcelas pagas dentro da janela, mesmo quando foram antecipadas, +
    // (2) parcelas ainda em aberto com vencimento dentro da janela.
    // Usamos o installmentId para não duplicar uma parcela parcialmente paga.
    const totalPeriodFrom=hasPeriod?periodFrom:monthStart;
    const totalPeriodTo=hasPeriod?periodTo:monthEndDate.toISOString().slice(0,10);
    const inTotalPeriod=date=>{
      const value=clean(date).slice(0,10);
      if(!value)return false;
      if(totalPeriodFrom&&value<totalPeriodFrom)return false;
      if(totalPeriodTo&&value>totalPeriodTo)return false;
      return true;
    };
    const installmentById=new Map(installments.map(row=>[clean(row.id),row]));
    const totalPeriodMap=new Map();
    paymentRows.forEach(payment=>{
      const installment=installmentById.get(clean(payment.installmentId));
      if(!installment||!eligibleIds.has(installment.payableId))return;
      totalPeriodMap.set(installment.id,installment);
    });
    installments.forEach(row=>{
      if(!eligibleIds.has(row.payableId))return;
      if(['cancelled','reversed'].includes(clean(row.status).toLowerCase()))return;
      if(Number(row.openBalance||0)<=0)return;
      if(!inTotalPeriod(row.dueDate))return;
      totalPeriodMap.set(row.id,row);
    });
    const totalPeriodRows=[...totalPeriodMap.values()];
    const sumOpen=rows=>amount(rows.reduce((total,row)=>total+Number(row.openBalance||0),0));
    const sumPaid=rows=>amount(rows.reduce((total,row)=>total+Number(row.value||0),0));

    const weekStart=today;
    const weekEnd=addDays(today,7);
    const nextWeekStart=addDays(today,8);
    const nextWeekEnd=addDays(today,14);
    const next30End=addDays(today,30);
    const between=(row,from,to)=>row.dueDate&&row.dueDate>=from&&row.dueDate<=to;
    const thisWeekRows=openRows.filter(row=>between(row,weekStart,weekEnd));
    const nextWeekRows=openRows.filter(row=>between(row,nextWeekStart,nextWeekEnd));
    const next30Rows=openRows.filter(row=>between(row,today,next30End));
    const dueTodayRows=openRows.filter(row=>row.dueDate===today);
    const overdueRows=openRows.filter(row=>row.dueDate&&row.dueDate<today);

    return {
      open:{ count:openRows.length, value:sumOpen(openRows) },
      dueToday:{ count:dueTodayRows.length, value:sumOpen(dueTodayRows) },
      overdue:{ count:overdueRows.length, value:sumOpen(overdueRows) },
      paidMonth:{ count:paymentRows.length, value:sumPaid(paymentRows) },
      totalPeriod:{ count:totalPeriodRows.length, value:amount(totalPeriodRows.reduce((total,row)=>total+Number(row.originalValue||row.value||0),0)), from:totalPeriodFrom||'', to:totalPeriodTo||'' },
      thisWeek:{ count:thisWeekRows.length, value:sumOpen(thisWeekRows), from:weekStart, to:weekEnd },
      nextWeek:{ count:nextWeekRows.length, value:sumOpen(nextWeekRows), from:nextWeekStart, to:nextWeekEnd },
      next30Days:{ count:next30Rows.length, value:sumOpen(next30Rows), from:today, to:next30End },
      period:{ from:periodFrom||'', to:periodTo||'' }
    };
  }

  create(payload={}, actor='painel') {
    const description=clean(payload.description);
    const competenceItems=Array.isArray(payload.competenceItems)?payload.competenceItems.map(item=>({ competence:clean(item.competence).slice(0,7), value:amount(item.value) })).filter(item=>/^\d{4}-\d{2}$/.test(item.competence)&&item.value>0):[];
    const grossValue=amount(competenceItems.length?competenceItems.reduce((sum,item)=>sum+item.value,0):(payload.grossValue||payload.value));
    if (!description) throw new Error('Informe a descrição da conta.');
    if (grossValue<=0) throw new Error('Informe um valor maior que zero.');
    const supplier=this.resolveSupplier(payload.supplierId);
    const rawPlan=Array.isArray(payload.paymentPlan)?payload.paymentPlan:[];
    const paymentPlan=rawPlan.map((row,index)=>{
      const method=this.resolvePaymentMethod({ paymentMethodId:row.paymentMethodId });
      const value=amount(row.value);
      const installmentCount=Math.max(1,Math.min(120,Number(row.installmentCount||1)));
      const firstDueDate=dateOnly(row.firstDueDate||payload.firstDueDate||payload.dueDate||payload.issueDate);
      if (!method) throw new Error(`Selecione uma forma de pagamento válida na composição ${index+1}.`);
      if (value<=0) throw new Error(`Informe um valor maior que zero na composição ${index+1}.`);
      const installmentDueDates=(Array.isArray(row.installmentDueDates)?row.installmentDueDates:[]).slice(0,installmentCount).map(dateOnly);
      if (installmentDueDates.length) installmentDueDates[0]=firstDueDate;
      return { id:`PPL-${crypto.randomUUID()}`, paymentMethodId:method.id, value, installmentCount, firstDueDate, installmentDueDates, intervalMonths:1 };
    });
    if (!paymentPlan.length) {
      const method=this.resolvePaymentMethod({ paymentMethodId:payload.paymentMethodId });
      if (!method) throw new Error('Selecione uma forma de pagamento prevista válida.');
      paymentPlan.push({ id:`PPL-${crypto.randomUUID()}`, paymentMethodId:method.id, value:grossValue, installmentCount:competenceItems.length||1, firstDueDate:dateOnly(payload.firstDueDate||payload.dueDate||payload.issueDate), intervalMonths:1 });
    }
    const planTotal=amount(paymentPlan.reduce((sum,row)=>sum+row.value,0));
    if (Math.abs(planTotal-grossValue)>0.009) throw new Error(`A composição financeira deve totalizar exatamente R$ ${grossValue.toFixed(2).replace('.',',')}.`);
    const totalInstallments=paymentPlan.reduce((sum,row)=>sum+row.installmentCount,0);
    if (totalInstallments>120) throw new Error('A composição financeira não pode ultrapassar 120 parcelas.');
    const isManual=!clean(payload.origin) || clean(payload.origin).toLowerCase()==='manual';
    let classification=null;
    if (clean(payload.accountId)) classification=this.classificationByAccount(payload.accountId);
    else if (isManual) {
      const suggestion=this.suggestClassification({supplierId:payload.supplierId,description});
      if (suggestion) classification=this.classificationByAccount(suggestion.accountId);
      else throw new Error('Selecione o Plano de contas. O Centro de custo será definido automaticamente.');
    }
    const id=`PAY-${crypto.randomUUID()}`; const createdAt=now();
    const competencies=competenceItems.length?competenceItems.map(item=>item.competence):normalizeCompetencies(payload);
    const title={
      id, number:this.nextNumber(), supplierId:supplier?.id||'', supplierName:supplier?.name||clean(payload.supplierName)||'Despesa sem fornecedor',
      entryType:entryTypeOf(payload), supplierDocument:supplier?.document||'', description, documentNumber:clean(payload.documentNumber), origin:clean(payload.origin)||'manual', originId:clean(payload.originId),
      issueDate:dateOnly(payload.issueDate), competenceDate:`${competencies[0]}-01`, competencies, grossValue, discount:0, interest:0, fine:0,
      netValue:grossValue, paidValue:0, openBalance:grossValue, paymentMethodId:paymentPlan[0].paymentMethodId, paymentPlan, accountId:classification?.accountId||clean(payload.accountId),
      costCenterId:classification?.costCenterId||clean(payload.costCenterId), categoryId:classification?.costCenterId||clean(payload.categoryId||payload.costCenterId), storeId:clean(payload.storeId), cashboxId:clean(payload.cashboxId)||'caixa-principal', status:'open', notes:clean(payload.notes),
      createdAt, createdBy:this.actor(actor), updatedAt:createdAt, updatedBy:this.actor(actor)
    };
    const installments=[];
    let globalNumber=1;
    for (const planRow of paymentPlan) {
      const cents=Math.round(planRow.value*100); const base=Math.floor(cents/planRow.installmentCount); let remainder=cents-(base*planRow.installmentCount);
      for (let index=0; index<planRow.installmentCount; index+=1) {
        const value=(base+(remainder-->0?1:0))/100;
        const customDueDate=clean(planRow.installmentDueDates?.[index]);
        const dueDate=customDueDate ? dateOnly(customDueDate) : addMonths(planRow.firstDueDate,index);
        installments.push({ id:`PIN-${crypto.randomUUID()}`, payableId:id, paymentPlanId:planRow.id, number:globalNumber++, total:totalInstallments,
          planInstallmentNumber:index+1, planInstallmentTotal:planRow.installmentCount, competence:competencies[Math.min(index,competencies.length-1)]||competencies[0],
          dueDate, paymentMethodId:planRow.paymentMethodId, originalValue:value, paidValue:0, openBalance:value, status:'open', createdAt, createdBy:this.actor(actor) });
      }
    }
    const titlesDb=this.read('payables.json'); titlesDb.items=titlesDb.items||[]; titlesDb.items.unshift(title); this.write('payables.json',titlesDb);
    const installmentsDb=this.read('payable-installments.json'); installmentsDb.items=installmentsDb.items||[]; installmentsDb.items.push(...installments); this.write('payable-installments.json',installmentsDb);
    this.event(id,'created',actor,{ value:grossValue, installmentCount:totalInstallments, competencies, cashboxId:title.cashboxId, paymentPlan:paymentPlan.map(row=>({ paymentMethodId:row.paymentMethodId, value:row.value, installmentCount:row.installmentCount, firstDueDate:row.firstDueDate, installmentDueDates:row.installmentDueDates||[] })) });
    return this.get(id);
  }

  updateClassification(id, payload={}, actor='painel') {
    const db=this.read('payables.json');
    const item=(db.items||[]).find(row=>row.id===id);
    if (!item) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(item.status)) throw new Error('Não é possível alterar uma conta estornada.');
    const previous={ costCenterId:item.costCenterId||'', accountId:item.accountId||'' };
    const classification=this.classificationByAccount(payload.accountId);
    if (!classification) throw new Error('Selecione o Plano de contas.');
    item.costCenterId=classification.costCenterId;
    item.categoryId=classification.costCenterId;
    item.accountId=classification.accountId;
    item.updatedAt=now(); item.updatedBy=this.actor(actor);
    this.write('payables.json',db);
    this.event(id,'classification_updated',actor,{ previous, current:{ costCenterId:item.costCenterId, accountId:item.accountId } });
    return this.get(id);
  }

  updateInstallmentPaymentMethod(id, installmentId='', paymentMethodId='', actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível alterar a forma de pagamento de uma conta estornada.');
    const installment=(title.installments||[]).find(row=>row.id===installmentId);
    if (!installment) throw new Error('Parcela não encontrada.');
    if (Number(installment.openBalance||0)<=0) throw new Error('A parcela já está quitada e não possui saldo previsto para alterar.');
    const paymentMethod=this.resolvePaymentMethod({ paymentMethodId });
    if (!paymentMethod) throw new Error('Selecione uma forma de pagamento válida.');
    const db=this.read('payable-installments.json'); const item=db.items.find(row=>row.id===installmentId&&row.payableId===id);
    if (!item) throw new Error('Parcela não encontrada.');
    const previousPaymentMethodId=item.paymentMethodId||title.paymentMethodId||'';
    item.paymentMethodId=paymentMethod.id; item.updatedAt=now(); item.updatedBy=this.actor(actor); this.write('payable-installments.json',db);
    this.event(id,'installment_payment_method_updated',actor,{ installmentId, installmentNumber:item.number, previousPaymentMethodId, paymentMethodId:paymentMethod.id });
    return this.get(id);
  }

  recalculateTitle(id, actor='painel') {
    const installmentsDb=this.read('payable-installments.json');
    const rows=(installmentsDb.items||[]).filter(item=>item.payableId===id);
    rows.sort((a,b)=>Number(a.number||0)-Number(b.number||0));
    rows.forEach((row,index)=>{ row.number=index+1; row.total=rows.length; });
    this.write('payable-installments.json',installmentsDb);
    const total=amount(rows.reduce((sum,row)=>sum+Number(row.originalValue||0),0));
    const paid=amount(rows.reduce((sum,row)=>sum+Number(row.paidValue||0),0));
    const open=amount(rows.reduce((sum,row)=>sum+Number(row.openBalance||0),0));
    const titlesDb=this.read('payables.json');
    const title=(titlesDb.items||[]).find(item=>item.id===id);
    if (!title) throw new Error('Conta a pagar não encontrada.');
    title.grossValue=total; title.netValue=total; title.paidValue=paid; title.openBalance=open;
    title.status=open<=0?'paid':paid>0?'partial':'open';
    title.updatedAt=now(); title.updatedBy=this.actor(actor);
    this.write('payables.json',titlesDb);
    return this.get(id);
  }
  updateInstallmentsBulk(id, payload={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível alterar uma conta estornada.');
    const db=this.read('payable-installments.json'); db.items=db.items||[];
    const rows=db.items.filter(row=>row.payableId===id&&Number(row.openBalance||0)>0).sort((a,b)=>Number(a.number||0)-Number(b.number||0));
    if (!rows.length) throw new Error('Não há parcelas em aberto para alterar.');
    const apply=payload.apply||{};
    if (!apply.value&&!apply.dueDate&&!apply.paymentMethodId&&!apply.notes) throw new Error('Selecione ao menos um campo para aplicar em massa.');
    let value=null, method=null, firstDueDate='';
    if (apply.value) {
      value=amount(payload.value);
      if (value<=0) throw new Error('Informe um valor maior que zero.');
      for (const row of rows) if (value+0.001<Number(row.paidValue||0)) throw new Error(`O valor informado é menor que o total já pago da parcela ${row.number}/${row.total}.`);
    }
    if (apply.dueDate) {
      firstDueDate=clean(payload.firstDueDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) throw new Error('Informe o primeiro vencimento.');
    }
    if (apply.paymentMethodId) {
      method=this.resolvePaymentMethod({paymentMethodId:payload.paymentMethodId});
      if (!method) throw new Error('Selecione uma forma de pagamento válida.');
    }
    const previous=rows.map(row=>({id:row.id,number:row.number,value:Number(row.originalValue||0),dueDate:row.dueDate,paymentMethodId:row.paymentMethodId,notes:row.notes||''}));
    rows.forEach((row,index)=>{
      if (apply.value) { row.originalValue=value; row.openBalance=amount(value-Number(row.paidValue||0)); row.status=row.openBalance<=0?'paid':Number(row.paidValue||0)>0?'partial':'open'; }
      if (apply.dueDate) row.dueDate=payload.monthly===false?firstDueDate:addMonths(firstDueDate,index);
      if (apply.paymentMethodId) row.paymentMethodId=method.id;
      if (apply.notes) row.notes=clean(payload.notes);
      row.updatedAt=now(); row.updatedBy=this.actor(actor);
    });
    this.write('payable-installments.json',db);
    const updated=this.recalculateTitle(id,actor);
    this.event(id,'installments_bulk_updated',actor,{count:rows.length,apply,previous,current:rows.map(row=>({id:row.id,number:row.number,value:Number(row.originalValue||0),dueDate:row.dueDate,paymentMethodId:row.paymentMethodId,notes:row.notes||''}))});
    return updated;
  }
  updateInstallment(id, installmentId='', payload={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível alterar uma conta estornada.');
    const db=this.read('payable-installments.json');
    const item=(db.items||[]).find(row=>row.id===installmentId&&row.payableId===id);
    if (!item) throw new Error('Parcela não encontrada.');
    const previous={value:Number(item.originalValue||0),dueDate:item.dueDate,paymentMethodId:item.paymentMethodId,notes:item.notes||''};
    if (Object.prototype.hasOwnProperty.call(payload,'value')) {
      const value=amount(payload.value);
      if (value<=0) throw new Error('Informe um valor maior que zero.');
      if (value+0.001<Number(item.paidValue||0)) throw new Error(`O valor não pode ser menor que o total já pago (${Number(item.paidValue||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}).`);
      item.originalValue=value; item.openBalance=amount(value-Number(item.paidValue||0));
      item.status=item.openBalance<=0?'paid':Number(item.paidValue||0)>0?'partial':'open';
    }
    if (payload.dueDate) item.dueDate=dateOnly(payload.dueDate);
    if (Object.prototype.hasOwnProperty.call(payload,'paymentMethodId')) {
      const method=this.resolvePaymentMethod({paymentMethodId:payload.paymentMethodId});
      if (!method) throw new Error('Selecione uma forma de pagamento válida.');
      item.paymentMethodId=method.id;
    }
    if (Object.prototype.hasOwnProperty.call(payload,'notes')) item.notes=clean(payload.notes);
    item.updatedAt=now(); item.updatedBy=this.actor(actor); this.write('payable-installments.json',db);
    const updated=this.recalculateTitle(id,actor);
    this.event(id,'installment_updated',actor,{installmentId,installmentNumber:item.number,previous,current:{value:item.originalValue,dueDate:item.dueDate,paymentMethodId:item.paymentMethodId,notes:item.notes||''}});
    return updated;
  }
  splitInstallment(id, installmentId='', splitValue=0, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível quebrar uma conta estornada.');
    const db=this.read('payable-installments.json'); db.items=db.items||[];
    const index=db.items.findIndex(row=>row.id===installmentId&&row.payableId===id);
    if (index<0) throw new Error('Parcela não encontrada.');
    const original=db.items[index];
    if (Number(original.paidValue||0)>0) throw new Error('Estorne os pagamentos da parcela antes de quebrá-la.');
    const first=amount(splitValue), total=amount(original.originalValue);
    if (first<=0||first>=total) throw new Error('Informe um valor maior que zero e menor que o valor da parcela.');
    const second=amount(total-first), createdAt=now();
    const base={payableId:id,paymentPlanId:original.paymentPlanId,competence:original.competence,dueDate:original.dueDate,paymentMethodId:original.paymentMethodId,paidValue:0,status:'open',createdAt,createdBy:this.actor(actor),notes:original.notes||''};
    const rows=[{...base,id:`PIN-${crypto.randomUUID()}`,originalValue:first,openBalance:first},{...base,id:`PIN-${crypto.randomUUID()}`,originalValue:second,openBalance:second}];
    db.items.splice(index,1,...rows); this.write('payable-installments.json',db);
    const updated=this.recalculateTitle(id,actor);
    this.event(id,'installment_split',actor,{sourceInstallmentId:installmentId,sourceValue:total,createdInstallmentIds:rows.map(row=>row.id),values:[first,second]});
    return updated;
  }
  joinInstallments(id, installmentIds=[], actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('Não é possível juntar parcelas de uma conta estornada.');
    const ids=[...new Set((Array.isArray(installmentIds)?installmentIds:[]).map(clean).filter(Boolean))];
    if (ids.length<2) throw new Error('Selecione ao menos duas parcelas para juntar.');
    const db=this.read('payable-installments.json'); db.items=db.items||[];
    const selected=db.items.filter(row=>row.payableId===id&&ids.includes(row.id));
    if (selected.length!==ids.length) throw new Error('Uma ou mais parcelas não foram encontradas.');
    if (selected.some(row=>Number(row.paidValue||0)>0)) throw new Error('Estorne os pagamentos antes de juntar parcelas pagas ou parciais.');
    selected.sort((a,b)=>Number(a.number||0)-Number(b.number||0));
    const first=selected[0], value=amount(selected.reduce((sum,row)=>sum+Number(row.originalValue||0),0));
    const joined={...first,id:`PIN-${crypto.randomUUID()}`,originalValue:value,openBalance:value,paidValue:0,status:'open',dueDate:selected.map(row=>row.dueDate).filter(Boolean).sort()[0]||first.dueDate,notes:selected.map(row=>clean(row.notes)).filter(Boolean).join(' | '),updatedAt:now(),updatedBy:this.actor(actor)};
    const firstIndex=db.items.findIndex(row=>row.id===first.id);
    db.items=db.items.filter(row=>!ids.includes(row.id)); db.items.splice(Math.max(0,firstIndex),0,joined); this.write('payable-installments.json',db);
    const updated=this.recalculateTitle(id,actor);
    this.event(id,'installments_joined',actor,{sourceInstallmentIds:ids,createdInstallmentId:joined.id,value});
    return updated;
  }

  paymentMethodDetails(paymentMethodId='') {
    return this.financeService.listCatalog('paymentMethods').find(item=>item.id===clean(paymentMethodId)) || null;
  }
  validateImmediatePaymentPlan(paymentPlan=[], cashboxId='caixa-principal', paidAt='') {
    const immediate=(Array.isArray(paymentPlan)?paymentPlan:[]).filter(row=>{
      const method=this.paymentMethodDetails(row.paymentMethodId);
      return method?.purchasePaid===true;
    });
    if (!immediate.length) return { immediate:[], session:null };
    const cashRows=immediate.filter(row=>this.paymentMethodDetails(row.paymentMethodId)?.debitCashOnPurchase!==false);
    if (!cashRows.length) return { immediate, session:null };
    if (!this.commerceService) throw new Error('Integração com Caixa indisponível.');
    const selectedCashbox=clean(cashboxId)||'caixa-principal';
    const session=this.commerceService.getOpenSession(selectedCashbox);
    if (!session) throw new Error('Abra o caixa selecionado antes de finalizar uma compra cuja forma debita no Caixa.');
    for (const row of cashRows) {
      const method=this.paymentMethodDetails(row.paymentMethodId);
      const commerceMethod=this.resolveCommercePaymentMethod({ paymentMethodId:method?.id, paymentMethodName:method?.name });
      if (!commerceMethod) throw new Error(`A forma ${method?.name||row.paymentMethodId} não possui correspondência ativa no Caixa.`);
    }
    return { immediate, session };
  }
  payImmediatePlan(id, { cashboxId='caixa-principal', paidAt='', requestPrefix='' }={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    const results=[];
    for (const installment of title.installments||[]) {
      const method=this.paymentMethodDetails(installment.paymentMethodId);
      if (method?.purchasePaid!==true || Number(installment.openBalance||0)<=0) continue;
      const requestKey=`${clean(requestPrefix)||`immediate-${id}`}-${installment.id}`;
      const result=this.pay(id,{ installmentId:installment.id, payments:[{ paymentMethodId:method.id, value:installment.openBalance }], cashboxId, paidAt:dateOnly(paidAt), requestKey, notes:'Pagamento automático conforme parâmetros de Compras / Contas a Pagar da forma de pagamento.' },actor);
      results.push(result.payment);
    }
    return results;
  }
  resolvePaymentMethod(payment={}) {
    const methods=this.financeService.listCatalog('paymentMethods').filter(item=>item.active!==false);
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidate=normalize(payment.paymentMethodId||payment.methodId||payment.paymentMethodName);
    if (!candidate) return null;
    return methods.find(item=>[item.id,item.code,item.name].map(normalize).filter(Boolean).includes(candidate))||null;
  }
  resolveCommercePaymentMethod(payment={}) {
    const methods=this.commerceService?.getSettings()?.paymentMethods || [];
    const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const candidates=[payment.paymentMethodId,payment.paymentMethodName].map(normalize).filter(Boolean);
    const aliases={pmdinheiro:['dinheiro'],pmpix:['pix'],pmcredito:['cartaocredito','credito'],pmdebito:['cartaodebito','debito'],pmboleto:['boletocrediario','boleto','crediario']};
    const expanded=new Set(candidates.flatMap(value=>[value,...(aliases[value]||[])]));
    return methods.find(method=>method.active!==false&&[method.id,method.name,method.kind].map(normalize).some(value=>expanded.has(value))) || null;
  }
  pay(id, payload={}, actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (!['open','partial'].includes(title.status)) throw new Error('Esta conta não está disponível para pagamento.');
    const installment=(title.installments||[]).find(item=>item.id===payload.installmentId)||title.installments.find(item=>Number(item.openBalance||0)>0);
    if (!installment) throw new Error('Selecione uma parcela em aberto.');
    const requestKey=clean(payload.requestKey)||`payable-${crypto.randomUUID()}`;
    const paymentsDb=this.read('payable-payments.json'); paymentsDb.items=paymentsDb.items||[];
    const duplicated=paymentsDb.items.find(item=>item.requestKey===requestKey);
    if (duplicated) return { duplicated:true, item:this.get(id), payment:duplicated };
    const rows=(payload.payments||[]).map((row,index)=>{
      const method=this.resolvePaymentMethod(row);
      if(!method) throw new Error(`Selecione uma forma de pagamento ativa no pagamento ${index+1}.`);
      const debitCash=method.debitCashOnPurchase!==false;
      const commerceMethod=debitCash?this.resolveCommercePaymentMethod({paymentMethodId:method.id,paymentMethodName:method.name}):null;
      return {
        paymentMethodId:method.id,
        paymentMethodName:method.name,
        commerceMethodId:commerceMethod?.id||method.name,
        debitCash,
        value:amount(row.value)
      };
    }).filter(row=>row.value>0);
    if (!rows.length) throw new Error('Informe ao menos uma forma de pagamento.');
    if (rows.some(row=>!row.paymentMethodId)) throw new Error('Selecione a forma de pagamento.');
    const interest=amount(payload.interest), fine=amount(payload.fine), discount=amount(payload.discount);
    const paidTotal=amount(rows.reduce((sum,row)=>sum+row.value,0));
    const principal=amount(paidTotal-interest-fine+discount);
    if (principal<=0) throw new Error('O valor pago precisa cobrir juros e multa.');
    if (principal>Number(installment.openBalance||0)+0.001) throw new Error('O valor aplicado supera o saldo da parcela.');
    const cashboxId=clean(payload.cashboxId)||'caixa-principal'; const cashMovementIds=[];
    for (const [index,row] of rows.entries()) {
      if (row.debitCash===false) continue;
      if (!this.commerceService) throw new Error('Integração com Caixa indisponível.');
      const openSession=this.commerceService.getOpenSession(cashboxId);
      if (!openSession) throw new Error(`Abra o caixa selecionado antes de pagar com ${row.paymentMethodName}, pois esta forma está configurada para debitar no Caixa.`);
      const movementKey=`${requestKey}-${row.paymentMethodId}-${index}`;
      const movement=this.commerceService.addCashMovement({
        cashboxId, type:'expense', amount:row.value, methodId:row.commerceMethodId,
        description:`Pagamento ${title.number} · ${title.description}`,
        referenceType:'payable_payment', referenceId:requestKey, createdBy:this.actor(actor),
        idempotencyKey:movementKey,
        metadata:{ payableId:id, installmentId:installment.id, financePaymentMethodId:row.paymentMethodId }
      });
      const persisted=this.commerceService.findCashMovementByIdempotencyKey?.(movementKey);
      if (!persisted || persisted.cashboxId!==cashboxId || persisted.sessionId!==openSession.id) {
        throw new Error(`A saída de ${row.paymentMethodName} não foi confirmada no Caixa selecionado.`);
      }
      cashMovementIds.push(persisted.id||movement.id);
    }
    const payment={ id:`PYP-${crypto.randomUUID()}`, requestKey, paymentNumber:`PG-${String(paymentsDb.items.length+1).padStart(6,'0')}`, payableId:id, installmentId:installment.id,
      paidAt:dateOnly(payload.paidAt), value:paidTotal, principalValue:principal, interest, fine, discount, payments:rows, notes:clean(payload.notes), cashboxId, cashMovementIds,
      createdAt:now(), createdBy:this.actor(actor), balanceBefore:Number(installment.openBalance||0), balanceAfter:amount(Number(installment.openBalance||0)-principal) };
    const financial=this.financeService.registerPayablePayment({ payment, title, installment, actor:this.actor(actor) });
    payment.financeEntryIds=(financial.entries||[]).map(item=>item.id); payment.financePaymentIds=(financial.payments||[]).map(item=>item.id); payment.financeMovementIds=(financial.movements||[]).map(item=>item.id);
    paymentsDb.items.unshift(payment); this.write('payable-payments.json',paymentsDb);
    const installmentsDb=this.read('payable-installments.json'); const stored=installmentsDb.items.find(item=>item.id===installment.id);
    stored.paidValue=amount(Number(stored.paidValue||0)+principal); stored.openBalance=payment.balanceAfter; stored.status=stored.openBalance<=0?'paid':'partial'; stored.updatedAt=now(); stored.updatedBy=this.actor(actor); this.write('payable-installments.json',installmentsDb);
    const titlesDb=this.read('payables.json'); const storedTitle=titlesDb.items.find(item=>item.id===id);
    storedTitle.paidValue=amount(Number(storedTitle.paidValue||0)+principal); storedTitle.openBalance=amount(Number(storedTitle.openBalance||0)-principal);
    storedTitle.interest=amount(Number(storedTitle.interest||0)+interest); storedTitle.fine=amount(Number(storedTitle.fine||0)+fine); storedTitle.discount=amount(Number(storedTitle.discount||0)+discount);
    storedTitle.status=storedTitle.openBalance<=0?'paid':'partial'; storedTitle.updatedAt=now(); storedTitle.updatedBy=this.actor(actor); this.write('payables.json',titlesDb);
    this.event(id,storedTitle.status==='paid'?'paid':'partial_payment',actor,{ paymentId:payment.id, installmentId:installment.id, value:paidTotal, principalValue:principal, balanceAfter:storedTitle.openBalance });
    return { duplicated:false, item:this.get(id), payment };
  }
  payMany(payload={}, actor='painel') {
    const items=Array.isArray(payload.items)?payload.items:[];
    if(!items.length) throw new Error('Selecione ao menos uma conta para pagar.');
    if(items.length>100) throw new Error('Por segurança, pague no máximo 100 contas por vez.');
    const seen=new Set();
    const prepared=items.map((row,index)=>{
      const payableId=clean(row.payableId||row.id),title=this.get(payableId);
      if(!title) throw new Error(`Conta ${index+1} não encontrada.`);
      if(!['open','partial'].includes(title.status)) throw new Error(`${title.number}: esta conta não está disponível para pagamento.`);
      const installment=(title.installments||[]).find(item=>item.id===row.installmentId)||title.installments.find(item=>Number(item.openBalance||0)>0);
      if(!installment||Number(installment.openBalance||0)<=0) throw new Error(`${title.number}: parcela em aberto não encontrada.`);
      const key=`${payableId}:${installment.id}`;if(seen.has(key))throw new Error(`${title.number}: a mesma parcela foi selecionada mais de uma vez.`);seen.add(key);
      const payments=(row.payments||[]).map((payment,paymentIndex)=>{const method=this.resolvePaymentMethod(payment);if(!method)throw new Error(`${title.number}: selecione uma forma de pagamento ativa na linha ${paymentIndex+1}.`);return {paymentMethodId:method.id,value:amount(payment.value)}}).filter(payment=>payment.value>0);
      if(!payments.length)throw new Error(`${title.number}: informe uma forma de pagamento.`);
      const interest=amount(row.interest),fine=amount(row.fine),discount=amount(row.discount),paidTotal=amount(payments.reduce((sum,item)=>sum+item.value,0)),principal=amount(paidTotal-interest-fine+discount);
      if(principal<=0||principal>Number(installment.openBalance||0)+0.001)throw new Error(`${title.number}: o valor informado não corresponde ao saldo da parcela.`);
      const cashboxId=clean(row.cashboxId)||'caixa-principal';
      const requiresCash=payments.some(payment=>this.paymentMethodDetails(payment.paymentMethodId)?.debitCashOnPurchase!==false);
      if(requiresCash&&!this.commerceService?.getOpenSession(cashboxId))throw new Error(`${title.number}: abra o caixa selecionado antes de registrar formas configuradas para debitar no Caixa.`);
      return {payableId,title,installment,payload:{...row,payableId,installmentId:installment.id,cashboxId,paidAt:dateOnly(row.paidAt),payments,requestKey:clean(row.requestKey)||`payable-bulk-${crypto.randomUUID()}`}};
    });
    const results=[],failures=[];
    for(const item of prepared){
      try{const result=this.pay(item.payableId,item.payload,actor);results.push({payableId:item.payableId,number:item.title.number,installmentId:item.installment.id,payment:result.payment,duplicated:result.duplicated===true});}
      catch(error){failures.push({payableId:item.payableId,number:item.title.number,installmentId:item.installment.id,message:error.message});}
    }
    return {results,failures,total:prepared.length,completed:results.length,failed:failures.length};
  }
  reversePayment(id, paymentId, reason='', actor='painel') {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    if (['cancelled','reversed'].includes(title.status)) throw new Error('A conta já está estornada.');
    const paymentsDb=this.read('payable-payments.json'); paymentsDb.items=paymentsDb.items||[];
    const payment=paymentsDb.items.find(item=>item.id===paymentId&&item.payableId===id);
    if (!payment) throw new Error('Pagamento não encontrado.');
    if (payment.status==='reversed') throw new Error('Este pagamento já foi estornado.');
    const installmentsDb=this.read('payable-installments.json');
    const installment=installmentsDb.items.find(item=>item.id===payment.installmentId&&item.payableId===id);
    if (!installment) throw new Error('Parcela vinculada ao pagamento não encontrada.');

    const reversalIds=[];
    for (const [index,row] of (payment.payments||[]).entries()) {
      if(row.debitCash===false) continue;
      const method=this.resolveCommercePaymentMethod(row);
      const cashMethodId=method?.id||clean(row.commerceMethodId)||clean(row.paymentMethodId);
      if (!cashMethodId) continue;
      const movement=this.commerceService.addCashMovement({
        cashboxId:payment.cashboxId||'caixa-principal', type:'payment_reversal', amount:row.value, methodId:cashMethodId,
        description:`Estorno ${payment.paymentNumber} · ${title.number} · ${clean(reason)||'pagamento removido'}`,
        referenceType:'payable_payment_reversal', referenceId:payment.id, createdBy:this.actor(actor),
        idempotencyKey:`reverse-${payment.id}-${index}`, metadata:{payableId:id,installmentId:installment.id,originalPaymentId:payment.id,reason:clean(reason)}
      });
      reversalIds.push(movement.id);
    }
    this.financeService.reversePayablePayment({payment,title,reason,actor:this.actor(actor)});
    const principal=amount(payment.principalValue||0);
    installment.paidValue=amount(Math.max(0,Number(installment.paidValue||0)-principal));
    installment.openBalance=amount(Number(installment.openBalance||0)+principal);
    installment.status=installment.paidValue>0?'partial':'open'; installment.updatedAt=now(); installment.updatedBy=this.actor(actor);
    this.write('payable-installments.json',installmentsDb);
    const titlesDb=this.read('payables.json'); const stored=titlesDb.items.find(item=>item.id===id);
    stored.paidValue=amount(Math.max(0,Number(stored.paidValue||0)-principal)); stored.openBalance=amount(Number(stored.openBalance||0)+principal);
    stored.interest=amount(Math.max(0,Number(stored.interest||0)-Number(payment.interest||0)));
    stored.fine=amount(Math.max(0,Number(stored.fine||0)-Number(payment.fine||0)));
    stored.discount=amount(Math.max(0,Number(stored.discount||0)-Number(payment.discount||0)));
    stored.status=stored.paidValue>0?'partial':'open'; stored.updatedAt=now(); stored.updatedBy=this.actor(actor); this.write('payables.json',titlesDb);
    payment.status='reversed'; payment.reversedAt=now(); payment.reversedBy=this.actor(actor); payment.reverseReason=clean(reason); payment.cashReversalMovementIds=reversalIds;
    this.write('payable-payments.json',paymentsDb);
    this.event(id,'payment_reversed',actor,{paymentId:payment.id,installmentId:installment.id,value:payment.value,principalValue:principal,reason:clean(reason),balanceAfter:stored.openBalance});
    return {item:this.get(id),payment};
  }

  reconcileCashMovements({ cashboxId='caixa-principal', actor='painel' }={}) {
    if (!this.commerceService) return { repaired:0, skipped:0, items:[] };
    const session=this.commerceService.getOpenSession(clean(cashboxId)||'caixa-principal');
    if (!session) return { repaired:0, skipped:0, items:[], reason:'cashbox_closed' };

    const paymentsDb=this.read('payable-payments.json'); paymentsDb.items=paymentsDb.items||[];
    const titles=new Map((this.read('payables.json').items||[]).map(item=>[item.id,item]));
    const repairedItems=[]; let changed=false; let skipped=0;

    for (const payment of paymentsDb.items) {
      const rows=Array.isArray(payment.payments)?payment.payments:[];
      if (!rows.length) { skipped+=1; continue; }
      const occurredAt=clean(payment.createdAt)||now();
      const targetCashboxId=clean(payment.cashboxId)||clean(cashboxId)||'caixa-principal';
      if (targetCashboxId!==session.cashboxId) { skipped+=1; continue; }
      const title=titles.get(payment.payableId);
      if (!title) { skipped+=1; continue; }

      const ids=new Set(Array.isArray(payment.cashMovementIds)?payment.cashMovementIds.filter(Boolean):[]);
      let repairedPayment=false;
      for (const [index,row] of rows.entries()) {
        if(row.debitCash===false){skipped+=1;continue;}
        const key=`${payment.requestKey}-${row.paymentMethodId}-${index}`;
        const existing=this.commerceService.findCashMovementByIdempotencyKey?.(key);
        if (existing && existing.cashboxId===session.cashboxId && existing.sessionId===session.id) { ids.add(existing.id); continue; }
        const method=this.resolveCommercePaymentMethod(row);
        const cashMethodId=method?.id||clean(row.commerceMethodId)||clean(row.paymentMethodId);
        if (!cashMethodId || amount(row.value)<=0) { skipped+=1; continue; }
        const movement=this.commerceService.addCashMovement({
          cashboxId:targetCashboxId,
          type:'expense', amount:row.value, methodId:cashMethodId,
          description:`Pagamento ${title.number} · ${title.description}`,
          referenceType:'payable_payment', referenceId:payment.requestKey,
          createdBy:this.actor(actor), idempotencyKey:key, occurredAt,
          metadata:{ payableId:payment.payableId, installmentId:payment.installmentId, payablePaymentId:payment.id, financePaymentMethodId:row.paymentMethodId, reconciled:true }
        });
        ids.add(movement.id); row.commerceMethodId=cashMethodId; repairedPayment=true; changed=true;
      }
      payment.cashMovementIds=[...ids];
      if (repairedPayment) {
        payment.cashboxId=targetCashboxId;
        payment.cashReconciledAt=now(); payment.cashReconciledBy=this.actor(actor);
        repairedItems.push({ paymentId:payment.id, payableId:payment.payableId, cashMovementIds:[...ids] });
        this.event(payment.payableId,'cash_reconciled',actor,{ paymentId:payment.id, cashMovementIds:[...ids] });
      }
    }
    if (changed) this.write('payable-payments.json',paymentsDb);
    return { repaired:repairedItems.length, skipped, items:repairedItems };
  }

  reverse(id, reason='', actor='painel', { reversePayments=false, allowPurchaseOrigin=false }={}) {
    const title=this.get(id); if (!title) throw new Error('Conta a pagar não encontrada.');
    // Contas originadas em Compras continuam protegidas contra estorno direto no Financeiro.
    // O próprio módulo Compras pode autorizar a reversão coordenada de todos os efeitos.
    if (entryTypeOf(title)==='purchase' && !allowPurchaseOrigin) throw new Error('Esta conta foi gerada por uma compra. Para remover todo o financeiro, estorne a compra completa no módulo Compras.');
    const active=this.activePayments(id);
    if (active.length && !reversePayments) throw new Error('Esta conta possui pagamentos. Confirme o estorno da conta e de todos os pagamentos.');
    for (const payment of active) this.reversePayment(id,payment.id,reason||'Estorno da conta',actor);
    const db=this.read('payables.json'); const item=db.items.find(row=>row.id===id); item.status='reversed'; item.reverseReason=clean(reason); item.reversedAt=now(); item.reversedBy=this.actor(actor); item.updatedAt=now(); item.updatedBy=this.actor(actor); this.write('payables.json',db);
    const installments=this.read('payable-installments.json'); installments.items.filter(row=>row.payableId===id).forEach(row=>{ row.status='reversed'; row.updatedAt=now(); row.updatedBy=this.actor(actor); }); this.write('payable-installments.json',installments);
    this.event(id,'reversed_action',actor,{ reason:item.reverseReason, reversedPayments:active.length }); return this.get(id);
  }
  cancel(id, reason='', actor='painel') { return this.reverse(id, reason, actor); }
}
