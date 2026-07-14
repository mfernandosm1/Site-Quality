import express from "express";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import simpleGit from "simple-git";
import { generateCategoryPage, updateHeaderMenu, convertOldCategoryFiles, generateSeoFiles, loadSeoConfig, generateFriendlyUrlPages } from "./main_utils.js";

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
    const categoriesPath = path.join(REPO_DIR, 'content', 'categories.json');
    const data = readJsonSafe(categoriesPath, { items: [] });
    updateHeaderMenu(data.items || [], SITE_DIR);
    generateCategoryPage('', '', SITE_DIR);
    convertOldCategoryFiles(SITE_DIR);
    console.log('✅ Categorias preparadas para página única categoria.html.');
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
          fs.copyFileSync(s, d);
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
      const archive = archiver("zip",{ zlib:{ level:9 }});
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

async function gitCommitPush(){
  const git = simpleGit({ baseDir: REPO_DIR });
  try{ await git.raw(["config","--global","--add","safe.directory", REPO_DIR]); }catch{}
  await git.add([
    ".",
    ":!Site_with_content/content/automacao_whatsapp/**",
    ":!painel/.wwebjs_cache/**"
  ]);
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
    console.log("🌐 Modo normal: preparando categoria.html, limpando categorias antigas e sincronizando SITE_DIR → REPO_DIR...");
    prepararCategoriasParaPublicacao();
    generateSeoFiles(SITE_DIR, loadSeoConfig(SITE_DIR));
    generateFriendlyUrlPages(SITE_DIR);
    gerarHtmlEstaticoCategoriasPremium();
    limparArquivosCategoriasAntigos(SITE_DIR, REPO_DIR);
    syncDirContents(SITE_DIR, REPO_DIR);
    await gitCommitPush();

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
    res.redirect(`/?flash=${encodeURIComponent("❌ Erro ao publicar site. Verifique o console.")}`);
  }
});

export default router;
