import { useState, useEffect, useCallback } from 'react';
import {
  MegaphoneIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, PhoneIcon,
  PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, PaperAirplaneIcon,
  UserPlusIcon, XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon,
  CurrencyDollarIcon, UsersIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

const TYPE_CFG = {
  whatsapp: { label: 'WhatsApp', Icon: ChatBubbleLeftRightIcon, color: '#25d366' },
  email:    { label: 'E-mail',   Icon: EnvelopeIcon,            color: '#3b82f6' },
  ligacao:  { label: 'Ligação',  Icon: PhoneIcon,               color: '#f59e0b' },
  generic:  { label: 'Geral',    Icon: MegaphoneIcon,           color: '#8b5cf6' },
};

const STATUS_CFG = {
  draft:     { label: 'Rascunho', bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
  active:    { label: 'Ativa',    bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  paused:    { label: 'Pausada',  bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  completed: { label: 'Concluída',bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
};

const CLI_STATUS = {
  pending:   { label: 'Pendente',   color: '#64748b' },
  sent:      { label: 'Enviado',    color: '#60a5fa' },
  responded: { label: 'Respondeu',  color: '#fbbf24' },
  converted: { label: 'Convertido', color: '#34d399' },
};

const CARD = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'20px 22px' };
const btn = (extra={}) => ({ padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s', ...extra });
const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none' };

const DEFAULT_FORM = { name:'', description:'', type:'generic', status:'draft', start_date:'', end_date:'', goal_leads:0, goal_revenue:0, budget:0, message_template:'' };

function ProgressBar({ label, current, goal, color='#6366f1', fmtFn }) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const done = pct >= 100;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#64748b', marginBottom:4 }}>
        <span>{label}</span>
        <span style={{ color: done ? '#34d399' : '#94a3b8' }}>
          {fmtFn ? fmtFn(current) : current} / {fmtFn ? fmtFn(goal) : goal}
          {done && ' ✓'}
        </span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.6s' }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color='#6366f1', Icon }) {
  return (
    <div style={{ ...CARD, padding:'16px 18px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <p style={{ margin:'0 0 8px', fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</p>
        {Icon && <Icon style={{ width:16, height:16, color:'#334155' }} />}
      </div>
      <p style={{ margin:0, fontSize:22, fontWeight:800, color }}>{value}</p>
    </div>
  );
}

// ── FORMULÁRIO CRIAR/EDITAR ───────────────────────────────────────────────────
function CampaignForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/campaigns/${initial.id}`, form);
      else await api.post('/campaigns', form);
      onSave();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar campanha');
    } finally { setSaving(false); }
  };

  const showTemplate = form.type === 'whatsapp' || form.type === 'email';

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:560, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#f1f5f9' }}>{initial?.id ? 'Editar Campanha' : 'Nova Campanha'}</h2>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:6, cursor:'pointer', color:'#64748b', display:'flex' }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>NOME *</label>
            <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Nome da campanha" />
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>DESCRIÇÃO</label>
            <textarea style={{ ...inputStyle, minHeight:70, resize:'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Objetivo da campanha..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>TIPO</label>
              <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>STATUS</label>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>INÍCIO</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>FIM</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>META LEADS</label>
              <input type="number" min="0" style={inputStyle} value={form.goal_leads} onChange={e => set('goal_leads', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>META RECEITA (R$)</label>
              <input type="number" min="0" style={inputStyle} value={form.goal_revenue} onChange={e => set('goal_revenue', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>ORÇAMENTO (R$)</label>
              <input type="number" min="0" style={inputStyle} value={form.budget} onChange={e => set('budget', Number(e.target.value))} />
            </div>
          </div>
          {showTemplate && (
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>
                TEMPLATE DE MENSAGEM
                <span style={{ color:'#6366f1', fontWeight:400, marginLeft:8 }}>use {'{nome}'} para personalizar</span>
              </label>
              <textarea style={{ ...inputStyle, minHeight:100, resize:'vertical', fontFamily:'monospace' }}
                value={form.message_template} onChange={e => set('message_template', e.target.value)}
                placeholder="Olá {nome}, temos uma oferta especial para você..." />
            </div>
          )}
          <div style={{ display:'flex', gap:10, marginTop:6 }}>
            <button type="submit" disabled={saving} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', opacity: saving ? 0.6 : 1 }) }}>
              {saving ? 'Salvando...' : initial?.id ? 'Salvar Alterações' : 'Criar Campanha'}
            </button>
            <button type="button" onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── MODAL ADICIONAR CLIENTES ──────────────────────────────────────────────────
function AddClientsModal({ campaignId, existingIds, onDone, onClose }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data.filter(c => !existingIds.includes(c.id))));
  }, []);

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const handleAdd = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      await api.post(`/campaigns/${campaignId}/clients`, { client_ids: [...selected] });
      onDone();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar clientes');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:520, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:24, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#f1f5f9' }}>Adicionar Clientes</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#64748b', display:'flex' }}><XMarkIcon style={{ width:18, height:18 }} /></button>
        </div>
        <input style={{ ...inputStyle, marginBottom:12 }} placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', cursor:'pointer', marginBottom:4 }} onClick={toggleAll}>
              <input type="checkbox" readOnly checked={selected.size === filtered.length && filtered.length > 0} style={{ cursor:'pointer' }} />
              <span style={{ fontSize:12, color:'#64748b' }}>Selecionar todos ({filtered.length})</span>
            </div>
          )}
          {filtered.map(c => (
            <div key={c.id} onClick={() => toggle(c.id)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, cursor:'pointer', background: selected.has(c.id) ? 'rgba(99,102,241,0.12)' : 'transparent', marginBottom:2, transition:'background 0.15s' }}>
              <input type="checkbox" readOnly checked={selected.has(c.id)} style={{ cursor:'pointer' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{c.name}</p>
                <p style={{ margin:0, fontSize:11, color:'#475569' }}>{c.phone || 'Sem telefone'}{c.company ? ` · ${c.company}` : ''}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ textAlign:'center', color:'#475569', fontSize:13, padding:20 }}>Nenhum cliente disponível</p>}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:14, borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:14 }}>
          <button onClick={handleAdd} disabled={saving || !selected.size} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', opacity: (!selected.size || saving) ? 0.5 : 1 }) }}>
            {saving ? 'Adicionando...' : `Adicionar ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── VISÃO DETALHADA ───────────────────────────────────────────────────────────
function DetailView({ campaignId, onBack, onEdit }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('clientes');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    api.get(`/campaigns/${campaignId}`).then(r => setData(r.data)).catch(() => {});
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (clientId, status) => {
    await api.patch(`/campaigns/${campaignId}/clients/${clientId}/status`, { status });
    load();
  };

  const handleRemove = async clientId => {
    if (!confirm('Remover cliente da campanha?')) return;
    await api.delete(`/campaigns/${campaignId}/clients/${clientId}`);
    load();
  };

  const handleSendWhatsApp = async () => {
    if (!confirm(`Enviar mensagem para todos os clientes com status "Pendente"?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await api.post(`/campaigns/${campaignId}/send-whatsapp`);
      setSendResult(r.data);
      load();
    } catch (err) {
      setSendResult({ error: err.response?.data?.error || 'Erro ao enviar' });
    } finally { setSending(false); }
  };

  if (!data) return <div style={{ textAlign:'center', padding:60, color:'#475569' }}>Carregando...</div>;

  const type = TYPE_CFG[data.type] || TYPE_CFG.generic;
  const status = STATUS_CFG[data.status] || STATUS_CFG.draft;
  const { stats } = data;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:24 }}>
        <button onClick={onBack} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8', padding:'8px 12px' }), display:'flex', alignItems:'center', gap:6 }}>
          <ArrowLeftIcon style={{ width:16, height:16 }} /> Voltar
        </button>
        <div style={{ width:40, height:40, borderRadius:10, background:`${type.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <type.Icon style={{ width:20, height:20, color:type.color }} />
        </div>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:'0 0 2px', fontSize:18, fontWeight:700, color:'#f1f5f9' }}>{data.name}</h2>
          <p style={{ margin:0, fontSize:12, color:'#64748b' }}>{type.label} · {fmtD(data.start_date)} → {fmtD(data.end_date)}</p>
        </div>
        <span style={{ ...btn(), background: status.bg, color: status.color }}>{status.label}</span>
        <button onClick={onEdit} style={{ ...btn({ background:'rgba(99,102,241,0.15)', color:'#a5b4fc' }), display:'flex', alignItems:'center', gap:6 }}>
          <PencilIcon style={{ width:14, height:14 }} /> Editar
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:24 }}>
        <StatCard label="Clientes" value={stats.total_clientes} Icon={UsersIcon} />
        <StatCard label="Enviados" value={stats.enviados} color="#60a5fa" />
        <StatCard label="Responderam" value={stats.responderam} color="#fbbf24" />
        <StatCard label="Convertidos" value={stats.convertidos} color="#34d399" />
        <StatCard label="Taxa Resposta" value={`${stats.taxa_resposta}%`} color="#8b5cf6" />
        <StatCard label="Taxa Conversão" value={`${stats.taxa_conversao}%`} color="#10b981" />
        <StatCard label="Receita" value={fmt(stats.revenue)} Icon={CurrencyDollarIcon} color="#34d399" />
        {stats.roi !== null && <StatCard label="ROI" value={`${stats.roi}%`} color={Number(stats.roi) >= 0 ? '#34d399' : '#f87171'} Icon={ArrowTrendingUpIcon} />}
      </div>

      {/* Metas */}
      {(data.goal_leads > 0 || data.goal_revenue > 0) && (
        <div style={{ ...CARD, marginBottom:20 }}>
          <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'1.5px' }}>Progresso das Metas</p>
          {data.goal_leads > 0 && <ProgressBar label="Meta de Leads" current={stats.responderam} goal={data.goal_leads} color="#8b5cf6" />}
          {data.goal_revenue > 0 && <ProgressBar label="Meta de Receita" current={stats.revenue} goal={data.goal_revenue} color="#10b981" fmtFn={fmt} />}
          {data.budget > 0 && <ProgressBar label="Orçamento Utilizado" current={0} goal={data.budget} color="#f59e0b" fmtFn={fmt} />}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:1 }}>
        {[['clientes','Clientes'], ['envio','Envio WhatsApp']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btn({ background:'transparent', color: tab===k ? '#a5b4fc' : '#475569', borderBottom: tab===k ? '2px solid #6366f1' : '2px solid transparent', borderRadius:0, paddingBottom:10 }) }}>{l}</button>
        ))}
      </div>

      {/* Tab: Clientes */}
      {tab === 'clientes' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button onClick={() => setShowAdd(true)} style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white' }), display:'flex', alignItems:'center', gap:6 }}>
              <UserPlusIcon style={{ width:15, height:15 }} /> Adicionar Clientes
            </button>
          </div>
          <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                  {['Cliente','Telefone','Status','Ações'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, color:'#475569', fontWeight:600, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.clients.length === 0 && (
                  <tr><td colSpan={4} style={{ padding:32, textAlign:'center', color:'#475569', fontSize:13 }}>Nenhum cliente na campanha. Clique em "Adicionar Clientes".</td></tr>
                )}
                {data.clients.map(c => {
                  const cs = CLI_STATUS[c.status] || CLI_STATUS.pending;
                  return (
                    <tr key={c.client_id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'12px 16px' }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{c.name}</p>
                        {c.company && <p style={{ margin:0, fontSize:11, color:'#475569' }}>{c.company}</p>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:12, color:'#94a3b8' }}>{c.phone || '—'}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <select value={c.status} onChange={e => handleStatusChange(c.client_id, e.target.value)}
                          style={{ background:'transparent', border:`1px solid ${cs.color}44`, borderRadius:6, padding:'4px 8px', fontSize:12, color:cs.color, cursor:'pointer', outline:'none' }}>
                          {Object.entries(CLI_STATUS).map(([k,v]) => <option key={k} value={k} style={{ background:'#0f172a', color:v.color }}>{v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <button onClick={() => handleRemove(c.client_id)} style={{ ...btn({ background:'rgba(239,68,68,0.1)', color:'#f87171', padding:'5px 8px' }) }}>
                          <TrashIcon style={{ width:13, height:13 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Envio WhatsApp */}
      {tab === 'envio' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {data.type !== 'whatsapp' && (
            <div style={{ ...CARD, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', display:'flex', alignItems:'center', gap:10 }}>
              <ExclamationTriangleIcon style={{ width:18, height:18, color:'#fbbf24', flexShrink:0 }} />
              <p style={{ margin:0, fontSize:13, color:'#fbbf24' }}>Esta campanha é do tipo <b>{TYPE_CFG[data.type]?.label}</b>. O envio via WhatsApp só é recomendado para campanhas do tipo WhatsApp.</p>
            </div>
          )}
          <div style={{ ...CARD }}>
            <p style={{ margin:'0 0 10px', fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'1.5px' }}>Template de Mensagem</p>
            {data.message_template ? (
              <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#e2e8f0', lineHeight:1.6, whiteSpace:'pre-wrap', fontFamily:'monospace' }}>
                {data.message_template}
              </div>
            ) : (
              <p style={{ margin:0, fontSize:13, color:'#475569' }}>Nenhum template definido. <button onClick={onEdit} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:13 }}>Editar campanha</button> para adicionar.</p>
            )}
          </div>
          <div style={{ ...CARD }}>
            <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'1.5px' }}>Envio em Massa</p>
            <p style={{ margin:'0 0 14px', fontSize:12, color:'#64748b' }}>
              Serão enviadas mensagens para <b style={{ color:'#e2e8f0' }}>{stats.pendentes}</b> cliente(s) com status "Pendente" que possuam telefone cadastrado.
              O texto {'{nome}'} será substituído pelo nome do cliente.
            </p>
            <button onClick={handleSendWhatsApp} disabled={sending || stats.pendentes === 0 || !data.message_template}
              style={{ ...btn({ background:'linear-gradient(135deg,#25d366,#128c7e)', color:'white', opacity: (sending || stats.pendentes === 0 || !data.message_template) ? 0.5 : 1 }), display:'flex', alignItems:'center', gap:8 }}>
              <PaperAirplaneIcon style={{ width:16, height:16 }} />
              {sending ? 'Enviando...' : `Enviar para ${stats.pendentes} cliente(s)`}
            </button>
            {sendResult && (
              <div style={{ marginTop:14, padding:'12px 14px', borderRadius:10, background: sendResult.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border:`1px solid ${sendResult.error ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                {sendResult.error ? (
                  <p style={{ margin:0, fontSize:13, color:'#f87171' }}>{sendResult.error}</p>
                ) : (
                  <>
                    <p style={{ margin:'0 0 4px', fontSize:13, fontWeight:700, color:'#34d399' }}>
                      <CheckCircleIcon style={{ width:14, height:14, display:'inline', marginRight:6 }} />
                      {sendResult.sent} enviado(s) · {sendResult.failed} falha(s) de {sendResult.total}
                    </p>
                    {sendResult.errors?.length > 0 && (
                      <ul style={{ margin:'8px 0 0', paddingLeft:16, fontSize:11, color:'#f87171' }}>
                        {sendResult.errors.map((e, i) => <li key={i}>{e.cliente}: {e.erro}</li>)}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <AddClientsModal campaignId={campaignId} existingIds={data.clients.map(c => c.client_id)}
          onDone={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [detailId, setDetailId]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/campaigns').then(r => setCampaigns(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async id => {
    if (!confirm('Excluir campanha e todos os dados associados?')) return;
    await api.delete(`/campaigns/${id}`);
    load();
  };

  const openEdit = c => { setEditing(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };
  const afterSave = () => { closeForm(); load(); if (detailId) setDetailId(detailId); };

  const filters = [
    { k:'all',       l:'Todas' },
    { k:'active',    l:'Ativas' },
    { k:'draft',     l:'Rascunhos' },
    { k:'paused',    l:'Pausadas' },
    { k:'completed', l:'Concluídas' },
  ];

  const visible = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  const totalAtivos    = campaigns.filter(c => c.status === 'active').length;
  const totalClientes  = campaigns.reduce((s, c) => s + (c.total_clientes || 0), 0);
  const totalConvertidos = campaigns.reduce((s, c) => s + (c.convertidos || 0), 0);

  if (detailId) {
    const camp = campaigns.find(c => c.id === detailId);
    return (
      <div style={{ padding:'0 4px' }}>
        <DetailView
          campaignId={detailId}
          onBack={() => { setDetailId(null); load(); }}
          onEdit={() => { if (camp) openEdit(camp); }}
        />
        {showForm && <CampaignForm initial={editing} onSave={() => { afterSave(); }} onClose={closeForm} />}
      </div>
    );
  }

  return (
    <div style={{ padding:'0 4px' }}>
      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#f1f5f9' }}>Campanhas</h1>
          <p style={{ margin:0, fontSize:13, color:'#64748b' }}>Gerencie campanhas de marketing e vendas</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white' }), display:'flex', alignItems:'center', gap:8 }}>
          <PlusIcon style={{ width:16, height:16 }} /> Nova Campanha
        </button>
      </div>

      {/* KPIs rápidos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
        <StatCard label="Campanhas Ativas" value={totalAtivos} color="#34d399" Icon={MegaphoneIcon} />
        <StatCard label="Total Clientes" value={totalClientes} Icon={UsersIcon} />
        <StatCard label="Convertidos" value={totalConvertidos} color="#10b981" Icon={CheckCircleIcon} />
        <StatCard label="Total Campanhas" value={campaigns.length} color="#8b5cf6" />
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {filters.map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...btn({ background: filter===k ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', color: filter===k ? '#a5b4fc' : '#64748b', border:`1px solid ${filter===k ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}` }) }}>
            {l} {k === 'all' ? `(${campaigns.length})` : `(${campaigns.filter(c => c.status === k).length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ textAlign:'center', color:'#475569', padding:40 }}>Carregando...</p>
      ) : visible.length === 0 ? (
        <div style={{ ...CARD, textAlign:'center', padding:48 }}>
          <MegaphoneIcon style={{ width:40, height:40, color:'#334155', margin:'0 auto 12px' }} />
          <p style={{ margin:'0 0 6px', fontSize:15, fontWeight:600, color:'#64748b' }}>Nenhuma campanha encontrada</p>
          <p style={{ margin:'0 0 20px', fontSize:13, color:'#475569' }}>Crie sua primeira campanha para começar</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white' }), display:'inline-flex', alignItems:'center', gap:8 }}>
            <PlusIcon style={{ width:16, height:16 }} /> Nova Campanha
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {visible.map(c => {
            const type = TYPE_CFG[c.type] || TYPE_CFG.generic;
            const status = STATUS_CFG[c.status] || STATUS_CFG.draft;
            return (
              <div key={c.id} style={{ ...CARD, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:`${type.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <type.Icon style={{ width:18, height:18, color:type.color }} />
                    </div>
                    <div style={{ minWidth:0 }}>
                      <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#f1f5f9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                      <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{type.label} · {fmtD(c.start_date)} → {fmtD(c.end_date)}</p>
                    </div>
                  </div>
                  <span style={{ padding:'4px 10px', borderRadius:6, background:status.bg, color:status.color, fontSize:11, fontWeight:700, flexShrink:0 }}>{status.label}</span>
                </div>
                {c.description && <p style={{ margin:0, fontSize:12, color:'#64748b', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{c.description}</p>}
                <div style={{ display:'flex', gap:12, fontSize:12, flexWrap:'wrap' }}>
                  <span style={{ color:'#94a3b8' }}><b style={{ color:'#e2e8f0' }}>{c.total_clientes}</b> clientes</span>
                  <span style={{ color:'#94a3b8' }}><b style={{ color:'#60a5fa' }}>{c.enviados}</b> enviados</span>
                  <span style={{ color:'#94a3b8' }}><b style={{ color:'#fbbf24' }}>{c.responderam}</b> responderam</span>
                  <span style={{ color:'#94a3b8' }}><b style={{ color:'#34d399' }}>{c.convertidos}</b> convertidos</span>
                </div>
                <div>
                  {c.goal_leads > 0 && <ProgressBar label="Meta de Leads" current={c.responderam} goal={c.goal_leads} color="#8b5cf6" />}
                  {c.goal_revenue > 0 && <ProgressBar label="Meta de Receita" current={0} goal={c.goal_revenue} color="#10b981" fmtFn={fmt} />}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setDetailId(c.id)} style={{ ...btn({ flex:1, background:'rgba(99,102,241,0.15)', color:'#a5b4fc' }) }}>Ver detalhes</button>
                  <button onClick={() => openEdit(c)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8', padding:'8px 10px' }) }}><PencilIcon style={{ width:14, height:14 }} /></button>
                  <button onClick={() => handleDelete(c.id)} style={{ ...btn({ background:'rgba(239,68,68,0.1)', color:'#f87171', padding:'8px 10px' }) }}><TrashIcon style={{ width:14, height:14 }} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <CampaignForm initial={editing} onSave={afterSave} onClose={closeForm} />}
    </div>
  );
}
