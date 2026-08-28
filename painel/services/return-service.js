import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone=value=>JSON.parse(JSON.stringify(value));
const clean=value=>String(value??'').trim();
const amount=value=>Math.round((Number(value)||0)*100)/100;
const qty=value=>Math.round((Number(value)||0)*1000)/1000;
const now=()=>new Date().toISOString();
const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export const RETURN_REASONS=[
  {id:'defect',name:'Defeito / problema no produto',problem:true},
  {id:'warranty',name:'Garantia',problem:true},
  {id:'damage',name:'Avaria / dano',problem:true},
  {id:'incompatibility',name:'Incompatibilidade',problem:false},
  {id:'wrong_sale',name:'Produto/modelo vendido incorretamente',problem:false},
  {id:'color_model',name:'Troca de cor / modelo',problem:false},
  {id:'changed_mind',name:'Desistência / arrependimento',problem:false},
  {id:'duplicate',name:'Compra duplicada',problem:false},
  {id:'other',name:'Outro motivo',problem:false}
];

export default class ReturnService{
  constructor({dataDir,productsFile,commerceService,inventoryService,receivablesService,walletService,customerService,purchaseService}={}){
    if(!dataDir||!productsFile||!commerceService||!inventoryService||!receivablesService||!walletService||!customerService)throw new Error('ReturnService: configuração incompleta.');
    this.dataDir=path.resolve(dataDir);this.file=path.join(this.dataDir,'returns.json');this.productsFile=path.resolve(productsFile);
    this.commerceService=commerceService;this.inventoryService=inventoryService;this.receivablesService=receivablesService;this.walletService=walletService;this.customerService=customerService;this.purchaseService=purchaseService;
    fs.mkdirSync(this.dataDir,{recursive:true});if(!fs.existsSync(this.file))this.write({version:'0.24.0',nextNumber:1,items:[]});
  }
  read(fallback={version:'0.24.0',nextNumber:1,items:[]}){try{return JSON.parse(fs.readFileSync(this.file,'utf8'));}catch(_){return clone(fallback);}}
  write(data){const temp=`${this.file}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,this.file);}
  list({q='',type='',customerId='',operationId='',from='',to=''}={}){
    const term=normalize(q);return (this.read().items||[]).filter(item=>{
      if(type&&item.type!==type)return false;if(customerId&&item.customerId!==customerId)return false;if(operationId&&item.originalOperationId!==operationId)return false;
      const day=clean(item.createdAt).slice(0,10);if(from&&day<from)return false;if(to&&day>to)return false;
      if(term&&!normalize([item.number,item.customerName,item.originalOperationNumber,item.reasonLabel,item.reason,item.notes,...(item.items||[]).flatMap(row=>[row.name,row.code,row.variationLabel,row.sourceSupplierName])].join(' ')).includes(term))return false;
      return true;
    }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  get(id){return this.list().find(item=>item.id===id||String(item.number)===String(id))||null;}
  reason(code){return RETURN_REASONS.find(item=>item.id===code)||null;}
  existingReturnedQuantities(operationId){
    const map=new Map();for(const record of this.list({operationId})){if(record.status!=='completed')continue;for(const item of record.items||[]){const key=clean(item.operationItemId);if(key)map.set(key,qty((map.get(key)||0)+Number(item.quantity||0)));}}return map;
  }
  itemFinancials(operation={}){
    const items=Array.isArray(operation.snapshot?.items)&&operation.snapshot.items.length?operation.snapshot.items:(operation.items||[]);
    const grossRows=items.map(item=>{const quantity=Math.max(.001,Number(item.quantity)||1),gross=amount(quantity*Number(item.unitPrice||0)),itemDiscount=amount(Math.min(gross,Math.max(0,Number(item.discount||0))));return {item,quantity,gross,itemDiscount,after:amount(gross-itemDiscount)};});
    const distributable=amount(grossRows.reduce((sum,row)=>sum+row.after,0));const couponDiscount=amount(operation.snapshot?.totals?.couponDiscount??operation.couponDiscount??operation.coupon?.discount??0);
    return grossRows.map((row,index)=>{const couponShare=amount(distributable>0?couponDiscount*(row.after/distributable):(index===0?couponDiscount:0));const net=amount(Math.max(0,row.after-couponShare));return {operationItemId:clean(row.item.id)||`item-${index}`,item:row.item,quantity:row.quantity,gross:row.gross,itemDiscount:row.itemDiscount,couponShare,net,unitCredit:amount(net/row.quantity)};});
  }
  operationPreview(operationId){
    const operation=this.commerceService.getOperation(operationId);if(!operation)throw new Error('Venda não encontrada.');if(operation.type!=='sale')throw new Error('Trocas/devoluções desta etapa estão disponíveis para vendas.');if(operation.status!=='finalized')throw new Error('Somente vendas finalizadas podem receber troca/devolução.');
    const returned=this.existingReturnedQuantities(operation.id);const financial=this.itemFinancials(operation);
    const rows=financial.map(row=>{const sold=qty(row.quantity),already=qty(returned.get(row.operationItemId)||0),available=qty(Math.max(0,sold-already));const item=row.item;return {operationItemId:row.operationItemId,productId:clean(item.productId),inventoryItemId:clean(item.inventoryItemId),code:clean(item.code||item.sku),name:clean(item.name)||'Item',quantitySold:sold,quantityReturned:already,quantityAvailable:available,unitCredit:row.unitCredit,stockControlled:item.stockControlled!==false};});
    return {operation,items:rows,returnable:rows.filter(row=>row.quantityAvailable>0)};
  }
  sourcePurchase(item,saleDate=''){
    if(!this.purchaseService?.list)return null;let best=null;const saleMs=saleDate?new Date(saleDate).getTime():Infinity;
    for(const purchase of this.purchaseService.list({status:'completed'})||[]){const when=new Date(purchase.issueDate||purchase.entryDate||purchase.createdAt||0).getTime();if(Number.isFinite(saleMs)&&when>saleMs)continue;for(const row of purchase.items||[]){const itemInventory=clean(item.inventoryItemId);const sameInventory=itemInventory&&clean(row.inventoryItemId)===itemInventory;const sameProduct=!itemInventory&&clean(item.productId)&&clean(row.productId)===clean(item.productId);if(!sameInventory&&!sameProduct)continue;if(!best||when>best.when)best={when,purchaseId:purchase.id,purchaseNumber:purchase.number,supplierId:purchase.supplierId,supplierName:purchase.supplierNameSnapshot||purchase.supplierName||'',unitCost:amount(row.unitCost||row.cost||row.purchasePrice)};}}
    return best;
  }
  updateProductStock(inventoryItemId,balance){
    let data;try{data=JSON.parse(fs.readFileSync(this.productsFile,'utf8'));}catch(_){return;}
    let changed=false;for(const product of data.items||[]){const combos=product?.variations?.combinations||[];const combo=combos.find(row=>clean(row.inventoryItemId)===clean(inventoryItemId));if(combo){combo.stock=balance;product.stock=qty(combos.reduce((sum,row)=>sum+Number(row.stock||0),0));changed=true;break;}if(clean(product?.inventory?.itemId)===clean(inventoryItemId)){product.stock=balance;changed=true;break;}}
    if(changed){const temp=`${this.productsFile}.tmp`;fs.writeFileSync(temp,JSON.stringify(data,null,2),'utf8');fs.renameSync(temp,this.productsFile);}
  }
  openReceivables(operation={}){
    const ids=new Set((operation.receivableIds||[]).map(String));return (this.receivablesService.list()||[]).filter(title=>(ids.has(String(title.id))||String(title.originId||'')===String(operation.id))&&['open','partial'].includes(title.status)&&Number(title.openBalance||0)>0).sort((a,b)=>String(a.issueDate||a.createdAt).localeCompare(String(b.issueDate||b.createdAt)));
  }
  create(payload={},actor='painel'){
    const type=payload.type==='exchange'?'exchange':'return';const originalOperationId=clean(payload.originalOperationId);const preview=this.operationPreview(originalOperationId);const operation=preview.operation;
    const reasonCode=clean(payload.reasonCode),reasonDef=this.reason(reasonCode);if(!reasonDef)throw new Error('Selecione o motivo da troca/devolução.');const reason=clean(payload.reason);if(reason.length<3)throw new Error('Descreva o motivo da troca/devolução.');
    let customerId=clean(payload.customerId)||clean(operation.customerId);if(!customerId)throw new Error('Vincule a troca/devolução a um cliente cadastrado para registrar o crédito.');const customer=this.customerService.getCustomer(customerId);if(!customer)throw new Error('Cliente da troca/devolução não encontrado.');
    const requested=Array.isArray(payload.items)?payload.items:[];if(!requested.length)throw new Error('Selecione pelo menos um item para devolver.');
    const availableById=new Map(preview.items.map(row=>[row.operationItemId,row]));const selected=[];
    for(const input of requested){const base=availableById.get(clean(input.operationItemId));if(!base)throw new Error('Um dos itens selecionados não pertence à venda.');const quantity=qty(input.quantity);if(quantity<=0)throw new Error(`Informe a quantidade de ${base.name}.`);if(quantity>base.quantityAvailable+.0001)throw new Error(`Quantidade de devolução maior que o disponível para ${base.name}. Disponível: ${base.quantityAvailable}.`);let disposition=['sellable','quarantine','discarded','none'].includes(clean(input.disposition))?clean(input.disposition):'sellable';if(!base.stockControlled)disposition='none';if(reasonDef.problem&&disposition==='sellable')throw new Error(`Por segurança, ${base.name} com motivo de defeito/garantia/avaria não pode voltar diretamente ao estoque vendável.`);const purchase=this.sourcePurchase(base,operation.finalizedAt||operation.dates?.finalizedAt||operation.createdAt);selected.push({...base,quantity,disposition,totalCredit:amount(base.unitCredit*quantity),sourcePurchase:purchase});}
    const totalCredit=amount(selected.reduce((sum,row)=>sum+row.totalCredit,0));if(totalCredit<=0)throw new Error('Não foi possível calcular crédito para os itens selecionados.');
    const data=this.read();const sequence=Math.max(1,Number(data.nextNumber)||1),id=`RET-${crypto.randomUUID()}`,number=`DEV-${String(sequence).padStart(6,'0')}`;
    let remaining=totalCredit;const receivableAdjustments=[];for(const title of this.openReceivables(operation)){if(remaining<=0)break;const result=this.receivablesService.applyCredit(title.id,remaining,{reason:`${type==='exchange'?'Troca':'Devolução'} ${number}: ${reason}`,referenceType:'return',referenceId:id},actor);if(result.applied>0){receivableAdjustments.push({receivableId:title.id,number:title.number,value:result.applied,balanceAfter:result.title?.openBalance||0});remaining=amount(remaining-result.applied);}}
    let walletEntry=null;if(remaining>0)walletEntry=this.walletService.create(customerId,{direction:'credit',value:remaining,type:'return_credit',reason:`Crédito da ${type==='exchange'?'troca':'devolução'} ${number} — Venda #${operation.number}`,referenceType:'return',referenceId:id},actor);
    const returnedItems=[];for(const row of selected){let inventoryMovementId='';if(row.disposition==='sellable'){const result=this.inventoryService.registrarEntrada({inventoryItemId:row.inventoryItemId,quantity:row.quantity,reason:`${type==='exchange'?'Troca':'Devolução'} ${number} — ${reason}`,reasonCode:'RETURN',classification:'return',createdBy:actor,referenceId:id});inventoryMovementId=result?.movement?.id||result?.id||'';this.updateProductStock(row.inventoryItemId,result.balance.physicalQuantity);}returnedItems.push({operationItemId:row.operationItemId,productId:row.productId,inventoryItemId:row.inventoryItemId,code:row.code,name:row.name,quantity:row.quantity,unitCredit:row.unitCredit,totalCredit:row.totalCredit,disposition:row.disposition,inventoryMovementId,sourcePurchaseId:row.sourcePurchase?.purchaseId||'',sourcePurchaseNumber:row.sourcePurchase?.purchaseNumber||'',sourceSupplierId:row.sourcePurchase?.supplierId||'',sourceSupplierName:row.sourcePurchase?.supplierName||'',sourceUnitCost:row.sourcePurchase?.unitCost||0});}
    const createdAt=now();const record={id,number,type,status:'completed',originalOperationId:operation.id,originalOperationNumber:operation.number,originalOperationDate:operation.finalizedAt||operation.dates?.finalizedAt||operation.createdAt||'',customerId,customerName:customer.name,reasonCode,reasonLabel:reasonDef.name,problemReason:reasonDef.problem===true,reason,notes:clean(payload.notes),items:returnedItems,totalCredit,financial:{receivableApplied:amount(totalCredit-remaining),walletCredit:amount(remaining),walletEntryId:walletEntry?.id||'',receivableAdjustments},createdAt,createdBy:actor,updatedAt:createdAt,updatedBy:actor};
    data.items=data.items||[];data.items.unshift(record);data.nextNumber=sequence+1;data.version='0.24.0';data.updatedAt=createdAt;this.write(data);this.commerceService.registerReturnLink(operation.id,{returnId:id,type,credit:totalCredit,reason},actor);return clone(record);
  }
}
