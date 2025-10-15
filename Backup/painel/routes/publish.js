/**
 * Publicação: Backup -> Sync (ADD/UPDATE) -> Git add/commit/push
 * REPO_DIR = C:\Site (raiz do repo, .git)
 * SITE_DIR = C:\Site\Site_with_content (fonte do site)
 */
const express  = require('express');
const router   = express.Router();
const fs       = require('fs');
const path     = require('path');
const archiver = require('archiver');
const simpleGit= require('simple-git');

const REPO_DIR  = 'C:\\Site';
const SITE_DIR  = 'C:\\Site\\Site_with_content';
const BACKUP_DIR= path.join(REPO_DIR, 'Backup');
const BRANCH    = process.env.GIT_BRANCH || 'main';
const TZ        = 'America/Sao_Paulo';
const KEEP_BACKUPS = 5;

// --- util: data SP
function nowSP() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const pad = n => String(n).padStart(2,'0');
  return {
    date: d,
    tag: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  };
}

// --- copia CONTEÚDO src -> dst (NÃO remove nada do dst)
function syncDirContents(src, dst){
  const IGNORE = new Set(['.git', '.github', 'node_modules', 'Backup', 'backups']);
  function walk(curSrc, curDst){
    if (!fs.existsSync(curDst)) fs.mkdirSync(curDst, { recursive:true });
    for (const ent of fs.readdirSync(curSrc, { withFileTypes:true })) {
      if (IGNORE.has(ent.name)) continue;
      const s = path.join(curSrc, ent.name);
      const d = path.join(curDst, ent.name);
      if (ent.isDirectory()){
        walk(s, d);
      } else if (ent.isFile()){
        fs.mkdirSync(path.dirname(d), { recursive:true });
        fs.copyFileSync(s, d);
      }
    }
  }
  walk(src, dst);
}

// --- backup do SITE_DIR
async function criarBackupLocal() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive:true });
      const nome = `backup_${nowSP().tag}.zip`;
      const destino = path.join(BACKUP_DIR, nome);
      const out = fs.createWriteStream(destino);
      const archive = archiver('zip', { zlib: { level: 9 } });
      out.on('close', () => { console.log(`✅ Backup criado: ${nome} (${archive.pointer()} bytes)`); resolve(destino); });
      archive.on('error', reject);
      archive.glob('**/*', { cwd: SITE_DIR, dot: false, ignore: ['node_modules/**','Backup/**','backups/**'] });
      archive.pipe(out); archive.finalize();
    } catch (e) { reject(e); }
  });
}

// --- limpa backups antigos
function limparBackupsAntigos(){
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const items = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.zip'))
      .map(f => ({ f, p: path.join(BACKUP_DIR, f), t: fs.statSync(path.join(BACKUP_DIR,f)).mtime.getTime() }))
      .sort((a,b) => b.t - a.t);
    for (const it of items.slice(KEEP_BACKUPS)) {
      try { fs.rmSync(it.p, { force:true }); console.log(`🧹 Backup antigo excluído: ${it.f}`); }
      catch(e){ console.warn(`⚠️ Falha ao excluir ${it.f}: ${e.message}`); }
    }
  } catch (e) { console.warn(`[backup] limpeza falhou: ${e.message}`); }
}

// --- registra publish.json (se houver /content)
function registrarPublishJSON(){
  try {
    const contentDir = path.join(REPO_DIR, 'content');
    if (!fs.existsSync(contentDir)) return;
    const f = path.join(contentDir, 'publish.json');
    fs.writeFileSync(f, JSON.stringify({ last_publish: nowSP().date.toISOString() }, null, 2), 'utf-8');
    console.log('📝 content/publish.json atualizado');
  } catch (e) { console.warn(`⚠️ publish.json: ${e.message}`); }
}

// --- git push
async function gitCommitPush(){
  const git = simpleGit({ baseDir: REPO_DIR });
  try { await git.raw(['config','--global','--add','safe.directory', REPO_DIR]); } catch {}
  await git.add(['.']); // apenas mudanças/novos
  await git.commit(`chore: publish (${nowSP().date.toISOString()})`);
  await git.push('origin', BRANCH);
}

router.post('/', async (req, res) => {
  try {
    console.log('🚀 Publicação (ADD/UPDATE somente)…');
    await criarBackupLocal();
    limparBackupsAntigos();
    registrarPublishJSON();

    // copia o conteúdo (sem apagar nada do repo)
    syncDirContents(SITE_DIR, REPO_DIR);

    // commit & push
    await gitCommitPush();

    console.log('✅ Publicação concluída (sem exclusões).');
    res.json({ success: true, message: 'Backup feito, conteúdo adicionado/atualizado e push realizado (sem remover arquivos).' });
  } catch (err) {
    console.error('❌ Erro na publicação:', err);
    res.status(500).json({ success:false, message:'Erro ao publicar site.', error: err.message });
  }
});

module.exports = router;
