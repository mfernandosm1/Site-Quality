import fs from 'fs';
import path from 'path';
import { ensureDir, fileStamp, isoNow, serializeError } from './utils.js';

export class LabReport {
  constructor(config) {
    this.config = config;
    this.startedAt = isoNow();
    this.data = {
      schemaVersion: 1,
      labVersion: config.labVersion,
      startedAt: this.startedAt,
      finishedAt: null,
      durationMs: null,
      status: 'RUNNING',
      environment: {
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        cwd: process.cwd(),
        chromePath: config.chromePath,
        sessionPath: config.sessionPath,
        sessionExists: config.sessionExists,
        clientId: config.clientId,
        headless: config.headless
      },
      events: [],
      tests: [],
      fatalError: null
    };
    ensureDir(config.reportsDir);
    ensureDir(config.logsDir);
    this.logPath = path.join(config.logsDir, 'lab.log');
  }

  log(level, message, details = null) {
    const entry = { at: isoNow(), level, message, details };
    this.data.events.push(entry);
    const suffix = details ? ` ${JSON.stringify(details)}` : '';
    fs.appendFileSync(this.logPath, `[${entry.at}] [${level}] ${message}${suffix}\n`, 'utf8');
    console.log(`[${level}] ${message}`);
  }

  test(name, status, details = null, error = null, durationMs = null) {
    this.data.tests.push({ name, status, durationMs, details, error: serializeError(error) });
  }

  finish(status, error = null) {
    const finished = new Date();
    this.data.finishedAt = finished.toISOString();
    this.data.durationMs = finished.getTime() - new Date(this.startedAt).getTime();
    this.data.status = status;
    this.data.fatalError = serializeError(error);
    const filename = `diagnostico-${fileStamp(finished)}.json`;
    const fullPath = path.join(this.config.reportsDir, filename);
    fs.writeFileSync(fullPath, JSON.stringify(this.data, null, 2), 'utf8');
    return fullPath;
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
