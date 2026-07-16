import whatsappWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { createRequire } from 'module';
import { safeId, safeString, serializeError, sleep, withTimeout } from './utils.js';

const require = createRequire(import.meta.url);
const wwebPackage = require('whatsapp-web.js/package.json');
const { Client, LocalAuth } = whatsappWeb;

export class WhatsAppWebProvider {
  constructor(config, report) {
    this.config = config; this.report = report; this.client = null;
    this.status = 'idle'; this.readyAt = null; this.events = [];
    this.eventCounters = { message: 0, message_create: 0, message_ack: 0, change_state: 0 };
  }
  createClient() {
    if (this.client) return this.client;
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: this.config.clientId, dataPath: this.config.sessionPath, rmMaxRetries: 5 }),
      puppeteer: {
        headless: this.config.headless,
        executablePath: this.config.chromePath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    });
    this.bindEvents(); return this.client;
  }
  bindEvents() {
    const record = (name, details = null) => {
      this.events.push({ name, at: new Date().toISOString(), details });
      this.report.log('EVENT', name, details);
    };
    this.client.on('qr', qr => { this.status = 'waiting_qr'; record('qr'); qrcode.generate(qr, { small: true }); });
    this.client.on('loading_screen', (percent, message) => record('loading_screen', { percent, message }));
    this.client.on('authenticated', () => { this.status = 'authenticated'; record('authenticated'); });
    this.client.on('auth_failure', message => { this.status = 'auth_failure'; record('auth_failure', { message }); });
    this.client.on('ready', () => { this.status = 'ready'; this.readyAt = new Date().toISOString(); record('ready'); });
    this.client.on('change_state', state => { this.eventCounters.change_state++; record('change_state', { state }); });
    this.client.on('disconnected', reason => { this.status = 'disconnected'; record('disconnected', { reason }); });
    this.client.on('message', msg => { this.eventCounters.message++; record('message', { id: safeId(msg), fromMe: !!msg.fromMe, hasMedia: !!msg.hasMedia, type: msg.type }); });
    this.client.on('message_create', msg => { this.eventCounters.message_create++; record('message_create', { id: safeId(msg), fromMe: !!msg.fromMe, hasMedia: !!msg.hasMedia, type: msg.type }); });
    this.client.on('message_ack', (_msg, ack) => { this.eventCounters.message_ack++; record('message_ack', { ack }); });
  }
  async connect() {
    this.status = 'initializing'; this.createClient();
    const readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Tempo limite de ${this.config.readyTimeoutMs} ms aguardando ready.`)), this.config.readyTimeoutMs);
      this.client.once('ready', () => { clearTimeout(timeout); resolve(); });
      this.client.once('auth_failure', message => { clearTimeout(timeout); reject(new Error(`Falha de autenticação: ${message}`)); });
    });
    await this.client.initialize(); await readyPromise;
    return this.getStatus();
  }
  getStatus() { return { status: this.status, readyAt: this.readyAt, events: [...this.events] }; }
  getLibraryInfo() { return { version: wwebPackage.version, exportedClient: typeof whatsappWeb.Client === 'function' }; }
  getClientInfo() {
    const info = this.client?.info;
    if (!info) throw new Error('client.info não está disponível após ready.');
    return { wid: info.wid?._serialized || null, user: info.wid?.user || null, pushname: info.pushname || null, platform: info.platform || null };
  }
  async getRuntimeVersions() {
    const page = this.requirePage();
    const browserVersion = await page.browser().version();
    let wwebVersion = null;
    if (typeof this.client.getWWebVersion === 'function') {
      try { wwebVersion = await withTimeout(() => this.client.getWWebVersion(), this.config.apiTimeoutMs, 'getWWebVersion'); } catch {}
    }
    const pageVersion = await page.evaluate(() => window.Debug?.VERSION || window.Debug?.BUILD_VERSION || window.AuthStore?.AppState?.state || null);
    return { browserVersion, whatsappWebVersion: wwebVersion || pageVersion || null, pageVersionHint: pageVersion || null };
  }
  requirePage() { const page = this.client?.pupPage; if (!page) throw new Error('Página Puppeteer não disponível.'); return page; }
  async inspectPageDeep() {
    const page = this.requirePage();
    return page.evaluate(() => {
      const describe = (value, maxKeys = 250) => {
        if (value == null) return { exists: false, type: String(value), keys: [] };
        let keys = [];
        try { keys = Reflect.ownKeys(value).map(String).slice(0, maxKeys); } catch {}
        return { exists: true, type: typeof value, constructor: value?.constructor?.name || null, keyCount: keys.length, keys };
      };
      const globals = Object.keys(window).filter(k => /store|wweb|webpack|debug|auth|chat|contact|message|media/i.test(k)).slice(0, 400);
      const webpack = window.webpackChunkwhatsapp_web_client;
      let webpackInfo = { exists: Array.isArray(webpack), chunkCount: Array.isArray(webpack) ? webpack.length : null, sample: [] };
      if (Array.isArray(webpack)) {
        webpackInfo.sample = webpack.slice(-8).map(entry => ({
          chunkIds: Array.isArray(entry?.[0]) ? entry[0].slice(0, 10) : [],
          moduleCount: entry?.[1] && typeof entry[1] === 'object' ? Object.keys(entry[1]).length : null,
          hasRuntime: typeof entry?.[2] === 'function'
        }));
      }
      return {
        title: document.title, url: location.href, userAgent: navigator.userAgent,
        readyState: document.readyState,
        hasWindowStore: typeof window.Store !== 'undefined',
        hasWWebJS: typeof window.WWebJS !== 'undefined',
        hasWWebJSStore: typeof window.WWebJS?.Store !== 'undefined',
        Store: describe(window.Store), WWebJS: describe(window.WWebJS), AuthStore: describe(window.AuthStore), Debug: describe(window.Debug),
        globals, webpack: webpackInfo
      };
    });
  }
  async getChats() {
    const chats = await withTimeout(() => this.client.getChats(), this.config.apiTimeoutMs, 'getChats');
    return {
      count: chats.length,
      sample: chats.slice(0, this.config.maxChatsSample).map(chat => ({
        id: safeId(chat), name: safeString(chat.name), isGroup: !!chat.isGroup, unreadCount: chat.unreadCount ?? null,
        timestamp: chat.timestamp ?? null, archived: !!chat.archived
      })),
      raw: chats
    };
  }
  async getContacts() {
    const contacts = await withTimeout(() => this.client.getContacts(), this.config.apiTimeoutMs, 'getContacts');
    return {
      count: contacts.length,
      sample: contacts.slice(0, this.config.maxContactsSample).map(c => ({ id: safeId(c), name: safeString(c.name || c.pushname || c.shortName), isGroup: !!c.isGroup, isMyContact: !!c.isMyContact })),
      raw: contacts
    };
  }
  async getChatById(id) {
    const chat = await withTimeout(() => this.client.getChatById(id), this.config.apiTimeoutMs, 'getChatById');
    return { id: safeId(chat), name: safeString(chat?.name), isGroup: !!chat?.isGroup, unreadCount: chat?.unreadCount ?? null };
  }
  async getContactById(id) {
    const c = await withTimeout(() => this.client.getContactById(id), this.config.apiTimeoutMs, 'getContactById');
    return { id: safeId(c), name: safeString(c?.name || c?.pushname || c?.shortName), isMyContact: !!c?.isMyContact };
  }
  async searchMessages() {
    const messages = await withTimeout(() => this.client.searchMessages(this.config.searchQuery, { limit: 10, page: 0 }), this.config.apiTimeoutMs, 'searchMessages');
    return { query: this.config.searchQuery, count: messages.length, sample: messages.slice(0, 5).map(m => ({ id: safeId(m), fromMe: !!m.fromMe, type: m.type, hasMedia: !!m.hasMedia, timestamp: m.timestamp })) };
  }
  async scanAndDownloadOneMedia(chats) {
    if (!Array.isArray(chats) || !chats.length) throw new Error('Nenhum chat disponível para procurar mídia.');
    for (const chat of chats.slice(0, this.config.mediaChatScanLimit)) {
      let messages;
      try { messages = await withTimeout(() => chat.fetchMessages({ limit: this.config.maxMessagesPerChat }), this.config.apiTimeoutMs, 'fetchMessages'); }
      catch { continue; }
      const candidate = messages.find(m => m?.hasMedia && typeof m.downloadMedia === 'function');
      if (!candidate) continue;
      const media = await withTimeout(() => candidate.downloadMedia(), this.config.apiTimeoutMs, 'downloadMedia');
      if (!media) throw new Error('downloadMedia retornou vazio.');
      return {
        chatId: safeId(chat), messageId: safeId(candidate), messageType: candidate.type,
        mimetype: media.mimetype || null, filename: safeString(media.filename || '', 180),
        dataBase64Length: typeof media.data === 'string' ? media.data.length : null,
        savedToDisk: false
      };
    }
    throw new Error(`Nenhuma mídia encontrada nos ${Math.min(chats.length, this.config.mediaChatScanLimit)} chats examinados.`);
  }
  async observeEvents() { await sleep(this.config.eventObservationMs); return { observationMs: this.config.eventObservationMs, counters: { ...this.eventCounters } }; }
  async disconnect() {
    if (!this.client) return { destroyed: false };
    try { await this.client.destroy(); this.status = 'destroyed'; return { destroyed: true }; }
    catch (error) { return { destroyed: false, error: serializeError(error) }; }
    finally { this.client = null; }
  }
}
