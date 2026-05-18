const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

// Exportar contatos para VCF (vCard 3.0)
router.get('/export', auth, async (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts').all();
    let vcf = '';

    for (const c of contacts) {
      vcf += 'BEGIN:VCARD\r\n';
      vcf += 'VERSION:3.0\r\n';
      vcf += `FN:${c.name || ''}\r\n`;
      vcf += `N:${c.name ? c.name.split(' ').reverse().join(';') : ''};;;;\r\n`;
      if (c.email) vcf += `EMAIL:${c.email}\r\n`;
      if (c.phone) vcf += `TEL;TYPE=CELL:${c.phone}\r\n`;
      if (c.role) vcf += `TITLE:${c.role}\r\n`;

      // Inclui foto em Base64 se existir um caminho de arquivo válido
      if (c.photo_path) {
        const absolutePath = path.join(__dirname, '../../', c.photo_path);
        if (fs.existsSync(absolutePath)) {
          const fileBuffer = await fs.promises.readFile(absolutePath);
          const base64Data = fileBuffer.toString('base64');
          const extension = path.extname(absolutePath).slice(1).toUpperCase() || 'JPEG';
          vcf += `PHOTO;ENCODING=b;TYPE=${extension}:${base64Data}\r\n`;
        }
      }

      if (c.notes) vcf += `NOTE:${c.notes.replace(/\n/g, '\\n')}\r\n`;
      vcf += 'END:VCARD\r\n';
    }

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="contatos_nexus.vcf"');
    res.send(vcf);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao exportar contatos: ' + err.message });
  }
});

router.post('/vcf', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const content = req.file.buffer.toString('utf-8');
  const vcards = content.split('BEGIN:VCARD');
  const { updateExisting } = req.body;
  const importedContacts = [];
  let skippedDuplicates = 0;
  let updatedCount = 0;

  // Garantir que existe um cliente para agrupar os importados
  let defaultClient = db.prepare("SELECT id FROM clients WHERE name = 'Contatos Importados'").get();
  if (!defaultClient) {
    const clientId = uuidv4();
    db.prepare("INSERT INTO clients (id, name, notes, status) VALUES (?, ?, ?, ?)")
      .run(clientId, 'Contatos Importados', 'Agrupador de contatos via importação VCF', 'active');
    defaultClient = { id: clientId };
  }

  vcards.forEach(vcard => {
    if (!vcard.trim()) return;

    const nameMatch = vcard.match(/FN:(.*)/) || vcard.match(/N:(.*);/);
    const emailMatch = vcard.match(/EMAIL:(.*)/) || vcard.match(/EMAIL;.*:(.*)/);
    const telMatch = vcard.match(/TEL;.*:(.*)/) || vcard.match(/TEL:(.*)/) || vcard.match(/item\d\.TEL:(.*)/);

    if (nameMatch || telMatch) {
      const contact = {
        id: uuidv4(),
        client_id: defaultClient.id,
        name: (nameMatch ? nameMatch[1] : (telMatch ? telMatch[1] : 'Sem Nome')).trim().replace(/;/g, ' '),
        email: emailMatch ? emailMatch[1].trim() : null,
        phone: telMatch ? telMatch[1].trim().replace(/[^\d+]/g, '') : null,
        role: 'Importado via VCF',
        notes: 'Importado em ' + new Date().toLocaleString()
      };

      let existing = null;
      if (contact.phone) {
        existing = db.prepare('SELECT id FROM contacts WHERE phone = ?').get(contact.phone);
      } else if (contact.email) {
        existing = db.prepare('SELECT id FROM contacts WHERE email = ?').get(contact.email);
      }

      if (existing) {
        if (updateExisting === 'true') {
          db.prepare('UPDATE contacts SET name=?,email=?,phone=?,role=?,notes=? WHERE id=?')
            .run(contact.name, contact.email, contact.phone, contact.role, contact.notes, existing.id);
          updatedCount++;
        } else {
          skippedDuplicates++;
        }
        return;
      }

      db.prepare('INSERT INTO contacts (id,client_id,name,email,phone,role,notes) VALUES (?,?,?,?,?,?,?)')
        .run(contact.id, contact.client_id, contact.name, contact.email, contact.phone, contact.role, contact.notes);

      importedContacts.push(contact);
    }
  });

  res.json({ 
    success: true, 
    count: importedContacts.length, 
    updated: updatedCount, 
    skipped: skippedDuplicates 
  });
});

module.exports = router;