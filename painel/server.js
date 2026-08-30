import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import ejsMate from 'ejs-mate';
import fs from 'fs'; // 👈 necessário para checar o flag
import KernelService from './services/kernel/kernel-service.js';
import requestLogger from './services/kernel/request-logger.js';
import CommerceService from './services/commerce-service.js';
import InventoryService from './services/inventory-service.js';
import UserService from './services/user-service.js';
import AuthService from './services/auth-service.js';
import { applyOneTimeWm10CountBatch20260830 } from './services/one-time-wm10-count-batch-20260830.js';
import { updateHeaderMenu, generateCategoryPage } from './routes/main_utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.engine('ejs', ejsMate);
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'Site_with_content');
const CONTENT_DIR = path.join(SITE_DIR, 'content');
const BACKUPS_DIR = path.join(SITE_DIR, 'backups');
const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.locals.paths = { ROOT, SITE_DIR, CONTENT_DIR, BACKUPS_DIR, PUBLIC_DIR };


function readSiteItems(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : []);
  } catch (_) {
    return [];
  }
}

function syncPublicCatalogArtifacts() {
  try {
    if (!fs.existsSync(SITE_DIR)) return;
    const categories = readSiteItems(path.join(CONTENT_DIR, 'categories.json'));
    const subcategories = readSiteItems(path.join(CONTENT_DIR, 'subcategories.json'));
    if (!categories.length) return;

    updateHeaderMenu(categories, SITE_DIR, subcategories);
    generateCategoryPage('', '', SITE_DIR);

    console.log(`🌐 Catálogo público sincronizado: ${categories.length} categoria(s), ${subcategories.length} subcategoria(s).`);
  } catch (error) {
    console.warn('⚠️ Não foi possível sincronizar categorias/subcategorias do site:', error?.message || error);
  }
}

const COMPANY_PROFILE_FILE = path.join(__dirname, 'data', 'platform', 'company.json');
let companyProfileCache = { at:0, mtimeMs:-1, data:{} };
function loadCompanyProfile(){
  const now=Date.now();
  if(now-companyProfileCache.at<3000 && companyProfileCache.data) return companyProfileCache.data;
  try{
    const stat=fs.statSync(COMPANY_PROFILE_FILE);
    if(stat.mtimeMs!==companyProfileCache.mtimeMs){
      companyProfileCache.data=JSON.parse(fs.readFileSync(COMPANY_PROFILE_FILE,'utf8'));
      companyProfileCache.mtimeMs=stat.mtimeMs;
    }
  }catch(_){ companyProfileCache.data=companyProfileCache.data||{}; }
  companyProfileCache.at=now;
  return companyProfileCache.data||{};
}
app.locals.refreshCompanyProfile=()=>{companyProfileCache.at=0;return loadCompanyProfile();};



function normalizeKey(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Quality ERP · Estoque
 *
 * Garante que todos os PRODUTOS físicos existentes tenham controle de estoque
 * habilitado. Serviços continuam sem controle de estoque.
 *
 * A migração é idempotente: somente cria identidade/saldo para itens que ainda
 * não possuem registro no estoque. Saldos já controlados nunca são sobrescritos.
 */
function ensureAllPhysicalProductsStockControlled() {
  const productsFile = path.join(CONTENT_DIR, 'products.json');
  if (!fs.existsSync(productsFile)) return;

  let data;
  try {
    data = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  } catch (error) {
    console.error('⚠️ Não foi possível preparar o controle de estoque dos produtos:', error?.message || error);
    return;
  }

  data.items = Array.isArray(data.items) ? data.items : [];
  if (!data.items.length) return;

  const categoriesFile = path.join(CONTENT_DIR, 'erp', 'catalog', 'categories.json');
  const legacyCategoriesFile = path.join(CONTENT_DIR, 'categories.json');
  let categories = [];
  for (const file of [categoriesFile, legacyCategoriesFile]) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      const list = Array.isArray(parsed) ? parsed : (parsed.items || []);
      if (list.length) categories.push(...list);
    } catch (_) {}
  }

  const serviceCategoryKeys = new Set();
  for (const category of categories) {
    if (normalizeKey(category?.type) !== 'service') continue;
    for (const value of [category?.id, category?.code, category?.slug, category?.name]) {
      const key = normalizeKey(value);
      if (key) serviceCategoryKeys.add(key);
    }
  }

  const inventory = new InventoryService({ dataDir: path.join(__dirname, 'data', 'erp', 'inventory') });
  const locationId = inventory.getDefaultLocationId();
  const stockDb = inventory.readJson(inventory.stockFile, { version: '0.11.9', items: [] });
  stockDb.items = Array.isArray(stockDb.items) ? stockDb.items : [];
  const existingStockKeys = new Set(
    stockDb.items.map(row => `${String(row.inventoryItemId || '')}::${String(row.locationId || locationId)}`)
  );

  let changedProducts = 0;
  let enabledProducts = 0;
  let initializedBalances = 0;

  const initializeBalanceIfMissing = (inventoryItemId, quantity, minimumQuantity = 0) => {
    const id = String(inventoryItemId || '').trim();
    if (!id) return;
    const key = `${id}::${String(locationId)}`;
    if (existingStockKeys.has(key)) return;

    stockDb.items.push({
      inventoryItemId: id,
      locationId,
      physicalQuantity: Math.max(0, Number(quantity) || 0),
      reservedQuantity: 0,
      minimumQuantity: Math.max(0, Number(minimumQuantity) || 0),
      updatedAt: new Date().toISOString()
    });
    existingStockKeys.add(key);
    initializedBalances++;
  };

  for (const product of data.items) {
    const categoryKeys = [
      product?.erp?.categoryId,
      product?.erp?.category,
      product?.category,
      product?.subcategory
    ].map(normalizeKey).filter(Boolean);

    const isService = normalizeKey(product?.erp?.type) === 'service'
      || categoryKeys.some(key => serviceCategoryKeys.has(key));

    if (isService) continue;

    let changed = false;
    product.inventory = product.inventory && typeof product.inventory === 'object'
      ? product.inventory
      : {};

    if (!product.inventory.itemId) {
      product.inventory.itemId = `PRD-${product.id || Date.now()}`;
      changed = true;
    }
    // Migração: somente define o padrão quando o campo ainda não existe.
    // Um produto marcado explicitamente como "não controlar estoque" deve continuar assim
    // após reiniciar o ERP (ex.: itens genéricos/operacionais como "Vendas Diversas").
    if (product.inventory.stockControlled === undefined || product.inventory.stockControlled === null) {
      product.inventory.stockControlled = true;
      enabledProducts++;
      changed = true;
    }
    if (product.inventory.allowNegative === undefined) {
      product.inventory.allowNegative = false;
      changed = true;
    }
    if (!product.inventory.channelAvailability) {
      product.inventory.channelAvailability = {
        site: { mode: 'shared', enabled: true, limit: null, physicalSafety: 0 }
      };
      changed = true;
    }

    const combinations = Array.isArray(product?.variations?.combinations)
      ? product.variations.combinations
      : [];

    if (combinations.length) {
      combinations.forEach((combo, index) => {
        if (!combo.inventoryItemId) {
          combo.inventoryItemId = `VAR-${product.id || 'LEG'}-${index + 1}`;
          changed = true;
        }
        initializeBalanceIfMissing(
          combo.inventoryItemId,
          combo.stock,
          product.inventory.minimumQuantity
        );
      });
    } else {
      initializeBalanceIfMissing(
        product.inventory.itemId,
        product.stock,
        product.inventory.minimumQuantity
      );
    }

    if (changed) changedProducts++;
  }

  if (changedProducts > 0) {
    try {
      const backupDir = path.join(BACKUPS_DIR, 'erp-stock-control');
      fs.mkdirSync(backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(productsFile, path.join(backupDir, `products-before-enable-all-${stamp}.json`));
    } catch (error) {
      console.warn('⚠️ Não foi possível criar backup da ativação global de estoque:', error?.message || error);
    }

    const tmp = `${productsFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, productsFile);
  }

  if (initializedBalances > 0) {
    inventory.writeJsonAtomic(inventory.stockFile, stockDb);
  }

  if (changedProducts > 0 || initializedBalances > 0) {
    console.log(
      `📦 Controle de estoque global preparado: ${enabledProducts} produto(s) ativado(s), ` +
      `${initializedBalances} saldo(s) inicializado(s). Serviços foram preservados sem estoque.`
    );
  }
}

app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);
app.use(bodyParser.urlencoded({ extended: true, limit: '15mb' }));
app.use(bodyParser.json({ limit: '15mb' }));
app.use('/public', express.static(PUBLIC_DIR));
app.use((req,res,next)=>{ res.locals.panelCompany=loadCompanyProfile(); next(); });

// Quality ERP — Kernel, usuários e autenticação global
app.locals.kernelService = new KernelService({ dataDir: path.join(__dirname, 'data', 'kernel') });
app.locals.commerceService = new CommerceService({ dataDir: path.join(__dirname, 'data', 'erp', 'commerce') });
app.locals.userService = new UserService({ dataDir: path.join(__dirname, 'data', 'erp', 'users') });
app.locals.authService = new AuthService({
  dataDir: path.join(__dirname, 'data', 'erp', 'users'),
  userService: app.locals.userService,
  permissionService: app.locals.kernelService.permissions
});
// Resolve o usuário antes do logger para que auditoria e operações recebam o ator real.
app.use(app.locals.authService.attachUser());
app.use(requestLogger(app.locals.kernelService));

// Routes
import indexRouter from './routes/index.js';
import headerRouter from './routes/header.js';
import footerRouter from './routes/footer.js';
import sobreRouter from './routes/sobre.js';
import pagamentosRouter from './routes/pagamentos.js';
import produtosRouter from './routes/produtos.js';
import marketingRouter from './routes/marketing.js';
import categoriasRouter from './routes/categorias.js';
import subcategoriasRouter from './routes/subcategorias.js';
import paginasRouter from './routes/paginas.js';
import paginasIndexRouter from './routes/paginas_index.js';
import paginasSobreRouter from './routes/paginas_sobre.js';
import paginasFormasRouter from './routes/paginas_formas.js';
import manutencaoRouter from './routes/manutencao.js';
import publicarRouter from './routes/publicar.js';
import cssRouter from './routes/css.js';
import bannersRouter from './routes/banners.js';
import aparenciaRouter from './routes/aparencia.js';
import personalizacaoRouter from './routes/personalizacao.js';
import estilosRouter from './routes/estilos.js';
import seoRouter from './routes/seo.js';
import sitePreviewRouter from './routes/sitepreview.js';
import sorteiosRouter from './routes/sorteios.js';
import analyticsRouter from './routes/analytics.js';
import erpRouter from './routes/erp.js';
import erpCategoriesRouter from './routes/erp_categories.js';
import compatibilidadeRouter from './routes/compatibilidade.js';
import orcamentosRouter from './routes/orcamentos.js';
import navigationRouter from './routes/navigation.js';
import configuracoesRouter from './routes/configuracoes.js';
import kernelRouter from './routes/kernel.js';
import authRouter from './routes/auth.js';
import automacaoWhatsappRouter, { initializeWhatsApp, shutdownWhatsApp } from './routes/automacao_whatsapp.js';

// Login / primeiro acesso ficam fora do bloqueio de permissões.
app.use('/', authRouter);
// Somente rotas administrativas conhecidas são protegidas. O preview público em /site
// e as URLs amigáveis do catálogo continuam acessíveis sem login.
app.use(app.locals.authService.authorizeRequests());

app.use('/', indexRouter);
app.use('/header', headerRouter);
app.use('/footer', footerRouter);
app.use('/sobre', sobreRouter);
app.use('/pagamentos', pagamentosRouter);
app.use('/produtos', produtosRouter);
app.use('/marketing', marketingRouter);
app.use('/categorias', categoriasRouter);
app.use('/subcategorias', subcategoriasRouter);
app.use('/paginas', paginasRouter);
app.use('/paginas-index', paginasIndexRouter);
app.use('/paginas-sobre', paginasSobreRouter);
app.use('/paginas-formas', paginasFormasRouter);
app.use('/manutencao', manutencaoRouter);
app.use('/publicar', publicarRouter);
app.use('/css', cssRouter);
app.use('/banners', bannersRouter);
app.use('/aparencia', aparenciaRouter);
app.use('/personalizacao', personalizacaoRouter);
app.use('/estilos', estilosRouter);
app.use('/seo', seoRouter);
app.use('/sorteios', sorteiosRouter);
app.use('/analytics', analyticsRouter);
app.use('/erp/categorias', erpCategoriesRouter);
app.use('/erp', erpRouter);
app.use('/compatibilidade', compatibilidadeRouter);
app.use('/orcamentos', orcamentosRouter);
app.use('/', navigationRouter);
app.use('/configuracoes', configuracoesRouter);
app.use('/kernel', kernelRouter);
app.use('/automacao-whatsapp', automacaoWhatsappRouter);


// ===== ASSETS DO SITE NO PREVIEW LOCAL =====
// Permite que URLs amigáveis (/eletronicos/ e /produto/slug/) carreguem CSS, JS, imagens e JSON do site.
app.get('/css/style.css', (req, res) => {
  res.sendFile(path.join(SITE_DIR, 'css', 'style.css'));
});
app.use('/content', express.static(path.join(SITE_DIR, 'content')));
app.use('/images', express.static(path.join(SITE_DIR, 'images')));
app.use('/js', express.static(path.join(SITE_DIR, 'js')));
app.get('/header.html', (req, res) => {
  res.sendFile(path.join(SITE_DIR, 'header.html'));
});
app.get('/footer.html', (req, res) => {
  res.sendFile(path.join(SITE_DIR, 'footer.html'));
});


// ===== MODO MANUTENÇÃO: intercepta TUDO em /site =====
const MAINT_FLAG = path.join(SITE_DIR, 'maintenance.flag');
const MAINT_HTML = path.join(SITE_DIR, 'maintenance.html');

/**
 * Este middleware vem ANTES de qualquer outro handler de /site.
 * Se o flag existir, qualquer URL de /site responderá com maintenance.html,
 * impedindo a navegação pelas abas do site.
 *
 * Se quiser responder como 503 (Service Unavailable) para SEO/CDN,
 * descomente as duas linhas de status e header abaixo.
 */
app.use('/site', (req, res, next) => {
  try {
    if (fs.existsSync(MAINT_FLAG) && fs.existsSync(MAINT_HTML)) {
      // res.status(503); // opcional: HTTP 503
      // res.set('Retry-After', '3600'); // opcional: 1h
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.sendFile(MAINT_HTML);
    }
  } catch (_) {
    // se algo falhar, segue fluxo normal
  }
  return next();
});

// Se NÃO estiver em manutenção, segue para o preview/estático do site
app.use('/site', sitePreviewRouter);
app.use('/site', express.static(SITE_DIR));


// Redireciona index.html para a raiz
app.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});


// ===== URLs AMIGÁVEIS NO PREVIEW LOCAL =====
app.get('/produto/:slug/', (req, res) => {
  res.sendFile(path.join(SITE_DIR, 'produto.html'));
});

app.get('/produto/:slug', (req, res) => {
  res.sendFile(path.join(SITE_DIR, 'produto.html'));
});

app.get('/:slug/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(SITE_DIR, 'categoria.html'));
});

app.get('/:slug', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(SITE_DIR, 'categoria.html'));
});

const server = app.listen(PORT, HOST, async () => {
  console.log(`Painel Quality ERP v0.15.2 iniciado na porta ${PORT}`);
  console.log(`Acesso local: http://localhost:${PORT}`);
  console.log(`Acesso remoto: http://IP-TAILSCALE-DESTE-PC:${PORT}`);
  app.locals.kernelService.events.publish({ name: 'SYSTEM_STARTED', module: 'system', actor: 'sistema', data: { version: '0.15.2', port: PORT } });
  app.locals.kernelService.logs.record({ category: 'system', module: 'system', action: 'SYSTEM_STARTED', actor: 'sistema', label: 'Painel Quality ERP iniciado', details: { version: '0.15.2', port: PORT } });
  // Reconstroi o menu e categoria.html no boot. Assim instalações que já tinham
  // subcategorias salvas deixam de depender de editar/salvar novamente.
  syncPublicCatalogArtifacts();
  ensureAllPhysicalProductsStockControlled();
  try {
    await applyOneTimeWm10CountBatch20260830({ app });
  } catch (error) {
    console.error('Falha ao aplicar a contagem assistida WM10 de 30/08/2026:', error?.message || error);
  }
  await initializeWhatsApp(app);

  // Verifica o fechamento automático do caixa em intervalos curtos.
  // O serviço processa fechamentos simples e trocas de turno automáticas.
  const runAutomaticCashboxCycle = () => {
    try {
      const commerceService = app.locals.commerceService;
      if (!commerceService || typeof commerceService.processAutomaticCashboxes !== 'function') return;
      const actions = commerceService.processAutomaticCashboxes(new Date());
      for (const action of actions) {
        const label = action.action === 'closed' ? 'fechado automaticamente' : 'reaberto automaticamente';
        console.log(`Caixa ${action.cashboxId} ${label}.`);
        app.locals.kernelService.logs.record({
          category: 'erp', module: 'cashbox', action: `CASHBOX_AUTO_${String(action.action).toUpperCase()}`,
          actor: 'sistema', label: `Caixa ${label}`, details: action
        });
      }
    } catch (error) {
      console.error('Falha no ciclo automático do caixa:', error?.message || error);
    }
  };
  runAutomaticCashboxCycle();
  app.locals.automaticCashboxTimer = setInterval(runAutomaticCashboxCycle, 5000);
  app.locals.automaticCashboxTimer.unref?.();
});

async function gracefulShutdown(signal) {
  console.log(`\n${signal}: encerrando Painel Quality...`);
  app.locals.kernelService.events.publish({ name: 'SYSTEM_SHUTDOWN', module: 'system', actor: 'sistema', data: { signal } });
  app.locals.kernelService.logs.record({ category: 'system', module: 'system', action: 'SYSTEM_SHUTDOWN', actor: 'sistema', label: 'Painel Quality ERP encerrando', details: { signal } });
  await shutdownWhatsApp();
  await app.locals.kernelService?.logs?.flush?.();
  if (app.locals.automaticCashboxTimer) clearInterval(app.locals.automaticCashboxTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
