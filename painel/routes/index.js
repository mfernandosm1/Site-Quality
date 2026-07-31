import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }

const AVAILABLE_ACTIONS = [
  // Rotina principal
  { id:'whatsapp', name:'WhatsApp', icon:'💬', href:'/automacao-whatsapp', type:'link' },
  { id:'publicar', name:'Publicar agora', icon:'📤', href:'/publicar', type:'post' },

  // ERP — acessos internos
  { id:'erp', name:'ERP', icon:'💼', href:'/erp', type:'link' },
  { id:'erp-clientes', name:'ERP · Clientes', icon:'👥', href:'/erp/clientes', type:'link' },
  { id:'erp-produtos', name:'ERP · Produtos', icon:'📦', href:'/produtos?origem=erp', type:'link' },
  { id:'erp-orcamentos', name:'ERP · Orçamentos', icon:'🧾', href:'/orcamentos', type:'link' },
  { id:'erp-estoque', name:'ERP · Estoque', icon:'📚', href:'/erp/estoque', type:'link' },
  { id:'erp-pdv', name:'ERP · PDV', icon:'🛒', href:'/erp/modulo/pdv', type:'link' },
  { id:'erp-fornecedores', name:'ERP · Fornecedores', icon:'🏭', href:'/erp/modulo/fornecedores', type:'link' },
  { id:'erp-os', name:'ERP · Ordens de Serviço', icon:'🛠️', href:'/erp/modulo/ordens-servico', type:'link' },
  { id:'erp-compras', name:'ERP · Compras', icon:'🚚', href:'/erp/modulo/compras', type:'link' },
  { id:'erp-financeiro', name:'ERP · Financeiro', icon:'💰', href:'/erp/modulo/financeiro', type:'link' },

  // Ferramentas — acessos internos
  { id:'ferramentas', name:'Ferramentas', icon:'🧰', href:'/ferramentas', type:'link' },
  { id:'ferramentas-compatibilidade', name:'Ferramentas · Capas e películas', icon:'📱', href:'/compatibilidade', type:'link' },
  { id:'ferramentas-calculadora', name:'Ferramentas · Calculadora comercial', icon:'🧮', href:'/orcamentos', type:'link' },
  { id:'ferramentas-backup', name:'Ferramentas · Backup', icon:'💾', href:'/backup', type:'link' },
  { id:'ferramentas-atualizacoes', name:'Ferramentas · Atualizações', icon:'🔄', href:'/atualizacoes', type:'link' },

  // Site e demais áreas
  { id:'produtos-site', name:'Produtos do site', icon:'📦', href:'/produtos', type:'link' },
  { id:'banners', name:'Banners', icon:'🖼️', href:'/banners', type:'link' },
  { id:'crm', name:'CRM', icon:'💬', href:'/crm', type:'link' },
  { id:'site', name:'Site', icon:'🌐', href:'/site', type:'link' },
  { id:'analytics', name:'Analytics', icon:'📊', href:'/analytics', type:'link' },
  { id:'marketing', name:'Marketing', icon:'✨', href:'/marketing', type:'link' },
  { id:'configuracoes', name:'Configurações', icon:'⚙️', href:'/configuracoes', type:'link' },
  { id:'manutencao', name:'Manutenção do site', icon:'🛠️', href:'/manutencao', type:'link' },
  { id:'categorias', name:'Categorias', icon:'🗂️', href:'/categorias', type:'link' },
  { id:'seo', name:'SEO', icon:'🔎', href:'/seo', type:'link' },
  { id:'paginas', name:'Páginas', icon:'📄', href:'/paginas', type:'link' },
  { id:'personalizacao', name:'Personalização', icon:'🎨', href:'/personalizacao', type:'link' }
];

function quickActionsPath(app){
  const { ROOT } = P(app);
  return path.join(ROOT, 'painel', 'data', 'platform', 'quick_actions.json');
}

function readQuickActionIds(app){
  const file = quickActionsPath(app);
  const defaults = ['whatsapp','produtos-site','banners','publicar'];
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (Array.isArray(data.actions)) return data.actions.filter(Boolean);
  } catch (_) {}
  return defaults;
}

function saveQuickActionIds(app, ids){
  const file = quickActionsPath(app);
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, JSON.stringify({ actions:ids, updatedAt:new Date().toISOString() }, null, 2), 'utf-8');
}

function resolveQuickActions(ids){
  return ids.map(id => AVAILABLE_ACTIONS.find(item => item.id === id)).filter(Boolean);
}

function formatPublishDate(value){
  if (!value) return 'Ainda não registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone:'America/Sao_Paulo',
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:false
  }).format(date).replace(',', ' às');
}

router.get('/', (req,res)=>{
  const { CONTENT_DIR, SITE_DIR } = P(req.app);
  let publish = {last_publish:null};
  try { publish = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR,'publish.json'),'utf-8')); } catch(_) {}

  const maint = {
    active: fs.existsSync(path.join(SITE_DIR, 'maintenance.flag'))
  };

  const quickActionIds = readQuickActionIds(req.app);
  res.render('index', {
    flash:req.query.flash || null,
    maint,
    publish,
    publishFormatted:formatPublishDate(publish.last_publish),
    quickActions:resolveQuickActions(quickActionIds),
    availableActions:AVAILABLE_ACTIONS.filter(item => !quickActionIds.includes(item.id)),
    manageShortcuts:req.query.atalhos === '1'
  });
});

router.post('/atalhos/adicionar', (req,res)=>{
  const id = String(req.body.actionId || '').trim();
  const exists = AVAILABLE_ACTIONS.some(item => item.id === id);
  const ids = readQuickActionIds(req.app);
  if (exists && !ids.includes(id)) ids.push(id);
  saveQuickActionIds(req.app, ids);
  res.redirect('/?atalhos=1&flash=' + encodeURIComponent('Atalho adicionado.'));
});

router.post('/atalhos/remover', (req,res)=>{
  const id = String(req.body.actionId || '').trim();
  saveQuickActionIds(req.app, readQuickActionIds(req.app).filter(item => item !== id));
  res.redirect('/?atalhos=1&flash=' + encodeURIComponent('Atalho removido.'));
});

router.post('/atalhos/mover', (req,res)=>{
  const id = String(req.body.actionId || '').trim();
  const direction = req.body.direction === 'up' ? -1 : 1;
  const ids = readQuickActionIds(req.app);
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index >= 0 && target >= 0 && target < ids.length) {
    [ids[index], ids[target]] = [ids[target], ids[index]];
    saveQuickActionIds(req.app, ids);
  }
  res.redirect('/?atalhos=1');
});

export default router;
