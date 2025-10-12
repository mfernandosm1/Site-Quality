import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import ejsMate from 'ejs-mate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.engine('ejs', ejsMate);
const PORT = 3000;

// ========================
// 🔧 Caminhos do sistema
// ========================
const ROOT = path.resolve(__dirname, '..');
const SITE_DIR = "C:\\Site";              // <-- Caminho fixo do site real
const BACKUPS_DIR = "C:\\Site\\Backup";   // <-- Caminho fixo do backup
const CONTENT_DIR = path.join(SITE_DIR, 'content');
const VIEWS_DIR = path.join(__dirname, 'views');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.locals.paths = { ROOT, SITE_DIR, CONTENT_DIR, BACKUPS_DIR };

// ========================
// 🔧 Configurações Express
// ========================
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

// ✅ Parsers que garantem leitura de req.body.html / req.body.content
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Arquivos públicos
app.use('/public', express.static(PUBLIC_DIR));

// ========================
// 🔧 Rotas
// ========================
import indexRouter from './routes/index.js';
import headerRouter from './routes/header.js';
import footerRouter from './routes/footer.js';
import sobreRouter from './routes/sobre.js';
import pagamentosRouter from './routes/pagamentos.js';
import produtosRouter from './routes/produtos.js';
import categoriasRouter from './routes/categorias.js';
import paginasRouter from './routes/paginas.js';
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
app.use('/manutencao', manutencaoRouter);
app.use('/publicar', publicarRouter);
app.use('/css', cssRouter);
app.use('/banners', bannersRouter);
app.use('/aparencia', aparenciaRouter);
app.use('/estilos', estilosRouter);
app.use('/site', sitePreviewRouter);

// ✅ Libera o site real para pré-visualização
app.use('/site', express.static(SITE_DIR));

// ========================
// 🔧 Inicialização
// ========================
app.listen(PORT, () => {
  console.log(`Painel Quality V7.3 em http://localhost:${PORT}`);
  console.log(`🚀 Editando arquivos em: ${SITE_DIR}`);
});
