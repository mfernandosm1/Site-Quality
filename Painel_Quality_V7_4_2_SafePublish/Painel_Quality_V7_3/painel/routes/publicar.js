import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git"; // <-- NOVO

const router = express.Router();
function P(app) {
  return app.locals.paths; // deve retornar { SITE_DIR, CONTENT_DIR, ... }
}

// ----------------------------
// Criação de backup completo do site (seu original)
// ----------------------------
async function criarBackupLocal(SITE_DIR) {
  return new Promise((resolve, reject) => {
    try {
      const BACKUPS_DIR = "C:\\Site\\Backup";

      // Cria pasta se não existir
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }

      // Nome do arquivo de backup
      const data = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      );
      const nomeArquivo = `backup_${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}_${String(
        data.getHours()
      ).padStart(2, "0")}${String(data.getMinutes()).padStart(2, "0")}.zip`;

      const destino = path.join(BACKUPS_DIR, nomeArquivo);
      const output = fs.createWriteStream(destino);
      const archive = archiver("zip", { zlib: { level: 9 } });

      console.log(`🗜️ Criando backup em: ${destino}`);

      output.on("close", () => {
        console.log(
          `[backup] ✅ Backup criado: ${nomeArquivo} (${archive.pointer()} bytes)`
        );
        limparBackupsAntigos(BACKUPS_DIR); // 🔥 executa limpeza após sucesso
        resolve(nomeArquivo);
      });

      output.on("end", () => console.log("[backup] Stream finalizada."));

      archive.on("warning", (err) => {
        if (err.code === "ENOENT") console.warn("[backup] Aviso:", err);
        else reject(err);
      });

      archive.on("error", (err) => {
        console.error("[backup] ❌ Erro:", err);
        reject(err);
      });

      // Inclui todos os arquivos do site (menos backups/node_modules)
      archive.glob("**/*", {
        cwd: SITE_DIR,
        ignore: ["backups/**", "node_modules/**"],
      });

      archive.pipe(output);
      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

// ----------------------------
// Exclusão de backups antigos (seu original)
// ----------------------------
function limparBackupsAntigos(BACKUPS_DIR) {
  try {
    const arquivos = fs
      .readdirSync(BACKUPS_DIR)
      .filter((f) => f.endsWith(".zip"))
      .map((f) => ({
        nome: f,
        caminho: path.join(BACKUPS_DIR, f),
        mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (arquivos.length > 5) {
      const antigos = arquivos.slice(5);
      antigos.forEach((arq) => {
        try {
          fs.rmSync(arq.caminho, { force: true }); // 🧨 exclusão direta (Shift+Delete)
          console.log(`🧹 Backup antigo excluído: ${arq.nome}`);
        } catch (err) {
          console.warn(`⚠️ Falha ao excluir ${arq.nome}:`, err.message);
        }
      });
    }
  } catch (err) {
    console.warn("[backup] Falha ao limpar backups antigos:", err);
  }
}

/* ===========================
   NOVO: Git sync (conteúdo de Site_with_content -> raiz do repo) + push
   =========================== */

// Encontra a raiz do repositório (.git) subindo a partir do SITE_DIR
function findRepoRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

// Copia TODOS os arquivos/pastas de src -> dst, preservando estrutura relativa
function syncDirContents(src, dst) {
  const IGNORE = new Set([".git", "backups", "node_modules"]);
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

async function syncCommitPushAll(app) {
  const { SITE_DIR } = P(app);
  const REPO_DIR = findRepoRoot(SITE_DIR);
  if (!REPO_DIR) throw new Error("Não foi possível localizar a raiz do repositório (.git).");

  // 1) Sincroniza conteúdo de Site_with_content -> raiz do repo (sem a pasta)
  syncDirContents(SITE_DIR, REPO_DIR);

  // 2) Git add/commit/push
  const BRANCH = process.env.GIT_BRANCH || "main";
  const git = simpleGit({ baseDir: REPO_DIR });

  try {
    await git.raw(["config", "--global", "--add", "safe.directory", REPO_DIR]);
  } catch {}

  await git.add(["."]); // tudo que mudou
  await git.commit(`chore: publish Site_with_content -> repo root (${new Date().toISOString()})`);
  await git.push("origin", BRANCH);

  return { REPO_DIR, BRANCH };
}

/* ============ Fim Git sync ============ */

// ----------------------------
// Rota principal de publicação (mantida)
// ----------------------------
router.post("/", async (req, res) => {
  const { SITE_DIR, CONTENT_DIR } = P(req.app);

  try {
    console.log("🚀 Iniciando publicação...");
    const nomeBackup = await criarBackupLocal(SITE_DIR);

    const agora = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );

    const f = path.join(CONTENT_DIR, "publish.json");
    fs.writeFileSync(
      f,
      JSON.stringify({ last_publish: agora.toISOString() }, null, 2),
      "utf-8"
    );

    // 🔥 NOVO: sincroniza conteúdo e faz push
    const info = await syncCommitPushAll(req.app);

    console.log(`✅ Publicação concluída (${nomeBackup}). RepoRoot=${info.REPO_DIR}`);
    const msg = [
      `✅ Backup criado com sucesso em C:\\Site\\Backup às ${agora.toLocaleTimeString(
        "pt-BR",
        { timeZone: "America/Sao_Paulo" }
      )}`,
      "✅ Publicação concluída",
      `✅ Enviado ao GitHub (branch: ${info.BRANCH})`,
    ].join("<br>");

    res.redirect(`/?flash=${encodeURIComponent(msg)}`);
  } catch (err) {
    console.error("❌ Erro na publicação:", err);
    res.redirect(
      `/?flash=${encodeURIComponent(
        "❌ Erro ao publicar site. Verifique o console."
      )}`
    );
  }
});

export default router;
