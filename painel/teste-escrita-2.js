import fs from "fs";
import path from "path";

const file = "C:\\Site\\index.html";
const teste = "<!-- teste de escrita " + new Date().toISOString() + " -->";

try {
  fs.appendFileSync(file, "\n" + teste + "\n", "utf-8");
  console.log("✅ conseguiu gravar dentro de index.html");
} catch (e) {
  console.error("❌ erro ao gravar:", e);
}
