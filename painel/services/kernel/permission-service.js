import JsonStore from './json-store.js';

const DEFAULT_PROFILES = [
  { id:'administrator', name:'Administrador', description:'Acesso total ao painel e às configurações.', permissions:['*'] },
  { id:'manager', name:'Gerente', description:'Operação ampla, relatórios e aprovações.', permissions:['dashboard.view','erp.view','pdv.*','customers.*','products.view','inventory.view','reports.view'] },
  { id:'seller', name:'Vendedor', description:'Atendimento, clientes, produtos e vendas.', permissions:['dashboard.view','pdv.*','customers.*','products.view','inventory.view'] },
  { id:'service', name:'Assistência', description:'Ordens de serviço, clientes e consulta de estoque.', permissions:['dashboard.view','service_orders.*','customers.*','products.view','inventory.view'] },
  { id:'finance', name:'Financeiro', description:'Caixa, contas, recebimentos e relatórios financeiros.', permissions:['dashboard.view','cash.*','finance.*','reports.finance'] },
  { id:'stock', name:'Estoque', description:'Produtos, entradas, saídas e ajustes de estoque.', permissions:['dashboard.view','products.view','inventory.*','suppliers.view'] },
  { id:'readonly', name:'Somente leitura', description:'Consulta sem autorização para alterar registros.', permissions:['dashboard.view','*.view'] }
];

export default class PermissionService {
  constructor({ file }) {
    this.store = new JsonStore(file);
    const data = this.store.read();
    if (!Array.isArray(data.items) || !data.items.length) this.store.write({ version:1, items:DEFAULT_PROFILES });
  }
  list() { return this.store.read().items || []; }
  get(id) { return this.list().find(x => x.id === id) || null; }
  can(profileId, permission) {
    const profile = this.get(profileId);
    if (!profile) return false;
    return profile.permissions.some(rule => rule === '*' || rule === permission || (rule.endsWith('.*') && permission.startsWith(rule.slice(0,-1))) || (rule === '*.view' && permission.endsWith('.view')));
  }
}
