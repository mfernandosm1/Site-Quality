import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";
import { spawnSync } from "child_process";
import { generateCategoryPage, updateHeaderMenu, convertOldCategoryFiles, generateSeoFiles, loadSeoConfig, generateFriendlyUrlPages,
  syncGeneratedHeaderIntoIndex
} from "./main_utils.js";

const router = express.Router();

const REPO_DIR  = 'C:\\Site';                    // raiz do repo (onde você dá o push)
const SITE_DIR  = 'C:\\Site\\Site_with_content'; // fonte do site
const BACKUP_DIR= path.join(REPO_DIR, 'Backup');
const BRANCH    = process.env.GIT_BRANCH || "main";
const TZ        = 'America/Sao_Paulo';
const KEEP_BACKUPS = 5;

// Localiza o Git de forma robusta no Windows. O painel pode ter sido iniciado por um
// Visual Studio/terminal que ainda não recebeu a atualização do PATH após instalar o Git.
function gitExecutavelFunciona(binary){
  if (!binary) return false;
  try {
    const result = spawnSync(binary, ["--version"], {
      encoding: "utf-8",
      windowsHide: true,
      timeout: 5000
    });
    return !result.error && result.status === 0;
  } catch {
    return false;
  }
}

function localizarGitExecutavel(){
  const configured = String(process.env.GIT_BINARY || "").trim();
  const candidates = [];
  const add = value => {
    const v = String(value || "").trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };

  // 1) configuração explícita, se houver; 2) PATH atual do processo.
  add(configured);
  add("git");

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env.LOCALAPPDATA || "";

    // Instalações mais comuns do Git for Windows.
    add(path.join(programFiles, "Git", "cmd", "git.exe"));
    add(path.join(programFiles, "Git", "bin", "git.exe"));
    add(path.join(programFilesX86, "Git", "cmd", "git.exe"));
    add(path.join(programFilesX86, "Git", "bin", "git.exe"));
    if (localAppData) {
      add(path.join(localAppData, "Programs", "Git", "cmd", "git.exe"));
      add(path.join(localAppData, "Programs", "Git", "bin", "git.exe"));

      // Git empacotado pelo GitHub Desktop, caso seja a única instalação disponível.
      const githubDesktop = path.join(localAppData, "GitHubDesktop");
      try {
        if (fs.existsSync(githubDesktop)) {
          const appDirs = fs.readdirSync(githubDesktop, { withFileTypes: true })
            .filter(ent => ent.isDirectory() && /^app-/i.test(ent.name))
            .map(ent => ent.name)
            .sort()
            .reverse();
          for (const appDir of appDirs) {
            add(path.join(githubDesktop, appDir, "resources", "app", "git", "cmd", "git.exe"));
          }
        }
      } catch {}
    }
  }

  for (const binary of candidates) {
    if (gitExecutavelFunciona(binary)) {
      console.log(`🔧 Git localizado: ${binary}`);
      return binary;
    }
  }

  const error = new Error(
    "Git não foi localizado neste computador. Instale o Git for Windows ou defina a variável GIT_BINARY com o caminho completo do git.exe. " +
    "Se o Git acabou de ser instalado, esta correção já tenta os caminhos padrão sem exigir reiniciar o Visual Studio."
  );
  error.code = "GIT_NOT_FOUND";
  throw error;
}

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
    
    // Alvo principal: Tenta ler 'texto' ou 'text' para garantir o ano (2014 - 2026) que você digitar no painel
    const textoRodape = footerData.texto || footerData.text || "© 2014 - 2026 Quality Celulares. Todos os direitos reservados.";
    
    // Evita duplicar a palavra CNPJ caso o usuário já tenha digitado no painel
    let cnpjRodape = footerData.cnpj || "";
    if (cnpjRodape) {
      cnpjRodape = cnpjRodape.replace(/^CNPJ:\s*/i, ''); // Remove se o painel já mandou com "CNPJ:" no começo
      cnpjRodape = `CNPJ: ${cnpjRodape}`;
    }

    // Links institucionais dinâmicos (Usará o do painel quando forem criados, ou o padrão se não existirem)
    const urlSobre = footerData.urlSobre || "sobre.html";
    const urlPagamento = footerData.urlPagamento || "formas-de-pagamento.html";

    const redesSociais = footerData.social || [];

    // 2. Ordena as redes sociais conforme a ordem do painel
    redesSociais.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    // 3. Monta o bloco de ícones sociais dinamicamente (Código intocado que você validou)
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

    // 4. Estrutura montada injetando dinamicamente os novos links e o texto corrigido
    const novoConteudoHTML = `<footer class="footer bg-gray-900 text-gray-300 py-8 mt-12">
  <div class="footer-container max-w-6xl mx-auto px-4">
    <div class="footer-links">
      <a href="${urlSobre}">Sobre nós</a>
      <a href="${urlPagamento}">Formas de pagamento e envio</a>
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
    console.log("🛠️ [Footer Dinâmico] footer.html atualizado (Texto, CNPJ e Links) com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao processar footer dinâmico:", error.message);
  }
}
// ===========================================================

function limparArquivosCategoriasAntigos(...dirs){
  let removed = 0;
  for (const dir of dirs) {
    try {
      if (!dir || !fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (/^categoria[-_].+\.html$/i.test(f)) {
          fs.unlinkSync(path.join(dir, f));
          removed++;
          console.log(`🧹 Arquivo antigo de categoria removido: ${path.join(dir, f)}`);
        }
      }
    } catch (e) {
      console.warn(`⚠️ Falha ao limpar categorias antigas em ${dir}: ${e.message}`);
    }
  }
  if (removed > 0) console.log(`✅ ${removed} arquivo(s) antigo(s) de categoria removido(s).`);
}


function readJsonSafe(file, fallback = { items: [] }){
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return fallback; }
}

function prepararCategoriasParaPublicacao(){
  try {
    const contentDir = path.join(SITE_DIR, 'content');
    const categoriesPath = fs.existsSync(path.join(contentDir, 'categories.json'))
      ? path.join(contentDir, 'categories.json')
      : path.join(REPO_DIR, 'content', 'categories.json');
    const subcategoriesPath = fs.existsSync(path.join(contentDir, 'subcategories.json'))
      ? path.join(contentDir, 'subcategories.json')
      : path.join(REPO_DIR, 'content', 'subcategories.json');
    const data = readJsonSafe(categoriesPath, { items: [] });
    const subcategories = readJsonSafe(subcategoriesPath, { items: [] });
    updateHeaderMenu(data.items || [], SITE_DIR, subcategories.items || []);
    syncGeneratedHeaderIntoIndex(SITE_DIR);
    generateCategoryPage('', '', SITE_DIR);
    convertOldCategoryFiles(SITE_DIR);
    console.log('✅ Categorias e subcategorias preparadas para publicação.');
  } catch (e) {
    console.warn(`⚠️ Falha ao preparar categorias: ${e.message}`);
  }
}

const SITE_URL = 'https://www.qualitycel.com.br';

function slugifyCategory(s){
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categoria';
}

function escapeAttr(value){
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categorySeoTitle(cat){
  const custom = String(cat?.seoTitle || cat?.seo_title || cat?.titleSeo || '').trim();
  if (custom) return custom;
  return `${String(cat?.name || 'Categoria').trim()} | Quality Celulares`;
}

function categorySeoDescription(cat){
  const custom = String(cat?.seoDescription || cat?.seo_description || cat?.descriptionSeo || cat?.metaDescription || '').trim();
  if (custom) return custom;
  return `Confira ${String(cat?.name || 'produtos').trim()} na Quality Celulares. Produtos novos e seminovos com garantia, frete grátis e atendimento especializado.`;
}

function categoryOgTitle(cat){
  return String(cat?.ogTitle || cat?.og_title || '').trim() || categorySeoTitle(cat);
}

function categoryOgDescription(cat){
  return String(cat?.ogDescription || cat?.og_description || '').trim() || categorySeoDescription(cat);
}

function categoryOgImage(cat){
  const raw = String(cat?.ogImage || cat?.og_image || cat?.seoImage || '').trim();
  if (!raw) return `${SITE_URL}/images/logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;

  // Aceita caminho digitado no painel de várias formas:
  // images/banner.png
  // /images/banner.png
  // categoria-smartphones.png
  // C:\Site\Site_with_content\images\categoria-smartphones.png
  let clean = raw.replace(/\\/g, '/').trim();

  const marker = '/Site_with_content/';
  const markerIndex = clean.toLowerCase().indexOf(marker.toLowerCase());
  if (markerIndex >= 0) {
    clean = clean.slice(markerIndex + marker.length);
  }

  clean = clean.replace(/^\/+/, '');

  if (!clean.includes('/')) {
    clean = `images/${clean}`;
  }

  if (!/^images\//i.test(clean) && !/^content\//i.test(clean) && !/^uploads\//i.test(clean)) {
    clean = `images/${clean.replace(/^\/+/, '')}`;
  }

  return `${SITE_URL}/${clean}`;
}

function patchMetaTag(html, selectorRegex, tagHtml){
  if (selectorRegex.test(html)) return html.replace(selectorRegex, tagHtml);
  return html.replace('</head>', `  ${tagHtml}\n</head>`);
}

function gerarHtmlEstaticoCategoriasPremium(){
  try {
    const categoriesPath = path.join(REPO_DIR, 'content', 'categories.json');
    const baseFile = path.join(SITE_DIR, 'categoria.html');
    if (!fs.existsSync(categoriesPath) || !fs.existsSync(baseFile)) return;

    const data = readJsonSafe(categoriesPath, { items: [] });
    const items = (data.items || []).sort((a,b) => Number(a.order || 0) - Number(b.order || 0));
    const baseHtml = fs.readFileSync(baseFile, 'utf-8');

    for (const cat of items) {
      const slug = slugifyCategory(cat.slug || cat.name);
      const url = `${SITE_URL}/${slug}/`;
      const title = categorySeoTitle(cat);
      const description = categorySeoDescription(cat);
      const ogTitle = categoryOgTitle(cat);
      const ogDescription = categoryOgDescription(cat);
      const ogImage = categoryOgImage(cat);

      let html = baseHtml;
      html = patchMetaTag(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
      html = patchMetaTag(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeAttr(description)}">`);
      html = patchMetaTag(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(ogTitle)}">`);
      html = patchMetaTag(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(ogDescription)}">`);
      html = patchMetaTag(html, /<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${escapeAttr(ogImage)}">`);
      html = patchMetaTag(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeAttr(url)}">`);
      html = patchMetaTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttr(url)}">`);

      const dir = path.join(SITE_DIR, slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf-8');
      console.log(`✅ SEO premium da categoria gerado: /${slug}/`);
    }
  } catch (e) {
    console.warn(`⚠️ Falha ao gerar SEO premium das categorias: ${e.message}`);
  }
}


function syncDirContents(src, dst){
  const IGNORE_NAMES = new Set([".git",".github","node_modules","Backup","backups",".wwebjs_cache"]);
  const IGNORE_RELATIVE = [
    "content/automacao_whatsapp",
    "painel/.wwebjs_cache"
  ];

  function shouldIgnore(fullPath){
    const relative = path.relative(src, fullPath).replace(/\\/g, "/");
    return IGNORE_RELATIVE.some(prefix => relative === prefix || relative.startsWith(prefix + "/"));
  }

  function walk(curSrc, curDst){
    if (!fs.existsSync(curDst)) fs.mkdirSync(curDst, { recursive:true });

    for (const ent of fs.readdirSync(curSrc, { withFileTypes:true })) {
      if (IGNORE_NAMES.has(ent.name)) continue;

      const s = path.join(curSrc, ent.name);
      const d = path.join(curDst, ent.name);

      if (shouldIgnore(s)) {
        console.log(`🔒 Ignorado na publicação: ${path.relative(src, s)}`);
        continue;
      }

      if (ent.isDirectory()){
        walk(s, d);
      } else if (ent.isFile()){
        try {
          fs.mkdirSync(path.dirname(d), { recursive:true });
          let copy = true;
          if (fs.existsSync(d)) {
            const ss = fs.statSync(s);
            const ds = fs.statSync(d);
            if (ss.size === ds.size) {
              const sb = fs.readFileSync(s);
              const db = fs.readFileSync(d);
              copy = !sb.equals(db);
            }
          }
          if (copy) fs.copyFileSync(s, d);
        } catch (error) {
          error.message = `Falha ao copiar "${s}" para "${d}": ${error.message}`;
          error.path = error.path || s;
          error.dest = error.dest || d;
          throw error;
        }
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
      const archive = archiver("zip",{ zlib:{ level:1 }});
      out.on("close",()=>{ console.log(`[backup] ✅ ${nome} (${archive.pointer()} bytes)`); resolve(destino); });
      archive.on("error",reject);
      archive.glob("**/*",{
        cwd:SITE_DIR,
        dot:false,
        ignore:[
          "node_modules/**",
          "Backup/**",
          "backups/**",
          "content/automacao_whatsapp/**",
          "**/.wwebjs_cache/**"
        ]
      });
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

const GITHUB_SAFE_FILE_LIMIT = 95 * 1024 * 1024; // margem abaixo do limite rígido de 100 MB

function isArquivoLocalNaoPublicavel(relativePath){
  const rel = String(relativePath || "").replace(/\\/g, "/");
  const base = path.posix.basename(rel).toLowerCase();
  const ext = path.posix.extname(base).toLowerCase();

  // Pacotes/arquivos usados para transportar ou guardar cópias locais nunca fazem parte do site publicado.
  if ([".rar", ".zip", ".7z", ".tar", ".gz", ".tgz"].includes(ext)) return true;
  if (/^(backup|backups)(\/|$)/i.test(rel)) return true;
  if (/^site_with_content\/(backup|backups)(\/|$)/i.test(rel)) return true;

  // Dados locais do WhatsApp/cache não devem ser enviados ao repositório.
  if (/^site_with_content\/content\/automacao_whatsapp(\/|$)/i.test(rel)) return true;
  if (/^painel\/\.wwebjs_cache(\/|$)/i.test(rel)) return true;
  return false;
}

function garantirExclusoesLocaisGit(){
  try {
    const infoDir = path.join(REPO_DIR, ".git", "info");
    const excludeFile = path.join(infoDir, "exclude");
    if (!fs.existsSync(infoDir)) return;

    const markerStart = "# QUALITY-PUBLISH-LOCAL-EXCLUDES START";
    const markerEnd = "# QUALITY-PUBLISH-LOCAL-EXCLUDES END";
    const block = [
      markerStart,
      "Backup/",
      "backups/",
      "*.rar",
      "*.zip",
      "*.7z",
      "*.tar",
      "*.tar.gz",
      "*.tgz",
      "Site_with_content/content/automacao_whatsapp/",
      "painel/.wwebjs_cache/",
      markerEnd
    ].join("\n");

    let current = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, "utf-8") : "";
    const rx = new RegExp(`${markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
    if (rx.test(current)) current = current.replace(rx, block);
    else current = `${current.replace(/\s*$/, "")}\n${block}\n`;

    fs.writeFileSync(excludeFile, current, "utf-8");
  } catch (e) {
    console.warn(`⚠️ Não foi possível atualizar .git/info/exclude: ${e.message}`);
  }
}

async function retirarArquivosBloqueadosDoStage(git){
  let staged = [];
  try {
    staged = String(await git.raw(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]))
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean);
  } catch {
    return;
  }

  for (const rel of staged.filter(isArquivoLocalNaoPublicavel)) {
    try {
      await git.raw(["reset", "-q", "HEAD", "--", rel]);
      console.warn(`🔒 Ignorado no Git: ${rel}`);
    } catch (e) {
      console.warn(`⚠️ Não foi possível retirar ${rel} do stage: ${e.message}`);
    }
  }
}

async function recuperarCommitsLocaisComArquivoBloqueado(git){
  const remoteRef = `origin/${BRANCH}`;

  // Atualiza a referência remota quando possível, mas não bloqueia uma publicação offline/local por isso.
  try { await git.fetch("origin", BRANCH); }
  catch (e) { console.warn(`⚠️ Não foi possível atualizar ${remoteRef} antes da checagem: ${e.message}`); }

  try {
    await git.raw(["rev-parse", "--verify", remoteRef]);
  } catch {
    return;
  }

  let ahead = 0;
  try {
    ahead = Number(String(await git.raw(["rev-list", "--count", `${remoteRef}..HEAD`])).trim() || 0);
  } catch {
    return;
  }
  if (!ahead) return;

  let changed = [];
  try {
    changed = String(await git.raw(["diff", "--name-only", remoteRef, "HEAD"]))
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean);
  } catch {
    return;
  }

  const bloqueados = changed.filter(isArquivoLocalNaoPublicavel);
  if (!bloqueados.length) return;

  // Um push rejeitado deixa o commit ruim apenas no computador local. Voltamos o HEAD para
  // origin/main mantendo TODOS os arquivos/alterações no working tree; em seguida o fluxo normal
  // recria um único commit limpo, sem o RAR/ZIP que causou o bloqueio.
  console.warn(`🧹 Detectado(s) ${ahead} commit(s) local(is) ainda não publicado(s) contendo arquivo(s) que não devem ir ao GitHub:`);
  bloqueados.forEach(f => console.warn(`   - ${f}`));
  await git.raw(["reset", "--mixed", remoteRef]);
  console.log("✅ Commit local rejeitado limpo; alterações válidas foram preservadas para nova publicação.");
}

async function retirarArquivosGrandesDoStage(git){
  let staged = [];
  try {
    staged = String(await git.raw(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]))
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean);
  } catch {
    return;
  }

  for (const rel of staged) {
    const full = path.join(REPO_DIR, rel);
    try {
      if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
      const size = fs.statSync(full).size;
      if (size < GITHUB_SAFE_FILE_LIMIT) continue;

      await git.raw(["reset", "--", rel]);
      console.warn(`🔒 Arquivo grande ignorado no Git: ${rel} (${(size / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.warn(`⚠️ Não foi possível validar o tamanho de ${rel}: ${e.message}`);
    }
  }
}

function garantirGitNoPathDoProcesso(gitBinary){
  if (!gitBinary || String(gitBinary).toLowerCase() === "git") return;

  const gitDir = path.dirname(gitBinary);
  const pathKey = Object.keys(process.env).find(k => k.toLowerCase() === "path") || "Path";
  const currentPath = String(process.env[pathKey] || "");
  const entries = currentPath.split(path.delimiter).filter(Boolean);
  const normalizar = value => {
    try { return path.resolve(value).toLowerCase(); }
    catch { return String(value || "").toLowerCase(); }
  };

  if (!entries.some(entry => normalizar(entry) === normalizar(gitDir))) {
    process.env[pathKey] = currentPath
      ? `${gitDir}${path.delimiter}${currentPath}`
      : gitDir;
    console.log(`🔧 Pasta do Git adicionada ao PATH do painel: ${gitDir}`);
  }
}

async function gitCommitPush(gitBinary = localizarGitExecutavel()){
  // O simple-git restringe caminhos customizados contendo espaços (ex.: C:\Program Files\...).
  // Em vez de passar o caminho absoluto como `binary`, adicionamos sua pasta ao PATH deste
  // processo e deixamos o simple-git chamar o executável padrão "git".
  garantirGitNoPathDoProcesso(gitBinary);
  const git = simpleGit({ baseDir: REPO_DIR });
  try{ await git.raw(["config","--global","--add","safe.directory", REPO_DIR]); }catch{}

  await recuperarCommitsLocaisComArquivoBloqueado(git);

  // Não passamos diretórios ignorados como pathspec do `git add`, pois no Git para Windows
  // isso pode fazer o comando retornar erro (ex.: Backup já presente no .gitignore).
  // As exclusões locais são registradas em .git/info/exclude e o stage é saneado logo depois.
  garantirExclusoesLocaisGit();
  await git.raw(["add", "-A"]);

  // Barreiras após o stage: removem arquivos que nunca devem ser publicados e também
  // qualquer arquivo grande que poderia disparar GH001 no GitHub.
  await retirarArquivosBloqueadosDoStage(git);
  await retirarArquivosGrandesDoStage(git);

  const staged = String(await git.raw(["diff", "--cached", "--name-only"])).trim();
  if (staged) {
    await git.commit(`chore: publish (${nowSP().date.toISOString()})`);
  } else {
    console.log("ℹ️ Nenhuma nova alteração para commit; verificando apenas o push pendente.");
  }

  await git.push("origin", BRANCH);
}

router.post("/", async (req,res)=>{
  try{
    console.log("🚀 Publicação iniciada…");

    // Pré-checagem: evita gerar backup/sincronizar arquivos se este computador não
    // tiver um Git utilizável para concluir a publicação.
    const gitBinary = localizarGitExecutavel();
    
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
      await gitCommitPush(gitBinary);
      console.log("✅ Publicação (modo manutenção) concluída.");
      return res.redirect(`/?flash=${encodeURIComponent("✅ Publicado em modo manutenção (index & 404 atualizados).")}`);
    }

    // =================== PUBLICAÇÃO NORMAL ===================
    console.log("🌐 Modo normal: preparando categoria.html, limpando categorias antigas e sincronizando SITE_DIR → REPO_DIR...");
    prepararCategoriasParaPublicacao();
    generateSeoFiles(SITE_DIR, loadSeoConfig(SITE_DIR));
    generateFriendlyUrlPages(SITE_DIR);
    gerarHtmlEstaticoCategoriasPremium();
    limparArquivosCategoriasAntigos(SITE_DIR, REPO_DIR);
    syncDirContents(SITE_DIR, REPO_DIR);
    await gitCommitPush(gitBinary);

    console.log("✅ Publicação concluída.");
    res.redirect(`/?flash=${encodeURIComponent("✅ Conteúdo atualizado, categorias antigas limpas e push realizado.")}`);
  }catch(err){
    console.error("❌ Erro na publicação:");
    console.error("Mensagem:", err?.message);
    console.error("Código:", err?.code);
    console.error("Operação:", err?.syscall);
    console.error("Caminho:", err?.path);
    console.error("Destino:", err?.dest);
    console.error("Erro completo:", err);
    const mensagemUsuario = err?.code === "GIT_NOT_FOUND"
      ? `❌ ${err.message}`
      : "❌ Erro ao publicar site. Verifique o console.";
    res.redirect(`/?flash=${encodeURIComponent(mensagemUsuario)}`);
  }
});

export default router;
