import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid,
} from 'recharts';
import {
  ArrowDownTrayIcon, ExclamationTriangleIcon, ClockIcon,
  TrophyIcon, UsersIcon, CurrencyDollarIcon, ChartBarIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckCircleIcon,
  XCircleIcon, BoltIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtN = v => new Intl.NumberFormat('pt-BR').format(v ?? 0);

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, gradient, glow, icon: Icon, trend }) {
  const isPositive = trend > 0;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
      padding: '20px 22px', position: 'relative', overflow: 'hidden',
      boxShadow: glow ? `0 0 30px ${glow}` : '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: gradient, opacity: 0.12, transform: 'translate(20px,-20px)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</p>
        {Icon && <Icon style={{ width: 18, height: 18, color: '#334155' }} />}
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {sub && <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{sub}</p>}
        {trend != null && (
          <span style={{ fontSize: 11, fontWeight: 700, color: isPositive ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 2 }}>
            {isPositive ? <ArrowTrendingUpIcon style={{ width: 12, height: 12 }} /> : <ArrowTrendingDownIcon style={{ width: 12, height: 12 }} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Funnel Bar ────────────────────────────────────────────────────────────────
function FunnelBar({ name, count, value, color, conversion, conversionFromPrev, maxCount }) {
  const width = maxCount > 0 ? Math.max(20, (count / maxCount) * 100) : 20;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 110 }}>{name}</span>
        <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${width}%`, height: '100%', background: color, opacity: 0.75, borderRadius: 6, transition: 'width 0.6s ease', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <span style={{ fontSize: 11, color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}>{count} · {fmt(value)}</span>
          </div>
        </div>
        <div style={{ minWidth: 60, textAlign: 'right' }}>
          {conversionFromPrev != null ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: Number(conversionFromPrev) >= 50 ? '#34d399' : Number(conversionFromPrev) >= 25 ? '#f59e0b' : '#f87171' }}>
              {conversionFromPrev}%
            </span>
          ) : <span style={{ fontSize: 11, color: '#475569' }}>—</span>}
        </div>
      </div>
    </div>
  );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#e2e8f0' }}>
      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ margin: '2px 0', color: p.color || '#a5b4fc' }}>{p.name}: {typeof p.value === 'number' && p.value > 999 ? fmt(p.value) : p.value}</p>)}
    </div>
  );
};

// ── Seção ─────────────────────────────────────────────────────────────────────
function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Alert Card ────────────────────────────────────────────────────────────────
function AlertItem({ icon: Icon, color, title, sub, urgency }) {
  const bg = urgency === 'critical' ? 'rgba(239,68,68,0.08)' : urgency === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.08)';
  const border = urgency === 'critical' ? 'rgba(239,68,68,0.2)' : urgency === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.2)';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: bg, border: `1px solid ${border}`, borderRadius: 10, marginBottom: 8 }}>
      <Icon style={{ width: 16, height: 16, color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{title}</p>
        {sub && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);
  const [exporting, setExporting] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadData = useCallback(() => {
    const params = { start: startDate, end: endDate };
    setError(null);
    api.get('/dashboard', { params })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Erro ao carregar dashboard'));
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', { auth: { token }, transports: ['websocket'] });
    socket.on('pipeline_update', loadData);
    socket.on('new_whatsapp_lead', loadData);
    return () => socket.disconnect();
  }, [loadData]);

  const setPeriod = days => {
    const end = new Date(), start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const { data: rows } = await api.get('/dashboard/export-leads', { params: { start: startDate, end: endDate } });
      if (!rows.length) return alert('Nenhum dado no período.');
      const csv = "﻿" + Object.keys(rows[0]).join(';') + '\n' + rows.map(r => Object.values(r).join(';')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a'); a.href = url; a.download = `crm_${startDate}_${endDate}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch { alert('Erro ao exportar.'); } finally { setExporting(false); }
  };

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <ExclamationTriangleIcon style={{ width: 40, height: 40, color: '#f87171' }} />
      <p style={{ color: '#f87171', fontWeight: 600 }}>Erro ao carregar dashboard</p>
      <p style={{ color: '#475569', fontSize: 13 }}>{error}</p>
      <button onClick={loadData} style={{ padding: '8px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Tentar novamente</button>
    </div>
  );

  if (!data) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
      Carregando dashboard...
    </div>
  );

  const { stats, funnel, teamPerformance, lostReasons, activityTypes, monthlyEvolution, leadsOrigin, alerts, recentDeals, upcomingActivities } = data;
  const totalAlerts = (alerts?.stalledDeals?.length || 0) + (alerts?.overdueActivitiesList?.length || 0);
  const maxFunnelCount = funnel?.[0]?.count || 1;

  const metaPct = Math.min(100, stats.percentMeta);
  const metaColor = metaPct >= 100 ? '#10b981' : metaPct >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%', background: '#070B14' }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard {isAdmin ? 'Comercial' : ''}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {totalAlerts > 0 && (
            <span style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#f87171' }}>
              ⚠ {totalAlerts} alerta{totalAlerts > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={handleExport} disabled={exporting} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12 }}>
            <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* ── FILTROS ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['Hoje', 0], ['7 dias', 7], ['30 dias', 30], ['90 dias', 90]].map(([l, d]) => (
            <button key={l} onClick={() => setPeriod(d)} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', cursor: 'pointer', fontWeight: 600 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>De:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" style={{ width: 140, padding: '5px 8px', fontSize: 12 }} />
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Até:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" style={{ width: 140, padding: '5px 8px', fontSize: 12 }} />
        </div>
      </div>

      {/* ── META MENSAL ─────────────────────────────────────────────── */}
      {isAdmin && stats.monthlyGoal > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrophyIcon style={{ width: 16, height: 16, color: metaColor }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Meta Mensal</span>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Realizado: <strong style={{ color: metaColor }}>{fmt(stats.currentMonthWon)}</strong></span>
              <span style={{ color: '#64748b' }}>Meta: <strong style={{ color: '#94a3b8' }}>{fmt(stats.monthlyGoal)}</strong></span>
              <strong style={{ color: metaColor, fontSize: 14 }}>{stats.percentMeta}%</strong>
            </div>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${metaPct}%`, height: '100%', background: `linear-gradient(90deg, ${metaColor}, ${metaColor}aa)`, borderRadius: 999, transition: 'width 0.8s ease' }} />
          </div>
        </div>
      )}

      {/* ── KPIs PRINCIPAIS ─────────────────────────────────────────── */}
      <Section title="Visão Geral Comercial">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          <KpiCard label="Leads Gerados"       value={fmtN(stats.totalLeads)}       gradient="linear-gradient(135deg,#6366f1,#8b5cf6)" glow="rgba(99,102,241,0.15)"  icon={ChartBarIcon} />
          <KpiCard label="Oportunidades Abertas" value={fmtN(stats.openDeals)}       gradient="linear-gradient(135deg,#06b6d4,#3b82f6)" glow="rgba(6,182,212,0.15)"   icon={FunnelIcon} />
          <KpiCard label="Vendas Fechadas"      value={fmtN(stats.wonDeals)}         gradient="linear-gradient(135deg,#10b981,#06b6d4)" glow="rgba(16,185,129,0.15)"  icon={CheckCircleIcon} />
          <KpiCard label="Receita Gerada"       value={fmt(stats.wonValue)}          gradient="linear-gradient(135deg,#10b981,#84cc16)" glow="rgba(16,185,129,0.15)"  icon={CurrencyDollarIcon} />
          <KpiCard label="Ticket Médio"         value={fmt(stats.ticketMedio)}       gradient="linear-gradient(135deg,#f59e0b,#f97316)" glow="rgba(245,158,11,0.15)"  icon={ArrowTrendingUpIcon} />
          <KpiCard label="Taxa de Conversão"    value={`${stats.conversionRate}%`}   gradient="linear-gradient(135deg,#8b5cf6,#6366f1)" glow="rgba(139,92,246,0.15)"  icon={BoltIcon} />
          <KpiCard label="Em Negociação"        value={fmt(stats.pipelineValue)}     gradient="linear-gradient(135deg,#f59e0b,#ef4444)" glow="rgba(245,158,11,0.15)"  icon={CurrencyDollarIcon} />
          <KpiCard label="Clientes Ativos"      value={fmtN(stats.totalClients)}     gradient="linear-gradient(135deg,#06b6d4,#6366f1)" glow="rgba(6,182,212,0.15)"  icon={UsersIcon}
            trend={stats.growth != null ? Number(stats.growth) : null} />
          <KpiCard label="Atividades Pendentes" value={fmtN(stats.pendingActivities)} gradient="linear-gradient(135deg,#ef4444,#f97316)" glow="rgba(239,68,68,0.1)"
            sub={stats.overdueActivities > 0 ? `${stats.overdueActivities} vencidas` : undefined} icon={ClockIcon} />
        </div>
      </Section>

      {/* ── FUNIL + ORIGEM ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 28 }}>
        {/* Funil de Vendas */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Funil de Vendas</p>
            <span style={{ fontSize: 11, color: '#475569' }}>conv. da etapa anterior</span>
          </div>
          {funnel?.map(stage => (
            <FunnelBar key={stage.id} {...stage} maxCount={maxFunnelCount} />
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 12, paddingTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div><p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Negócios ganhos</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#34d399' }}>{stats.wonDeals}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Negócios perdidos</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f87171' }}>{stats.lostDeals}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>Conversão geral</p><p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#a5b4fc' }}>{stats.conversionRate}%</p></div>
          </div>
        </div>

        {/* Origem + Atividades */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Origem */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, flex: 1 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Origem de Leads</p>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={leadsOrigin} innerRadius={35} outerRadius={50} paddingAngle={4} dataKey="value">
                  {leadsOrigin?.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Atividades por tipo */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Atividades por Tipo</p>
            {(activityTypes || []).map(a => (
              <div key={a.type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{a.type === 'call' ? '📞 Ligação' : a.type === 'email' ? '✉ E-mail' : a.type === 'meeting' ? '🤝 Reunião' : '📋 ' + a.type}</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>{a.concluidas} ✓</span>
                  <span style={{ color: '#f59e0b' }}>{a.pendentes} ⏳</span>
                </div>
              </div>
            ))}
            {(!activityTypes || activityTypes.length === 0) && <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Sem atividades no período</p>}
          </div>
        </div>
      </div>

      {/* ── EVOLUÇÃO MENSAL ─────────────────────────────────────────── */}
      <Section title="Evolução Mensal (6 meses)">
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyEvolution}>
              <defs>
                <linearGradient id="gReceit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area yAxisId="left"  type="monotone" dataKey="receita" name="Receita" stroke="#6366f1" fill="url(#gReceit)" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="leads"   name="Leads"   stroke="#10b981" fill="url(#gLeads)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* ── DESEMPENHO DA EQUIPE ─────────────────────────────────────── */}
      <Section title="Desempenho da Equipe Comercial">
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['#', 'Vendedor', 'Leads', 'Vendas', 'Perdidos', 'Receita', 'Ticket Médio', 'Conversão', 'Atividades'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(teamPerformance || []).map((t, i) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px', color: '#475569', fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>{t.vendedor}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{t.leads}</td>
                  <td style={{ padding: '12px 16px', color: '#34d399', fontWeight: 600 }}>{t.vendas}</td>
                  <td style={{ padding: '12px 16px', color: '#f87171' }}>{t.perdidos}</td>
                  <td style={{ padding: '12px 16px', color: '#a5b4fc', fontWeight: 600 }}>{fmt(t.receita)}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{fmt(t.ticketMedio)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: Number(t.conversao) >= 20 ? 'rgba(16,185,129,0.15)' : Number(t.conversao) >= 10 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color:      Number(t.conversao) >= 20 ? '#34d399'               : Number(t.conversao) >= 10 ? '#f59e0b'               : '#f87171',
                    }}>{t.conversao}%</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{t.atividades}</td>
                </tr>
              ))}
              {(!teamPerformance || teamPerformance.length === 0) && (
                <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#475569' }}>Nenhum dado de equipe</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── MOTIVOS DE PERDA + ALERTAS ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Motivos de Perda */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Motivos de Perda</p>
          {(lostReasons || []).length === 0
            ? <p style={{ color: '#475569', fontSize: 13 }}>Nenhuma perda registrada no período</p>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={lostReasons} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Negócios" radius={[0, 4, 4, 0]} fill="#ef4444" opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Alertas */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24, overflowY: 'auto', maxHeight: 320 }}>
          <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
            Alertas <span style={{ fontSize: 12, color: '#f87171', marginLeft: 6 }}>{totalAlerts > 0 ? `${totalAlerts} ativo${totalAlerts > 1 ? 's' : ''}` : ''}</span>
          </p>
          {(alerts?.stalledDeals || []).map(d => (
            <AlertItem key={d.id} icon={ExclamationTriangleIcon} color="#f59e0b" urgency={d.dias_parado > 14 ? 'critical' : 'warning'}
              title={`${d.title} — parado há ${d.dias_parado} dias`}
              sub={`${d.stage_name} · ${d.client_name || 'Sem cliente'} · ${fmt(d.value)}`} />
          ))}
          {(alerts?.overdueActivitiesList || []).map(a => (
            <AlertItem key={a.id} icon={ClockIcon} color="#ef4444" urgency="critical"
              title={`${a.title} — ${a.dias_atraso} dia${a.dias_atraso > 1 ? 's' : ''} vencida`}
              sub={`${a.type} · ${a.responsavel || 'Sem responsável'} · ${a.client_name || ''}`} />
          ))}
          {totalAlerts === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399', fontSize: 13 }}>
              <CheckCircleIcon style={{ width: 16, height: 16 }} />
              Tudo em dia! Nenhum alerta ativo.
            </div>
          )}
        </div>
      </div>

      {/* ── NEGÓCIOS RECENTES + PRÓXIMAS ATIVIDADES ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Negócios Recentes */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Negócios Recentes</p>
            <Link to="/app/pipeline" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Ver pipeline →</Link>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {(recentDeals || []).map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 20px' }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>{d.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{d.client_name || '—'} · {d.vendedor || 'Sem responsável'}</p>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: (d.stage_color || '#6366f1') + '22', color: d.stage_color || '#a5b4fc' }}>{d.stage_name}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#a5b4fc', fontWeight: 600 }}>{fmt(d.value)}</td>
                  <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: d.status === 'won' ? 'rgba(16,185,129,0.15)' : d.status === 'lost' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
                      color:      d.status === 'won' ? '#34d399'               : d.status === 'lost' ? '#f87171'               : '#a5b4fc',
                    }}>{d.status === 'won' ? 'Ganho' : d.status === 'lost' ? 'Perdido' : 'Aberto'}</span>
                  </td>
                </tr>
              ))}
              {(!recentDeals || recentDeals.length === 0) && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#475569' }}>Nenhum negócio no período</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Próximas Atividades */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Próximas Atividades</p>
          {(upcomingActivities || []).length === 0
            ? <p style={{ color: '#475569', fontSize: 12 }}>Nenhuma atividade agendada</p>
            : (upcomingActivities || []).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: 5 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{a.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>
                    {a.due_date ? new Date(a.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sem data'}
                    {a.client_name ? ` · ${a.client_name}` : ''}
                  </p>
                </div>
              </div>
            ))}
          <Link to="/app/activities" style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Ver todas →</Link>
        </div>
      </div>
    </div>
  );
}
