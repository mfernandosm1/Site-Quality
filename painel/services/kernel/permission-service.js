import JsonStore from './json-store.js';

const DEFAULT_PROFILES = [
  { id:'administrator', name:'Administrador', description:'Acesso total ao painel e às configurações.', permissions:['*'], system:true },
  { id:'manager', name:'Gerente', description:'Operação ampla, relatórios, equipe e aprovações.', permissions:['dashboard.*','erp.view','operations.view','pdv.*','cash.*','customers.*','products.*','inventory.*','purchases.*','suppliers.*','agenda.*','quotes.*','reports.*','commissions.*','crm.*','finance.view','audit.view'], system:true },
  { id:'seller', name:'Vendedor', description:'Atendimento, clientes, produtos, vendas e consulta das próprias metas.', permissions:['dashboard.view','erp.view','operations.view','pdv.view','pdv.sell','pdv.discount','customers.*','products.view','inventory.view','agenda.*','quotes.*','commissions.view','crm.view','crm.inbox.*'], system:true },
  { id:'service', name:'Assistência', description:'Ordens de serviço, clientes, agenda e consulta de estoque.', permissions:['dashboard.view','erp.view','operations.view','service_orders.*','customers.*','products.view','inventory.view','agenda.*','crm.view','crm.inbox.*'], system:true },
  { id:'finance', name:'Financeiro', description:'Caixa, contas, recebimentos e relatórios financeiros.', permissions:['dashboard.view','erp.view','cash.*','finance.*','reports.*','commissions.view','audit.view'], system:true },
  { id:'stock', name:'Estoque', description:'Produtos, fornecedores, compras, entradas, saídas e ajustes de estoque.', permissions:['dashboard.view','erp.view','products.*','inventory.*','purchases.*','suppliers.*','reports.view'], system:true },
  { id:'readonly', name:'Somente leitura', description:'Consulta sem autorização para alterar registros.', permissions:['dashboard.view','erp.view','*.view'], system:true }
];

// Permissões das versões anteriores. Se o perfil ainda estiver exatamente no padrão antigo,
// ele pode receber automaticamente o refinamento novo sem sobrescrever personalizações do usuário.
const LEGACY_DEFAULTS = {
  administrator:['*'],
  manager:['dashboard.*','erp.view','operations.view','pdv.*','cash.*','customers.*','products.*','inventory.*','purchases.*','suppliers.*','agenda.*','quotes.*','reports.*','commissions.*','crm.*','finance.view','audit.view'],
  seller:['dashboard.view','erp.view','operations.view','pdv.view','pdv.sell','customers.*','products.view','inventory.view','agenda.*','quotes.*','commissions.view','crm.*'],
  service:['dashboard.view','erp.view','operations.view','service_orders.*','customers.*','products.view','inventory.view','agenda.*','crm.*'],
  finance:['dashboard.view','erp.view','cash.*','finance.*','reports.*','commissions.view','audit.view'],
  stock:['dashboard.view','erp.view','products.*','inventory.*','purchases.*','suppliers.*','reports.view'],
  readonly:['dashboard.view','erp.view','*.view']
};

const PREVIOUS_DEFAULTS_V3 = {
  seller:['dashboard.view','erp.view','operations.view','pdv.view','pdv.sell','customers.*','products.view','inventory.view','agenda.*','quotes.*','commissions.view','crm.view','crm.inbox.*']
};

const PERMISSION_CATALOG = [
  {group:'Geral',items:[
    {id:'dashboard.view',name:'Ver Dashboard'},{id:'dashboard.manage',name:'Editar atalhos da Dashboard'},{id:'erp.view',name:'Abrir visão geral do ERP'},{id:'operations.view',name:'Centro de Operações'}
  ]},
  {group:'Vendas / Atendimento',items:[
    {id:'pdv.view',name:'Ver PDV e operações'},{id:'pdv.sell',name:'Criar e editar vendas/O.S.'},{id:'pdv.cancel',name:'Cancelar ou estornar venda/O.S.'},{id:'pdv.returns',name:'Realizar trocas e devoluções'},{id:'pdv.discount',name:'Conceder desconto até o limite do usuário'},{id:'pdv.discount.approve',name:'Autorizar desconto acima do limite e gerar chave temporária'},
    {id:'cash.view',name:'Ver Caixa Operacional'},{id:'cash.manage',name:'Abrir, fechar e movimentar caixa'},{id:'agenda.view',name:'Ver Agenda'},{id:'agenda.manage',name:'Editar Agenda'},{id:'quotes.view',name:'Ver Orçamentos'},{id:'quotes.manage',name:'Editar Orçamentos'}
  ]},
  {group:'Cadastros / Estoque',items:[
    {id:'customers.view',name:'Ver clientes'},{id:'customers.manage',name:'Cadastrar/editar clientes'},{id:'products.view',name:'Ver produtos ERP'},{id:'products.manage',name:'Cadastrar/editar produtos ERP'},
    {id:'inventory.view',name:'Ver estoque'},{id:'inventory.manage',name:'Movimentar/contar estoque'},{id:'purchases.view',name:'Ver compras'},{id:'purchases.manage',name:'Criar/concluir compras'},
    {id:'suppliers.view',name:'Ver fornecedores'},{id:'suppliers.manage',name:'Cadastrar/editar fornecedores'}
  ]},
  {group:'Financeiro / Gestão',items:[
    {id:'finance.view',name:'Ver Financeiro'},{id:'finance.manage',name:'Alterar Financeiro'},{id:'reports.view',name:'Ver Relatórios'},{id:'commissions.view',name:'Ver Metas e Comissões'},
    {id:'commissions.manage',name:'Configurar/fechar Comissões'},{id:'audit.view',name:'Ver Auditoria'},{id:'audit.manage',name:'Gerenciar Auditoria'}
  ]},
  {group:'CRM / WhatsApp',items:[
    {id:'crm.view',name:'Ver Painel Comercial do CRM'},{id:'crm.inbox.view',name:'Ver Inbox e conversas'},{id:'crm.inbox.manage',name:'Atender e enviar mensagens'},
    {id:'crm.automation.view',name:'Ver automações, blocos e aniversários'},{id:'crm.automation.manage',name:'Editar automações, blocos e aniversários'},{id:'crm.settings.manage',name:'Configurar conexão/armazenamento do WhatsApp'}
  ]},
  {group:'Loja Virtual / Site',items:[
    {id:'site.view',name:'Abrir administração do site'},{id:'site.products.view',name:'Ver produtos da Loja Virtual'},{id:'site.products.manage',name:'Editar produtos da Loja Virtual'},
    {id:'site.catalog.view',name:'Ver categorias/subcategorias do site'},{id:'site.catalog.manage',name:'Editar categorias/subcategorias do site'},
    {id:'site.content.view',name:'Ver páginas, banners, header e footer'},{id:'site.content.manage',name:'Editar páginas, banners, header e footer'},
    {id:'site.design.view',name:'Ver aparência e personalização'},{id:'site.design.manage',name:'Editar aparência e personalização'},
    {id:'site.seo.view',name:'Ver SEO'},{id:'site.seo.manage',name:'Editar SEO'},{id:'site.maintenance.view',name:'Ver manutenção do site'},{id:'site.maintenance.manage',name:'Alterar manutenção do site'},
    {id:'site.publish',name:'Publicar alterações do site'}
  ]},
  {group:'Negócio / Ferramentas',items:[
    {id:'analytics.view',name:'Ver Analytics'},{id:'analytics.manage',name:'Gerenciar Analytics'},{id:'marketing.view',name:'Ver Marketing'},{id:'marketing.manage',name:'Gerenciar Marketing'},
    {id:'tools.view',name:'Abrir Ferramentas'},{id:'compatibility.view',name:'Ver Compatibilidade'},{id:'compatibility.manage',name:'Editar Compatibilidade'}
  ]},
  {group:'Sistema',items:[
    {id:'settings.manage',name:'Configurações do sistema'},{id:'users.manage',name:'Usuários, acessos e permissões'}
  ]}
];

function clone(value){ return JSON.parse(JSON.stringify(value)); }
function sameRules(a=[],b=[]){
  const A=[...a].map(String).sort(),B=[...b].map(String).sort();
  return A.length===B.length && A.every((v,i)=>v===B[i]);
}
function clean(value=''){ return String(value??'').trim(); }

export default class PermissionService {
  constructor({ file }) {
    this.store = new JsonStore(file);
    this.ensureDefaults();
  }
  ensureDefaults(){
    const data=this.store.read();
    data.items=Array.isArray(data.items)?data.items:[];
    if(!data.items.length){ this.store.write({version:4,items:clone(DEFAULT_PROFILES)}); return; }
    let changed=false;
    for(const profileDefault of DEFAULT_PROFILES){
      const index=data.items.findIndex(item=>item.id===profileDefault.id);
      if(index<0){ data.items.push(clone(profileDefault)); changed=true; continue; }
      const current=data.items[index];
      if(sameRules(current.permissions||[],LEGACY_DEFAULTS[profileDefault.id]||[]) || sameRules(current.permissions||[],PREVIOUS_DEFAULTS_V3[profileDefault.id]||[])){
        current.permissions=clone(profileDefault.permissions);
        changed=true;
      }
      if(current.system!==true){ current.system=true; changed=true; }
      if(!clean(current.name)){ current.name=profileDefault.name; changed=true; }
      if(!clean(current.description)){ current.description=profileDefault.description; changed=true; }
    }
    if(data.version!==4){data.version=4;changed=true;}
    if(changed)this.store.write(data);
  }
  list() { return (this.store.read().items || []).map(clone); }
  get(id) { return this.list().find(x => x.id === id) || null; }
  catalog(){ return clone(PERMISSION_CATALOG); }
  can(profileId, permission) {
    const profile = this.get(profileId);
    if (!profile) return false;
    return (profile.permissions||[]).some(rule => rule === '*' || rule === permission || (rule.endsWith('.*') && permission.startsWith(rule.slice(0,-1))) || (rule === '*.view' && permission.endsWith('.view')));
  }
  saveProfile(id,payload={}){
    const profileId=clean(id);
    const data=this.store.read(); data.items=Array.isArray(data.items)?data.items:[];
    const index=data.items.findIndex(item=>item.id===profileId);
    if(index<0)throw new Error('Perfil não encontrado.');
    const current=data.items[index];
    const validPermissions=new Set(PERMISSION_CATALOG.flatMap(group=>group.items.map(item=>item.id)));
    let permissions=Array.isArray(payload.permissions)?payload.permissions.map(clean).filter(Boolean):[];
    if(profileId==='administrator')permissions=['*'];
    else permissions=[...new Set(permissions.filter(rule=>validPermissions.has(rule) || rule==='*.view'))];
    if(!permissions.length)throw new Error('Selecione pelo menos uma permissão para o perfil.');
    current.name=clean(payload.name)||current.name;
    current.description=clean(payload.description)||current.description||'';
    current.permissions=permissions;
    current.updatedAt=new Date().toISOString();
    data.items[index]=current; data.version=4; this.store.write(data);
    return clone(current);
  }
}
