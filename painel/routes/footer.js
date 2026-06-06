import express from 'express';
import fs from 'fs';
import path from 'path';
const router = express.Router();
function P(app){ return app.locals.paths; }
function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf-8')); } catch(e){ return {}; } }
function writeJson(p, data){ fs.writeFileSync(p, JSON.stringify(data,null,2), 'utf-8'); }
function stamp(){ return new Date().toISOString().replace(/[:.]/g,'-'); }

router.get('/', (req,res)=>{
  const file = path.join(P(req.app).CONTENT_DIR, 'footer.json');
  const footer = readJson(file); footer.social = footer.social || [];
  res.render('editar_footer', { footer, flash: null, sucessoRodape: null });
});

router.post('/save', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'footer.json');
  const prev = readJson(file);
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'footer-'+stamp()+'.json'), JSON.stringify(prev,null,2),'utf-8'); } catch(e){}
  const footer = { text: req.body.text || '', cnpj: req.body.cnpj || '', social: prev.social || [] };
  writeJson(file, footer);
  
  console.log('💾 Dados do rodapé (Texto/CNPJ) salvos com sucesso no footer.json!');
  res.render('editar_footer', { footer, flash: null, Admin: null, sucessoRodape: 'Rodapé salvo com sucesso!' });
});

router.post('/add-social', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'footer.json');
  const data = readJson(file); data.social = data.social || [];
  data.social.push({ label:req.body.label||'link', icon:req.body.label||'link', url:req.body.url||'#', order:Number(req.body.order||data.social.length+1) });
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'footer-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data); 
  
  console.log(`✨ Nova rede social "${req.body.label}" adicionada com sucesso!`);
  res.render('editar_footer', { footer: data, flash: null, sucessoRodape: 'Ícone social adicionado com sucesso!' });
});

router.post('/update-social', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'footer.json');
  const data = readJson(file); data.social = data.social || [];
  const i = Number(req.body.index);
  if (data.social[i]){
    data.social[i].label = req.body.label || data.social[i].label;
    data.social[i].icon  = req.body.label || data.social[i].icon;
    data.social[i].url   = req.body.url || data.social[i].url;
    data.social[i].order = Number(req.body.order || data.social[i].order || (i+1));
  }
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'footer-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data); 
  
  console.log('🔄 Lista de ícones sociais atualizada na tabela.');
  res.render('editar_footer', { footer: data, flash: null, sucessoRodape: 'Alteração salva com sucesso!' });
});

router.post('/del-social', (req,res)=>{
  const { CONTENT_DIR, BACKUPS_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'footer.json');
  const data = readJson(file); data.social = data.social || [];
  const i = Number(req.body.index); if (data.social[i]) data.social.splice(i,1);
  try { fs.writeFileSync(path.join(BACKUPS_DIR, 'footer-'+stamp()+'.json'), JSON.stringify(data,null,2),'utf-8'); } catch(e){}
  writeJson(file, data); 
  
  console.log('❌ Um ícone social foi removido do rodapé.');
  res.render('editar_footer', { footer: data, flash: null, sucessoRodape: 'Ícone removido com sucesso!' });
});

router.post('/import',(req,res)=>{
  const { SITE_DIR, CONTENT_DIR } = P(req.app);
  const file = path.join(CONTENT_DIR, 'footer.json');
  const data = readJson(file); data.social = data.social || [];
  let msg = 'Links importados do footer.html com sucesso!';
  try {
    const html = fs.readFileSync(path.join(SITE_DIR,'footer.html'),'utf-8');
    const footerNav = html;
    const re = /<a[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m, order = (data.social.length||0)+1;
    while ((m = re.exec(footerNav)) !== null) {
      const url = m[1];
      const label = (m[2]||'').replace(/<[^>]+>/g,'').trim();
      if (url && label) {
        data.social.push({ label, icon:label, url, order: order++ });
      }
    }
    writeJson(file, data);
    console.log('📥 Links importados do footer.html com sucesso.');
  } catch(e){
    msg = 'Erro ao tentar importar do arquivo.';
    console.log('⚠️ Falha ao tentar importar links do footer.html.');
  }
  res.render('editar_footer', { footer: data, flash: null, sucessoRodape: msg });
});

export default router;