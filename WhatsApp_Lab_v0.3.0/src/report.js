import fs from 'fs';
import path from 'path';
import { ensureDir, fileStamp, isoNow, serializeError } from './utils.js';

export class LabReport {
  constructor(config) {
    this.config = config;
    this.startedAt = isoNow();
    this.data = {
      schemaVersion: 2,
      labVersion: config.labVersion,
      startedAt: this.startedAt,
      finishedAt: null,
      durationMs: null,
      status: 'RUNNING',
      environment: {
        platform: process.platform, arch: process.arch, node: process.version, cwd: process.cwd(),
        chromePath: config.chromePath, sessionPath: config.sessionPath, sessionExists: config.sessionExists,
        clientId: config.clientId, headless: config.headless
      },
      events: [], tests: [], fingerprint: null, fatalError: null
    };
    ensureDir(config.reportsDir); ensureDir(config.logsDir);
    this.logPath = path.join(config.logsDir, 'lab.log');
  }
  log(level, message, details = null) {
    const entry = { at: isoNow(), level, message, details };
    this.data.events.push(entry);
    fs.appendFileSync(this.logPath, `[${entry.at}] [${level}] ${message}${details ? ` ${JSON.stringify(details)}` : ''}\n`, 'utf8');
    console.log(`[${level}] ${message}`);
  }
  test(name, status, details = null, error = null, durationMs = null) {
    this.data.tests.push({ name, status, durationMs, details, error: serializeError(error) });
  }
  setFingerprint(value) { this.data.fingerprint = value; }
  finish(status, error = null) {
    const finished = new Date();
    this.data.finishedAt = finished.toISOString();
    this.data.durationMs = finished.getTime() - new Date(this.startedAt).getTime();
    this.data.status = status;
    this.data.fatalError = serializeError(error);
    const stamp = fileStamp(finished);
    const jsonPath = path.join(this.config.reportsDir, `diagnostico-${stamp}.json`);
    const txtPath = path.join(this.config.reportsDir, `resumo-${stamp}.txt`);
    fs.writeFileSync(jsonPath, JSON.stringify(this.data, null, 2), 'utf8');
    const lines = [
      `Quality WhatsApp Lab v${this.data.labVersion}`,
      `Status: ${status}`,
      `Início: ${this.data.startedAt}`,
      `Fim: ${this.data.finishedAt}`,
      `Duração: ${this.data.durationMs} ms`, '',
      ...this.data.tests.map(t => `${t.status === 'PASS' ? '[OK]' : '[FALHA]'} ${t.name} (${t.durationMs ?? 0} ms)${t.error?.message ? ` - ${t.error.message}` : ''}`),
      '', `Relatório completo: ${path.basename(jsonPath)}`
    ];
    fs.writeFileSync(txtPath, lines.join('\r\n'), 'utf8');
    return { jsonPath, txtPath };
  }
}
export async function runTest(report, name, task) {
  const started = Date.now();
  try {
    const details = await task();
    report.test(name, 'PASS', details ?? null, null, Date.now() - started);
    report.log('PASS', name, details ?? null);
    return { ok: true, details };
  } catch (error) {
    report.test(name, 'FAIL', null, error, Date.now() - started);
    report.log('FAIL', `${name}: ${error.message}`);
    return { ok: false, error };
  }
}
