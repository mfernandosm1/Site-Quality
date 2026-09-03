import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { businessDate } from '../utils/date-time.js';

const clone=v=>JSON.parse(JSON.stringify(v));
const now=()=>new Date().toISOString();
const clean=v=>String(v??'').trim();
const money=v=>Math.round((Number(v)||0)*100)/100;
const normalize=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const searchTokens=v=>normalize(v).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(Boolean);
const searchMatches=(haystack,query)=>{const q=searchTokens(query);if(!q.length)return true;const h=searchTokens(haystack);return q.every(token=>h.some(word=>token.length>=3?word.includes(token):word.startsWith(token)));};
const ncmCode=v=>{const digits=clean(v).replace(/\D/g,'').slice(0,8);return digits.length===8&&!/^0{8}$/.test(digits)?digits:'';};
const validNcmInput=v=>{const raw=clean(v);if(!raw)return true;if(!/^[0-9.\s]+$/.test(raw))return false;const digits=raw.replace(/\D/g,'');return digits.length===8&&!/^0{8}$/.test(digits);};

export default class PurchaseService {
  constructor({dataDir, productsFile, supplierService, inventoryService, payablesService, pricingService=null}) {
    if(!dataDir||!productsFile) throw new Error('PurchaseService: configuração incompleta.');
    this.dataDir=path.resolve(dataDir); this.productsFile=productsFile;
    this.supplierService=supplierService; this.inventoryService=inventoryService; this.payablesService=payablesService; this.pricingService=pricingService;
    fs.mkdirSync(this.dataDir,{recursive:true}); this.ensure();
  }
  file(name){return path.join(this.dataDir,name);}
  readFile(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return clone(fallback);}}
  writeFile(file,data){const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8');fs.renameSync(tmp,file);}
  read(name,fallback={version:'0.19.0',items:[]}){return this.readFile(this.file(name),fallback);}
  write(name,data){this.writeFile(this.file(name),data);}
  ensure(){
    for(const name of ['purchases.json','purchase-events.json','xml-product-links.json','xml-product-rejections.json']) if(!fs.existsSync(this.file(name))) this.write(name,{version:'0.19.0',items:[]});
    if(!fs.existsSync(this.file('settings.json'))) this.write('settings.json',{version:'0.19.0',costUpdateRule:'last_purchase',xmlArchitectureVersion:'nfe-4.00',permissionsReady:true});
  }
  actor(value){return clean(value)||'painel';}
  nextNumber(){const items=this.read('purchases.json').items||[];const n=items.reduce((m,i)=>Math.max(m,Number(String(i.number||'').replace(/\D/g,''))||0),0)+1;return `COM-${String(n).padStart(6,'0')}`;}
  purchaseStatusLabel(status=''){return ({draft:'Rascunho',open:'Aberta',completed:'Concluída',reversed:'Estornada'})[clean(status)]||clean(status)||'Sem status';}
  findByAccessKey(accessKey='',excludeId=''){const key=clean(accessKey).replace(/\D/g,'');if(!key)return null;return (this.read('purchases.json').items||[]).find(item=>String(item.id)!==String(excludeId||'')&&clean(item.accessKey).replace(/\D/g,'')===key)||null;}
  event(purchaseId,type,actor,details={}){const db=this.read('purchase-events.json');db.items=db.items||[];db.items.push({id:`PUE-${crypto.randomUUID()}`,purchaseId,type,actor:this.actor(actor),details,createdAt:now()});this.write('purchase-events.json',db);}
  events(id){return (this.read('purchase-events.json').items||[]).filter(x=>x.purchaseId===id).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  products(){return this.readFile(this.productsFile,{items:[]});}
  inventoryRows(){try{return this.readFile(this.inventoryService?.stockFile,{items:[]}).items||[];}catch{return [];} }
  variationLabel(combo={}){return [combo.color||combo.cor,combo.storage||combo.armazenamento,combo.ram||combo.memoriaRam,combo.condition||combo.estado].map(clean).filter(Boolean).join(' · ');}
  variationStock(product={}){const combinations=Array.isArray(product?.variations?.combinations)?product.variations.combinations:[];return combinations.reduce((sum,row)=>sum+(Number(row?.stock)||0),0);}
  hasVariationOptions(product={}){const v=product?.variations||{};return ['colors','storage','ram','condition'].some(key=>Array.isArray(v[key])&&v[key].length>0);}
  ensureInventoryForCatalogItem(catalogItem={}){
    const db=this.products();db.items=db.items||[];const product=db.items.find(row=>String(row.id)===String(catalogItem.parentProductId||catalogItem.productId||catalogItem.id));
    if(!product)throw new Error('Produto não encontrado para ativação do estoque.');
    product.inventory=product.inventory||{};product.inventory.itemId=clean(product.inventory.itemId)||`PRD-${product.id}`;product.inventory.stockControlled=true;product.inventory.allowNegative=product.inventory.allowNegative===true;
    let inventoryItemId=product.inventory.itemId;
    if(catalogItem.variationIndex!==null&&catalogItem.variationIndex!==undefined){
      const combos=Array.isArray(product?.variations?.combinations)?product.variations.combinations:[];const combo=combos[Number(catalogItem.variationIndex)];
      if(!combo)throw new Error('A variação selecionada não existe mais no cadastro.');
      combo.inventoryItemId=clean(combo.inventoryItemId)||`VAR-${product.id}-${Number(catalogItem.variationIndex)+1}`;inventoryItemId=combo.inventoryItemId;
    }
    this.writeFile(this.productsFile,db);
    if(this.inventoryService){try{this.inventoryService.configurarItem({inventoryItemId,minimumQuantity:Number(product.inventory.minimumQuantity)||0});}catch{}}
    return this.productCatalog().find(row=>row.parentProductId===String(product.id)&&row.inventoryItemId===String(inventoryItemId))||this.productCatalog().find(row=>row.parentProductId===String(product.id));
  }
  stockBalance(inventoryItemId,fallback=0,inventoryRow=null){
    let physical=Number(fallback)||0,available=physical,source='product';
    if(inventoryItemId&&inventoryRow){physical=Number(inventoryRow.physicalQuantity)||0;const reserved=Number(inventoryRow.reservedQuantity)||0;available=physical-reserved;source='inventory';}
    return {physical,available,source};
  }
  productCatalog({forceRefresh=false}={}){
    let productsStamp=0,stockStamp=0;
    try{productsStamp=fs.statSync(this.productsFile).mtimeMs||0;}catch{}
    try{stockStamp=this.inventoryService?.stockFile?(fs.statSync(this.inventoryService.stockFile).mtimeMs||0):0;}catch{}
    const cacheKey=`${productsStamp}|${stockStamp}`;
    if(!forceRefresh&&this._productCatalogCache?.key===cacheKey)return this._productCatalogCache.rows;
    const stockRows=this.inventoryRows();const stockById=new Map(stockRows.map(row=>[String(row.inventoryItemId||''),row]));const rows=[];
    for(const p of (this.products().items||[])){
      const parentId=clean(p.id);const configuredId=clean(p?.inventory?.itemId);const stockRow=stockById.get(configuredId)||stockById.get(parentId);
      const parentInventoryId=configuredId||clean(stockRow?.inventoryItemId)||parentId;const legacyStock=Number(p.stock);const isService=normalize(p?.erp?.type)==='service'||normalize(p?.erp?.category)==='servicos';const variations=isService?[]:(Array.isArray(p?.variations?.combinations)?p.variations.combinations:[]);
      const currentCost=money(p?.commercial?.costPrice ?? p.costPrice ?? p.cost);const salePrice=money(p?.commercial?.erpPrice ?? p?.commercial?.salePrice ?? p?.commercial?.cashPrice ?? p?.erp?.salePrice ?? p?.erp?.price ?? p.salePrice ?? p.precoVenda ?? p.preco_venda ?? p.price);const controlled=p?.inventory?.stockControlled!==undefined?p.inventory.stockControlled===true:(p.stockControlled===true||p.controlado===true||!!configuredId||!!stockRow);
      const parentPricing=this.pricingService?.resolveForProduct?.(p,null)||{};const common={parentProductId:parentId,code:clean(p.code||p.codigo||p?.erp?.internalCode),sku:clean(p.sku||p?.erp?.sku||p.code||p.codigo),searchAlias:clean(p?.erp?.searchAlias||p.searchAlias),barcode:clean(p.barcode||p?.erp?.barcode||p.gtin||p.ean||p.codigoBarras),ncm:ncmCode(p?.erp?.fiscal?.ncm||p?.erp?.ncm||p.ncm),reference:clean(p.reference||p.referencia||p?.erp?.supplierCode),brand:clean(p.brand||p?.erp?.brand||p.marca||p.manufacturer),model:clean(p.model||p?.erp?.model||p.modelo),stockControlled:controlled,allowNegative:p?.inventory?.allowNegative===true,currentCost,salePrice,marginPercent:currentCost>0&&salePrice>0?money(((salePrice-currentCost)/currentCost)*100):null,targetMarginPercent:parentPricing.marginPercent??null,pricingRuleSource:parentPricing.sourceLabel||'Sem regra',suggestedSalePrice:parentPricing.suggestedSalePrice??null,active:(p?.erp?.active!==undefined?p.erp.active:p.active)!==false,siteEnabled:(p?.virtualStore?.active!==undefined?p.virtualStore.active:p.active)!==false,hasVariationOptions:!isService&&this.hasVariationOptions(p),variationConfigurationPending:!isService&&this.hasVariationOptions(p)&&!variations.length};
      if(variations.length){
        for(const [index,combo] of variations.entries()){
          const inventoryItemId=clean(combo.inventoryItemId)||`VAR-${parentId}-${index+1}`;const label=this.variationLabel(combo)||`Variação ${index+1}`;const variationRow=stockById.get(inventoryItemId);const balance=this.stockBalance(inventoryItemId,combo.stock,variationRow);
          const comboSalePrice = combo.erpPrice !== undefined && combo.erpPrice !== null && combo.erpPrice !== '' && Number.isFinite(Number(combo.erpPrice)) ? money(combo.erpPrice) : salePrice;
          const rawComboCost = Number(combo.costPrice);
          const comboCost = Number.isFinite(rawComboCost) && rawComboCost > 0 ? money(rawComboCost) : currentCost;
          const comboPricing=this.pricingService?.resolveForProduct?.(p,combo)||{};rows.push({...common,currentCost:comboCost,salePrice:comboSalePrice,marginPercent:comboCost>0&&comboSalePrice>0?money(((comboSalePrice-comboCost)/comboCost)*100):null,targetMarginPercent:comboPricing.marginPercent??common.targetMarginPercent,pricingRuleSource:comboPricing.sourceLabel||common.pricingRuleSource,suggestedSalePrice:comboPricing.suggestedSalePrice??null,id:`${parentId}::${inventoryItemId}`,selectionId:`${parentId}::${inventoryItemId}`,productId:parentId,name:`${clean(p.name)||'Produto sem nome'} · ${label}`,baseName:clean(p.name)||'Produto sem nome',variationLabel:label,variationIndex:index,inventoryItemId,barcode:clean(combo.barcode)||common.barcode,reference:clean(combo.reference)||common.reference,wm10Code:combo.wm10Code||'',currentStock:balance.physical,availableStock:balance.available,stockSource:balance.source});
        }
      }else{
        const balance=this.stockBalance(parentInventoryId,Number.isFinite(legacyStock)?legacyStock:0,stockRow);
        rows.push({...common,id:parentId,selectionId:parentId,productId:parentId,name:clean(p.name)||'Produto sem nome',baseName:clean(p.name)||'Produto sem nome',variationLabel:'',variationIndex:null,inventoryItemId:parentInventoryId,currentStock:balance.physical,availableStock:balance.available,stockSource:balance.source});
      }
    }
    this._productCatalogCache={key:cacheKey,rows};
    return rows;
  }
  searchProducts(query='',options={}){const forceRefresh=options?.forceRefresh===true;const limit=Math.max(1,Math.min(500,Number(options?.limit)||120));return this.productCatalog({forceRefresh}).filter(p=>p.active&&searchMatches([p.name,p.searchAlias,p.code,p.sku,p.barcode,p.ncm,p.reference,p.brand,p.model].join(' '),query)).slice(0,limit);}
  xmlLinks(){return this.read('xml-product-links.json',{version:'0.19.3',items:[]});}
  xmlRejections(){return this.read('xml-product-rejections.json',{version:'0.19.4',items:[]});}
  xmlLinkKey(issuerDocument,supplierCode,ean,name){return [clean(issuerDocument).replace(/\D/g,''),normalize(supplierCode),clean(ean).replace(/\D/g,''),normalize(name)].join('|');}
  xmlTokens(value=''){return normalize(value).replace(/[^a-z0-9]+/g,' ').split(/\s+/).map(x=>x.trim()).filter(x=>x.length>1&&!['de','da','do','das','dos','para','com','sem','un','und','unid'].includes(x));}
  xmlSimilarity(xmlName='',product={},context={}){
    const a=this.xmlTokens(xmlName),b=this.xmlTokens([product.name,product.brand,product.model,product.code,product.sku,product.reference].filter(Boolean).join(' '));
    if(!a.length||!b.length)return 0;
    const setA=new Set(a),setB=new Set(b),frequency=context.frequency instanceof Map?context.frequency:new Map(),catalogSize=Math.max(1,Number(context.catalogSize)||1);
    const weight=token=>Math.max(1,Math.log((catalogSize+1)/((frequency.get(token)||0)+1))+1);
    let commonWeight=0,aWeight=0,bWeight=0,commonCount=0;
    for(const token of setA){const w=weight(token);aWeight+=w;if(setB.has(token)){commonWeight+=w;commonCount++;}}
    for(const token of setB)bWeight+=weight(token);
    const weightedContainment=commonWeight/Math.max(1,Math.min(aWeight,bWeight));
    const xmlCoverage=commonWeight/Math.max(1,aWeight);
    const productCoverage=commonWeight/Math.max(1,bWeight);
    const firstPair=a.length>=2&&b.length>=2&&a[0]===b[0]&&a[1]===b[1];
    const firstToken=a[0]===b[0];
    const compactA=normalize(xmlName).replace(/[^a-z0-9]/g,'');
    const identifiers=[product.code,product.sku,product.reference,product.model].map(v=>normalize(v).replace(/[^a-z0-9]/g,'')).filter(v=>v.length>=3);
    const identifierHit=identifiers.some(v=>compactA.includes(v));
    const numericA=new Set(a.filter(t=>/\d/.test(t))),numericB=new Set(b.filter(t=>/\d/.test(t)));
    const numericConflict=numericA.size&&numericB.size&&![...numericA].some(t=>numericB.has(t));
    let score=weightedContainment*.48+xmlCoverage*.18+productCoverage*.14+(firstPair?.14:firstToken?.06:0)+(identifierHit?.16:0)+(commonCount>=2?.06:0);
    if(numericConflict)score*=.55;
    return Math.min(1,score);
  }
  saveXmlLinks({issuerDocument='',items=[]}={},actor='painel'){const db=this.xmlLinks();db.items=db.items||[];const rejected=this.xmlRejections();rejected.items=rejected.items||[];const catalog=this.productCatalog();for(const row of items){const product=catalog.find(p=>p.id===clean(row.productId));if(!product)continue;const key=this.xmlLinkKey(issuerDocument,row.supplierCode,row.ean,row.name);const existing=db.items.find(x=>x.key===key);const value={key,issuerDocument:clean(issuerDocument).replace(/\D/g,''),supplierCode:clean(row.supplierCode),ean:clean(row.ean),xmlName:clean(row.name),productId:product.id,productName:product.name,updatedAt:now(),updatedBy:this.actor(actor)};if(existing)Object.assign(existing,value);else db.items.push({id:`XML-${crypto.randomUUID()}`,createdAt:now(),...value});rejected.items=rejected.items.filter(x=>!(x.key===key&&x.productId===product.id));}this.write('xml-product-links.json',db);this.write('xml-product-rejections.json',rejected);return {saved:items.length};}
  forgetXmlLink({issuerDocument='',supplierCode='',ean='',name=''}={}){const db=this.xmlLinks();db.items=db.items||[];const key=this.xmlLinkKey(issuerDocument,supplierCode,ean,name);const before=db.items.length;db.items=db.items.filter(item=>item.key!==key);const removed=before-db.items.length;if(removed)this.write('xml-product-links.json',db);return {removed};}
  rejectXmlSuggestion({issuerDocument='',supplierCode='',ean='',name='',productId=''}={}){const id=clean(productId);if(!id)throw new Error('Produto sugerido não informado.');const db=this.xmlRejections();db.items=db.items||[];const key=this.xmlLinkKey(issuerDocument,supplierCode,ean,name);if(!db.items.some(x=>x.key===key&&x.productId===id))db.items.push({id:`XMLR-${crypto.randomUUID()}`,key,productId:id,createdAt:now()});this.write('xml-product-rejections.json',db);return {rejected:true};}
  createBasicProduct(payload={}){const db=this.products();db.items=db.items||[];const name=clean(payload.name);if(!name)throw new Error('Informe o nome do produto.');const categoryId=clean(payload.categoryId);if(!categoryId)throw new Error('Selecione a categoria ERP do produto.');const ncm=ncmCode(payload.ncm);if(!validNcmInput(payload.ncm)||(clean(payload.ncm)&&!ncm))throw new Error('NCM inválido. Informe somente 8 dígitos, com pontos opcionais, por exemplo 3919.90.90.');const id=`PRD-${Date.now()}`;const slug=normalize(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const product={id,name,slug,active:false,siteEnabled:false,erp:{active:true,categoryId,category:clean(payload.categoryCode),categoryName:clean(payload.categoryName),ncm,fiscal:{ncm}},virtualStore:{name,price:money(payload.salePrice),active:false,channels:{lojaVirtual:{enabled:false},mercadoLivre:{enabled:false},shopee:{enabled:false},amazon:{enabled:false},magalu:{enabled:false}}},code:clean(payload.code||payload.supplierCode),sku:clean(payload.sku||payload.code||payload.supplierCode),barcode:clean(payload.barcode||payload.ean),ncm,price:money(payload.salePrice),stock:0,commercial:{costPrice:money(payload.unitCost),erpPrice:money(payload.salePrice),salePrice:money(payload.salePrice),cashPrice:money(payload.salePrice),installmentPrice:money(payload.salePrice)},inventory:{itemId:id,stockControlled:true,allowNegative:false,channelAvailability:{site:{mode:'disabled',enabled:false,limit:null,physicalSafety:0}}}};db.items.unshift(product);this.writeFile(this.productsFile,db);if(this.inventoryService)try{this.inventoryService.configurarItem({inventoryItemId:id,minimumQuantity:0});}catch{}return this.productCatalog().find(p=>p.id===id);}

  decodeXml(value=''){return String(value).replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16))).replace(/&#(\d+);/g,(_,num)=>String.fromCodePoint(Number(num))).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&apos;/g,"'");}
  xmlText(xml,tag){const match=String(xml||'').match(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,'i'));return match?clean(this.decodeXml(match[1].replace(/<!\[CDATA\[|\]\]>/g,''))):'';}
  xmlBlocks(xml,tag){return [...String(xml||'').matchAll(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,'gi'))].map(match=>match[1]);}
  parseXml(xml=''){
    const source=String(xml||'').trim();if(!source||!/<(?:\w+:)?NFe[\s>]/i.test(source))throw new Error('Arquivo XML de NF-e inválido ou não reconhecido.');
    const ide=this.xmlBlocks(source,'ide')[0]||'',emit=this.xmlBlocks(source,'emit')[0]||'',total=this.xmlBlocks(source,'ICMSTot')[0]||'';
    const accessKey=(source.match(/Id=["']NFe(\d{44})["']/i)||[])[1]||'';
    const duplicatedPurchase=this.findByAccessKey(accessKey);
    if(duplicatedPurchase)throw new Error(`Este XML já foi importado na compra ${duplicatedPurchase.number} (${this.purchaseStatusLabel(duplicatedPurchase.status)}). A mesma NF-e não pode ser importada novamente.`);
    const issuerDocument=this.xmlText(emit,'CNPJ')||this.xmlText(emit,'CPF');
    const supplier=this.supplierService.listSuppliers({includeInactive:true}).find(item=>clean(item.document).replace(/\D/g,'')===issuerDocument);
    const catalog=this.productCatalog(),links=this.xmlLinks().items||[],rejections=this.xmlRejections().items||[];
    const catalogById=new Map(catalog.map(p=>[String(p.id),p]));
    const barcodeIndex=new Map(),identifierIndex=new Map(),nameIndex=new Map(),tokenIndex=new Map(),tokenFrequency=new Map();
    for(const p of catalog){
      if(p.barcode)barcodeIndex.set(clean(p.barcode),p);
      for(const value of [p.code,p.sku,p.reference].filter(Boolean)){const key=normalize(value);if(key&&!identifierIndex.has(key))identifierIndex.set(key,p);}
      const exactName=normalize(p.name);if(exactName&&!nameIndex.has(exactName))nameIndex.set(exactName,p);
      const tokens=new Set(this.xmlTokens([p.name,p.brand,p.model,p.code,p.sku,p.reference].filter(Boolean).join(' ')));
      for(const token of tokens){
        tokenFrequency.set(token,(tokenFrequency.get(token)||0)+1);
        if(!tokenIndex.has(token))tokenIndex.set(token,[]);
        tokenIndex.get(token).push(p);
      }
    }
    const similarityContext={frequency:tokenFrequency,catalogSize:catalog.length};
    const items=this.xmlBlocks(source,'det').map((block,index)=>{
      const prod=this.xmlBlocks(block,'prod')[0]||block;
      const supplierCode=this.xmlText(prod,'cProd');
      const ean=[this.xmlText(prod,'cEAN'),this.xmlText(prod,'cEANTrib')].find(value=>value&&normalize(value)!=='sem gtin')||'';
      const name=this.xmlText(prod,'xProd');
      const key=this.xmlLinkKey(issuerDocument,supplierCode,ean,name);
      const saved=links.find(x=>x.key===key);
      const rejectedIds=new Set(rejections.filter(x=>x.key===key).map(x=>String(x.productId)));
      const allowed=p=>p&&!rejectedIds.has(String(p.id));
      let match=saved?catalogById.get(String(saved.productId)):null;
      let reason=match?'Vínculo aprendido anteriormente':'';
      if(!match&&ean){const candidate=barcodeIndex.get(clean(ean));if(allowed(candidate)){match=candidate;reason='EAN/código de barras';}}
      if(!match&&supplierCode){const candidate=identifierIndex.get(normalize(supplierCode));if(allowed(candidate)){match=candidate;reason='Código/Referência';}}
      if(!match){const candidate=nameIndex.get(normalize(name));if(allowed(candidate)){match=candidate;reason='Nome exato';}}
      if(!match){
        const xmlTokens=this.xmlTokens(name);
        const candidateMap=new Map();
        for(const token of xmlTokens){
          const rows=tokenIndex.get(token)||[];
          for(const p of rows)if(allowed(p))candidateMap.set(String(p.id),p);
        }
        const candidates=candidateMap.size?[...candidateMap.values()]:catalog.filter(allowed);
        const scored=candidates.map(p=>({p,score:this.xmlSimilarity(name,p,similarityContext)})).sort((a,b)=>b.score-a.score);
        const best=scored[0],second=scored[1];
        const margin=best?best.score-(second?.score||0):0;
        const commonTokens=best?this.xmlTokens(name).filter(t=>new Set(this.xmlTokens([best.p.name,best.p.brand,best.p.model,best.p.code,best.p.sku,best.p.reference].filter(Boolean).join(' '))).has(t)).length:0;
        const confident=best&&(best.score>=0.60||(best.score>=0.52&&commonTokens>=2&&margin>=0.06));
        if(confident){match=best.p;reason=`Sugestão inteligente (${Math.round(best.score*100)}%)`;}
      }
      return {index:index+1,supplierCode,ean,name,ncm:this.xmlText(prod,'NCM'),cest:this.xmlText(prod,'CEST'),cfop:this.xmlText(prod,'CFOP'),unit:this.xmlText(prod,'uCom'),quantity:Number(this.xmlText(prod,'qCom'))||0,unitCost:money(this.xmlText(prod,'vUnCom')),total:money(this.xmlText(prod,'vProd')),productId:match?.id||'',suggestedProductId:!saved&&match?.id||'',matched:!!match,defined:!!saved,matchReason:reason||'Não vinculado',linkedProduct:match?{...match}:null,taxes:{raw:block.includes('<imposto')?'present':'absent'}};
    });
    return {supplierId:supplier?.id||'',supplierMatched:!!supplier,supplier:supplier?{id:supplier.id,code:supplier.code,name:supplier.name,tradeName:supplier.tradeName||'',document:supplier.document||'',active:supplier.active!==false}:null,issuer:{document:issuerDocument,name:this.xmlText(emit,'xNome'),tradeName:this.xmlText(emit,'xFant'),stateRegistration:this.xmlText(emit,'IE'),phone:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','fone'),zipCode:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','CEP'),street:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','xLgr'),number:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','nro'),complement:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','xCpl'),district:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','xBairro'),city:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','xMun'),state:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','UF'),country:this.xmlText(this.xmlBlocks(emit,'enderEmit')[0]||'','xPais')},invoiceNumber:this.xmlText(ide,'nNF'),invoiceSeries:this.xmlText(ide,'serie'),accessKey,issueDate:(this.xmlText(ide,'dhEmi')||this.xmlText(ide,'dEmi')).slice(0,10),entryDate:(this.xmlText(ide,'dhSaiEnt')||this.xmlText(ide,'dSaiEnt')||this.xmlText(ide,'dhEmi')).slice(0,10),freight:money(this.xmlText(total,'vFrete')),discount:money(this.xmlText(total,'vDesc')),otherExpenses:money(this.xmlText(total,'vOutro')),documentTotal:money(this.xmlText(total,'vNF')),protocol:this.xmlText(this.xmlBlocks(source,'protNFe')[0]||'','nProt'),items,summary:{itemCount:items.length,matchedCount:items.filter(x=>x.productId).length,definedCount:items.filter(x=>x.defined).length,pendingCount:items.filter(x=>!x.defined).length}};
  }
  sanitizeItem(row={}){let catalog=this.productCatalog();const selectionId=clean(row.selectionId||row.catalogId||row.productId);let product=catalog.find(p=>p.id===selectionId);if(!product&&row.inventoryItemId)product=catalog.find(p=>p.parentProductId===clean(row.productId)&&p.inventoryItemId===clean(row.inventoryItemId));if(!product)product=catalog.find(p=>p.parentProductId===clean(row.productId)&&!p.variationLabel);if(!product) throw new Error(`Produto ou variação não encontrado: ${clean(row.productName)||clean(row.productId)}.`);if(!product.stockControlled||!product.inventoryItemId)product=this.ensureInventoryForCatalogItem(product);const quantity=Number(row.quantity);const unitCost=money(row.unitCost);const salePrice=money(row.salePrice ?? product.salePrice);const discount=money(row.discount);if(!Number.isFinite(quantity)||quantity<=0) throw new Error(`Quantidade inválida para ${product.name}.`);if(unitCost<0) throw new Error(`Custo inválido para ${product.name}.`);if(salePrice<0) throw new Error(`Preço de venda inválido para ${product.name}.`);return {id:clean(row.id)||`PUI-${crypto.randomUUID()}`,selectionId:product.selectionId,productId:product.parentProductId,productName:product.name,baseProductName:product.baseName,variationLabel:product.variationLabel,productCode:product.code,sku:product.sku,barcode:product.barcode,reference:product.reference,brand:product.brand,model:product.model,inventoryItemId:product.inventoryItemId,stockControlled:true,quantity,unitCost,salePrice,discount,total:money(quantity*unitCost-discount),targetMarginPercent:Number.isFinite(Number(row.targetMarginPercent))?Number(row.targetMarginPercent):(product.targetMarginPercent??null),pricingRuleSource:clean(row.pricingRuleSource||product.pricingRuleSource),fiscal:{supplierCode:clean(row?.fiscal?.supplierCode),ean:clean(row?.fiscal?.ean),ncm:clean(row?.fiscal?.ncm),cest:clean(row?.fiscal?.cest),cfop:clean(row?.fiscal?.cfop),unit:clean(row?.fiscal?.unit),taxes:row?.fiscal?.taxes&&typeof row.fiscal.taxes==='object'?row.fiscal.taxes:{}}};}
  sanitize(payload={},existing=null){const supplier=this.supplierService.getSupplier(clean(payload.supplierId));if(!supplier) throw new Error('Selecione um fornecedor válido.');const xmlSupplierDocument=clean(payload.xmlSupplierDocument).replace(/\D/g,'');if(xmlSupplierDocument&&clean(supplier.document).replace(/\D/g,'')!==xmlSupplierDocument)throw new Error('O fornecedor desta compra deve ser o mesmo emitente identificado no XML da NF-e.');const items=(Array.isArray(payload.items)?payload.items:[]).map(r=>this.sanitizeItem(r));if(!items.length) throw new Error('Adicione pelo menos um produto à compra.');const productsTotal=money(items.reduce((s,i)=>s+i.total,0));const freight=money(payload.freight),otherExpenses=money(payload.otherExpenses),discount=money(payload.discount);const total=money(productsTotal+freight+otherExpenses-discount);if(total<=0) throw new Error('O total da compra deve ser maior que zero.');return {...(existing||{}),supplierId:supplier.id,supplierName:supplier.name,supplierDocument:supplier.document||'',items,productsTotal,freight,otherExpenses,discount,total,invoiceNumber:clean(payload.invoiceNumber),invoiceSeries:clean(payload.invoiceSeries),accessKey:clean(payload.accessKey).replace(/\D/g,''),issueDate:clean(payload.issueDate),entryDate:clean(payload.entryDate)||businessDate(),notes:clean(payload.notes),...(()=>{const accountId=clean(payload.accountId);if(!accountId)return {accountId:'',costCenterId:''};const classification=this.payablesService.classificationByAccount(accountId);return {accountId:classification.accountId,costCenterId:classification.costCenterId};})(),cashboxId:clean(payload.cashboxId)||'caixa-principal',paymentPlan:Array.isArray(payload.paymentPlan)?payload.paymentPlan:[],fiscalDocument:{model:clean(payload?.fiscalDocument?.model)||'55',xmlVersion:clean(payload?.fiscalDocument?.xmlVersion)||'4.00',protocol:clean(payload?.fiscalDocument?.protocol),issuer:payload?.fiscalDocument?.issuer||null,taxes:payload?.fiscalDocument?.taxes||{},relatedDocuments:Array.isArray(payload?.fiscalDocument?.relatedDocuments)?payload.fiscalDocument.relatedDocuments:[]}};}
  list(filters={}){let items=(this.read('purchases.json').items||[]).map(x=>({...x,events:this.events(x.id)}));const q=normalize(filters.q||filters.search);if(q)items=items.filter(x=>normalize([x.number,x.supplierName,x.invoiceNumber,x.accessKey,x.createdBy,...(x.items||[]).flatMap(i=>[i.productName,i.productCode,i.sku,i.barcode,i.reference,i.brand,i.model])].join(' ')).includes(q));if(filters.status)items=items.filter(x=>x.status===filters.status);if(filters.supplierId)items=items.filter(x=>x.supplierId===filters.supplierId);if(filters.user)items=items.filter(x=>normalize(x.createdBy).includes(normalize(filters.user)));if(filters.from)items=items.filter(x=>(x.entryDate||businessDate(x.createdAt))>=filters.from);if(filters.to)items=items.filter(x=>(x.entryDate||businessDate(x.createdAt))<=filters.to);return items.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}
  get(id){const item=(this.read('purchases.json').items||[]).find(x=>x.id===id);return item?{...item,events:this.events(id),payable:item.payableId?this.payablesService.get(item.payableId):null,payments:item.payableId?this.payablesService.payments(item.payableId):[],inventoryMovements:(item.inventoryEffects||[]).map(e=>e.movement).filter(Boolean)}:null;}
  save(payload={},actor='painel'){const db=this.read('purchases.json');db.items=db.items||[];const id=clean(payload.id);let item=id?db.items.find(x=>x.id===id):null;if(item&&['completed','reversed'].includes(item.status))throw new Error('Compras concluídas ou estornadas não podem ser alteradas.');const accessKey=clean(payload.accessKey).replace(/\D/g,'');const duplicate=accessKey?db.items.find(x=>String(x.id)!==String(id||'')&&clean(x.accessKey).replace(/\D/g,'')===accessKey):null;if(duplicate)throw new Error(`Esta NF-e já está vinculada à compra ${duplicate.number} (${this.purchaseStatusLabel(duplicate.status)}).`);const created=!item;if(!item)item={id:`PUR-${crypto.randomUUID()}`,number:this.nextNumber(),status:'draft',createdAt:now(),createdBy:this.actor(actor)};Object.assign(item,this.sanitize(payload,item));item.status=['draft','open'].includes(clean(payload.status))?clean(payload.status):item.status;item.updatedAt=now();item.updatedBy=this.actor(actor);if(created)db.items.unshift(item);this.write('purchases.json',db);this.event(item.id,created?'created':'updated',actor,{status:item.status,total:item.total,itemCount:item.items.length});return this.get(item.id);}
  complete(id,actor='painel'){const db=this.read('purchases.json');const item=db.items.find(x=>x.id===id);if(!item)throw new Error('Compra não encontrada.');if(item.status==='completed')return this.get(id);if(item.status==='reversed')throw new Error('Compra estornada não pode ser concluída.');if(item.completionKey)return this.get(id);item.completionKey=`PUR-COMPLETE-${id}`;item.updatedAt=now();this.write('purchases.json',db);
    const effects=[];let payable=null;let immediatePayments=[];
    try{
      this.payablesService.validateImmediatePaymentPlan(item.paymentPlan,item.cashboxId);
      for(const row of item.items){if(!row.stockControlled||!row.inventoryItemId)continue;const result=this.inventoryService.registrarEntrada({inventoryItemId:row.inventoryItemId,quantity:row.quantity,reason:`Compra ${item.number} · ${item.supplierName}`,reasonCode:'PURCHASE',classification:'purchase',createdBy:this.actor(actor),referenceId:item.id});effects.push({itemId:row.id,productId:row.productId,inventoryItemId:row.inventoryItemId,quantity:row.quantity,movement:result.movement});}
      payable=this.payablesService.create({description:`Compra ${item.number} · ${item.supplierName}`,grossValue:item.total,supplierId:item.supplierId,documentNumber:item.invoiceNumber||item.number,origin:'purchase',originId:item.id,entryType:'purchase',issueDate:item.issueDate||item.entryDate,dueDate:item.entryDate,paymentPlan:item.paymentPlan,accountId:item.accountId,costCenterId:item.costCenterId,cashboxId:item.cashboxId,notes:`Gerado automaticamente pela compra ${item.number}.`},actor);
      immediatePayments=this.payablesService.payImmediatePlan(payable.id,{cashboxId:item.cashboxId,paidAt:item.entryDate,requestPrefix:`purchase-${item.id}`},actor);
      for (const payment of immediatePayments) {
        const expectedRows=Array.isArray(payment.payments)?payment.payments.filter(row=>Number(row.value||0)>0):[];
        const movementIds=Array.isArray(payment.cashMovementIds)?payment.cashMovementIds.filter(Boolean):[];
        if (movementIds.length<expectedRows.length) throw new Error('O pagamento imediato foi baixado, mas a saída correspondente não foi confirmada no Caixa.');
      }
      const productsDb=this.products();for(const row of item.items){const p=(productsDb.items||[]).find(x=>String(x.id)===row.productId);if(!p)continue;p.commercial=p.commercial||{};const combos=Array.isArray(p?.variations?.combinations)?p.variations.combinations:[];const combo=combos.length?combos.find(c=>String(c?.inventoryItemId||'')===String(row.inventoryItemId)):null;if(combo){combo.costPrice=money(row.unitCost);combo.erpPrice=money(row.salePrice);}else{p.commercial.costPrice=money(row.unitCost);p.commercial.erpPrice=money(row.salePrice);p.commercial.salePrice=money(row.salePrice);p.commercial.cashPrice=money(row.salePrice);p.commercial.installmentPrice=money(row.salePrice);}if(row.stockControlled&&row.inventoryItemId){if(combo){const bal=this.inventoryService.consultarSaldo({inventoryItemId:row.inventoryItemId});combo.stock=bal.physicalQuantity;p.stock=combos.reduce((sum,c)=>sum+(Number(c?.stock)||0),0);}else{const bal=this.inventoryService.consultarSaldo({inventoryItemId:row.inventoryItemId});p.stock=bal.physicalQuantity;}}if(p.variations&&combos.length){p.variations.combinationsText=combos.map(c=>[c.color,c.storage,c.ram,c.condition,c.image,c.stock,c.erpPrice,c.costPrice,c.desiredMarginPercent].map(v=>v===undefined||v===null?'':v).join('|').replace(/\|+$/,'')).join('\n');}}this.writeFile(this.productsFile,productsDb);
      item.status='completed';item.inventoryEffects=effects;item.payableId=payable.id;item.immediatePaymentIds=immediatePayments.map(p=>p.id);item.completedAt=now();item.completedBy=this.actor(actor);item.updatedAt=now();delete item.completionKey;this.write('purchases.json',db);this.event(id,'completed',actor,{payableId:payable.id,paymentIds:immediatePayments.map(p=>p.id),inventoryMovements:effects.map(e=>e.movement?.id).filter(Boolean)});return this.get(id);
    }catch(error){for(const effect of effects.reverse()){try{this.inventoryService.registrarSaida({inventoryItemId:effect.inventoryItemId,quantity:effect.quantity,reason:`Rollback da compra ${item.number}`,reasonCode:'PURCHASE',classification:'purchase',createdBy:this.actor(actor),referenceId:item.id,allowNegative:true});}catch{}}item.completionError=clean(error.message);delete item.completionKey;item.updatedAt=now();this.write('purchases.json',db);this.event(id,'completion_failed',actor,{message:error.message});throw new Error(`A compra não foi concluída e os efeitos iniciados foram revertidos: ${error.message}`);}
  }
  reconcileCompletedInventory(actor='sistema'){
    const db=this.read('purchases.json');db.items=db.items||[];const movements=this.readFile(this.inventoryService?.movementsFile,{items:[]}).items||[];let repairedPurchases=0,repairedMovements=0,changed=false;
    for(const item of db.items){
      if(item.status!=='completed')continue;item.inventoryEffects=Array.isArray(item.inventoryEffects)?item.inventoryEffects:[];let purchaseChanged=false;
      for(const row of item.items||[]){
        let catalog=this.productCatalog();let product=catalog.find(p=>p.id===clean(row.selectionId))||catalog.find(p=>p.parentProductId===clean(row.productId)&&p.inventoryItemId===clean(row.inventoryItemId))||catalog.find(p=>p.parentProductId===clean(row.productId)&&!p.variationLabel);
        if(!product)continue;if(!product.stockControlled||!product.inventoryItemId)product=this.ensureInventoryForCatalogItem(product);
        row.selectionId=product.selectionId;row.inventoryItemId=product.inventoryItemId;row.stockControlled=true;row.variationLabel=product.variationLabel||row.variationLabel||'';
        const existing=movements.find(m=>String(m.referenceId||'')===String(item.id)&&String(m.inventoryItemId||'')===String(product.inventoryItemId)&&String(m.classification||'')==='purchase'&&Number(m.signedQuantity||m.quantity)>0);
        let movement=existing;
        if(!movement){const result=this.inventoryService.registrarEntrada({inventoryItemId:product.inventoryItemId,quantity:Number(row.quantity)||0,reason:`Reconciliação da compra ${item.number} · ${item.supplierName}`,reasonCode:'PURCHASE',classification:'purchase',createdBy:this.actor(actor),referenceId:item.id});movement=result.movement;repairedMovements+=movement?1:0;}
        if(movement&&!item.inventoryEffects.some(e=>String(e.inventoryItemId)===String(product.inventoryItemId)&&String(e.itemId)===String(row.id))){item.inventoryEffects.push({itemId:row.id,productId:row.productId,inventoryItemId:product.inventoryItemId,quantity:row.quantity,movement});purchaseChanged=true;}
      }
      if(purchaseChanged){item.updatedAt=now();item.inventoryReconciledAt=now();item.inventoryReconciledBy=this.actor(actor);repairedPurchases++;changed=true;this.event(item.id,'inventory_reconciled',actor,{movements:repairedMovements});}
    }
    if(changed)this.write('purchases.json',db);return {repairedPurchases,repairedMovements};
  }

  linkedPayable(item={}){
    if(!this.payablesService)return null;
    const direct=clean(item.payableId)?this.payablesService.get(item.payableId):null;
    if(direct)return direct;
    return this.payablesService.list().find(row=>
      clean(row.originId)===clean(item.id) ||
      (normalize(row.entryType||row.origin)==='purchase' && clean(row.documentNumber)===clean(item.number))
    )||null;
  }

  reconcileReversedFinancials(actor='sistema'){
    const db=this.read('purchases.json');db.items=db.items||[];
    let repaired=0;const items=[];let changed=false;
    for(const purchase of db.items){
      if(purchase.status!=='reversed')continue;
      const payable=this.linkedPayable(purchase);
      if(!payable)continue;
      if(clean(purchase.payableId)!==clean(payable.id)){purchase.payableId=payable.id;changed=true;}
      if(!['cancelled','reversed'].includes(clean(payable.status).toLowerCase())){
        const reason=clean(purchase.reverseReason)||'Compra estornada';
        this.payablesService.reverse(payable.id,`Reconciliação do estorno da compra ${purchase.number}: ${reason}`,actor,{reversePayments:true,allowPurchaseOrigin:true});
        repaired+=1;items.push({purchaseId:purchase.id,purchaseNumber:purchase.number,payableId:payable.id,payableNumber:payable.number});
        this.event(purchase.id,'financial_reconciled',actor,{payableId:payable.id,payableNumber:payable.number});
      }
    }
    if(changed)this.write('purchases.json',db);
    return {repaired,items};
  }

  deleteOpen(id,actor='painel'){
    const db=this.read('purchases.json');db.items=db.items||[];
    const index=db.items.findIndex(x=>x.id===id);
    if(index<0)throw new Error('Compra não encontrada.');
    const item=db.items[index];
    if(!['draft','open'].includes(item.status))throw new Error('Somente compras abertas ou em rascunho podem ser excluídas.');
    const hasInventory=(Array.isArray(item.inventoryEffects)&&item.inventoryEffects.length>0)||(Array.isArray(item.reverseEffects)&&item.reverseEffects.length>0);
    const payable=this.linkedPayable(item);
    const hasPayments=Array.isArray(item.immediatePaymentIds)&&item.immediatePaymentIds.length>0;
    if(hasInventory||payable||hasPayments)throw new Error('Esta compra possui integrações vinculadas e não pode ser excluída. Conclua a conferência das integrações antes de tentar novamente.');
    db.items.splice(index,1);
    this.write('purchases.json',db);
    const eventsDb=this.read('purchase-events.json');eventsDb.items=(eventsDb.items||[]).filter(event=>event.purchaseId!==id);this.write('purchase-events.json',eventsDb);
    return {id:item.id,number:item.number};
  }

  reverse(id,reason='',actor='painel'){
    const db=this.read('purchases.json');const item=db.items.find(x=>x.id===id);
    if(!item)throw new Error('Compra não encontrada.');
    if(item.status==='reversed'){this.reconcileReversedFinancials(actor);return this.get(id);}
    if(item.status!=='completed')throw new Error('Somente compras concluídas podem ser estornadas.');
    const why=clean(reason);if(!why)throw new Error('Informe o motivo do estorno.');
    const catalog=this.productCatalog();
    const reversalPolicies=new Map();
    for(const e of item.inventoryEffects||[]){
      const product=catalog.find(row=>String(row.inventoryItemId)===String(e.inventoryItemId))||catalog.find(row=>String(row.parentProductId)===String(e.productId));
      const allowNegative=product?.allowNegative===true;
      reversalPolicies.set(String(e.inventoryItemId),allowNegative);
      const bal=this.inventoryService.consultarSaldo({inventoryItemId:e.inventoryItemId});
      if(!allowNegative&&Number(bal.physicalQuantity)<Number(e.quantity))throw new Error(`Estorno bloqueado: estoque insuficiente de ${item.items.find(i=>i.id===e.itemId)?.productName||e.productId}. Ative “Permitir vender com estoque zerado/negativo” no produto para autorizar o saldo negativo.`);
    }
    const payable=this.linkedPayable(item);
    if(payable){
      item.payableId=payable.id;
      const reversedPayable=this.payablesService.reverse(payable.id,`Estorno da compra ${item.number}: ${why}`,actor,{reversePayments:true,allowPurchaseOrigin:true});
      if(!['cancelled','reversed'].includes(clean(reversedPayable?.status).toLowerCase()))throw new Error('A compra não foi estornada porque a Conta a Pagar vinculada permaneceu ativa.');
    }
    const reverseEffects=[];
    for(const e of item.inventoryEffects||[]){const r=this.inventoryService.registrarSaida({inventoryItemId:e.inventoryItemId,quantity:e.quantity,reason:`Estorno da compra ${item.number}: ${why}`,reasonCode:'PURCHASE',classification:'purchase',createdBy:this.actor(actor),referenceId:item.id,allowNegative:reversalPolicies.get(String(e.inventoryItemId))===true});reverseEffects.push({inventoryItemId:e.inventoryItemId,quantity:e.quantity,movement:r.movement});}
    item.status='reversed';item.reverseReason=why;item.reverseEffects=reverseEffects;item.reversedAt=now();item.reversedBy=this.actor(actor);item.updatedAt=now();
    this.write('purchases.json',db);this.event(id,'reversed',actor,{reason:why,payableId:item.payableId||null});
    return this.get(id);
  }
}
