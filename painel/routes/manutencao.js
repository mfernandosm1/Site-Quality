import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }

/**
 * Converte um arquivo de imagem em data URI (base64).
 * Retorna null se não existir.
 */
function readImageAsDataURI(absPath) {
  try {
    if (!fs.existsSync(absPath)) return null;
    const ext = path.extname(absPath).toLowerCase();
    const buf = fs.readFileSync(absPath);
    let mime = 'image/png';
    if (ext === '.svg' || ext === '.svgz') mime = 'image/svg+xml';
    else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
    else if (ext === '.webp') mime = 'image/webp';
    else if (ext === '.gif') mime = 'image/gif';
    const b64 = buf.toString('base64');
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

/**
 * Gera o HTML de manutenção com engrenagens animadas (SVG + CSS) e LOGO.
 * A logo é inline (data URI), então funciona local e no GitHub Pages.
 */
function buildMaintenanceHTML({
  title = 'Voltamos em breve',
  subtitle = 'Estamos realizando atualizações para melhorar sua experiência.',
  detail = 'Normalmente concluímos em algumas horas. Obrigado pela compreensão!',
  brand = 'Quality Celulares',
  whatsapp = '55991407824', // seu contato (somente números)
  logoDataURI = null,        // data:image/...;base64,...
} = {}) {
  const waLink = `https://wa.me/${whatsapp}`;
  const logoBlock = logoDataURI ? `
    <div class="logo-wrap">
      <img src="${logoDataURI}" alt="${brand} Logo" class="logo">
    </div>
  ` : '';

  return `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${brand} — Manutenção</title>
<style>
  :root{
    --bg1:#0f172a; --bg2:#0b1220; --card:rgba(255,255,255,.04); --border:rgba(255,255,255,.08);
    --acc:#22c55e; --muted:#94a3b8; --txt:#e2e8f0;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; min-height:100vh; color:var(--txt);
    background:
      radial-gradient(1000px 600px at 10% -10%, #1f2937 0%, transparent 60%),
      radial-gradient(900px 600px at 120% 0%, #111827 0%, transparent 55%),
      linear-gradient(180deg, var(--bg1), var(--bg2));
    display:flex; align-items:center; justify-content:center; padding:24px;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, "Helvetica Neue", Arial, "Noto Sans";
  }
  .wrap{
    width:min(980px, 96vw);
    background: var(--card);
    border:1px solid var(--border);
    border-radius:22px; padding:28px; backdrop-filter: blur(8px);
    box-shadow: 0 10px 30px rgba(0,0,0,.25);
  }
  .grid{ display:grid; grid-template-columns: 360px 1fr; gap:26px; align-items:center; }
  @media (max-width:860px){ .grid{ grid-template-columns:1fr; gap:20px; text-align:center } }

  .logo-wrap{ text-align:center; margin: 0 0 18px; }
  .logo{
    max-width: 420px; width: 90%; height: auto;
    filter: drop-shadow(0 4px 18px rgba(0,0,0,.35));
  }

  h1{ margin:0 0 6px; font-size: clamp(24px, 4vw, 36px); letter-spacing:.3px; }
  p{ margin:6px 0; color:var(--muted); font-size:16px; }
  .btn{
    display:inline-flex; gap:10px; align-items:center; padding:11px 16px; border-radius:10px;
    background: var(--acc); color:#06250f; text-decoration:none; font-weight:700; margin-top:16px;
    box-shadow: 0 8px 20px rgba(34,197,94,.25); transition: transform .15s ease;
  }
  .btn:hover{ transform: translateY(-1px); }
  .footer{ margin-top:18px; border-top:1px solid var(--border); padding-top:14px; color:#9aa4b2; font-size:13px; }

  /* ===== Engrenagens ===== */
  .stage{
    position: relative;
    aspect-ratio: 1.2 / 1; /* responsivo */
    max-width: 360px; margin-inline:auto;
  }
  .gear{
    position:absolute; inset:auto;
    left:50%; top:50%;
    transform: translate(-50%,-50%);
    opacity:.95;
    filter: drop-shadow(0 8px 20px rgba(0,0,0,.35));
  }
  svg{ display:block }
  .g-1{ width:200px; height:200px; animation: spin 12s linear infinite; }
  .g-2{ width:130px; height:130px; animation: spinRev 10s linear infinite; left:22%; top:26%; }
  .g-3{ width:90px;  height:90px;  animation: pulse 2.8s ease-in-out infinite; right:10%; top:68%; left:auto; }
  .core{
    position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);
    width:84px; height:84px; border-radius:18px;
    background: radial-gradient(120px 120px at 30% 30%, #22c55e 0%, #10b981 45%, rgba(16,185,129,.2) 100%);
    border:1px solid #1b7e57;
    display:flex; align-items:center; justify-content:center; color:#052b1d; font-weight:800; letter-spacing:.3px;
  }

  @keyframes spin { to { transform: translate(-50%,-50%) rotate(360deg); } }
  @keyframes spinRev { to { transform: translate(-50%,-50%) rotate(-360deg); } }
  @keyframes pulse {
    0%,100%{ transform: translate(-50%,-50%) scale(1); }
    50%{ transform: translate(-50%,-50%) scale(1.06); }
  }
</style>
</head>
<body>
  <main class="wrap">
    ${logoBlock}
    <div class="grid">
      <!-- Lado esquerdo: engrenagens -->
      <div class="stage" aria-hidden="true">
        <!-- Gear 1 -->
        <svg class="gear g-1" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#94a3b8"/><stop offset="1" stop-color="#e5e7eb"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="32" fill="url(#lg1)" stroke="#0b1220" stroke-width="2"/>
          ${Array.from({length:12}).map((_,i)=>`<rect x="48" y="-2" width="4" height="14" rx="1" ry="1" fill="#d1d5db" transform="rotate(${i*30} 50 50) translate(0 12)"/>`).join('')}
          <circle cx="50" cy="50" r="10" fill="#0b1220"/>
        </svg>

        <!-- Gear 2 -->
        <svg class="gear g-2" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#c7d2fe"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="24" fill="url(#lg2)" stroke="#0b1220" stroke-width="2"/>
          ${Array.from({length:10}).map((_,i)=>`<rect x="49" y="-2" width="2" height="10" rx="1" ry="1" fill="#93c5fd" transform="rotate(${i*36} 50 50) translate(0 16)"/>`).join('')}
          <circle cx="50" cy="50" r="8" fill="#0b1220"/>
        </svg>

        <!-- Gear 3 (decor) -->
        <svg class="gear g-3" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#86efac"/>
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="20" fill="url(#lg3)" stroke="#0b1220" stroke-width="2"/>
          ${Array.from({length:8}).map((_,i)=>`<rect x="49" y="-2" width="2" height="8" rx="1" ry="1" fill="#6ee7b7" transform="rotate(${i*45} 50 50) translate(0 16)"/>`).join('')}
          <circle cx="50" cy="50" r="6" fill="#0b1220"/>
        </svg>

        <div class="core">⚙️</div>
      </div>

      <!-- Lado direito: mensagens -->
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
        <p>${detail}</p>
        <a class="btn" href="${waLink}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
          🟢 Falar no WhatsApp
        </a>
        <div class="footer">© Rede Quality Celulares. Todos os direitos reservados.</div>
      </div>
    </div>
  </main>
</body>
</html>`;
}

// ===== ROTAS =====

// Status (opcional)
router.get('/', (req, res) => {
  const enabled = fs.existsSync(path.join(P(req.app).SITE_DIR, 'maintenance.flag'));
  try {
    return res.render('manutencao', { enabled });
  } catch {
    return res.json({ enabled });
  }
});

// Ativar modo manutenção (gera flag + maintenance.html com LOGO)
router.post('/ativar', (req, res) => {
  const { SITE_DIR } = P(req.app);
  const flagPath = path.join(SITE_DIR, 'maintenance.flag');
  const htmlPath = path.join(SITE_DIR, 'maintenance.html');

  try {
    fs.writeFileSync(flagPath, String(Date.now()), 'utf-8');

    // Lê a logo da pasta images (inline para funcionar local e no GitHub Pages)
    const logoPath = path.join(SITE_DIR, 'images', 'logo.png');
    const logoDataURI = readImageAsDataURI(logoPath);

    const html = buildMaintenanceHTML({
      title: 'Voltamos em breve',
      subtitle: 'Estamos realizando atualizações para melhorar sua experiência.',
      detail: 'Normalmente concluímos em algumas horas. Obrigado pela compreensão!',
      brand: 'Quality Celulares',
      whatsapp: '55991407824',
      logoDataURI, // se não achar, simplesmente não mostra a logo
    });

    fs.writeFileSync(htmlPath, html, 'utf-8');
  } catch (e) {
    console.error('Falha ao ativar manutenção:', e);
  }

  return res.redirect('/?flash=' + encodeURIComponent('Modo manutenção ativado.'));
});

// Desativar modo manutenção (remove flag)
router.post('/desativar', (req, res) => {
  const { SITE_DIR } = P(req.app);
  const flagPath = path.join(SITE_DIR, 'maintenance.flag');

  try { if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath); } catch (e) {
    console.error('Falha ao desativar manutenção:', e);
  }
  return res.redirect('/?flash=' + encodeURIComponent('Modo manutenção desativado.'));
});

export default router;
