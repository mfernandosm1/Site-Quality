import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DashboardService from '../services/dashboard-service.js';
import CustomerService from '../services/customer-service.js';
import { getTaskOverview, listAgendaOwners, listAgendaTypes } from '../services/erp_tasks.js';

const router = express.Router();
const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const PANEL_DIR = path.resolve(ROUTES_DIR, '..');
function P(app){ return app.locals.paths; }
function getIndexCustomerService(app){
  if(app.locals.customerService) return app.locals.customerService;
  app.locals.customerService = new CustomerService({ dataDir:path.join(PANEL_DIR,'data','erp','customers') });
  return app.locals.customerService;
}

const AVAILABLE_ACTIONS = [
  // Operação
  { id:'home', name:'Atalhos rápidos', icon:'🏠', href:'/', type:'link', group:'Operação' },
  { id:'erp-centro-operacoes', name:'Operações / vendas', icon:'🧭', href:'/erp/centro-operacoes', type:'link', group:'Operação' },
  { id:'erp-agenda', name:'Agenda / tarefas', icon:'✅', href:'/erp/agenda', type:'link', group:'Operação' },
  { id:'erp-pdv', name:'PDV', icon:'🛒', href:'/erp/pdv', type:'link', group:'Operação' },
  { id:'erp-orcamentos', name:'Orçamentos', icon:'📝', href:'/orcamentos', type:'link', group:'Operação' },
  { id:'erp-os', name:'Ordens de Serviço', icon:'🛠️', href:'/erp/modulo/ordens-servico', type:'link', group:'Operação' },

  // Clientes e relacionamento
  { id:'erp-clientes-lista', name:'Clientes', icon:'👥', href:'/erp/clientes', type:'link', group:'Clientes e relacionamento' },
  { id:'erp-clientes', name:'Novo cliente', icon:'👤＋', href:'/erp/clientes?novo=1', type:'link', group:'Clientes e relacionamento' },
  { id:'whatsapp-inbox', name:'Inbox · WhatsApp', icon:'💬', href:'/automacao-whatsapp?tab=inbox', type:'link', group:'Clientes e relacionamento' },
  { id:'whatsapp', name:'WhatsApp · Automação', icon:'🤖', href:'/automacao-whatsapp', type:'link', group:'Clientes e relacionamento' },
  { id:'crm', name:'CRM', icon:'💬', href:'/crm', type:'link', group:'Clientes e relacionamento' },

  // Produtos, estoque e compras
  { id:'erp-produtos', name:'Produtos', icon:'📦', href:'/produtos?origem=erp', type:'link', group:'Produtos, estoque e compras' },
  { id:'erp-estoque', name:'Estoque', icon:'📚', href:'/erp/estoque', type:'link', group:'Produtos, estoque e compras' },
  { id:'erp-contagem-estoque', name:'Contagem de estoque', icon:'📋', href:'/erp/estoque/contagens', type:'link', group:'Produtos, estoque e compras' },
  { id:'erp-compras', name:'Compras', icon:'🚚', href:'/erp/compras', type:'link', group:'Produtos, estoque e compras' },
  { id:'erp-fornecedores', name:'Fornecedores', icon:'🏭', href:'/erp/fornecedores', type:'link', group:'Produtos, estoque e compras' },
  { id:'erp-historico', name:'Histórico ERP', icon:'🕘', href:'/erp/historico', type:'link', group:'Produtos, estoque e compras' },

  // Financeiro
  { id:'erp-financeiro', name:'Financeiro', icon:'💰', href:'/erp/financeiro', type:'link', group:'Financeiro' },
  { id:'erp-contas-receber', name:'Contas a receber', icon:'📥', href:'/erp/financeiro/contas-a-receber', type:'link', group:'Financeiro' },
  { id:'erp-contas-pagar', name:'Contas a pagar', icon:'📤', href:'/erp/financeiro/contas-a-pagar', type:'link', group:'Financeiro' },
  { id:'erp-caixa', name:'Caixa / PDV', icon:'🏦', href:'/erp/pdv/caixa', type:'link', group:'Financeiro' },
  { id:'erp-fluxo-caixa', name:'Fluxo de Caixa', icon:'📈', href:'/erp/financeiro/fluxo-de-caixa', type:'link', group:'Financeiro' },
  { id:'erp-dre', name:'DRE', icon:'📊', href:'/erp/financeiro/dre', type:'link', group:'Financeiro' },

  // Loja virtual
  { id:'publicar', name:'Publicar agora', icon:'📤', href:'/publicar', type:'post', group:'Loja virtual' },
  { id:'produtos-site', name:'Produtos do site', icon:'📦', href:'/produtos', type:'link', group:'Loja virtual' },
  { id:'banners', name:'Banners', icon:'🖼️', href:'/banners', type:'link', group:'Loja virtual' },
  { id:'site', name:'Site', icon:'🌐', href:'/site', type:'link', group:'Loja virtual' },
  { id:'analytics', name:'Analytics', icon:'📊', href:'/analytics', type:'link', group:'Loja virtual' },
  { id:'marketing', name:'Marketing', icon:'✨', href:'/marketing', type:'link', group:'Loja virtual' },
  { id:'categorias', name:'Categorias', icon:'🗂️', href:'/categorias', type:'link', group:'Loja virtual' },
  { id:'seo', name:'SEO', icon:'🔎', href:'/seo', type:'link', group:'Loja virtual' },
  { id:'paginas', name:'Páginas', icon:'📄', href:'/paginas', type:'link', group:'Loja virtual' },
  { id:'personalizacao', name:'Personalização', icon:'🎨', href:'/personalizacao', type:'link', group:'Loja virtual' },
  { id:'manutencao', name:'Manutenção do site', icon:'🛠️', href:'/manutencao', type:'link', group:'Loja virtual' },

  // Ferramentas
  { id:'ferramentas', name:'Ferramentas', icon:'🧰', href:'/ferramentas', type:'link', group:'Ferramentas' },
  { id:'ferramentas-compatibilidade', name:'Capas e películas', icon:'📱', href:'/compatibilidade', type:'link', group:'Ferramentas' },
  { id:'ferramentas-calculadora', name:'Calculadora comercial', icon:'🧮', href:'/orcamentos', type:'link', group:'Ferramentas' },
  { id:'ferramentas-backup', name:'Backup', icon:'💾', href:'/backup', type:'link', group:'Ferramentas' },
  { id:'ferramentas-atualizacoes', name:'Atualizações', icon:'🔄', href:'/atualizacoes', type:'link', group:'Ferramentas' },

  // Configurações
  { id:'erp', name:'ERP', icon:'💼', href:'/erp', type:'link', group:'Configurações' },
  { id:'configuracoes', name:'Configurações', icon:'⚙️', href:'/configuracoes', type:'link', group:'Configurações' }
];

function quickActionsPath(app){
  const { ROOT } = P(app);
  return path.join(ROOT, 'painel', 'data', 'platform', 'quick_actions.json');
}

function readQuickActionIds(app){
  const file = quickActionsPath(app);
  const defaults = ['erp-pdv','erp-orcamentos','erp-clientes','crm','erp-financeiro','site','configuracoes'];
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


function getDashboardService(app){
  if (app.locals.dashboardService) return app.locals.dashboardService;
  const { ROOT, CONTENT_DIR } = P(app);
  app.locals.dashboardService = new DashboardService({
    panelDir:path.join(ROOT, 'painel'),
    siteContentDir:CONTENT_DIR
  });
  return app.locals.dashboardService;
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
    pageClass:'dashboard-home',
    queryPeriod:String(req.query.periodo || 'month'),
    quickActions:resolveQuickActions(quickActionIds),
    availableActions:AVAILABLE_ACTIONS.filter(item => !quickActionIds.includes(item.id)),
    manageShortcuts:req.query.atalhos === '1'
  });
});

router.get('/api/dashboard', async (req,res)=>{
  try {
    const dashboard = await getDashboardService(req.app).snapshot({ period:String(req.query.periodo || 'month') });
    const allTasks = getTaskOverview(req.app);
    const owners = listAgendaOwners(req.app, { includeInactive:true });
    const types = listAgendaTypes(req.app);
    const ownerColor = new Map(owners.map(item => [item.name, item.color]));
    const typeName = new Map(types.map(item => [item.id, item.name]));
    const undated = allTasks.undated || allTasks.reminders || [];
    const soonLimit = Date.now() + (2 * 24 * 60 * 60 * 1000);
    const upcomingSoon = allTasks.upcoming.filter(item => {
      const due = new Date(item.dueAt);
      return !Number.isNaN(due.getTime()) && due.getTime() <= soonLimit;
    });
    const upcomingLater = allTasks.upcoming.filter(item => !upcomingSoon.some(soon => soon.id === item.id));
    const ordered = [...allTasks.overdue, ...allTasks.today, ...upcomingSoon, ...undated, ...upcomingLater]
      .filter((item,index,array)=>array.findIndex(other=>other.id===item.id)===index);
    const agenda = {
      overdue:allTasks.overdue.length,
      today:allTasks.today.length,
      upcoming:allTasks.upcoming.length,
      undated:undated.length,
      reminders:undated.length,
      totalOpen:allTasks.totalOpen,
      next:ordered.slice(0, 12).map(item => ({
        id:item.id,
        title:item.title,
        owner:item.owner || 'Sem responsável',
        ownerColor:ownerColor.get(item.owner) || '#64748b',
        type:item.type,
        typeName:item.typeName || typeName.get(item.type) || 'Tarefa',
        dueAt:item.dueAt || '',
        priority:item.priority || 'medium',
        description:item.description || '',
        customerId:item.customerId || '',
        customerName:item.customerName || '',
        href:`/erp/agenda?responsavel=${encodeURIComponent(item.owner || 'all')}`
      }))
    };
    res.set('Cache-Control', 'private, max-age=10');
    res.json({ ok:true, dashboard:{ ...dashboard, agenda } });
  } catch (error) {
    console.error('Falha ao carregar dashboard:', error);
    res.status(500).json({ ok:false, error:'Não foi possível carregar os indicadores da dashboard.' });
  }
});

function normalizeGeoText(value=''){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function customerAddressText(customer){
  return [customer.street,customer.number,customer.district,customer.city,customer.state,customer.zipCode ? `CEP ${customer.zipCode}` : '', 'Brasil'].filter(Boolean).join(', ');
}

router.get('/api/dashboard/customer-locations', (req,res)=>{
  try{
    const customers=getIndexCustomerService(req.app).listCustomers({ includeInactive:false });
    const groups=new Map();
    let withoutCity=0;
    customers.forEach(customer=>{
      const city=String(customer.city||'').trim();
      const state=String(customer.state||'').trim().toUpperCase();
      if(!city){ withoutCity+=1; return; }
      const key=`${normalizeGeoText(city)}|${state}`;
      const current=groups.get(key)||{ key, city, state, count:0 };
      current.count+=1;
      groups.set(key,current);
    });
    const locations=[...groups.values()].sort((a,b)=>b.count-a.count||a.city.localeCompare(b.city,'pt-BR'));
    res.set('Cache-Control','private, max-age=300');
    return res.json({ ok:true, totalCustomers:customers.length, locatedCustomers:customers.length-withoutCity, withoutCity, locations });
  }catch(error){
    console.error('Falha ao agrupar localização de clientes:',error);
    return res.status(500).json({ ok:false, error:'Não foi possível carregar a localização dos clientes.' });
  }
});

router.get('/api/dashboard/customer-location-customers', (req,res)=>{
  try{
    const city=String(req.query.city||'').trim();
    const state=String(req.query.state||'').trim().toUpperCase();
    const q=normalizeGeoText(req.query.q||'');
    if(!city) return res.status(400).json({ok:false,error:'Cidade não informada.'});
    const customers=getIndexCustomerService(req.app).listCustomers({ includeInactive:false })
      .filter(customer=>normalizeGeoText(customer.city)===normalizeGeoText(city) && (!state || String(customer.state||'').trim().toUpperCase()===state))
      .filter(customer=>{
        if(!q)return true;
        return normalizeGeoText([customer.name,customer.document,customer.mobile,customer.phone,customer.street,customer.district,customer.zipCode].filter(Boolean).join(' ')).includes(q);
      });
    const total=customers.length;
    const items=customers.slice(0,60).map(customer=>({
      id:customer.id, name:customer.name||customer.tradeName||'Cliente', document:customer.document||'',
      mobile:customer.mobile||customer.phone||'', street:customer.street||'', number:customer.number||'',
      district:customer.district||'', city:customer.city||city, state:customer.state||state, zipCode:customer.zipCode||'',
      address:customerAddressText(customer)
    }));
    res.set('Cache-Control','private, max-age=60');
    return res.json({ok:true,total,items});
  }catch(error){
    console.error('Falha ao listar clientes por cidade:',error);
    return res.status(500).json({ok:false,error:'Não foi possível carregar os clientes desta cidade.'});
  }
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
