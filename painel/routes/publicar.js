import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";

const router = express.Router();

const REPO_DIR  = 'C:\\Site';                    // raiz do repo
const SITE_DIR  = 'C:\\Site\\Site_with_content'; // fonte do site
const BACKUP_DIR= path.join(REPO_DIR, 'Backup');
const BRANCH    = process.env.GIT_BRANCH || "main";
const TZ        = 'America/Sao_Paulo';
const KEEP_BACKUPS = 5;

// utils
function nowSP(){
  const d = new Date(new Date().toLocaleString('en-US',{ timeZone: TZ }));
  const pad = n => String(n).padStart(2,'0');
  return {
    date: d,
    tag: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  };
}

function syncDirContents(src, dst){
  const IGNORE = new Set([".git",".github","node_modules","Backup","backups"]);
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

async function criarBackupLocal(){
  return new Promise((resolve,reject)=>{
    try{
      if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR,{recursive:true});
      const nome = `backup_${nowSP().tag}.zip`;
      const destino = path.join(BACKUP_DIR,nome);
      const out = fs.createWriteStream(destino);
      const archive = archiver("zip",{ zlib:{ level:9 }});
      out.on("close",()=>{ console.log(`[backup] ✅ ${nome} (${archive.pointer()} bytes)`); resolve(destino); });
      archive.on("error",reject);
      archive.glob("**/*",{ cwd:SITE_DIR, dot:false, ignore:["node_modules/**","Backup/**","backups/**"]});
      archive.pipe(out); archive.finalize();
    }catch(e){ reject(e); }
  });
}

function limparBackupsAntigos(){
  try{
    if(!fs.existsSync(BACKUP_DIR)) return;
    const items = fs.readdirSync(BACKUP_DIR)
      .filter(f=>f.endsWith(".zip"))
      .map(f=>({ f, p:path.join(BACKUP_DIR,f), t:fs.statSync(path.join(BACKUP_DIR,f)).mtime.getTime() }))
      .sort((a,b)=>b.t-a.t);
    for(const it of items.slice(KEEP_BACKUPS)){
      try{ fs.rmSync(it.p,{force:true}); console.log(`🧹 Backup antigo excluído: ${it.f}`); }
      catch(e){ console.warn(`⚠️ Falha ao excluir ${it.f}: ${e.message}`); }
    }
  }catch(e){ console.warn(`[backup] limpeza falhou: ${e.message}`); }
}

function registrarPublishJSON(){
  try{
    const contentDir = path.join(REPO_DIR,"content");
    if(!fs.existsSync(contentDir)) return;
    fs.writeFileSync(path.join(contentDir,"publish.json"),
      JSON.stringify({ last_publish: nowSP().date.toISOString() }, null, 2),
      "utf-8");
    console.log("📝 content/publish.json atualizado");
  }catch(e){ console.warn(`⚠️ publish.json: ${e.message}`); }
}

async function gitCommitPush(){
  const git = simpleGit({ baseDir: REPO_DIR });
  try{ await git.raw(["config","--global","--add","safe.directory", REPO_DIR]); }catch{}
  await git.add(["."]);
  await git.commit(`chore: publish (${nowSP().date.toISOString()})`);
  await git.push("origin", BRANCH);
}

router.post("/", async (req,res)=>{
  try{
    console.log("🚀 Publicação (ADD/UPDATE somente)…");
    await criarBackupLocal();
    limparBackupsAntigos();
    registrarPublishJSON();

    syncDirContents(SITE_DIR, REPO_DIR); // sem deletar nada

    await gitCommitPush();

    console.log("✅ Publicação concluída (sem exclusões).");
    res.redirect(`/?flash=${encodeURIComponent("✅ Conteúdo adicionado/atualizado e push realizado.")}`);
  }catch(err){
    console.error("❌ Erro na publicação:", err);
    res.redirect(`/?flash=${encodeURIComponent("❌ Erro ao publicar site. Verifique o console.")}`);
  }
});

export default router;
