const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const auth = require('../middleware/auth');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:suporte@nexus.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

router.get('/key', auth, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/subscribe', auth, (req, res) => {
  const subscription = req.body;
  const userId = req.user.id;
  const subString = JSON.stringify(subscription);

  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE user_id = ? AND subscription = ?').get(userId, subString);
  if (!existing) {
    db.prepare('INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?)').run(uuidv4(), userId, subString);
  }
  res.status(201).json({ success: true });
});

async function notifyNewLead(title, body) {
  const subs = db.prepare('SELECT subscription FROM push_subscriptions').all();
  const payload = JSON.stringify({ title, body });

  const tasks = subs.map(s => {
    const sub = JSON.parse(s.subscription);
    return webpush.sendNotification(sub, payload).catch(err => {
      if (err.statusCode === 410 || err.statusCode === 404) {
        db.prepare('DELETE FROM push_subscriptions WHERE subscription = ?').run(s.subscription);
      }
    });
  });
  await Promise.all(tasks);
}

module.exports = { router, notifyNewLead };