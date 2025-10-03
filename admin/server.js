// /site/admin/server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, ".."))); // serve o site inteiro

// Caminhos dos arquivos
const productsFile = path.join(__dirname, "../data/products.json");
const settingsFile = path.join(__dirname, "../data/settings.json");

// ----------------------------
// Produtos
// ----------------------------
app.get("/api/products", (req, res) => {
  const data = fs.readFileSync(productsFile);
  res.json(JSON.parse(data));
});

app.post("/api/products", (req, res) => {
  const newProduct = req.body;
  const data = JSON.parse(fs.readFileSync(productsFile));
  data.push(newProduct);
  fs.writeFileSync(productsFile, JSON.stringify(data, null, 2));
  res.json({ success: true, message: "Produto adicionado!" });
});

app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const updatedProduct = req.body;
  let data = JSON.parse(fs.readFileSync(productsFile));
  data = data.map(p => (p.id === id ? updatedProduct : p));
  fs.writeFileSync(productsFile, JSON.stringify(data, null, 2));
  res.json({ success: true, message: "Produto atualizado!" });
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  let data = JSON.parse(fs.readFileSync(productsFile));
  data = data.filter(p => p.id !== id);
  fs.writeFileSync(productsFile, JSON.stringify(data, null, 2));
  res.json({ success: true, message: "Produto removido!" });
});

// ----------------------------
// Configurações do site
// ----------------------------
app.get("/api/settings", (req, res) => {
  const data = fs.readFileSync(settingsFile);
  res.json(JSON.parse(data));
});

app.put("/api/settings", (req, res) => {
  const newSettings = req.body;
  fs.writeFileSync(settingsFile, JSON.stringify(newSettings, null, 2));
  res.json({ success: true, message: "Configurações atualizadas!" });
});

// ----------------------------
// Iniciar servidor
// ----------------------------
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
