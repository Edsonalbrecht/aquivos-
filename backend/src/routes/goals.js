const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(auth);

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

router.get('/', (req, res) => {
  try {
    const months = getLast6Months();
    const result = months.map(month => {
      const goal = db.prepare("SELECT * FROM goals WHERE month = ?").get(month) || {
        id: null, month, revenue_goal: 0, deals_goal: 0, clients_goal: 0, activities_goal: 0
      };

      const actual_revenue = db.prepare(
        "SELECT COALESCE(SUM(value), 0) as v FROM deals WHERE status = 'won' AND strftime('%Y-%m', created_at) = ?"
      ).get(month).v;

      const actual_deals = db.prepare(
        "SELECT COUNT(*) as c FROM deals WHERE status = 'won' AND strftime('%Y-%m', created_at) = ?"
      ).get(month).c;

      const actual_clients = db.prepare(
        "SELECT COUNT(*) as c FROM clients WHERE strftime('%Y-%m', created_at) = ?"
      ).get(month).c;

      const actual_activities = db.prepare(
        "SELECT COUNT(*) as c FROM activities WHERE completed = 1 AND strftime('%Y-%m', created_at) = ?"
      ).get(month).c;

      return { ...goal, actual_revenue, actual_deals, actual_clients, actual_activities };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:month', (req, res) => {
  const { month } = req.params;
  const { revenue_goal = 0, deals_goal = 0, clients_goal = 0, activities_goal = 0 } = req.body;

  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'Mês inválido. Use YYYY-MM.' });

  try {
    const existing = db.prepare("SELECT id FROM goals WHERE month = ?").get(month);
    if (existing) {
      db.prepare(
        "UPDATE goals SET revenue_goal=?, deals_goal=?, clients_goal=?, activities_goal=?, updated_at=CURRENT_TIMESTAMP WHERE month=?"
      ).run(revenue_goal, deals_goal, clients_goal, activities_goal, month);
    } else {
      db.prepare(
        "INSERT INTO goals (id, month, revenue_goal, deals_goal, clients_goal, activities_goal, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(uuidv4(), month, revenue_goal, deals_goal, clients_goal, activities_goal, req.user.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
