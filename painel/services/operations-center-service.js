import fs from 'fs';
import path from 'path';

function readJson(file, fallback = { items: [] }) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return fallback; }
}

function normalize(value = '') {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function digits(value = '') { return String(value || '').replace(/\D/g, ''); }

function dateKey(value) {
  if (!value) return '';
  const raw = String(value).trim();

  // Datas sem horário já representam um dia civil e não devem sofrer conversão de fuso.
  const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) return `${isoDateOnly[1]}-${isoDateOnly[2]}-${isoDateOnly[3]}`;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\D|$)/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;

  // Timestamps ISO são convertidos para a data local do painel. Ex.: 2026-07-28T00:49Z
  // corresponde a 27/07/2026 no horário local e deve aparecer no filtro de 27/07.
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default class OperationsCenterService {
  constructor({ panelDir, commerceService, customerService } = {}) {
    if (!panelDir || !commerceService) throw new Error('OperationsCenterService: configuração incompleta.');
    this.panelDir = path.resolve(panelDir);
    this.commerce = commerceService;
    this.customers = customerService || null;
    this.inventoryMovementsFile = path.join(this.panelDir, 'data', 'erp', 'inventory', 'movements.json');
    this.cashMovementsFile = path.join(this.panelDir, 'data', 'erp', 'commerce', 'cash-movements.json');
  }

  list(filters = {}) {
    const query = normalize(filters.query);
    const queryDigits = digits(filters.query);
    const type = String(filters.type || 'all');
    const status = String(filters.status || 'all');
    const dateFrom = String(filters.dateFrom || '');
    const dateTo = String(filters.dateTo || '');
    const seller = normalize(filters.seller);
    const cashboxId = String(filters.cashboxId || 'all');
    const sort = ['number', 'customer', 'openedAt', 'total'].includes(String(filters.sort)) ? String(filters.sort) : 'openedAt';
    const direction = String(filters.direction) === 'asc' ? 'asc' : 'desc';
    const customers = new Map((this.customers?.listCustomers({ includeInactive: true }) || []).map(item => [String(item.id), item]));

    const items = this.commerce.listOperations({ status: 'all' }).filter(operation => {
      if (type !== 'all' && operation.type !== type) return false;
      if (status !== 'all' && operation.status !== status) return false;
      if (cashboxId !== 'all' && operation.cashboxId !== cashboxId) return false;
      if (seller && !normalize(operation.sellerNameSnapshot).includes(seller)) return false;

      const eventDate = dateKey(operation.dates?.openedAt || operation.createdAt);
      if (dateFrom && eventDate < dateFrom) return false;
      if (dateTo && eventDate > dateTo) return false;

      if (query) {
        const customer = customers.get(String(operation.customerId || '')) || {};
        const haystack = normalize([
          operation.number, operation.id, operation.identifier, operation.customerNameSnapshot,
          operation.sellerNameSnapshot, customer.name, customer.tradeName, customer.document,
          customer.mobile, customer.phone, ...(operation.items || []).map(item => item.name)
        ].join(' '));
        const digitHaystack = digits([operation.number, customer.document, customer.mobile, customer.phone].join(' '));
        if (!haystack.includes(query) && (!queryDigits || !digitHaystack.includes(queryDigits))) return false;
      }
      return true;
    }).map(operation => this.summary(operation, customers.get(String(operation.customerId || ''))));

    const compare = (a, b) => {
      let left;
      let right;
      if (sort === 'number') {
        left = Number(a.number || 0);
        right = Number(b.number || 0);
      } else if (sort === 'customer') {
        left = normalize(a.displayCustomer);
        right = normalize(b.displayCustomer);
      } else if (sort === 'total') {
        left = Number(a.total || 0);
        right = Number(b.total || 0);
      } else {
        left = new Date(a.dates?.openedAt || a.createdAt || 0).getTime() || 0;
        right = new Date(b.dates?.openedAt || b.createdAt || 0).getTime() || 0;
      }
      if (left < right) return direction === 'asc' ? -1 : 1;
      if (left > right) return direction === 'asc' ? 1 : -1;
      return 0;
    };

    return items.sort(compare);
  }

  summary(operation, customer = null) {
    const openSession = this.commerce.getOpenSession(operation.cashboxId);
    return {
      ...operation,
      customer: customer || null,
      displayCustomer: operation.customerNameSnapshot || customer?.name || operation.identifier || 'Consumidor final',
      displayType: operation.type === 'service_order' ? 'O.S.' : 'Venda',
      canOpenInPdv: operation.status === 'open' && Boolean(openSession),
      cashboxOpen: Boolean(openSession),
      itemCount: (operation.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    };
  }

  getDetails(id) {
    const operation = this.commerce.getOperation(String(id));
    if (!operation) return null;
    const customer = operation.customerId && this.customers ? this.customers.getCustomer(operation.customerId) : null;
    const cashMovements = readJson(this.cashMovementsFile, { items: [] }).items
      .filter(item => String(item.referenceId || '') === String(operation.id));
    const inventoryMovements = readJson(this.inventoryMovementsFile, { items: [] }).items
      .filter(item => String(item.referenceId || '') === String(operation.id));
    const cashbox = this.commerce.listCashboxes().find(item => item.id === operation.cashboxId) || null;
    return {
      ...this.summary(operation, customer),
      cashbox,
      cashMovements,
      inventoryMovements,
      timeline: [...(operation.timeline || operation.audit || [])].sort((a, b) => String(b.at).localeCompare(String(a.at)))
    };
  }
}
