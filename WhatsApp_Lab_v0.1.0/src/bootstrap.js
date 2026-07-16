import { getConfig } from './config.js';
import { LabReport } from './report.js';
import { WhatsAppWebProvider } from './provider.js';
import { runFoundationDiagnostics } from './diagnostics.js';

const config = getConfig();
const report = new LabReport(config);
const provider = new WhatsAppWebProvider(config, report);
let reportPath = null;
let fatalError = null;

async function shutdown(signal) {
  report.log('INFO', `Encerramento solicitado: ${signal}`);
  await provider.disconnect();
  if (!reportPath) reportPath = report.finish(fatalError ? 'FAIL' : 'INTERRUPTED', fatalError);
  console.log(`Relatório: ${reportPath}`);
  process.exit(fatalError ? 1 : 0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

try {
  console.log('\n=== Quality WhatsApp Lab v0.1.0 ===');
  console.log('Feche o Painel Quality antes de usar a mesma sessão.\n');
  report.log('INFO', 'Diagnóstico iniciado.', {
    sessionPath: config.sessionPath,
    clientId: config.clientId,
    headless: config.headless
  });
  const success = await runFoundationDiagnostics(provider, config, report);
  const failedTests = report.data.tests.filter(test => test.status === 'FAIL');
  reportPath = report.finish(success && failedTests.length === 0 ? 'PASS' : 'FAIL');
  console.log(`\nRelatório gerado: ${reportPath}`);
  process.exitCode = success && failedTests.length === 0 ? 0 : 1;
} catch (error) {
  fatalError = error;
  report.log('FATAL', error.message);
  await provider.disconnect();
  reportPath = report.finish('FAIL', error);
  console.error(`\nFalha fatal: ${error.message}`);
  console.error(`Relatório gerado: ${reportPath}`);
  process.exitCode = 1;
}
