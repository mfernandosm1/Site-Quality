import crypto from 'crypto';

function actor(req) { return req.user?.name || req.user?.email || req.session?.user?.name || 'painel'; }
function moduleFromPath(url = '') {
  const first = String(url).split('?')[0].split('/').filter(Boolean)[0] || 'dashboard';
  if (first === 'erp') return String(url).split('/').filter(Boolean)[1] || 'erp';
  return first;
}
function ip(req) { return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim(); }
function device(req) { return String(req.headers['user-agent'] || '').slice(0, 300); }
function safeDetails(req) {
  const keys = Object.keys(req.body || {}).filter(k => !/senha|password|token|secret|audio|image|media|base64/i.test(k));
  return keys.length ? { bodyFields: keys.slice(0, 40), queryFields: Object.keys(req.query || {}).slice(0, 40) } : null;
}

export default function requestLogger(kernel) {
  return (req, res, next) => {
    if (req.path.startsWith('/public/') || req.path.startsWith('/content/') || req.path.startsWith('/images/') || req.path.startsWith('/js/')) return next();
    const started = Date.now();
    req.kernelContext = { requestId: crypto.randomUUID(), actor: actor(req), ip: ip(req), device: device(req), module: moduleFromPath(req.originalUrl) };
    res.on('finish', () => {
      const isMutation = ['POST','PUT','PATCH','DELETE'].includes(req.method);
      const isError = res.statusCode >= 400;
      // PAGE_VIEW e GET comum não são mais gravados. Eles geravam dezenas de
      // milhares de registros e bloqueavam a próxima navegação sem ganho operacional.
      if (!isMutation && !isError) return;
      kernel.logs.record({ ...req.kernelContext, action:`HTTP_${req.method}`, route:req.originalUrl.split('?')[0], method:req.method,
        statusCode:res.statusCode, result:isError?'error':'success', durationMs:Date.now()-started,
        category:isError?'error':'operational', label:isError?'Falha HTTP':'Operação executada', details:safeDetails(req) });
    });
    next();
  };
}
