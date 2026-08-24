import express from 'express';

const router = express.Router();

const AREAS = {
  crm: {
    title: 'CRM e Relacionamento', icon: '💬', description: 'Atendimento, histórico, WhatsApp, lembretes e automações.',
    items: [
      { name: 'Inbox', href: '/automacao-whatsapp?tab=inbox', icon: '💬', description: 'Conversas, contatos, notas, lembretes e atendimento.', descriptionAsInfo: true },
      { name: 'Automações', href: '/automacao-whatsapp', icon: '⚡', description: 'Blocos, mídias, fluxos e ações futuras.' },
      { name: 'Analytics Comercial', href: '/analytics', icon: '📊', description: 'Acompanhe interações, origem e oportunidades.' }
    ]
  },
  site: {
    title: 'Site', icon: '🌐', description: 'Conteúdo público, catálogo, aparência, SEO e publicação.',
    items: [
      { name: 'Produtos do Site', href: '/produtos', icon: '📦', description: 'Catálogo público atual e futura sincronização com o ERP.' },
      { name: 'Categorias da Loja Virtual', href: '/categorias', icon: '🗂️', description: 'SEO, URLs, banners, ícones e navegação das categorias públicas.' },
      { name: 'Banners', href: '/banners', icon: '🖼️', description: 'Slides e campanhas visuais.' },
      { name: 'SEO', href: '/seo', icon: '🔎', description: 'Metadados, sitemap e estrutura para buscadores.' },
      { name: 'Páginas', href: '/paginas', icon: '📄', description: 'Conteúdo das páginas públicas.' },
      { name: 'Personalização', href: '/personalizacao', icon: '🎨', description: 'Aparência do site e do Painel.' },
      { name: 'Cabeçalho', href: '/header', icon: '🧭', description: 'Menu e navegação pública.' },
      { name: 'Rodapé', href: '/footer', icon: '🔻', description: 'Dados, redes sociais e links institucionais.' },
      { name: 'Manutenção do site', href: '/manutencao', icon: '🛠️', description: 'Ative ou desative a página temporária de manutenção.' }
    ]
  },
  marketing: {
    title: 'Marketing', icon: '✨', description: 'Conteúdo, campanhas, promoções e inteligência de marketing.',
    items: [
      { name: 'Marketing IA', href: '/marketing', icon: '🤖', description: 'Planejamento e criação assistida.' },
      { name: 'Promoções e Sorteios', href: '/sorteios', icon: '🎉', description: 'Campanhas e ações promocionais.' },
      { name: 'Analytics', href: '/analytics', icon: '📈', description: 'Dados de tráfego, produtos e conversões.' }
    ]
  },
  ferramentas: {
    title: 'Ferramentas', icon: '🧰', description: 'Utilitários independentes e recursos de apoio à operação.',
    items: [
      { name: 'Compatibilidade de Capas', href: '/compatibilidade?tipo=capas', icon: '📱', description: 'Consulte e cadastre capas compatíveis por aparelho.' },
      { name: 'Compatibilidade de Películas', href: '/compatibilidade?tipo=peliculas', icon: '🛡️', description: 'Consulte e cadastre películas compatíveis por aparelho.' },
      { name: 'Calculadora Comercial', href: '#', icon: '🧮', description: 'Lógica da planilha em estudo para integração ao ERP.', disabled: true },
      { name: 'Backup', href: '#', icon: '💾', description: 'Central de backup planejada.', disabled: true },
      { name: 'Atualizações', href: '#', icon: '🔄', description: 'Controle de versões planejado.', disabled: true }
    ]
  }
};

router.get('/crm', (req, res) => {
  res.redirect('/automacao-whatsapp');
});

router.get('/:area(site|marketing|ferramentas)', (req, res) => {
  res.render('area_hub', { flash: null, area: AREAS[req.params.area] });
});

export default router;
