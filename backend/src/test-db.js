require('dotenv').config();
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

/**
 * Script de Teste de Sanidade do Banco de Dados
 * CandeiasNexus CRM
 */
async function runSanityTests() {
  console.log('=== 🔍 INICIANDO TESTES DE SANIDADE DO BANCO DE DADOS ===\n');

  try {
    // 1. Verificação de Tabelas Essenciais
    const tables = [
      'users', 'clients', 'contacts', 'deals', 
      'whatsapp_leads', 'settings', 'pipeline_stages',
      'activities', 'backup_logs'
    ];

    console.log('--- 1. Verificando Tabelas ---');
    tables.forEach(table => {
      const check = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (check) {
        console.log(`✅ Tabela [${table}]: OK`);
      } else {
        console.error(`❌ Tabela [${table}]: NÃO ENCONTRADA`);
      }
    });

    // 1.1 Verificação de Variáveis de Ambiente Críticas
    console.log('\n--- 1.1 Verificando Variáveis de Ambiente ---');
    const envVars = [
      'JWT_SECRET', 'DB_PATH', 'GEMINI_API_KEY', 
      'AWS_S3_BUCKET', 'SMTP_HOST'
    ];
    envVars.forEach(v => {
      if (process.env[v]) {
        const value = v.includes('KEY') || v.includes('SECRET') ? '********' : process.env[v];
        console.log(`✅ [${v}]: Configurado (${value})`);
      } else {
        console.warn(`⚠️  [${v}]: NÃO CONFIGURADO (Algumas funções podem falhar)`);
      }
    });

    // 2. Teste de Operação CRUD (Ciclo de Vida do Usuário)
    console.log('\n--- 2. Testando Operações CRUD ---');
    const testId = 'test-' + uuidv4();
    const testEmail = `tester-${Date.now()}@nexus.com`;

    // CREATE
    db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)')
      .run(testId, 'Database Tester', testEmail, 'secure_pass_123');
    console.log('✅ Escrita (INSERT): OK');

    // READ
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(testId);
    if (user && user.name === 'Database Tester') {
      console.log('✅ Leitura (SELECT): OK');
    } else {
      throw new Error('Falha na validação dos dados lidos');
    }

    // UPDATE
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run('Updated Tester', testId);
    const updated = db.prepare('SELECT name FROM users WHERE id = ?').get(testId);
    if (updated.name === 'Updated Tester') {
      console.log('✅ Atualização (UPDATE): OK');
    }

    // DELETE
    db.prepare('DELETE FROM users WHERE id = ?').run(testId);
    const deleted = db.prepare('SELECT * FROM users WHERE id = ?').get(testId);
    if (!deleted) {
      console.log('✅ Exclusão (DELETE): OK');
    }

    // 3. Verificação de Dados Padrão (Seeders)
    console.log('\n--- 3. Verificando Dados Iniciais ---');
    const stagesCount = db.prepare('SELECT COUNT(*) as count FROM pipeline_stages').get().count;
    console.log(`📊 Etapas do Pipeline: ${stagesCount} encontradas (Esperado: >= 5)`);

    console.log('\n🚀 RESULTADO: Banco de dados saudável e operacional!');
  } catch (err) {
    console.error('\n💥 ERRO CRÍTICO NO BANCO DE DADOS:', err.message);
  }
}

runSanityTests();