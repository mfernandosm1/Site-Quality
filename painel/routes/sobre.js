import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
function P(app){ return app.locals.paths; }

/**
 * ROTA LEGADA: /sobre
 * Antes: lia/gravava HTML e renderizava 'editar_sobre' (modo visual).
 * Agora: SEM editar HTML aqui. Redireciona para o editor SEGURO de campos.
 */

// GET /sobre  -> vai para o editor seguro
router.get('/', (req, res) => {
  return res.redirect('/paginas-sobre');
});

// POST /sobre/salvar  -> compatibilidade: também redireciona
router.post('/salvar', (req, res) => {
  return res.redirect('/paginas-sobre');
});

// (Opcional) Qualquer outra subrota legada em /sobre/* -> redireciona
router.all('*', (req, res) => {
  return res.redirect('/paginas-sobre');
});

export default router;
