const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/contacts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `contact-${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

router.use(auth);

router.delete('/all', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem fazer isso' });
  const result = db.prepare('DELETE FROM contacts').run();
  res.json({ deleted: result.changes });
});

router.get('/', (req, res) => {
  const { client_id, search } = req.query;
  let query = 'SELECT c.*, cl.name as client_name FROM contacts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE 1=1';
  const params = [];

  if (client_id) { query += ' AND c.client_id = ?'; params.push(client_id); }
  if (search) {
    query += ' AND (c.name LIKE ? OR c.email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY c.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// Upload de Foto
router.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  const photoPath = `/uploads/contacts/${req.file.filename}`;
  res.json({ url: photoPath });
});

router.post('/', (req, res) => {
  const { client_id, name, email, phone, role, notes, photo_path } = req.body;
  if (!client_id || !name) return res.status(400).json({ error: 'client_id e nome obrigatórios' });

  const id = uuidv4();
  db.prepare('INSERT INTO contacts (id, client_id, name, email, phone, role, photo_path, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, client_id, name, email, phone, role, photo_path, notes);

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const { name, email, phone, role, notes, photo_path } = req.body;

  // Remover a foto antiga do servidor se uma nova for enviada ou se a atual for removida
  const existing = db.prepare('SELECT photo_path FROM contacts WHERE id = ?').get(req.params.id);
  if (existing && existing.photo_path && existing.photo_path !== photo_path) {
    const oldPath = path.join(__dirname, '../../', existing.photo_path);
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (err) { console.error('Erro ao remover foto antiga:', err); }
    }
  }

  db.prepare('UPDATE contacts SET name=?, email=?, phone=?, role=?, notes=?, photo_path=? WHERE id=?')
    .run(name, email, phone, role, notes, photo_path, req.params.id);
  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  // 1. Buscamos o contato para verificar se ele possui uma foto vinculada
  const contact = db.prepare('SELECT photo_path FROM contacts WHERE id = ?').get(req.params.id);
  
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  // 2. Se houver um caminho de foto, tentamos remover o arquivo físico do servidor
  if (contact.photo_path) {
    const absolutePath = path.join(__dirname, '../../', contact.photo_path);
    if (fs.existsSync(absolutePath)) {
      try { fs.unlinkSync(absolutePath); } catch (err) { console.error('Erro ao remover arquivo físico:', err); }
    }
  }

  // 3. Removemos o registro do banco de dados
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
