import WWebJSAdapter from './WWebJSAdapter.js';

/**
 * API pública da integração WhatsApp do Painel Quality.
 *
 * Nesta primeira versão, o Provider não cria uma segunda sessão. Ele recebe
 * o Client já existente e oferece a leitura segura das conversas.
 */
export class WhatsAppProvider {
  constructor({ client = null, statusReader = null, logger = null } = {}) {
    this.client = client;
    this.statusReader = typeof statusReader === 'function' ? statusReader : null;
    this.messageCache = new Map();
    this.adapter = new WWebJSAdapter({ client, logger, messageCache: this.messageCache });
  }

  connect(client) {
    if (client) this.setClient(client);
    if (!this.client) throw new Error('WhatsApp Provider: cliente não informado.');
    return this.status();
  }

  setClient(client) {
    this.client = client || null;
    this.adapter.setClient(this.client);
    return this;
  }

  status() {
    const external = this.statusReader ? this.statusReader() : {};
    return {
      providerVersion: '1.4.0',
      clientAttached: Boolean(this.client),
      pageAvailable: Boolean(this.client?.pupPage?.evaluate),
      ...external
    };
  }

  async getChatsSafe() {
    if (!this.client) throw new Error('WhatsApp Provider: cliente não conectado.');
    return this.adapter.getChatsSafe();
  }

  cacheMessage(message) {
    return this.adapter.cacheMessage(message);
  }

  async downloadMediaSafe(options = {}) {
    if (!this.client) throw new Error('WhatsApp Provider: cliente não conectado.');
    return this.adapter.downloadMediaSafe(options);
  }

  // Contratos reservados para as próximas entregas.
  async getContactsSafe() { throw new Error('getContactsSafe() ainda não implementado.'); }
  async getMessagesSafe() { throw new Error('getMessagesSafe() ainda não implementado.'); }
  async downloadMedia(options = {}) { return this.downloadMediaSafe(options); }
  async sendMessage() { throw new Error('sendMessage() ainda não implementado.'); }
}

export default WhatsAppProvider;
