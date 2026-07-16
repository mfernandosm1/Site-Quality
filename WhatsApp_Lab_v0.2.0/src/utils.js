import fs from 'fs';
import path from 'path';

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
export function isoNow() { return new Date().toISOString(); }
export function fileStamp(date = new Date()) { return date.toISOString().replace(/[:.]/g, '-'); }
export function serializeError(error) {
  if (!error) return null;
  return {
    name: error.name || 'Error',
    message: error.message || String(error),
    stack: error.stack || null,
    cause: error.cause ? serializeError(error.cause) : null
  };
}
export function parseBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).toLowerCase());
}
export function parseInteger(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
export function sleep(ms) { return new Promise(resolve => setTimeout(resolve, Math.max(0, ms))); }
export async function withTimeout(task, timeoutMs, label = 'operação') {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Tempo limite de ${timeoutMs} ms em ${label}.`)), timeoutMs); })
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
export function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
export function detectChrome(explicitPath = '') {
  const candidates = [
    explicitPath,
    process.platform === 'win32' && path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'win32' && path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'win32' && path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.platform === 'linux' && '/usr/bin/google-chrome',
    process.platform === 'linux' && '/usr/bin/chromium',
    process.platform === 'darwin' && '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}
export function safeId(value) { return value?._serialized || value?.id?._serialized || value?.id || null; }
export function safeString(value, max = 160) { return String(value ?? '').slice(0, max); }
