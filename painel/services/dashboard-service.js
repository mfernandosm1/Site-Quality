import fs from 'fs/promises';
import path from 'path';

const round2 = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const text = value => String(value ?? '').trim();
const financiallyActive = item => !['reversed','cancelled','void'].includes(text(item?.status).toLowerCase()) && text(item?.reversalStatus).toLowerCase() !== 'reversed';

async function readJson(file, fallback = { items: [] }) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (_) { return fallback; }
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function parseDateKey(key) {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
}

function addDays(key, amount) {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setDate(date.getDate() + Number(amount || 0));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function periodRange(preset = 'today', referenceKey = localDateKey()) {
  const today = parseDateKey(referenceKey) || new Date();
  let start = new Date(today);
  let end = new Date(today);
  const normalized = ['today', 'week', 'month', 'last_month', 'year', 'all'].includes(preset) ? preset : 'today';

  if (normalized === 'week') {
    const weekday = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - weekday);
    end.setDate(start.getDate() + 6);
  } else if (normalized === 'month') {
    start = new Date(today.getFullYear(), today.getMonth(), 1, 12);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 12);
  } else if (normalized === 'last_month') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 12);
    end = new Date(today.getFullYear(), today.getMonth(), 0, 12);
  } else if (normalized === 'year') {
    start = new Date(today.getFullYear(), 0, 1, 12);
    end = new Date(today.getFullYear(), 11, 31, 12);
  } else if (normalized === 'all') {
    // O início real é resolvido em #buildSnapshot a partir dos primeiros registros do ERP.
    start = new Date(today);
    end = new Date(today);
  }

  return { preset: normalized, from: localDateKey(start), to: localDateKey(end) };
}

function inRange(key, range) { return Boolean(key && key >= range.from && key <= range.to); }
function operationDate(operation) { return localDateKey(operation?.dates?.finalizedAt || operation?.dates?.openedAt || operation?.createdAt); }
function openBalance(item) { return Math.max(0, Number(item?.openBalance ?? item?.netValue ?? item?.originalValue ?? 0) || 0); }

export default class DashboardService {
  constructor({ panelDir, siteContentDir = '', cacheTtlMs = 15000 } = {}) {
    if (!panelDir) throw new Error('DashboardService: panelDir é obrigatório.');
    this.panelDir = path.resolve(panelDir);
    this.siteContentDir = siteContentDir ? path.resolve(siteContentDir) : '';
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map();
    this.inflight = new Map();
  }

  file(...parts) { return path.join(this.panelDir, ...parts); }

  async snapshot({ period = 'today', force = false } = {}) {
    const normalizedPeriod = ['today', 'week', 'month', 'last_month', 'year', 'all'].includes(period) ? period : 'today';
    const cached = this.cache.get(normalizedPeriod);
    const now = Date.now();
    if (!force && cached && (now - cached.at) < this.cacheTtlMs) return cached.value;
    if (!force && this.inflight.has(normalizedPeriod)) return this.inflight.get(normalizedPeriod);

    const task = this.#buildSnapshot(normalizedPeriod)
      .then(value => {
        this.cache.set(normalizedPeriod, { at: Date.now(), value });
        return value;
      })
      .finally(() => this.inflight.delete(normalizedPeriod));

    this.inflight.set(normalizedPeriod, task);
    return task;
  }

  async #buildSnapshot(period) {
    const today = localDateKey();
    let range = periodRange(period, today);
    const [operationsData, payablesData, payableInstallmentsData, receivablesData, receivableInstallmentsData, paymentsData, cashSessionsData, stockCountsData] = await Promise.all([
      readJson(this.file('data', 'erp', 'commerce', 'operations.json')),
      readJson(this.file('data', 'erp', 'finance', 'payables.json')),
      readJson(this.file('data', 'erp', 'finance', 'payable-installments.json')),
      readJson(this.file('data', 'erp', 'finance', 'receivables.json')),
      readJson(this.file('data', 'erp', 'finance', 'receivable-installments.json')),
      readJson(this.file('data', 'erp', 'finance', 'payments.json')),
      readJson(this.file('data', 'erp', 'commerce', 'cash-sessions.json')),
      readJson(this.file('data', 'erp', 'inventory', 'counts.json'))
    ]);

    const operations = operationsData.items || [];
    const payables = payablesData.items || [];
    const payableInstallments = payableInstallmentsData.items || [];
    const receivables = receivablesData.items || [];
    const receivableInstallments = receivableInstallmentsData.items || [];
    const payments = paymentsData.items || [];
    const cashSessions = cashSessionsData.items || [];
    const stockCounts = stockCountsData.items || [];

    if (period === 'all') {
      // Todo período significa TODO o histórico existente na base, inclusive
      // lançamentos com vencimento/data futura. Não limitar pela data de hoje.
      const dateCandidates = [
        ...operations.map(operationDate),
        ...payableInstallments.map(item => text(item.dueDate)),
        ...receivableInstallments.map(item => text(item.dueDate)),
        ...payments.map(item => text(item.movementDate) || localDateKey(item.occurredAt))
      ].filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort();
      const firstDate = dateCandidates[0] || today;
      const lastDate = dateCandidates[dateCandidates.length - 1] || today;
      range = { preset:'all', from:firstDate, to:lastDate };
    }

    const finalized = operations.filter(item => item.status === 'finalized');
    const periodOperations = finalized.filter(item => inRange(operationDate(item), range));
    const completedCommercialOperations = periodOperations.filter(item => item.type === 'sale' || item.type === 'service_order');
    const completedSales = completedCommercialOperations.filter(item => item.type === 'sale');
    const completedServiceOrders = completedCommercialOperations.filter(item => item.type === 'service_order');
    const revenue = round2(periodOperations.reduce((sum, item) => sum + Number(item.total || 0), 0));

    const activePayables = payables.filter(item => financiallyActive(item) && item.status !== 'paid');
    const activePayableIds = new Set(activePayables.map(item => String(item.id)));
    const payableOpenItems = payableInstallments.filter(item => activePayableIds.has(String(item.payableId)) && financiallyActive(item) && item.status !== 'paid' && openBalance(item) > 0);

    const activeReceivables = receivables.filter(item => financiallyActive(item) && item.status !== 'paid');
    const activeReceivableIds = new Set(activeReceivables.map(item => String(item.id)));
    const receivableOpenItems = receivableInstallments.filter(item => activeReceivableIds.has(String(item.receivableId)) && financiallyActive(item) && item.status !== 'paid' && openBalance(item) > 0);

    // Os cards financeiros acompanham o período selecionado pela data de vencimento.
    // Assim "Mês" mostra apenas parcelas que vencem no mês, e não todo o passivo/ativo aberto.
    const payableOpenInPeriod = payableOpenItems.filter(item => inRange(item.dueDate, range));
    const receivableOpenInPeriod = receivableOpenItems.filter(item => inRange(item.dueDate, range));
    const accountsPayable = round2(payableOpenInPeriod.reduce((sum, item) => sum + openBalance(item), 0));
    const accountsReceivable = round2(receivableOpenInPeriod.reduce((sum, item) => sum + openBalance(item), 0));

    // Contas efetivamente pagas no período: usa a data de movimento do pagamento,
    // excluindo lançamentos revertidos/cancelados.
    const accountsPaid = round2(payments
      .filter(item => item.source === 'payable_payment' && financiallyActive(item) && inRange(item.movementDate || localDateKey(item.occurredAt), range))
      .reduce((sum, item) => sum + Number(item.value || 0), 0));

    const overduePayables = payableOpenItems.filter(item => item.dueDate && item.dueDate < today);
    const dueTodayPayables = payableOpenItems.filter(item => item.dueDate === today);
    const upcomingPayableLimit = addDays(today, 2);
    const upcomingPayables = payableOpenItems.filter(item => item.dueDate && item.dueDate > today && item.dueDate <= upcomingPayableLimit);
    const overdueReceivables = receivableOpenItems.filter(item => item.dueDate && item.dueDate < today);
    const openServiceOrders = operations.filter(item => item.type === 'service_order' && item.status === 'open');
    const openStockCounts = stockCounts.filter(item => item.status === 'in_progress');

    const attention = [];
    if (overduePayables.length) attention.push({ level:'danger', icon:'!', label:`${overduePayables.length} conta${overduePayables.length === 1 ? '' : 's'} a pagar vencida${overduePayables.length === 1 ? '' : 's'}`, href:'/erp/financeiro/contas-a-pagar?rapido=vencidas' });
    if (dueTodayPayables.length) attention.push({ level:'warning', icon:'!', label:`${dueTodayPayables.length} conta${dueTodayPayables.length === 1 ? '' : 's'} vence${dueTodayPayables.length === 1 ? '' : 'm'} hoje`, href:'/erp/financeiro/contas-a-pagar?rapido=hoje' });
    if (upcomingPayables.length) attention.push({ level:'warning', icon:'!', label:upcomingPayables.length === 1?'1 conta a pagar vence nos próximos 2 dias':`${upcomingPayables.length} contas a pagar vencem nos próximos 2 dias`, href:`/erp/financeiro/contas-a-pagar?dueFrom=${encodeURIComponent(addDays(today,1))}&dueTo=${encodeURIComponent(upcomingPayableLimit)}` });
    if (openStockCounts.length) attention.push({ level:'warning', icon:'📋', label:`${openStockCounts.length} ${openStockCounts.length === 1 ? 'contagem' : 'contagens'} de estoque em andamento`, href:'/erp/estoque/contagens' });
    if (overdueReceivables.length) attention.push({ level:'danger', icon:'!', label:`${overdueReceivables.length} recebimento${overdueReceivables.length === 1 ? '' : 's'} em atraso`, href:'/erp/financeiro/contas-a-receber?rapido=vencidas' });
    if (openServiceOrders.length) attention.push({ level:'info', icon:'OS', label:`${openServiceOrders.length} O.S. em aberto`, href:'/erp/centro-operacoes?tipo=service_order&situacao=open' });

    const rankingRange = { preset:'30d', from:addDays(today, -29), to:today };
    const rankingMap = new Map();
    finalized.filter(item => inRange(operationDate(item), rankingRange)).forEach(item => {
      const key = text(item.customerId) || text(item.customerNameSnapshot) || 'consumidor-final';
      const name = text(item.customerNameSnapshot) || text(item.identifier) || 'Consumidor final';
      const current = rankingMap.get(key) || { id:key, name, value:0, count:0 };
      current.value += Number(item.total || 0);
      current.count += 1;
      rankingMap.set(key, current);
    });
    const customers = [...rankingMap.values()].map(item => ({ ...item, value:round2(item.value) }));
    const topByValue = [...customers].sort((a,b) => b.value - a.value || b.count - a.count).slice(0,5);
    const topByCount = [...customers].sort((a,b) => b.count - a.count || b.value - a.value).slice(0,5);

    const currentMonthRange = periodRange('month', today);
    const chartRange = range.preset === 'last_month'
      ? range
      : { ...currentMonthRange, to: today };
    const chartDays = [];
    for (let day = chartRange.from; day <= chartRange.to; day = addDays(day, 1)) chartDays.push({ date:day, value:0, count:0 });
    const chartMap = new Map(chartDays.map(item => [item.date, item]));
    finalized.forEach(item => {
      const bucket = chartMap.get(operationDate(item));
      if (!bucket) return;
      bucket.value = round2(bucket.value + Number(item.total || 0));
      bucket.count += 1;
    });

    return {
      generatedAt: new Date().toISOString(), today, range,
      metrics: {
        revenue,
        salesCount: completedCommercialOperations.length,
        saleCount: completedSales.length,
        serviceOrderCount: completedServiceOrders.length,
        accountsReceivable,
        accountsPayable,
        accountsPaid
      },
      attention,
      ranking: { byValue:topByValue, byCount:topByCount },
      revenueChart: chartDays,
      revenueChartRange: chartRange
    };
  }
}
