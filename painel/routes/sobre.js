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
    const lower = original.toLowerCase();
    const mainStart = lower.indexOf("<main");
    const mainOpenEnd = lower.indexOf(">", mainStart);
    const mainClose = lower.indexOf("</main>");

    if (mainStart !== -1 && mainOpenEnd !== -1 && mainClose !== -1) {
      const before = original.substring(0, mainOpenEnd + 1);
      const after = original.substring(mainClose);
      const out = before + "\n" + newContent + "\n" + after;
      fs.writeFileSync(file, out, "utf-8");
      console.log("✅", path.basename(file), "atualizado com sucesso");
    } else {
      console.warn("⚠️ Tags <main> não encontradas em", file);
    }

    res.redirect("/sobre");
  } catch (e) {
    console.error("❌ Erro ao salvar:", e);
    res.status(500).send("Erro ao salvar sobre.html");
  }
});

export default router;
