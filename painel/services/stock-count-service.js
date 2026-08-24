import fs from 'fs';
import path from 'path';

function clone(v){return JSON.parse(JSON.stringify(v));}
function now(){return new Date().toISOString();}
function clean(v=''){return String(v ?? '').trim();}

export default class StockCountService {
  constructor({ dataDir, inventoryService } = {}) {
    if (!dataDir) throw new Error('StockCountService: dataDir não informado.');
    if (!inventoryService) throw new Error('StockCountService: inventoryService não informado.');
    this.dataDir=path.resolve(dataDir); this.inventoryService=inventoryService;
    this.file=path.join(this.dataDir,'counts.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.file)) this.write({version:'0.27.0',items:[]});
  }
  read(){try{const d=JSON.parse(fs.readFileSync(this.file,'utf8')); return d&&Array.isArray(d.items)?d:{version:'0.27.0',items:[]};}catch{return {version:'0.27.0',items:[]};}}
  write(data){const tmp=`${this.file}.tmp`; fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8'); fs.renameSync(tmp,this.file);}
  nextId(items=[]){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const pick=t=>parts.find(p=>p.type===t)?.value||'';const day=`${pick('year')}${pick('month')}${pick('day')}`; const prefix=`CNT-${day}-`; let n=0; for(const item of items){const m=clean(item.id).match(new RegExp(`^${prefix}(\\d{4})$`)); if(m)n=Math.max(n,Number(m[1])||0);} return `${prefix}${String(n+1).padStart(4,'0')}`;}
  event(count,type,actor,metadata={}){count.events=count.events||[];count.events.push({id:`EVT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type,actor:clean(actor)||'painel',createdAt:now(),metadata});}
  list(){return this.read().items.sort((a,b)=>clean(b.startedAt).localeCompare(clean(a.startedAt))).map(c=>this.summary(c));}
  summary(c={}){const items=Array.isArray(c.items)?c.items:[];return {...clone(c),items:undefined,events:undefined,itemCount:items.length,countedUnits:items.reduce((s,i)=>s+(Number(i.countedQuantity)||0),0),divergenceCount:Number(c.divergenceCount)||0};}
  get(id){const c=this.read().items.find(x=>clean(x.id)===clean(id));return c?clone(c):null;}
  getActiveBlockingCount(){const c=this.read().items.find(x=>x.status==='in_progress'&&x.blockPdv===true);return c?this.summary(c):null;}
  create({type='partial',blockPdv=false,notes='',createdBy='painel',locationId='',snapshotItems=[]}={}){
    const db=this.read(); const normalizedType=type==='total'?'total':'partial';
    if(blockPdv&&db.items.some(x=>x.status==='in_progress'&&x.blockPdv===true)) throw new Error('Já existe uma contagem em andamento bloqueando o PDV.');
    const id=this.nextId(db.items); const startedAt=now();
    const count={id,type:normalizedType,status:'in_progress',blockPdv:blockPdv===true,notes:clean(notes),locationId:clean(locationId)||this.inventoryService.getDefaultLocationId(),startedAt,createdAt:startedAt,createdBy:clean(createdBy)||'painel',updatedAt:startedAt,items:[],snapshot:normalizedType==='total'?(snapshotItems||[]).map(x=>({inventoryItemId:clean(x.inventoryItemId),productId:clean(x.productId),name:clean(x.name),quantity:Number(x.quantity)||0})).filter(x=>x.inventoryItemId):[],events:[]};
    this.event(count,'created',createdBy,{type:count.type,blockPdv:count.blockPdv,snapshotSize:count.snapshot.length}); db.items.unshift(count); this.write(db); return clone(count);
  }
  saveItem(id,{product,delta=null,quantity=null,actor='painel'}={}){
    const db=this.read();const count=db.items.find(x=>clean(x.id)===clean(id));if(!count)throw new Error('Contagem não encontrada.');if(count.status!=='in_progress')throw new Error('Esta contagem não está mais aberta para lançamentos.');
    const inventoryItemId=clean(product?.inventoryItemId);if(!inventoryItemId)throw new Error('Item de estoque inválido.');
    let item=(count.items||[]).find(x=>clean(x.inventoryItemId)===inventoryItemId);const stamp=now();
    if(!item){const startBalance=this.inventoryService.consultarSaldo({inventoryItemId});item={inventoryItemId,productId:clean(product?.productId),selectionId:clean(product?.selectionId||product?.id),name:clean(product?.name)||'Produto',code:clean(product?.code),sku:clean(product?.sku),barcode:clean(product?.barcode),variationLabel:clean(product?.variationLabel),systemQuantityAtCount:Number(startBalance?.physicalQuantity)||0,countedQuantity:0,firstCountedAt:stamp,lastCountedAt:stamp};count.items.push(item);}
    let next=quantity!==null&&quantity!==undefined?Number(quantity):(Number(item.countedQuantity)||0)+Number(delta??1);if(!Number.isInteger(next)||next<0)throw new Error('A quantidade contada deve ser um número inteiro igual ou maior que zero.');
    item.countedQuantity=next;item.lastCountedAt=stamp;count.updatedAt=stamp;this.event(count,'item_counted',actor,{inventoryItemId,quantity:next});this.write(db);return clone(item);
  }
  removeItem(id,inventoryItemId,actor='painel'){const db=this.read();const c=db.items.find(x=>clean(x.id)===clean(id));if(!c)throw new Error('Contagem não encontrada.');if(c.status!=='in_progress')throw new Error('Esta contagem não está mais aberta.');const before=c.items.length;c.items=c.items.filter(x=>clean(x.inventoryItemId)!==clean(inventoryItemId));if(c.items.length===before)throw new Error('Item não encontrado na contagem.');c.updatedAt=now();this.event(c,'item_removed',actor,{inventoryItemId});this.write(db);return clone(c);}
  conference(id){
    const c=this.get(id);if(!c)throw new Error('Contagem não encontrada.');
    const movements=this.inventoryService.readJson(this.inventoryService.movementsFile,{items:[]}).items||[];
    const counted=new Set((c.items||[]).map(x=>clean(x.inventoryItemId)));
    const ids=[...(c.items||[]).map(x=>x.inventoryItemId),...(c.type==='total'?(c.snapshot||[]).map(x=>x.inventoryItemId):[])];
    const balances=this.inventoryService.consultarSaldosEmLote({inventoryItemIds:ids});

    // Agrupa movimentos uma única vez. Antes cada item contado varria o histórico completo,
    // o que podia congelar a finalização conforme o histórico crescia.
    const movementsByItem=new Map();
    for(const movement of movements){
      const itemId=clean(movement.inventoryItemId);if(!itemId)continue;
      if(!movementsByItem.has(itemId))movementsByItem.set(itemId,[]);
      movementsByItem.get(itemId).push(movement);
    }
    const rows=(c.items||[]).map(item=>{
      const balance=balances.get(String(item.inventoryItemId))||{physicalQuantity:0};
      const itemMovements=movementsByItem.get(clean(item.inventoryItemId))||[];
      let deltaAfter=0;
      for(const m of itemMovements){
        if(clean(m.createdAt)<=clean(item.lastCountedAt))continue;
        if(clean(m.referenceType)==='inventory_count'&&clean(m.referenceId)===clean(c.id))continue;
        deltaAfter+=Number(m.signedQuantity)||0;
      }
      const target=(Number(item.countedQuantity)||0)+deltaAfter;const current=Number(balance.physicalQuantity)||0;
      return {...item,systemQuantityAtCount:Number(item.systemQuantityAtCount ?? current)||0,systemQuantity:current,movementsAfterCount:deltaAfter,targetQuantity:target,difference:target-current};
    });
    const uncounted=c.type==='total'?(c.snapshot||[]).filter(x=>!counted.has(clean(x.inventoryItemId))).map(x=>({...x,currentQuantity:Number((balances.get(String(x.inventoryItemId))||{}).physicalQuantity)||0})):[];
    return {count:c,rows,uncounted,summary:{counted:rows.length,matched:rows.filter(x=>x.difference===0).length,shortage:rows.filter(x=>x.difference<0).length,surplus:rows.filter(x=>x.difference>0).length,divergences:rows.filter(x=>x.difference!==0).length,uncounted:uncounted.length}};
  }
  complete(id,{actor='painel',confirmUncountedAsZero=false,applyAdjustment,applyAdjustments}={}){
    if(typeof applyAdjustment!=='function'&&typeof applyAdjustments!=='function')throw new Error('Função de aplicação de ajuste não informada.');
    const db=this.read();const count=db.items.find(x=>clean(x.id)===clean(id));if(!count)throw new Error('Contagem não encontrada.');if(count.status!=='in_progress')throw new Error('Esta contagem já foi encerrada.');
    const conf=this.conference(id);if(count.type==='total'&&conf.uncounted.length&&!confirmUncountedAsZero){const e=new Error(`${conf.uncounted.length} produto(s) da contagem total ainda não foram contados. Revise ou confirme que devem ficar com saldo zero.`);e.code='UNCOUNTED_TOTAL_ITEMS';e.uncounted=conf.uncounted.length;throw e;}

    const plans=[];
    for(const row of conf.rows){if(row.difference!==0)plans.push({inventoryItemId:row.inventoryItemId,newQuantity:row.targetQuantity,countId:count.id,productId:row.productId,code:row.code,sku:row.sku,barcode:row.barcode,name:row.name});}
    if(count.type==='total'&&confirmUncountedAsZero){for(const row of conf.uncounted){if((Number(row.currentQuantity)||0)!==0)plans.push({inventoryItemId:row.inventoryItemId,newQuantity:0,countId:count.id,productId:row.productId,name:row.name});}}

    // Backup de segurança da própria contagem antes de qualquer alteração de estoque.
    const backupDir=path.join(this.dataDir,'backups');fs.mkdirSync(backupDir,{recursive:true});
    const backupFile=path.join(backupDir,`${clean(count.id)}-pre-complete-${Date.now()}.json`);
    fs.writeFileSync(backupFile,JSON.stringify({createdAt:now(),count:clone(count),conference:conf},null,2),'utf8');

    const adjustments=typeof applyAdjustments==='function'?applyAdjustments(plans):(plans.map(plan=>applyAdjustment(plan)));
    count.status='completed';count.completedAt=now();count.completedBy=clean(actor)||'painel';count.updatedAt=count.completedAt;
    count.divergenceCount=conf.summary.divergences+(count.type==='total'&&confirmUncountedAsZero?conf.uncounted.filter(x=>Number(x.currentQuantity)!==0).length:0);
    count.adjustmentMovementIds=(adjustments||[]).map(x=>x?.movement?.id).filter(Boolean);count.completionBackup=path.basename(backupFile);
    this.event(count,'completed',actor,{adjustments:count.adjustmentMovementIds.length,confirmedUncountedAsZero:!!confirmUncountedAsZero});this.write(db);return clone(count);
  }
  cancel(id,{actor='painel',reason=''}={}){const db=this.read();const c=db.items.find(x=>clean(x.id)===clean(id));if(!c)throw new Error('Contagem não encontrada.');if(c.status!=='in_progress')throw new Error('Somente contagens em andamento podem ser canceladas.');if(!clean(reason))throw new Error('Informe o motivo do cancelamento.');c.status='cancelled';c.cancelledAt=now();c.cancelledBy=clean(actor)||'painel';c.cancelReason=clean(reason);c.updatedAt=c.cancelledAt;this.event(c,'cancelled',actor,{reason:c.cancelReason});this.write(db);return clone(c);}
}
