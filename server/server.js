const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

const settingsFile = path.join(__dirname, "../data/settings.json");
const productsFile = path.join(__dirname, "../data/products.json");

function readJSON(file) {
  if (!fs.existsSync(file)) return Array.isArray(file) ? [] : {};
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// =========================
// SETTINGS
// =========================
app.get("/api/settings", (req, res) => res.json(readJSON(settingsFile)));
app.put("/api/settings", (req, res) => {
  writeJSON(settingsFile, req.body);
  res.json({ ok: true });
});

// =========================
// PRODUCTS
// =========================
app.get("/api/products", (req, res) => res.json(readJSON(productsFile)));

app.get("/api/products/:id", (req, res) => {
  const products = readJSON(productsFile);
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Produto não encontrado" });
  res.json(product);
});

app.post("/api/products", (req, res) => {
  const products = readJSON(productsFile);
  const novo = { ...req.body, id: "p" + Date.now().toString(36) };
  products.push(novo);
  writeJSON(productsFile, products);
  res.status(201).json(novo);
});

app.put("/api/products/:id", (req, res) => {
  let products = readJSON(productsFile);
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Produto não encontrado" });

  products[index] = { ...products[index], ...req.body };
  writeJSON(productsFile, products);
  res.json(products[index]);
});

app.delete("/api/products/:id", (req, res) => {
  let products = readJSON(productsFile);
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Produto não encontrado" });

  const removido = products.splice(index, 1);
  writeJSON(productsFile, products);
  res.json(removido[0]);
});

// 🔥 Novo endpoint para salvar todos os produtos de uma vez
app.put("/api/products", (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Esperado um array de produtos" });
  }
  writeJSON(productsFile, req.body);
  res.json({ ok: true });
});

// =========================
// BANNERS
// =========================
app.get("/api/banners", (req, res) => {
  const s = readJSON(settingsFile);
  res.json(s.banners || []);
});
app.put("/api/banners", (req, res) => {
  const s = readJSON(settingsFile);
  s.banners = req.body;
  writeJSON(settingsFile, s);
  res.json(s.banners);
});

// =========================
// MENU
// =========================
app.get("/api/menu", (req, res) => {
  const s = readJSON(settingsFile);
  res.json(s.menu || []);
});
app.put("/api/menu", (req, res) => {
  const s = readJSON(settingsFile);
  s.menu = req.body;
  writeJSON(settingsFile, s);
  res.json(s.menu);
});

// =========================
// CATEGORIAS
// =========================
app.get("/api/categories", (req, res) => {
  const s = readJSON(settingsFile);
  res.json(s.categories || []);
});
app.put("/api/categories", (req, res) => {
  const s = readJSON(settingsFile);
  s.categories = req.body;
  writeJSON(settingsFile, s);
  res.json(s.categories);
});

// =========================
// FOOTER
// =========================
app.get("/api/footer", (req, res) => {
  const s = readJSON(settingsFile);
  res.json(s.footer || {});
});
app.put("/api/footer", (req, res) => {
  const s = readJSON(settingsFile);
  s.footer = req.body;
  writeJSON(settingsFile, s);
  res.json(s.footer);
});

// =========================
// PÁGINAS ESTÁTICAS
// =========================
app.get("/api/pages", (req, res) => {
  const s = readJSON(settingsFile);
  res.json(s.paginas || {});
});
app.put("/api/pages", (req, res) => {
  const s = readJSON(settingsFile);
  s.paginas = req.body;
  writeJSON(settingsFile, s);
  res.json(s.paginas);
});

// =========================
// START
// =========================
app.listen(PORT, () => {
  console.log(`✅ Server rodando em http://localhost:${PORT}`);
});
