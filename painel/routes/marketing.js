import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

function dataDir() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function referencesFile() {
  return path.join(dataDir(), 'marketing-references.json');
}

function historyFile() {
  return path.join(dataDir(), 'marketing-history.json');
}

function quickButtonsFile() {
  return path.join(dataDir(), 'marketing-quick-buttons.json');
}

function settingsFile() {
  return path.join(dataDir(), 'marketing-settings.json');
}

function actionButtonsFile() {
  return path.join(dataDir(), 'marketing-action-buttons.json');
}

function chatHistoryFile() {
  return path.join(dataDir(), 'marketing-chat-history.json');
}

function defaultQuickButtons() {
  return {
    items: [
      { id: 1, label: '📱 Produto vendedor', text: 'Produto disponível para venda. Quero textos curtos, vendedores e com emojis. Destacar benefício principal, condição e CTA para chamar no WhatsApp.' },
      { id: 2, label: '🔧 Assistência', text: 'Assistência técnica em celulares, notebooks ou tablets. Quero passar confiança, profissionalismo, diagnóstico e CTA para orçamento.' },
      { id: 3, label: '🎉 Promoção relâmpago', text: 'Promoção por tempo limitado. Quero criar urgência sem exagerar, com texto direto, emojis e chamada para aproveitar hoje.' },
      { id: 4, label: '📅 Data comemorativa', text: 'Data comemorativa. Quero um texto comercial, simpático, com emojis e sugestão de presente.' },
      { id: 5, label: '🚚 Frete/envio', text: 'Destacar frete grátis, entrega regional ou envio rápido. Quero passar segurança e facilidade para comprar online.' },
      { id: 6, label: '💳 60x boleto', text: 'Destacar parcelamento no boleto em até 60x, facilidade de pagamento e CTA para simular condições, sem inventar valor.' },
      { id: 7, label: '🔥 Últimas unidades', text: 'Criar campanha com senso de oportunidade e últimas unidades, sem exagerar e sem inventar estoque específico se não informado.' },
      { id: 8, label: '🎁 Presente ideal', text: 'Criar textos mostrando o produto como opção de presente, com tom simpático, emocional e comercial.' },
      { id: 9, label: '📲 Status WhatsApp', text: 'Criar textos bem curtos para Status do WhatsApp, com emojis, chamada rápida e linguagem simples para vender.' },
      { id: 10, label: '🛒 Grupos de venda', text: 'Criar texto para grupos de WhatsApp/Facebook. Direto, sem enrolação, com quebras de linha, benefícios e CTA no privado.' },
      { id: 11, label: '🎥 Reels rápido', text: 'Criar roteiro de Reels de até 15 segundos, com gancho forte, cenas simples de gravar na loja e CTA final.' },
      { id: 12, label: '🏆 Premium', text: 'Criar comunicação mais premium, elegante e limpa, destacando valor percebido, qualidade e confiança.' },
      { id: 13, label: '😂 Descontraído', text: 'Criar texto mais leve, divertido e próximo, sem perder o foco em venda.' },
      { id: 14, label: '📍 Região', text: 'Destacar atendimento regional, envio rápido, confiança de comprar com loja conhecida e CTA para cidades próximas.' }
    ]
  };
}

function defaultSettings() {
  return {
    companyName: 'Quality Celulares',
    segment: 'Celulares novos e usados, eletrônicos, acessórios e assistência técnica',
    city: 'Saldanha Marinho - RS',
    whatsapp: '',
    instagram: '',
    site: '',
    personality: 'automatico',
    mainProducts: 'iPhone, Samsung, Xiaomi, Motorola, JBL, Alexa, notebooks, PlayStation, smartwatches, acessórios',
    mainServices: 'Assistência técnica em celulares, notebooks e tablets'
  };
}

function defaultActionButtons() {
  return {
    items: [
      { id: 1, label: '✨ Melhorar', instruction: 'Melhore o texto mantendo a ideia principal. Deixe mais natural, bonito, comercial e com emojis.' },
      { id: 2, label: '🚀 Mais vendedor', instruction: 'Deixe o texto mais vendedor, com CTA mais forte e foco em conversão.' },
      { id: 3, label: '✂️ Mais curto', instruction: 'Resuma bastante o texto sem perder a ideia principal. Mantenha emojis e clareza.' },
      { id: 4, label: '🔥 Mais urgência', instruction: 'Aumente o senso de urgência e oportunidade, sem exagerar e sem inventar estoque.' },
      { id: 5, label: '😊 Mais amigável', instruction: 'Deixe o texto mais próximo, humano, simpático e fácil de ler.' },
      { id: 6, label: '📱 Mais emojis', instruction: 'Adicione mais emojis de forma natural, sem poluir o texto.' },
      { id: 7, label: '💰 Mais oferta', instruction: 'Destaque mais oportunidade, condição, economia, parcelamento, preço bom ou vantagem financeira, sem inventar valores.' },
      { id: 8, label: '🔄 Nova versão', instruction: 'Crie uma versão realmente diferente da anterior. Mude abertura, CTA, emojis, estrutura e abordagem.' }
    ]
  };
}

function getQuickButtons() {
  const defaults = defaultQuickButtons().items;
  const data = readJson(quickButtonsFile(), { items: [] });
  const savedItems = Array.isArray(data.items) ? data.items : [];

  if (!savedItems.length) return defaults;

  const savedKeys = new Set(
    savedItems.map(item => `${String(item.label || '').trim().toLowerCase()}|${String(item.text || '').trim().toLowerCase()}`)
  );

  const missingDefaults = defaults.filter(item => {
    const key = `${String(item.label || '').trim().toLowerCase()}|${String(item.text || '').trim().toLowerCase()}`;
    return !savedKeys.has(key);
  });

  return [...savedItems, ...missingDefaults];
}

function getSettings() {
  return { ...defaultSettings(), ...readJson(settingsFile(), {}) };
}

function getActionButtons() {
  const data = readJson(actionButtonsFile(), defaultActionButtons());
  if (!data.items || !data.items.length) return defaultActionButtons().items;
  return data.items;
}


function getContentDir(app) {
  return app?.locals?.paths?.CONTENT_DIR || path.join(process.cwd(), 'content');
}

function productsFile(app) {
  return path.join(getContentDir(app), 'products.json');
}

function formatMoneyBR(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '';
  return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getMarketingProducts(app) {
  const data = readJson(productsFile(app), { items: [] });

  return (data.items || [])
    .filter(product => product && product.active !== false && product.name)
    .map(product => ({
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      category: product.category || '',
      price: product.price ?? null,
      priceFormatted: formatMoneyBR(product.price),
      showPrice: Boolean(product.showPrice),
      featured: Boolean(product.featured),
      detailsEnabled: Boolean(product.detailsEnabled),
      descriptionShort: product.descriptionShort || '',
      descriptionLong: product.descriptionLong || '',
      image: product.image || ''
    }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));
}

function findMarketingProduct(app, id) {
  const numericId = Number(id);
  if (!numericId) return null;
  return getMarketingProducts(app).find(product => Number(product.id) === numericId) || null;
}

function buildProductContext(product) {
  if (!product) return 'Nenhum produto cadastrado selecionado.';

  const lines = [
    'PRODUTO CADASTRADO SELECIONADO:',
    `- Nome: ${product.name || 'Não informado'}`,
    `- Categoria: ${product.category || 'Não informada'}`,
    `- Preço: ${product.priceFormatted && product.showPrice ? product.priceFormatted : 'Não informado / não divulgar preço'}`,
    `- Produto em destaque na vitrine: ${product.featured ? 'Sim' : 'Não'}`,
    `- Página de detalhes ativa: ${product.detailsEnabled ? 'Sim' : 'Não'}`,
    `- Descrição curta: ${product.descriptionShort || 'Não informada'}`,
    `- Descrição longa: ${product.descriptionLong || 'Não informada'}`
  ];

 return lines.join("\n");
}


function updateHistoryItem(id, updater) {
  const numericId = Number(id);
  if (!numericId) return null;

  const data = readJson(historyFile(), { items: [] });
  data.items = data.items || [];
  const index = data.items.findIndex(item => Number(item.id) === numericId);
  if (index === -1) return null;

  data.items[index] = updater({ ...data.items[index] }) || data.items[index];
  writeJson(historyFile(), data);
  return data.items[index];
}

function getEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '..', '.env')
  ];

  for (const envPath of envPaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        const clean = line.trim();
        if (!clean || clean.startsWith('#')) continue;
        const index = clean.indexOf('=');
        if (index === -1) continue;
        const key = clean.slice(0, index).trim();
        const value = clean.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key === name) return value;
      }
    } catch (_) {}
  }

  return '';
}

function safeJsonFromText(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // 1) Tentativa principal: JSON puro.
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // 2) Tentativa secundária: JSON no meio de algum texto.
  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
  } catch (_) {}

  // 3) Último recurso: se a IA respondeu texto comum, aproveita o conteúdo
  // em vez de quebrar o painel com erro de JSON inválido.
  if (cleaned) {
    return {
      story: cleaned,
      enquete: '',
      grupo: cleaned,
      instagram: cleaned,
      reels: cleaned
    };
  }

  throw new Error('A IA não retornou conteúdo. Tente novamente.');
}

function tryParseJsonObject(value) {
  if (typeof value !== 'string') return null;

  const cleaned = value
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {}

  try {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return parsed && typeof parsed === 'object' ? parsed : null;
    }
  } catch (_) {}

  return null;
}

function deepMarketingObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return obj || {};

  const keys = ['story', 'stories', 'status', 'whatsappStatus', 'grupo', 'grupos', 'instagram', 'facebook', 'reels', 'enquete'];

  for (const key of keys) {
    const parsed = tryParseJsonObject(obj[key]);
    if (parsed) {
      return deepMarketingObject({ ...parsed, ...obj, [key]: parsed[key] ?? obj[key] }, depth + 1);
    }
  }

  // Caso clássico do bug: a IA coloca o JSON inteiro dentro de story e os outros campos vêm vazios.
  const storyParsed = tryParseJsonObject(obj.story);
  if (storyParsed) return deepMarketingObject(storyParsed, depth + 1);

  return obj;
}

function cleanMarketingText(value) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object') {
    const normalized = normalizeOutput(value);
    return normalized.story || normalized.grupo || normalized.instagram || normalized.reels || normalized.enquete || '';
  }

  const text = String(value).trim();
  const parsed = tryParseJsonObject(text);
  if (parsed) {
    const normalized = normalizeOutput(parsed);
    return normalized.story || normalized.grupo || normalized.instagram || normalized.reels || normalized.enquete || text;
  }

  return text;
}

function normalizeOutput(obj) {
  const source = deepMarketingObject(obj);

  return {
    story: cleanMarketingText(source.story || source.stories || source.status || source.whatsappStatus || ''),
    enquete: cleanMarketingText(source.enquete || source.pollStory || source.interacaoStory || source.storyInteraction || ''),
    grupo: cleanMarketingText(source.grupo || source.grupos || source.whatsappGrupo || ''),
    instagram: cleanMarketingText(source.instagram || source.facebook || source.instagramFacebook || ''),
    reels: cleanMarketingText(source.reels || source.reelsScript || source.roteiroReels || source.videoIdea || source.ideiaVideo || source.ideiaFotoVideo || '')
  };
}

function personalityLabel(value) {
  const map = {
    automatico: 'Automático',
    autoridade: 'Autoridade',
    urgencia: 'Urgência/Oportunidade',
    consultivo: 'Consultivo/Amigável',
    premium: 'Premium'
  };
  return map[value] || 'Automático';
}

function buildBusinessContext(settings = {}) {
  const s = { ...defaultSettings(), ...settings };

  return `DADOS DA EMPRESA:
- Nome: ${s.companyName || 'Não informado'}
- Segmento: ${s.segment || 'Não informado'}
- Cidade/região: ${s.city || 'Não informado'}
- WhatsApp: ${s.whatsapp || 'Não informado'}
- Instagram: ${s.instagram || 'Não informado'}
- Site: ${s.site || 'Não informado'}
- Produtos principais: ${s.mainProducts || 'Não informado'}
- Serviços principais: ${s.mainServices || 'Não informado'}
- Personalidade preferida: ${personalityLabel(s.personality)}

REGRAS SOBRE PERSONALIDADE:
- Se a personalidade for Automático, escolha o melhor tom conforme o pedido.
- Autoridade: destaque confiança, revisão, especificações, garantia, segurança e profissionalismo.
- Urgência/Oportunidade: destaque chance, escassez, velocidade e ação rápida, sem inventar estoque.
- Consultivo/Amigável: ajude o cliente a decidir, tire dúvidas e use tom próximo.
- Premium: use tom mais elegante, limpo e de valor percebido.`;
}

function buildPrompt(userPrompt, references = [], settings = {}, product = null) {
  const refs = references
    .slice(0, 12)
    .map((r, i) => `REFERÊNCIA ${i + 1} (${r.category || 'geral'}):\n${r.text}`)
    .join('\n\n');

  return `Você é um Assistente de Marketing para pequenos negócios brasileiros.
O módulo precisa funcionar para qualquer loja, usando as configurações da empresa abaixo.

${buildBusinessContext(settings)}

${buildProductContext(product)}

OBJETIVO PRINCIPAL:
Gerar conteúdo de marketing rápido, prático e pronto para copiar, com foco em vendas e redes sociais.

REGRAS OBRIGATÓRIAS:
- Responder SEMPRE em português do Brasil.
- Usar emojis em todos os textos. Emojis não podem faltar.
- Criar textos comerciais, claros, naturais e com foco em conversão.
- Não repetir o nome da empresa em todos os textos. Use no máximo em 1 texto, e só quando fizer sentido.
- Não inventar preço, estoque, garantia específica ou condição que o usuário não informou.
- Se o usuário informou garantia, parcelamento, frete, envio ou WhatsApp, aproveite isso.
- Se houver produto cadastrado selecionado, use os dados do produto como base principal.
- Se o preço do produto estiver como não informado / não divulgar preço, não mencione valor.
- Não copiar referências. Usar apenas como inspiração de estilo.
- Variar estrutura, emojis e CTA entre os canais. Não deixar todos os textos parecidos.
- Usar quebras de linha para facilitar a leitura.
- Retornar APENAS JSON válido, sem markdown, sem explicações.

REGRAS POR CANAL:

1) STORY:
- Ultra curto. Máximo 3 linhas.
- Estrutura ideal:
  Linha 1: gancho forte ou urgência.
  Linha 2: benefício principal.
  Linha 3: CTA para chamar no WhatsApp ou direct.
- Pode usar gatilhos como: última unidade, oportunidade, chegou, disponível, consulte condições.
- Não fazer textão.

2) ENQUETE STORY:
- Criar uma interação simples para Story.
- Pode ser enquete, caixinha ou pergunta rápida.
- Deve incentivar clique/resposta.
- Formato sugerido:
  Pergunta
  [Opção 1]
  [Opção 2]

3) GRUPOS WHATSAPP:
- Texto direto, vendedor e fácil de ler.
- Usar quebras de linha.
- CTA direto: chamar no privado ou WhatsApp.

4) INSTAGRAM / FACEBOOK:
- Texto mais humano e organizado.
- Usar blocos curtos com quebras de linha.
- Sempre que fizer sentido, usar estrutura PAS:
  Problema
  Agitação
  Solução
- Finalizar com CTA adequado ao Instagram/Facebook.

5) ROTEIRO REELS:
- Não dar ideia genérica.
- Criar roteiro prático de 0 a 15 segundos.
- Usar este formato compacto:
  0-3s: gancho visual
  3-8s: benefício principal
  8-12s: prova/detalhe importante
  12-15s: CTA

FORMATO OBRIGATÓRIO DO JSON:
{
  "story": "texto ultra curto para Story, com emojis e no máximo 3 linhas",
  "enquete": "enquete, caixinha ou interação para Story",
  "grupo": "texto para grupos de WhatsApp com boas quebras de linha",
  "instagram": "legenda para Instagram/Facebook com boas quebras de linha",
  "reels": "roteiro de Reels em 0-3s, 3-8s, 8-12s e 12-15s"
}

REFERÊNCIAS SALVAS PARA INSPIRAÇÃO:
${refs || 'Nenhuma referência cadastrada ainda.'}

PEDIDO ATUAL DO USUÁRIO:
${userPrompt}`;
}

function buildRewritePrompt({ originalPrompt, channel, text, instruction, settings }) {
  const action = instruction || 'Melhorar mantendo a mesma ideia.';

  return `Você é um Assistente de Marketing para pequenos negócios brasileiros.
O usuário quer reformular um texto já criado, usando uma ação rápida.
A resposta deve ser rápida, prática e melhor que a versão anterior.

${buildBusinessContext(settings)}

REGRAS GERAIS:
- Responder em português do Brasil.
- Manter a ideia principal do texto atual, a menos que a ação peça uma nova versão.
- Usar emojis. Emojis não podem faltar.
- Não inventar preço, estoque, garantia específica ou condição não informada.
- Não repetir nome da empresa sem necessidade.
- Usar boas quebras de linha.
- Se for Story, manter ultra curto, máximo 3 linhas.
- Se for Reels, manter roteiro por tempo.
- Retornar APENAS JSON válido neste formato:
{ "text": "texto reformulado" }

AÇÃO SOLICITADA:
${action}

PEDIDO ORIGINAL:
${originalPrompt || 'Não informado'}

CANAL:
${channel || 'geral'}

TEXTO ATUAL:
${text}`;
}



function chatTextValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    return String(value.reply || value.resposta || value.message || value.text || JSON.stringify(value)).trim();
  }
  return String(value).trim();
}

function normalizeChatMessages(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .map(item => ({
      role: item.role === 'model' ? 'model' : 'user',
      text: chatTextValue(item.text || item.reply || item.message || ''),
      createdAt: item.createdAt || new Date().toISOString()
    }))
    .filter(item => item.text && item.text !== '[object Object]')
    .slice(-40);
}

function getChatHistory() {
  const data = readJson(chatHistoryFile(), { items: [] });
  return normalizeChatMessages(data.items || []);
}

function saveChatHistory(items = []) {
  writeJson(chatHistoryFile(), { items: normalizeChatMessages(items).slice(-40) });
}

function buildChatSystemInstruction(settings = {}, recentGenerations = []) {
  const recent = (recentGenerations || [])
    .slice(0, 8)
    .map((item, index) => `GERAÇÃO RECENTE ${index + 1}:\nPedido: ${item.prompt || ''}\nStory: ${item.output?.story || ''}\nGrupo: ${item.output?.grupo || ''}`)
    .join('\n\n');

  return `Você é o assistente estratégico interno da empresa e atua como um colaborador de marketing e vendas dentro do painel.

${buildBusinessContext(settings)}

CONTEXTO FIXO DO ASSISTENTE:
- Ajude o dono da loja com marketing, vendas, ideias de conteúdo, campanhas, posicionamento, atendimento e decisões práticas.
- Entenda a realidade de uma loja pequena/local e sugira ações simples, baratas e rápidas de executar.
- Sempre que fizer sentido, direcione para WhatsApp, Direct, grupos, Status, Stories, Reels, site e vitrine.
- Aproveite diferenciais informados nas configurações, como cidade/região, produtos, serviços, parcelamento, frete, garantia ou assistência.
- Não invente preço, estoque, garantia específica, prazo ou condição que não esteja no contexto ou na pergunta.
- Se o usuário perguntar algo curto como “e para Instagram?”, continue o assunto anterior usando o histórico da conversa.
- Responda em português do Brasil, com tom prático, comercial e humano.
- Use emojis quando ajudar na leitura, sem exagerar.
- Responda de forma direta, como chat interno. Pode usar quebras de linha e emojis. Não precisa usar markdown pesado.

HISTÓRICO RECENTE DE GERAÇÕES DO MARKETING IA:
${recent || 'Nenhum histórico recente.'}`;
}

function buildGeminiChatContents(messages = []) {
  return normalizeChatMessages(messages).map(item => ({
    role: item.role,
    parts: [{ text: item.text }]
  }));
}

function normalizeChatOutput(obj) {
  if (obj === null || obj === undefined) return { reply: '' };
  if (typeof obj === 'string') return { reply: obj.trim() };

  const direct = obj.reply || obj.resposta || obj.answer || obj.respostaIa || obj.ai || obj.message || obj.text || obj.content || obj.output || obj.result;

  if (typeof direct === 'string') return { reply: direct.trim() };
  if (direct && typeof direct === 'object') return normalizeChatOutput(direct);

  return { reply: chatTextValue(obj) };
}

function extractChatReplyFromText(text) {
  const raw = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!raw) return '';

  try {
    return normalizeChatOutput(JSON.parse(raw)).reply;
  } catch (_) {
    return raw;
  }
}

function normalizeCampaignOutput(obj) {
  const rawIdeas = Array.isArray(obj.ideas) ? obj.ideas : Array.isArray(obj.sugestoes) ? obj.sugestoes : [];
  const ideas = rawIdeas.map((idea, index) => ({
    title: String(idea.title || idea.titulo || `Campanha ${index + 1}`).trim(),
    channel: String(idea.channel || idea.canal || 'Instagram/WhatsApp').trim(),
    description: String(idea.description || idea.descricao || idea.text || '').trim(),
    cta: String(idea.cta || idea.chamada || 'Chame no WhatsApp').trim()
  })).filter(idea => idea.description || idea.title);

  return { ideas };
}

function normalizeCalendarOutput(obj) {
  const rawDays = Array.isArray(obj.days) ? obj.days : Array.isArray(obj.dias) ? obj.dias : [];
  const days = rawDays.map((day, index) => ({
    day: String(day.day || day.dia || `Dia ${index + 1}`).trim(),
    channel: String(day.channel || day.canal || 'Instagram/WhatsApp').trim(),
    title: String(day.title || day.titulo || 'Postagem').trim(),
    content: String(day.content || day.conteudo || day.text || '').trim(),
    objective: String(day.objective || day.objetivo || 'Vendas').trim()
  })).filter(day => day.content || day.title);

  return { days };
}

function buildCampaignSuggestionsPrompt({ focus, settings, products = [], history = [] }) {
  const productsText = products
    .slice(0, 30)
    .map(product => `- ${product.name}${product.category ? ' | ' + product.category : ''}${product.priceFormatted && product.showPrice ? ' | ' + product.priceFormatted : ''}`)
    .join('\n');

  const historyText = history
    .slice(0, 10)
    .map(item => `- ${item.prompt || ''}`)
    .join('\n');

  return `Você é um estrategista de marketing para pequenos negócios brasileiros.

${buildBusinessContext(settings)}

OBJETIVO:
Criar sugestões automáticas de campanhas simples, rápidas e baratas para vender mais.

REGRAS:
- Responder em português do Brasil.
- Criar 6 sugestões diferentes.
- Priorizar ações fáceis para Instagram, WhatsApp, grupos e site.
- Não inventar preço, estoque ou garantia.
- Usar ideias aplicáveis na rotina da loja.
- Retornar APENAS JSON válido neste formato:
{
  "ideas": [
    { "title": "Nome curto da campanha", "channel": "Canal principal", "description": "Como fazer a campanha", "cta": "CTA sugerido" }
  ]
}

FOCO INFORMADO PELO USUÁRIO:
${focus || 'Sem foco específico. Sugira campanhas gerais de venda.'}

PRODUTOS CADASTRADOS ATIVOS:
${productsText || 'Nenhum produto cadastrado encontrado.'}

HISTÓRICO RECENTE DE CAMPANHAS/GERAÇÕES:
${historyText || 'Nenhum histórico recente.'}`;
}

function buildCalendarPrompt({ days, focus, settings, products = [] }) {
  const count = Math.min(Math.max(Number(days) || 7, 3), 30);
  const productsText = products
    .slice(0, 35)
    .map(product => `- ${product.name}${product.category ? ' | ' + product.category : ''}${product.priceFormatted && product.showPrice ? ' | ' + product.priceFormatted : ''}`)
    .join('\n');

  return `Você é um planejador de conteúdo para pequenos negócios brasileiros.

${buildBusinessContext(settings)}

OBJETIVO:
Criar um calendário simples de conteúdo para ${count} dias.

REGRAS:
- Responder em português do Brasil.
- Misturar venda direta, prova/confiança, produto, serviço, interação e Reels.
- Usar canais como Story, Feed, Reels, Status WhatsApp e Grupos.
- Conteúdo curto, fácil de executar e com CTA.
- Não inventar preço, estoque ou condição.
- Retornar APENAS JSON válido neste formato:
{
  "days": [
    { "day": "Dia 1", "channel": "Canal", "title": "Tema", "content": "Ideia pronta do conteúdo", "objective": "Objetivo" }
  ]
}

FOCO DO CALENDÁRIO:
${focus || 'Vendas gerais e presença diária.'}

PRODUTOS CADASTRADOS ATIVOS:
${productsText || 'Nenhum produto cadastrado encontrado.'}`;
}


function geminiModelsToTry() {
  const preferred = getEnvValue('GEMINI_MODEL') || '';
  const fallback = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ];

  return [...new Set([preferred, ...fallback].map(v => String(v || '').trim()).filter(Boolean))];
}

function isTemporaryGeminiError(message = '', status = 0) {
  const text = String(message || '').toLowerCase();
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    text.includes('high demand') ||
    text.includes('overloaded') ||
    text.includes('temporarily') ||
    text.includes('try again later') ||
    text.includes('unavailable') ||
    text.includes('rate limit') ||
    text.includes('quota')
  );
}

function friendlyGeminiError(error) {
  const msg = String(error?.message || error || '');

  if (/GEMINI_API_KEY/i.test(msg) || msg.includes('Chave do Gemini')) {
    return msg;
  }

  if (isTemporaryGeminiError(msg, error?.status)) {
    return '⚠️ A IA está congestionada no momento. Aguarde alguns segundos e tente novamente.';
  }

  if (/not found|not supported|not available|invalid/i.test(msg)) {
    return '⚠️ O modelo de IA configurado não respondeu corretamente. Verifique o GEMINI_MODEL no arquivo .env ou tente novamente.';
  }

  return msg || 'Erro ao chamar a IA.';
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGeminiApi({ body, responseJson = false }) {
  const apiKey = getEnvValue('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('Chave do Gemini não configurada. Crie um arquivo .env na pasta painel com GEMINI_API_KEY=sua_chave_aqui');
  }

  const models = geminiModelsToTry();
  let lastError = null;

  for (let index = 0; index < models.length; index++) {
    const model = models[index];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const requestBody = JSON.parse(JSON.stringify(body));
      requestBody.generationConfig = requestBody.generationConfig || {};

      if (responseJson) {
        requestBody.generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = data?.error?.message || `Erro ao chamar a API do Gemini (${response.status}).`;
        const err = new Error(msg);
        err.status = response.status;
        err.model = model;
        throw err;
      }

      const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
      if (!text) {
        const err = new Error('A IA não retornou conteúdo. Tente novamente.');
        err.model = model;
        throw err;
      }

      if (index > 0) {
        console.log(`✅ Gemini respondeu usando modelo alternativo: ${model}`);
      }

      return text;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Falha no Gemini (${model}): ${error.message}`);

      if (!isTemporaryGeminiError(error.message, error.status) && index === 0 && getEnvValue('GEMINI_MODEL')) {
        // Se o modelo do .env falhou por nome/configuração, ainda tenta os fallbacks abaixo.
      }

      if (index < models.length - 1) {
        await wait(isTemporaryGeminiError(error.message, error.status) ? 900 : 250);
        continue;
      }
    }
  }

  throw new Error(friendlyGeminiError(lastError));
}

async function callGemini(prompt) {
  const text = await callGeminiApi({
    responseJson: true,
    body: {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.88,
        topP: 0.95,
        maxOutputTokens: 1400
      }
    }
  });

  return safeJsonFromText(text);
}


async function callGeminiChat({ systemInstruction, contents }) {
  const text = await callGeminiApi({
    responseJson: false,
    body: {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents,
      generationConfig: {
        temperature: 0.82,
        topP: 0.95,
        maxOutputTokens: 1800
      }
    }
  });

  // Chat IA deve aceitar texto normal ou JSON.
  // Assim evitamos erro quando o Gemini responder de forma livre.
  return { reply: extractChatReplyFromText(text) };
}


router.get('/', (req, res) => {
  const referencesData = readJson(referencesFile(), { items: [] });
  const historyData = readJson(historyFile(), { items: [] });

  let flash = null;
  if (req.query.saved === 'reference') flash = '✅ Referência salva com sucesso.';
  if (req.query.deleted === 'reference') flash = '🗑️ Referência excluída com sucesso.';
  if (req.query.deleted === 'history') flash = '🗑️ Histórico atualizado com sucesso.';
  if (req.query.saved === 'quick') flash = '✅ Botões rápidos salvos com sucesso.';
  if (req.query.saved === 'settings') flash = '✅ Configurações salvas com sucesso.';
  if (req.query.saved === 'actions') flash = '✅ Ações IA salvas com sucesso.';

  res.render('marketing', {
    flash,
    references: referencesData.items || [],
    history: historyData.items || [],
    quickButtons: getQuickButtons(),
    actionButtons: getActionButtons(),
    marketingSettings: getSettings(),
    marketingProducts: getMarketingProducts(req.app),
    hasGeminiKey: Boolean(getEnvValue('GEMINI_API_KEY'))
  });
});

router.post('/generate', async (req, res) => {
  try {
    const userPrompt = String(req.body.prompt || '').trim();
    const productId = String(req.body.productId || '').trim();
    const selectedProduct = findMarketingProduct(req.app, productId);

    if (!userPrompt && !selectedProduct) {
      return res.status(400).json({ success: false, message: 'Digite o que deseja criar ou selecione um produto cadastrado.' });
    }

    const effectivePrompt = userPrompt || `Criar divulgação para o produto cadastrado: ${selectedProduct.name}`;
    const referencesData = readJson(referencesFile(), { items: [] });
    const settings = getSettings();
    const output = normalizeOutput(await callGemini(buildPrompt(effectivePrompt, referencesData.items || [], settings, selectedProduct)));

    const historyData = readJson(historyFile(), { items: [] });
    historyData.items = historyData.items || [];
    const historyItem = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      prompt: effectivePrompt,
      productId: selectedProduct?.id || null,
      productName: selectedProduct?.name || '',
      output
    };
    historyData.items.unshift(historyItem);
    historyData.items = historyData.items.slice(0, 100);
    writeJson(historyFile(), historyData);

    return res.json({ success: true, output, historyItem });
  } catch (error) {
    console.error('Erro no Marketing IA:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao gerar conteúdo.' });
  }
});

router.post('/rewrite', async (req, res) => {
  try {
    const originalPrompt = String(req.body.originalPrompt || '').trim();
    const channel = String(req.body.channel || '').trim();
    const text = String(req.body.text || '').trim();
    const instruction = String(req.body.instruction || '').trim();

    if (!text) {
      return res.status(400).json({ success: false, message: 'Não há texto para reformular.' });
    }

    const output = await callGemini(buildRewritePrompt({
      originalPrompt,
      channel,
      text,
      instruction,
      settings: getSettings()
    }));
    const newText = String(output.text || '').trim();

    if (!newText) throw new Error('A IA não retornou o texto reformulado.');

    return res.json({ success: true, text: newText });
  } catch (error) {
    console.error('Erro ao reformular no Marketing IA:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao reformular texto.' });
  }
});


router.get('/chat/history', (req, res) => {
  try {
    return res.json({ success: true, items: getChatHistory() });
  } catch (error) {
    console.error('Erro ao carregar histórico do Chat IA:', error);
    return res.status(500).json({ success: false, message: 'Erro ao carregar histórico do Chat IA.' });
  }
});

router.post('/chat/clear', (req, res) => {
  try {
    saveChatHistory([]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao limpar Chat IA:', error);
    return res.status(500).json({ success: false, message: 'Erro ao limpar Chat IA.' });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) {
      return res.status(400).json({ success: false, message: 'Digite uma pergunta para o Chat IA.' });
    }

    const marketingHistoryData = readJson(historyFile(), { items: [] });
    const currentChat = getChatHistory();
    const userMessage = { role: 'user', text: message, createdAt: new Date().toISOString() };
    const messagesToSend = [...currentChat, userMessage].slice(-24);

    const output = normalizeChatOutput(await callGeminiChat({
      systemInstruction: buildChatSystemInstruction(getSettings(), marketingHistoryData.items || []),
      contents: buildGeminiChatContents(messagesToSend)
    }));

    if (!output.reply) throw new Error('A IA não retornou resposta.');

    const modelMessage = { role: 'model', text: output.reply, createdAt: new Date().toISOString() };
    const savedMessages = [...currentChat, userMessage, modelMessage].slice(-40);
    saveChatHistory(savedMessages);

    return res.json({ success: true, reply: output.reply, items: savedMessages });
  } catch (error) {
    console.error('Erro no Chat IA de Marketing:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro no Chat IA.' });
  }
});

router.post('/campaign-suggestions', async (req, res) => {
  try {
    const focus = String(req.body.focus || '').trim();
    const historyData = readJson(historyFile(), { items: [] });
    const output = normalizeCampaignOutput(await callGemini(buildCampaignSuggestionsPrompt({
      focus,
      settings: getSettings(),
      products: getMarketingProducts(req.app),
      history: historyData.items || []
    })));

    if (!output.ideas.length) throw new Error('A IA não retornou sugestões.');
    return res.json({ success: true, ideas: output.ideas });
  } catch (error) {
    console.error('Erro nas sugestões de campanhas:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao gerar sugestões.' });
  }
});

router.post('/content-calendar', async (req, res) => {
  try {
    const focus = String(req.body.focus || '').trim();
    const days = Number(req.body.days || 7);
    const output = normalizeCalendarOutput(await callGemini(buildCalendarPrompt({
      days,
      focus,
      settings: getSettings(),
      products: getMarketingProducts(req.app)
    })));

    if (!output.days.length) throw new Error('A IA não retornou o calendário.');
    return res.json({ success: true, days: output.days });
  } catch (error) {
    console.error('Erro no calendário de conteúdo:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao gerar calendário.' });
  }
});

router.post('/settings/save', (req, res) => {
  const settings = {
    companyName: String(req.body.companyName || '').trim(),
    segment: String(req.body.segment || '').trim(),
    city: String(req.body.city || '').trim(),
    whatsapp: String(req.body.whatsapp || '').trim(),
    instagram: String(req.body.instagram || '').trim(),
    site: String(req.body.site || '').trim(),
    personality: String(req.body.personality || 'automatico').trim(),
    mainProducts: String(req.body.mainProducts || '').trim(),
    mainServices: String(req.body.mainServices || '').trim()
  };

  writeJson(settingsFile(), settings);
  console.log('⚙️ Configurações do Marketing IA salvas com sucesso.');
console.log(`🏢 Empresa: ${settings.companyName || 'Não informada'}`);
console.log(`📍 Cidade: ${settings.city || 'Não informada'}`);
console.log(`🎭 Personalidade: ${settings.personality || 'automatico'}`);
  res.redirect('/marketing?saved=settings');
});

router.post('/references/add', (req, res) => {
  const text = String(req.body.text || '').trim();
  const category = String(req.body.category || 'Geral').trim() || 'Geral';

  if (!text) return res.redirect('/marketing');

  const data = readJson(referencesFile(), { items: [] });
  data.items = data.items || [];
  data.items.unshift({
    id: Date.now(),
    createdAt: new Date().toISOString(),
    category,
    text
  });
  data.items = data.items.slice(0, 200);
  writeJson(referencesFile(), data);

  res.redirect('/marketing?saved=reference');
});

router.post('/references/delete', (req, res) => {
  const id = Number(req.body.id);
  const data = readJson(referencesFile(), { items: [] });
  data.items = (data.items || []).filter(item => Number(item.id) !== id);
  writeJson(referencesFile(), data);
  res.redirect('/marketing?deleted=reference');
});

router.post('/history/delete', (req, res) => {
  const id = Number(req.body.id);
  const data = readJson(historyFile(), { items: [] });
  data.items = (data.items || []).filter(item => Number(item.id) !== id);
  writeJson(historyFile(), data);
  res.redirect('/marketing?deleted=history');
});

router.post('/history/clear', (req, res) => {
  writeJson(historyFile(), { items: [] });
  res.redirect('/marketing?deleted=history');
});


router.post('/history/favorite', (req, res) => {
  try {
    const item = updateHistoryItem(req.body.id, current => {
      current.favorite = !Boolean(current.favorite);
      current.updatedAt = new Date().toISOString();
      return current;
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item do histórico não encontrado.' });
    }

    return res.json({ success: true, id: item.id, favorite: Boolean(item.favorite) });
  } catch (error) {
    console.error('Erro ao favoritar histórico:', error);
    return res.status(500).json({ success: false, message: 'Erro ao favoritar histórico.' });
  }
});

router.post('/history/feedback', (req, res) => {
  try {
    const feedback = String(req.body.feedback || '').trim();
    if (!['like', 'dislike'].includes(feedback)) {
      return res.status(400).json({ success: false, message: 'Feedback inválido.' });
    }

    const item = updateHistoryItem(req.body.id, current => {
      current.feedback = current.feedback === feedback ? '' : feedback;
      current.feedbackAt = current.feedback ? new Date().toISOString() : '';
      current.updatedAt = new Date().toISOString();
      return current;
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item do histórico não encontrado.' });
    }

    return res.json({ success: true, id: item.id, feedback: item.feedback || '' });
  } catch (error) {
    console.error('Erro ao salvar feedback do histórico:', error);
    return res.status(500).json({ success: false, message: 'Erro ao salvar feedback.' });
  }
});

router.post('/quick-buttons/save', (req, res) => {
  const labels = Array.isArray(req.body.label) ? req.body.label : req.body.label ? [req.body.label] : [];
  const texts = Array.isArray(req.body.text) ? req.body.text : req.body.text ? [req.body.text] : [];
  const ids = Array.isArray(req.body.id) ? req.body.id : req.body.id ? [req.body.id] : [];
  const removeIds = Array.isArray(req.body.removeId) ? req.body.removeId.map(Number) : req.body.removeId ? [Number(req.body.removeId)] : [];

  const items = [];
  labels.forEach((label, index) => {
    const id = Number(ids[index] || Date.now() + index);
    const cleanLabel = String(label || '').trim();
    const cleanText = String(texts[index] || '').trim();
    if (!cleanLabel || !cleanText) return;
    if (removeIds.includes(id)) return;
    items.push({ id: id || Date.now() + index, label: cleanLabel, text: cleanText });
  });

  const newLabel = String(req.body.newLabel || '').trim();
  const newText = String(req.body.newText || '').trim();
  if (newLabel && newText) {
    items.push({ id: Date.now(), label: newLabel, text: newText });
  }

  writeJson(quickButtonsFile(), { items });
  res.redirect('/marketing?saved=quick');
});

router.post('/action-buttons/save', (req, res) => {
  const labels = Array.isArray(req.body.label) ? req.body.label : req.body.label ? [req.body.label] : [];
  const instructions = Array.isArray(req.body.instruction) ? req.body.instruction : req.body.instruction ? [req.body.instruction] : [];
  const ids = Array.isArray(req.body.id) ? req.body.id : req.body.id ? [req.body.id] : [];
  const removeIds = Array.isArray(req.body.removeId) ? req.body.removeId.map(Number) : req.body.removeId ? [Number(req.body.removeId)] : [];

  const items = [];
  labels.forEach((label, index) => {
    const id = Number(ids[index] || Date.now() + index);
    const cleanLabel = String(label || '').trim();
    const cleanInstruction = String(instructions[index] || '').trim();
    if (!cleanLabel || !cleanInstruction) return;
    if (removeIds.includes(id)) return;
    items.push({ id: id || Date.now() + index, label: cleanLabel, instruction: cleanInstruction });
  });

  const newLabel = String(req.body.newLabel || '').trim();
  const newInstruction = String(req.body.newInstruction || '').trim();
  if (newLabel && newInstruction) {
    items.push({ id: Date.now(), label: newLabel, instruction: newInstruction });
  }

  writeJson(actionButtonsFile(), { items });
  res.redirect('/marketing?saved=actions');
});

export default router;
