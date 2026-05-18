const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envia um e-mail de boas-vindas personalizado para o cliente
 */
async function sendWelcomeEmail(clientEmail, clientName, dealTitle) {
  const companyName = process.env.COMPANY_NAME || 'CandeiasNexus CRM';
  const crmDashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000/app/dashboard';
  const currentYear = new Date().getFullYear();

  // Renderiza o template EJS profissional
  const htmlContent = await ejs.renderFile(
    path.join(__dirname, 'routes/welcome-email.ejs'),
    { companyName, clientName, dealTitle, crmDashboardUrl, currentYear }
  );

  const mailOptions = {
    from: `"${companyName}" <no-reply@candeiasnexus.com>`,
    to: clientEmail,
    subject: `🎉 Bem-vindo! É um prazer ter você conosco, ${clientName}`,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Envia um lembrete de atividade próxima
 */
async function sendActivityReminder(userEmail, userName, activityTitle, dueDate) {
  const companyName = process.env.COMPANY_NAME || 'CandeiasNexus CRM';
  const crmDashboardUrl = process.env.FRONTEND_URL || 'http://localhost:3000/app/activities';
  
  const htmlContent = await ejs.renderFile(
    path.join(__dirname, 'routes/activity-reminder.ejs'),
    { companyName, userName, activityTitle, dueDate, crmDashboardUrl, currentYear: new Date().getFullYear() }
  );

  const mailOptions = {
    from: `"${companyName} Notificações" <alertas@candeiasnexus.com>`,
    to: userEmail,
    subject: `⏰ Lembrete: ${activityTitle} em 30 minutos`,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendWelcomeEmail, sendActivityReminder };