import fs from 'fs';
import path from 'path';

const clean = value => String(value ?? '').trim();
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const dateOnly = value => clean(value).slice(0, 10);
const monthKey = value => dateOnly(value).slice(0, 7);
const isFinanciallyActive = item => !['reversed', 'cancelled', 'void'].includes(clean(item?.status).toLowerCase()) && clean(item?.reversalStatus).toLowerCase() !== 'reversed';

export default class DreService {
  constructor({ dataDir }) { this.dataDir = dataDir; }

  read(name, fallback = { items: [] }) {
    try { return JSON.parse(fs.readFileSync(path.join(this.dataDir, name), 'utf8')); }
    catch (_) { return fallback; }
  }

  catalogs() {
    const readItems = name => this.read(name).items || [];
    return {
      groups: readItems('dre-groups.json').filter(x => x.active !== false).sort((a, b) => num(a.order) - num(b.order)),
      accounts: readItems('chart-of-accounts.json'),
      costCenters: readItems('cost-centers.json')
    };
  }

  normalizeEntries({ basis, accountId, costCenterId, groupId, accounts, costCenters }) {
    const accountById = new Map(accounts.map(x => [x.id, x]));
    const centerById = new Map(costCenters.map(x => [x.id, x]));
    const entries = (this.read('entries.json').items || []).filter(isFinanciallyActive)
      .filter(e => basis !== 'competence' || clean(e.source) !== 'payable_payment');

    return entries.map(e => {
      const date = dateOnly(basis === 'cash' ? (e.movementDate || e.occurredAt) : (e.competenceDate || e.movementDate || e.occurredAt));
      const account = accountById.get(e.accountId) || {};
      const effectiveCostCenterId = e.costCenterId || account.costCenterId || account.categoryId || '';
      const center = centerById.get(effectiveCostCenterId) || {};
      const dreGroupId = account.dreGroupId || center.dreGroupId || (account.type === 'receita' || center.nature === 'receita' ? 'DRE-RB' : '');
      return {
        id: e.id,
        date,
        description: e.description || 'Lançamento financeiro',
        value: Math.abs(num(e.grossValue || e.principalValue || e.value)),
        type: clean(e.type).toLowerCase(),
        operationId: clean(e.operationId),
        accountId: e.accountId || '',
        accountName: account.name || 'Sem plano de conta',
        costCenterId: effectiveCostCenterId,
        costCenterName: center.name || 'Sem centro de custo',
        dreGroupId,
        effectiveDreGroupId: dreGroupId,
        supplierName: e.supplierName || '',
        customerName: e.customerName || '',
        source: e.source || '',
        classificationRequired: !dreGroupId,
        fallbackClassification: false,
        includedViaOperation: false
      };
    }).filter(row => {
      if (!row.date) return false;
      if (accountId && row.accountId !== accountId) return false;
      if (costCenterId && row.costCenterId !== costCenterId) return false;
      return true;
    });
  }

  payableExpenses({ basis, accountId, costCenterId, accounts, costCenters }) {
    // Regra gerencial do Quality ERP para Contas a Pagar no DRE:
    // - o que foi pago entra na data do pagamento;
    // - o que ainda está em aberto entra na data do vencimento;
    // - uma parcela parcial é dividida naturalmente entre valor já pago e saldo aberto.
    // Assim o DRE não ignora contas não pagas e também reconhece antecipações no mês
    // em que foram efetivamente assumidas pelo financeiro.
    if (basis !== 'competence') return [];

    const accountById = new Map(accounts.map(x => [x.id, x]));
    const centerById = new Map(costCenters.map(x => [x.id, x]));
    const payables = new Map((this.read('payables.json').items || [])
      .filter(isFinanciallyActive)
      .map(x => [clean(x.id), x]));
    const installments = (this.read('payable-installments.json').items || [])
      .filter(isFinanciallyActive)
      .filter(x => !['cancelled', 'reversed', 'void'].includes(clean(x.status).toLowerCase()));
    const payments = (this.read('payable-payments.json').items || [])
      .filter(isFinanciallyActive)
      .filter(x => clean(x.status).toLowerCase() !== 'reversed');
    const paymentsByInstallment = new Map();
    payments.forEach(payment => {
      const key = clean(payment.installmentId);
      if (!key) return;
      if (!paymentsByInstallment.has(key)) paymentsByInstallment.set(key, []);
      paymentsByInstallment.get(key).push(payment);
    });

    const rows = [];
    const pushRow = (inst, payable, value, date, suffix, source) => {
      value = Math.abs(num(value));
      date = dateOnly(date);
      if (!value || !date) return;
      const account = accountById.get(payable.accountId) || {};
      const effectiveCostCenterId = payable.costCenterId || account.costCenterId || account.categoryId || '';
      const center = centerById.get(effectiveCostCenterId) || {};
      const dreGroupId = account.dreGroupId || center.dreGroupId || '';
      // Compras classificadas como CMV não entram novamente como despesa de CP:
      // o custo já é reconhecido pelo CMV dos produtos efetivamente vendidos.
      if (dreGroupId === 'DRE-CMV' || ['purchase','purchase_order'].includes(clean(payable.origin).toLowerCase()) || clean(payable.entryType).toLowerCase() === 'purchase') return;
      if (accountId && payable.accountId !== accountId) return;
      if (costCenterId && effectiveCostCenterId !== costCenterId) return;
      rows.push({
        id: `DRE-PAY-${inst.id}-${suffix}`,
        date,
        description: payable.description || `${payable.number || 'Conta a pagar'} · Parcela ${inst.number || 1}/${inst.total || 1}`,
        value,
        type: 'expense',
        operationId: clean(payable.originId),
        accountId: payable.accountId || '',
        accountName: account.name || 'Sem plano de conta',
        costCenterId: effectiveCostCenterId,
        costCenterName: center.name || 'Sem centro de custo',
        dreGroupId,
        effectiveDreGroupId: dreGroupId,
        supplierName: payable.supplierName || '',
        customerName: '',
        source,
        classificationRequired: !dreGroupId,
        fallbackClassification: false,
        includedViaOperation: false,
        payableId: payable.id,
        payableNumber: payable.number || '',
        installmentId: inst.id,
        installmentNumber: inst.number || 1,
        installmentTotal: inst.total || 1,
        installmentStatus: inst.status || '',
        dueDate: dateOnly(inst.dueDate),
        synthetic: true
      });
    };

    installments.forEach(inst => {
      const payable = payables.get(clean(inst.payableId));
      if (!payable) return;
      const installmentPayments = paymentsByInstallment.get(clean(inst.id)) || [];
      installmentPayments.forEach((payment, index) => {
        pushRow(
          inst,
          payable,
          payment.value || payment.principalValue,
          payment.paidAt || payment.createdAt,
          `PAID-${clean(payment.id) || index + 1}`,
          'payable_payment_competence'
        );
      });
      if (num(inst.openBalance) > 0) {
        pushRow(inst, payable, inst.openBalance, inst.dueDate, 'OPEN', 'payable_open_competence');
      }
    });

    return rows;
  }

  operationalRevenue({ basis, accountId, costCenterId }) {
    // No regime de competência a Receita Bruta nasce da venda/O.S. finalizada,
    // não do momento em que a parcela é recebida. Isso também evita que vendas
    // à vista desapareçam do DRE por não gerarem um entry financeiro separado.
    if (basis !== 'competence' || accountId || costCenterId) return [];
    const operations = (this.read('../commerce/operations.json').items || [])
      .filter(x => x && x.status === 'finalized' && isFinanciallyActive(x) && ['sale', 'service_order'].includes(clean(x.type)));

    return operations.map(op => ({
      id: `DRE-OP-${op.id}`,
      date: dateOnly(op.finalizedAt || op.dates?.finalizedAt || op.updatedAt || op.createdAt),
      description: `${op.type === 'service_order' ? 'O.S.' : 'Venda'} #${op.number || ''}${op.customerNameSnapshot ? ` · ${op.customerNameSnapshot}` : ''}`,
      value: Math.abs(num(op.total)),
      type: 'income',
      operationId: op.id,
      accountId: 'AUTO-OPERACOES',
      accountName: 'Vendas e O.S. (automático)',
      costCenterId: '',
      costCenterName: 'Sem centro de custo',
      dreGroupId: 'DRE-RB',
      effectiveDreGroupId: 'DRE-RB',
      supplierName: '',
      customerName: op.customerNameSnapshot || '',
      source: 'commerce_operation',
      classificationRequired: false,
      fallbackClassification: false,
      includedViaOperation: false,
      synthetic: true
    })).filter(x => x.date && x.value > 0);
  }

  operationalCost({ basis, accountId, costCenterId }) {
    if (basis !== 'competence' || accountId || costCenterId) return [];
    const operations = (this.read('../commerce/operations.json').items || [])
      .filter(x => x && x.status === 'finalized' && isFinanciallyActive(x) && ['sale', 'service_order'].includes(clean(x.type)));
    const purchases = (this.read('../purchases/purchases.json').items || [])
      .filter(x => x && x.status === 'completed' && isFinanciallyActive(x));

    const purchaseCandidates = [];
    purchases.forEach(purchase => {
      const purchaseDate = dateOnly(purchase.entryDate || purchase.issueDate || purchase.completedAt || purchase.createdAt);
      (purchase.items || []).forEach(item => {
        const unitCost = num(item.unitCost);
        if (unitCost <= 0) return;
        purchaseCandidates.push({
          date: purchaseDate,
          unitCost,
          productId: clean(item.productId),
          inventoryItemId: clean(item.inventoryItemId || item.selectionId),
          code: clean(item.productCode),
          sku: clean(item.sku),
          name: clean(item.productName || item.baseProductName).toLowerCase()
        });
      });
    });

    const fallbackCost = (item, saleDate) => {
      const productId = clean(item.productId);
      const inventoryItemId = clean(item.inventoryItemId);
      const code = clean(item.code);
      const sku = clean(item.sku);
      const name = clean(item.name).toLowerCase();
      const candidates = purchaseCandidates.filter(p => {
        if (p.date && saleDate && p.date > saleDate) return false;
        if (inventoryItemId && p.inventoryItemId === inventoryItemId) return true;
        if (productId && p.productId === productId) return true;
        if (sku && p.sku === sku) return true;
        if (code && p.code === code) return true;
        return Boolean(name && p.name === name);
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return candidates[0]?.unitCost || 0;
    };

    const rows = [];
    operations.forEach(op => {
      const saleDate = dateOnly(op.finalizedAt || op.dates?.finalizedAt || op.updatedAt || op.createdAt);
      (op.items || []).forEach((item, index) => {
        const quantity = Math.abs(num(item.quantity));
        if (!quantity) return;
        const recordedCost = num(item.unitCost);
        const unitCost = recordedCost > 0 ? recordedCost : fallbackCost(item, saleDate);
        const value = quantity * unitCost;
        if (value <= 0) return;
        rows.push({
          id: `DRE-CMV-${op.id}-${item.id || index}`,
          date: saleDate,
          description: `CMV · ${item.name || 'Produto'} · ${op.type === 'service_order' ? 'O.S.' : 'Venda'} #${op.number || ''}`,
          value,
          type: 'expense',
          operationId: op.id,
          accountId: 'AUTO-CMV',
          accountName: 'Custo dos produtos vendidos (automático)',
          costCenterId: '',
          costCenterName: 'Sem centro de custo',
          dreGroupId: 'DRE-CMV',
          effectiveDreGroupId: 'DRE-CMV',
          supplierName: '',
          customerName: op.customerNameSnapshot || '',
          source: recordedCost > 0 ? 'commerce_item_cost' : 'purchase_cost_fallback',
          classificationRequired: false,
          fallbackClassification: false,
          includedViaOperation: false,
          synthetic: true,
          unitCost,
          quantity
        });
      });
    });
    return rows.filter(x => x.date && x.value > 0);
  }

  applyFallbackClassification(items, operationalItems) {
    const representedOperations = new Set(operationalItems.map(x => x.operationId).filter(Boolean));
    return items.map(item => {
      if (item.dreGroupId) return item;

      // Recebimento vinculado a uma venda/O.S. já entra pela Receita Bruta da
      // própria operação no regime de competência. Mantemos o alerta, mas não
      // somamos novamente o recebimento para não duplicar receita.
      if (item.source === 'receivable_receipt' && item.operationId && representedOperations.has(item.operationId)) {
        return { ...item, includedViaOperation: true, effectiveDreGroupId: '' };
      }

      const fallback = item.type === 'income' ? 'DRE-OR' : item.type === 'expense' ? 'DRE-OD' : '';
      return { ...item, effectiveDreGroupId: fallback, fallbackClassification: Boolean(fallback) };
    });
  }

  buildRows(items, groups, groupId = '') {
    return groups.filter(g => !groupId || g.id === groupId).map(g => {
      const details = items.filter(x => (x.effectiveDreGroupId || x.dreGroupId) === g.id);
      const byAccount = [...new Set(details.map(x => x.accountId))].map(id => {
        const accountItems = details.filter(x => x.accountId === id);
        return {
          accountId: id,
          accountName: accountItems[0]?.accountName || 'Sem plano de conta',
          value: accountItems.reduce((sum, x) => sum + x.value, 0),
          items: accountItems.sort((a, b) => b.date.localeCompare(a.date))
        };
      }).sort((a, b) => b.value - a.value);
      const value = details.reduce((sum, x) => sum + x.value, 0);
      return { ...g, value, signedValue: g.operation === 'subtract' ? -value : value, accounts: byAccount };
    });
  }

  buildSummary(rows) {
    const totalIncome = rows.filter(x => x.operation !== 'subtract').reduce((sum, x) => sum + x.value, 0);
    const totalExpense = rows.filter(x => x.operation === 'subtract').reduce((sum, x) => sum + x.value, 0);
    const revenue = rows.find(x => x.id === 'DRE-RB')?.value || 0;
    const deductions = rows.find(x => x.id === 'DRE-DED')?.value || 0;
    const cmv = rows.find(x => x.id === 'DRE-CMV')?.value || 0;
    const netRevenue = revenue - deductions;
    const grossProfit = netRevenue - cmv;
    const result = rows.reduce((sum, x) => sum + x.signedValue, 0);
    const expenseRows = rows.filter(x => x.operation === 'subtract' && !['DRE-DED', 'DRE-CMV'].includes(x.id));
    const expenses = expenseRows.reduce((sum, x) => sum + x.value, 0);
    const expenseCount = expenseRows.reduce((sum, row) => sum + row.accounts.reduce((acc, account) => acc + account.items.length, 0), 0);
    const incomeBeforeCmv = totalIncome - deductions;
    const managementGrossProfit = incomeBeforeCmv - cmv;
    return {
      revenue,
      deductions,
      cmv,
      netRevenue,
      grossProfit: managementGrossProfit,
      totalIncome,
      incomeBeforeCmv,
      totalExpense,
      expenses,
      expenseCount,
      result,
      margin: incomeBeforeCmv ? result / incomeBeforeCmv * 100 : 0
    };
  }

  buildAnalysis(summary, rows) {
    const money = value => Math.abs(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const signedMoney = value => `${value < 0 ? '- ' : ''}${money(value)}`;
    const pct = value => `${Math.abs(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    if (!summary.totalIncome && !summary.totalExpense) {
      return 'Não há lançamentos classificados suficientes para uma análise do período selecionado.';
    }

    const expenseGroups = rows
      .filter(x => x.operation === 'subtract' && !['DRE-DED', 'DRE-CMV'].includes(x.id) && x.value > 0)
      .sort((a, b) => b.value - a.value);
    const largestExpense = expenseGroups[0];
    const revenueBase = summary.incomeBeforeCmv || summary.totalIncome || 0;
    const largestRevenueShare = largestExpense && revenueBase ? largestExpense.value / revenueBase * 100 : 0;
    const largestExpenseShare = largestExpense && summary.expenses ? largestExpense.value / summary.expenses * 100 : 0;
    const cmvShare = revenueBase ? summary.cmv / revenueBase * 100 : 0;

    if (summary.result < 0) {
      const parts = [`O período fechou com déficit de ${signedMoney(summary.result)}, com margem líquida de - ${pct(summary.margin)}.`];
      if (largestExpense) {
        parts.push(`O maior impacto está em “${largestExpense.name}”: ${money(largestExpense.value)}, equivalente a ${pct(largestRevenueShare)} das receitas e ${pct(largestExpenseShare)} das despesas após o CMV.`);
      } else if (summary.cmv > 0) {
        parts.push(`O CMV é o principal custo identificado, consumindo ${pct(cmvShare)} das receitas consideradas.`);
      }
      if (summary.expenses > summary.grossProfit && summary.grossProfit > 0) {
        parts.push(`As despesas após o CMV ultrapassaram o lucro bruto em ${money(summary.expenses - summary.grossProfit)}.`);
      }
      if (largestExpense) {
        parts.push(`Prioridade sugerida: revisar os lançamentos de “${largestExpense.name}” e verificar quais valores são recorrentes, negociáveis ou podem ser reduzidos sem afetar a operação.`);
      } else if (summary.cmv > 0) {
        parts.push('Prioridade sugerida: revisar custo de compra e margem dos produtos vendidos para identificar onde há espaço de recuperação de margem.');
      } else {
        parts.push('Prioridade sugerida: revisar as despesas do período e identificar os lançamentos que mais pressionaram o resultado.');
      }
      return parts.join(' ');
    }

    if (summary.result > 0) {
      const parts = [`O período fechou com superávit de ${money(summary.result)}, com margem líquida de ${pct(summary.margin)}.`];
      if (largestExpense) {
        parts.push(`O maior peso entre as despesas foi “${largestExpense.name}”, com ${money(largestExpense.value)} (${pct(largestRevenueShare)} das receitas).`);
      } else if (summary.cmv > 0) {
        parts.push(`O CMV consumiu ${pct(cmvShare)} das receitas consideradas.`);
      }
      if (summary.margin < 10) {
        parts.push('Apesar do resultado positivo, a margem está apertada; vale acompanhar custos e despesas com maior peso antes que pequenas variações eliminem o lucro.');
      } else if (largestExpense && largestRevenueShare >= 20) {
        parts.push(`Há resultado positivo, mas “${largestExpense.name}” merece acompanhamento por representar uma parcela relevante da receita.`);
      } else {
        parts.push('O resultado está positivo no período; a principal oportunidade é preservar a margem e acompanhar os grupos de maior peso para evitar crescimento desproporcional das despesas.');
      }
      return parts.join(' ');
    }

    return largestExpense
      ? `O período ficou no ponto de equilíbrio. O maior peso entre as despesas foi “${largestExpense.name}”, com ${money(largestExpense.value)}. Vale revisar esse grupo primeiro para criar margem positiva nos próximos períodos.`
      : 'O período ficou no ponto de equilíbrio. Pequenas mudanças em custos ou despesas podem levar o resultado para lucro ou prejuízo, então vale acompanhar os maiores componentes do DRE.';
  }

  buildTimeline(allItems, groups, end) {
    const endDate = new Date(`${end}T12:00:00`);
    const months = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const items = allItems.filter(x => (x.effectiveDreGroupId || x.dreGroupId) && monthKey(x.date) === key);
      const rows = this.buildRows(items, groups);
      months.push({ key, label, result: this.buildSummary(rows).result });
    }
    return months;
  }

  query(filters = {}) {
    const today = new Date();
    const start = dateOnly(filters.start) || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = dateOnly(filters.end) || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    const basis = clean(filters.basis) === 'cash' ? 'cash' : 'competence';
    const classification = clean(filters.classification);
    let accountId = clean(filters.accountId);
    let costCenterId = clean(filters.costCenterId);
    if (classification.startsWith('account:')) accountId = classification.slice(8);
    else if (classification.startsWith('cost:')) costCenterId = classification.slice(5);
    const groupId = clean(filters.groupId);
    const { groups, accounts, costCenters } = this.catalogs();

    const financeItems = this.normalizeEntries({ basis, accountId, costCenterId, groupId, accounts, costCenters });
    const payableItems = this.payableExpenses({ basis, accountId, costCenterId, accounts, costCenters });
    const operationalItems = this.operationalRevenue({ basis, accountId, costCenterId });
    const operationalCostItems = this.operationalCost({ basis, accountId, costCenterId });
    const normalizedFinance = this.applyFallbackClassification(financeItems, operationalItems);
    const normalizedPayables = this.applyFallbackClassification(payableItems, operationalItems);
    const allItems = [...operationalItems, ...operationalCostItems, ...normalizedPayables, ...normalizedFinance];
    const periodItems = allItems.filter(x => x.date >= start && x.date <= end);
    const unclassified = periodItems.filter(x => x.classificationRequired);
    const resultItems = periodItems.filter(x => (x.effectiveDreGroupId || x.dreGroupId));
    const rows = this.buildRows(resultItems, groups, groupId);
    const summary = this.buildSummary(rows);

    return {
      filters: { start, end, basis, accountId, costCenterId, classification: classification || (accountId ? `account:${accountId}` : costCenterId ? `cost:${costCenterId}` : ''), groupId },
      summary,
      rows,
      unclassified,
      analysis: this.buildAnalysis(summary, rows),
      timeline: this.buildTimeline(allItems, groups, end),
      generatedAt: new Date().toISOString()
    };
  }
}
