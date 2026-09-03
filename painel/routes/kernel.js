import express from 'express';
import { businessDate } from '../utils/date-time.js';

const router = express.Router();
function kernel(req) { return req.app.locals.kernelService; }
function ctx(req) { return req.kernelContext || { actor:'painel', ip:'', device:'', requestId:'' }; }
function csvCell(value){ return `"${String(value ?? '').replace(/"/g,'""')}"`; }

router.get('/', (req, res) => {
  const service = kernel(req);
  const logQuery = service.logs.query(req.query);
  res.render('kernel_dashboard', {
    flash:req.query.flash || null,
    summary:service.summary(), logs:logQuery.items, pagination:logQuery,
    facets:service.logs.facets(), filters:req.query,
    events:service.events.list(80), audits:service.audits.list(80),
    documents:service.documents.list(80), timelines:service.timelines.list({ limit:80 }),
    profiles:service.permissions.list(), selectedLog:req.query.log ? service.logs.get(req.query.log) : null
  });
});

router.get('/export.csv', (req, res) => {
  const result = kernel(req).logs.query({ ...req.query, page:1, pageSize:2000 });
  const header = ['ID','Data/hora','Módulo','Categoria','Ação','Descrição','Usuário','Resultado','Rota','Documento','IP'];
  const rows = result.items.map(x => [x.id,x.at,x.module,x.category,x.action,x.label,x.actor,x.result,x.route,x.documentId,x.ip]);
  const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',`attachment; filename="quality-logs-${businessDate()}.csv"`);
  res.send(csv);
});

router.get('/api/logs', (req,res) => res.json({ success:true, ...kernel(req).logs.query(req.query) }));
router.get('/api/logs/:id', (req,res) => { const item=kernel(req).logs.get(req.params.id); return item ? res.json({success:true,item}) : res.status(404).json({success:false}); });
router.get('/api/events', (req,res) => res.json({ success:true, items:kernel(req).events.list(req.query.limit) }));
router.get('/api/audits', (req,res) => res.json({ success:true, items:kernel(req).audits.list(req.query.limit) }));
router.get('/api/documents', (req,res) => res.json({ success:true, items:kernel(req).documents.list(req.query.limit) }));
router.get('/api/timeline', (req,res) => res.json({ success:true, items:kernel(req).timelines.list(req.query) }));

router.post('/client-event', (req,res) => {
  try {
    const payload=req.body || {}; const context=ctx(req);
    const allowed=['CLICK','FORM_SUBMIT','SEARCH','PRINT','EXPORT','IMPORT','OPEN_MODAL','CLOSE_MODAL'];
    const action=allowed.includes(String(payload.action||'').toUpperCase()) ? String(payload.action).toUpperCase() : 'CLICK';
    kernel(req).logs.record({ ...context, category:'interaction', module:payload.module||context.module||'panel', action,
      route:payload.route||req.get('referer')||'', method:'CLIENT', result:'success', label:String(payload.label||'').slice(0,180),
      details:{ element:String(payload.element||'').slice(0,50), target:String(payload.target||'').slice(0,300) } });
    return res.json({success:true});
  } catch (_) { return res.status(204).end(); }
});
export default router;
