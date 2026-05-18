const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const { client_id, deal_id, completed, assigned_to } = req.query;
  let query = `
    SELECT a.*, cl.name as client_name, d.title as deal_title, u.name as assigned_name
    FROM activities a
    LEFT JOIN clients cl ON a.client_id = cl.id
    LEFT JOIN deals d ON a.deal_id = d.id
    LEFT JOIN users u ON a.assigned_to = u.id
    WHERE 1=1
  `;
  const params = [];

  if (client_id) { query += ' AND a.client_id = ?'; params.push(client_id); }
  if (deal_id) { query += ' AND a.deal_id = ?'; params.push(deal_id); }
  if (completed !== undefined) { query += ' AND a.completed = ?'; params.push(completed === 'true' ? 1 : 0); }
  if (assigned_to) { query += ' AND a.assigned_to = ?'; params.push(assigned_to); }
  query += ' ORDER BY a.due_date ASC, a.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { type, title, description, client_id, deal_id, contact_id, due_date, assigned_to } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'Título e tipo obrigatórios' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO activities (id, type, title, description, client_id, deal_id, contact_id, due_date, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, type, title, description, client_id, deal_id, contact_id, due_date, assigned_to, req.user.id);

  res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
});

router.patch('/:id/complete', (req, res) => {
  db.prepare('UPDATE activities SET completed = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { type, title, description, client_id, deal_id, contact_id, due_date, assigned_to, completed } = req.body;
  db.prepare(`
    UPDATE activities SET type=?, title=?, description=?, client_id=?, deal_id=?, contact_id=?, due_date=?, assigned_to=?, completed=?
    WHERE id=?
  `).run(type, title, description, client_id, deal_id, contact_id, due_date, assigned_to, completed ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Atividade não encontrada' });
  res.json({ success: true });
});

module.exports = router;
