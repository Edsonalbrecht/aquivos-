import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SparklesIcon, PaperAirplaneIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon,
  UserPlusIcon, TrashIcon, PencilIcon, XMarkIcon, Cog6ToothIcon,
  ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
  BoltIcon, UsersIcon, ChatBubbleLeftEllipsisIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

/* ── helpers ── */
const fmtN = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n||0);

const STATUS = {
  new:        { label: 'Novo',        color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  contacted:  { label: 'Contactado',  color: '#60a5fa', bg: 'rgba(59,130,246,0.15)'  },
  replied:    { label: 'Respondeu',   color: '#fbbf24', bg: 'rgba(245,158,11,0.15)'  },
  interested: { label: 'Interessado', color: '#c084fc', bg: 'rgba(168,85,247,0.15)'  },
  converted:  { label: 'Convertido',  color: '#34d399', bg: 'rgba(16,185,129,0.15)'  },
  ignored:    { label: 'Ignorado',    color: '#475569', bg: 'rgba(71,85,105,0.12)'    },
};

const CARD = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'18px 20px' };
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none' };
const btn  = (extra={}) => ({ padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s', display:'flex', alignItems:'center', gap:6, ...extra });

function Avatar({ username }) {
  return (
    <div style={{ width:42, height:42, borderRadius:'50%', background:'linear-gradient(135deg,#e1306c,#fd1d1d,#fcb045)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'white', flexShrink:0 }}>
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function StatusBadge({ status, onChange }) {
  const s = STATUS[status] || STATUS.new;
  return (
    <select value={status} onChange={e => onChange(e.target.value)}
      style={{ background:'transparent', border:`1px solid ${s.color}55`, borderRadius:6, padding:'3px 8px', fontSize:11, color:s.color, cursor:'pointer', outline:'none', fontWeight:700 }}>
      {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k} style={{ background:'#0f172a', color:v.color }}>{v.label}</option>)}
    </select>
  );
}

/* ── Modal de Configuração ─── */
function ConfigModal({ onClose }) {
  const [cfg, setCfg] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setCfg(f => ({ ...f, [k]: v }));

  useEffect(() => { api.get('/instagram/config').then(r => setCfg(r.data || {})); }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/instagram/config', cfg); onClose(); }
    catch (e) { alert(e.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:560, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:28, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#f1f5f9' }}>Configurações — Instagram & IA</h2>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'6px 8px' }) }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>

        <p style={{ margin:'0 0 16px', fontSize:12, color:'#475569' }}>Configure a API do Instagram (Meta) e o contexto da IA para geração de mensagens.</p>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <fieldset style={{ border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px', margin:0 }}>
            <legend style={{ fontSize:11, color:'#6366f1', fontWeight:700, letterSpacing:'1px', padding:'0 6px' }}>CONTEXTO PARA IA</legend>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>O QUE SUA EMPRESA FAZ</label>
                <textarea style={{ ...inp, minHeight:70, resize:'vertical' }} value={cfg.company_description||''} onChange={e => set('company_description', e.target.value)} placeholder="Ex: Oferecemos serviços de marketing digital para pequenas empresas do interior..." />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>PRODUTO/SERVIÇO PRINCIPAL</label>
                <input style={inp} value={cfg.product_service||''} onChange={e => set('product_service', e.target.value)} placeholder="Ex: Gestão de redes sociais e anúncios no Meta" />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>TOM DAS MENSAGENS</label>
                <select style={inp} value={cfg.message_tone||'profissional e amigável'} onChange={e => set('message_tone', e.target.value)}>
                  <option value="profissional e amigável">Profissional e amigável</option>
                  <option value="descontraído e próximo">Descontraído e próximo</option>
                  <option value="formal e direto">Formal e direto</option>
                  <option value="entusiasmado e motivacional">Entusiasmado e motivacional</option>
                  <option value="consultivo e empático">Consultivo e empático</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset style={{ border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px', margin:0 }}>
            <legend style={{ fontSize:11, color:'#e1306c', fontWeight:700, letterSpacing:'1px', padding:'0 6px' }}>META / INSTAGRAM API</legend>
            <p style={{ margin:'0 0 10px', fontSize:11, color:'#475569' }}>Necessário para receber DMs via webhook e responder via API. Para envio direto (cold outreach), use os links de DM automáticos.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>PAGE ID (Facebook Page vinculada ao Instagram)</label>
                <input style={inp} value={cfg.page_id||''} onChange={e => set('page_id', e.target.value)} placeholder="123456789" />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>INSTAGRAM BUSINESS ACCOUNT ID</label>
                <input style={inp} value={cfg.instagram_account_id||''} onChange={e => set('instagram_account_id', e.target.value)} placeholder="17841400..." />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>ACCESS TOKEN (permanente)</label>
                <input type="password" style={inp} value={cfg.access_token||''} onChange={e => set('access_token', e.target.value)} placeholder="EAABs..." />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>VERIFY TOKEN (webhook)</label>
                <input style={inp} value={cfg.verify_token||'ig_webhook_token'} onChange={e => set('verify_token', e.target.value)} />
              </div>
            </div>
          </fieldset>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={save} disabled={saving} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', justifyContent:'center', opacity:saving?0.6:1 }) }}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
            <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Formulário Lead ─── */
function LeadForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { username:'', full_name:'', bio:'', niche:'', followers:0, website:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) await api.put(`/instagram/leads/${initial.id}`, { ...form, status: initial.status });
      else await api.post('/instagram/leads', form);
      onSave();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:500, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:26, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#f1f5f9' }}>{initial?.id ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'6px 8px' }) }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>@ USERNAME *</label>
              <input style={inp} value={form.username} onChange={e => set('username', e.target.value)} required placeholder="joaosilva" />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>NOME COMPLETO</label>
              <input style={inp} value={form.full_name||''} onChange={e => set('full_name', e.target.value)} placeholder="João Silva" />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>BIO (cole a bio do Instagram)</label>
            <textarea style={{ ...inp, minHeight:72, resize:'vertical' }} value={form.bio||''} onChange={e => set('bio', e.target.value)} placeholder="Coach de finanças | Ajudo empresários a..." />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>NICHO</label>
              <input style={inp} value={form.niche||''} onChange={e => set('niche', e.target.value)} placeholder="Marketing" />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>SEGUIDORES</label>
              <input type="number" min="0" style={inp} value={form.followers||0} onChange={e => set('followers', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>WEBSITE</label>
              <input style={inp} value={form.website||''} onChange={e => set('website', e.target.value)} placeholder="site.com.br" />
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>NOTAS INTERNAS</label>
            <textarea style={{ ...inp, minHeight:60, resize:'vertical' }} value={form.notes||''} onChange={e => set('notes', e.target.value)} placeholder="Informações extras para a IA usar na personalização..." />
          </div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button type="submit" disabled={saving} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#e1306c,#fd1d1d)', color:'white', justifyContent:'center', opacity:saving?0.6:1 }) }}>
              {saving ? 'Salvando...' : initial?.id ? 'Salvar' : 'Adicionar Lead'}
            </button>
            <button type="button" onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal Importação em Massa ─── */
function BulkImportModal({ onDone, onClose }) {
  const [text, setText]     = useState('');
  const [niche, setNiche]   = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handle = async () => {
    const usernames = text.split(/[\n,;]/).map(s => s.trim()).filter(Boolean);
    if (!usernames.length) return alert('Cole pelo menos um username');
    setSaving(true);
    try {
      const r = await api.post('/instagram/leads/bulk-import', { usernames, niche: niche || undefined });
      setResult(r.data);
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:500, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:26 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#f1f5f9' }}>Importar em Massa</h2>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'6px 8px' }) }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>
        {!result ? (
          <>
            <p style={{ margin:'0 0 12px', fontSize:12, color:'#64748b' }}>Cole os usernames do Instagram, um por linha ou separados por vírgula.</p>
            <textarea style={{ ...inp, minHeight:160, resize:'vertical', fontFamily:'monospace', marginBottom:10 }}
              value={text} onChange={e => setText(e.target.value)} placeholder="@joaosilva&#10;mariacoach&#10;empresaxyz,contadigital" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:4 }}>NICHO (opcional, para todos)</label>
                <input style={inp} value={niche} onChange={e => setNiche(e.target.value)} placeholder="Ex: E-commerce" />
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handle} disabled={saving} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#e1306c,#fd1d1d)', color:'white', justifyContent:'center', opacity:saving?0.6:1 }) }}>
                <ArrowDownTrayIcon style={{ width:15, height:15 }} />
                {saving ? 'Importando...' : 'Importar'}
              </button>
              <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'10px 0' }}>
            <CheckCircleIcon style={{ width:44, height:44, color:'#34d399', margin:'0 auto 12px' }} />
            <p style={{ margin:'0 0 6px', fontSize:16, fontWeight:700, color:'#34d399' }}>{result.created} lead(s) importado(s)</p>
            {result.skipped > 0 && <p style={{ margin:'0 0 16px', fontSize:13, color:'#64748b' }}>{result.skipped} já existiam e foram ignorados</p>}
            <button onClick={onDone} style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', justifyContent:'center' }) }}>
              Fechar e ver leads
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal Mensagem IA ─── */
function MessageModal({ lead, onClose, onSaved }) {
  const [msg, setMsg]         = useState(lead.ai_message || '');
  const [custom, setCustom]   = useState('');
  const [generating, setGen]  = useState(false);
  const [approach, setAppr]   = useState('');
  const [copied, setCopied]   = useState(false);
  const [sending, setSending] = useState(false);

  const generate = async () => {
    setGen(true);
    try {
      const r = await api.post(`/instagram/leads/${lead.id}/generate`, { custom_instructions: custom || undefined });
      setMsg(r.data.message);
      setAppr(r.data.approach || '');
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao gerar mensagem'); }
    finally { setGen(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDM = () => {
    window.open(`https://www.instagram.com/direct/new/?username=${lead.username}`, '_blank');
  };

  const sendViaApi = async () => {
    setSending(true);
    try {
      await api.post(`/instagram/leads/${lead.id}/send`, { message: msg });
      alert('Mensagem enviada via API com sucesso!');
      onSaved();
    } catch (err) { alert(err.response?.data?.error || 'Erro ao enviar'); }
    finally { setSending(false); }
  };

  const saveEdit = async () => {
    try {
      await api.put(`/instagram/leads/${lead.id}`, { ...lead, ai_message: msg });
      onSaved();
      onClose();
    } catch { onClose(); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:580, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:26, maxHeight:'92vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <Avatar username={lead.username} />
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:'#f1f5f9' }}>@{lead.username}</p>
            <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{lead.full_name || ''}{lead.niche ? ` · ${lead.niche}` : ''}{lead.followers > 0 ? ` · ${fmtN(lead.followers)} seguidores` : ''}</p>
          </div>
          <button onClick={onClose} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'6px 8px' }) }}><XMarkIcon style={{ width:16, height:16 }} /></button>
        </div>

        {/* Instrução extra para IA */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>INSTRUÇÕES EXTRAS PARA A IA (opcional)</label>
          <input style={inp} value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Ex: mencione que somos locais da mesma cidade, use tom mais informal..." />
        </div>

        <button onClick={generate} disabled={generating} style={{ ...btn({ width:'100%', justifyContent:'center', background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'white', marginBottom:14, opacity:generating?0.7:1 }) }}>
          <SparklesIcon style={{ width:16, height:16 }} />
          {generating ? 'Gerando com Gemini IA...' : msg ? 'Regenerar Mensagem' : 'Gerar Mensagem com IA'}
        </button>

        {generating && (
          <div style={{ textAlign:'center', padding:'20px 0', color:'#8b5cf6' }}>
            <div style={{ fontSize:13 }}>Analisando perfil e gerando mensagem personalizada...</div>
          </div>
        )}

        {msg && !generating && (
          <>
            {approach && (
              <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:11, color:'#818cf8' }}>
                <b>Abordagem da IA:</b> {approach}
              </div>
            )}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#64748b', fontWeight:600, display:'block', marginBottom:5 }}>MENSAGEM GERADA (editável)</label>
              <textarea style={{ ...inp, minHeight:160, resize:'vertical', lineHeight:1.6 }}
                value={msg} onChange={e => setMsg(e.target.value)} />
              <div style={{ fontSize:11, color:'#334155', textAlign:'right', marginTop:3 }}>{msg.length} caracteres · {msg.split(' ').length} palavras</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <button onClick={copy} style={{ ...btn({ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)', color: copied ? '#34d399' : '#94a3b8', justifyContent:'center' }) }}>
                <ClipboardDocumentIcon style={{ width:15, height:15 }} />
                {copied ? 'Copiado!' : 'Copiar Mensagem'}
              </button>
              <button onClick={openDM} style={{ ...btn({ background:'linear-gradient(135deg,#e1306c,#fd1d1d)', color:'white', justifyContent:'center' }) }}>
                <ArrowTopRightOnSquareIcon style={{ width:15, height:15 }} />
                Abrir DM no Instagram
              </button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={sendViaApi} disabled={sending} style={{ ...btn({ flex:1, background:'rgba(59,130,246,0.15)', color:'#60a5fa', justifyContent:'center', opacity:sending?0.6:1 }) }}>
                <PaperAirplaneIcon style={{ width:14, height:14 }} />
                {sending ? 'Enviando...' : 'Enviar via API'}
              </button>
              <button onClick={saveEdit} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>
                Salvar edição
              </button>
            </div>
            <p style={{ margin:'10px 0 0', fontSize:10, color:'#334155', textAlign:'center' }}>
              "Abrir DM" abre o Instagram com a conversa pronta. "Enviar via API" requer IGSID do lead (lead precisa ter enviado DM primeiro).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── CARD DE LEAD ─── */
function LeadCard({ lead, selected, onSelect, onEdit, onDelete, onMessage, onStatusChange, onConvert }) {
  const s = STATUS[lead.status] || STATUS.new;
  const hasMsg = !!lead.ai_message;

  return (
    <div style={{ ...CARD, display:'flex', flexDirection:'column', gap:10, border: selected ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', position:'relative' }}>
      {/* Checkbox */}
      <input type="checkbox" checked={selected} onChange={onSelect}
        style={{ position:'absolute', top:14, right:14, width:16, height:16, cursor:'pointer' }} />

      <div style={{ display:'flex', gap:10, paddingRight:28 }}>
        <Avatar username={lead.username} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <a href={`https://instagram.com/${lead.username}`} target="_blank" rel="noreferrer"
              style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', textDecoration:'none' }}>
              @{lead.username}
            </a>
            {lead.full_name && <span style={{ fontSize:12, color:'#475569' }}>{lead.full_name}</span>}
          </div>
          <div style={{ display:'flex', gap:10, fontSize:11, color:'#475569', marginTop:2, flexWrap:'wrap' }}>
            {lead.niche && <span style={{ background:'rgba(99,102,241,0.12)', color:'#818cf8', padding:'2px 7px', borderRadius:4 }}>{lead.niche}</span>}
            {lead.followers > 0 && <span>{fmtN(lead.followers)} seguidores</span>}
            {lead.website && <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" style={{ color:'#6366f1' }}>{lead.website}</a>}
          </div>
        </div>
      </div>

      {lead.bio && (
        <p style={{ margin:0, fontSize:12, color:'#64748b', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {lead.bio}
        </p>
      )}

      {hasMsg && (
        <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:8, padding:'8px 10px' }}>
          <div style={{ fontSize:10, color:'#6366f1', fontWeight:700, marginBottom:4 }}>MENSAGEM IA</div>
          <p style={{ margin:0, fontSize:12, color:'#94a3b8', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{lead.ai_message}</p>
        </div>
      )}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
        <StatusBadge status={lead.status} onChange={onStatusChange} />
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={onMessage} style={{ ...btn({ background: hasMsg ? 'rgba(99,102,241,0.2)' : 'rgba(139,92,246,0.15)', color: hasMsg ? '#a5b4fc' : '#c084fc', padding:'6px 10px', fontSize:12 }) }}>
            <SparklesIcon style={{ width:13, height:13 }} />
            {hasMsg ? 'Ver Msg' : 'Gerar IA'}
          </button>
          {lead.status !== 'converted' && (
            <button onClick={onConvert} title="Converter em cliente" style={{ ...btn({ background:'rgba(16,185,129,0.1)', color:'#34d399', padding:'6px 8px' }) }}>
              <CheckCircleIcon style={{ width:14, height:14 }} />
            </button>
          )}
          <button onClick={onEdit} style={{ ...btn({ background:'rgba(255,255,255,0.05)', color:'#64748b', padding:'6px 8px' }) }}>
            <PencilIcon style={{ width:13, height:13 }} />
          </button>
          <button onClick={onDelete} style={{ ...btn({ background:'rgba(239,68,68,0.08)', color:'#f87171', padding:'6px 8px' }) }}>
            <TrashIcon style={{ width:13, height:13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── PÁGINA PRINCIPAL ─── */
export default function InstagramLeads() {
  const [leads, setLeads]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [selected, setSelected]   = useState(new Set());
  const [showConfig, setConfig]   = useState(false);
  const [showForm, setForm]       = useState(false);
  const [editing, setEditing]     = useState(null);
  const [showImport, setImport]   = useState(false);
  const [msgLead, setMsgLead]     = useState(null);
  const [bulkGen, setBulkGen]     = useState(false);
  const [bulkResult, setBulkRes]  = useState(null);

  const loadLeads = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    Promise.all([
      api.get('/instagram/leads', { params }),
      api.get('/instagram/stats'),
    ]).then(([lr, sr]) => { setLeads(lr.data); setStats(sr.data); })
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  const handleDelete = async id => {
    if (!confirm('Excluir lead?')) return;
    await api.delete(`/instagram/leads/${id}`);
    loadLeads();
  };

  const handleStatusChange = async (id, status) => {
    await api.patch(`/instagram/leads/${id}/status`, { status });
    loadLeads();
  };

  const handleConvert = async id => {
    if (!confirm('Converter este lead em cliente no CRM?')) return;
    try {
      await api.post(`/instagram/leads/${id}/convert`);
      alert('Lead convertido em cliente com sucesso!');
      loadLeads();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const toggleSelect = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(s => s.size === leads.length ? new Set() : new Set(leads.map(l => l.id)));

  const handleBulkGenerate = async () => {
    if (!selected.size) return alert('Selecione ao menos um lead');
    if (!confirm(`Gerar mensagens IA para ${selected.size} lead(s)? Pode demorar alguns segundos.`)) return;
    setBulkGen(true);
    setBulkRes(null);
    try {
      const r = await api.post('/instagram/bulk-generate', { lead_ids: [...selected] });
      setBulkRes(r.data);
      setSelected(new Set());
      loadLeads();
    } catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setBulkGen(false); }
  };

  const statusTabs = [
    { k:'all',        l:'Todos',        c: stats?.total || 0 },
    { k:'new',        l:'Novos',        c: stats?.byStatus?.find(s=>s.status==='new')?.c || 0 },
    { k:'contacted',  l:'Contactados',  c: stats?.byStatus?.find(s=>s.status==='contacted')?.c || 0 },
    { k:'replied',    l:'Responderam',  c: stats?.byStatus?.find(s=>s.status==='replied')?.c || 0 },
    { k:'interested', l:'Interessados', c: stats?.byStatus?.find(s=>s.status==='interested')?.c || 0 },
    { k:'converted',  l:'Convertidos',  c: stats?.byStatus?.find(s=>s.status==='converted')?.c || 0 },
  ];

  return (
    <div style={{ padding:'0 4px' }}>
      {/* Cabeçalho */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#e1306c,#fd1d1d,#fcb045)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </div>
            <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#f1f5f9' }}>Instagram Leads IA</h1>
          </div>
          <p style={{ margin:0, fontSize:13, color:'#64748b' }}>Prospecção inteligente com mensagens personalizadas pelo Gemini</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => setImport(true)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>
            <ArrowDownTrayIcon style={{ width:15, height:15 }} /> Importar
          </button>
          <button onClick={() => { setEditing(null); setForm(true); }} style={{ ...btn({ background:'linear-gradient(135deg,#e1306c,#fd1d1d)', color:'white' }) }}>
            <UserPlusIcon style={{ width:15, height:15 }} /> Novo Lead
          </button>
          <button onClick={() => setConfig(true)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'8px 10px' }) }}>
            <Cog6ToothIcon style={{ width:18, height:18 }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total Leads', v: stats.total, color:'#f1f5f9' },
            { label:'Com Msg IA', v: stats.withMsg, color:'#c084fc' },
            { label:'Contactados', v: stats.contacted, color:'#60a5fa' },
            { label:'Convertidos', v: stats.converted, color:'#34d399' },
          ].map(({ label, v, color }) => (
            <div key={label} style={{ ...CARD, padding:'14px 16px' }}>
              <p style={{ margin:'0 0 6px', fontSize:10, color:'#475569', fontWeight:600, textTransform:'uppercase' }}>{label}</p>
              <p style={{ margin:0, fontSize:22, fontWeight:800, color }}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Niches top */}
      {stats?.niches?.length > 0 && (
        <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
          {stats.niches.map(n => (
            <button key={n.niche} onClick={() => setStatus('all')}
              style={{ ...btn({ background:'rgba(99,102,241,0.1)', color:'#818cf8', padding:'4px 10px', fontSize:11, fontWeight:600 }) }}>
              {n.niche} <span style={{ color:'#475569' }}>{n.c}</span>
            </button>
          ))}
        </div>
      )}

      {/* Busca + Filtro */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <MagnifyingGlassIcon style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', width:15, height:15, color:'#475569' }} />
          <input style={{ ...inp, paddingLeft:32 }} placeholder="Buscar username, nome, bio..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Tabs de status */}
      <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap', borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:1 }}>
        {statusTabs.map(({ k, l, c }) => (
          <button key={k} onClick={() => setStatus(k)} style={{ ...btn({ background:'transparent', color: statusFilter===k ? '#a5b4fc' : '#475569', borderBottom: statusFilter===k ? '2px solid #6366f1' : '2px solid transparent', borderRadius:0, paddingBottom:10, fontSize:12 }) }}>
            {l} <span style={{ color:'#334155', marginLeft:4 }}>{c}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {leads.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <button onClick={toggleAll} style={{ ...btn({ background:'rgba(255,255,255,0.04)', color:'#64748b', fontSize:12 }) }}>
            {selected.size === leads.length ? 'Desmarcar todos' : `Selecionar todos (${leads.length})`}
          </button>
          {selected.size > 0 && (
            <>
              <span style={{ fontSize:12, color:'#6366f1', fontWeight:600 }}>{selected.size} selecionado(s)</span>
              <button onClick={handleBulkGenerate} disabled={bulkGen} style={{ ...btn({ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'white', opacity:bulkGen?0.6:1 }) }}>
                <SparklesIcon style={{ width:14, height:14 }} />
                {bulkGen ? `Gerando ${selected.size} mensagens...` : `Gerar IA para ${selected.size}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Resultado bulk */}
      {bulkResult && (
        <div style={{ ...CARD, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <CheckCircleIcon style={{ width:18, height:18, color:'#34d399', flexShrink:0 }} />
          <p style={{ margin:0, fontSize:13, color:'#34d399' }}>
            <b>{bulkResult.success}</b> mensagens geradas · <b>{bulkResult.failed}</b> falhas
          </p>
          <button onClick={() => setBulkRes(null)} style={{ ...btn({ background:'transparent', color:'#475569', padding:'4px 6px', marginLeft:'auto' }) }}><XMarkIcon style={{ width:14, height:14 }} /></button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#475569' }}>
          <ArrowPathIcon style={{ width:24, height:24, margin:'0 auto 8px', animation:'spin 1s linear infinite' }} />
          <p style={{ margin:0 }}>Carregando leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div style={{ ...CARD, textAlign:'center', padding:52 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📸</div>
          <p style={{ margin:'0 0 6px', fontSize:15, fontWeight:600, color:'#64748b' }}>Nenhum lead encontrado</p>
          <p style={{ margin:'0 0 20px', fontSize:13, color:'#475569' }}>Adicione leads manualmente ou importe uma lista de usernames</p>
          <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
            <button onClick={() => setImport(true)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>
              <ArrowDownTrayIcon style={{ width:15, height:15 }} /> Importar Lista
            </button>
            <button onClick={() => { setEditing(null); setForm(true); }} style={{ ...btn({ background:'linear-gradient(135deg,#e1306c,#fd1d1d)', color:'white' }) }}>
              <UserPlusIcon style={{ width:15, height:15 }} /> Novo Lead
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {leads.map(lead => (
            <LeadCard key={lead.id} lead={lead}
              selected={selected.has(lead.id)}
              onSelect={() => toggleSelect(lead.id)}
              onEdit={() => { setEditing(lead); setForm(true); }}
              onDelete={() => handleDelete(lead.id)}
              onMessage={() => setMsgLead(lead)}
              onStatusChange={s => handleStatusChange(lead.id, s)}
              onConvert={() => handleConvert(lead.id)}
            />
          ))}
        </div>
      )}

      {/* Modais */}
      {showConfig  && <ConfigModal onClose={() => { setConfig(false); }} />}
      {showForm    && <LeadForm initial={editing} onSave={() => { setForm(false); setEditing(null); loadLeads(); }} onClose={() => { setForm(false); setEditing(null); }} />}
      {showImport  && <BulkImportModal onDone={() => { setImport(false); loadLeads(); }} onClose={() => setImport(false)} />}
      {msgLead     && <MessageModal lead={msgLead} onClose={() => setMsgLead(null)} onSaved={loadLeads} />}

      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
