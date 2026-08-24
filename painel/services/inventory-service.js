import fs from 'fs';
import path from 'path';


const MOVEMENT_REASON_DEFINITIONS = Object.freeze({
  PURCHASE: Object.freeze({ classification: 'purchase', labels: ['Compra de fornecedor', 'Compra'] }),
  SALE: Object.freeze({ classification: 'sale', labels: ['Venda em balcão', 'Venda', 'Venda loja física'] }),
  GIFT: Object.freeze({ classification: 'gift', labels: ['Brinde para cliente', 'Brinde'] }),
  RETURN: Object.freeze({ classification: 'return', labels: ['Devolução de cliente', 'Devolução'] }),
  WARRANTY: Object.freeze({ classification: 'warranty', labels: ['Troca ou garantia', 'Troca / garantia', 'Garantia'] }),
  INVENTORY: Object.freeze({ classification: 'inventory', labels: ['Correção de inventário', 'Inventário', 'Ajuste pelo cadastro de produtos'] }),
  LOSS: Object.freeze({ classification: 'loss', labels: ['Perda ou avaria', 'Perda', 'Avaria'] }),
  INTERNAL: Object.freeze({ classification: 'internal', labels: ['Uso interno'] }),
  CUSTOM: Object.freeze({ classification: 'custom', labels: [] })
});

function normalizeMovementText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Inventory Service — Painel Quality ERP
 *
 * Responsável por:
 * - manter o saldo físico por item de estoque;
 * - preservar histórico imutável de movimentações;
 * - configurar estoque mínimo;
 * - criar automaticamente os arquivos necessários.
 */
export default class InventoryService {
  constructor({ dataDir } = {}) {
    if (!dataDir) {
      throw new Error('InventoryService: dataDir não informado.');
    }

    this.dataDir = path.resolve(dataDir);
    this.stockFile = path.join(this.dataDir, 'stock.json');
    this.movementsFile = path.join(this.dataDir, 'movements.json');
    this.settingsFile = path.join(this.dataDir, 'inventory-settings.json');
    this.locationsFile = path.join(this.dataDir, 'locations.json');
    this._jsonCache = new Map();

    this.ensureStorage();
  }

  ensureStorage() {
    fs.mkdirSync(this.dataDir, { recursive: true });

    this.ensureJsonFile(this.stockFile, {
      version: '0.11.9',
      items: []
    });

    this.ensureJsonFile(this.movementsFile, {
      version: '0.11.9',
      items: []
    });

    this.ensureJsonFile(this.settingsFile, {
      version: '0.11.9',
      defaultLocationId: 'loja-principal',
      defaults: {
        stockControlled: false,
        allowNegative: false,
        channelAvailability: {
          site: {
            mode: 'shared',
            enabled: true,
            limit: null,
            physicalSafety: 0
          }
        }
      },
      advancedFeatures: {
        multipleLocations: false,
        serialNumber: false,
        imei: false,
        batches: false,
        expiration: false,
        consignment: false
      }
    });

    this.ensureJsonFile(this.locationsFile, {
      version: '0.11.9',
      items: [
        {
          id: 'loja-principal',
          name: 'Loja Principal',
          active: true,
          type: 'store'
        }
      ]
    });
  }

  ensureJsonFile(file, initialData) {
    if (!fs.existsSync(file)) {
      this.writeJsonAtomic(file, initialData);
      return;
    }

    try {
      const current = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!current || typeof current !== 'object' || !Array.isArray(current.items) && file !== this.settingsFile) {
        throw new Error('Estrutura inválida.');
      }
    } catch (error) {
      const backup = `${file}.invalid-${Date.now()}.bak`;
      try {
        fs.copyFileSync(file, backup);
      } catch (_) {}
      this.writeJsonAtomic(file, initialData);
    }
  }

  readJson(file, fallback) {
    try {
      const stat=fs.statSync(file);
      const cached=this._jsonCache.get(file);
      if(cached&&cached.mtimeMs===stat.mtimeMs&&cached.size===stat.size)return cached.data;
      const data=JSON.parse(fs.readFileSync(file,'utf8'));
      this._jsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});
      return data;
    } catch (_) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  writeJsonAtomic(file, data) {
    const tempFile = `${file}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, file);
    try{const stat=fs.statSync(file);this._jsonCache.set(file,{mtimeMs:stat.mtimeMs,size:stat.size,data});}catch(_){this._jsonCache.delete(file);}
  }

  getDefaultLocationId() {
    const settings = this.readJson(this.settingsFile, {
      defaultLocationId: 'loja-principal'
    });
    return settings.defaultLocationId || 'loja-principal';
  }

  configurarItem({ inventoryItemId, minimumQuantity = 0 } = {}) {
    if (!inventoryItemId) {
      throw new Error('Item de estoque não informado.');
    }

    const stock = this.readJson(this.stockFile, {
      version: '0.11.9',
      items: []
    });

    const locationId = this.getDefaultLocationId();
    let item = stock.items.find(entry =>
      String(entry.inventoryItemId) === String(inventoryItemId) &&
      String(entry.locationId || locationId) === String(locationId)
    );

    if (!item) {
      item = {
        inventoryItemId: String(inventoryItemId),
        locationId,
        physicalQuantity: 0,
        reservedQuantity: 0,
        minimumQuantity: Math.max(0, Number(minimumQuantity) || 0),
        updatedAt: new Date().toISOString()
      };
      stock.items.push(item);
    } else {
      item.minimumQuantity = Math.max(0, Number(minimumQuantity) || 0);
      item.updatedAt = new Date().toISOString();
    }

    this.writeJsonAtomic(this.stockFile, stock);
    return this.balanceFromItem(item);
  }

  consultarSaldo({ inventoryItemId, locationId } = {}) {
    if (!inventoryItemId) {
      throw new Error('Item de estoque não informado.');
    }

    const effectiveLocationId = locationId || this.getDefaultLocationId();
    const stock = this.readJson(this.stockFile, {
      version: '0.11.9',
      items: []
    });

    const item = stock.items.find(entry =>
      String(entry.inventoryItemId) === String(inventoryItemId) &&
      String(entry.locationId || effectiveLocationId) === String(effectiveLocationId)
    );

    if (!item) {
      return {
        inventoryItemId: String(inventoryItemId),
        locationId: effectiveLocationId,
        physicalQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        minimumQuantity: 0
      };
    }

    return this.balanceFromItem(item);
  }

  consultarSaldosEmLote({ inventoryItemIds = [], locationId } = {}) {
    const ids = [...new Set((inventoryItemIds || []).filter(Boolean).map(id => String(id)))];
    const effectiveLocationId = locationId || this.getDefaultLocationId();
    const stock = this.readJson(this.stockFile, { version: '0.11.9', items: [] });
    const wanted = new Set(ids);
    const balances = new Map();

    for (const entry of stock.items || []) {
      const inventoryItemId = String(entry.inventoryItemId || '');
      const entryLocationId = String(entry.locationId || effectiveLocationId);
      if (!wanted.has(inventoryItemId) || entryLocationId !== String(effectiveLocationId)) continue;
      balances.set(inventoryItemId, this.balanceFromItem(entry));
    }

    for (const inventoryItemId of ids) {
      if (balances.has(inventoryItemId)) continue;
      balances.set(inventoryItemId, {
        inventoryItemId, locationId: effectiveLocationId,
        physicalQuantity: 0, reservedQuantity: 0, availableQuantity: 0, minimumQuantity: 0
      });
    }
    return balances;
  }

  resolveMovementReason({ reason = '', reasonCode = '', classification = '' } = {}) {
    const cleanReason = String(reason || '').trim();
    const requestedCode = String(reasonCode || '').trim().toUpperCase();
    const requestedDefinition = MOVEMENT_REASON_DEFINITIONS[requestedCode];

    if (requestedDefinition) {
      return {
        reason: cleanReason || requestedDefinition.labels[0] || 'Movimentação de estoque',
        reasonCode: requestedCode,
        classification: requestedDefinition.classification
      };
    }

    const normalizedReason = normalizeMovementText(cleanReason);
    for (const [code, definition] of Object.entries(MOVEMENT_REASON_DEFINITIONS)) {
      if (code === 'CUSTOM') continue;
      const matches = definition.labels.some(label => normalizeMovementText(label) === normalizedReason);
      if (matches) {
        return {
          reason: cleanReason,
          reasonCode: code,
          classification: definition.classification
        };
      }
    }

    const requestedClassification = String(classification || '').trim().toLowerCase();
    const allowedClassification = Object.values(MOVEMENT_REASON_DEFINITIONS)
      .some(definition => definition.classification === requestedClassification)
      ? requestedClassification
      : 'custom';

    return {
      reason: cleanReason || 'Movimentação de estoque',
      reasonCode: 'CUSTOM',
      classification: allowedClassification
    };
  }

  createMovementId(movements = []) {
    const now = new Date();
    const dateKey = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('');

    const prefix = `MOV-${dateKey}-`;
    const lastSequence = (movements || []).reduce((highest, movement) => {
      const match = String(movement?.id || '').match(new RegExp(`^${prefix}(\\d{6})$`));
      return match ? Math.max(highest, Number(match[1]) || 0) : highest;
    }, 0);

    return `${prefix}${String(lastSequence + 1).padStart(6, '0')}`;
  }

  listarMovimentacoesPorClassificacao({ classification, inventoryItemId = '', limit = 200 } = {}) {
    const target = String(classification || '').trim().toLowerCase();
    if (!target) throw new Error('Classificação da movimentação não informada.');

    const movements = this.readJson(this.movementsFile, { version: '0.11.9', items: [] });
    return (movements.items || [])
      .filter(item => {
        const matchesClassification = String(item.classification || '').toLowerCase() === target;
        const matchesItem = !inventoryItemId || String(item.inventoryItemId) === String(inventoryItemId);
        return matchesClassification && matchesItem;
      })
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, Math.max(1, Math.min(100000, Number(limit) || 200)));
  }

  ajustarEstoquesEmLote({ adjustments = [], origin = 'manual', referenceType = 'product', referenceId = '', reason = 'Ajuste de estoque', reasonCode = '', classification = '', createdBy = 'painel', allowNegative = false, locationId } = {}) {
    const list = Array.isArray(adjustments) ? adjustments : [];
    if (!list.length) return [];

    const effectiveLocationId = locationId || this.getDefaultLocationId();
    const stock = this.readJson(this.stockFile, { version: '0.11.9', items: [] });
    const movements = this.readJson(this.movementsFile, { version: '0.11.9', items: [] });
    const movementReason = this.resolveMovementReason({ reason, reasonCode, classification });
    const results = [];

    // Índices preparados uma única vez. Em inventários grandes, usar Array.find/createMovementId
    // dentro do loop fazia o custo crescer rapidamente e podia bloquear o Node durante a conclusão.
    const stockByKey = new Map();
    for (const entry of stock.items || []) {
      const entryLocationId = String(entry.locationId || effectiveLocationId);
      stockByKey.set(`${String(entry.inventoryItemId || '')}@@${entryLocationId}`, entry);
    }
    const date = new Date();
    const dateKey = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const movementPrefix = `MOV-${dateKey}-`;
    let movementSequence = (movements.items || []).reduce((highest, movement) => {
      const id = String(movement?.id || '');
      if (!id.startsWith(movementPrefix)) return highest;
      const seq = Number(id.slice(movementPrefix.length));
      return Number.isInteger(seq) ? Math.max(highest, seq) : highest;
    }, 0);

    for (const adjustment of list) {
      const inventoryItemId = adjustment?.inventoryItemId;
      const desired = Number(adjustment?.newQuantity);
      if (!inventoryItemId) throw new Error('Item de estoque não informado.');
      if (!Number.isFinite(desired)) throw new Error(`Quantidade de estoque inválida para ${inventoryItemId}.`);
      if (!allowNegative && desired < 0) throw new Error(`O estoque não pode ficar negativo para ${inventoryItemId}.`);

      const stockKey = `${String(inventoryItemId)}@@${String(effectiveLocationId)}`;
      let item = stockByKey.get(stockKey);
      if (!item) {
        item = { inventoryItemId: String(inventoryItemId), locationId: effectiveLocationId, physicalQuantity: 0, reservedQuantity: 0, minimumQuantity: 0, updatedAt: new Date().toISOString() };
        stock.items.push(item);
        stockByKey.set(stockKey, item);
      }

      const previousQuantity = Number(item.physicalQuantity) || 0;
      const difference = desired - previousQuantity;
      if (difference === 0) {
        results.push({ movement: null, balance: this.balanceFromItem(item), inventoryItemId: String(inventoryItemId) });
        continue;
      }

      item.physicalQuantity = desired;
      item.reservedQuantity = Math.max(0, Number(item.reservedQuantity) || 0);
      item.updatedAt = new Date().toISOString();
      const movement = {
        id: `${movementPrefix}${String(++movementSequence).padStart(6, '0')}`, inventoryItemId: String(inventoryItemId), locationId: effectiveLocationId,
        type: previousQuantity === 0 && desired > 0 ? 'entrada_inicial' : 'ajuste', direction: difference > 0 ? 'entrada' : 'saida',
        quantity: Math.abs(difference), signedQuantity: difference, previousPhysicalQuantity: previousQuantity, newPhysicalQuantity: desired,
        reservedQuantity: item.reservedQuantity, availableQuantity: desired - item.reservedQuantity,
        origin: adjustment.origin || origin, referenceType: adjustment.referenceType || referenceType,
        referenceId: String(adjustment.referenceId || referenceId || ''), reason: movementReason.reason, reasonCode: movementReason.reasonCode,
        classification: movementReason.classification, createdBy: String(adjustment.createdBy || createdBy || 'painel'), createdAt: new Date().toISOString()
      };
      movements.items.push(movement);
      results.push({ movement, balance: this.balanceFromItem(item), inventoryItemId: String(inventoryItemId) });
    }

    // Uma única gravação por arquivo evita centenas de leituras/escritas na conclusão de inventários grandes.
    this.writeJsonAtomic(this.movementsFile, movements);
    this.writeJsonAtomic(this.stockFile, stock);
    return results;
  }

  ajustarEstoque({
    inventoryItemId,
    newQuantity,
    origin = 'manual',
    referenceType = 'product',
    referenceId = '',
    reason = 'Ajuste de estoque',
    reasonCode = '',
    classification = '',
    createdBy = 'painel',
    allowNegative = false,
    locationId
  } = {}) {
    if (!inventoryItemId) {
      throw new Error('Item de estoque não informado.');
    }

    const desired = Number(newQuantity);
    if (!Number.isFinite(desired)) {
      throw new Error('Quantidade de estoque inválida.');
    }

    if (!allowNegative && desired < 0) {
      throw new Error('O estoque não pode ficar negativo.');
    }

    const effectiveLocationId = locationId || this.getDefaultLocationId();
    const stock = this.readJson(this.stockFile, {
      version: '0.11.9',
      items: []
    });

    let item = stock.items.find(entry =>
      String(entry.inventoryItemId) === String(inventoryItemId) &&
      String(entry.locationId || effectiveLocationId) === String(effectiveLocationId)
    );

    if (!item) {
      item = {
        inventoryItemId: String(inventoryItemId),
        locationId: effectiveLocationId,
        physicalQuantity: 0,
        reservedQuantity: 0,
        minimumQuantity: 0,
        updatedAt: new Date().toISOString()
      };
      stock.items.push(item);
    }

    const previousQuantity = Number(item.physicalQuantity) || 0;
    const difference = desired - previousQuantity;

    if (difference === 0) {
      return {
        movement: null,
        balance: this.balanceFromItem(item)
      };
    }

    item.physicalQuantity = desired;
    item.reservedQuantity = Math.max(0, Number(item.reservedQuantity) || 0);
    item.updatedAt = new Date().toISOString();

    const movements = this.readJson(this.movementsFile, {
      version: '0.11.9',
      items: []
    });
    const movementReason = this.resolveMovementReason({ reason, reasonCode, classification });

    const movement = {
      id: this.createMovementId(movements.items),
      inventoryItemId: String(inventoryItemId),
      locationId: effectiveLocationId,
      type: previousQuantity === 0 && desired > 0 ? 'entrada_inicial' : 'ajuste',
      direction: difference > 0 ? 'entrada' : 'saida',
      quantity: Math.abs(difference),
      signedQuantity: difference,
      previousPhysicalQuantity: previousQuantity,
      newPhysicalQuantity: desired,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: desired - item.reservedQuantity,
      origin,
      referenceType,
      referenceId: String(referenceId || ''),
      reason: movementReason.reason,
      reasonCode: movementReason.reasonCode,
      classification: movementReason.classification,
      createdBy: String(createdBy || 'painel'),
      createdAt: new Date().toISOString()
    };

    movements.items.push(movement);

    // Primeiro grava o histórico; depois consolida o saldo.
    this.writeJsonAtomic(this.movementsFile, movements);
    this.writeJsonAtomic(this.stockFile, stock);

    console.log(
      `📦 Movimento registrado: ${movement.type} ${difference > 0 ? '+' : ''}${difference} | ` +
      `${inventoryItemId} | saldo ${desired}`
    );

    return {
      movement,
      balance: this.balanceFromItem(item)
    };
  }

  registrarEntrada({ inventoryItemId, quantity, reason, reasonCode = '', classification = '', createdBy = 'painel', referenceId = '', allowNegative = false } = {}) {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe uma quantidade de entrada maior que zero.');
    if (!String(reason || '').trim()) throw new Error('O motivo da movimentação é obrigatório.');
    const current = this.consultarSaldo({ inventoryItemId });
    return this.ajustarEstoque({
      inventoryItemId,
      newQuantity: current.physicalQuantity + amount,
      origin: 'estoque_operacao_manual',
      referenceType: 'product',
      referenceId,
      reason: String(reason).trim(),
      reasonCode,
      classification,
      createdBy,
      allowNegative
    });
  }

  registrarSaida({ inventoryItemId, quantity, reason, reasonCode = '', classification = '', createdBy = 'painel', referenceId = '', allowNegative = false } = {}) {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe uma quantidade de saída maior que zero.');
    if (!String(reason || '').trim()) throw new Error('O motivo da movimentação é obrigatório.');
    const current = this.consultarSaldo({ inventoryItemId });
    return this.ajustarEstoque({
      inventoryItemId,
      newQuantity: current.physicalQuantity - amount,
      origin: 'estoque_operacao_manual',
      referenceType: 'product',
      referenceId,
      reason: String(reason).trim(),
      reasonCode,
      classification,
      createdBy,
      allowNegative
    });
  }

  registrarAjuste({ inventoryItemId, newQuantity, reason, reasonCode = '', classification = '', createdBy = 'painel', referenceId = '', allowNegative = false } = {}) {
    if (!String(reason || '').trim()) throw new Error('O motivo da movimentação é obrigatório.');
    return this.ajustarEstoque({
      inventoryItemId,
      newQuantity,
      origin: 'estoque_operacao_manual',
      referenceType: 'product',
      referenceId,
      reason: String(reason).trim(),
      reasonCode,
      classification,
      createdBy,
      allowNegative
    });
  }

  listarMovimentacoes({ inventoryItemId, limit = 50 } = {}) {
    if (!inventoryItemId) throw new Error('Item de estoque não informado.');
    const movements = this.readJson(this.movementsFile, { version: '0.11.9', items: [] });
    return (movements.items || [])
      .filter(item => String(item.inventoryItemId) === String(inventoryItemId))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, Math.max(1, Math.min(200, Number(limit) || 50)));
  }

  balanceFromItem(item) {
    const physicalQuantity = Number(item.physicalQuantity) || 0;
    const reservedQuantity = Math.max(0, Number(item.reservedQuantity) || 0);

    return {
      inventoryItemId: String(item.inventoryItemId),
      locationId: item.locationId || this.getDefaultLocationId(),
      physicalQuantity,
      reservedQuantity,
      availableQuantity: physicalQuantity - reservedQuantity,
      minimumQuantity: Math.max(0, Number(item.minimumQuantity) || 0),
      updatedAt: item.updatedAt || null
    };
  }
}
