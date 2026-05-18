const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('./backend/src/database');
const { sendActivityReminder } = require('./backend/src/emailService');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendWeeklyReport = async () => {
  console.log('[Cron] Iniciando geração do relatório semanal...');
  const today = new Date();
  const lastMonday = new Date();
  lastMonday.setDate(today.getDate() - 7);
  const lastSunday = new Date();
  lastSunday.setDate(today.getDate() - 1);

  const start = lastMonday.toISOString().split('T')[0];
  const end = lastSunday.toISOString().split('T')[0];

  try {
    const admins = db.prepare("SELECT email, name FROM users WHERE role = 'admin'").all();
    if (!admins.length) return;

    const query = `
      SELECT 
        d.title as 'Negocio',
        cl.name as 'Cliente',
        ps.name as 'Etapa',
        d.value as 'Valor',
        d.status as 'Status',
        d.created_at as 'Data',
        CASE 
          WHEN EXISTS (SELECT 1 FROM whatsapp_leads wl WHERE wl.client_id = d.client_id) THEN 'WhatsApp'
          ELSE 'Manual'
        END as 'Origem'
      FROM deals d
      LEFT JOIN clients cl ON d.client_id = cl.id
      LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
      WHERE date(d.created_at) BETWEEN ? AND ?
      ORDER BY d.created_at DESC
    `;

    const data = db.prepare(query).all(start, end);
    if (!data.length) return;

    const headers = Object.keys(data[0]).join(';');
    const rows = data.map(row => Object.values(row).join(';')).join('\n');
    const csvContent = "\uFEFF" + headers + "\n" + rows;

    for (const admin of admins) {
      await transporter.sendMail({
        from: '"NexusCRM Analytics" <relatorios@candeiasnexus.com>',
        to: admin.email,
        subject: `📊 Relatório Semanal: Origem de Leads (${start} a ${end})`,
        text: `Olá ${admin.name}, segue em anexo o relatório da última semana.`,
        attachments: [{ filename: `nexus_report_${start}_${end}.csv`, content: csvContent }]
      });
    }
    console.log(`[Cron] Relatório enviado para ${admins.length} admins.`);
  } catch (err) {
    console.error('[Cron] Erro no relatório semanal:', err.message);
  }
};

// Toda segunda-feira às 08:00
cron.schedule('0 8 * * 1', sendWeeklyReport);

// Verifica lembretes de atividades a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  console.log('[Reminder] Verificando atividades próximas...');
  
  try {
    // Busca atividades não concluídas, que vencem nos próximos 30 minutos e ainda não tiveram alerta enviado
    const upcoming = db.prepare(`
      SELECT a.*, u.email, u.name as user_name
      FROM activities a
      JOIN users u ON a.assigned_to = u.id
      WHERE a.completed = 0 
        AND a.reminder_sent = 0 
        AND a.due_date IS NOT NULL
        AND datetime(a.due_date) <= datetime('now', 'localtime', '+30 minutes')
        AND datetime(a.due_date) > datetime('now', 'localtime')
    `).all();

    for (const act of upcoming) {
      const formattedDate = new Date(act.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      await sendActivityReminder(act.email, act.user_name, act.title, formattedDate);
      
      db.prepare("UPDATE activities SET reminder_sent = 1 WHERE id = ?").run(act.id);
      console.log(`[Reminder] E-mail enviado para ${act.email} (Atividade: ${act.title})`);
    }
  } catch (err) {
    console.error('[Reminder] Erro ao processar lembretes:', err.message);
  }
});

module.exports = { sendWeeklyReport };