import { useEffect, useState } from 'react';
import { CurrencyDollarIcon, TrophyIcon, UsersIcon, ClipboardDocumentListIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return months;
}

function ProgressBar({ value, goal, color }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: '#64748b' }}>
        <span>{pct.toFixed(0)}% da meta</span>
        {over && <span style={{ color: '#34d399', fontWeight: 700 }}>Meta superada!</span>}
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 999,
          width: `${pct}%`,
          background: over ? 'linear-gradient(90deg, #10b981, #34d399)' : color,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

function GoalCard({ icon: Icon, label, color, glow, actual, goal, field, editing, formVal, onFormChange, formatFn }) {
  const display = formatFn ? formatFn(actual) : actual;
  const goalDisplay = formatFn ? formatFn(goal) : goal;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 24, boxShadow: glow ? `0 0 24px ${glow}` : '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 20, height: 20, color }} />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{label}</p>
      </div>

      <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, background: color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {display}
      </p>

      {editing ? (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Meta</label>
          <input
            type="number"
            value={formVal}
            onChange={e => onFormChange(field, e.target.value)}
            className="input"
            style={{ marginTop: 4, padding: '6px 10px', fontSize: 14 }}
            min={0}
          />
        </div>
      ) : (
        <>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            Meta: <span style={{ color: '#94a3b8', fontWeight: 600 }}>{goalDisplay}</span>
          </p>
          <ProgressBar value={actual} goal={goal} color={color} />
        </>
      )}
    </div>
  );
}

export default function Goals() {
  const months = getLast6Months();
  const [selectedMonth, setSelectedMonth] = useState(months[0].key);
  const [goalsData, setGoalsData] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ revenue_goal: 0, deals_goal: 0, clients_goal: 0, activities_goal: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/goals').then(r => setGoalsData(r.data)).catch(() => {});
  }, []);

  const current = goalsData.find(g => g.month === selectedMonth) || {
    month: selectedMonth, revenue_goal: 0, deals_goal: 0, clients_goal: 0, activities_goal: 0,
    actual_revenue: 0, actual_deals: 0, actual_clients: 0, actual_activities: 0,
  };

  const startEdit = () => {
    setForm({
      revenue_goal: current.revenue_goal,
      deals_goal: current.deals_goal,
      clients_goal: current.clients_goal,
      activities_goal: current.activities_goal,
    });
    setEditing(true);
  };

  const handleFormChange = (field, value) => setForm(f => ({ ...f, [field]: parseFloat(value) || 0 }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/goals/${selectedMonth}`, form);
      const res = await api.get('/goals');
      setGoalsData(res.data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Erro ao salvar meta.');
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { field: 'revenue_goal', label: 'Receita', icon: CurrencyDollarIcon, color: 'linear-gradient(135deg, #6366f1, #8b5cf6)', glow: 'rgba(99,102,241,0.15)', actual: current.actual_revenue, goal: current.revenue_goal, formatFn: fmt },
    { field: 'deals_goal',   label: 'Negócios Ganhos', icon: TrophyIcon, color: 'linear-gradient(135deg, #f59e0b, #ef4444)', glow: 'rgba(245,158,11,0.15)', actual: current.actual_deals, goal: current.deals_goal },
    { field: 'clients_goal', label: 'Novos Clientes', icon: UsersIcon, color: 'linear-gradient(135deg, #06b6d4, #3b82f6)', glow: 'rgba(6,182,212,0.15)', actual: current.actual_clients, goal: current.clients_goal },
    { field: 'activities_goal', label: 'Atividades Concluídas', icon: ClipboardDocumentListIcon, color: 'linear-gradient(135deg, #10b981, #06b6d4)', glow: 'rgba(16,185,129,0.15)', actual: current.actual_activities, goal: current.activities_goal },
  ];

  return (
    <div style={{ padding: 32, minHeight: '100%', background: '#070B14' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Metas Mensais
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Defina e acompanhe as metas da equipe mês a mês</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13 }}>Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13 }}>
                <CheckIcon style={{ width: 16, height: 16 }} />
                {saving ? 'Salvando...' : 'Salvar Metas'}
              </button>
            </>
          ) : (
            <button onClick={startEdit} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13 }}>
              <PencilSquareIcon style={{ width: 16, height: 16 }} />
              {saved ? 'Salvo!' : 'Editar Metas'}
            </button>
          )}
        </div>
      </div>

      {/* Seletor de mês */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {months.map(m => (
          <button key={m.key} onClick={() => { setSelectedMonth(m.key); setEditing(false); }} style={{
            padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            border: selectedMonth === m.key ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.07)',
            background: selectedMonth === m.key ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))' : 'rgba(255,255,255,0.03)',
            color: selectedMonth === m.key ? '#a5b4fc' : '#64748b',
            transition: 'all 0.15s',
          }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Cards de metas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map(card => (
          <GoalCard
            key={card.field}
            {...card}
            editing={editing}
            formVal={form[card.field]}
            onFormChange={handleFormChange}
          />
        ))}
      </div>

      {/* Histórico */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Histórico de Desempenho</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Mês', 'Receita', 'Meta Receita', '%', 'Negócios', 'Meta', 'Clientes', 'Meta', 'Atividades', 'Meta'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goalsData.map(row => {
                const pct = row.revenue_goal > 0 ? ((row.actual_revenue / row.revenue_goal) * 100).toFixed(0) : '—';
                const pctColor = pct === '—' ? '#475569' : Number(pct) >= 100 ? '#34d399' : Number(pct) >= 70 ? '#f59e0b' : '#f87171';
                const label = months.find(m => m.key === row.month)?.label || row.month;
                return (
                  <tr key={row.month}
                    onClick={() => { setSelectedMonth(row.month); setEditing(false); }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', background: row.month === selectedMonth ? 'rgba(99,102,241,0.06)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (row.month !== selectedMonth) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = row.month === selectedMonth ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ padding: '12px 16px', color: '#a5b4fc', fontWeight: 600 }}>{fmt(row.actual_revenue)}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{fmt(row.revenue_goal)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: pctColor }}>{pct}{pct !== '—' ? '%' : ''}</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{row.actual_deals}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{row.deals_goal}</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{row.actual_clients}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{row.clients_goal}</td>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0' }}>{row.actual_activities}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{row.activities_goal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
