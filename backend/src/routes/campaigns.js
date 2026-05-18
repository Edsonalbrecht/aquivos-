const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// ── LISTAR campanhas com stats ────────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM campaign_clients cc WHERE cc.campaign_id = c.id) as total_clientes,
        (SELECT COUNT(*) FROM campaign_clients cc WHERE cc.campaign_id = c.id AND cc.status IN ('sent','responded','converted')) as enviados,
        (SELECT COUNT(*) FROM campaign_clients cc WHERE cc.campaign_id = c.id AND cc.status IN ('responded','converted')) as responderam,
        (SELECT COUNT(*) FROM campaign_clients cc WHERE cc.campaign_id = c.id AND cc.status = 'converted') as convertidos
      FROM campaigns c
      ORDER BY c.created_at DESC
    `).all();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CRIAR campanha ────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, description, type, status, start_date, end_date, goal_leads, goal_revenue, budget, message_template } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const id = uuidv4();
  db.prepare(`
    INSERT INTO campaigns (id, name, description, type, status, start_date, end_date, goal_leads, goal_revenue, budget, message_template, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || null, type || 'generic', status || 'draft',
    start_date || null, end_date || null,
    goal_leads || 0, goal_revenue || 0, budget || 0,
    message_template || null, req.user.id);
  res.json({ id, success: true });
});

// ── DETALHE de campanha (com clientes e stats) ─────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    const clients = db.prepare(`
      SELECT cc.id as cc_id, cc.client_id, cc.status, cc.sent_at, cc.responded_at, cc.notes,
             cl.name, cl.phone, cl.email, cl.company
      FROM campaign_clients cc
      JOIN clients cl ON cc.client_id = cl.id
      WHERE cc.campaign_id = ?
      ORDER BY cc.created_at ASC
    `).all(req.params.id);

    const revenueRow = db.prepare(`
      SELECT COALESCE(SUM(d.value), 0) as v
      FROM deals d
      JOIN campaign_clients cc ON cc.client_id = d.client_id
      WHERE cc.campaign_id = ? AND d.status = 'won'
    `).get(req.params.id);
    const revenue = revenueRow.v;

    const leadsRow = db.prepare(`
      SELECT COUNT(DISTINCT d.id) as c
      FROM deals d
      JOIN campaign_clients cc ON cc.client_id = d.client_id
      WHERE cc.campaign_id = ?
    `).get(req.params.id);

    const stats = {
      total_clientes: clients.length,
      pendentes:  clients.filter(c => c.status === 'pending').length,
      enviados:   clients.filter(c => ['sent','responded','converted'].includes(c.status)).length,
      responderam: clients.filter(c => ['responded','converted'].includes(c.status)).length,
      convertidos: clients.filter(c => c.status === 'converted').length,
      revenue,
      leads_gerados: leadsRow.c,
      taxa_resposta: clients.length > 0
        ? ((clients.filter(c => ['responded','converted'].includes(c.status)).length / clients.length) * 100).toFixed(1)
        : 0,
      taxa_conversao: clients.length > 0
        ? ((clients.filter(c => c.status === 'converted').length / clients.length) * 100).toFixed(1)
        : 0,
      roi: campaign.budget > 0 ? (((revenue - campaign.budget) / campaign.budget) * 100).toFixed(1) : null,
    };

    res.json({ ...campaign, clients, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ATUALIZAR campanha ────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { name, description, type, status, start_date, end_date, goal_leads, goal_revenue, budget, message_template } = req.body;
  db.prepare(`
    UPDATE campaigns SET name=?, description=?, type=?, status=?, start_date=?, end_date=?,
    goal_leads=?, goal_revenue=?, budget=?, message_template=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(name, description || null, type, status, start_date || null, end_date || null,
    goal_leads || 0, goal_revenue || 0, budget || 0, message_template || null, req.params.id);
  res.json({ success: true });
});

// ── EXCLUIR campanha ──────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM campaign_clients WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── ADICIONAR clientes à campanha ─────────────────────────────────────────────
router.post('/:id/clients', (req, res) => {
  const { client_ids } = req.body;
  if (!Array.isArray(client_ids) || client_ids.length === 0)
    return res.status(400).json({ error: 'client_ids obrigatório' });

  let added = 0;
  for (const clientId of client_ids) {
    const exists = db.prepare('SELECT id FROM campaign_clients WHERE campaign_id=? AND client_id=?')
      .get(req.params.id, clientId);
    if (!exists) {
      db.prepare('INSERT INTO campaign_clients (id, campaign_id, client_id) VALUES (?, ?, ?)')
        .run(uuidv4(), req.params.id, clientId);
      added++;
    }
  }
  res.json({ success: true, added });
});

// ── REMOVER cliente da campanha ────────────────────────────────────────────────
router.delete('/:id/clients/:clientId', (req, res) => {
  db.prepare('DELETE FROM campaign_clients WHERE campaign_id=? AND client_id=?')
    .run(req.params.id, req.params.clientId);
  res.json({ success: true });
});

// ── ATUALIZAR status do cliente na campanha ────────────────────────────────────
router.patch('/:id/clients/:clientId/status', (req, res) => {
  const { status, notes } = req.body;
  const validStatus = ['pending', 'sent', 'responded', 'converted'];
  if (!validStatus.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  let sql = 'UPDATE campaign_clients SET status=?';
  const params = [status];
  if (status === 'sent')      { sql += ', sent_at=CURRENT_TIMESTAMP'; }
  if (status === 'responded') { sql += ', responded_at=CURRENT_TIMESTAMP'; }
  if (notes !== undefined)    { sql += ', notes=?'; params.push(notes); }
  sql += ' WHERE campaign_id=? AND client_id=?';
  params.push(req.params.id, req.params.clientId);

  db.prepare(sql).run(...params);
  res.json({ success: true });
});

// ── ENVIAR WhatsApp em massa ───────────────────────────────────────────────────
router.post('/:id/send-whatsapp', async (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign?.message_template)
      return res.status(400).json({ error: 'Campanha sem template de mensagem' });

    const config = db.prepare("SELECT * FROM whatsapp_config WHERE id='default'").get();
    if (!config?.phone_number_id || !config?.access_token)
      return res.status(503).json({ error: 'Configure o WhatsApp nas configurações antes de enviar' });

    const pending = db.prepare(`
      SELECT cc.client_id, cl.phone, cl.name
      FROM campaign_clients cc
      JOIN clients cl ON cc.client_id = cl.id
      WHERE cc.campaign_id = ? AND cc.status = 'pending'
        AND cl.phone IS NOT NULL AND trim(cl.phone) != ''
    `).all(req.params.id);

    if (pending.length === 0)
      return res.json({ success: true, sent: 0, failed: 0, errors: [], total: 0, message: 'Nenhum cliente pendente com telefone' });

    let sent = 0, failed = 0;
    const errors = [];

    for (const client of pending) {
      const phone = client.phone.replace(/\D/g, '');
      if (!phone) { failed++; continue; }

      const message = campaign.message_template.replace(/\{nome\}/gi, client.name || 'Cliente');

      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }),
        });

        if (response.ok) {
          db.prepare("UPDATE campaign_clients SET status='sent', sent_at=CURRENT_TIMESTAMP WHERE campaign_id=? AND client_id=?")
            .run(req.params.id, client.client_id);
          db.prepare("INSERT INTO whatsapp_messages (id, phone, direction, message) VALUES (?, ?, 'out', ?)")
            .run(uuidv4(), phone, message);
          sent++;
        } else {
          const errData = await response.json();
          errors.push({ cliente: client.name, erro: errData.error?.message || 'Erro desconhecido' });
          failed++;
        }
      } catch (err) {
        errors.push({ cliente: client.name, erro: err.message });
        failed++;
      }

      await new Promise(r => setTimeout(r, 200));
    }

    if (campaign.status === 'draft' && sent > 0)
      db.prepare("UPDATE campaigns SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(req.params.id);

    res.json({ success: true, sent, failed, errors, total: pending.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
