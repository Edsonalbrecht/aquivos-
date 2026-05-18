const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Script de Seed Inicial para o CandeiasNexus CRM
 * Objetivo: Criar o primeiro usuário administrador.
 */
async function runSeed() {
  console.log('=== 🌱 CANDEIAS NEXUS CRM - INICIANDO SEED ===\n');

  const adminEmail = 'admin@nexus.com';
  const adminPassword = 'admin123'; // Você deve alterar isso após o primeiro login

  try {
    // 1. Garantir Usuário Administrador
    const existingUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    let adminId;

    if (!existingUser) {
      console.log('Gerando hash de segurança para a senha...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminId = uuidv4();
      db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(adminId, 'Administrador Nexus', adminEmail, hashedPassword, 'admin');
      console.log('✅ Usuário administrador criado com sucesso!');
    } else {
      adminId = existingUser.id;
      console.log('ℹ️  Usuário administrador já configurado.');
    }

    // 2. Garantir Configurações Padrão (Meta de vendas, etc)
    const settings = db.prepare("SELECT id FROM settings WHERE id = 'default'").get();
    if (!settings) {
      db.prepare("INSERT INTO settings (id, monthly_sales_goal) VALUES (?, ?)")
        .run('default', 50000);
      console.log('✅ Configurações de sistema inicializadas.');
    }

    // 3. Garantir Etapas do Pipeline (Essencial para o gráfico de funil aparecer)
    const stagesCount = db.prepare("SELECT COUNT(*) as count FROM pipeline_stages").get().count;
    if (stagesCount === 0) {
      const defaultStages = [
        { name: 'Lead', color: '#94a3b8', order: 1 },
        { name: 'Contato', color: '#60a5fa', order: 2 },
        { name: 'Proposta', color: '#fbbf24', order: 3 },
        { name: 'Negociação', color: '#f472b6', order: 4 },
        { name: 'Fechado', color: '#34d399', order: 5 }
      ];
      const insertStage = db.prepare('INSERT INTO pipeline_stages (id, name, color, order_index) VALUES (?, ?, ?, ?)');
      defaultStages.forEach(s => insertStage.run(uuidv4(), s.name, s.color, s.order));
      console.log('✅ Etapas do pipeline restauradas.');
    }

    // 4. Vendedores Adicionais para Ranking
    const sellers = [
      { name: 'João Silva', email: 'joao@nexus.com' },
      { name: 'Maria Souza', email: 'maria@nexus.com' }
    ];
    for (const s of sellers) {
      const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(s.email);
      if (!exists) {
        db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)')
          .run(uuidv4(), s.name, s.email, '123456', 'vendedor');
      }
    }


    console.log('\n🌱 SEED FINALIZADO COM SUCESSO!');
    if (!existingUser) {
      console.log('-------------------------------------------');
      console.log(`📧 Usuário: ${adminEmail}`);
      console.log(`🔑 Senha:   ${adminPassword}`);
      console.log('-------------------------------------------');
      console.log('\n🚀 Dashboard pronto! Faça login para visualizar.');
    }
  } catch (err) {
    console.error('❌ Erro crítico ao executar o seed:', err.message);
  }
}

runSeed();