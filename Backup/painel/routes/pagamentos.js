import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }

/**
 * ROTA LEGADA: /pagamentos
 * Antes: lia/gravava HTML e renderizava 'editar_pagamentos' (modo visual).
 * Agora: SEM editar HTML aqui. Redireciona para o editor SEGURO de campos.
 */

// GET /pagamentos  -> vai para o editor seguro
router.get('/', (req, res) => {
  return res.redirect('/paginas-formas');
});

// POST /pagamentos/salvar  -> compatibilidade: também redireciona
router.post('/salvar', (req, res) => {
  return res.redirect('/paginas-formas');
});

// (Opcional) Qualquer outra subrota legada em /pagamentos/* -> redireciona
router.all('*', (req, res) => {
  return res.redirect('/paginas-formas');
});

export default router;
