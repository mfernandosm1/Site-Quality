import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = express.Router();
const MODULE_VERSION = '0.2.0';

function P(app){ return app.locals.paths; }
function moduleDir(app){ return path.join(P(app).CONTENT_DIR, 'automacao_whatsapp'); }
function uploadsDir(app){ return path.join(P(app).PUBLIC_DIR, 'uploads', 'automacao_whatsapp'); }
function uploadUrl(filename){ return '/public/uploads/automacao_whatsapp/' + filename; }
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
function addLog(app, type, message, details={}){
  const logs = readJson(app, 'logs.json', []);
  logs.unshift({ id: makeId('log'), type: safeText(type, 50), message: safeText(message, 500), details, at: now() });
  writeJson(app, 'logs.json', logs.slice(0, 500));
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

const storage = multer.diskStorage({
  destination(req,file,cb){ try{ const dir=uploadsDir(req.app); ensureDir(dir); cb(null,dir); }catch(e){ cb(e); } },
  filename(req,file,cb){
    const ext=path.extname(file.originalname||'').toLowerCase().slice(0,12);
    const base=path.basename(file.originalname||'arquivo',ext).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60)||'arquivo';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${base}${ext}`);
  }
});
const upload = multer({ storage, limits:{fileSize:25*1024*1024}, fileFilter(req,file,cb){
  const ok=['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/ogg','audio/wav','audio/mp4','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  ok.includes(file.mimetype)?cb(null,true):cb(new Error('Tipo de arquivo não permitido.'));
}});

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
  addLog(req.app, existing ? 'bloco_editado' : 'bloco_criado', `${existing ? 'Bloco editado' : 'Bloco criado'}: ${bloco.nome}`, { blocoId:id });
  flash(res, '/automacao-whatsapp?tab=blocos&edit=' + encodeURIComponent(id), '💬 Bloco salvo com sucesso.');
});

router.post('/blocos/excluir/:id', (req,res)=>{
  const data = loadAll(req.app);
  const id = safeText(req.params.id, 120);
  const removido = data.blocos.find(b => b.id === id);
  writeJson(req.app, 'blocos.json', data.blocos.filter(b => b.id !== id));
  if(removido) addLog(req.app, 'bloco_excluido', `Bloco excluído: ${removido.nome}`, { blocoId:id });
  flash(res, '/automacao-whatsapp?tab=blocos', '🗑️ Bloco removido.');
});


router.post('/blocos/duplicar/:id', (req,res)=>{
  const data=loadAll(req.app); const original=data.blocos.find(b=>b.id===safeText(req.params.id,120));
  if(!original) return flash(res,'/automacao-whatsapp?tab=blocos','⚠️ Bloco não encontrado.');
  const copia={...original,id:makeId('bloco'),nome:safeText(original.nome+' (cópia)',160),gatilho:'',etapas:(original.etapas||[]).map(e=>({...e,id:makeId('etapa')})),criadoEm:now(),atualizadoEm:now()};
  data.blocos.unshift(copia); writeJson(req.app,'blocos.json',data.blocos); addLog(req.app,'bloco_duplicado',`Bloco duplicado: ${original.nome}`,{blocoId:copia.id,origemId:original.id});
  flash(res,'/automacao-whatsapp?tab=blocos&edit='+encodeURIComponent(copia.id),'📄 Bloco duplicado com sucesso.');
});

router.post('/midias/upload', (req,res)=>{
  upload.single('arquivo')(req,res,(error)=>{
    if(error) return res.status(400).json({success:false,message:error.message||'Falha no upload.'});
    if(!req.file) return res.status(400).json({success:false,message:'Nenhum arquivo recebido.'});
    const tipo=req.file.mimetype.startsWith('image/')?'imagem':req.file.mimetype.startsWith('audio/')?'audio':'arquivo';
    const payload={success:true,tipo,caminho:uploadUrl(req.file.filename),nomeOriginal:req.file.originalname,tamanho:req.file.size,mime:req.file.mimetype};
    addLog(req.app,'midia_upload',`Mídia adicionada: ${req.file.originalname}`,{caminho:payload.caminho,mime:payload.mime}); res.json(payload);
  });
});

router.post('/simulador/log',(req,res)=>{ addLog(req.app,'simulacao',`Fluxo simulado: ${safeText(req.body?.nome||'Bloco em edição',160)}`,{blocoId:safeText(req.body?.blocoId||'',120)}); res.json({success:true}); });

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
  addLog(req.app, 'config_atualizada', 'Configurações da Automação WhatsApp atualizadas.');
  flash(res, '/automacao-whatsapp?tab=configuracoes', '⚙️ Configurações salvas.');
});

export default router;
