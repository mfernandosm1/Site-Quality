import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const clone=v=>JSON.parse(JSON.stringify(v));
const clean=v=>String(v??'').trim();
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
const money=v=>Math.round((Number(v)||0)*100)/100;
const now=()=>new Date().toISOString();

function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return clone(fallback);}}
function writeAtomic(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2),'utf8');fs.renameSync(tmp,file);}

export default class PricingService {
  constructor({panelDir,productsFile,categoryService}){
    if(!panelDir||!productsFile)throw new Error('PricingService: configuração incompleta.');
    this.panelDir=path.resolve(panelDir);this.productsFile=productsFile;this.categoryService=categoryService;
    this.dataDir=path.join(this.panelDir,'data','erp','pricing');
    this.rulesFile=path.join(this.dataDir,'rules.json');
    this.eventsFile=path.join(this.dataDir,'events.json');
    fs.mkdirSync(this.dataDir,{recursive:true});
    if(!fs.existsSync(this.rulesFile))writeAtomic(this.rulesFile,{version:'1.0',global:{marginPercent:null,rounding:'exact'},categories:{}});
    if(!fs.existsSync(this.eventsFile))writeAtomic(this.eventsFile,{version:'1.0',items:[]});
  }
  products(){const data=readJson(this.productsFile,{items:[]});data.items=Array.isArray(data.items)?data.items:[];return data;}
  rules(){const data=readJson(this.rulesFile,{version:'1.0',global:{marginPercent:null,rounding:'exact'},categories:{}});data.global=data.global||{marginPercent:null,rounding:'exact'};data.categories=data.categories&&typeof data.categories==='object'?data.categories:{};return data;}
  actor(value){return clean(value)||'painel';}
  event(type,actor,details={}){const db=readJson(this.eventsFile,{version:'1.0',items:[]});db.items=Array.isArray(db.items)?db.items:[];db.items.unshift({id:`PRC-${crypto.randomUUID()}`,type,actor:this.actor(actor),createdAt:now(),...details});db.items=db.items.slice(0,2000);writeAtomic(this.eventsFile,db);}
  events(limit=50){return (readJson(this.eventsFile,{items:[]}).items||[]).slice(0,Math.max(1,Number(limit)||50));}
  categoryMargin(categoryId){const raw=this.rules().categories?.[clean(categoryId)]?.marginPercent;const n=num(raw);return n!==null&&n>=0?n:null;}
  globalMargin(){const n=num(this.rules().global?.marginPercent);return n!==null&&n>=0?n:null;}
  ownProductMargin(product){const n=num(product?.commercial?.desiredMarginPercent);return n!==null&&n>=0?n:null;}
  ownVariationMargin(combo){const n=num(combo?.desiredMarginPercent);return n!==null&&n>=0?n:null;}
  resolveMargin(product,combo=null){
    const variation=this.ownVariationMargin(combo);if(variation!==null)return {marginPercent:variation,source:'variation',sourceLabel:'Variação'};
    const productMargin=this.ownProductMargin(product);if(productMargin!==null)return {marginPercent:productMargin,source:'product',sourceLabel:'Produto'};
    const categoryId=clean(product?.erp?.categoryId||product?.erp?.category);
    const category=this.categoryMargin(categoryId);if(category!==null)return {marginPercent:category,source:'category',sourceLabel:'Categoria'};
    const global=this.globalMargin();if(global!==null)return {marginPercent:global,source:'global',sourceLabel:'Regra geral'};
    return {marginPercent:null,source:'none',sourceLabel:'Sem regra'};
  }
  roundPrice(value){
    const raw=Math.max(0,Number(value)||0);const mode=clean(this.rules().global?.rounding)||'exact';
    if(mode==='up_integer')return Math.ceil(raw);
    if(mode==='ending_90'){const base=Math.floor(raw);return money(raw<=base+.90?base+.90:base+1.90);}
    if(mode==='ending_99'){const base=Math.floor(raw);return money(raw<=base+.99?base+.99:base+1.99);}
    return money(raw);
  }
  suggestedPrice(cost,marginPercent){const c=Number(cost)||0,m=Number(marginPercent);if(c<=0||!Number.isFinite(m)||m<0)return null;return this.roundPrice(c*(1+m/100));}
  resolveForProduct(product,combo=null){
    const baseCost=num(product?.commercial?.costPrice ?? product?.costPrice ?? product?.cost)??0;
    const comboCost=num(combo?.costPrice);const cost=combo&&comboCost!==null&&comboCost>=0?comboCost:baseCost;
    const baseSale=num(product?.commercial?.erpPrice ?? product?.commercial?.salePrice ?? product?.price)??0;
    const comboSale=num(combo?.erpPrice);const sale=combo&&comboSale!==null&&comboSale>=0?comboSale:baseSale;
    const rule=this.resolveMargin(product,combo);const suggested=this.suggestedPrice(cost,rule.marginPercent);
    return {...rule,cost:money(cost),salePrice:money(sale),suggestedSalePrice:suggested};
  }
  saveGlobal(payload={},actor='painel'){
    const db=this.rules();const previous=clone(db.global||{});const margin=num(payload.marginPercent);db.global={...db.global,marginPercent:margin!==null&&margin>=0?margin:null,rounding:['exact','up_integer','ending_90','ending_99'].includes(clean(payload.rounding))?clean(payload.rounding):'exact',updatedAt:now(),updatedBy:this.actor(actor)};writeAtomic(this.rulesFile,db);this.event('global_rule_updated',actor,{previous,current:db.global});return clone(db.global);
  }
  saveCategory(categoryId,marginPercent,actor='painel'){
    const id=clean(categoryId);if(!id)throw new Error('Categoria inválida.');const db=this.rules();const previous=clone(db.categories[id]||null);const margin=num(marginPercent);
    if(margin===null||margin<0||clean(marginPercent)==='')delete db.categories[id];else db.categories[id]={marginPercent:margin,updatedAt:now(),updatedBy:this.actor(actor)};
    writeAtomic(this.rulesFile,db);this.event('category_rule_updated',actor,{categoryId:id,previous,current:db.categories[id]||null});return db.categories[id]||null;
  }
  setProductMargins(productIds=[],marginPercent,actor='painel'){
    const ids=new Set((Array.isArray(productIds)?productIds:[productIds]).map(clean).filter(Boolean));if(!ids.size)throw new Error('Selecione ao menos um produto.');const db=this.products();const margin=num(marginPercent);let updated=0;
    for(const product of db.items){if(!ids.has(clean(product.id)))continue;product.commercial=product.commercial||{};const previous=product.commercial.desiredMarginPercent??null;product.commercial.desiredMarginPercent=(margin!==null&&margin>=0&&clean(marginPercent)!=='')?margin:null;product.updatedAt=now();updated++;this.event('product_margin_updated',actor,{productId:product.id,productName:product.name,previous,current:product.commercial.desiredMarginPercent});}
    if(updated)writeAtomic(this.productsFile,db);return {updated};
  }
  setVariationMargin(productId,inventoryItemId,marginPercent,actor='painel'){
    const db=this.products();const product=db.items.find(p=>clean(p.id)===clean(productId));if(!product)throw new Error('Produto não encontrado.');const combos=Array.isArray(product?.variations?.combinations)?product.variations.combinations:[];const combo=combos.find(c=>clean(c?.inventoryItemId)===clean(inventoryItemId));if(!combo)throw new Error('Variação não encontrada.');const previous=combo.desiredMarginPercent??null;const margin=num(marginPercent);combo.desiredMarginPercent=(margin!==null&&margin>=0&&clean(marginPercent)!=='')?margin:null;product.variations.combinationsText=combos.map(c=>[c.color,c.storage,c.ram,c.condition,c.image,c.stock,c.erpPrice,c.costPrice,c.desiredMarginPercent].map(v=>v===undefined||v===null?'':v).join('|').replace(/\|+$/,'')).join('\n');product.updatedAt=now();writeAtomic(this.productsFile,db);this.event('variation_margin_updated',actor,{productId:product.id,productName:product.name,inventoryItemId:clean(inventoryItemId),previous,current:combo.desiredMarginPercent});return clone(combo);
  }
  applySuggested(keys=[],actor='painel'){
    const selected=new Set((Array.isArray(keys)?keys:[keys]).map(clean).filter(Boolean));if(!selected.size)throw new Error('Selecione ao menos um preço sugerido.');const db=this.products();let updated=0;
    for(const product of db.items){
      const parentKey=`product:${product.id}`;if(selected.has(parentKey)){const q=this.resolveForProduct(product,null);if(q.suggestedSalePrice!==null){product.commercial=product.commercial||{};const previous=product.commercial.erpPrice??product.commercial.salePrice??null;product.commercial.erpPrice=q.suggestedSalePrice;product.commercial.salePrice=q.suggestedSalePrice;product.commercial.cashPrice=q.suggestedSalePrice;product.commercial.installmentPrice=q.suggestedSalePrice;updated++;this.event('suggested_price_applied',actor,{scope:'product',productId:product.id,productName:product.name,previous,current:q.suggestedSalePrice,marginPercent:q.marginPercent});}}
      const combos=Array.isArray(product?.variations?.combinations)?product.variations.combinations:[];for(const combo of combos){const key=`variation:${product.id}:${clean(combo.inventoryItemId)}`;if(!selected.has(key))continue;const q=this.resolveForProduct(product,combo);if(q.suggestedSalePrice===null)continue;const previous=combo.erpPrice??null;combo.erpPrice=q.suggestedSalePrice;updated++;this.event('suggested_price_applied',actor,{scope:'variation',productId:product.id,productName:product.name,inventoryItemId:clean(combo.inventoryItemId),previous,current:q.suggestedSalePrice,marginPercent:q.marginPercent});}
      if(combos.length&&product.variations)product.variations.combinationsText=combos.map(c=>[c.color,c.storage,c.ram,c.condition,c.image,c.stock,c.erpPrice,c.costPrice,c.desiredMarginPercent].map(v=>v===undefined||v===null?'':v).join('|').replace(/\|+$/,'')).join('\n');
    }
    if(updated)writeAtomic(this.productsFile,db);return {updated};
  }
  overview({q='',categoryId=''}={}){
    const db=this.products();const categories=this.categoryService?.list?.({includeInactive:true})||[];const categoryMap=new Map(categories.map(c=>[clean(c.id),c]));const query=clean(q).toLocaleLowerCase('pt-BR');const rows=[];
    for(const product of db.items){
      const catId=clean(product?.erp?.categoryId||product?.erp?.category);if(categoryId&&catId!==clean(categoryId))continue;const categoryName=categoryMap.get(catId)?.name||product?.erp?.categoryName||'';const hay=[product.name,product.code,product.sku,categoryName].join(' ').toLocaleLowerCase('pt-BR');if(query&&!hay.includes(query))continue;
      const parent=this.resolveForProduct(product,null);rows.push({key:`product:${product.id}`,scope:'product',productId:product.id,inventoryItemId:'',name:clean(product.name)||'Produto sem nome',variationLabel:'',categoryId:catId,categoryName,cost:parent.cost,salePrice:parent.salePrice,ownMargin:this.ownProductMargin(product),effectiveMargin:parent.marginPercent,source:parent.source,sourceLabel:parent.sourceLabel,suggestedSalePrice:parent.suggestedSalePrice,hasVariations:Array.isArray(product?.variations?.combinations)&&product.variations.combinations.length>0});
      for(const combo of (Array.isArray(product?.variations?.combinations)?product.variations.combinations:[])){
        const label=[combo.color,combo.storage,combo.ram,combo.condition].filter(Boolean).join(' · ')||'Variação';const quote=this.resolveForProduct(product,combo);rows.push({key:`variation:${product.id}:${clean(combo.inventoryItemId)}`,scope:'variation',productId:product.id,inventoryItemId:clean(combo.inventoryItemId),name:clean(product.name)||'Produto sem nome',variationLabel:label,categoryId:catId,categoryName,cost:quote.cost,salePrice:quote.salePrice,ownMargin:this.ownVariationMargin(combo),effectiveMargin:quote.marginPercent,source:quote.source,sourceLabel:quote.sourceLabel,suggestedSalePrice:quote.suggestedSalePrice,hasVariations:false});
      }
    }
    return {rules:this.rules(),categories,rows,events:this.events(30)};
  }
}
