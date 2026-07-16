import whatsappWeb from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { serializeError } from './utils.js';

const { Client, LocalAuth } = whatsappWeb;

export class WhatsAppWebProvider {
  constructor(config, report) {
    this.config = config;
    this.report = report;
    this.client = null;
    this.status = 'idle';
    this.readyAt = null;
    this.events = [];
  }

  createClient() {
    if (this.client) return this.client;
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.config.clientId,
        dataPath: this.config.sessionPath,
        rmMaxRetries: 5
      }),
      puppeteer: {
        headless: this.config.headless,
        executablePath: this.config.chromePath || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      }
    });
    this.bindEvents();
    return this.client;
  }

  bindEvents() {
    const record = (name, details = null) => {
      this.events.push({ name, at: new Date().toISOString(), details });
      this.report.log('EVENT', name, details);
    };
    this.client.on('qr', qr => {
      this.status = 'waiting_qr';
      record('qr');
      qrcode.generate(qr, { small: true });
    });
    this.client.on('loading_screen', (percent, message) => record('loading_screen', { percent, message }));
    this.client.on('authenticated', () => {
      this.status = 'authenticated';
      record('authenticated');
    });
    this.client.on('auth_failure', message => {
      this.status = 'auth_failure';
      record('auth_failure', { message });
    });
    this.client.on('ready', () => {
      this.status = 'ready';
      this.readyAt = new Date().toISOString();
      record('ready');
    });
    this.client.on('change_state', state => record('change_state', { state }));
    this.client.on('disconnected', reason => {
      this.status = 'disconnected';
      record('disconnected', { reason });
    });
  }

  async connect() {
    this.status = 'initializing';
    this.createClient();
    const readyPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Tempo limite de ${this.config.readyTimeoutMs} ms aguardando ready.`)), this.config.readyTimeoutMs);
      this.client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      this.client.once('auth_failure', message => {
        clearTimeout(timeout);
        reject(new Error(`Falha de autenticação: ${message}`));
      });
    });
    await this.client.initialize();
    await readyPromise;
    return this.getStatus();
  }

  getStatus() {
    return { status: this.status, readyAt: this.readyAt, events: [...this.events] };
  }

  getClientInfo() {
    const info = this.client?.info;
    if (!info) throw new Error('client.info não está disponível após ready.');
    return {
      wid: info.wid?._serialized || null,
      user: info.wid?.user || null,
      pushname: info.pushname || null,
      platform: info.platform || null
    };
  }

  async getPageSnapshot() {
    const page = this.client?.pupPage;
    if (!page) throw new Error('Página Puppeteer não disponível.');
    return page.evaluate(() => ({
      title: document.title,
      url: location.href,
      userAgent: navigator.userAgent,
      hasWindowStore: typeof window.Store !== 'undefined',
      hasWWebJS: typeof window.WWebJS !== 'undefined',
      hasWWebJSStore: typeof window.WWebJS?.Store !== 'undefined',
      windowKeys: Object.keys(window).filter(key => /store|wweb|webpack|debug/i.test(key)).slice(0, 100)
    }));
  }

  async disconnect() {
    if (!this.client) return { destroyed: false };
    try {
      await this.client.destroy();
      this.status = 'destroyed';
      return { destroyed: true };
    } catch (error) {
      return { destroyed: false, error: serializeError(error) };
    } finally {
      this.client = null;
    }
  }
}
