const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// ── WEBHOOK PÚBLICO ───────────────────────────────────────────────────────────
router.get('/webhook', (req, res) => {
  const cfg = db.prepare("SELECT * FROM instagram_config WHERE id='default'").get();
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === (cfg?.verify_token || 'ig_webhook_token'))
    return res.send(challenge);
  res.status(403).send('Token inválido');
});

router.post('/webhook', (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (body.object !== 'instagram') return;
    body.entry?.forEach(entry => {
      entry.messaging?.forEach(msg => {
        if (!msg.message || !msg.sender?.id) return;
        const igsid = msg.sender.id;
        const text  = msg.message.text || '[mídia]';

        db.prepare("INSERT INTO instagram_messages (id, instagram_user_id, direction, message) VALUES (?,?,'in',?)")
          .run(uuidv4(), igsid, text);

        // vincula ao lead e atualiza status
        const lead = db.prepare("SELECT * FROM instagram_leads WHERE instagram_user_id = ?").get(igsid);
        if (lead && lead.status === 'contacted') {
          db.prepare("UPDATE instagram_leads SET status='replied', replied_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?")
            .run(lead.id);
        }
      });
    });
  } catch (err) { console.error('[Instagram webhook]', err.message); }
});

router.use(auth);

// ── CONFIG ────────────────────────────────────────────────────────────────────
router.get('/config', (req, res) => {
  const cfg = db.prepare("SELECT * FROM instagram_config WHERE id='default'").get();
  res.json(cfg || {});
});

router.put('/config', (req, res) => {
  const { page_id, instagram_account_id, access_token, verify_token,
          company_description, product_service, message_tone } = req.body;
  const exists = db.prepare("SELECT id FROM instagram_config WHERE id='default'").get();
  if (exists) {
    db.prepare(`UPDATE instagram_config SET page_id=?,instagram_account_id=?,access_token=?,
      verify_token=?,company_description=?,product_service=?,message_tone=?,updated_at=CURRENT_TIMESTAMP
      WHERE id='default'`).run(page_id||null, instagram_account_id||null, access_token||null,
      verify_token||'ig_webhook_token', company_description||null, product_service||null,
      message_tone||'profissional e amigável');
  } else {
    db.prepare(`INSERT INTO instagram_config (id,page_id,instagram_account_id,access_token,verify_token,
      company_description,product_service,message_tone) VALUES ('default',?,?,?,?,?,?,?)`)
      .run(page_id||null, instagram_account_id||null, access_token||null,
      verify_token||'ig_webhook_token', company_description||null, product_service||null,
      message_tone||'profissional e amigável');
  }
  res.json({ success: true });
});

// ── LEADS ─────────────────────────────────────────────────────────────────────
router.get('/leads', (req, res) => {
  const { status, niche, search } = req.query;
  let sql = 'SELECT * FROM instagram_leads WHERE 1=1';
  const params = [];
  if (status && status !== 'all') { sql += ' AND status=?'; params.push(status); }
  if (niche)  { sql += ' AND niche=?'; params.push(niche); }
  if (search) {
    sql += ' AND (username LIKE ? OR full_name LIKE ? OR bio LIKE ? OR niche LIKE ?)';
    params.push(...Array(4).fill(`%${search}%`));
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/leads', (req, res) => {
  const { username, full_name, bio, niche, followers, website, profile_url, notes, campaign_id } = req.body;
  if (!username) return res.status(400).json({ error: 'Username obrigatório' });
  const clean = username.replace('@', '').trim().toLowerCase();
  const exists = db.prepare('SELECT id FROM instagram_leads WHERE username=?').get(clean);
  if (exists) return res.status(409).json({ error: `@${clean} já cadastrado` });
  const id = uuidv4();
  db.prepare(`INSERT INTO instagram_leads (id,username,full_name,bio,niche,followers,website,profile_url,notes,campaign_id,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, clean, full_name||null, bio||null, niche||null, Number(followers)||0, website||null, profile_url||null, notes||null, campaign_id||null, req.user.id);
  res.json({ id, success: true });
});

// Importação em massa
router.post('/leads/bulk-import', (req, res) => {
  const { usernames, niche, campaign_id } = req.body;
  if (!Array.isArray(usernames) || !usernames.length)
    return res.status(400).json({ error: 'Lista de usernames obrigatória' });
  let created = 0, skipped = 0;
  for (const raw of usernames) {
    const u = raw.replace('@','').trim().toLowerCase();
    if (!u) continue;
    const ex = db.prepare('SELECT id FROM instagram_leads WHERE username=?').get(u);
    if (ex) { skipped++; continue; }
    db.prepare('INSERT INTO instagram_leads (id,username,niche,campaign_id,created_by) VALUES (?,?,?,?,?)')
      .run(uuidv4(), u, niche||null, campaign_id||null, req.user.id);
    created++;
  }
  res.json({ success: true, created, skipped });
});

router.get('/leads/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  const messages = db.prepare('SELECT * FROM instagram_messages WHERE lead_id=? OR instagram_user_id=? ORDER BY created_at ASC')
    .all(req.params.id, lead.instagram_user_id || '__none__');
  res.json({ ...lead, messages });
});

router.put('/leads/:id', (req, res) => {
  const { username, full_name, bio, niche, followers, website, profile_url, status, notes, ai_message, campaign_id } = req.body;
  db.prepare(`UPDATE instagram_leads SET username=?,full_name=?,bio=?,niche=?,followers=?,website=?,
    profile_url=?,status=?,notes=?,ai_message=?,campaign_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(username, full_name||null, bio||null, niche||null, Number(followers)||0, website||null,
      profile_url||null, status, notes||null, ai_message||null, campaign_id||null, req.params.id);
  res.json({ success: true });
});

router.delete('/leads/:id', (req, res) => {
  db.prepare('DELETE FROM instagram_messages WHERE lead_id=?').run(req.params.id);
  db.prepare('DELETE FROM instagram_leads WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

router.patch('/leads/:id/status', (req, res) => {
  const { status } = req.body;
  let sql = 'UPDATE instagram_leads SET status=?,updated_at=CURRENT_TIMESTAMP';
  const p = [status];
  if (status === 'contacted') sql += ',contacted_at=CURRENT_TIMESTAMP';
  if (status === 'replied')   sql += ',replied_at=CURRENT_TIMESTAMP';
  sql += ' WHERE id=?'; p.push(req.params.id);
  db.prepare(sql).run(...p);
  res.json({ success: true });
});

// Converter em cliente
router.post('/leads/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  const clientId = uuidv4();
  db.prepare('INSERT INTO clients (id,name,phone,notes,created_by) VALUES (?,?,?,?,?)')
    .run(clientId, lead.full_name || `@${lead.username}`, null,
      `Instagram @${lead.username}. Bio: ${lead.bio||''}`, req.user.id);
  db.prepare("UPDATE instagram_leads SET status='converted',converted_at=CURRENT_TIMESTAMP,client_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .run(clientId, lead.id);
  res.json({ success: true, client_id: clientId });
});

// ── IA: GERAÇÃO DE MENSAGEM ────────────────────────────────────────────────────
function getGeminiKey() {
  const s = db.prepare("SELECT gemini_api_key FROM settings WHERE id='default'").get();
  return (s?.gemini_api_key?.trim()) || process.env.GEMINI_API_KEY;
}

async function gerarMensagem(lead, config, instrucoes) {
  const apiKey = getGeminiKey();
  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') throw new Error('Chave Gemini não configurada. Vá em Configurações → Integrações.');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
    systemInstruction: `Você é um especialista em copywriting e geração de leads via Instagram DM.
Crie mensagens diretas (DM) personalizadas, humanas e persuasivas.
Regras obrigatórias:
- Nunca parecer spam ou roteiro genérico
- Usar informações reais do perfil para personalizar
- Máximo 220 palavras
- CTA claro e suave no final
- Sempre em português brasileiro
- Não usar emojis em excesso (máximo 2)
Retorne SOMENTE JSON: {"message":"texto completo","approach":"breve explicação da abordagem"}`
  });

  const prompt = `
EMPRESA/VENDEDOR:
- Descrição: ${config?.company_description || 'Empresa de soluções'}
- Produto/Serviço: ${config?.product_service || 'nossos serviços'}
- Tom: ${config?.message_tone || 'profissional e amigável'}

LEAD (@${lead.username}):
- Nome: ${lead.full_name || 'não informado'}
- Bio: ${lead.bio || 'não informada'}
- Nicho: ${lead.niche || 'não identificado'}
- Seguidores: ${lead.followers > 0 ? Number(lead.followers).toLocaleString('pt-BR') : 'não informado'}
- Website: ${lead.website || 'não informado'}
- Notas: ${lead.notes || 'nenhuma'}
${instrucoes ? `\nINSTRUÇÕES EXTRAS: ${instrucoes}` : ''}`.trim();

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return { message: parsed.message, approach: parsed.approach };
}

// Gerar mensagem individual
router.post('/leads/:id/generate', async (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    const config = db.prepare("SELECT * FROM instagram_config WHERE id='default'").get();
    const { message, approach } = await gerarMensagem(lead, config, req.body.custom_instructions);
    db.prepare('UPDATE instagram_leads SET ai_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(message, req.params.id);
    res.json({ success: true, message, approach });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Geração em massa
router.post('/bulk-generate', async (req, res) => {
  const { lead_ids, custom_instructions } = req.body;
  if (!Array.isArray(lead_ids) || !lead_ids.length)
    return res.status(400).json({ error: 'lead_ids obrigatório' });

  const config = db.prepare("SELECT * FROM instagram_config WHERE id='default'").get();
  const results = { success: 0, failed: 0, errors: [] };

  for (const id of lead_ids) {
    try {
      const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=?').get(id);
      if (!lead) { results.failed++; continue; }
      const { message } = await gerarMensagem(lead, config, custom_instructions);
      db.prepare('UPDATE instagram_leads SET ai_message=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(message, id);
      results.success++;
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      results.failed++;
      results.errors.push({ id, erro: err.message });
    }
  }
  res.json({ success: true, ...results });
});

// ── ENVIAR VIA API ────────────────────────────────────────────────────────────
router.post('/leads/:id/send', async (req, res) => {
  const lead = db.prepare('SELECT * FROM instagram_leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
  if (!lead.instagram_user_id)
    return res.status(400).json({ error: 'IGSID indisponível. O lead precisa enviar uma DM primeiro para você responder via API.' });

  const cfg = db.prepare("SELECT * FROM instagram_config WHERE id='default'").get();
  if (!cfg?.page_id || !cfg?.access_token)
    return res.status(503).json({ error: 'Configure Page ID e Access Token nas configurações' });

  const message = req.body.message || lead.ai_message;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });

  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${cfg.page_id}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: lead.instagram_user_id }, message: { text: message }, messaging_type: 'RESPONSE' }),
    });
    if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || 'Erro na API Instagram'); }

    db.prepare("INSERT INTO instagram_messages (id,lead_id,instagram_user_id,direction,message) VALUES (?,?,?,'out',?)")
      .run(uuidv4(), lead.id, lead.instagram_user_id, message);
    db.prepare("UPDATE instagram_leads SET status='contacted',contacted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(lead.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ESTATÍSTICAS ──────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const total    = db.prepare('SELECT COUNT(*) as c FROM instagram_leads').get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as c FROM instagram_leads GROUP BY status').all();
  const niches   = db.prepare('SELECT niche, COUNT(*) as c FROM instagram_leads WHERE niche IS NOT NULL GROUP BY niche ORDER BY c DESC LIMIT 8').all();
  const withMsg  = db.prepare('SELECT COUNT(*) as c FROM instagram_leads WHERE ai_message IS NOT NULL').get().c;
  const contacted= db.prepare("SELECT COUNT(*) as c FROM instagram_leads WHERE status IN ('contacted','replied','interested','converted')").get().c;
  const converted= db.prepare("SELECT COUNT(*) as c FROM instagram_leads WHERE status='converted'").get().c;
  res.json({ total, byStatus, niches, withMsg, contacted, converted });
});

module.exports = router;
