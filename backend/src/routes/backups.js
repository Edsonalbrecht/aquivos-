const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const { performBackup } = require('../backupService');

const router = express.Router();

// Obter histórico de logs de backup (Apenas Admin)
router.get('/logs', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const logs = db.prepare('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json(logs);
});

// Executar backup manualmente (Apenas Admin)
router.post('/run', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  try {
    await performBackup();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;