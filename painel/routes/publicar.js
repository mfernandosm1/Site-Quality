import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";

const router = express.Router();

const REPO_DIR  = 'C:\\Site';                    // raiz do repo (onde você dá o push)
const SITE_DIR  = 'C:\\Site\\Site_with_content'; // fonte do site
const BACKUP_DIR= path.join(REPO_DIR, 'Backup');
const BRANCH    = process.env.GIT_BRANCH || "main";
const TZ        = 'America/Sao_Paulo';
const KEEP_BACKUPS = 5;

// Caminhos de manutenção
const MAINT_FLAG = path.join(SITE_DIR, 'maintenance.flag');
const MAINT_HTML = path.join(SITE_DIR, 'maintenance.html');

// utils
function nowSP(){
  const d = new Date(new Date().toLocaleString('en-US',{ timeZone: TZ }));
  const pad = n => String(n).padStart(2,'0');
  return {
    date: d,
    tag: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
  };
}

// ============== [ COMPILADOR DO RODAPÉ DINÂMICO ] ==============
function aplicarDadosNoFooterHTML() {
  try {
    const footerJsonPath = path.join(REPO_DIR, 'content', 'footer.json');
    const footerHtmlPath = path.join(SITE_DIR, 'footer.html');

    if (!fs.existsSync(footerJsonPath) || !fs.existsSync(footerHtmlPath)) {
      console.log("⚠️ Arquivo footer.json ou footer.html não localizado para compilação.");
      return;
    }

    // 1. Lê os dados atuais salvos pelo painel
    const footerData = JSON.parse(fs.readFileSync(footerJsonPath, 'utf-8'));
    const textoRodape = footerData.text || "© 2026 Quality Celulares. Todos os direitos reservados.";
    
    // Evita duplicar a palavra CNPJ caso o usuário já tenha digitado no painel
    let cnpjRodape = footerData.cnpj || "";
    if (cnpjRodape && !cnpjRodape.toUpperCase().startsWith("CNPJ:")) {
      cnpjRodape = `CNPJ: ${cnpjRodape}`;
    }

    const redesSociais = footerData.social || [];

    // 2. Ordena as redes sociais conforme a ordem do painel
    redesSociais.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    // 3. Monta o bloco de ícones sociais dinamicamente
    let htmlRedes = '\n    <div class="footer-socials">';
    redesSociais.forEach(rede => {
      let classeIcone = "fa-brands fa-instagram"; // Ícone padrão
      let classeLink = "instagram";

      // Limpa acentos e coloca em minúsculo para comparar sem erros de digitação
      const nomeLimpo = (rede.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (nomeLimpo.includes("facebook")) {
        classeIcone = "fa-brands fa-facebook-f";
        classeLink = "facebook";
      } else if (nomeLimpo.includes("tiktok")) {
        classeIcone = "fa-brands fa-tiktok";
        classeLink = "tiktok";
      } else if (nomeLimpo.includes("localiza") || nomeLimpo.includes("mapa") || nomeLimpo.includes("onde") || nomeLimpo.includes("endereco")) {
        classeIcone = "fa-solid fa-location-dot";
        classeLink = "location";
      }

      htmlRedes += `\n      <a href="${rede.url}" class="${classeLink}" aria-label="${rede.label}" target="_blank" title="${rede.label}"><i class="${classeIcone}"></i></a>`;
    });
    htmlRedes += '\n    </div>';

    // 4. Estrutura original do teu footer.html (com links de texto fixos e ícones dinâmicos)
    const novoConteudoHTML = `<footer class="footer bg-gray-900 text-gray-300 py-8 mt-12">
  <div class="footer-container max-w-6xl mx-auto px-4">
    <div class="footer-links">
      <a href="sobre.html">Sobre nós</a>
      <a href="formas-de-pagamento.html">Formas de pagamento e envio</a>
    </div>

    <div class="footer-copy">
      <span class="nobreak">${textoRodape}</span><br />
      ${cnpjRodape}
    </div>

    ${htmlRedes}
  </div>
</footer>`;

    // 5. Grava o resultado atualizado diretamente na fonte do site antes de enviar
    fs.writeFileSync(footerHtmlPath, novoConteudoHTML, 'utf-8');
    console.log("🛠️ [Footer Dinâmico] footer.html atualizado e recalibrado com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao processar footer dinâmico:", error.message);
  }
}
// ===========================================================

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
    console.log("📝 content/publish.json updated");
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
    console.log("🚀 Publicação iniciada…");
    
    // Executa a montagem do rodapé dinâmico antes de sincronizar as pastas
    aplicarDadosNoFooterHTML();

    await criarBackupLocal();
    limparBackupsAntigos();
    registrarPublishJSON();

    // =================== MODO MANUTENÇÃO ===================
    if (fs.existsSync(MAINT_FLAG) && fs.existsSync(MAINT_HTML)) {
      console.log("🛠️ Modo manutenção DETECTADO: publicando site mínimo…");
      const html = fs.readFileSync(MAINT_HTML, "utf-8");
      fs.writeFileSync(path.join(REPO_DIR, "index.html"), html, "utf-8");
      fs.writeFileSync(path.join(REPO_DIR, "404.html"),  html, "utf-8");
      fs.writeFileSync(path.join(REPO_DIR, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf-8");
      const cnameSite = path.join(SITE_DIR, "CNAME");
      const cnameRepo = path.join(REPO_DIR, "CNAME");
      try { if (fs.existsSync(cnameSite)) fs.copyFileSync(cnameSite, cnameRepo); } catch (e) { console.warn("⚠️ CNAME: ", e.message); }
      await gitCommitPush();
      console.log("✅ Publicação (modo manutenção) concluída.");
      return res.redirect(`/?flash=${encodeURIComponent("✅ Publicado em modo manutenção (index & 404 atualizados).")}`);
    }

    // =================== PUBLICAÇÃO NORMAL ===================
    console.log("🌐 Modo normal: sincronizando SITE_DIR → REPO_DIR (add/update)...");
    syncDirContents(SITE_DIR, REPO_DIR); 
    await gitCommitPush();

    console.log("✅ Publicação concluída (sem exclusões).");
    res.redirect(`/?flash=${encodeURIComponent("✅ Conteúdo adicionado/atualizado e push realizado.")}`);
  }catch(err){
    console.error("❌ Erro na publicação:", err);
    res.redirect(`/?flash=${encodeURIComponent("❌ Erro ao publicar site. Verifique o console.")}`);
  }
});

export default router;