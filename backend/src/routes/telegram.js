const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db   = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── helpers ───────────────────────────────────────────────────────────────────
function getCfg() {
  return db.prepare("SELECT * FROM telegram_config WHERE id='default'").get();
}

async function tgCall(token, method, body = {}) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sendMsg(chat_id, text) {
  const cfg = getCfg();
  if (!cfg?.bot_token) throw new Error('Bot token não configurado');
  return tgCall(cfg.bot_token, 'sendMessage', { chat_id, text, parse_mode: 'HTML' });
}

// ── WEBHOOK PÚBLICO ───────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  res.sendStatus(200); // responde imediatamente
  try {
    const cfg     = getCfg();
    const update  = req.body;
    const message = update.message || update.edited_message;
    if (!message) return;

    const from    = message.from || {};
    const chat_id = String(message.chat?.id || from.id);
    const tg_id   = String(from.id);
    const text    = message.text || '[mídia]';
    const msgId   = String(message.message_id);

    // Salva mensagem
    db.prepare("INSERT INTO telegram_messages (id,telegram_id,chat_id,direction,message) VALUES (?,?,?,'in',?)")
      .run(uuidv4(), tg_id, chat_id, text);

    // Verifica se já é lead
    let lead = db.prepare('SELECT * FROM telegram_leads WHERE telegram_id=?').get(tg_id);

    if (!lead && cfg?.auto_create_lead) {
      const id = uuidv4();
      db.prepare(`INSERT INTO telegram_leads (id,telegram_id,username,first_name,last_name,chat_id,first_message)
        VALUES (?,?,?,?,?,?,?)`)
        .run(id, tg_id,
          from.username || null,
          from.first_name || null,
          from.last_name  || null,
          chat_id, text);
      lead = db.prepare('SELECT * FROM telegram_leads WHERE id=?').get(id);
    } else if (lead && lead.status === 'new') {
      db.prepare("UPDATE telegram_leads SET status='contacted', updated_at=CURRENT_TIMESTAMP WHERE telegram_id=?").run(tg_id);
    }

    // Resposta automática apenas na primeira mensagem
    if (cfg?.welcome_message && lead && lead.first_message === text) {
      await sendMsg(chat_id, cfg.welcome_message).catch(() => {});
    }
  } catch (err) {
    console.error('[Telegram webhook]', err.message);
  }
});

router.use(auth);

const adminOnly = (req, res, next) =>
  req.user.role !== 'admin' ? res.status(403).json({ error: 'Acesso negado' }) : next();

// ── CONFIG ────────────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  const cfg = getCfg() || {};
  // nunca expor token completo — envia preview
  const token = cfg.bot_token || '';
  res.json({
    ...cfg,
    bot_token: undefined,
    token_preview: token ? `${token.slice(0, 10)}...${token.slice(-6)}` : '',
    token_configured: !!token,
  });
});

router.put('/config', adminOnly, (req, res) => {
  const { bot_token, notification_chat_id, auto_create_lead, welcome_message, notifications_enabled } = req.body;
  const ex = db.prepare("SELECT id FROM telegram_config WHERE id='default'").get();
  if (ex) {
    // Só atualiza bot_token se foi fornecido (não vazio)
    const fields = [];
    const params = [];
    if (bot_token && bot_token.trim() && !bot_token.includes('...')) {
      fields.push('bot_token=?'); params.push(bot_token.trim());
    }
    fields.push('notification_chat_id=?'); params.push(notification_chat_id || null);
    fields.push('auto_create_lead=?');    params.push(auto_create_lead ? 1 : 0);
    fields.push('welcome_message=?');     params.push(welcome_message || null);
    fields.push('notifications_enabled=?'); params.push(notifications_enabled ? 1 : 0);
    fields.push('updated_at=CURRENT_TIMESTAMP');
    params.push('default');
    db.prepare(`UPDATE telegram_config SET ${fields.join(',')} WHERE id=?`).run(...params);
  } else {
    db.prepare(`INSERT INTO telegram_config (id,bot_token,notification_chat_id,auto_create_lead,welcome_message,notifications_enabled)
      VALUES ('default',?,?,?,?,?)`)
      .run(bot_token?.trim() || null, notification_chat_id || null, auto_create_lead ? 1 : 0, welcome_message || null, notifications_enabled ? 1 : 0);
  }
  res.json({ success: true });
});

// ── TESTAR CONEXÃO ────────────────────────────────────────────────────────────
router.post('/test-connection', adminOnly, async (req, res) => {
  const { bot_token } = req.body;
  const token = (bot_token && !bot_token.includes('...')) ? bot_token.trim() : getCfg()?.bot_token;
  if (!token) return res.status(400).json({ error: 'Token não configurado' });
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await r.json();
    if (!data.ok) return res.status(400).json({ error: data.description || 'Token inválido' });
    // Salva o username do bot se ainda não tiver
    db.prepare("UPDATE telegram_config SET bot_username=? WHERE id='default'").run('@' + data.result.username);
    res.json({ success: true, bot: data.result });
  } catch (err) {
    res.status(500).json({ error: 'Erro de conexão: ' + err.message });
  }
});

// ── REGISTRAR WEBHOOK ─────────────────────────────────────────────────────────
router.post('/set-webhook', adminOnly, async (req, res) => {
  const { webhook_url } = req.body;
  const token = getCfg()?.bot_token;
  if (!token) return res.status(400).json({ error: 'Configure o bot token primeiro' });
  if (!webhook_url) return res.status(400).json({ error: 'URL do webhook obrigatória' });

  const url = webhook_url.replace(/\/$/, '') + '/api/telegram/webhook';
  try {
    const r = await tgCall(token, 'setWebhook', { url, drop_pending_updates: true });
    if (!r.ok) return res.status(400).json({ error: r.description || 'Erro ao registrar webhook' });
    res.json({ success: true, url, message: r.description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REMOVER WEBHOOK ────────────────────────────────────────────────────────────
router.post('/delete-webhook', adminOnly, async (req, res) => {
  const token = getCfg()?.bot_token;
  if (!token) return res.status(400).json({ error: 'Token não configurado' });
  try {
    const r = await tgCall(token, 'deleteWebhook', { drop_pending_updates: true });
    res.json({ success: r.ok, message: r.description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ENVIAR MENSAGEM ───────────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  const { chat_id, message } = req.body;
  if (!chat_id || !message) return res.status(400).json({ error: 'chat_id e message obrigatórios' });
  try {
    await sendMsg(chat_id, message);
    db.prepare("INSERT INTO telegram_messages (id,chat_id,direction,message) VALUES (?,?,?,'out',?)")
      .run(uuidv4(), String(chat_id), String(chat_id), message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NOTIFICAÇÃO CRM (usado internamente por outros módulos) ───────────────────
router.post('/notify', async (req, res) => {
  const cfg = getCfg();
  if (!cfg?.notifications_enabled || !cfg?.notification_chat_id || !cfg?.bot_token)
    return res.json({ skipped: true });
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message obrigatório' });
  try {
    await sendMsg(cfg.notification_chat_id, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LEADS DO TELEGRAM ─────────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const leads = db.prepare(`
    SELECT tl.*,
      (SELECT COUNT(*) FROM telegram_messages WHERE telegram_id = tl.telegram_id) as msg_count,
      (SELECT message FROM telegram_messages WHERE telegram_id = tl.telegram_id ORDER BY created_at DESC LIMIT 1) as last_msg
    FROM telegram_leads tl
    ORDER BY tl.created_at DESC
  `).all();
  res.json(leads);
});

router.patch('/leads/:id/status', (req, res) => {
  db.prepare('UPDATE telegram_leads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

router.post('/leads/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM telegram_leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  const clientId = uuidv4();
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.username || `tg_${lead.telegram_id}`;
  db.prepare('INSERT INTO clients (id,name,notes,created_by) VALUES (?,?,?,?)')
    .run(clientId, name, `Telegram ${lead.username ? '@'+lead.username : lead.telegram_id}. Msg: "${lead.first_message||''}"`, req.user.id);
  db.prepare("UPDATE telegram_leads SET status='converted',client_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(clientId, lead.id);
  res.json({ success: true, client_id: clientId });
});

router.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM telegram_leads WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── MENSAGENS DE UMA CONVERSA ─────────────────────────────────────────────────
router.get('/messages/:telegram_id', (req, res) => {
  const msgs = db.prepare('SELECT * FROM telegram_messages WHERE telegram_id=? OR chat_id=? ORDER BY created_at ASC')
    .all(req.params.telegram_id, req.params.telegram_id);
  res.json(msgs);
});

// ── STATUS ────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const cfg       = getCfg() || {};
  const total     = db.prepare('SELECT COUNT(*) as c FROM telegram_leads').get().c;
  const byStatus  = db.prepare('SELECT status, COUNT(*) as c FROM telegram_leads GROUP BY status').all();
  const messages  = db.prepare('SELECT COUNT(*) as c FROM telegram_messages').get().c;
  res.json({ total, byStatus, messages, configured: !!cfg.bot_token, bot_username: cfg.bot_username });
});

// Exporta sendMsg para uso em outros módulos (notificações de deals, atividades etc.)
module.exports = router;
module.exports.sendTelegramNotification = async (message) => {
  const cfg = getCfg();
  if (cfg?.notifications_enabled && cfg?.notification_chat_id && cfg?.bot_token) {
    await sendMsg(cfg.notification_chat_id, message).catch(e => console.error('[TG notify]', e.message));
  }
};
