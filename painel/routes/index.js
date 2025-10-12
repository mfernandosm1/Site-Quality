import express from "express";
import fs from "fs";
import path from "path";
const router = express.Router();

function P(app) {
  return app.locals.paths;
}

// Caminhos fixos conforme informado
const SITE_DIR = "C:\\Site";
const BACKUP_DIR = "C:\\Site\\Backup";

router.get("/", (req, res) => {
  const { CONTENT_DIR } = P(req.app);
  let maint = { active: false, since: null },
    publish = { last_publish: null };
  try {
    maint = JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, "maintenance.json"), "utf-8")
    );
  } catch (e) {}
  try {
    publish = JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, "publish.json"), "utf-8")
    );
  } catch (e) {}
  res.render("index", {
    flash: req.query.flash || null,
    maint,
    publish,
  });
});

// Página editar index
router.get("/paginas/edit", (req, res) => {
  const file = path.join(SITE_DIR, "index.html");
  let html = "";
  try {
    html = fs.readFileSync(file, "utf-8");
  } catch (e) {}
  const m = /<main[\s\S]*?>([\s\S]*?)<\/main>/i.exec(html);
  const body = m ? m[1] : html;
  res.render("paginas_edit", { content: body, file: "index.html" });
});

// Salvar conteúdo da <main> da index
router.post("/paginas/save", (req, res) => {
  console.log("📥 Recebido:", req.body); // 🔍 log de debug

  const file = path.join(SITE_DIR, "index.html");
  const backup = path.join(
    BACKUP_DIR,
    "index_" + new Date().toISOString().replace(/[:.]/g, "-") + ".html"
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
    } else {
      const out = `<!doctype html><html><head><meta charset="utf-8"></head><body>${newContent}</body></html>`;
      fs.writeFileSync(file, out, "utf-8");
    }
    res.redirect("/?flash=Página+Index+salva+com+sucesso!");
  } catch (e) {
    console.error("Erro ao salvar index:", e);
    res.status(500).send("Erro ao salvar a página index.");
  }
});

export default router;
