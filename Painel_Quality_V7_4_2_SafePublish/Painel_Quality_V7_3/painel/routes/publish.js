/**
 * Painel Quality Celulares - Publicação com Backup Local Automático
 * Compatível com V7_4_2_SafePublish
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const simpleGit = require('simple-git'); // <-- NOVO

// Caminhos base (iguais aos seus)
const SITE_DIR = path.join(__dirname, '../../Site_with_content'); // <- pasta-fonte
const BACKUP_DIR = path.join(__dirname, '../backup');

// =============== NOVO: helpers git/sync =================

// Encontra a raiz do repositório (onde existe .git) subindo a partir do SITE_DIR
function findRepoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

// Copia TODOS os arquivos/pastas de src -> dst, preservando estrutura relativa
// Sem copiar .git, backups, node_modules do site.
function syncDirContents(src, dst) {
  const IGNORE = new Set(['.git', 'backups', 'node_modules']);
  function copyRecursive(curSrc, curDst) {
    if (!fs.existsSync(curDst)) fs.mkdirSync(curDst, { recursive: true });
    const entries = fs.readdirSync(curSrc, { withFileTypes: true });
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue;
      const s = path.join(curSrc, e.name);
      const d = path.join(curDst, e.name);
      if (e.isDirectory()) {
        copyRecursive(s, d);
      } else if (e.isFile()) {
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(s, d);
      }
    }
  }
  copyRecursive(src, dst);
}

// Faz push do que está na raiz do repositório após sincronizar o conteúdo do site
async function syncCommitPushAll() {
  const REPO_DIR = findRepoRoot(SITE_DIR);
  if (!REPO_DIR) throw new Error('Não foi possível localizar a raiz do repositório (.git).');

  // 1) Sincroniza: copia conteúdo de Site_with_content -> raiz do repo (SEM a pasta)
  //    Isso garante que no GitHub os arquivos fiquem na raiz (css/, js/, index.html, etc.)
  syncDirContents(SITE_DIR, REPO_DIR);

  // 2) Git add/commit/push na raiz
  const BRANCH = process.env.GIT_BRANCH || 'main';
  const git = simpleGit({ baseDir: REPO_DIR });

  try { await git.raw(['config', '--global', '--add', 'safe.directory', REPO_DIR]); } catch {}
  await git.add(['.']); // tudo que mudou
  await git.commit(`chore: publish Site_with_content -> repo root (${new Date().toISOString()})`);
  await git.push('origin', BRANCH);
}

// =============== Fim helpers git/sync ====================

async function criarBackupLocal() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

      const data = new Date();
      const nomeArquivo = `site_${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}_${String(
        data.getHours()
      ).padStart(2, '0')}${String(data.getMinutes()).padStart(2, '0')}.zip`;
      const destino = path.join(BACKUP_DIR, nomeArquivo);

      const saida = fs.createWriteStream(destino);
      const archive = archiver('zip', { zlib: { level: 9 } });

      saida.on('close', () => {
        console.log(`✅ Backup criado: ${nomeArquivo} (${archive.pointer()} bytes)`);
        resolve(destino);
      });

      archive.on('error', (err) => reject(err));
      archive.pipe(saida);
      archive.directory(SITE_DIR, false);
      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

router.post('/', async (req, res) => {
  try {
    console.log('🚀 Iniciando publicação do site...');
    await criarBackupLocal();

    // 🔥 NOVO: sincroniza conteúdo na raiz do repo + git add/commit/push
    await syncCommitPushAll();

    // Fluxo visual (mantido)
    console.log('📦 Publicando site...');
    setTimeout(() => {
      console.log('✅ Publicação concluída com sucesso.');
      res.json({ success: true, message: 'Publicação concluída com backup e push no GitHub (conteúdo da pasta Site_with_content enviado para a raiz do repositório).' });
    }, 1500);
  } catch (err) {
    console.error('❌ Erro na publicação:', err);
    res.status(500).json({ success: false, message: 'Erro ao publicar site.', error: err.message });
  }
});

module.exports = router;
