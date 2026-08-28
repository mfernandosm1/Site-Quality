import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OP_ID='OP-1787873186314-B9QOR';
const SALE_NUMBER=94;
const files={
  operations:path.join(ROOT,'data','erp','commerce','operations.json'),
  cash:path.join(ROOT,'data','erp','commerce','cash-movements.json'),
  inventory:path.join(ROOT,'data','erp','inventory','movements.json'),
  logs:path.join(ROOT,'data','kernel','logs.json')
};
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,data){const temp=`${file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,file);}
function items(data){return Array.isArray(data)?data:(Array.isArray(data?.items)?data.items:[]);}
function setItems(data,next){if(Array.isArray(data))return next;data.items=next;return data;}
function backup(){const stamp=new Date().toISOString().replace(/[:.]/g,'-');const dir=path.join(ROOT,'data','_cleanup-backups',`venda-94-${stamp}`);fs.mkdirSync(dir,{recursive:true});for(const [name,file] of Object.entries(files)){if(fs.existsSync(file))fs.copyFileSync(file,path.join(dir,`${name}.json`));}return dir;}

const operations=read(files.operations);
const op=items(operations).find(row=>String(row?.id)===OP_ID || Number(row?.number)===SALE_NUMBER);
if(!op){console.log('ℹ️ Venda #94 de teste não encontrada. Nenhuma alteração foi feita.');process.exit(0);}
const reason=String(op.reverseReason||op.notes||'').toLowerCase();
if(op.status!=='reversed' || !reason.includes('teste')){
  console.error('⛔ Segurança: a operação encontrada não está claramente marcada como venda de teste estornada. Limpeza cancelada.');
  process.exit(1);
}
const backupDir=backup();
const nextOperations=items(operations).filter(row=>String(row?.id)!==String(op.id));
write(files.operations,setItems(operations,nextOperations));

const cash=read(files.cash);const cashBefore=items(cash).length;
const cashNext=items(cash).filter(row=>String(row?.referenceId)!==String(op.id));
write(files.cash,setItems(cash,cashNext));

const inventory=read(files.inventory);const inventoryBefore=items(inventory).length;
const inventoryNext=items(inventory).filter(row=>String(row?.referenceId)!==String(op.id));
write(files.inventory,setItems(inventory,inventoryNext));

const logs=read(files.logs);const logsBefore=items(logs).length;
const logsNext=items(logs).filter(row=>!String(row?.route||'').includes(String(op.id)));
write(files.logs,setItems(logs,logsNext));

console.log(`✅ Venda de teste #${SALE_NUMBER} removida.`);
console.log(`   Operação: 1`);
console.log(`   Movimentos de caixa: ${cashBefore-cashNext.length}`);
console.log(`   Movimentos de estoque: ${inventoryBefore-inventoryNext.length}`);
console.log(`   Logs diretamente vinculados: ${logsBefore-logsNext.length}`);
console.log(`   Backup criado em: ${path.relative(ROOT,backupDir)}`);
console.log('ℹ️ O próximo número de venda não foi reduzido, evitando reutilização de numeração já emitida.');
