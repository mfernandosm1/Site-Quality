import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const MODULE_VERSION = '0.1.1';

function P(app){ return app.locals.paths; }
function moduleDir(app){ return path.join(P(app).CONTENT_DIR, 'automacao_whatsapp'); }
function filePath(app, name){ return path.join(moduleDir(app), name); }
function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true }); }
function now(){ return new Date().toISOString(); }
function makeId(prefix='item'){
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}
function safeText(value, max=500){
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}
function safeNumber(value, fallback=0, min=0, max=3600){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
function readJson(app, name, fallback){
  try {
    const fp = filePath(app, name);
    if(!fs.existsSync(fp)) return fallback;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return fallback;
  }
}
function writeJson(app, name, data){
  ensureDir(moduleDir(app));
  fs.writeFileSync(filePath(app, name), JSON.stringify(data, null, 2), 'utf-8');
}
function defaults(){
  return {
    blocos: [
      {
        id: 'bloco_menu_inicial',
        nome: 'Menu inicial',
        descricao: 'Exemplo de bloco com texto, pausa e opções.',
        gatilho: 'menu',
        ativo: true,
        criadoEm: now(),
        atualizadoEm: now(),
        etapas: [
          { id: makeId('etapa'), tipo: 'texto', texto: 'Olá 😃\nEscolha uma opção:\n\n1️⃣ Smartphones\n2️⃣ Assistência', digitandoSegundos: 2 },
          { id: makeId('etapa'), tipo: 'pausa', segundos: 3 },
          { id: makeId('etapa'), tipo: 'opcoes', texto: 'Responda com o número desejado:', opcoes: [
            { label: '1️⃣ Smartphones', resposta: '1', proximoBloco: 'Smartphones' },
            { label: '2️⃣ Assistência', resposta: '2', proximoBloco: 'Assistência' }
          ]}
        ]
      }
    ],
    contatos: [],
    fila: [],
    logs: [],
    config: {
      version: MODULE_VERSION,
      whatsappConectado: false,
      envioRealAtivo: false,
      horarioAniversario: '08:00',
      limiteDiario: 40,
      delayHumanoMin: 4,
      delayHumanoMax: 12,
      digitandoPadrao: 2,
      gravandoAudioPadrao: 2,
      criadoEm: now(),
      atualizadoEm: now()
    }
  };
}
function ensureData(app){
  const d = defaults();
  ensureDir(moduleDir(app));
  if(!fs.existsSync(filePath(app, 'blocos.json'))) writeJson(app, 'blocos.json', d.blocos);
  if(!fs.existsSync(filePath(app, 'contatos.json'))) writeJson(app, 'contatos.json', d.contatos);
  if(!fs.existsSync(filePath(app, 'fila.json'))) writeJson(app, 'fila.json', d.fila);
  if(!fs.existsSync(filePath(app, 'logs.json'))) writeJson(app, 'logs.json', d.logs);
  if(!fs.existsSync(filePath(app, 'config.json'))) writeJson(app, 'config.json', d.config);
}
function loadAll(app){
  ensureData(app);
  const d = defaults();
  return {
    blocos: readJson(app, 'blocos.json', d.blocos),
    contatos: readJson(app, 'contatos.json', d.contatos),
    fila: readJson(app, 'fila.json', d.fila),
    logs: readJson(app, 'logs.json', d.logs),
    config: readJson(app, 'config.json', d.config)
  };
}
function normalizeSteps(raw){
  let steps = [];
  try { steps = JSON.parse(raw || '[]'); } catch { steps = []; }
  if(!Array.isArray(steps)) steps = [];

  return steps.slice(0, 80).map((s) => {
    const tipo = safeText(s.tipo || 'texto', 30);
    const base = { id: safeText(s.id || makeId('etapa'), 80), tipo };

    if(tipo === 'texto'){
      return { ...base, texto: safeText(s.texto, 4000), digitandoSegundos: safeNumber(s.digitandoSegundos, 0, 0, 180) };
    }
    if(tipo === 'pausa'){
      return { ...base, segundos: safeNumber(s.segundos, 3, 0, 600) };
    }
    if(tipo === 'audio'){
      return { ...base, caminho: safeText(s.caminho, 600), gravandoSegundos: safeNumber(s.gravandoSegundos, 2, 0, 180), legenda: safeText(s.legenda, 1000) };
    }
    if(tipo === 'imagem'){
      return { ...base, caminho: safeText(s.caminho, 600), legenda: safeText(s.legenda, 1500) };
    }
    if(tipo === 'arquivo'){
      return { ...base, caminho: safeText(s.caminho, 600), legenda: safeText(s.legenda, 1500) };
    }
    if(tipo === 'opcoes'){
      const opcoes = Array.isArray(s.opcoes) ? s.opcoes.slice(0, 10).map(o => ({
        label: safeText(o.label, 120),
        resposta: safeText(o.resposta, 30),
        proximoBloco: safeText(o.proximoBloco, 120)
      })).filter(o => o.label || o.resposta || o.proximoBloco) : [];
      return { ...base, texto: safeText(s.texto, 1500), opcoes };
    }
    return { ...base, tipo:'texto', texto: safeText(s.texto || '', 4000), digitandoSegundos: 0 };
  });
}
function flash(res, url, msg){
  res.redirect(url + (url.includes('?') ? '&' : '?') + 'flash=' + encodeURIComponent(msg));
}

router.get('/', (req,res)=>{
  const data = loadAll(req.app);
  const tab = safeText(req.query.tab || 'dashboard', 30);
  const editId = safeText(req.query.edit || '', 120);
  const blocoEdit = data.blocos.find(b => b.id === editId) || null;
  res.render('automacao_whatsapp', {
    flash: req.query.flash || null,
    version: MODULE_VERSION,
    tab,
    blocoEdit,
    ...data
  });
});

router.post('/blocos/salvar', (req,res)=>{
  const data = loadAll(req.app);
  const body = req.body || {};
  const id = safeText(body.id || makeId('bloco'), 120);
  const existing = data.blocos.find(b => b.id === id);
  const bloco = {
    id,
    nome: safeText(body.nome, 160) || 'Bloco sem nome',
    descricao: safeText(body.descricao, 500),
    gatilho: safeText(body.gatilho, 120),
    ativo: body.ativo === 'on' || body.ativo === 'true',
    etapas: normalizeSteps(body.etapasJson),
    criadoEm: existing?.criadoEm || now(),
    atualizadoEm: now()
  };
  const idx = data.blocos.findIndex(b => b.id === id);
  if(idx >= 0) data.blocos[idx] = bloco;
  else data.blocos.unshift(bloco);
  writeJson(req.app, 'blocos.json', data.blocos);
  flash(res, '/automacao-whatsapp?tab=blocos', '💬 Bloco salvo com sucesso.');
});

router.post('/blocos/excluir/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  writeJson(req.app, 'blocos.json', data.blocos.filter(b => b.id !== id));
  flash(res, '/automacao-whatsapp?tab=blocos', '🗑️ Bloco removido.');
});

router.post('/configuracoes/salvar', (req,res)=>{
  const data = loadAll(req.app);
  const body = req.body || {};
  const config = {
    ...data.config,
    horarioAniversario: safeText(body.horarioAniversario || '08:00', 20),
    limiteDiario: safeNumber(body.limiteDiario, 40, 1, 1000),
    delayHumanoMin: safeNumber(body.delayHumanoMin, 4, 0, 600),
    delayHumanoMax: safeNumber(body.delayHumanoMax, 12, 0, 600),
    digitandoPadrao: safeNumber(body.digitandoPadrao, 2, 0, 180),
    gravandoAudioPadrao: safeNumber(body.gravandoAudioPadrao, 2, 0, 180),
    envioRealAtivo: body.envioRealAtivo === 'on' || body.envioRealAtivo === 'true',
    atualizadoEm: now(),
    version: MODULE_VERSION
  };
  if(config.delayHumanoMax < config.delayHumanoMin) config.delayHumanoMax = config.delayHumanoMin;
  writeJson(req.app, 'config.json', config);
  flash(res, '/automacao-whatsapp?tab=configuracoes', '⚙️ Configurações salvas.');
});

export default router;
