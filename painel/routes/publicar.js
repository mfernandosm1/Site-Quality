import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";
import { fileURLToPath } from "url";

const router = express.Router();

// Helpers
function tsNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch(e){} }
function copyFileSync(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}
function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    const ents = fs.readdirSync(cur, { withFileTypes: true });
    for (const ent of ents) {
      const full = path.join(cur, ent.name);
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      if (ent.isDirectory()) {
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
}
function syncDirContents(src, dst) {
  const files = walk(src);
  for (const f of files) {
    const rel = path.relative(src, f);
    const to = path.join(dst, rel);
    const fromStat = fs.statSync(f);
    let shouldCopy = false;
    if (!fs.existsSync(to)) {
      shouldCopy = true;
    } else {
      const toStat = fs.statSync(to);
      shouldCopy = (fromStat.mtimeMs > toStat.mtimeMs) || (fromStat.size != toStat.size);
    }
    if (shouldCopy) {
      ensureDir(path.dirname(to));
      fs.copyFileSync(f, to);
    }
  }
}

router.get("/", (req, res) => {
  res.render("publicar", { flash: null });
});

router.post("/", async (req, res) => {
  try {
    const P = req.app.locals.paths; // {ROOT, SITE_DIR, CONTENT_DIR, BACKUPS_DIR}
    const REPO_DIR   = P.ROOT;                          // raiz do repo (tem .git)
    const SITE_DIR   = P.SITE_DIR;                      // fonte do site (Site_with_content)
    const BACKUP_DIR = path.join(REPO_DIR, "Backup");   // pasta de backups ao lado do painel

    ensureDir(BACKUP_DIR);

    // 1) Criar backup .zip da pasta Site_with_content
    const zipName = `backup_${tsNow()}.zip`;
    const zipPath = path.join(BACKUP_DIR, zipName);
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      archive.directory(SITE_DIR, "Site_with_content");
      archive.finalize();
    });

    // 2) Sincronizar (ADD/UPDATE) Site_with_content => raiz do repo
    syncDirContents(SITE_DIR, REPO_DIR);

    // 3) Git add/commit/push
    const git = simpleGit(REPO_DIR);
    await git.add("./*");
    const msg = `publicar: backup ${zipName} & sync add/update`;
    await git.commit(msg);
    try {
      await git.pull(["--rebase"]);
    } catch(e) {
      // Continua mesmo se não tiver remoto configurado
    }
    try {
      await git.push("origin", process.env.GIT_BRANCH || "main");
    } catch(e) {
      // Se não houver remoto, apenas registra
      console.log("⚠️  Aviso: git push falhou (sem 'origin' configurado?)", e.message);
    }

    console.log("✅ Publicação concluída (sem exclusões).");
    res.json({ success: true, message: "Backup criado, conteúdo adicionado/atualizado e git commit/push executado (sem remover arquivos).", backup: zipName });
  } catch (err) {
    console.error("❌ Erro na publicação:", err);
    res.status(500).json({ success: false, message: "Erro ao publicar site.", error: err.message });
  }
});

export default router;
