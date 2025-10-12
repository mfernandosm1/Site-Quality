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
//  GET /paginas_index
// ===============================
router.get("/", (req, res) => {
  const SITE_DIR = P(req.app).SITE_DIR;
  const filePath = path.join(SITE_DIR, "index.html");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo index.html não encontrado.");
  }

  const { innerMain, area } = loadMainOnly(filePath);
  res.render("paginas_index", {
    file: "index.html",
    content: innerMain,
    flash: null,
    area,
  });
});

// ===============================
//  POST /paginas_index/salvar
// ===============================
router.post("/salvar", (req, res) => {
  const SITE_DIR = P(req.app).SITE_DIR;
  const BACKUPS_DIR = P(req.app).BACKUPS_DIR;
  const filePath = path.join(SITE_DIR, "index.html");
  const backupPath = path.join(
    BACKUPS_DIR,
    "index.html." + new Date().toISOString().replace(/[:.]/g, "-")
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
  res.redirect("/paginas_index");
});

export default router;
