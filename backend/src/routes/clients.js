const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', (req, res) => {
  const { search, status } = req.query;
  let query = 'SELECT * FROM clients WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  const contacts = db.prepare('SELECT * FROM contacts WHERE client_id = ?').all(req.params.id);
  const deals = db.prepare(`
    SELECT d.*, ps.name as stage_name, ps.color as stage_color
    FROM deals d LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.client_id = ? ORDER BY d.created_at DESC
  `).all(req.params.id);
  res.json({ ...client, contacts, deals });
});

router.post('/', (req, res) => {
  const { name, email, phone, company, address, city, state, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO clients (id, name, email, phone, company, address, city, state, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email, phone, company, address, city, state, notes, req.user.id);

  res.status(201).json(db.prepare('SELECT * FROM clients WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, email, phone, company, address, city, state, notes, status } = req.body;
  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });

  db.prepare(`
    UPDATE clients SET name=?, email=?, phone=?, company=?, address=?, city=?, state=?, notes=?, status=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(name, email, phone, company, address, city, state, notes, status, req.params.id);

  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
  res.json({ success: true });
});

module.exports = router;
