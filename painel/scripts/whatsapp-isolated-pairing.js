import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import whatsappWeb from 'whatsapp-web.js';
import qrcode from 'qrcode';

const { Client, LocalAuth } = whatsappWeb;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PANEL_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(PANEL_DIR, '..');
const CONTENT_DIR = path.join(ROOT, 'Site_with_content', 'content');
const AUTH_DIR = path.join(CONTENT_DIR, 'automacao_whatsapp', 'session');
const CLIENT_ID = 'quality-teste';
const SESSION_DIR = path.join(AUTH_DIR, `session-${CLIENT_ID}`);
const QR_FILE = path.join(AUTH_DIR, 'whatsapp-pareamento-isolado.png');
const TEST_TIMEOUT_MS = 4 * 60 * 1000;

let client = null;
let backupPath = '';
let finished = false;
let ready = false;
let authenticated = false;
let qrCount = 0;
let timeoutHandle = null;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function detectChrome() {
  if (process.platform !== 'win32') return '';
  const candidates = [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];
  return candidates.find(candidate => candidate && fs.existsSync(candidate)) || '';
}

function printHeader() {
  console.log('');
  console.log('=============================================================');
  console.log(' Quality ERP - teste ISOLADO de pareamento whatsapp-web.js');
  console.log('=============================================================');
  console.log('');
  console.log('Este teste NÃO carrega Inbox, CRM, aniversariantes ou automações.');
  console.log('Ele serve apenas para criar uma sessão limpa do WhatsApp Web.');
  console.log('');
  console.log('IMPORTANTE:');
  console.log('1) O servidor do Quality ERP deve estar totalmente FECHADO.');
  console.log('2) Escaneie o QR apenas UMA vez.');
  console.log('3) Não use o botão "Novo QR" do painel durante este teste.');
  console.log('');
}

function backupCurrentSession() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  if (!fs.existsSync(SESSION_DIR)) return;

  backupPath = `${SESSION_DIR}-backup-isolado-${stamp()}`;
  try {
    fs.renameSync(SESSION_DIR, backupPath);
    console.log(`Backup da sessão anterior criado em:\n${backupPath}\n`);
  } catch (error) {
    const wrapped = new Error(
      `Não consegui isolar a sessão atual (${error.code || error.message}). ` +
      'Feche o servidor do ERP e qualquer Chrome/Chromium aberto pelo painel e execute novamente.'
    );
    wrapped.cause = error;
    throw wrapped;
  }
}

function removeFreshSession() {
  if (!fs.existsSync(SESSION_DIR)) return;
  try {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true, maxRetries: 8, retryDelay: 350 });
  } catch (error) {
    const failedPath = `${SESSION_DIR}-falhou-${stamp()}`;
    try {
      fs.renameSync(SESSION_DIR, failedPath);
      console.warn(`A sessão nova com falha foi preservada em:\n${failedPath}`);
    } catch {
      console.warn(`Não consegui remover a sessão nova com falha: ${error.message || error}`);
    }
  }
}

function restorePreviousSession() {
  if (ready) return;
  removeFreshSession();
  if (!backupPath || !fs.existsSync(backupPath)) return;

  try {
    fs.renameSync(backupPath, SESSION_DIR);
    console.log('A sessão anterior foi restaurada automaticamente.');
    backupPath = '';
  } catch (error) {
    console.warn('ATENÇÃO: não consegui restaurar automaticamente a sessão anterior.');
    console.warn(`Backup preservado em: ${backupPath}`);
    console.warn(error.message || error);
  }
}

async function closeClient() {
  if (!client) return;
  try {
    await client.destroy();
  } catch (error) {
    console.warn(`Aviso ao fechar o navegador do teste: ${error.message || error}`);
  }
  client = null;
  await sleep(1200);
}

async function finishFailure(reason, details = '') {
  if (finished) return;
  finished = true;
  if (timeoutHandle) clearTimeout(timeoutHandle);

  console.log('');
  console.error('TESTE ISOLADO NÃO CONCLUIU O PAREAMENTO.');
  console.error(reason);
  if (details) console.error(details);
  console.log('Nenhuma mensagem foi enviada pelo teste.');

  await closeClient();
  restorePreviousSession();
  process.exitCode = 1;
}

async function finishSuccess() {
  if (finished) return;
  finished = true;
  ready = true;
  if (timeoutHandle) clearTimeout(timeoutHandle);

  let state = null;
  try { state = await client.getState(); } catch {}
  const info = client?.info || {};
  const number = info?.wid?.user || '';
  const name = info?.pushname || '';

  console.log('');
  console.log('PAREAMENTO ISOLADO CONCLUÍDO COM SUCESSO.');
  if (number) console.log(`Número: +${number}`);
  if (name) console.log(`Nome: ${name}`);
  if (state) console.log(`Estado: ${state}`);
  console.log('Aguardando alguns segundos para gravar a sessão local...');

  await sleep(7000);
  await closeClient();

  console.log('');
  console.log('Sessão nova preservada para o Quality ERP.');
  console.log(`Pasta ativa: ${SESSION_DIR}`);
  if (backupPath) console.log(`Backup da sessão anterior: ${backupPath}`);
  console.log('');
  console.log('Agora você pode iniciar o Quality ERP normalmente.');
  console.log('O painel deverá reutilizar esta sessão sem pedir outro QR Code.');
  process.exitCode = 0;
}

async function main() {
  printHeader();
  backupCurrentSession();

  const chromePath = detectChrome();
  console.log(`Chrome: ${chromePath || 'navegador padrão do Puppeteer'}`);
  console.log(`Sessão de teste: ${SESSION_DIR}`);
  console.log('Abrindo o WhatsApp Web em uma janela separada...\n');

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: CLIENT_ID,
      dataPath: AUTH_DIR,
      rmMaxRetries: 8
    }),
    authTimeoutMs: 90000,
    qrMaxRetries: 2,
    puppeteer: {
      headless: false,
      executablePath: chromePath || undefined,
      protocolTimeout: 120000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', async qr => {
    qrCount += 1;
    try {
      await qrcode.toFile(QR_FILE, qr, { width: 420, margin: 2, errorCorrectionLevel: 'M' });
    } catch (error) {
      console.warn(`Não consegui salvar a imagem do QR: ${error.message || error}`);
    }

    if (qrCount === 1) {
      console.log('QR GERADO.');
      console.log('No celular: WhatsApp Business > Dispositivos conectados > Conectar dispositivo.');
      console.log('Escaneie UMA única vez o QR que apareceu na janela do Chrome.');
      console.log(`Também salvei uma cópia em:\n${QR_FILE}\n`);
    } else {
      console.log(`O WhatsApp renovou o QR (${qrCount}/2). Não faça várias tentativas seguidas.`);
    }
  });

  client.on('authenticated', () => {
    authenticated = true;
    console.log('QR aceito pelo WhatsApp. Aguardando a sessão ficar pronta...');
  });

  client.on('ready', () => {
    finishSuccess().catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  });

  client.on('auth_failure', message => {
    finishFailure('O WhatsApp recusou a autenticação do teste isolado.', String(message || '')).catch(() => {});
  });

  client.on('disconnected', reason => {
    if (finished || ready) return;
    finishFailure(
      authenticated
        ? 'A sessão chegou a autenticar, mas foi desconectada antes de ficar pronta.'
        : 'O WhatsApp Web foi desconectado antes de concluir o pareamento.',
      `Motivo: ${String(reason || 'não informado')}`
    ).catch(() => {});
  });

  client.on('change_state', state => {
    console.log(`Estado do WhatsApp: ${state}`);
  });

  timeoutHandle = setTimeout(() => {
    finishFailure(
      'Tempo limite de 4 minutos atingido sem concluir o pareamento.',
      authenticated
        ? 'O QR chegou a ser aceito, mas a sessão não ficou pronta.'
        : 'O QR não chegou a ser autenticado.'
    ).catch(() => {});
  }, TEST_TIMEOUT_MS);

  try {
    await client.initialize();
  } catch (error) {
    await finishFailure('Falha ao inicializar o whatsapp-web.js isoladamente.', error?.stack || error?.message || String(error));
  }
}

process.on('SIGINT', async () => {
  if (finished) process.exit(0);
  await finishFailure('Teste interrompido pelo usuário.');
  process.exit(1);
});

process.on('SIGTERM', async () => {
  if (finished) process.exit(0);
  await finishFailure('Teste encerrado antes da conclusão.');
  process.exit(1);
});

main().catch(async error => {
  await finishFailure('Erro inesperado no teste isolado.', error?.stack || error?.message || String(error));
});
