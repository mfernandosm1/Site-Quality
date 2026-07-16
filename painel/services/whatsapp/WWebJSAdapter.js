/**
 * Adaptador de baixo nível para whatsapp-web.js.
 *
 * Somente esta camada pode acessar pupPage, WWebJS e os módulos internos
 * carregados por window.require(). O restante do Painel usa WhatsAppProvider.
 */
export class WWebJSAdapter {
  constructor({ client = null, logger = null } = {}) {
    this.client = client;
    this.logger = typeof logger === 'function' ? logger : null;
  }

  setClient(client) {
    this.client = client || null;
    return this;
  }

  hasClient() {
    return Boolean(this.client);
  }

  async getChatsSafe() {
    const page = this.client?.pupPage;
    if (!page?.evaluate) {
      throw new Error('WhatsApp Provider: página do WhatsApp Web indisponível.');
    }

    const result = await page.evaluate(async () => {
      const startedAt = Date.now();
      const chats = [];
      const errors = [];
      const bridge = window.WWebJS || null;

      const diagnostics = {
        hasWindowRequire: typeof window.require === 'function',
        hasWWebJS: Boolean(bridge),
        hasGetChatModel: typeof bridge?.getChatModel === 'function',
        selectedSource: "window.require('WAWebCollections').Chat"
      };

      if (typeof window.require !== 'function') {
        throw new Error(
          'window.require() não está disponível no contexto do WhatsApp Web. Diagnóstico: ' +
          JSON.stringify(diagnostics)
        );
      }

      if (typeof bridge?.getChatModel !== 'function') {
        throw new Error(
          'window.WWebJS.getChatModel() não está disponível. Diagnóstico: ' +
          JSON.stringify(diagnostics)
        );
      }

      let collections;
      let chatCollection;
      let models;

      try {
        collections = window.require('WAWebCollections');
        chatCollection = collections?.Chat;
      } catch (error) {
        throw new Error(
          "Falha ao carregar window.require('WAWebCollections'): " +
          String(error?.message || error)
        );
      }

      if (typeof chatCollection?.getModelsArray !== 'function') {
        throw new Error(
          "window.require('WAWebCollections').Chat.getModelsArray() não está disponível."
        );
      }

      try {
        models = chatCollection.getModelsArray() || [];
      } catch (error) {
        throw new Error(
          'Falha ao obter os modelos de conversa: ' +
          String(error?.message || error)
        );
      }

      // Processamento propositalmente sequencial. Não usar Promise.all():
      // uma conversa inválida não pode interromper as demais.
      for (let index = 0; index < models.length; index += 1) {
        const model = models[index];
        const fallbackId =
          model?.id?._serialized || model?.id?.toString?.() || '';

        try {
          const chat = await bridge.getChatModel(model);
          if (!chat) throw new Error('getChatModel() retornou vazio.');
          chats.push(chat);
        } catch (error) {
          errors.push({
            index,
            id: String(fallbackId || ''),
            name: String(
              model?.name ||
              model?.formattedTitle ||
              model?.groupMetadata?.subject ||
              ''
            ),
            message: String(error?.message || error || 'Erro desconhecido'),
            stack: String(error?.stack || '').slice(0, 1500)
          });
        }
      }

      return {
        chats,
        errors,
        diagnostics,
        stats: {
          totalModels: models.length,
          validChats: chats.length,
          failedChats: errors.length,
          durationMs: Date.now() - startedAt
        }
      };
    });

    const safeResult = {
      chats: Array.isArray(result?.chats) ? result.chats : [],
      errors: Array.isArray(result?.errors) ? result.errors : [],
      diagnostics: result?.diagnostics || {},
      stats: {
        totalModels: Number(result?.stats?.totalModels || 0),
        validChats: Number(result?.stats?.validChats || 0),
        failedChats: Number(result?.stats?.failedChats || 0),
        durationMs: Number(result?.stats?.durationMs || 0)
      }
    };

    if (this.logger) {
      this.logger(
        'provider_get_chats_safe',
        'Provider.getChatsSafe() concluído.',
        { ...safeResult.stats, diagnostics: safeResult.diagnostics }
      );

      for (const error of safeResult.errors.slice(0, 100)) {
        this.logger(
          'provider_chat_ignorado',
          'Uma conversa foi ignorada sem interromper o Provider.',
          error
        );
      }
    }

    return safeResult;
  }
}

export default WWebJSAdapter;
