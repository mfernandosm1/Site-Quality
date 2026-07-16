import fs from 'fs';
import whatsappWeb from 'whatsapp-web.js';
import { runTest } from './report.js';
import { sleep } from './utils.js';

export async function runFoundationDiagnostics(provider, config, report) {
  await runTest(report, 'Configuração da sessão', async () => {
    if (!fs.existsSync(config.sessionPath)) {
      throw new Error(`Pasta de sessão não encontrada: ${config.sessionPath}. Crie um arquivo .env se o Painel estiver em outro caminho.`);
    }
    return { sessionPath: config.sessionPath, clientId: config.clientId };
  });

  await runTest(report, 'Chrome detectado', async () => {
    if (!config.chromePath) throw new Error('Google Chrome não foi encontrado automaticamente. Configure CHROME_PATH no arquivo .env.');
    return { chromePath: config.chromePath };
  });

  await runTest(report, 'Versão whatsapp-web.js', async () => ({
    exportedClient: typeof whatsappWeb.Client === 'function',
    expectedVersion: '1.34.7'
  }));

  const connection = await runTest(report, 'Inicialização até ready', () => provider.connect());
  if (!connection.ok) return false;

  await runTest(report, 'client.info', async () => provider.getClientInfo());
  await runTest(report, 'Snapshot básico da página', async () => provider.getPageSnapshot());

  if (config.autoCloseMs > 0) {
    report.log('INFO', `Aguardando ${config.autoCloseMs} ms antes de encerrar.`);
    await sleep(config.autoCloseMs);
  }

  await runTest(report, 'Encerramento seguro', () => provider.disconnect());
  return true;
}
