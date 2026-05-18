const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const { pipeline } = require('stream/promises');
const { S3Client, PutObjectCommand, PutBucketLifecycleConfigurationCommand } = require("@aws-sdk/client-s3");

// Define os caminhos. O banco geralmente reside na raiz da pasta backend
const dbPath = path.resolve(process.env.DB_PATH || './crm.db');
const backupDir = path.resolve(__dirname, '../../backups');

// Inicializa o cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const logBackup = (status, operation, message, details = null) => {
  db.prepare(`
    INSERT INTO backup_logs (id, status, operation, message, details) VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), status, operation, message, details ? JSON.stringify(details) : null);
};

/**
 * Configura a política de ciclo de vida no bucket para deletar backups antigos automaticamente
 */
const setupS3Lifecycle = async () => {
  const retentionDays = parseInt(process.env.AWS_S3_BACKUP_RETENTION_DAYS || "30", 10);
  
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    LifecycleConfiguration: {
      Rules: [
        {
          ID: "DeleteOldNexusBackups",
          Status: "Enabled",
          Filter: { Prefix: "backups/" },
          Expiration: { Days: retentionDays }
        }
      ]
    }
  };

  try {
    await s3Client.send(new PutBucketLifecycleConfigurationCommand(params));
    logBackup('success', 'S3_LIFECYCLE', `Lifecycle configurado para ${retentionDays} dias`);
  } catch (err) {
    console.error('[Backup] Erro ao configurar Lifecycle no S3:', err.message);
    logBackup('error', 'S3_LIFECYCLE', `Falha ao configurar Lifecycle: ${err.message}`);
  }
};

/**
 * Executa a cópia do arquivo do banco de dados
 */
const performBackup = async () => {
  if (!process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID) {
    console.log('[Backup] AWS não configurado. Backup S3 ignorado.');
    return;
  }
  console.log('[Backup] Iniciando rotina de backup diário...');
  await setupS3Lifecycle();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `crm-backup-${timestamp}.db.gz`;
  const backupPath = path.join(backupDir, fileName);

  try {
    // Cria o stream de leitura do banco, passa pelo compressor e salva no destino
    const source = fs.createReadStream(dbPath);
    const destination = fs.createWriteStream(backupPath);
    const gzip = zlib.createGzip();

    await pipeline(source, gzip, destination);
    logBackup('success', 'COMPRESSION', `Compactação local concluída: ${fileName}`);

    // Upload para o AWS S3
    const fileStream = fs.createReadStream(backupPath);
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `backups/${fileName}`,
      Body: fileStream,
      StorageClass: "INTELLIGENT_TIERING",
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    logBackup('success', 'S3_UPLOAD', `Upload para S3 realizado: backups/${fileName}`);

    // ROTAÇÃO: Mantém apenas os últimos 7 backups
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('crm-backup-'))
      .sort();

    if (files.length > 7) {
      const toDelete = files.slice(0, files.length - 7);
      toDelete.forEach(f => {
        fs.unlinkSync(path.join(backupDir, f));
        console.log(`[Backup] Removendo arquivo antigo: ${f}`);
      });
    }
    logBackup('success', 'LOCAL_ROTATION', 'Rotação de arquivos locais concluída');
  } catch (err) {
    console.error('[Backup] Erro crítico ao realizar cópia do banco:', err.message);
    logBackup('error', 'BACKUP_CRITICAL', err.message);
  }
};

// Agenda para rodar todo dia às 03:00 da manhã (Horário de baixo tráfego)
cron.schedule('0 3 * * *', performBackup);

module.exports = { performBackup };