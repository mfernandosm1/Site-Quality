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

function defaultQuickButtons() {
  return {
    items: [
      { id: 1, label: '📱 Produto', text: 'Produto disponível para venda. Quero textos curtos, vendedores e com emojis.' },
      { id: 2, label: '🔧 Assistência', text: 'Assistência técnica em celulares, notebooks ou tablets. Quero passar confiança e profissionalismo.' },
      { id: 3, label: '🎉 Promoção', text: 'Promoção por tempo limitado. Quero criar urgência sem exagerar.' },
      { id: 4, label: '📅 Data comemorativa', text: 'Data comemorativa. Quero um texto comercial, simpático e com emojis.' },
      { id: 5, label: '🚚 Frete/envio', text: 'Destacar frete grátis, entrega regional ou envio rápido.' }
    ]
  };
}

function getQuickButtons() {
  const data = readJson(quickButtonsFile(), defaultQuickButtons());
  if (!data.items || !data.items.length) return defaultQuickButtons().items;
  return data.items;
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

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('A IA não retornou JSON válido. Tente gerar novamente.');
  }
}

function normalizeOutput(obj) {
  const story = String(obj.story || obj.stories || obj.status || obj.whatsappStatus || '').trim();
  return {
    story,
    grupo: String(obj.grupo || obj.grupos || obj.whatsappGrupo || '').trim(),
    instagram: String(obj.instagram || obj.facebook || obj.instagramFacebook || '').trim(),
    videoIdea: String(obj.videoIdea || obj.ideiaVideo || obj.ideiaFotoVideo || '').trim()
  };
}

function buildPrompt(userPrompt, references = []) {
  const refs = references
    .slice(0, 12)
    .map((r, i) => `REFERÊNCIA ${i + 1} (${r.category || 'geral'}):\n${r.text}`)
    .join('\n\n');

  return `Você é o Assistente de Marketing da Quality Celulares, loja brasileira que vende celulares novos e usados, eletrônicos, acessórios e assistência técnica.

REGRAS OBRIGATÓRIAS:
- Responder SEMPRE em português do Brasil.
- Usar emojis em todos os textos. Emojis não podem faltar.
- Criar textos comerciais, curtos, claros e com foco em venda.
- Não repetir "Quality Celulares" em todos os textos. Use o nome da loja no máximo em 1 dos textos, e só quando fizer sentido.
- Evitar textos longos demais, exagerados ou artificiais.
- Não inventar preço, estoque, garantia específica ou condição que o usuário não informou.
- Se fizer sentido, mencionar garantia, parcelamento, envio, frete, WhatsApp e atendimento regional.
- Não copiar referências. Usar apenas como inspiração de estilo.
- Adaptar o texto para cada canal.
- Usar quebras de linha para facilitar leitura, principalmente em grupos e Instagram.
- O texto de story também será usado em status do WhatsApp, então ele deve ser ULTRA curto: no máximo 2 ou 3 linhas.
- O texto de grupos WhatsApp pode ser um pouco maior, mas deve ser direto.
- O texto de Instagram/Facebook pode ser mais completo, mas ainda sem textão.
- Retornar APENAS JSON válido, sem markdown, sem explicações.

FORMATO OBRIGATÓRIO DO JSON:
{
  "story": "texto ultra curto para Story/Status, com emojis e no máximo 2 ou 3 linhas",
  "grupo": "texto para grupos de WhatsApp com boas quebras de linha",
  "instagram": "legenda para Instagram/Facebook com boas quebras de linha",
  "videoIdea": "ideia simples de foto, vídeo ou arte"
}

REFERÊNCIAS SALVAS PARA INSPIRAÇÃO:
${refs || 'Nenhuma referência cadastrada ainda.'}

PEDIDO ATUAL DO USUÁRIO:
${userPrompt}`;
}

function buildRewritePrompt({ originalPrompt, channel, text, instruction }) {
  return `Você é o Assistente de Marketing da Quality Celulares.

O usuário gostou parcialmente de um texto e quer continuar a conversa com base no que já foi criado.

REGRAS:
- Responder em português do Brasil.
- Manter a ideia principal do texto original.
- Reformular para ficar mais vendedor, natural e bonito.
- Usar emojis. Emojis não podem faltar.
- Não inventar preço, estoque, garantia específica ou condição não informada.
- Não repetir "Quality Celulares" sem necessidade.
- Usar boas quebras de linha.
- Se for Story/Status, manter ultra curto.
- Retornar APENAS JSON válido neste formato:
{ "text": "texto reformulado" }

PEDIDO ORIGINAL:
${originalPrompt || 'Não informado'}

CANAL:
${channel || 'geral'}

INSTRUÇÃO EXTRA DO USUÁRIO:
${instruction || 'Melhorar mantendo a mesma ideia.'}

TEXTO ATUAL:
${text}`;
}

async function callGemini(prompt) {
  const apiKey = getEnvValue('GEMINI_API_KEY');
  const model = getEnvValue('GEMINI_MODEL') || 'gemini-2.5-flash-lite';

  if (!apiKey) {
    throw new Error('Chave do Gemini não configurada. Crie um arquivo .env na pasta painel com GEMINI_API_KEY=sua_chave_aqui');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json'
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || 'Erro ao chamar a API do Gemini.';
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('A IA não retornou conteúdo. Tente novamente.');

  return safeJsonFromText(text);
}

router.get('/', (req, res) => {
  const referencesData = readJson(referencesFile(), { items: [] });
  const historyData = readJson(historyFile(), { items: [] });

  let flash = null;
  if (req.query.saved === 'reference') flash = '✅ Referência salva com sucesso.';
  if (req.query.deleted === 'reference') flash = '🗑️ Referência excluída com sucesso.';
  if (req.query.deleted === 'history') flash = '🗑️ Histórico atualizado com sucesso.';
  if (req.query.saved === 'quick') flash = '✅ Botões rápidos salvos com sucesso.';

  res.render('marketing', {
    flash,
    references: referencesData.items || [],
    history: historyData.items || [],
    quickButtons: getQuickButtons(),
    hasGeminiKey: Boolean(getEnvValue('GEMINI_API_KEY'))
  });
});

router.post('/generate', async (req, res) => {
  try {
    const userPrompt = String(req.body.prompt || '').trim();
    if (!userPrompt) {
      return res.status(400).json({ success: false, message: 'Digite o que deseja criar.' });
    }

    const referencesData = readJson(referencesFile(), { items: [] });
    const output = normalizeOutput(await callGemini(buildPrompt(userPrompt, referencesData.items || [])));

    const historyData = readJson(historyFile(), { items: [] });
    historyData.items = historyData.items || [];
    const historyItem = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      prompt: userPrompt,
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

    const output = await callGemini(buildRewritePrompt({ originalPrompt, channel, text, instruction }));
    const newText = String(output.text || '').trim();

    if (!newText) throw new Error('A IA não retornou o texto reformulado.');

    return res.json({ success: true, text: newText });
  } catch (error) {
    console.error('Erro ao reformular no Marketing IA:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro ao reformular texto.' });
  }
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

router.post('/quick-buttons/save', (req, res) => {
  const labels = Array.isArray(req.body.label) ? req.body.label : req.body.label ? [req.body.label] : [];
  const texts = Array.isArray(req.body.text) ? req.body.text : req.body.text ? [req.body.text] : [];
  const removeIds = Array.isArray(req.body.removeId) ? req.body.removeId.map(Number) : req.body.removeId ? [Number(req.body.removeId)] : [];

  const items = [];
  labels.forEach((label, index) => {
    const id = Number(req.body.id && Array.isArray(req.body.id) ? req.body.id[index] : (Array.isArray(req.body.id) ? req.body.id[index] : Date.now() + index));
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

export default router;
