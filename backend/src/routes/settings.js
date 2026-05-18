const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db   = require('../database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs   = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.use(auth);

const adminOnly = (req, res, next) =>
  req.user.role !== 'admin' ? res.status(403).json({ error: 'Acesso negado' }) : next();

// ── CONFIGURAÇÕES GERAIS ──────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const s = db.prepare("SELECT * FROM settings WHERE id='default'").get();
  if (s) { delete s.gemini_api_key; } // nunca expor a chave completa aqui
  res.json(s || {});
});

router.put('/', auth, (req, res) => {
  const { company_name, logo_url, monthly_sales_goal } = req.body;
  db.prepare("UPDATE settings SET company_name=?,logo_url=?,monthly_sales_goal=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'")
    .run(company_name, logo_url, monthly_sales_goal);
  res.json({ success: true });
});

router.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ── USUÁRIOS & EQUIPE ─────────────────────────────────────────────────────────
router.get('/users', adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

router.post('/users', adminOnly, (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
  if (password.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
  const exists = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase().trim());
  if (exists) return res.status(409).json({ error: 'Email já cadastrado' });
  const id = uuidv4();
  db.prepare('INSERT INTO users (id,name,email,password,role) VALUES (?,?,?,?,?)')
    .run(id, name.trim(), email.toLowerCase().trim(), bcrypt.hashSync(password, 10), role || 'vendedor');
  res.json({ id, success: true });
});

router.put('/users/:id', adminOnly, (req, res) => {
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  db.prepare('UPDATE users SET name=?,role=? WHERE id=?').run(name.trim(), role, req.params.id);
  res.json({ success: true });
});

router.delete('/users/:id', adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Não pode excluir sua própria conta' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

router.post('/users/:id/reset-password', adminOnly, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Senha mínima de 6 caracteres' });
  db.prepare('UPDATE users SET password=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), req.params.id);
  res.json({ success: true });
});

// ── ETAPAS DO PIPELINE ────────────────────────────────────────────────────────
router.get('/pipeline', (req, res) => {
  const stages = db.prepare('SELECT ps.*, (SELECT COUNT(*) FROM deals d WHERE d.stage_id=ps.id AND d.status=\'open\') as deals_count FROM pipeline_stages ps ORDER BY ps.order_index ASC').all();
  res.json(stages);
});

router.post('/pipeline', adminOnly, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const max = db.prepare('SELECT COALESCE(MAX(order_index),0) as m FROM pipeline_stages').get().m;
  const id  = uuidv4();
  db.prepare('INSERT INTO pipeline_stages (id,name,order_index,color) VALUES (?,?,?,?)')
    .run(id, name.trim(), max + 1, color || '#6366f1');
  res.json({ id, success: true });
});

router.put('/pipeline/:id', adminOnly, (req, res) => {
  const { name, color, order_index } = req.body;
  db.prepare('UPDATE pipeline_stages SET name=?,color=?,order_index=? WHERE id=?')
    .run(name, color || '#6366f1', order_index, req.params.id);
  res.json({ success: true });
});

router.delete('/pipeline/:id', adminOnly, (req, res) => {
  const n = db.prepare("SELECT COUNT(*) as c FROM deals WHERE stage_id=? AND status='open'").get(req.params.id).c;
  if (n > 0) return res.status(400).json({ error: `Etapa tem ${n} negócio(s) aberto(s). Mova-os antes de excluir.` });
  db.prepare('DELETE FROM pipeline_stages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Reordenar: recebe array [{id, order_index}]
router.put('/pipeline-reorder', adminOnly, (req, res) => {
  const { stages } = req.body;
  if (!Array.isArray(stages)) return res.status(400).json({ error: 'stages array obrigatório' });
  for (const s of stages) {
    db.prepare('UPDATE pipeline_stages SET order_index=? WHERE id=?').run(s.order_index, s.id);
  }
  res.json({ success: true });
});

// ── SISTEMA & DIAGNÓSTICO ─────────────────────────────────────────────────────
router.get('/system', (req, res) => {
  const counts = {
    clientes:    db.prepare('SELECT COUNT(*) as c FROM clients').get().c,
    contatos:    db.prepare('SELECT COUNT(*) as c FROM contacts').get().c,
    negócios:    db.prepare('SELECT COUNT(*) as c FROM deals').get().c,
    atividades:  db.prepare('SELECT COUNT(*) as c FROM activities').get().c,
    usuários:    db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    campanhas:   db.prepare('SELECT COUNT(*) as c FROM campaigns').get().c,
    ig_leads:    db.prepare('SELECT COUNT(*) as c FROM instagram_leads').get().c,
    wpp_leads:   db.prepare('SELECT COUNT(*) as c FROM whatsapp_leads').get().c,
  };
  const dbPath = path.resolve(process.env.DB_PATH || './crm.db');
  let dbSize = 0;
  try { dbSize = fs.statSync(dbPath).size; } catch {}
  const geminiCfg = db.prepare("SELECT gemini_api_key FROM settings WHERE id='default'").get();
  const geminiOk  = !!(geminiCfg?.gemini_api_key || process.env.GEMINI_API_KEY);
  const wppCfg    = db.prepare("SELECT phone_number_id, access_token FROM whatsapp_config WHERE id='default'").get();
  const wppOk     = !!(wppCfg?.phone_number_id && wppCfg?.access_token);
  const igCfg     = db.prepare("SELECT page_id, access_token FROM instagram_config WHERE id='default'").get();
  const igOk      = !!(igCfg?.page_id && igCfg?.access_token);
  res.json({ counts, dbSize, version: '2.0.0', node: process.version, integrations: { gemini: geminiOk, whatsapp: wppOk, instagram: igOk } });
});

// ── EXPORTAR DADOS ────────────────────────────────────────────────────────────
router.get('/export', adminOnly, (req, res) => {
  const data = {
    exported_at: new Date().toISOString(),
    clients:     db.prepare('SELECT * FROM clients').all(),
    contacts:    db.prepare('SELECT * FROM contacts').all(),
    deals:       db.prepare('SELECT * FROM deals').all(),
    activities:  db.prepare('SELECT * FROM activities').all(),
    pipeline_stages: db.prepare('SELECT * FROM pipeline_stages').all(),
    campaigns:   db.prepare('SELECT * FROM campaigns').all(),
    ig_leads:    db.prepare('SELECT * FROM instagram_leads').all(),
    goals:       db.prepare('SELECT * FROM goals').all(),
  };
  const date = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Disposition', `attachment; filename="crm-export-${date}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 2));
});

// ── INTEGRAÇÕES (chaves de API) ────────────────────────────────────────────────
router.get('/integrations', (req, res) => {
  const s   = db.prepare("SELECT gemini_api_key FROM settings WHERE id='default'").get();
  const wpp = db.prepare("SELECT phone_number_id, access_token, verify_token FROM whatsapp_config WHERE id='default'").get();
  const ig  = db.prepare("SELECT page_id, instagram_account_id, access_token, verify_token, company_description, product_service, message_tone FROM instagram_config WHERE id='default'").get();
  const geminiKey = s?.gemini_api_key || process.env.GEMINI_API_KEY || '';
  res.json({
    gemini: { configured: !!geminiKey, key_preview: geminiKey ? `${geminiKey.slice(0,8)}...${geminiKey.slice(-4)}` : '' },
    whatsapp: wpp || {},
    instagram: ig || {},
  });
});

router.put('/integrations/gemini', adminOnly, (req, res) => {
  const { api_key } = req.body;
  db.prepare("UPDATE settings SET gemini_api_key=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'")
    .run(api_key?.trim() || null);
  res.json({ success: true });
});

router.put('/integrations/whatsapp', adminOnly, (req, res) => {
  const { phone_number_id, access_token, verify_token, auto_reply, auto_create_lead } = req.body;
  const ex = db.prepare("SELECT id FROM whatsapp_config WHERE id='default'").get();
  if (ex) {
    db.prepare("UPDATE whatsapp_config SET phone_number_id=?,access_token=?,verify_token=?,auto_reply=?,auto_create_lead=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'")
      .run(phone_number_id||null, access_token||null, verify_token||'candeias_webhook_token', auto_reply||null, auto_create_lead?1:0);
  } else {
    db.prepare("INSERT INTO whatsapp_config (id,phone_number_id,access_token,verify_token,auto_reply,auto_create_lead) VALUES ('default',?,?,?,?,?)")
      .run(phone_number_id||null, access_token||null, verify_token||'candeias_webhook_token', auto_reply||null, auto_create_lead?1:0);
  }
  res.json({ success: true });
});

router.put('/integrations/instagram', adminOnly, (req, res) => {
  const { page_id, instagram_account_id, access_token, verify_token, company_description, product_service, message_tone } = req.body;
  const ex = db.prepare("SELECT id FROM instagram_config WHERE id='default'").get();
  if (ex) {
    db.prepare("UPDATE instagram_config SET page_id=?,instagram_account_id=?,access_token=?,verify_token=?,company_description=?,product_service=?,message_tone=?,updated_at=CURRENT_TIMESTAMP WHERE id='default'")
      .run(page_id||null, instagram_account_id||null, access_token||null, verify_token||'ig_webhook_token', company_description||null, product_service||null, message_tone||'profissional e amigável');
  } else {
    db.prepare("INSERT INTO instagram_config (id,page_id,instagram_account_id,access_token,verify_token,company_description,product_service,message_tone) VALUES ('default',?,?,?,?,?,?,?)")
      .run(page_id||null, instagram_account_id||null, access_token||null, verify_token||'ig_webhook_token', company_description||null, product_service||null, message_tone||'profissional e amigável');
  }
  res.json({ success: true });
});

module.exports = router;
