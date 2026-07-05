import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const router = express.Router();

function dataDir(req){
  const dir = path.join(req.app.locals.paths.ROOT, 'painel', 'data', 'sorteios');
  fs.mkdirSync(dir, { recursive:true });
  return dir;
}

function getLocalIp(){
  const nets = os.networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const net of nets[name] || []){
      if(net.family === 'IPv4' && !net.internal){
        if(net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.')) return net.address;
      }
    }
  }
  for(const name of Object.keys(nets)){
    for(const net of nets[name] || []){
      if(net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

router.get('/', (req, res) => {
  res.render('sorteios', { flash: null });
});

router.post('/sessao', (req, res) => {
  try{
    const id = crypto.randomBytes(4).toString('hex').toUpperCase();
    const payload = {
      id,
      createdAt: new Date().toISOString(),
      campanha: String(req.body.campanha || 'Palpite Premiado'),
      premio: String(req.body.premio || ''),
      jogo: String(req.body.jogo || 'Brasil x Noruega'),
      placarCorreto: String(req.body.placarCorreto || ''),
      timeA: String(req.body.timeA || 'Brasil'),
      timeB: String(req.body.timeB || 'Noruega'),
      flagA: String(req.body.flagA || '🇧🇷'),
      flagB: String(req.body.flagB || '🇳🇴'),
      participantes: Array.isArray(req.body.participantes) ? req.body.participantes : [],
      vencedor: req.body.vencedor || null
    };
    fs.writeFileSync(path.join(dataDir(req), `${id}.json`), JSON.stringify(payload, null, 2));
    const localIp = getLocalIp();
    const port = req.socket.localPort || 3000;
    const pathUrl = `/sorteios/apresentacao/${id}`;
    const originUrl = `${req.protocol}://${req.get('host')}${pathUrl}`;
    const lanUrl = localIp ? `http://${localIp}:${port}${pathUrl}` : originUrl;
    res.json({ ok:true, id, url:pathUrl, originUrl, lanUrl, localIp });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
});

router.post('/registro', (req, res) => {
  try{
    const id = crypto.randomBytes(4).toString('hex').toUpperCase();
    const payload = { id, savedAt: new Date().toISOString(), ...req.body };
    fs.writeFileSync(path.join(dataDir(req), `registro_${id}.json`), JSON.stringify(payload, null, 2));
    res.json({ ok:true, id });
  }catch(err){
    res.status(500).json({ ok:false, error: err.message });
  }
});

router.get('/apresentacao/:id', (req, res) => {
  const file = path.join(dataDir(req), `${req.params.id}.json`);
  if(!fs.existsSync(file)) return res.status(404).send('Sorteio não encontrado. Gere o link novamente pelo painel.');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  res.render('sorteios_apresentacao', { layout: false, data });
});

export default router;
