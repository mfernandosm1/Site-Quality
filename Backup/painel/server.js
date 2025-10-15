import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import ejsMate from 'ejs-mate';
import fs from 'fs'; // 👈 necessário para checar o flag

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.engine('ejs', ejsMate);
const PORT = 3000;

const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = path.join(ROOT, 'Site_with_content');
const CONTENT_DIR = path.join(SITE_DIR, 'content');
const BACKUPS_DIR = path.join(SITE_DIR, 'backups');
const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.locals.paths = { ROOT, SITE_DIR, CONTENT_DIR, BACKUPS_DIR };

app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/public', express.static(PUBLIC_DIR));

// Routes
import indexRouter from './routes/index.js';
import headerRouter from './routes/header.js';
import footerRouter from './routes/footer.js';
import sobreRouter from './routes/sobre.js';
import pagamentosRouter from './routes/pagamentos.js';
import produtosRouter from './routes/produtos.js';
import categoriasRouter from './routes/categorias.js';
import paginasRouter from './routes/paginas.js';
import paginasIndexRouter from './routes/paginas_index.js';
import paginasSobreRouter from './routes/paginas_sobre.js';
import paginasFormasRouter from './routes/paginas_formas.js';
import manutencaoRouter from './routes/manutencao.js';
import publicarRouter from './routes/publicar.js';
import cssRouter from './routes/css.js';
import bannersRouter from './routes/banners.js';
import aparenciaRouter from './routes/aparencia.js';
import estilosRouter from './routes/estilos.js';
import sitePreviewRouter from './routes/sitepreview.js';

app.use('/', indexRouter);
app.use('/header', headerRouter);
app.use('/footer', footerRouter);
app.use('/sobre', sobreRouter);
app.use('/pagamentos', pagamentosRouter);
app.use('/produtos', produtosRouter);
app.use('/categorias', categoriasRouter);
app.use('/paginas', paginasRouter);
app.use('/paginas-index', paginasIndexRouter);
app.use('/paginas-sobre', paginasSobreRouter);
app.use('/paginas-formas', paginasFormasRouter);
app.use('/manutencao', manutencaoRouter);
app.use('/publicar', publicarRouter);
app.use('/css', cssRouter);
app.use('/banners', bannersRouter);
app.use('/aparencia', aparenciaRouter);
app.use('/estilos', estilosRouter);

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

app.listen(PORT, () =>
  console.log(`Painel Quality V7.3 em http://localhost:${PORT}`)
);
