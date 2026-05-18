require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Inicializa serviços de automação
require('./seed');
require('./reportingService');
require('./backupService');

const app = express();

let server;
// Se houver caminhos para certificados SSL no .env, inicia em HTTPS
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  server = https.createServer(options, app);
  console.log('[Server] Iniciando em modo HTTPS seguro');
} else {
  server = http.createServer(app);
  console.log('[Server] Iniciando em modo HTTP');
}

const io = new Server(server, { 
  cors: { origin: process.env.FRONTEND_URL || "*", methods: ["GET", "POST"] } 
});

// Middleware de autenticação JWT para o handshake do Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    console.error(`[Socket.io] Conexão rejeitada: Token ausente de ${socket.id}`);
    return next(new Error('Erro de autenticação: Token ausente'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error(`[Socket.io] Conexão rejeitada: Token inválido de ${socket.id} - ${err.message}`);
      return next(new Error('Erro de autenticação: Token inválido'));
    }
    socket.user = decoded; // Atribui os dados do usuário decodificados ao socket
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Novo cliente conectado: ${socket.id}`);
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.io] Cliente desconectado (${socket.id}): ${reason}`);
  });
});

app.set('io', io); // Disponibiliza o io nas rotas via req.app.get('io')

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/import', require('./routes/import'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/goals', require('./routes/goals'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/instagram', require('./routes/instagram'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/telegram', require('./routes/telegram'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`CandeiasNexusCRM API with WebSockets running on port ${PORT}`));
