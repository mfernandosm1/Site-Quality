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

    const lines = original.split(/\r?\n/);
    let insideMain = false;
    const newLines = [];

    for (const line of lines) {
      if (!insideMain) {
        newLines.push(line);
        if (/<\s*main[\s\S]*?>/i.test(line)) {
          insideMain = true;
          newLines.push(newContent);
        }
      } else {
        if (/<\s*\/\s*main\s*>/i.test(line)) {
          newLines.push(line);
          insideMain = false;
        }
      }
    }

    const out = newLines.join("\n");
    fs.writeFileSync(file, out, "utf-8");
    console.log("✅ Substituição concluída em", file);

    res.redirect("/sobre");
  } catch (e) {
    console.error("❌ Erro ao salvar:", e);
    res.status(500).send("Erro ao salvar sobre.html");
  }
});

export default router;
