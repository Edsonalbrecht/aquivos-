const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const { start, end } = req.query;
  const isAdmin = req.user.role === 'admin';

  const hasDates = !!(start && end);
  const dateFilter  = hasDates ? " AND date(created_at) BETWEEN ? AND ?" : "";
  const dateFilterD = hasDates ? " AND date(d.created_at) BETWEEN ? AND ?" : "";
  const params      = hasDates ? [start, end] : [];

  const ownerFilter  = isAdmin ? "" : " AND (assigned_to = ? OR created_by = ?)";
  const ownerFilterD = isAdmin ? "" : " AND (d.assigned_to = ? OR d.created_by = ?)";
  const ownerParams  = isAdmin ? [] : [req.user.id, req.user.id];

  try {
    // ── 1. KPIs PRINCIPAIS ────────────────────────────────────────────
    const totalLeads = db.prepare(
      `SELECT COUNT(*) as c FROM deals WHERE 1=1 ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).c;

    const openDeals = db.prepare(
      `SELECT COUNT(*) as c FROM deals WHERE status='open' ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).c;

    const wonDeals = db.prepare(
      `SELECT COUNT(*) as c FROM deals WHERE status='won' ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).c;

    const lostDeals = db.prepare(
      `SELECT COUNT(*) as c FROM deals WHERE status='lost' ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).c;

    const wonValue = db.prepare(
      `SELECT COALESCE(SUM(value),0) as v FROM deals WHERE status='won' ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).v;

    const pipelineValue = db.prepare(
      `SELECT COALESCE(SUM(value),0) as v FROM deals WHERE status='open' ${dateFilter} ${ownerFilter}`
    ).get(...params, ...ownerParams).v;

    const ticketMedio   = wonDeals > 0 ? wonValue / wonDeals : 0;
    const conversionRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : 0;

    const totalClients = db.prepare(
      `SELECT COUNT(*) as c FROM clients WHERE 1=1 ${dateFilter} ${isAdmin ? "" : " AND created_by = ?"}`
    ).get(...params, ...(isAdmin ? [] : [req.user.id])).c;

    const actDateFilter = hasDates ? " AND date(due_date) BETWEEN ? AND ?" : "";
    const pendingActivities = db.prepare(
      `SELECT COUNT(*) as c FROM activities WHERE completed=0 ${actDateFilter} ${isAdmin ? "" : " AND assigned_to = ?"}`
    ).get(...params, ...(isAdmin ? [] : [req.user.id])).c;

    const overdueActivities = db.prepare(
      `SELECT COUNT(*) as c FROM activities WHERE completed=0 AND due_date IS NOT NULL AND datetime(due_date) < datetime('now') ${isAdmin ? "" : " AND assigned_to = ?"}`
    ).get(...(isAdmin ? [] : [req.user.id])).c;

    // Meta mensal
    const settings = db.prepare("SELECT monthly_sales_goal FROM settings WHERE id='default'").get();
    const monthlyGoal = settings?.monthly_sales_goal || 0;
    const currentMonthWon = db.prepare(
      `SELECT COALESCE(SUM(value),0) as v FROM deals WHERE status='won' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') ${ownerFilter}`
    ).get(...ownerParams).v;
    const percentMeta = monthlyGoal > 0 ? ((currentMonthWon / monthlyGoal) * 100).toFixed(1) : 0;

    // Crescimento: compara com período anterior de mesmo tamanho
    let growth = null;
    if (hasDates) {
      const startDate = new Date(start);
      const endDate   = new Date(end);
      const diffDays  = Math.round((endDate - startDate) / 86400000);
      const prevEnd   = new Date(startDate); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);   prevStart.setDate(prevStart.getDate() - diffDays);
      const prevS = prevStart.toISOString().split('T')[0];
      const prevE = prevEnd.toISOString().split('T')[0];
      const prevValue = db.prepare(
        `SELECT COALESCE(SUM(value),0) as v FROM deals WHERE status='won' AND date(created_at) BETWEEN ? AND ? ${ownerFilter}`
      ).get(prevS, prevE, ...ownerParams).v;
      growth = prevValue > 0 ? (((wonValue - prevValue) / prevValue) * 100).toFixed(1) : null;
    }

    // ── 2. FUNIL DE VENDAS ────────────────────────────────────────────
    const stages = db.prepare("SELECT * FROM pipeline_stages ORDER BY order_index ASC").all();
    const funnelStages = stages.map((ps, idx) => {
      const count = db.prepare(
        `SELECT COUNT(*) as c FROM deals d WHERE d.stage_id = ? AND d.status = 'open' ${dateFilterD} ${ownerFilterD}`
      ).get(ps.id, ...params, ...ownerParams).c;

      const value = db.prepare(
        `SELECT COALESCE(SUM(d.value),0) as v FROM deals d WHERE d.stage_id = ? AND d.status = 'open' ${dateFilterD} ${ownerFilterD}`
      ).get(ps.id, ...params, ...ownerParams).v;

      return { id: ps.id, name: ps.name, color: ps.color, order: ps.order_index, count, value };
    });

    // Conversão entre etapas (relativo à primeira etapa com deals)
    const firstCount = funnelStages[0]?.count || 1;
    const funnel = funnelStages.map((s, i) => ({
      ...s,
      conversion: i === 0 ? 100 : (firstCount > 0 ? ((s.count / firstCount) * 100).toFixed(0) : 0),
      conversionFromPrev: i === 0 ? null
        : (funnelStages[i - 1].count > 0 ? ((s.count / funnelStages[i - 1].count) * 100).toFixed(0) : 0),
    }));

    // ── 3. DESEMPENHO DA EQUIPE ───────────────────────────────────────
    const teamPerformance = db.prepare(`
      SELECT
        u.id, u.name as vendedor,
        COUNT(DISTINCT d.id) as leads,
        SUM(CASE WHEN d.status = 'won' THEN 1 ELSE 0 END) as vendas,
        COALESCE(SUM(CASE WHEN d.status = 'won' THEN d.value ELSE 0 END), 0) as receita,
        SUM(CASE WHEN d.status = 'lost' THEN 1 ELSE 0 END) as perdidos,
        COUNT(DISTINCT a.id) as atividades
      FROM users u
      LEFT JOIN deals d ON d.assigned_to = u.id ${dateFilterD}
      LEFT JOIN activities a ON a.assigned_to = u.id AND a.completed = 1 ${hasDates ? "AND date(a.created_at) BETWEEN ? AND ?" : ""}
      WHERE u.role IN ('admin', 'vendedor', 'user')
      GROUP BY u.id
      ORDER BY receita DESC
    `).all(...params, ...(hasDates ? params : []));

    const teamWithConversion = teamPerformance.map(t => ({
      ...t,
      conversao: t.leads > 0 ? ((t.vendas / t.leads) * 100).toFixed(1) : '0',
      ticketMedio: t.vendas > 0 ? t.receita / t.vendas : 0,
    }));

    // ── 4. MOTIVOS DE PERDA ───────────────────────────────────────────
    let lostReasons = [];
    try {
      lostReasons = db.prepare(`
        SELECT COALESCE(lost_reason, 'Não informado') as name, COUNT(*) as value,
               COALESCE(SUM(value),0) as total_value
        FROM deals WHERE status = 'lost' ${dateFilter} ${ownerFilter}
        GROUP BY lost_reason ORDER BY value DESC LIMIT 8
      `).all(...params, ...ownerParams);
    } catch (_) {}

    // ── 5. ATIVIDADES POR TIPO ────────────────────────────────────────
    const activityTypes = db.prepare(`
      SELECT type,
        SUM(CASE WHEN completed=1 THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE WHEN completed=0 THEN 1 ELSE 0 END) as pendentes
      FROM activities
      WHERE 1=1 ${dateFilter} ${isAdmin ? "" : " AND assigned_to = ?"}
      GROUP BY type
    `).all(...params, ...(isAdmin ? [] : [req.user.id]));

    // ── 6. EVOLUÇÃO MENSAL (últimos 6 meses) ─────────────────────────
    const monthlyEvolution = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const won = db.prepare(
        `SELECT COALESCE(SUM(value),0) as v, COUNT(*) as c FROM deals WHERE status='won' AND strftime('%Y-%m', created_at) = ? ${ownerFilter}`
      ).get(month, ...ownerParams);
      const leads = db.prepare(
        `SELECT COUNT(*) as c FROM deals WHERE strftime('%Y-%m', created_at) = ? ${ownerFilter}`
      ).get(month, ...ownerParams).c;
      monthlyEvolution.push({ month, label, receita: won.v, vendas: won.c, leads });
    }

    // ── 7. ALERTAS ────────────────────────────────────────────────────
    const stalledDeals = db.prepare(`
      SELECT d.id, d.title, d.value, d.updated_at,
             CAST((julianday('now') - julianday(d.updated_at)) AS INTEGER) as dias_parado,
             cl.name as client_name, ps.name as stage_name, ps.color as stage_color,
             u.name as vendedor
      FROM deals d
      LEFT JOIN clients cl ON d.client_id = cl.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE d.status = 'open'
        AND julianday('now') - julianday(d.updated_at) > 7
        ${ownerFilterD}
      ORDER BY dias_parado DESC LIMIT 10
    `).all(...ownerParams);

    const overdueActivitiesList = db.prepare(`
      SELECT a.id, a.title, a.type, a.due_date,
             CAST((julianday('now') - julianday(a.due_date)) AS INTEGER) as dias_atraso,
             cl.name as client_name, u.name as responsavel
      FROM activities a
      LEFT JOIN clients cl ON a.client_id = cl.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.completed = 0 AND a.due_date IS NOT NULL AND datetime(a.due_date) < datetime('now')
        ${isAdmin ? "" : " AND a.assigned_to = ?"}
      ORDER BY a.due_date ASC LIMIT 10
    `).all(...(isAdmin ? [] : [req.user.id]));

    // ── 8. ORIGEM DE LEADS ────────────────────────────────────────────
    const whatsappCount = db.prepare(`
      SELECT COUNT(*) as c FROM deals d
      WHERE EXISTS (SELECT 1 FROM whatsapp_leads wl WHERE wl.client_id = d.client_id)
      ${dateFilterD} ${ownerFilterD}
    `).get(...params, ...ownerParams).c;

    const leadsOrigin = [
      { name: 'WhatsApp', value: whatsappCount, color: '#25d366' },
      { name: 'Manual',   value: Math.max(0, totalLeads - whatsappCount), color: '#6366f1' },
    ];

    // ── 9. NEGÓCIOS RECENTES ──────────────────────────────────────────
    const recentDeals = db.prepare(`
      SELECT d.id, d.title, d.value, d.status, d.created_at, d.expected_close,
             cl.name as client_name, ps.name as stage_name, ps.color as stage_color,
             u.name as vendedor
      FROM deals d
      LEFT JOIN clients cl ON d.client_id = cl.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE 1=1 ${dateFilterD} ${ownerFilterD}
      ORDER BY d.created_at DESC LIMIT 8
    `).all(...params, ...ownerParams);

    // ── 10. PRÓXIMAS ATIVIDADES ───────────────────────────────────────
    const upcomingActivities = db.prepare(`
      SELECT a.id, a.title, a.type, a.due_date,
             cl.name as client_name, u.name as responsavel
      FROM activities a
      LEFT JOIN clients cl ON a.client_id = cl.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE a.completed = 0 AND a.due_date IS NOT NULL AND datetime(a.due_date) >= datetime('now')
        ${isAdmin ? "" : " AND a.assigned_to = ?"}
      ORDER BY a.due_date ASC LIMIT 5
    `).all(...(isAdmin ? [] : [req.user.id]));

    res.json({
      stats: {
        totalLeads, openDeals, wonDeals, lostDeals,
        wonValue, pipelineValue, ticketMedio,
        conversionRate: Number(conversionRate),
        totalClients, pendingActivities, overdueActivities,
        monthlyGoal, currentMonthWon,
        percentMeta: Number(percentMeta),
        growth,
      },
      funnel,
      teamPerformance: teamWithConversion,
      lostReasons,
      activityTypes,
      monthlyEvolution,
      leadsOrigin,
      alerts: { stalledDeals, overdueActivitiesList },
      recentDeals,
      upcomingActivities,
    });
  } catch (err) {
    console.error('[Dashboard] ERRO:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/export-leads', auth, (req, res) => {
  const { start, end } = req.query;
  const isAdmin = req.user.role === 'admin';
  const hasDates = !!(start && end);
  const dateFilter = hasDates ? " AND date(d.created_at) BETWEEN ? AND ?" : "";
  const params = hasDates ? [start, end] : [];
  const ownerFilter = isAdmin ? "" : " AND (d.assigned_to = ? OR d.created_by = ?)";
  const ownerParams = isAdmin ? [] : [req.user.id, req.user.id];

  try {
    const data = db.prepare(`
      SELECT d.title as 'Negócio', cl.name as 'Cliente', ps.name as 'Etapa',
             d.value as 'Valor', d.status as 'Status', d.created_at as 'Data Criação',
             u.name as 'Vendedor', d.lost_reason as 'Motivo Perda',
             CASE WHEN EXISTS (SELECT 1 FROM whatsapp_leads wl WHERE wl.client_id = d.client_id)
               THEN 'WhatsApp' ELSE 'Manual' END as 'Origem'
      FROM deals d
      LEFT JOIN clients cl ON d.client_id = cl.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE 1=1 ${dateFilter} ${ownerFilter}
      ORDER BY d.created_at DESC
    `).all(...params, ...ownerParams);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
