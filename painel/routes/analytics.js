import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

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
    version: '8.3.0-analytics-lite',
    createdAt: now(),
    updatedAt: now(),
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
    events: []
  };
}
function readData(app){
  try {
    const fp = filePath(app);
    if(!fs.existsSync(fp)) return emptyData();
    const parsed = JSON.parse(fs.readFileSync(fp,'utf-8'));
    return { ...emptyData(), ...parsed, counters: { ...emptyData().counters, ...(parsed.counters||{}) } };
  } catch { return emptyData(); }
}
function writeData(app, data){
  const fp = filePath(app);
  ensureDir(path.dirname(fp));
  data.updatedAt = now();
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}
function topMap(map={}, field='total', limit=8){
  return Object.entries(map || {})
    .map(([key, value]) => ({ key, ...value }))
    .sort((a,b) => Number(b[field]||0) - Number(a[field]||0))
    .slice(0, limit);
}
function buildSummary(data){
  const products = Object.entries(data.products || {}).map(([slug,p]) => ({ slug, ...p }));
  const categories = Object.entries(data.categories || {}).map(([slug,c]) => ({ slug, ...c }));
  const searches = Object.entries(data.searches || {}).map(([term,s]) => ({ term, ...s }));
  const pages = Object.entries(data.pages || {}).map(([url,p]) => ({ url, ...p }));
  const sort = (arr, field) => [...arr].sort((a,b)=>Number(b[field]||0)-Number(a[field]||0)).slice(0,10);
  const hot = products.map(p => ({...p, score:(p.views||0)*1+(p.favorites||0)*3+(p.whatsapp||0)*5+(p.shares||0)*2}))
    .sort((a,b)=>b.score-a.score).slice(0,5);
  const attention = products.filter(p => (p.views||0)>=10 && (p.whatsapp||0)===0)
    .sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5);
  const totalEvents = Object.values(data.counters || {}).reduce((a,b)=>a+Number(b||0),0);
  return {
    updatedAt: data.updatedAt,
    totalEvents,
    counters: data.counters || {},
    hot,
    attention,
    productsMostViewed: sort(products,'views'),
    productsMostFavorited: sort(products,'favorites'),
    productsMostWhatsapp: sort(products,'whatsapp'),
    productsMostShared: sort(products,'shares'),
    categoriesMostViewed: sort(categories,'views'),
    searches: searches.sort((a,b)=>(b.total||0)-(a.total||0)).slice(0,10),
    pages: pages.sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10),
    recentEvents: (data.events || []).slice(-25).reverse()
  };
}

router.get('/', (req,res)=>{
  const summary = buildSummary(readData(req.app));
  res.render('analytics', { flash: req.query.flash || null, summary });
});

router.get('/summary', (req,res)=> res.json({ success:true, summary: buildSummary(readData(req.app)) }));
router.get('/data', (req,res)=> res.json({ success:true, data: readData(req.app) }));

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

router.post('/reset', (req,res)=>{
  writeData(req.app, emptyData());
  res.redirect('/analytics?flash=' + encodeURIComponent('📊 Analytics zerado com sucesso.'));
});

export default router;
