import crypto from 'crypto';

function actor(req) { return req.user?.displayName || req.user?.name || req.user?.email || req.session?.user?.name || 'painel'; }
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

function mutationDescription(req) {
  const route=String(req.originalUrl||'').split('?')[0],method=String(req.method||'').toUpperCase();
  const body=req.body||{};
  const rules=[
    [/^\/erp\/pdv\/trocas-devolucoes$/,()=>({action:body.type==='exchange'?'TROCA_REGISTRADA':'DEVOLUCAO_REGISTRADA',label:body.type==='exchange'?'Troca registrada no PDV':'Devolução registrada no PDV'})],
    [/^\/erp\/pdv\/operacoes\/[^/]+\/finalizar$/,()=>({action:'PDV_FINALIZADO',label:'Venda ou O.S. finalizada no PDV'})],
    [/^\/erp\/pdv\/operacoes\/[^/]+\/estornar$/,()=>({action:'OPERACAO_ESTORNADA',label:'Venda ou O.S. estornada'})],
    [/^\/erp\/pdv\/operacoes$/,()=>({action:'OPERACAO_PDV_SALVA',label:body.type==='service_order'?'O.S. salva no PDV':'Venda salva no PDV'})],
    [/^\/erp\/clientes\/[^/]+\/api\/carteira$/,()=>({action:body.direction==='debit'?'CREDITO_CLIENTE_UTILIZADO':'CREDITO_CLIENTE_ADICIONADO',label:body.direction==='debit'?'Débito lançado na carteira do cliente':'Crédito lançado na carteira do cliente'})],
    [/^\/erp\/pdv\/caixa\/abrir$/,()=>({action:'CAIXA_ABERTO',label:'Caixa operacional aberto'})],
    [/^\/erp\/pdv\/caixa\/fechar$/,()=>({action:'CAIXA_FECHADO',label:'Caixa operacional fechado'})],
    [/^\/erp\/pdv\/caixa\/movimentar$/,()=>({action:'MOVIMENTO_CAIXA',label:'Movimentação registrada no caixa'})],
    [/^\/produtos\/(?:update|api\/[^/]+)$/i,()=>({action:'PRODUTO_ATUALIZADO',label:'Produto atualizado'})],
    [/^\/produtos\/(?:add|novo)/i,()=>({action:'PRODUTO_CADASTRADO',label:'Produto cadastrado'})],
    [/^\/erp\/clientes(?:\/|$)/,()=>({action:'CLIENTE_ATUALIZADO',label:'Cadastro de cliente alterado'})],
    [/^\/erp\/compras(?:\/|$)/,()=>({action:'COMPRA_ATUALIZADA',label:'Compra ou entrada de mercadoria alterada'})],
    [/^\/erp\/financeiro(?:\/|$)/,()=>({action:'FINANCEIRO_ATUALIZADO',label:'Movimentação financeira registrada'})]
  ];
  for(const [pattern,build] of rules){if(pattern.test(route))return build();}
  const module=moduleFromPath(route);
  return {action:`${module.toUpperCase().replace(/[^A-Z0-9]+/g,'_')}_${method}`,label:`Alteração registrada em ${module}`};
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
      // Rotas que já gravaram um log semântico (com venda, cliente, valor etc.)
      // não recebem um segundo registro genérico de HTTP. Falhas sempre são preservadas.
      if(req.kernelSemanticLogged && !isError) return;
      const semantic=mutationDescription(req);
      kernel.logs.record({ ...req.kernelContext, action:isError?`ERRO_${semantic.action}`:semantic.action, route:req.originalUrl.split('?')[0], method:req.method,
        statusCode:res.statusCode, result:isError?'error':'success', durationMs:Date.now()-started,
        category:isError?'error':'operational', label:isError?`Falha ao executar: ${semantic.label}`:semantic.label, details:safeDetails(req) });
    });
    next();
  };
}
