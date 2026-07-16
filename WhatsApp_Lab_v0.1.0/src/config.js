import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectChrome, loadDotEnv, parseBoolean, parseInteger } from './utils.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LAB_ROOT = path.resolve(here, '..');
loadDotEnv(path.join(LAB_ROOT, '.env'));

const qualityRoot = process.env.QUALITY_ROOT || 'C:\\Site';
const defaultSession = path.join(qualityRoot, 'Site_with_content', 'content', 'automacao_whatsapp', 'session');

export function getConfig() {
  const sessionPath = path.resolve(process.env.WA_SESSION_PATH || defaultSession);
  return {
    labVersion: '0.1.0',
    labRoot: LAB_ROOT,
    reportsDir: path.join(LAB_ROOT, 'reports'),
    logsDir: path.join(LAB_ROOT, 'logs'),
    sessionPath,
    sessionExists: fs.existsSync(sessionPath),
    clientId: process.env.WA_CLIENT_ID || 'quality-teste',
    headless: parseBoolean(process.env.WA_HEADLESS, true),
    readyTimeoutMs: parseInteger(process.env.WA_READY_TIMEOUT_MS, 90000, 15000, 300000),
    autoCloseMs: parseInteger(process.env.WA_AUTO_CLOSE_MS, 5000, 0, 60000),
    chromePath: detectChrome(process.env.CHROME_PATH || '')
  };
}
