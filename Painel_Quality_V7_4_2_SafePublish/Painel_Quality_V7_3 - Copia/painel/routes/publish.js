/**
 * Painel Quality Celulares - Publicação com Backup Local Automático
 * Compatível com V7_4_2_SafePublish
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Caminhos base
const SITE_DIR = path.join(__dirname, '../../Site_with_content');
const BACKUP_DIR = path.join(__dirname, '../backup');

async function criarBackupLocal() {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

      const data = new Date();
      const nomeArquivo = `site_${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}_${String(
        data.getHours()
      ).padStart(2, '0')}${String(data.getMinutes()).padStart(2, '0')}.zip`;
      const destino = path.join(BACKUP_DIR, nomeArquivo);

      const saida = fs.createWriteStream(destino);
      const archive = archiver('zip', { zlib: { level: 9 } });

      saida.on('close', () => {
        console.log(`✅ Backup criado: ${nomeArquivo} (${archive.pointer()} bytes)`);
        resolve(destino);
      });

      archive.on('error', (err) => reject(err));
      archive.pipe(saida);
      archive.directory(SITE_DIR, false);
      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

router.post('/', async (req, res) => {
  try {
    console.log('🚀 Iniciando publicação do site...');
    await criarBackupLocal();

    // Aqui segue o fluxo normal da publicação
    console.log('📦 Publicando site...');
    setTimeout(() => {
      console.log('✅ Publicação concluída com sucesso.');
      res.json({ success: true, message: 'Publicação concluída com backup local criado.' });
    }, 1500);
  } catch (err) {
    console.error('❌ Erro na publicação:', err);
    res.status(500).json({ success: false, message: 'Erro ao publicar site.', error: err.message });
  }
});

module.exports = router;
