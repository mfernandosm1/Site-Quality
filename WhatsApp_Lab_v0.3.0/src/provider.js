import whatsappWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { createRequire } from 'module';
import { safeId, safeString, serializeError, sleep, withTimeout } from './utils.js';

const require = createRequire(import.meta.url);
const wwebPackage = require('whatsapp-web.js/package.json');
const { Client, LocalAuth } = whatsappWeb;

export class WhatsAppWebProvider {
  constructor(config, report) {
    this.config = config;
    this.report = report;
    this.client = null;
    this.status = 'idle';
    this.readyAt = null;
    this.events = [];
    this.recentIds = { chats: new Set(), contacts: new Set(), messages: new Set() };
    this.eventCounters = { message: 0, message_create: 0, message_ack: 0, change_state: 0, pageerror: 0 };
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
    this.bindEvents();
    return this.client;
  }

  rememberMessage(msg) {
    const remote = msg?.id?.remote || msg?.from || msg?.to;
    const participant = msg?.id?.participant || msg?.author;
    const messageId = msg?.id?._serialized || msg?.id?.id;
    if (remote) this.recentIds.chats.add(String(remote));
    if (participant) this.recentIds.contacts.add(String(participant));
    if (messageId) this.recentIds.messages.add(String(messageId));
    while (this.recentIds.chats.size > 30) this.recentIds.chats.delete(this.recentIds.chats.values().next().value);
    while (this.recentIds.contacts.size > 30) this.recentIds.contacts.delete(this.recentIds.contacts.values().next().value);
    while (this.recentIds.messages.size > 30) this.recentIds.messages.delete(this.recentIds.messages.values().next().value);
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
    this.client.on('message', msg => {
      this.eventCounters.message++;
      this.rememberMessage(msg);
      record('message', { id: safeId(msg), fromMe: !!msg.fromMe, hasMedia: !!msg.hasMedia, type: msg.type });
    });
    this.client.on('message_create', msg => {
      this.eventCounters.message_create++;
      this.rememberMessage(msg);
      record('message_create', { id: safeId(msg), fromMe: !!msg.fromMe, hasMedia: !!msg.hasMedia, type: msg.type });
    });
    this.client.on('message_ack', (_msg, ack) => { this.eventCounters.message_ack++; record('message_ack', { ack }); });
  }

  attachPageDiagnostics() {
    const page = this.requirePage();
    if (page.__qualityLabListenersAttached) return;
    page.__qualityLabListenersAttached = true;
    page.on('pageerror', error => {
      this.eventCounters.pageerror++;
      this.report.log('PAGE_ERROR', error?.message || String(error), serializeError(error));
    });
    page.on('console', message => {
      const type = message.type();
      if (type === 'error' || type === 'warning') {
        this.report.log('PAGE_CONSOLE', `[${type}] ${message.text()}`);
      }
    });
  }

  async connect() {
    this.status = 'initializing';
    this.createClient();
    const readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Tempo limite de ${this.config.readyTimeoutMs} ms aguardando ready.`)), this.config.readyTimeoutMs);
      this.client.once('ready', () => { clearTimeout(timeout); resolve(); });
      this.client.once('auth_failure', message => { clearTimeout(timeout); reject(new Error(`Falha de autenticação: ${message}`)); });
    });
    await this.client.initialize();
    await readyPromise;
    this.attachPageDiagnostics();
    return this.getStatus();
  }

  getStatus() { return { status: this.status, readyAt: this.readyAt, events: [...this.events] }; }
  getLibraryInfo() { return { version: wwebPackage.version, exportedClient: typeof whatsappWeb.Client === 'function' }; }
  getClientInfo() {
    const info = this.client?.info;
    if (!info) throw new Error('client.info não está disponível após ready.');
    return { wid: info.wid?._serialized || null, user: info.wid?.user || null, pushname: info.pushname || null, platform: info.platform || null };
  }
  getRecentIds() {
    return {
      chats: [...this.recentIds.chats],
      contacts: [...this.recentIds.contacts],
      messages: [...this.recentIds.messages]
    };
  }

  async getRuntimeVersions() {
    const page = this.requirePage();
    const browserVersion = await page.browser().version();
    let wwebVersion = null;
    if (typeof this.client.getWWebVersion === 'function') {
      try { wwebVersion = await withTimeout(() => this.client.getWWebVersion(), this.config.apiTimeoutMs, 'getWWebVersion'); } catch {}
    }
    const pageVersion = await page.evaluate(() => window.Debug?.VERSION || window.Debug?.BUILD_VERSION || null);
    return { browserVersion, whatsappWebVersion: wwebVersion || pageVersion || null, pageVersionHint: pageVersion || null };
  }

  requirePage() {
    const page = this.client?.pupPage;
    if (!page) throw new Error('Página Puppeteer não disponível.');
    return page;
  }

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
      return {
        title: document.title,
        url: location.href,
        userAgent: navigator.userAgent,
        readyState: document.readyState,
        hasWindowStore: typeof window.Store !== 'undefined',
        hasWWebJS: typeof window.WWebJS !== 'undefined',
        hasWWebJSStore: typeof window.WWebJS?.Store !== 'undefined',
        Store: describe(window.Store),
        WWebJS: describe(window.WWebJS),
        AuthStore: describe(window.AuthStore),
        Debug: describe(window.Debug),
        globals,
        webpack: { exists: Array.isArray(window.webpackChunkwhatsapp_web_client), chunkCount: Array.isArray(window.webpackChunkwhatsapp_web_client) ? window.webpackChunkwhatsapp_web_client.length : null }
      };
    });
  }

  async inspectWWebJSFunctions() {
    const page = this.requirePage();
    return page.evaluate(() => {
      const names = ['getChats', 'getChat', 'getChatModel', 'getContacts', 'getContact', 'getContactModel', 'getMessageModel', 'mediaInfoToFile'];
      const output = {};
      for (const name of names) {
        const fn = window.WWebJS?.[name];
        output[name] = {
          exists: typeof fn === 'function',
          type: typeof fn,
          arity: typeof fn === 'function' ? fn.length : null,
          source: typeof fn === 'function' ? Function.prototype.toString.call(fn).slice(0, 1800) : null
        };
      }
      return output;
    });
  }

  async callDirectWWebJS(method, args = []) {
    const page = this.requirePage();
    return withTimeout(() => page.evaluate(async ({ method, args }) => {
      const safePrimitive = value => {
        if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
        return null;
      };
      const idOf = value => value?.id?._serialized || value?._serialized || value?.id?.toString?.() || null;
      const summarizeItem = item => ({
        id: idOf(item),
        name: safePrimitive(item?.name) || safePrimitive(item?.formattedTitle) || safePrimitive(item?.pushname) || safePrimitive(item?.shortName),
        isGroup: typeof item?.isGroup === 'boolean' ? item.isGroup : null,
        unreadCount: typeof item?.unreadCount === 'number' ? item.unreadCount : null,
        timestamp: typeof item?.timestamp === 'number' ? item.timestamp : null,
        type: safePrimitive(item?.type),
        hasMedia: typeof item?.hasMedia === 'boolean' ? item.hasMedia : null,
        ownKeys: (() => { try { return Reflect.ownKeys(item || {}).map(String).slice(0, 80); } catch { return []; } })()
      });
      try {
        const fn = window.WWebJS?.[method];
        if (typeof fn !== 'function') throw new Error(`window.WWebJS.${method} não existe.`);
        const value = await fn(...args);
        const isArray = Array.isArray(value);
        const items = isArray ? value : (value == null ? [] : [value]);
        return {
          ok: true,
          method,
          returnType: value === null ? 'null' : typeof value,
          constructor: value?.constructor?.name || null,
          isArray,
          count: isArray ? value.length : (value == null ? 0 : 1),
          sample: items.slice(0, 15).map(summarizeItem),
          rootKeys: (() => { try { return Reflect.ownKeys(value || {}).map(String).slice(0, 120); } catch { return []; } })()
        };
      } catch (error) {
        return {
          ok: false,
          method,
          error: {
            name: error?.name || 'Error',
            message: error?.message || String(error),
            stack: error?.stack || null
          }
        };
      }
    }, { method, args }), this.config.apiTimeoutMs, `WWebJS.${method}`);
  }

  async getChats() {
    const chats = await withTimeout(() => this.client.getChats(), this.config.apiTimeoutMs, 'getChats');
    return { count: chats.length, sample: chats.slice(0, this.config.maxChatsSample).map(chat => ({ id: safeId(chat), name: safeString(chat.name), isGroup: !!chat.isGroup })), raw: chats };
  }
  async getContacts() {
    const contacts = await withTimeout(() => this.client.getContacts(), this.config.apiTimeoutMs, 'getContacts');
    return { count: contacts.length, sample: contacts.slice(0, this.config.maxContactsSample).map(c => ({ id: safeId(c), name: safeString(c.name || c.pushname || c.shortName) })), raw: contacts };
  }
  async getContactById(id) {
    const c = await withTimeout(() => this.client.getContactById(id), this.config.apiTimeoutMs, 'getContactById');
    return { id: safeId(c), name: safeString(c?.name || c?.pushname || c?.shortName), isMyContact: !!c?.isMyContact };
  }
  async observeEvents(ms = this.config.eventObservationMs) {
    await sleep(ms);
    return { observationMs: ms, counters: { ...this.eventCounters }, ids: this.getRecentIds() };
  }
  async disconnect() {
    if (!this.client) return { destroyed: false };
    try { await this.client.destroy(); this.status = 'destroyed'; return { destroyed: true }; }
    catch (error) { return { destroyed: false, error: serializeError(error) }; }
    finally { this.client = null; }
  }
}
