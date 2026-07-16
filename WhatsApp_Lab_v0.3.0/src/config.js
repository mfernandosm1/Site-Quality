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
    labVersion: '0.2.0',
    labRoot: LAB_ROOT,
    reportsDir: path.join(LAB_ROOT, 'reports'),
    logsDir: path.join(LAB_ROOT, 'logs'),
    sessionPath,
    sessionExists: fs.existsSync(sessionPath),
    clientId: process.env.WA_CLIENT_ID || 'quality-teste',
    headless: parseBoolean(process.env.WA_HEADLESS, true),
    readyTimeoutMs: parseInteger(process.env.WA_READY_TIMEOUT_MS, 90000, 15000, 300000),
    settleAfterReadyMs: parseInteger(process.env.WA_SETTLE_AFTER_READY_MS, 12000, 0, 60000),
    eventObservationMs: parseInteger(process.env.WA_EVENT_OBSERVATION_MS, 5000, 0, 60000),
    apiTimeoutMs: parseInteger(process.env.WA_API_TIMEOUT_MS, 30000, 5000, 120000),
    maxChatsSample: parseInteger(process.env.WA_MAX_CHATS_SAMPLE, 8, 1, 50),
    maxContactsSample: parseInteger(process.env.WA_MAX_CONTACTS_SAMPLE, 8, 1, 50),
    maxMessagesPerChat: parseInteger(process.env.WA_MAX_MESSAGES_PER_CHAT, 15, 1, 100),
    mediaChatScanLimit: parseInteger(process.env.WA_MEDIA_CHAT_SCAN_LIMIT, 8, 1, 30),
    searchQuery: String(process.env.WA_SEARCH_QUERY || 'teste').slice(0, 80),
    chromePath: detectChrome(process.env.CHROME_PATH || '')
  };
}
