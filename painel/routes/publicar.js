import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";

/**
 * Painel Quality Celulares — Publicação completa (ESM)
 * Fluxo: Backup -> Limpeza -> Sync -> (Prune) -> Git push
 * REPO_DIR = C:\Site (raiz do repo)
 * SITE_DIR = C:\Site\Site_with_content (fonte do site)
 */

const router = express.Router();

// ======= CONFIG =======
const REPO_DIR  = 'C:\\Site';
const SITE_DIR  = 'C:\\Site\\Site_with_content';
const BACKUP_DIR = path.join(REPO_DIR, 'Backup');
const BRANCH    = process.env.GIT_BRANCH || "main";
const TZ        = 'America/Sao_Paulo';
const KEEP_BACKUPS = 5;
const ENABLE_PRUNE = true;
const PROTECT = new Set([
  '.git', '.github', 'Backup', 'backups', 'node_modules',
  '.nojekyll', 'README_GHPAGES.txt'
]);

// ======= UTILS =======
function nowSP() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const pad = n => String(n).padStart(2, '0');
  return {
    date: d,
    tag: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  };
}

function syncDirContents(src, dst) {
  const IGNORE = new Set([".git", ".github", "node_modules", "Backup", "backups"]);
  function walk(curSrc, curDst) {
    if (!fs.existsSync(curDst)) fs.mkdirSync(curDst, { recursive: true });
    for (const ent of fs.readdirSync(curSrc, { withFileTypes: true })) {
      if (IGNORE.has(ent.name)) continue;
      const s = path.join(curSrc, ent.name);
      const d = path.join(curDst, ent.name);
      if (ent.isDirectory()) {
        walk(s, d);
      } else if (ent.isFile()) {
        fs.mkdirSync(path.dirname(d), { recursive: true });
        fs.copyFileSync(s, d);
      }
    }
  }
  walk(src, dst);
}

function pruneRepoFromSource(repoRoot, srcRoot) {
  function walk(dstPath, srcPath) {
    for (const ent of fs.readdirSync(dstPath, { withFileTypes: true })) {
      const dstItem = path.join(dstPath, ent.name);
      const srcItem = path.join(srcPath, ent.name);

      if (PROTECT.has(path.relative(repoRoot, dstItem))) continue;
      if (PROTECT.has(ent.name)) continue;

      const isProtectedRoot =
        ent.name === '.git' || ent.name === '.github' ||
        ent.name === 'Backup' || ent.name === 'backups' ||
        ent.name === 'node_modules';
      if (isProtectedRoot) continue;

      if (!fs.existsSync(srcItem)) {
        try {
          if (ent.isDirectory()) fs.rmSync(dstItem, { recursive: true, force: true });
          else fs.rmSync(dstItem, { force: true });
          console.log(`🧹 Removido órfão: ${path.relative(repoRoot, dstItem)}`);
        } catch (e) {
          console.warn(`⚠️ Falha ao remover: ${dstItem} -> ${e.message}`);
        }
      } else if (ent.isDirectory()) {
        walk(dstItem, srcItem);
      }
    }
  }
  walk(repoRoot, srcRoot);
}

async function criarBackupLocal() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
      const { tag } = nowSP();
      const nome = `backup_${tag}.zip`;
      const destino = path.join(BACKUP_DIR, nome);

      const out = fs.createWriteStream(destino);
      const archive = archiver("zip", { zlib: { level: 9 } });

      out.on("close", () => { console.log(`[backup] ✅ Backup criado: ${nome} (${archive.pointer()} bytes)`); resolve(destino); });
      archive.on("error", (err) => reject(err));

      archive.glob("**/*", { cwd: SITE_DIR, dot: false, ignore: ["node_modules/**", "Backup/**", "backups/**"] });
      archive.pipe(out);
      archive.finalize();
    } catch (err) { reject(err); }
  });
}

function limparBackupsAntigos() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const arqs = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith(".zip"))
      .map(f => ({ f, p: path.join(BACKUP_DIR, f), t: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.t - a.t);
    if (arqs.length > KEEP_BACKUPS) {
      for (const it of arqs.slice(KEEP_BACKUPS)) {
        try { fs.rmSync(it.p, { force: true }); console.log(`🧹 Backup antigo excluído: ${it.f}`); }
        catch (e) { console.warn(`⚠️ Falha ao excluir ${it.f}: ${e.message}`); }
      }
    }
  } catch (e) {
    console.warn(`[backup] Falha ao limpar backups antigos: ${e.message}`);
  }
}

function registrarPublishJSON() {
  try {
    const contentDir = path.join(REPO_DIR, "content");
    if (!fs.existsSync(contentDir)) return;
    const f = path.join(contentDir, "publish.json");
    const { date } = nowSP();
    fs.writeFileSync(f, JSON.stringify({ last_publish: date.toISOString() }, null, 2), "utf-8");
    console.log("📝 content/publish.json atualizado");
  } catch (e) {
    console.warn(`⚠️ Falha ao escrever publish.json: ${e.message}`);
  }
}

async function gitCommitPush() {
  const git = simpleGit({ baseDir: REPO_DIR });
  try { await git.raw(["config","--global","--add","safe.directory", REPO_DIR]); } catch {}
  await git.add(["."]);
  await git.commit(`chore: publish (${nowSP().date.toISOString()})`);
  await git.push("origin", BRANCH);
}

// ====== ROTA ======
router.post("/", async (req, res) => {
  try {
    console.log("🚀 Iniciando publicação (ESM)...");
    await criarBackupLocal();
    limparBackupsAntigos();
    registrarPublishJSON();

    syncDirContents(SITE_DIR, REPO_DIR);
    if (ENABLE_PRUNE) pruneRepoFromSource(REPO_DIR, SITE_DIR);

    await gitCommitPush();

    console.log("✅ Publicação concluída.");
    res.redirect(`/?flash=${encodeURIComponent("✅ Backup feito, conteúdo sincronizado na raiz do repositório e push realizado.")}`);
  } catch (err) {
    console.error("❌ Erro na publicação:", err);
    res.redirect(`/?flash=${encodeURIComponent("❌ Erro ao publicar site. Verifique o console.")}`);
  }
});

export default router;
