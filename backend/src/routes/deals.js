const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');
const { sendWelcomeEmail } = require('../emailService');

const router = express.Router();
router.use(auth);

router.get('/stages', (req, res) => {
  res.json(db.prepare('SELECT * FROM pipeline_stages ORDER BY order_index').all());
});

router.get('/', (req, res) => {
  const { stage_id, client_id, status, search } = req.query;
  let query = `
    SELECT d.*, ps.name as stage_name, ps.color as stage_color,
           cl.name as client_name, u.name as assigned_name
    FROM deals d
    LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
    LEFT JOIN clients cl ON d.client_id = cl.id
    LEFT JOIN users u ON d.assigned_to = u.id
    WHERE 1=1
  `;
  const params = [];

  if (stage_id) { query += ' AND d.stage_id = ?'; params.push(stage_id); }
  if (client_id) { query += ' AND d.client_id = ?'; params.push(client_id); }
  if (status) { query += ' AND d.status = ?'; params.push(status); }
  if (search) { query += ' AND d.title LIKE ?'; params.push(`%${search}%`); }
  query += ' ORDER BY d.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { title, client_id, contact_id, stage_id, value, expected_close, notes, assigned_to } = req.body;
  if (!title || !stage_id) return res.status(400).json({ error: 'Título e stage obrigatórios' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO deals (id, title, client_id, contact_id, stage_id, value, expected_close, notes, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, client_id, contact_id, stage_id, value || 0, expected_close, notes, assigned_to, req.user.id);

  const newDeal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
  const io = req.app.get('io');
  if (io) io.emit('pipeline_update', { action: 'create', deal: newDeal });

  res.status(201).json(newDeal);
});

router.put('/:id', (req, res) => {
  const { title, client_id, contact_id, stage_id, value, expected_close, notes, status, assigned_to } = req.body;

  // 1. Busca o estado atual do negócio antes de atualizar
  const oldDeal = db.prepare('SELECT status FROM deals WHERE id = ?').get(req.params.id);

  db.prepare(`
    UPDATE deals SET title=?, client_id=?, contact_id=?, stage_id=?, value=?, expected_close=?, notes=?, status=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(title, client_id, contact_id, stage_id, value, expected_close, notes, status, assigned_to, req.params.id);

  const updatedDeal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);

  // 2. Verifica se o status mudou para 'won' (Ganho)
  if (status === 'won' && oldDeal?.status !== 'won') {
    const client = db.prepare('SELECT name, email FROM clients WHERE id = ?').get(client_id);
    
    if (client?.email) {
      sendWelcomeEmail(client.email, client.name, title)
        .then(() => {
          const io = req.app.get('io');
          if (io) {
            // Dispara notificação em tempo real para o vendedor
            io.emit('system_notification', {
              userId: assigned_to || req.user.id,
              title: 'Boas-vindas Enviado',
              message: `O e-mail para ${client.name} foi entregue com sucesso!`,
              type: 'success'
            });
          }
        })
        .catch(err => {
          console.error(`[Email Service] Erro ao enviar boas-vindas para ${client.email}:`, err.message);
          const io = req.app.get('io');
          if (io) {
            io.emit('system_notification', {
              userId: req.user.id,
              title: 'Falha no E-mail',
              message: `Não foi possível enviar o e-mail para ${client.name}. Verifique as configurações SMTP.`,
              type: 'error'
            });
          }
        });
    }
  }

  const io = req.app.get('io');
  if (io) io.emit('pipeline_update', { action: 'update', deal: updatedDeal });

  res.json(updatedDeal);
});

router.patch('/:id/stage', (req, res) => {
  const { stage_id } = req.body;
  db.prepare('UPDATE deals SET stage_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(stage_id, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Negócio não encontrado' });
  res.json({ success: true });
});

module.exports = router;
