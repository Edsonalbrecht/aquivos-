const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(auth);

// Obter perfil do usuário logado
router.get('/me', (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, notifications_sound FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Atualizar preferências de som
router.patch('/preferences', (req, res) => {
  const { notifications_sound } = req.body;
  db.prepare('UPDATE users SET notifications_sound = ? WHERE id = ?')
    .run(notifications_sound ? 1 : 0, req.user.id);
  
  const updated = db.prepare('SELECT id, name, email, role, notifications_sound FROM users WHERE id = ?').get(req.user.id);
  res.json(updated);
});

// Alterar senha
router.patch('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
  }

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;