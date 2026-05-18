const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { notifyNewLead } = require('./notifications');

const router = express.Router();

// ── WEBHOOK (público — chamado pelo WhatsApp) ────────────────────────────────

// Middleware para validar assinatura da Meta (Segurança)
const verifySignature = (req, res, next) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return next(); // Opcional em dev, obrigatório em prod

  const config = db.prepare("SELECT app_secret FROM whatsapp_config WHERE id='default'").get();
  if (!config?.app_secret) return next();

  const hash = 'sha256=' + crypto.createHmac('sha256', config.app_secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== hash) return res.status(401).send('Assinatura inválida');
  next();
};

// Verificação do webhook (Meta exige GET para confirmar URL)
router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  const config = db.prepare("SELECT * FROM whatsapp_config WHERE id='default'").get();

  if (mode === 'subscribe' && token === config?.verify_token) {
    console.log('WhatsApp webhook verificado com sucesso');
    return res.send(challenge);
  }
  res.status(403).json({ error: 'Token inválido' });
});

// Receber mensagens do WhatsApp
router.post('/webhook', verifySignature, (req, res) => {
  // Responde imediatamente com 200 OK para evitar retentativas da Meta
  res.sendStatus(200);

  try {
    const config = db.prepare("SELECT * FROM whatsapp_config WHERE id='default'").get();
    const body = req.body;

    if (body?.object === 'whatsapp_business_account' && body.entry) {
      body.entry.forEach(entry => {
        entry.changes?.forEach(change => {
          const value = change.value;
          if (!value?.messages) return;

          value.messages.forEach(msg => {
            const phone = msg.from.replace(/\D/g, '');
            const name = value.contacts?.[0]?.profile?.name || phone;
            
            let messageContent = '';
            let mediaId = null;

            if (msg.type === 'text') {
              messageContent = msg.text.body;
            } else if (msg.type === 'image') {
              mediaId = msg.image.id;
              messageContent = `📷 Imagem: ${msg.image.caption || '(sem legenda)'}`;
            } else if (msg.type === 'document') {
              mediaId = msg.document.id;
              messageContent = `📄 Documento: ${msg.document.filename || 'arquivo'} ${msg.document.caption ? `- ${msg.document.caption}` : ''}`;
            } else if (msg.type === 'video') {
              mediaId = msg.video.id;
              messageContent = `🎥 Vídeo: ${msg.video.caption || '(sem legenda)'}`;
            } else {
              messageContent = `[Mídia: ${msg.type}]`;
            }

            processIncomingMessage(req, phone, name, messageContent, config, mediaId).catch(console.error);
          });
        });
      });
    } 
    else if (body?.phone || body?.from) { // Suporte a APIs legadas/terceiros
      const phone = (body.phone || body.from || '').replace(/\D/g, '');
      const name = body.name || body.pushName || phone;
      const message = body.message || body.text?.message || body.body || '[mensagem]';
      processIncomingMessage(req, phone, name, message, config).catch(console.error);
    }
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

async function processIncomingMessage(req, phone, name, message, config, mediaId = null) {
  let finalMessage = message;
  const io = req.app.get('io');

  // Se houver mídia, tenta baixar e salvar localmente
  if (mediaId && config?.access_token) {
    try {
      const localPath = await downloadWhatsAppMedia(mediaId, config);
      // Adicionamos o caminho do arquivo local à mensagem para o frontend exibir
      finalMessage += `\n[FILE:${localPath}]`;
    } catch (err) {
      console.error(`[WhatsApp Media] Erro ao processar mídia ${mediaId}:`, err.message);
      finalMessage += `\n(Erro ao baixar arquivo)`;
    }
  }

  // 1. Salva a mensagem no histórico
  db.prepare(`INSERT INTO whatsapp_messages (id, phone, direction, message) VALUES (?, ?, 'in', ?)`)
    .run(uuidv4(), phone, finalMessage);

  // Notifica o frontend sobre a nova mensagem
  if (io) io.emit('new_whatsapp_message', { phone, message: finalMessage });

  // 2. Automação de Leads: Criação automática
  if (config?.auto_create_lead !== 0) {
    const existing = db.prepare('SELECT id FROM whatsapp_leads WHERE phone = ?').get(phone);
    if (!existing) {
      const leadId = uuidv4();
      db.prepare(`INSERT INTO whatsapp_leads (id, phone, name, first_message, status) VALUES (?, ?, ?, ?, 'new')`)
        .run(leadId, phone, name, message);
      console.log(`[WhatsApp Automation] Novo lead gerado: ${name} (${phone})`);
      
      // Automação Extra: Cria um Negócio (Deal) automaticamente na primeira etapa do pipeline
      const firstStage = db.prepare("SELECT id FROM pipeline_stages ORDER BY order_index ASC LIMIT 1").get();
      if (firstStage) {
        db.prepare(`INSERT INTO deals (id, title, stage_id, value, status, notes) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(uuidv4(), `Oportunidade: ${name}`, firstStage.id, 0, 'open', `Lead automático via WhatsApp: ${message}`);
      }

      // Gatilho para Notificação Push
      notifyNewLead('Novo Lead no NexusCRM', `Contato: ${name || phone}\nMensagem: ${message}`)
        .catch(console.error);

      if (io) io.emit('new_whatsapp_lead', { id: leadId, name, phone });
    } else {
      db.prepare(`UPDATE whatsapp_leads SET updated_at=CURRENT_TIMESTAMP WHERE phone=?`).run(phone);
    }
  }

  // 3. Automação de Resposta
  if (config?.auto_reply && config?.phone_number_id && config?.access_token) {
    sendWhatsAppMessage(phone, config.auto_reply, config).catch(err => 
      console.error(`Erro ao enviar auto-resposta para ${phone}:`, err.message)
    );
  }
}

async function downloadWhatsAppMedia(mediaId, config) {
  // 1. Solicita a URL de download para a Meta
  const metaResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${config.access_token}` }
  });

  if (!metaResponse.ok) throw new Error('Falha ao obter URL da mídia');
  const mediaData = await metaResponse.json(); // Contém 'url' e 'mime_type'

  // 2. Baixa o conteúdo binário
  const fileResponse = await fetch(mediaData.url, {
    headers: { 'Authorization': `Bearer ${config.access_token}` }
  });

  if (!fileResponse.ok) throw new Error('Falha ao baixar binário da mídia');
  const buffer = Buffer.from(await fileResponse.arrayBuffer());

  // 3. Garante que o diretório existe e salva o arquivo
  const extension = mediaData.mime_type.split('/')[1].split(';')[0];
  const fileName = `${mediaId}.${extension}`;
  const relativePath = `/uploads/whatsapp/${fileName}`;
  const absolutePath = path.join(__dirname, '../../uploads/whatsapp', fileName);

  // Cria a pasta se não existir
  const dir = path.dirname(absolutePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await fs.promises.writeFile(absolutePath, buffer);
  return relativePath;
}

async function sendWhatsAppMessage(to, content, config, type = 'text') {
  const payload = { messaging_product: 'whatsapp', to };

  if (type === 'text') {
    payload.type = 'text';
    payload.text = { body: content };
  } else if (type === 'image') {
    payload.type = 'image';
    payload.image = { link: content }; // content deve ser uma URL pública
  } else if (type === 'document') {
    payload.type = 'document';
    payload.document = { link: content, filename: 'documento.pdf' };
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Erro na API do WhatsApp');
  }
  return response.json();
}

// Simulador — envia mensagem de teste para o webhook
router.post('/webhook/simulate', auth, (req, res) => {
  const { phone, name, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone e message obrigatórios' });

  const cleanPhone = phone.replace(/\D/g, '');
  db.prepare(`INSERT INTO whatsapp_messages (id, phone, direction, message) VALUES (?, ?, 'in', ?)`)
    .run(uuidv4(), cleanPhone, message);

  const existing = db.prepare('SELECT id FROM whatsapp_leads WHERE phone = ?').get(cleanPhone);
  if (!existing) {
    db.prepare(`INSERT INTO whatsapp_leads (id, phone, name, first_message, status) VALUES (?, ?, ?, ?, 'new')`)
      .run(uuidv4(), cleanPhone, name || cleanPhone, message);
  }

  res.json({ success: true, message: 'Mensagem simulada recebida' });
});

// ── ROTAS AUTENTICADAS ───────────────────────────────────────────────────────
router.use(auth);

// Leads
router.get('/leads', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT wl.*, cl.name as client_name,
      (SELECT COUNT(*) FROM whatsapp_messages WHERE phone = wl.phone) as msg_count,
      (SELECT message FROM whatsapp_messages WHERE phone = wl.phone ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM whatsapp_messages WHERE phone = wl.phone ORDER BY created_at DESC LIMIT 1) as last_at
    FROM whatsapp_leads wl
    LEFT JOIN clients cl ON wl.client_id = cl.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND wl.status = ?'; params.push(status); }
  query += ' ORDER BY wl.updated_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.patch('/leads/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE whatsapp_leads SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

router.patch('/leads/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM whatsapp_leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

  const clientId = uuidv4();
  
  db.prepare('INSERT INTO clients (id,name,phone,notes,created_by) VALUES (?,?,?,?,?)')
    .run(clientId, lead.name || lead.phone, lead.phone, `Convertido de Lead WhatsApp. 1ª msg: "${lead.first_message}"`, req.user.id);
  db.prepare('UPDATE whatsapp_leads SET status=?,client_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run('converted', clientId, req.params.id);

  res.json({ success: true, client_id: clientId });
});

router.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM whatsapp_leads WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Mensagens de uma conversa
router.get('/messages/:phone', (req, res) => {
  const msgs = db.prepare('SELECT * FROM whatsapp_messages WHERE phone=? ORDER BY created_at ASC')
    .all(req.params.phone.replace(/\D/g, ''));
  res.json(msgs);
});

// Enviar mensagem (requer config da API Meta)
router.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  const config = db.prepare("SELECT * FROM whatsapp_config WHERE id='default'").get();

  if (!config?.phone_number_id || !config?.access_token) {
    return res.status(503).json({ error: 'Configure o Phone Number ID e Access Token nas configurações' });
  }

  try {
    await sendWhatsAppMessage(phone.replace(/\D/g, ''), message, config);
    db.prepare(`INSERT INTO whatsapp_messages (id, phone, direction, message) VALUES (?, ?, 'out', ?)`)
      .run(uuidv4(), phone.replace(/\D/g, ''), message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem: ' + err.message });
  }
});

// Config
router.get('/config', (req, res) => {
  const config = db.prepare("SELECT * FROM whatsapp_config WHERE id='default'").get();
  res.json(config || {});
});

router.put('/config', (req, res) => {
  const { verify_token, phone_number_id, access_token, auto_reply, auto_create_lead } = req.body;
  db.prepare(`
    UPDATE whatsapp_config SET verify_token=?, phone_number_id=?, access_token=?, auto_reply=?, auto_create_lead=?, updated_at=CURRENT_TIMESTAMP
    WHERE id='default'
  `).run(verify_token, phone_number_id, access_token, auto_reply, auto_create_lead ? 1 : 0);
  res.json({ success: true });
});

// Stats
router.get('/stats', (req, res) => {
  const { start, end } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (start) { where += ' AND date(created_at) >= date(?)'; params.push(start); }
  if (end) { where += ' AND date(created_at) <= date(?)'; params.push(end); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM whatsapp_leads ${where}`).get(...params).c;
  const novo = db.prepare(`SELECT COUNT(*) as c FROM whatsapp_leads ${where} AND status='new'`).get(...params).c;
  const converted = db.prepare(`SELECT COUNT(*) as c FROM whatsapp_leads ${where} AND status='converted'`).get(...params).c;
  const messages = db.prepare(`SELECT COUNT(*) as c FROM whatsapp_messages ${where}`).get(...params).c;

  res.json({ total, novo, converted, messages });
});

// Evolução de leads nos últimos 7 dias
router.get('/leads/evolution', (req, res) => {
  const { start, end } = req.query;
  let query = `
    SELECT strftime('%d/%m', created_at) as name, COUNT(*) as count
    FROM whatsapp_leads
    WHERE 1=1
  `;
  const params = [];

  if (start) {
    query += ' AND date(created_at) >= date(?)';
    params.push(start);
  } else {
    query += " AND created_at >= date('now', '-7 days')";
  }

  if (end) {
    query += ' AND date(created_at) <= date(?)';
    params.push(end);
  }

  query += ' GROUP BY name ORDER BY created_at ASC';
  res.json(db.prepare(query).all(...params));
});

module.exports = router;
