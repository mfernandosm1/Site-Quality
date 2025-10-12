import fs from "fs";
import path from "path";

const SITE_DIR = "C:\\Site";
const file = path.join(SITE_DIR, "teste.txt");

try {
  fs.writeFileSync(file, "teste de escrita OK " + new Date().toISOString(), "utf-8");
  console.log("✅ Gravou em:", file);
} catch (e) {
  console.error("❌ Erro ao gravar:", e);
}
