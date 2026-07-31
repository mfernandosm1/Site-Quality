import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const productsFile = process.argv[2];
if (!productsFile) {
  console.error('Uso: node scripts/migrate-inventory-foundation.js C:\\Site\\Site_with_content\\content\\products.json');
  process.exit(1);
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

const absolute = path.resolve(productsFile);
const backupDir = path.join(path.dirname(absolute), '..', '..', 'Backup', 'ERP_Estoque_v0.11.0');
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `products-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.copyFileSync(absolute, backupFile);

const data = JSON.parse(fs.readFileSync(absolute, 'utf8'));
data.items = Array.isArray(data.items) ? data.items : [];
let productsChanged = 0;
let variationsCreated = 0;

for (const product of data.items) {
  let changed = false;
  product.inventory = product.inventory && typeof product.inventory === 'object' ? product.inventory : {};
  if (!product.inventory.itemId) { product.inventory.itemId = `PRD-${product.id || id('LEG')}`; changed = true; }
  if (product.inventory.stockControlled === undefined) { product.inventory.stockControlled = false; changed = true; }
  if (product.inventory.allowNegative === undefined) { product.inventory.allowNegative = false; changed = true; }
  if (!product.inventory.channelAvailability) {
    product.inventory.channelAvailability = { site: { mode: 'shared', enabled: true, limit: null, physicalSafety: 0 } };
    changed = true;
  }

  const combinations = product?.variations?.combinations;
  if (Array.isArray(combinations)) {
    combinations.forEach((combo, index) => {
      if (!combo.inventoryItemId) {
        combo.inventoryItemId = `VAR-${product.id || 'LEG'}-${index + 1}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        variationsCreated++;
        changed = true;
      }
    });
  }
  if (changed) productsChanged++;
}

fs.writeFileSync(absolute, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Backup: ${backupFile}`);
console.log(`✅ Produtos preparados: ${productsChanged}`);
console.log(`✅ Identificadores de variação criados: ${variationsCreated}`);
