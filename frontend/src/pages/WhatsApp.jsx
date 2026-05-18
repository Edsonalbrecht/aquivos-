import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  ChatBubbleLeftRightIcon, UserPlusIcon, CheckCircleIcon,
  Cog6ToothIcon, PaperAirplaneIcon, ArrowPathIcon,
  PhoneIcon, ClockIcon, BoltIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import api from '../services/api';
import Modal from '../components/Modal';

const STATUS_LABEL = { new: 'Novo', contacted: 'Contactado', converted: 'Convertido', ignored: 'Ignorado' };
const STATUS_COLOR = {
  new: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  contacted: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d' },
  converted: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
  ignored: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
};

function TabBtn({ active, onClick, icon: Icon, label, badge }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', fontSize: 13, fontWeight: 600,
      border: 'none', cursor: 'pointer', borderRadius: 10,
      transition: 'all 0.15s',
      background: active ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))' : 'transparent',
      color: active ? '#a5b4fc' : '#64748b',
      position: 'relative',
    }}>
      <Icon style={{ width: 16, height: 16 }} />
      {label}
      {badge > 0 && (
        <span style={{ background: '#6366f1', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, marginLeft: 2 }}>{badge}</span>
      )}
    </button>
  );
}

// ── ABA LEADS ────────────────────────────────────────────────────────────────
function Leads({ onSelectLead }) {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('all');
  const [simModal, setSimModal] = useState(false);
  const [simForm, setSimForm] = useState({ phone: '', name: '', message: '' });
  const [converting, setConverting] = useState(null);

  const load = () => {
    const params = filter !== 'all' ? { status: filter } : {};
    api.get('/whatsapp/leads', { params }).then(r => setLeads(r.data));
  };

  useEffect(() => { load(); }, [filter]);

  const changeStatus = async (id, status) => {
    await api.patch(`/whatsapp/leads/${id}/status`, { status });
    load();
  };

  const convert = async id => {
    setConverting(id);
    try {
      await api.patch(`/whatsapp/leads/${id}/convert`);
      load();
    } finally { setConverting(null); }
  };

  const simulate = async e => {
    e.preventDefault();
    await api.post('/whatsapp/webhook/simulate', simForm);
    setSimModal(false);
    setSimForm({ phone: '', name: '', message: '' });
    load();
  };

  const del = async id => {
    if (!confirm('Remover lead?')) return;
    await api.delete(`/whatsapp/leads/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', 'Todos'], ['new', 'Novos'], ['contacted', 'Contactados'], ['converted', 'Convertidos']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === v ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
              color: filter === v ? 'white' : '#64748b',
              boxShadow: filter === v ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setSimModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
          background: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
        }}>
          <BoltIcon style={{ width: 14, height: 14 }} /> Simular mensagem
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {leads.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
            <ChatBubbleLeftRightIcon style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>Nenhum lead ainda</p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>Configure o webhook ou simule uma mensagem para começar</p>
          </div>
        )}
        {leads.map(lead => (
          <div key={lead.id} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 800, color: 'white',
            }}>{(lead.name || lead.phone)?.[0]?.toUpperCase()}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{lead.name || lead.phone}</p>
                <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, ...STATUS_COLOR[lead.status] }}>
                  {STATUS_LABEL[lead.status]}
                </span>
                {lead.client_name && (
                  <span style={{ fontSize: 11, color: '#34d399' }}>→ {lead.client_name}</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <PhoneIcon style={{ width: 12, height: 12 }} /> {lead.phone}
                <span style={{ margin: '0 6px' }}>·</span>
                <ChatBubbleLeftRightIcon style={{ width: 12, height: 12 }} /> {lead.msg_count} msgs
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{lead.last_message || lead.first_message}"
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              <button onClick={() => onSelectLead(lead)} style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: 'rgba(37,211,102,0.12)', color: '#25d366',
              }}>
                <ChatBubbleLeftRightIcon style={{ width: 14, height: 14 }} />
              </button>
              {lead.status !== 'converted' && (
                <button onClick={() => convert(lead.id)} disabled={converting === lead.id} style={{
                  padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: 'rgba(16,185,129,0.15)', color: '#34d399',
                }}>
                  {converting === lead.id ? '...' : '→ Cliente'}
                </button>
              )}
              <select value={lead.status} onChange={e => changeStatus(lead.id, e.target.value)} style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#94a3b8', cursor: 'pointer',
              }}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => del(lead.id)} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 11, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {simModal && (
        <Modal title="⚡ Simular Mensagem WhatsApp" onClose={() => setSimModal(false)}>
          <form onSubmit={simulate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Simule o recebimento de uma mensagem para testar a automação sem precisar do WhatsApp Business.</p>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>TELEFONE *</label>
              <input value={simForm.phone} onChange={e => setSimForm(f => ({ ...f, phone: e.target.value }))} required className="input" placeholder="5511999999999" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>NOME</label>
              <input value={simForm.name} onChange={e => setSimForm(f => ({ ...f, name: e.target.value }))} className="input" placeholder="Nome do contato" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>MENSAGEM *</label>
              <textarea value={simForm.message} onChange={e => setSimForm(f => ({ ...f, message: e.target.value }))} required rows={3} className="input" placeholder="Ex: Olá, gostaria de saber mais sobre o clube" />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setSimModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">Enviar simulação</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── ABA CONVERSA ─────────────────────────────────────────────────────────────
function Conversa({ lead, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => api.get(`/whatsapp/messages/${lead.phone}`).then(r => setMessages(r.data));
  useEffect(() => { load(); }, [lead.phone]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const renderMessageContent = (text) => {
    const fileRegex = /\[FILE:(.+?)\]/;
    const match = text.match(fileRegex);

    if (match) {
      const filePath = match[1];
      const cleanText = text.replace(fileRegex, '').trim();
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(filePath);
      // Em produção, substitua localhost pela URL do seu servidor
      const fileUrl = `http://localhost:3001${filePath}`;

      return (
        <>
          {cleanText && <p style={{ margin: '0 0 8px' }}>{cleanText}</p>}
          {isImage ? (
            <img src={fileUrl} alt="Mídia" style={{ borderRadius: 8, maxWidth: '100%', cursor: 'pointer', marginTop: 4 }} onClick={() => window.open(fileUrl, '_blank')} />
          ) : (
            <div style={{ marginTop: 6 }}>
              <a href={fileUrl} download target="_blank" rel="noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', background: 'rgba(99,102,241,0.1)',
                borderRadius: 10, color: '#a5b4fc', fontSize: 12,
                textDecoration: 'none', border: '1px solid rgba(99,102,241,0.2)',
                transition: 'all 0.2s', fontWeight: 600
              }}>
                <ArrowDownTrayIcon style={{ width: 16, height: 16 }} />
                Baixar Documento
              </a>
            </div>
          )}
        </>
      );
    }
    return <p style={{ margin: '0 0 4px' }}>{text}</p>;
  };

  const send = async e => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.post('/whatsapp/send', { phone: lead.phone, message: input });
      setInput('');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar');
    } finally { setSending(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>← Voltar</button>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
          {(lead.name || lead.phone)?.[0]?.toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{lead.name || lead.phone}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{lead.phone}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%', padding: '9px 14px', borderRadius: m.direction === 'out' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              fontSize: 13, lineHeight: 1.5,
              background: m.direction === 'out' ? 'linear-gradient(135deg, #25d366, #128c7e)' : 'rgba(255,255,255,0.07)',
              color: '#f1f5f9',
              border: m.direction === 'in' ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              {renderMessageContent(m.message)}
              <p style={{ margin: 0, fontSize: 10, opacity: 0.6, textAlign: 'right' }}>
                {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Digite uma mensagem..." className="input" style={{ flex: 1 }} />
        <button type="submit" disabled={!input.trim() || sending} style={{
          padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #25d366, #128c7e)',
          color: 'white', display: 'flex', alignItems: 'center',
          boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
        }}>
          <PaperAirplaneIcon style={{ width: 16, height: 16 }} />
        </button>
      </form>
    </div>
  );
}

// ── ABA CONFIGURAÇÃO ─────────────────────────────────────────────────────────
function Configuracao() {
  const [config, setConfig] = useState({ verify_token: '', app_secret: '', phone_number_id: '', access_token: '', auto_reply: '', auto_create_lead: true });
  const [saved, setSaved] = useState(false);
  const set = k => e => setConfig(f => ({ ...f, [k]: e.target.value }));
  const host = window.location.origin.includes('localhost') ? 'http://localhost:3001' : window.location.origin;
  const webhookUrl = `${host}/api/whatsapp/webhook`;

  const enablePush = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const { data } = await api.get('/notifications/key');
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: data.publicKey
      });
      
      await api.post('/notifications/subscribe', subscription);
      alert('Notificações ativadas com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao ativar notificações. Verifique as permissões do navegador.');
    }
  };

  useEffect(() => { 
    api.get('/whatsapp/config').then(r => setConfig({ 
      ...r.data, 
      auto_create_lead: r.data.auto_create_lead !== 0 
    })); 
  }, []);

  const save = async e => {
    e.preventDefault();
    await api.put('/whatsapp/config', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Field = ({ label, help, children }) => (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
      {children}
      {help && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569' }}>{help}</p>}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
      {/* Passos */}
      <div>
        <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Como conectar</p>
        {[
          { n: 1, title: 'Acesse Meta for Developers', desc: 'Crie um app em developers.facebook.com e adicione o produto WhatsApp Business API.' },
          { n: 2, title: 'Configure o Webhook', desc: `Cole a URL abaixo no campo "Webhook URL" e o token de verificação no campo "Verify Token".` },
          { n: 3, title: 'Copie as credenciais', desc: 'Copie o Phone Number ID e gere um Access Token permanente no painel da Meta.' },
          { n: 4, title: 'Cole aqui e salve', desc: 'Preencha os campos ao lado e clique em Salvar. Mensagens viram leads automaticamente.' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>{s.n}</div>
            <div>
              <p style={{ margin: '3px 0 2px', fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.title}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          </div>
        ))}

        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 14, marginTop: 8 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1 }}>Sua URL de Webhook</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ flex: 1, fontSize: 11, color: '#a5b4fc', wordBreak: 'break-all', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 6 }}>{webhookUrl}</code>
            <button onClick={() => navigator.clipboard.writeText(webhookUrl)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
              Copiar
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b' }}>⚠️ Para testes locais, use o ngrok: <code style={{ color: '#a5b4fc' }}>ngrok http 3001</code></p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Token de Verificação" help="Qualquer texto — deve ser o mesmo no painel da Meta">
          <input value={config.verify_token || ''} onChange={set('verify_token')} className="input" placeholder="candeias_webhook_token" />
        </Field>
        <Field label="App Secret da Meta" help="Encontrado em Configurações > Básico no painel App da Meta">
          <input type="password" value={config.app_secret || ''} onChange={set('app_secret')} className="input" placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" />
        </Field>
        <Field label="Phone Number ID" help="Encontrado em WhatsApp > API Setup no painel Meta">
          <input value={config.phone_number_id || ''} onChange={set('phone_number_id')} className="input" placeholder="123456789012345" />
        </Field>
        <Field label="Access Token" help="Token permanente gerado no System User do Meta Business">
          <input type="password" value={config.access_token || ''} onChange={set('access_token')} className="input" placeholder="EAAxxxxx..." />
        </Field>
        <Field label="Resposta Automática (opcional)" help="Enviada automaticamente para todo novo contato">
          <textarea value={config.auto_reply || ''} onChange={set('auto_reply')} rows={3} className="input"
            placeholder="Olá! Obrigado pelo contato. Em breve um de nossos consultores irá atendê-lo." />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" id="auto_lead" checked={!!config.auto_create_lead}
            onChange={e => setConfig(f => ({ ...f, auto_create_lead: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: '#6366f1' }} />
          <label htmlFor="auto_lead" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
            Criar lead automaticamente ao receber mensagem
          </label>
        </div>
        <button type="submit" className="btn-primary" style={{ padding: '12px 0', fontSize: 14 }}>
          {saved ? '✓ Configuração salva!' : 'Salvar configuração'}
        </button>
      </form>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function WhatsApp() {
  const [tab, setTab] = useState('leads');
  const [stats, setStats] = useState({});
  const [selectedLead, setSelectedLead] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Usa a URL da API definida no ambiente ou fallback para localhost
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      secure: window.location.protocol === 'https:',
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    
    socket.on('connect', () => {
      console.log('[Socket.io] Conectado ao servidor com sucesso!');
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket.io] Erro de conexão:', error.message);
    });

    socket.on('new_whatsapp_message', (data) => {
      // Se for o lead selecionado, recarrega stats ou a conversa (via refresh de estado global se necessário)
      api.get('/whatsapp/stats').then(r => setStats(r.data));
    });

    socket.on('new_whatsapp_lead', () => {
      api.get('/whatsapp/stats').then(r => setStats(r.data));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => { api.get('/whatsapp/stats').then(r => setStats(r.data)); }, [tab]);

  const handleSelectLead = lead => { setSelectedLead(lead); setTab('conversa'); };
  const handleBack = () => { setSelectedLead(null); setTab('leads'); };

  return (
    <div style={{ padding: 32, minHeight: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 15px rgba(37,211,102,0.4)' }}>
            💬
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WhatsApp Automation
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>Mensagens viram leads automaticamente via Webhook</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total de Leads', value: stats.total || 0, color: '#6366f1' },
          { label: 'Novos', value: stats.novo || 0, color: '#a5b4fc' },
          { label: 'Convertidos', value: stats.converted || 0, color: '#34d399' },
          { label: 'Mensagens', value: stats.messages || 0, color: '#25d366' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 20px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 4, padding: '12px 12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
          <TabBtn active={tab === 'leads'} onClick={() => setTab('leads')} icon={UserPlusIcon} label="Leads" badge={stats.novo} />
          <TabBtn active={tab === 'conversa'} onClick={() => setTab('conversa')} icon={ChatBubbleLeftRightIcon} label="Conversa" />
          <TabBtn active={tab === 'config'} onClick={() => setTab('config')} icon={Cog6ToothIcon} label="Configuração" />
        </div>
        <div style={{ padding: 20 }}>
          {tab === 'leads' && <Leads onSelectLead={handleSelectLead} />}
          {tab === 'conversa' && selectedLead && <Conversa lead={selectedLead} onBack={handleBack} />}
          {tab === 'conversa' && !selectedLead && (
            <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>
              <ChatBubbleLeftRightIcon style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 14 }}>Selecione um lead para ver a conversa</p>
            </div>
          )}
          {tab === 'config' && <Configuracao />}
        </div>
      </div>
    </div>
  );
}
