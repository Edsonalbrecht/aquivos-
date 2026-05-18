const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const auth = require('../middleware/auth');
const db = require('../database');

const router = express.Router();
router.use(auth);

const SYSTEM_PROMPT = `Você é um assistente de CRM chamado NexusAI, integrado ao CandeiasNexus CRM.
Você ajuda a equipe de vendas com insights, sugestões e análises sobre clientes, negócios e atividades.
Responda sempre em português brasileiro, de forma clara, objetiva e profissional.
Quando receber dados do CRM no contexto, use-os para dar respostas personalizadas.
Não invente dados que não foram fornecidos.

Você deve SEMPRE retornar a sua resposta em formato JSON seguindo estritamente este esquema:
{
  "reply": "string (o conteúdo principal da sua resposta em markdown)",
  "suggestions": [
    { "label": "string (texto curto para um botão de ação)", "action": "string (descrição da ação sugerida)" }
  ]
}`;

function getGeminiKey() {
  const s = db.prepare("SELECT gemini_api_key FROM settings WHERE id='default'").get();
  return (s?.gemini_api_key?.trim()) || process.env.GEMINI_API_KEY;
}

router.post('/chat', async (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensagem obrigatória' });

  const apiKey = getGeminiKey();
  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
    return res.status(503).json({ error: 'API key do Gemini não configurada. Vá em Configurações → Integrações.' });
  }

  try {
    // busca contexto do CRM para enriquecer a resposta
    const stats = {
      totalClients: db.prepare("SELECT COUNT(*) as c FROM clients WHERE status='active'").get().c,
      openDeals: db.prepare("SELECT COUNT(*) as c FROM deals WHERE status='open'").get().c,
      totalValue: db.prepare("SELECT COALESCE(SUM(value),0) as v FROM deals WHERE status='open'").get().v,
      pendingActivities: db.prepare("SELECT COUNT(*) as c FROM activities WHERE completed=0").get().c,
    };

    const crmContext = `
Dados atuais do CRM:
- Clientes ativos: ${stats.totalClients}
- Negócios em aberto: ${stats.openDeals}
- Valor total em pipeline: R$ ${stats.totalValue.toFixed(2)}
- Atividades pendentes: ${stats.pendingActivities}
${context ? `\nContexto adicional da tela atual:\n${context}` : ''}
    `.trim();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json" }
    });

    const chat = model.startChat({
      history: [],
    });

    const fullMessage = `${crmContext}\n\nPergunta do usuário: ${message}`;
    const result = await chat.sendMessage(fullMessage);
    const text = result.response.text();

    try {
      // Como ativamos o JSON Mode, o Gemini retornará uma string JSON válida
      const aiResponse = JSON.parse(text);
      res.json(aiResponse);
    } catch (err) {
      res.json({ reply: text, suggestions: [] });
    }
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Erro ao consultar a IA. Verifique sua API key.' });
  }
});

router.post('/email', async (req, res) => {
  const { clientName, clientCompany, purpose, tone } = req.body;

  const apiKey = getGeminiKey();
  if (!apiKey || apiKey === 'SUA_CHAVE_AQUI') {
    return res.status(503).json({ error: 'API key do Gemini não configurada. Vá em Configurações → Integrações.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Redija um email profissional em português brasileiro para o cliente ${clientName}${clientCompany ? ` da empresa ${clientCompany}` : ''}.
Objetivo do email: ${purpose}
Tom: ${tone || 'profissional e cordial'}
O email deve ser conciso, direto e persuasivo. Inclua assunto e corpo do email.`;

    const result = await model.generateContent(prompt);
    res.json({ email: result.response.text() });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: 'Erro ao gerar email.' });
  }
});

module.exports = router;
