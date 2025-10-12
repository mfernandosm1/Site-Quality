import express from "express";
import fs from "fs";
import path from "path";
const router = express.Router();

const SITE_DIR = "C:\\Site";
const BACKUP_DIR = "C:\\Site\\Backup";

router.get("/", (req, res) => {
  const file = path.join(SITE_DIR, "sobre.html");
  let html = "";
  try {
    html = fs.readFileSync(file, "utf-8");
  } catch (e) {}
  const m = /<main[\s\S]*?>([\s\S]*?)<\/main>/i.exec(html);
  const body = m ? m[1] : html;
  res.render("editar_sobre", { html: body, flash: null });
});

router.post("/salvar", (req, res) => {
  console.log("📥 Recebido:", req.body);

  const file = path.join(SITE_DIR, "sobre.html");
  const backup = path.join(
    BACKUP_DIR,
    "sobre_" + new Date().toISOString().replace(/[:.]/g, "-") + ".html"
  );

  try {
    const original = fs.existsSync(file)
      ? fs.readFileSync(file, "utf-8")
      : "";
    fs.writeFileSync(backup, original, "utf-8");

    const newContent = req.body.html || req.body.content || "";

    if (/<\s*main[\s\S]*?>[\s\S]*?<\s*\/\s*main\s*>/i.test(original)) {
      const out = original.replace(
        /(<\s*main[\s\S]*?>)[\s\S]*?(<\s*\/\s*main\s*>)/i,
        `$1${newContent}$2`
      );
      fs.writeFileSync(file, out, "utf-8");
      console.log("✅ sobre.html atualizado com sucesso");
    } else {
      console.warn("⚠️ Tag <main> não encontrada em sobre.html");
    }

    res.redirect("/sobre");
  } catch (e) {
    console.error("❌ Erro ao salvar sobre:", e);
    res.status(500).send("Erro ao salvar sobre.html");
  }
});

export default router;
