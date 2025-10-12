import express from "express";
import fs from "fs";
import path from "path";
import { loadMainOnly, injectMainOnly } from "./main_utils.js";

const router = express.Router();
function P(app) {
  return app.locals.paths;
}

function decodeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ===============================
//  GET /paginas/edit?file=index.html
// ===============================
router.get("/edit", (req, res) => {
  const SITE_DIR = P(req.app).SITE_DIR;
  const fileName = req.query.file || "index.html";
  const filePath = path.join(SITE_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado: " + fileName);
  }

  const { innerMain, area } = loadMainOnly(filePath);
  res.render("paginas_edit", {
    file: fileName,
    content: innerMain,
    flash: null,
    area,
  });
});

// ===============================
//  POST /paginas/salvar
// ===============================
router.post("/salvar", (req, res) => {
  const SITE_DIR = P(req.app).SITE_DIR;
  const BACKUPS_DIR = P(req.app).BACKUPS_DIR;
  const fileName = req.body.file || "index.html";
  const filePath = path.join(SITE_DIR, fileName);
  const backupPath = path.join(
    BACKUPS_DIR,
    fileName + "." + new Date().toISOString().replace(/[:.]/g, "-")
  );

  try {
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(
        backupPath,
        fs.readFileSync(filePath, "utf-8"),
        "utf-8"
      );
    }
  } catch (e) {
    console.error("Falha ao criar backup:", e);
  }

  const { htmlCompleto, area } = loadMainOnly(filePath);
  const safeHTML = decodeHTML(req.body.html || "");
  const newHTML = injectMainOnly(htmlCompleto, area, safeHTML);

  fs.writeFileSync(filePath, newHTML, "utf-8");
  res.redirect(`/paginas/edit?file=${fileName}`);
});

export default router;
