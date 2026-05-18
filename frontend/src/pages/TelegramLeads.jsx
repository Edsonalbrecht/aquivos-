import { useEffect, useState, useRef } from 'react';
import {
  PaperAirplaneIcon, ChatBubbleLeftRightIcon,
  ArrowPathIcon, TrashIcon, UsersIcon,
  MagnifyingGlassIcon, XMarkIcon, Cog6ToothIcon,
  CheckCircleIcon, WifiIcon, KeyIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const STATUS_CFG = {
  new:       { label: 'Novo',       color: '#6366f1' },
  contacted: { label: 'Contactado', color: '#f59e0b' },
  converted: { label: 'Convertido', color: '#10b981' },
  ignored:   { label: 'Ignorado',   color: '#475569' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#64748b' };
  return (
    <span style={{ padding:'2px 8px', borderRadius:6, background:`${cfg.color}22`, color:cfg.color, fontSize:11, fontWeight:700 }}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color='#6366f1' }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'16px 20px', flex:1, minWidth:120 }}>
      <p style={{ margin:'0 0 4px', fontSize:11, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</p>
      <p style={{ margin:0, fontSize:26, fontWeight:800, color }}>{value}</p>
    </div>
  );
}

const inp = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none' };
const btn = (extra={}) => ({ padding:'9px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:6, transition:'all 0.15s', ...extra });
function Label({ children }) {
  return <label style={{ fontSize:11, color:'#64748b', fontWeight:700, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.5px' }}>{children}</label>;
}

/* ── Modal de configuração do bot ── */
function ConfigModal({ onClose, onSaved }) {
  const [cfg, setCfg]         = useState({ bot_token:'', notification_chat_id:'', auto_create_lead:1, welcome_message:'', notifications_enabled:0 });
  const [status, setStatus]   = useState(null);
  const [webhookUrl, setWUrl] = useState('');
  const [msg, setMsg]         = useState('');
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    api.get('/telegram/config').then(r => {
      const d = r.data || {};
      setCfg(c => ({ ...c, notification_chat_id: d.notification_chat_id||'', auto_create_lead: d.auto_create_lead ?? 1, welcome_message: d.welcome_message||'', notifications_enabled: d.notifications_enabled ?? 0 }));
      setStatus({ configured: d.token_configured, preview: d.token_preview, username: d.bot_username });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/telegram/config', cfg);
      setDone(true); setTimeout(() => setDone(false), 2500);
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const testConn = async () => {
    setMsg('Testando...');
    try {
      const { data: r } = await api.post('/telegram/test-connection', { bot_token: cfg.bot_token });
      setMsg(`✓ Bot: @${r.bot.username} — ${r.bot.first_name}`);
      api.get('/telegram/config').then(r => setStatus({ configured: r.data.token_configured, preview: r.data.token_preview, username: r.data.bot_username }));
    } catch (err) { setMsg(`✗ ${err.response?.data?.error || 'Erro'}`); }
  };

  const setWebhook = async () => {
    if (!webhookUrl.trim()) return setMsg('Informe a URL do servidor');
    setMsg('Registrando...');
    try {
      const { data: r } = await api.post('/telegram/set-webhook', { webhook_url: webhookUrl.trim() });
      setMsg(`✓ Webhook: ${r.url}`);
    } catch (err) { setMsg(`✗ ${err.response?.data?.error || 'Erro'}`); }
  };

  const delWebhook = async () => {
    setMsg('Removendo...');
    try {
      const { data: r } = await api.post('/telegram/delete-webhook');
      setMsg(`✓ ${r.message || 'Webhook removido'}`);
    } catch (err) { setMsg(`✗ ${err.response?.data?.error || 'Erro'}`); }
  };

  const msgColor = msg.startsWith('✓') ? '#34d399' : msg.includes('...') ? '#94a3b8' : '#f87171';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)' }}>
      <div style={{ background:'#0f1623', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, width:'100%', maxWidth:560, maxHeight:'92vh', overflowY:'auto', padding:28, position:'relative' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg,#29b6f6,#0288d1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PaperAirplaneIcon style={{ width:18, height:18, color:'white' }} />
            </div>
            <div>
              <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#f1f5f9' }}>Configurar Telegram Bot</p>
              {status?.configured
                ? <p style={{ margin:0, fontSize:11, color:'#34d399' }}>✓ Conectado {status.username && `· ${status.username}`}</p>
                : <p style={{ margin:0, fontSize:11, color:'#f87171' }}>Bot não configurado</p>}
            </div>
          </div>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'6px 10px' }) }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>

        {/* Token */}
        <div style={{ marginBottom:14 }}>
          <Label>Bot Token <span style={{ color:'#475569', textTransform:'none', fontWeight:400 }}>{status?.configured ? `(atual: ${status.preview})` : '(obrigatório)'}</span></Label>
          <div style={{ display:'flex', gap:8 }}>
            <input type="password" style={{ ...inp, flex:1 }} value={cfg.bot_token} onChange={e => setCfg(c => ({ ...c, bot_token: e.target.value }))} placeholder="123456789:AABBcc..." />
            <button onClick={testConn} style={{ ...btn({ background:'rgba(41,182,246,0.12)', color:'#29b6f6', whiteSpace:'nowrap' }) }}>
              <WifiIcon style={{ width:14, height:14 }} /> Testar
            </button>
          </div>
          <p style={{ margin:'5px 0 0', fontSize:11, color:'#334155' }}>Obtenha em <strong style={{ color:'#94a3b8' }}>@BotFather</strong> no Telegram.</p>
        </div>

        {/* Webhook */}
        <div style={{ marginBottom:14 }}>
          <Label>URL do servidor (para registrar webhook)</Label>
          <div style={{ display:'flex', gap:8 }}>
            <input style={{ ...inp, flex:1 }} value={webhookUrl} onChange={e => setWUrl(e.target.value)} placeholder="https://seudominio.com" />
            <button onClick={setWebhook} style={{ ...btn({ background:'rgba(99,102,241,0.12)', color:'#a5b4fc', whiteSpace:'nowrap' }) }}>Registrar</button>
            <button onClick={delWebhook} style={{ ...btn({ background:'rgba(248,113,113,0.1)', color:'#f87171', whiteSpace:'nowrap' }) }}>Remover</button>
          </div>
          <p style={{ margin:'5px 0 0', fontSize:11, color:'#334155' }}>O webhook será registrado em: <code style={{ color:'#64748b' }}>/api/telegram/webhook</code></p>
        </div>

        {msg && <p style={{ margin:'0 0 14px', fontSize:12, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', color:msgColor }}>{msg}</p>}

        {/* Notificações */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <Label>Chat ID para notificações</Label>
            <input style={inp} value={cfg.notification_chat_id} onChange={e => setCfg(c => ({ ...c, notification_chat_id: e.target.value }))} placeholder="-1001234567890" />
          </div>
          <div>
            <Label>Mensagem de boas-vindas</Label>
            <input style={inp} value={cfg.welcome_message} onChange={e => setCfg(c => ({ ...c, welcome_message: e.target.value }))} placeholder="Olá! Como posso ajudar?" />
          </div>
        </div>

        <div style={{ display:'flex', gap:20, marginBottom:22 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#94a3b8' }}>
            <input type="checkbox" checked={!!cfg.auto_create_lead} onChange={e => setCfg(c => ({ ...c, auto_create_lead: e.target.checked ? 1 : 0 }))} />
            Criar lead automaticamente
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#94a3b8' }}>
            <input type="checkbox" checked={!!cfg.notifications_enabled} onChange={e => setCfg(c => ({ ...c, notifications_enabled: e.target.checked ? 1 : 0 }))} />
            Notificações de CRM habilitadas
          </label>
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b' }) }}>Fechar</button>
          <button onClick={save} disabled={saving} style={{ ...btn({ background: done ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#29b6f6,#0288d1)', color: done ? '#34d399' : 'white', opacity:saving?0.7:1 }) }}>
            {done ? <><CheckCircleIcon style={{ width:14, height:14 }} /> Salvo!</> : saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TelegramLeads() {
  const [leads, setLeads]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch]     = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [showCfg, setShowCfg]   = useState(false);
  const msgEndRef = useRef(null);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const [lr, sr] = await Promise.all([api.get('/telegram/leads'), api.get('/telegram/stats')]);
      setLeads(lr.data);
      setStats(sr.data);
    } finally { setLoading(false); }
  };

  const loadMessages = async (lead) => {
    setSelected(lead);
    const { data } = await api.get(`/telegram/messages/${lead.telegram_id}`);
    setMessages(data);
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
  };

  useEffect(() => { loadLeads(); }, []);
  useEffect(() => {
    if (!selected) return;
    const id = setInterval(() => {
      api.get(`/telegram/messages/${selected.telegram_id}`).then(r => setMessages(r.data));
    }, 5000);
    return () => clearInterval(id);
  }, [selected]);

  const sendMessage = async () => {
    if (!sendText.trim() || !selected) return;
    setSending(true);
    try {
      await api.post('/telegram/send', { chat_id: selected.chat_id, message: sendText });
      setSendText('');
      const { data } = await api.get(`/telegram/messages/${selected.telegram_id}`);
      setMessages(data);
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100);
    } catch (err) { alert(err.response?.data?.error || 'Erro ao enviar'); }
    finally { setSending(false); }
  };

  const changeStatus = async (id, status) => {
    await api.patch(`/telegram/leads/${id}/status`, { status });
    setLeads(l => l.map(x => x.id === id ? { ...x, status } : x));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  };

  const convertLead = async (lead) => {
    if (!window.confirm(`Converter ${lead.first_name || lead.username || 'lead'} em cliente?`)) return;
    await api.post(`/telegram/leads/${lead.id}/convert`);
    loadLeads();
    setSelected(null);
  };

  const deleteLead = async (id) => {
    if (!window.confirm('Excluir este lead?')) return;
    await api.delete(`/telegram/leads/${id}`);
    setLeads(l => l.filter(x => x.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    return !q || (l.first_name||'').toLowerCase().includes(q) || (l.username||'').toLowerCase().includes(q) || (l.telegram_id||'').includes(q);
  });

  const leadName = l => [l.first_name, l.last_name].filter(Boolean).join(' ') || (l.username ? `@${l.username}` : `tg_${l.telegram_id}`);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, background:'rgba(7,11,20,0.6)' }}>
      {showCfg && <ConfigModal onClose={() => setShowCfg(false)} onSaved={() => { loadLeads(); setShowCfg(false); }} />}

      {/* Header */}
      <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#29b6f6,#0288d1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PaperAirplaneIcon style={{ width:20, height:20, color:'white' }} />
            </div>
            <div>
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#f1f5f9' }}>Telegram</h1>
              <p style={{ margin:0, fontSize:12, color:'#475569' }}>Leads e conversas do bot</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setShowCfg(true)} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(41,182,246,0.2)', background:'rgba(41,182,246,0.08)', color:'#29b6f6', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <Cog6ToothIcon style={{ width:14, height:14 }} /> Configurar Bot
            </button>
            <button onClick={loadLeads} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#64748b', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13 }}>
              <ArrowPathIcon style={{ width:14, height:14 }} /> Atualizar
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
            <StatCard label="Total Leads" value={stats.total} />
            <StatCard label="Mensagens" value={stats.messages} color='#29b6f6' />
            {stats.byStatus?.map(s => (
              <StatCard key={s.status} label={STATUS_CFG[s.status]?.label || s.status} value={s.c} color={STATUS_CFG[s.status]?.color} />
            ))}
          </div>
        )}

        {!stats?.configured && (
          <div onClick={() => setShowCfg(true)} style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.15)', color:'#f87171', fontSize:12, display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <Cog6ToothIcon style={{ width:14, height:14, flexShrink:0 }} />
            Bot não configurado. Clique aqui para configurar o token e o webhook.
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        {/* Lista de leads */}
        <div style={{ width:300, flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 12px 8px' }}>
            <div style={{ position:'relative' }}>
              <MagnifyingGlassIcon style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'#475569' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lead..."
                style={{ width:'100%', padding:'8px 8px 8px 30px', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {loading && <p style={{ textAlign:'center', color:'#475569', padding:20, fontSize:13 }}>Carregando...</p>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding:24, textAlign:'center' }}>
                <p style={{ color:'#334155', fontSize:13, margin:'0 0 8px' }}>Nenhum lead ainda</p>
                <p style={{ color:'#1e293b', fontSize:11, margin:0 }}>Configure o bot e registre o webhook para começar a receber mensagens.</p>
              </div>
            )}
            {filtered.map(lead => (
              <div key={lead.id} onClick={() => loadMessages(lead)}
                style={{ padding:'12px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)', background: selected?.id === lead.id ? 'rgba(41,182,246,0.08)' : 'transparent', transition:'background 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#29b6f6,#0288d1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:700, color:'white' }}>
                    {leadName(lead)[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{leadName(lead)}</p>
                      <StatusBadge status={lead.status} />
                    </div>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.last_msg || lead.first_message || '—'}</p>
                    <p style={{ margin:'1px 0 0', fontSize:10, color:'#334155' }}>{lead.msg_count} msg{lead.msg_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversa */}
        {selected ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
            {/* Chat header */}
            <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#29b6f6,#0288d1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'white' }}>
                  {leadName(selected)[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#f1f5f9' }}>{leadName(selected)}</p>
                  <p style={{ margin:0, fontSize:11, color:'#475569' }}>ID: {selected.telegram_id}{selected.username ? ` · @${selected.username}` : ''}</p>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <select value={selected.status} onChange={e => changeStatus(selected.id, e.target.value)}
                  style={{ padding:'5px 8px', borderRadius:7, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#94a3b8', fontSize:12, cursor:'pointer' }}>
                  {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {selected.status !== 'converted' && (
                  <button onClick={() => convertLead(selected)} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'rgba(16,185,129,0.12)', color:'#10b981', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                    <UsersIcon style={{ width:13, height:13 }} /> Converter
                  </button>
                )}
                <button onClick={() => deleteLead(selected.id)} style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'rgba(248,113,113,0.08)', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <TrashIcon style={{ width:13, height:13 }} />
                </button>
                <button onClick={() => setSelected(null)} style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'rgba(255,255,255,0.04)', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center' }}>
                  <XMarkIcon style={{ width:14, height:14 }} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              {messages.length === 0 && <p style={{ textAlign:'center', color:'#334155', fontSize:13 }}>Nenhuma mensagem</p>}
              {messages.map(m => (
                <div key={m.id} style={{ display:'flex', justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth:'72%', padding:'9px 14px', borderRadius: m.direction === 'out' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.direction === 'out' ? 'linear-gradient(135deg,#29b6f6,#0288d1)' : 'rgba(255,255,255,0.07)',
                    color: m.direction === 'out' ? 'white' : '#e2e8f0', fontSize:13, lineHeight:1.5 }}>
                    <p style={{ margin:0 }}>{m.message}</p>
                    <p style={{ margin:'3px 0 0', fontSize:10, opacity:0.6, textAlign:'right' }}>{new Date(m.created_at).toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            {/* Send */}
            <div style={{ padding:'12px 20px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:10, flexShrink:0 }}>
              <input value={sendText} onChange={e => setSendText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Digite a mensagem... (Enter para enviar)"
                style={{ flex:1, padding:'10px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.09)', background:'rgba(255,255,255,0.05)', color:'#e2e8f0', fontSize:13, outline:'none' }} />
              <button onClick={sendMessage} disabled={sending || !sendText.trim()}
                style={{ padding:'10px 16px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#29b6f6,#0288d1)', color:'white', cursor: sending||!sendText.trim() ? 'not-allowed' : 'pointer', opacity: sending||!sendText.trim() ? 0.5 : 1, display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600 }}>
                <PaperAirplaneIcon style={{ width:16, height:16 }} />
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'#334155' }}>
            <ChatBubbleLeftRightIcon style={{ width:48, height:48 }} />
            <p style={{ margin:0, fontSize:14 }}>Selecione um lead para ver a conversa</p>
            {!stats?.configured && (
              <button onClick={() => setShowCfg(true)} style={{ marginTop:8, padding:'9px 18px', borderRadius:9, border:'1px solid rgba(41,182,246,0.2)', background:'rgba(41,182,246,0.08)', color:'#29b6f6', cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                <Cog6ToothIcon style={{ width:15, height:15 }} /> Configurar Bot Agora
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
