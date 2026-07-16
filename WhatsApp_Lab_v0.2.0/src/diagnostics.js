import fs from 'fs';
import crypto from 'crypto';
import { runTest } from './report.js';
import { sleep } from './utils.js';

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
  const immediateSnapshot = await runTest(report, 'Inspeção profunda imediatamente após ready', async () => provider.inspectPageDeep());
  const immediateChats = await runTest(report, 'client.getChats() imediatamente após ready', async () => {
    const result = await provider.getChats();
    return { count: result.count, sample: result.sample };
  });

  if (config.settleAfterReadyMs > 0) {
    report.log('INFO', `Aguardando estabilização por ${config.settleAfterReadyMs} ms após ready.`);
    await sleep(config.settleAfterReadyMs);
  }

  const settledSnapshot = await runTest(report, 'Inspeção profunda após estabilização', async () => provider.inspectPageDeep());
  const settledChats = await runTest(report, 'client.getChats() após estabilização', async () => {
    const result = await provider.getChats();
    return { count: result.count, sample: result.sample, raw: result.raw };
  });
  const contacts = await runTest(report, 'client.getContacts()', async () => {
    const result = await provider.getContacts();
    return { count: result.count, sample: result.sample, raw: result.raw };
  });

  const ownId = provider.getClientInfo().wid;
  await runTest(report, 'client.getContactById() — próprio número', async () => provider.getContactById(ownId));

  const chatsRaw = settledChats.ok ? settledChats.details.raw : null;
  const firstChatId = Array.isArray(chatsRaw) ? chatsRaw.map(c => c?.id?._serialized).find(Boolean) : null;
  await runTest(report, 'client.getChatById() — primeiro chat', async () => {
    if (!firstChatId) throw new Error('Sem ID de chat válido porque getChats() não retornou dados.');
    return provider.getChatById(firstChatId);
  });
  await runTest(report, 'client.searchMessages()', async () => provider.searchMessages());
  await runTest(report, 'downloadMedia() — primeira mídia encontrada', async () => {
    if (!Array.isArray(chatsRaw)) throw new Error('Teste depende de getChats() após estabilização.');
    return provider.scanAndDownloadOneMedia(chatsRaw);
  });
  await runTest(report, 'Observação de eventos', async () => provider.observeEvents());

  const fingerprintSource = {
    versions: versions.details || null,
    immediate: immediateSnapshot.details || null,
    settled: settledSnapshot.details || null,
    getChatsImmediate: immediateChats.ok,
    getChatsSettled: settledChats.ok,
    getContacts: contacts.ok
  };
  const hash = crypto.createHash('sha256').update(JSON.stringify(fingerprintSource)).digest('hex').slice(0, 24);
  report.setFingerprint({ hash, source: fingerprintSource });

  await runTest(report, 'Encerramento seguro', () => provider.disconnect());
  return true;
}
