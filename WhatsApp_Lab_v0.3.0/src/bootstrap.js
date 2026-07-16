import { getConfig } from './config.js';
import { LabReport } from './report.js';
import { WhatsAppWebProvider } from './provider.js';
import { runDeepDiagnostics } from './diagnostics.js';

const config = getConfig();
const report = new LabReport(config);
const provider = new WhatsAppWebProvider(config, report);
let reportPaths = null;
let fatalError = null;

async function shutdown(signal) {
  report.log('INFO', `Encerramento solicitado: ${signal}`);
  await provider.disconnect();
  if (!reportPaths) reportPaths = report.finish(fatalError ? 'FAIL' : 'INTERRUPTED', fatalError);
  console.log(`Relatório: ${reportPaths.jsonPath}`);
  process.exit(fatalError ? 1 : 0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

try {
  console.log('\n=== Quality WhatsApp Lab v0.3.0 — WWebJS Explorer ===');
  console.log('Feche completamente o Painel Quality antes de executar.\n');
  report.log('INFO', 'Diagnóstico profundo iniciado.', {
    sessionPath: config.sessionPath, clientId: config.clientId, headless: config.headless,
    settleAfterReadyMs: config.settleAfterReadyMs
  });
  const success = await runDeepDiagnostics(provider, config, report);
  const failedTests = report.data.tests.filter(test => test.status === 'FAIL');
  const status = success && failedTests.length === 0 ? 'PASS' : 'PARTIAL';
  reportPaths = report.finish(status);
  console.log(`\nJSON: ${reportPaths.jsonPath}`);
  console.log(`Resumo: ${reportPaths.txtPath}`);
  process.exitCode = success ? 0 : 1;
} catch (error) {
  fatalError = error;
  report.log('FATAL', error.message);
  await provider.disconnect();
  reportPaths = report.finish('FAIL', error);
  console.error(`\nFalha fatal: ${error.message}`);
  console.error(`Relatório: ${reportPaths.jsonPath}`);
  process.exitCode = 1;
}
