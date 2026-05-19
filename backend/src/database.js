const { Database: WasmDB } = require('node-sqlite3-wasm');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './crm.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const wasmDb = new WasmDB(dbPath);

// shim para manter a API identica ao better-sqlite3 nas rotas
const db = {
  pragma: () => {},
  exec: sql => wasmDb.exec(sql),
  prepare: sql => ({
    run: (...args) => wasmDb.run(sql, args),
    get: (...args) => wasmDb.get(sql, args),
    all: (...args) => wasmDb.all(sql, args),
  }),
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    notifications_sound INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    photo_path TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    color TEXT DEFAULT '#6366f1'
  );

  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    client_id TEXT,
    contact_id TEXT,
    stage_id TEXT NOT NULL,
    value REAL DEFAULT 0,
    expected_close DATE,
    notes TEXT,
    status TEXT DEFAULT 'open',
    lost_reason TEXT,
    assigned_to TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    client_id TEXT,
    deal_id TEXT,
    contact_id TEXT,
    due_date DATETIME,
    completed INTEGER DEFAULT 0,
    completed_at DATETIME,
    reminder_sent INTEGER DEFAULT 0,
    assigned_to TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS whatsapp_leads (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    name TEXT,
    first_message TEXT,
    status TEXT DEFAULT 'new',
    client_id TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    status TEXT DEFAULT 'received',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS whatsapp_config (
    id TEXT PRIMARY KEY,
    verify_token TEXT DEFAULT 'candeias_webhook_token',
    app_secret TEXT,
    phone_number_id TEXT,
    access_token TEXT,
    auto_reply TEXT,
    auto_create_lead INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    company_name TEXT DEFAULT 'CandeiasNexus',
    logo_url TEXT,
    monthly_sales_goal REAL DEFAULT 50000,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subscription TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS backup_logs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    operation TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL UNIQUE,
    revenue_goal REAL DEFAULT 0,
    deals_goal INTEGER DEFAULT 0,
    clients_goal INTEGER DEFAULT 0,
    activities_goal INTEGER DEFAULT 0,
    created_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS instagram_config (
    id TEXT PRIMARY KEY,
    page_id TEXT,
    instagram_account_id TEXT,
    access_token TEXT,
    verify_token TEXT DEFAULT 'ig_webhook_token',
    company_description TEXT,
    product_service TEXT,
    message_tone TEXT DEFAULT 'profissional e amigável',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS instagram_leads (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    full_name TEXT,
    bio TEXT,
    niche TEXT,
    followers INTEGER DEFAULT 0,
    website TEXT,
    profile_url TEXT,
    status TEXT DEFAULT 'new',
    ai_message TEXT,
    notes TEXT,
    instagram_user_id TEXT,
    contacted_at DATETIME,
    replied_at DATETIME,
    converted_at DATETIME,
    client_id TEXT,
    campaign_id TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS instagram_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    instagram_user_id TEXT,
    direction TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS telegram_config (
    id TEXT PRIMARY KEY,
    bot_token TEXT,
    bot_username TEXT,
    notification_chat_id TEXT,
    auto_create_lead INTEGER DEFAULT 1,
    welcome_message TEXT,
    notifications_enabled INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS telegram_leads (
    id TEXT PRIMARY KEY,
    telegram_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    chat_id TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    client_id TEXT,
    first_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS telegram_messages (
    id TEXT PRIMARY KEY,
    telegram_id TEXT,
    chat_id TEXT,
    direction TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'generic',
    status TEXT DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    goal_leads INTEGER DEFAULT 0,
    goal_revenue REAL DEFAULT 0,
    budget REAL DEFAULT 0,
    message_template TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaign_clients (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at DATETIME,
    responded_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Adiciona colunas novas em bases existentes (idempotente)
try { db.exec("ALTER TABLE deals ADD COLUMN probability INTEGER DEFAULT 50"); } catch (_) {}
try { db.exec("ALTER TABLE deals ADD COLUMN source TEXT DEFAULT 'manual'"); } catch (_) {}

// Config padrão do WhatsApp
const existingConfig = db.prepare("SELECT COUNT(*) as count FROM whatsapp_config WHERE id='default'").get();
if (existingConfig.count === 0) {
  db.prepare("INSERT INTO whatsapp_config (id, verify_token) VALUES ('default', 'candeias_webhook_token')").run();
}

// Config padrão de Settings
const existingSettings = db.prepare("SELECT COUNT(*) as count FROM settings WHERE id='default'").get();
if (existingSettings.count === 0) {
  db.prepare("INSERT INTO settings (id, company_name, monthly_sales_goal) VALUES ('default', 'CandeiasNexus', 50000)").run();
}

const existingStages = db.prepare('SELECT COUNT(*) as count FROM pipeline_stages').get();
if (existingStages.count === 0) {
  db.prepare('INSERT INTO pipeline_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)').run('stage-1', 'Prospecção', 1, '#6366f1');
  db.prepare('INSERT INTO pipeline_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)').run('stage-2', 'Qualificação', 2, '#f59e0b');
  db.prepare('INSERT INTO pipeline_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)').run('stage-3', 'Proposta', 3, '#3b82f6');
  db.prepare('INSERT INTO pipeline_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)').run('stage-4', 'Negociação', 4, '#8b5cf6');
  db.prepare('INSERT INTO pipeline_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)').run('stage-5', 'Fechamento', 5, '#10b981');
}

// --- MIGRAÇÃO MANUAL DE COLUNAS (Garante que colunas novas existam em bancos antigos) ---
try { db.exec("ALTER TABLE deals ADD COLUMN lost_reason TEXT;"); } catch(e) {}
try { db.exec("ALTER TABLE activities ADD COLUMN completed_at DATETIME;"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN notifications_sound INTEGER DEFAULT 1;"); } catch(e) {}
try { db.exec("ALTER TABLE settings ADD COLUMN monthly_sales_goal REAL DEFAULT 50000;"); } catch(e) {}
try { db.exec("ALTER TABLE settings ADD COLUMN gemini_api_key TEXT;"); } catch(e) {}

module.exports = db;
