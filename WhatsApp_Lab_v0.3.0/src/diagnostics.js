import fs from 'fs';
import crypto from 'crypto';
import { runTest } from './report.js';
import { sleep } from './utils.js';

function requireDirectSuccess(result, label) {
  if (!result?.ok) {
    const error = new Error(result?.error?.message || `${label} falhou.`);
    if (result?.error?.stack) error.stack = result.error.stack;
    throw error;
  }
  return result;
}

export async function runDeepDiagnostics(provider, config, report) {
  await runTest(report, 'Configuração da sessão', async () => {
    if (!fs.existsSync(config.sessionPath)) throw new Error(`Pasta de sessão não encontrada: ${config.sessionPath}`);
    return { sessionPath: config.sessionPath, clientId: config.clientId };
  });
  await runTest(report, 'Chrome detectado', async () => {
    if (!config.chromePath) throw new Error('Google Chrome não encontrado. Configure CHROME_PATH no .env.');
    return { chromePath: config.chromePath };
  });
  await runTest(report, 'Biblioteca whatsapp-web.js', async () => provider.getLibraryInfo());

  const connection = await runTest(report, 'Inicialização até ready', () => provider.connect());
  if (!connection.ok) return false;

  await runTest(report, 'client.info', async () => provider.getClientInfo());
  const versions = await runTest(report, 'Versões reais do ambiente', async () => provider.getRuntimeVersions());
  const snapshot = await runTest(report, 'Inspeção profunda da página', async () => provider.inspectPageDeep());
  const functions = await runTest(report, 'Assinaturas internas do window.WWebJS', async () => provider.inspectWWebJSFunctions());

  await runTest(report, 'Controle: client.getChats()', async () => {
    const result = await provider.getChats();
    return { count: result.count, sample: result.sample };
  });

  const directChats = await runTest(report, 'Direto: window.WWebJS.getChats()', async () => {
    return requireDirectSuccess(await provider.callDirectWWebJS('getChats'), 'WWebJS.getChats');
  });
  const directContacts = await runTest(report, 'Direto: window.WWebJS.getContacts()', async () => {
    return requireDirectSuccess(await provider.callDirectWWebJS('getContacts'), 'WWebJS.getContacts');
  });

  report.log('INFO', `Observando eventos por ${config.eventObservationMs} ms para capturar IDs reais.`);
  const observed = await runTest(report, 'Captura de IDs por eventos', async () => provider.observeEvents());
  const ids = observed.details?.ids || provider.getRecentIds();
  const ownId = provider.getClientInfo().wid;
  const chatId = ids.chats?.[0] || null;
  const contactId = ids.contacts?.[0] || ownId;

  await runTest(report, 'Direto: window.WWebJS.getChat(id real)', async () => {
    if (!chatId) throw new Error('Nenhum ID de chat foi capturado pelos eventos.');
    return requireDirectSuccess(await provider.callDirectWWebJS('getChat', [chatId]), 'WWebJS.getChat');
  });
  await runTest(report, 'Direto: window.WWebJS.getContact(id real)', async () => {
    if (!contactId) throw new Error('Nenhum ID de contato foi capturado.');
    return requireDirectSuccess(await provider.callDirectWWebJS('getContact', [contactId]), 'WWebJS.getContact');
  });
  await runTest(report, 'Controle: client.getContactById(próprio número)', async () => provider.getContactById(ownId));

  if (config.settleAfterReadyMs > 0) {
    report.log('INFO', `Aguardando estabilização adicional por ${config.settleAfterReadyMs} ms.`);
    await sleep(config.settleAfterReadyMs);
  }
  const directChatsSettled = await runTest(report, 'Direto após estabilização: window.WWebJS.getChats()', async () => {
    return requireDirectSuccess(await provider.callDirectWWebJS('getChats'), 'WWebJS.getChats após estabilização');
  });

  const fingerprintSource = {
    versions: versions.details || null,
    snapshot: snapshot.details || null,
    functions: functions.details || null,
    directChats: directChats.ok ? { ok: true, count: directChats.details?.count } : { ok: false, error: directChats.error?.message },
    directContacts: directContacts.ok ? { ok: true, count: directContacts.details?.count } : { ok: false, error: directContacts.error?.message },
    directChatsSettled: directChatsSettled.ok ? { ok: true, count: directChatsSettled.details?.count } : { ok: false, error: directChatsSettled.error?.message }
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(fingerprintSource)).digest('hex').slice(0, 24);
  report.setFingerprint({ hash, source: fingerprintSource });

  await runTest(report, 'Encerramento seguro', () => provider.disconnect());
  return true;
}
