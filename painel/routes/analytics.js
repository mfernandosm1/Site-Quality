import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Quality Analytics V8.4 - Dashboard profissional
// Fonte híbrida:
// - /analytics/track local continua gravando em content/analytics.json
// - painel tenta ler Google Sheets primeiro
// - fallback automático para analytics.json
const SHEETS_READ_ENABLED = true;
const SHEETS_ENDPOINT = process.env.QUALITY_ANALYTICS_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbwZQ01q5u5lRqE3Hk-nMutkTWcLA8r7127sO3Dt132Ti8L0Ci7DWoOyby5v92T_WY34/exec';
const SHEETS_KEY = process.env.QUALITY_ANALYTICS_KEY || 'quality-analytics-v1';
const panelDataCache = { data:null, at:0, loading:null };
const PANEL_CACHE_TTL = 2 * 60 * 1000;

function P(app){ return app.locals.paths; }
function filePath(app){ return path.join(P(app).CONTENT_DIR, 'analytics.json'); }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function now(){ return new Date().toISOString(); }
function safeText(v, max=180){ return String(v ?? '').replace(/[<>]/g,'').trim().slice(0,max); }
function keyOf(v, fallback='sem-identificacao'){
  const raw = safeText(v, 120).toLowerCase();
  const slug = raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return slug || fallback;
}
function emptyData(){
  return {
    version: '8.4.0-analytics-professional',
    createdAt: now(),
    updatedAt: now(),
    source: 'local-json',
    counters: {
      product_view: 0,
      favorite: 0,
      favorite_click: 0,
      whatsapp_click: 0,
      category_view: 0,
      share_click: 0,
      search: 0,
      page_view: 0
    },
    products: {},
    categories: {},
    searches: {},
    pages: {},
    devices: {},
    referrers: {},
    events: []
  };
}
function readData(app){
  try {
    const fp = filePath(app);
    if(!fs.existsSync(fp)) return emptyData();
    const parsed = JSON.parse(fs.readFileSync(fp,'utf-8'));
    return { ...emptyData(), ...parsed, source: parsed.source || 'local-json', counters: { ...emptyData().counters, ...(parsed.counters||{}) } };
  } catch { return emptyData(); }
}
function writeData(app, data){
  const fp = filePath(app);
  ensureDir(path.dirname(fp));
  data.updatedAt = now();
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}
function parseDate(value){
  if(!value) return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const raw = String(value).trim();
  const direct = new Date(raw);
  if(!Number.isNaN(direct.getTime())) return direct;

  // Aceita formatos do Google Sheets em pt-BR: 07/07/2026 20:42:10
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if(m){
    const [,dd,mm,yyyy,hh='0',mi='0',ss='0'] = m;
    const d = new Date(Number(yyyy), Number(mm)-1, Number(dd), Number(hh), Number(mi), Number(ss));
    if(!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
function eventDate(event){
  return parseDate(event.at) || parseDate(event.Data) || null;
}
function startForPeriod(period){
  const d = new Date();
  d.setHours(0,0,0,0);
  if(period === 'today') return d;
  if(period === '7d'){
    d.setDate(d.getDate() - 6);
    return d;
  }
  if(period === '30d'){
    d.setDate(d.getDate() - 29);
    return d;
  }
  return null;
}
function filterEvents(events=[], period='all'){
  const start = startForPeriod(period);
  if(!start) return events;
  return events.filter(ev => {
    const d = eventDate(ev);
    return d && d >= start;
  });
}
function dayLabel(dateValue){
  const d = parseDate(dateValue);
  if(!d) return 'Sem data';
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0');
}
function hourMinute(dateValue){
  const d = parseDate(dateValue);
  if(!d) return '';
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function referrerSource(url=''){
  const v = String(url || '').toLowerCase();
  if(!v) return 'Direto';
  if(v.includes('google.')) return 'Google';
  if(v.includes('instagram.')) return 'Instagram';
  if(v.includes('facebook.') || v.includes('fb.')) return 'Facebook';
  if(v.includes('whatsapp') || v.includes('wa.me')) return 'WhatsApp';
  if(v.includes('qualitycel.com.br')) return 'Site Quality';
  if(v.includes('localhost')) return 'Localhost';
  try {
    const host = new URL(v).hostname.replace(/^www\./,'');
    return host || 'Outro';
  } catch {
    return 'Outro';
  }
}
function normalizeRow(row){
  const productObj = (row && typeof row.product === 'object') ? row.product : {};
  const categoryObj = (row && typeof row.category === 'object') ? row.category : {};
  return {
    at: row.Data || row.data || row.At || row.at || '',
    type: safeText(row.Evento || row.evento || row.type || '', 40),
    productName: safeText(row.Produto || row.produto || productObj.name || row.productName || '', 140),
    productSlug: safeText(row.SlugProduto || row.slugProduto || productObj.slug || row.productSlug || row.slug || '', 120),
    categoryName: safeText(row.Categoria || row.categoria || categoryObj.name || row.categoryName || '', 100),
    term: safeText(row.Busca || row.busca || row.term || row.query || '', 100).toLowerCase(),
    url: safeText(row.Pagina || row.pagina || row.url || '', 300),
    device: safeText(row.Dispositivo || row.dispositivo || row.device || '', 80),
    referrer: safeText(row.Origem || row.origem || row.referrer || '', 300),
    language: safeText(row.Idioma || row.idioma || row.language || '', 40),
    viewport: safeText(row.Viewport || row.viewport || '', 40)
  };
}
function dataFromEvents(events=[], source='google-sheets'){
  const data = emptyData();
  data.source = source;
  data.createdAt = now();
  data.updatedAt = now();

  for(const ev of events){
    const r = normalizeRow(ev || {});
    if(!r.type) continue;

    data.counters[r.type] = Number(data.counters[r.type] || 0) + 1;

    if(r.device){
      const deviceKey = keyOf(r.device, 'sem-dispositivo');
      data.devices[deviceKey] = data.devices[deviceKey] || { name: r.device, total: 0 };
      data.devices[deviceKey].total += 1;
    }

    const src = referrerSource(r.referrer);
    data.referrers[src] = data.referrers[src] || { name: src, total: 0 };
    data.referrers[src].total += 1;

    if(r.url){
      const pageKey = r.url.split('#')[0];
      data.pages[pageKey] = data.pages[pageKey] || { url: pageKey, views: 0, lastAt: null };
      data.pages[pageKey].views += 1;
      data.pages[pageKey].lastAt = r.at || now();
    }

    if(r.type === 'product_view' || r.type === 'favorite' || r.type === 'whatsapp_click' || r.type === 'share_click'){
      const slug = keyOf(r.productSlug || r.productName || r.url, 'produto');
      const p = data.products[slug] = data.products[slug] || { slug, name: '', image: '', url: '', views:0, favorites:0, whatsapp:0, shares:0, lastAt:null };
      p.name = r.productName || p.name || slug;
      p.url = r.url || p.url;
      if(r.type === 'product_view') p.views += 1;
      if(r.type === 'favorite') p.favorites += 1;
      if(r.type === 'whatsapp_click') p.whatsapp += 1;
      if(r.type === 'share_click') p.shares += 1;
      p.lastAt = r.at || now();
    }

    if(r.type === 'category_view'){
      const slug = keyOf(r.categoryName || r.productSlug || r.url, 'categoria');
      const c = data.categories[slug] = data.categories[slug] || { slug, name:'', url:'', views:0, lastAt:null };
      c.name = r.categoryName || c.name || slug;
      c.url = r.url || c.url;
      c.views += 1;
      c.lastAt = r.at || now();
    }

    if(r.type === 'search' && r.term){
      const s = data.searches[r.term] = data.searches[r.term] || { term: r.term, total:0, lastAt:null };
      s.total += 1;
      s.lastAt = r.at || now();
    }

    data.events.push({
      at: r.at || now(),
      type: r.type,
      url: r.url,
      referrer: r.referrer,
      sourceName: src,
      device: r.device,
      viewport: r.viewport,
      language: r.language,
      product: r.productName || r.productSlug ? { slug: r.productSlug, name: r.productName } : undefined,
      category: r.categoryName ? { slug: keyOf(r.categoryName, 'categoria'), name: r.categoryName } : undefined,
      term: r.term
    });
  }

  data.events = data.events.slice(-5000);
  return data;
}
function dataFromSheetRows(rows=[]){
  return dataFromEvents(rows, 'google-sheets');
}
async function readSheetsRows(){
  if(!SHEETS_READ_ENABLED || !SHEETS_ENDPOINT) return null;
  const url = SHEETS_ENDPOINT + (SHEETS_ENDPOINT.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(SHEETS_KEY);
  const response = await fetch(url, { method:'GET', cache:'no-store' });
  if(!response.ok) throw new Error('Falha ao ler Google Sheets: HTTP ' + response.status);
  const payload = await response.json();
  if(!payload.success) throw new Error(payload.message || payload.error || 'Google Sheets retornou erro.');
  return payload.rows || [];
}
async function readSheetsData(){
  const rows = await readSheetsRows();
  if(!rows) return null;
  return dataFromSheetRows(rows);
}
async function resetSheets(){
  if(!SHEETS_ENDPOINT) throw new Error('Endpoint do Google Sheets não configurado.');
  const response = await fetch(SHEETS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ key: SHEETS_KEY, action: 'reset' })
  });
  if(!response.ok) throw new Error('Falha ao zerar Google Sheets: HTTP ' + response.status);
  const payload = await response.json();
  if(!payload.success) throw new Error(payload.message || payload.error || 'Google Sheets retornou erro ao zerar.');
  return payload;
}
async function refreshPanelData(app){
  if(panelDataCache.loading)return panelDataCache.loading;
  panelDataCache.loading=(async()=>{
    try{
      const sheets=await readSheetsData();
      if(sheets){panelDataCache.data=sheets;panelDataCache.at=Date.now();return sheets;}
    }catch(error){console.warn('analytics sheets fallback:',error.message);}
    const local=readData(app);panelDataCache.data=local;panelDataCache.at=Date.now();return local;
  })().finally(()=>{panelDataCache.loading=null;});
  return panelDataCache.loading;
}
async function readPanelData(app){
  const fresh=panelDataCache.data && (Date.now()-panelDataCache.at)<PANEL_CACHE_TTL;
  if(fresh)return panelDataCache.data;
  // Stale-while-revalidate: abre o painel imediatamente e atualiza a fonte externa em segundo plano.
  const fallback=panelDataCache.data||readData(app);
  refreshPanelData(app).catch(()=>{});
  return fallback;
}
function pct(value, total){
  const t = Number(total || 0);
  if(!t) return 0;
  return Math.round((Number(value || 0) / t) * 1000) / 10;
}
function productConversion(products){
  return products.map(p => ({
    ...p,
    conversion: p.views ? Math.round((Number(p.whatsapp || 0) / Number(p.views || 0)) * 1000) / 10 : 0,
    score: (p.views||0)*1 + (p.favorites||0)*3 + (p.whatsapp||0)*5 + (p.shares||0)*2
  }));
}
function buildTimeline(events=[]){
  const map = {};
  for(const ev of events){
    const label = dayLabel(ev.at);
    map[label] = map[label] || { day: label, page_view:0, product_view:0, whatsapp_click:0, search:0, total:0 };
    if(map[label][ev.type] !== undefined) map[label][ev.type] += 1;
    map[label].total += 1;
  }
  return Object.values(map).slice(-30);
}
function labelEvent(ev){
  const when = hourMinute(ev.at);
  if(ev.type === 'product_view') return `${when} abriu ${ev.product?.name || 'produto'}`;
  if(ev.type === 'whatsapp_click') return `${when} clicou WhatsApp em ${ev.product?.name || 'produto'}`;
  if(ev.type === 'favorite') return `${when} favoritou ${ev.product?.name || 'produto'}`;
  if(ev.type === 'search') return `${when} pesquisou "${ev.term || ''}"`;
  if(ev.type === 'category_view') return `${when} acessou categoria ${ev.category?.name || ''}`;
  if(ev.type === 'page_view') return `${when} abriu página`;
  return `${when} ${ev.type}`;
}
function buildSummary(data, period='all'){
  const filtered = dataFromEvents(filterEvents(data.events || [], period), data.source || 'local-json');

  const products = Object.entries(filtered.products || {}).map(([slug,p]) => ({ slug, ...p }));
  const categories = Object.entries(filtered.categories || {}).map(([slug,c]) => ({ slug, ...c }));
  const searches = Object.entries(filtered.searches || {}).map(([term,s]) => ({ term, ...s }));
  const pages = Object.entries(filtered.pages || {}).map(([url,p]) => ({ url, ...p }));
  const devices = Object.entries(filtered.devices || {}).map(([key,d]) => ({ key, ...d }));
  const referrers = Object.entries(filtered.referrers || {}).map(([key,r]) => ({ key, ...r }));
  const conversions = productConversion(products);

  const sort = (arr, field, limit=10) => [...arr].sort((a,b)=>Number(b[field]||0)-Number(a[field]||0)).slice(0,limit);
  const totalEvents = Object.values(filtered.counters || {}).reduce((a,b)=>a+Number(b||0),0);
  const views = Number(filtered.counters.product_view || 0);
  const whatsapp = Number(filtered.counters.whatsapp_click || 0);
  const favorites = Number(filtered.counters.favorite || 0);
  const searchesTotal = Number(filtered.counters.search || 0);
  const conversionRate = views ? Math.round((whatsapp / views) * 1000) / 10 : 0;

  const hot = [...conversions].sort((a,b)=>b.score-a.score).slice(0,5);
  const attention = conversions.filter(p => (p.views||0)>=3 && (p.whatsapp||0)===0)
    .sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,8);

  const deviceTotal = devices.reduce((a,d)=>a+Number(d.total||0),0);
  const referrerTotal = referrers.reduce((a,d)=>a+Number(d.total||0),0);

  return {
    source: data.source || 'local-json',
    period,
    updatedAt: filtered.updatedAt,
    totalEvents,
    counters: filtered.counters || {},
    kpis: {
      productViews: views,
      pageViews: Number(filtered.counters.page_view || 0),
      whatsappClicks: whatsapp,
      favorites,
      searches: searchesTotal,
      categories: Number(filtered.counters.category_view || 0),
      conversionRate
    },
    hot,
    attention,
    productsConversion: [...conversions].sort((a,b)=>(b.whatsapp||0)-(a.whatsapp||0) || (b.views||0)-(a.views||0)).slice(0,20),
    productsMostViewed: sort(conversions,'views'),
    productsMostFavorited: sort(conversions,'favorites'),
    productsMostWhatsapp: sort(conversions,'whatsapp'),
    productsMostShared: sort(conversions,'shares'),
    categoriesMostViewed: sort(categories,'views'),
    searches: searches.sort((a,b)=>(b.total||0)-(a.total||0)).slice(0,15),
    pages: pages.sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10),
    devices: devices.sort((a,b)=>(b.total||0)-(a.total||0)).map(d => ({...d, percent: pct(d.total, deviceTotal)})),
    referrers: referrers.sort((a,b)=>(b.total||0)-(a.total||0)).slice(0,10).map(r => ({...r, percent: pct(r.total, referrerTotal)})),
    timeline: buildTimeline(filtered.events || []),
    recentEvents: (filtered.events || []).slice(-30).reverse().map(ev => ({...ev, label: labelEvent(ev)}))
  };
}

router.get('/', async (req,res)=>{
  const period = safeText(req.query.period || 'all', 20);
  const summary = buildSummary(await readPanelData(req.app), period);
  res.render('analytics', { flash: req.query.flash || null, summary, period });
});

router.get('/summary', async (req,res)=> {
  const period = safeText(req.query.period || 'all', 20);
  res.json({ success:true, summary: buildSummary(await readPanelData(req.app), period) });
});
router.get('/data', async (req,res)=> res.json({ success:true, data: await readPanelData(req.app) }));

router.post('/track', (req,res)=>{
  try {
    const body = req.body || {};
    const type = safeText(body.type || body.event || 'page_view', 40);
    const data = readData(req.app);
    data.counters[type] = Number(data.counters[type] || 0) + 1;

    const pageUrl = safeText(body.url || body.page || req.get('referer') || '', 300);
    if(pageUrl){
      const pageKey = pageUrl.split('#')[0];
      data.pages[pageKey] = data.pages[pageKey] || { url: pageKey, views: 0, lastAt: null };
      data.pages[pageKey].views += 1;
      data.pages[pageKey].lastAt = now();
    }

    if(type === 'product_view' || type === 'favorite' || type === 'whatsapp_click' || type === 'share_click'){
      const product = body.product || {};
      const slug = keyOf(product.slug || body.slug || product.id || product.name || body.name || pageUrl, 'produto');
      const p = data.products[slug] = data.products[slug] || { slug, name: '', image: '', url: '', views:0, favorites:0, whatsapp:0, shares:0, lastAt:null };
      p.name = safeText(product.name || body.name || p.name || slug, 140);
      p.image = safeText(product.image || body.image || p.image, 260);
      p.url = safeText(product.url || body.productUrl || pageUrl || p.url, 300);
      if(type === 'product_view') p.views += 1;
      if(type === 'favorite') p.favorites += 1;
      if(type === 'whatsapp_click') p.whatsapp += 1;
      if(type === 'share_click') p.shares += 1;
      p.lastAt = now();
    }

    if(type === 'category_view'){
      const category = body.category || {};
      const slug = keyOf(category.slug || body.slug || category.name || body.name || pageUrl, 'categoria');
      const c = data.categories[slug] = data.categories[slug] || { slug, name:'', url:'', views:0, lastAt:null };
      c.name = safeText(category.name || body.name || c.name || slug, 100);
      c.url = safeText(category.url || pageUrl || c.url, 300);
      c.views += 1;
      c.lastAt = now();
    }

    if(type === 'search'){
      const term = safeText(body.term || body.query || '', 100).toLowerCase();
      if(term){
        const s = data.searches[term] = data.searches[term] || { term, total:0, lastAt:null };
        s.total += 1;
        s.lastAt = now();
      }
    }

    data.events.push({
      at: now(), type,
      url: pageUrl,
      referrer: safeText(body.referrer || '', 300),
      device: safeText(body.device || '', 80),
      viewport: safeText(body.viewport || '', 40),
      language: safeText(body.language || '', 40),
      product: body.product ? { slug: safeText(body.product.slug||'',120), name: safeText(body.product.name||'',140) } : undefined,
      category: body.category ? { slug: safeText(body.category.slug||'',120), name: safeText(body.category.name||'',100) } : undefined,
      term: safeText(body.term || body.query || '', 100)
    });
    data.events = data.events.slice(-3000);
    writeData(req.app, data);
    res.json({ success:true });
  } catch(error){
    console.warn('analytics track erro:', error.message);
    res.status(500).json({ success:false, message:'Falha ao registrar analytics.' });
  }
});

router.post('/reset', async (req,res)=>{
  let message = '📊 Analytics local zerado.';
  try {
    await resetSheets();
    message = '📊 Analytics zerado com sucesso no Google Sheets e no JSON local.';
  } catch(error) {
    console.warn('analytics reset sheets erro:', error.message);
    message = '⚠️ JSON local zerado, mas não foi possível zerar o Google Sheets: ' + error.message;
  }
  writeData(req.app, emptyData());
  res.redirect('/analytics?flash=' + encodeURIComponent(message));
});

export default router;
