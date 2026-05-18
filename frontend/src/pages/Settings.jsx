import { useEffect, useState, useCallback } from 'react';
import {
  Cog6ToothIcon, CheckCircleIcon, CurrencyDollarIcon,
  BuildingOfficeIcon, PhotoIcon, SpeakerWaveIcon, SpeakerXMarkIcon,
  LockClosedIcon, UsersIcon, ChartBarIcon, CircleStackIcon,
  ArrowDownTrayIcon, CloudArrowUpIcon, PlusIcon, TrashIcon,
  PencilIcon, XMarkIcon, KeyIcon, WifiIcon, ExclamationTriangleIcon,
  ServerStackIcon, CheckBadgeIcon, ArrowPathIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ── Estilos compartilhados ── */
const CARD = { background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'24px 26px', marginBottom:18 };
const inp  = { width:'100%', padding:'9px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.06)', color:'#e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none' };
const btn  = (extra={}) => ({ padding:'9px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s', display:'inline-flex', alignItems:'center', gap:6, ...extra });

const ROLE_LABELS = { admin:'Administrador', vendedor:'Vendedor', user:'Usuário' };
const ROLE_COLORS = { admin:'#c084fc', vendedor:'#60a5fa', user:'#94a3b8' };

function Label({ children }) {
  return <label style={{ fontSize:11, color:'#64748b', fontWeight:700, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.5px' }}>{children}</label>;
}
function SectionTitle({ icon:Icon, title, subtitle }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
      <div style={{ width:40, height:40, borderRadius:10, background:'rgba(99,102,241,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon style={{ width:20, height:20, color:'#6366f1' }} />
      </div>
      <div>
        <p style={{ margin:0, fontSize:15, fontWeight:700, color:'#e2e8f0' }}>{title}</p>
        {subtitle && <p style={{ margin:0, fontSize:11, color:'#475569' }}>{subtitle}</p>}
      </div>
    </div>
  );
}
function Tag({ children, color='#64748b' }) {
  return <span style={{ padding:'3px 9px', borderRadius:6, background:`${color}22`, color, fontSize:11, fontWeight:700 }}>{children}</span>;
}
function IntegrationStatus({ ok, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background: ok ? '#34d399' : '#f87171' }} />
      <span style={{ fontSize:12, color: ok ? '#34d399' : '#f87171' }}>{ok ? 'Configurado' : 'Não configurado'}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: GERAL
════════════════════════════════════════════════════════════════ */
function TabGeral() {
  const [settings, setSettings] = useState({ company_name:'', logo_url:'', monthly_sales_goal:0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => { api.get('/settings').then(r => setSettings(r.data)); }, []);

  const handleLogoUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('logo', file);
    const { data } = await api.post('/settings/logo', fd);
    const newUrl = data.url;
    setSettings(s => {
      const updated = { ...s, logo_url: newUrl };
      api.put('/settings', updated);
      return updated;
    });
  };

  const save = async e => {
    e.preventDefault();
    await api.put('/settings', settings);
    setSaved(true); setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={save}>
      <div style={CARD}>
        <SectionTitle icon={BuildingOfficeIcon} title="Identidade da Empresa" subtitle="Nome e logo exibidos no sistema" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
          <div>
            <Label>Nome da empresa</Label>
            <input style={inp} value={settings.company_name||''} onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))} placeholder="CandeiasNexus" />
          </div>
          <div>
            <Label>Logo</Label>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <img src={settings.logo_url ? `http://localhost:3001${settings.logo_url}` : '/logo.png'} alt="logo" style={{ width:48, height:48, objectFit:'contain', borderRadius:8, background:'rgba(255,255,255,0.05)', padding:4 }} />
              <label style={{ ...btn({ background:'rgba(255,255,255,0.07)', color:'#94a3b8' }), cursor:'pointer' }}>
                <PhotoIcon style={{ width:14, height:14 }} /> Selecionar
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:'none' }} />
              </label>
            </div>
          </div>
        </div>
        <div>
          <Label>Meta mensal de vendas (R$)</Label>
          <div style={{ maxWidth:240 }}>
            <input type="number" min="0" style={{ ...inp, fontSize:16, fontWeight:600, textAlign:'right' }}
              value={settings.monthly_sales_goal||0} onChange={e => setSettings(s => ({ ...s, monthly_sales_goal: parseFloat(e.target.value) }))} />
          </div>
          <p style={{ margin:'6px 0 0', fontSize:11, color:'#475569' }}>Aparece na barra de progresso do Dashboard principal.</p>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button type="submit" style={{ ...btn({ background: saved ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: saved ? '#34d399' : 'white', padding:'10px 24px' }) }}>
          {saved ? <><CheckCircleIcon style={{ width:16, height:16 }} /> Salvo!</> : 'Salvar Configurações'}
        </button>
      </div>
    </form>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: EQUIPE
════════════════════════════════════════════════════════════════ */
function TabEquipe() {
  const { user: me } = useAuth();
  const [users, setUsers]       = useState([]);
  const [showForm, setForm]     = useState(false);
  const [editing, setEditing]   = useState(null);
  const [resetFor, setResetFor] = useState(null);
  const [form, setForm2]        = useState({ name:'', email:'', password:'', role:'vendedor' });
  const [resetPwd, setResetPwd] = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const load = () => api.get('/settings/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      if (editing) await api.put(`/settings/users/${editing.id}`, { name: form.name, role: form.role });
      else await api.post('/settings/users', form);
      setForm(false); setEditing(null); setForm2({ name:'', email:'', password:'', role:'vendedor' }); load();
    } catch (err) { setMsg(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Excluir usuário? Esta ação não pode ser desfeita.')) return;
    try { await api.delete(`/settings/users/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleResetPassword = async () => {
    if (resetPwd.length < 6) return alert('Mínimo 6 caracteres');
    try { await api.post(`/settings/users/${resetFor}/reset-password`, { newPassword: resetPwd }); setResetFor(null); setResetPwd(''); alert('Senha redefinida!'); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const openEdit = u => { setEditing(u); setForm2({ name: u.name, email: u.email, password:'', role: u.role }); setForm(true); };

  return (
    <div>
      <div style={{ ...CARD }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <SectionTitle icon={UsersIcon} title="Gestão de Usuários" subtitle="Adicione e gerencie a equipe de vendas" />
          <button onClick={() => { setEditing(null); setForm2({ name:'', email:'', password:'', role:'vendedor' }); setForm(true); }}
            style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white' }) }}>
            <PlusIcon style={{ width:15, height:15 }} /> Novo Usuário
          </button>
        </div>

        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {['Usuário','Função','Membro desde','Ações'].map(h => (
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:10, color:'#475569', fontWeight:700, textTransform:'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding:'12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'white', flexShrink:0 }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{u.name} {u.id === me?.id && <span style={{ fontSize:10, color:'#6366f1' }}>(você)</span>}</p>
                      <p style={{ margin:0, fontSize:11, color:'#475569' }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding:'12px' }}><Tag color={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role] || u.role}</Tag></td>
                <td style={{ padding:'12px', fontSize:12, color:'#475569' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                <td style={{ padding:'12px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEdit(u)} style={{ ...btn({ background:'rgba(255,255,255,0.05)', color:'#64748b', padding:'6px 8px' }) }}><PencilIcon style={{ width:13, height:13 }} /></button>
                    <button onClick={() => { setResetFor(u.id); setResetPwd(''); }} title="Redefinir senha" style={{ ...btn({ background:'rgba(245,158,11,0.1)', color:'#fbbf24', padding:'6px 8px' }) }}><KeyIcon style={{ width:13, height:13 }} /></button>
                    {u.id !== me?.id && <button onClick={() => handleDelete(u.id)} style={{ ...btn({ background:'rgba(239,68,68,0.1)', color:'#f87171', padding:'6px 8px' }) }}><TrashIcon style={{ width:13, height:13 }} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal criar/editar */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'100%', maxWidth:440, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:26 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:'#f1f5f9' }}>{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setForm(false)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#64748b' }}><XMarkIcon style={{ width:18, height:18 }} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div><Label>Nome completo</Label><input style={inp} value={form.name} onChange={e => setForm2(f => ({ ...f, name: e.target.value }))} required /></div>
              {!editing && <div><Label>E-mail</Label><input type="email" style={inp} value={form.email} onChange={e => setForm2(f => ({ ...f, email: e.target.value }))} required /></div>}
              {!editing && <div><Label>Senha (mín. 6 caracteres)</Label><input type="password" style={inp} value={form.password} onChange={e => setForm2(f => ({ ...f, password: e.target.value }))} required /></div>}
              <div>
                <Label>Função</Label>
                <select style={inp} value={form.role} onChange={e => setForm2(f => ({ ...f, role: e.target.value }))}>
                  <option value="vendedor">Vendedor</option>
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {msg && <p style={{ margin:0, fontSize:12, color:'#f87171' }}>{msg}</p>}
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button type="submit" disabled={saving} style={{ ...btn({ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', justifyContent:'center', opacity:saving?0.6:1 }) }}>
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Usuário'}
                </button>
                <button type="button" onClick={() => setForm(false)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal reset senha */}
      {resetFor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ width:'100%', maxWidth:380, background:'rgba(10,15,28,0.99)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:26 }}>
            <h3 style={{ margin:'0 0 14px', fontSize:15, fontWeight:700, color:'#f1f5f9' }}>Redefinir Senha</h3>
            <Label>Nova senha (mín. 6 caracteres)</Label>
            <input type="password" style={{ ...inp, marginBottom:14 }} value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={handleResetPassword} style={{ ...btn({ flex:1, background:'rgba(245,158,11,0.15)', color:'#fbbf24', justifyContent:'center' }) }}><KeyIcon style={{ width:14, height:14 }} /> Redefinir</button>
              <button onClick={() => setResetFor(null)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#94a3b8' }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: PIPELINE
════════════════════════════════════════════════════════════════ */
function TabPipeline() {
  const [stages, setStages]  = useState([]);
  const [editing, setEdit]   = useState(null);
  const [newStage, setNew]   = useState({ name:'', color:'#6366f1' });
  const [showNew, setShowNew]= useState(false);
  const [saving, setSaving]  = useState(false);

  const load = () => api.get('/settings/pipeline').then(r => setStages(r.data));
  useEffect(() => { load(); }, []);

  const handleSaveNew = async () => {
    if (!newStage.name.trim()) return;
    setSaving(true);
    try { await api.post('/settings/pipeline', newStage); setNew({ name:'', color:'#6366f1' }); setShowNew(false); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async s => {
    try { await api.put(`/settings/pipeline/${s.id}`, s); setEdit(null); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const handleDelete = async id => {
    if (!confirm('Excluir esta etapa?')) return;
    try { await api.delete(`/settings/pipeline/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
  };

  const move = async (idx, dir) => {
    const arr = [...stages];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= arr.length) return;
    [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
    const reordered = arr.map((s, i) => ({ ...s, order_index: i + 1 }));
    setStages(reordered);
    await api.put('/settings/pipeline-reorder', { stages: reordered.map(s => ({ id: s.id, order_index: s.order_index })) });
  };

  return (
    <div style={CARD}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <SectionTitle icon={ChartBarIcon} title="Etapas do Pipeline" subtitle="Configure o funil de vendas da sua equipe" />
        <button onClick={() => setShowNew(true)} style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white' }) }}>
          <PlusIcon style={{ width:15, height:15 }} /> Nova Etapa
        </button>
      </div>

      {showNew && (
        <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:10, padding:'14px 16px', marginBottom:14, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <input style={{ ...inp, flex:1, minWidth:140 }} placeholder="Nome da etapa" value={newStage.name} onChange={e => setNew(s => ({ ...s, name: e.target.value }))} />
          <input type="color" value={newStage.color} onChange={e => setNew(s => ({ ...s, color: e.target.value }))} style={{ width:38, height:38, borderRadius:8, border:'none', cursor:'pointer', background:'transparent' }} title="Cor" />
          <button onClick={handleSaveNew} disabled={saving} style={{ ...btn({ background:'rgba(99,102,241,0.3)', color:'#a5b4fc' }) }}>Adicionar</button>
          <button onClick={() => setShowNew(false)} style={{ ...btn({ background:'transparent', color:'#64748b', padding:'8px' }) }}><XMarkIcon style={{ width:15, height:15 }} /></button>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {stages.map((s, idx) => (
          <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'rgba(255,255,255,0.03)', borderRadius:10, border:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize:12, color:'#334155', fontWeight:700, width:20, textAlign:'center' }}>{idx+1}</span>
            <div style={{ width:14, height:14, borderRadius:'50%', background: editing?.id === s.id ? editing.color : s.color, flexShrink:0 }} />
            {editing?.id === s.id ? (
              <>
                <input style={{ ...inp, flex:1, padding:'6px 10px' }} value={editing.name} onChange={e => setEdit(ed => ({ ...ed, name: e.target.value }))} autoFocus />
                <input type="color" value={editing.color} onChange={e => setEdit(ed => ({ ...ed, color: e.target.value }))} style={{ width:34, height:34, borderRadius:6, border:'none', cursor:'pointer', background:'transparent' }} />
                <button onClick={() => handleUpdate(editing)} style={{ ...btn({ background:'rgba(16,185,129,0.15)', color:'#34d399', padding:'6px 10px', fontSize:12 }) }}><CheckCircleIcon style={{ width:14, height:14 }} /></button>
                <button onClick={() => setEdit(null)} style={{ ...btn({ background:'transparent', color:'#64748b', padding:'6px 8px' }) }}><XMarkIcon style={{ width:14, height:14 }} /></button>
              </>
            ) : (
              <>
                <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{s.name}</span>
                {s.deals_count > 0 && <Tag color="#64748b">{s.deals_count} negócio(s)</Tag>}
                <div style={{ display:'flex', gap:4 }}>
                  <button onClick={() => move(idx, -1)} disabled={idx===0} style={{ ...btn({ background:'rgba(255,255,255,0.04)', color: idx===0?'#334155':'#94a3b8', padding:'5px 7px', fontSize:11 }) }}>▲</button>
                  <button onClick={() => move(idx, 1)} disabled={idx===stages.length-1} style={{ ...btn({ background:'rgba(255,255,255,0.04)', color: idx===stages.length-1?'#334155':'#94a3b8', padding:'5px 7px', fontSize:11 }) }}>▼</button>
                  <button onClick={() => setEdit({ ...s })} style={{ ...btn({ background:'rgba(255,255,255,0.05)', color:'#64748b', padding:'6px 8px' }) }}><PencilIcon style={{ width:13, height:13 }} /></button>
                  <button onClick={() => handleDelete(s.id)} style={{ ...btn({ background:'rgba(239,68,68,0.08)', color:'#f87171', padding:'6px 8px' }) }}><TrashIcon style={{ width:13, height:13 }} /></button>
                </div>
              </>
            )}
          </div>
        ))}
        {stages.length === 0 && <p style={{ textAlign:'center', color:'#475569', fontSize:13, padding:20 }}>Nenhuma etapa configurada.</p>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: BACKUP & DADOS
════════════════════════════════════════════════════════════════ */
function TabBackup() {
  const [sysInfo, setSysInfo]   = useState(null);
  const [running, setRunning]   = useState(false);
  const [logs, setLogs]         = useState([]);
  const [backupDone, setDone]   = useState(false);

  useEffect(() => {
    api.get('/settings/system').then(r => setSysInfo(r.data));
    api.get('/backups/logs').then(r => setLogs(r.data || [])).catch(() => {});
  }, []);

  const runBackup = async () => {
    setRunning(true);
    try { await api.post('/backups/run'); setDone(true); setTimeout(() => setDone(false), 4000); api.get('/backups/logs').then(r => setLogs(r.data || [])); }
    catch (err) { alert(err.response?.data?.error || 'Erro no backup'); }
    finally { setRunning(false); }
  };

  const exportData = () => {
    const token = localStorage.getItem('token');
    const url = `http://localhost:3001/api/settings/export`;
    const a = document.createElement('a');
    a.href = url; a.target = '_blank';
    // Adiciona token via fetch para download autenticado
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob()).then(blob => {
        const burl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = burl;
        link.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(burl);
      });
  };

  const fmtBytes = b => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

  return (
    <div>
      {/* Contagem de registros */}
      {sysInfo && (
        <div style={CARD}>
          <SectionTitle icon={CircleStackIcon} title="Visão do Banco de Dados" subtitle={`SQLite · ${fmtBytes(sysInfo.dbSize || 0)} · Node ${sysInfo.node}`} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
            {Object.entries(sysInfo.counts).map(([k, v]) => (
              <div key={k} style={{ background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin:'0 0 4px', fontSize:10, color:'#475569', fontWeight:700, textTransform:'capitalize' }}>{k}</p>
                <p style={{ margin:0, fontSize:20, fontWeight:800, color:'#a5b4fc' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={CARD}>
        <SectionTitle icon={CloudArrowUpIcon} title="Backup & Exportação" />
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button onClick={runBackup} disabled={running} style={{ ...btn({ background: backupDone ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: backupDone ? '#34d399' : 'white', opacity:running?0.6:1 }) }}>
            {backupDone ? <><CheckCircleIcon style={{ width:15, height:15 }} /> Backup feito!</> : running ? <><ArrowPathIcon style={{ width:15, height:15, animation:'spin 1s linear infinite' }} /> Executando...</> : <><CloudArrowUpIcon style={{ width:15, height:15 }} /> Executar Backup</>}
          </button>
          <button onClick={exportData} style={{ ...btn({ background:'rgba(99,102,241,0.12)', color:'#a5b4fc' }) }}>
            <ArrowDownTrayIcon style={{ width:15, height:15 }} /> Exportar Todos os Dados (JSON)
          </button>
        </div>
        <p style={{ margin:'12px 0 0', fontSize:11, color:'#475569' }}>O backup salva uma cópia do banco de dados no servidor. A exportação JSON inclui clientes, negócios, atividades, campanhas e leads.</p>
      </div>

      {/* Logs de backup */}
      {logs.length > 0 && (
        <div style={CARD}>
          <SectionTitle icon={ServerStackIcon} title="Histórico de Backups" />
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {logs.slice(0,8).map(l => (
              <div key={l.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.02)', borderRadius:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: l.status==='success' ? '#34d399' : '#f87171', flexShrink:0 }} />
                <span style={{ fontSize:12, color:'#94a3b8', flex:1 }}>{l.message}</span>
                <span style={{ fontSize:11, color:'#475569' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: INTEGRAÇÕES
════════════════════════════════════════════════════════════════ */
function TabIntegracoes() {
  const [data, setData]       = useState(null);
  const [geminiKey, setGKey]  = useState('');
  const [showKey, setShowKey] = useState(false);
  const [wpp, setWpp]         = useState({});
  const [ig, setIg]           = useState({});
  const [tg, setTg]           = useState({ bot_token:'', notification_chat_id:'', auto_create_lead:1, welcome_message:'', notifications_enabled:0 });
  const [tgStatus, setTgStatus] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [tgMsg, setTgMsg]     = useState('');
  const [savingG, setSG]      = useState(false);
  const [savingW, setSW]      = useState(false);
  const [savingI, setSI]      = useState(false);
  const [savingT, setST]      = useState(false);
  const [doneG, setDG]        = useState(false);
  const [doneW, setDW]        = useState(false);
  const [doneI, setDI]        = useState(false);
  const [doneT, setDT]        = useState(false);

  const load = () => api.get('/settings/integrations').then(r => {
    setData(r.data);
    setWpp(r.data.whatsapp || {});
    setIg(r.data.instagram || {});
  });
  const loadTg = () => api.get('/telegram/config').then(r => {
    const cfg = r.data || {};
    setTg({ bot_token: '', notification_chat_id: cfg.notification_chat_id||'', auto_create_lead: cfg.auto_create_lead ?? 1, welcome_message: cfg.welcome_message||'', notifications_enabled: cfg.notifications_enabled ?? 0 });
    setTgStatus({ configured: cfg.token_configured, preview: cfg.token_preview, username: cfg.bot_username });
  });
  useEffect(() => { load(); loadTg(); }, []);

  const saveGemini = async () => {
    setSG(true);
    try { await api.put('/settings/integrations/gemini', { api_key: geminiKey }); setDG(true); setTimeout(() => setDG(false), 3000); load(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setSG(false); }
  };

  const saveWpp = async () => {
    setSW(true);
    try { await api.put('/settings/integrations/whatsapp', wpp); setDW(true); setTimeout(() => setDW(false), 3000); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setSW(false); }
  };

  const saveIg = async () => {
    setSI(true);
    try { await api.put('/settings/integrations/instagram', ig); setDI(true); setTimeout(() => setDI(false), 3000); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setSI(false); }
  };

  const saveTg = async () => {
    setST(true);
    try { await api.put('/telegram/config', tg); setDT(true); setTimeout(() => setDT(false), 3000); loadTg(); }
    catch (err) { alert(err.response?.data?.error || 'Erro'); }
    finally { setST(false); }
  };

  const testTgConnection = async () => {
    setTgMsg('Testando...');
    try {
      const { data: r } = await api.post('/telegram/test-connection', { bot_token: tg.bot_token });
      setTgMsg(`✓ Bot verificado: @${r.bot.username} (${r.bot.first_name})`);
      loadTg();
    } catch (err) { setTgMsg(`✗ ${err.response?.data?.error || 'Erro de conexão'}`); }
  };

  const setTgWebhook = async () => {
    if (!webhookUrl) return setTgMsg('Informe a URL do servidor');
    setTgMsg('Registrando webhook...');
    try {
      const { data: r } = await api.post('/telegram/set-webhook', { webhook_url: webhookUrl });
      setTgMsg(`✓ Webhook registrado: ${r.url}`);
    } catch (err) { setTgMsg(`✗ ${err.response?.data?.error || 'Erro'}`); }
  };

  const deleteTgWebhook = async () => {
    setTgMsg('Removendo webhook...');
    try {
      const { data: r } = await api.post('/telegram/delete-webhook');
      setTgMsg(`✓ ${r.message || 'Webhook removido'}`);
    } catch (err) { setTgMsg(`✗ ${err.response?.data?.error || 'Erro'}`); }
  };

  if (!data) return <p style={{ color:'#475569', textAlign:'center', padding:40 }}>Carregando...</p>;

  return (
    <div>
      {/* Gemini IA */}
      <div style={CARD}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <SectionTitle icon={KeyIcon} title="Gemini IA (Google)" subtitle="Usado para geração de e-mails e mensagens Instagram" />
          <IntegrationStatus ok={data.gemini.configured} />
        </div>
        {data.gemini.configured && <p style={{ margin:'0 0 10px', fontSize:12, color:'#475569' }}>Chave atual: <code style={{ color:'#94a3b8' }}>{data.gemini.key_preview}</code></p>}
        <Label>Chave da API Gemini (AIzaSy...)</Label>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <input type={showKey ? 'text' : 'password'} style={{ ...inp, flex:1 }} value={geminiKey} onChange={e => setGKey(e.target.value)} placeholder="Cole a nova chave aqui (deixe vazio para manter a atual)" />
          <button onClick={() => setShowKey(v => !v)} style={{ ...btn({ background:'rgba(255,255,255,0.06)', color:'#64748b', padding:'8px 12px' }) }}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
        </div>
        <button onClick={saveGemini} disabled={savingG || !geminiKey} style={{ ...btn({ background: doneG ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.2)', color: doneG ? '#34d399' : '#a5b4fc', opacity: (!geminiKey || savingG) ? 0.5 : 1 }) }}>
          {doneG ? <><CheckCircleIcon style={{ width:14, height:14 }} /> Salva!</> : 'Salvar Chave Gemini'}
        </button>
        <p style={{ margin:'10px 0 0', fontSize:11, color:'#334155' }}>Obtenha a chave em: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color:'#6366f1' }}>aistudio.google.com/apikey</a></p>
      </div>

      {/* WhatsApp */}
      <div style={CARD}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <SectionTitle icon={WifiIcon} title="WhatsApp Business (Meta)" subtitle="API para receber e enviar mensagens via WhatsApp" />
          <IntegrationStatus ok={!!(wpp.phone_number_id && wpp.access_token)} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><Label>Phone Number ID</Label><input style={inp} value={wpp.phone_number_id||''} onChange={e => setWpp(w => ({ ...w, phone_number_id: e.target.value }))} placeholder="123456789" /></div>
          <div><Label>Verify Token (webhook)</Label><input style={inp} value={wpp.verify_token||''} onChange={e => setWpp(w => ({ ...w, verify_token: e.target.value }))} placeholder="candeias_webhook_token" /></div>
          <div style={{ gridColumn:'1/-1' }}><Label>Access Token (permanente)</Label><input type="password" style={inp} value={wpp.access_token||''} onChange={e => setWpp(w => ({ ...w, access_token: e.target.value }))} placeholder="EAABs..." /></div>
          <div style={{ gridColumn:'1/-1' }}><Label>Resposta automática (deixe vazio para desativar)</Label><input style={inp} value={wpp.auto_reply||''} onChange={e => setWpp(w => ({ ...w, auto_reply: e.target.value }))} placeholder="Olá! Recebemos sua mensagem..." /></div>
        </div>
        <button onClick={saveWpp} disabled={savingW} style={{ ...btn({ background: doneW ? 'rgba(16,185,129,0.15)' : 'rgba(37,211,102,0.15)', color: doneW ? '#34d399' : '#25d366', opacity:savingW?0.6:1 }) }}>
          {doneW ? <><CheckCircleIcon style={{ width:14, height:14 }} /> Salvo!</> : 'Salvar WhatsApp'}
        </button>
      </div>

      {/* Instagram */}
      <div style={CARD}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <SectionTitle icon={ShieldCheckIcon} title="Instagram Business (Meta)" subtitle="Webhook para capturar DMs e contexto da IA" />
          <IntegrationStatus ok={!!(ig.page_id && ig.access_token)} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><Label>Page ID</Label><input style={inp} value={ig.page_id||''} onChange={e => setIg(i => ({ ...i, page_id: e.target.value }))} placeholder="123456789" /></div>
          <div><Label>Instagram Business Account ID</Label><input style={inp} value={ig.instagram_account_id||''} onChange={e => setIg(i => ({ ...i, instagram_account_id: e.target.value }))} placeholder="17841400..." /></div>
          <div style={{ gridColumn:'1/-1' }}><Label>Access Token</Label><input type="password" style={inp} value={ig.access_token||''} onChange={e => setIg(i => ({ ...i, access_token: e.target.value }))} placeholder="EAABs..." /></div>
          <div><Label>Verify Token (webhook)</Label><input style={inp} value={ig.verify_token||''} onChange={e => setIg(i => ({ ...i, verify_token: e.target.value }))} placeholder="ig_webhook_token" /></div>
          <div><Label>Tom das mensagens IA</Label>
            <select style={inp} value={ig.message_tone||'profissional e amigável'} onChange={e => setIg(i => ({ ...i, message_tone: e.target.value }))}>
              <option value="profissional e amigável">Profissional e amigável</option>
              <option value="descontraído e próximo">Descontraído e próximo</option>
              <option value="formal e direto">Formal e direto</option>
              <option value="consultivo e empático">Consultivo e empático</option>
            </select>
          </div>
          <div><Label>Empresa / produto (contexto IA)</Label><input style={inp} value={ig.product_service||''} onChange={e => setIg(i => ({ ...i, product_service: e.target.value }))} placeholder="Marketing digital para PMEs" /></div>
          <div style={{ gridColumn:'1/-1' }}><Label>Descrição da empresa (contexto IA)</Label><textarea style={{ ...inp, minHeight:60, resize:'vertical' }} value={ig.company_description||''} onChange={e => setIg(i => ({ ...i, company_description: e.target.value }))} placeholder="Somos uma agência de marketing..." /></div>
        </div>
        <button onClick={saveIg} disabled={savingI} style={{ ...btn({ background: doneI ? 'rgba(16,185,129,0.15)' : 'rgba(225,48,108,0.15)', color: doneI ? '#34d399' : '#e1306c', opacity:savingI?0.6:1 }) }}>
          {doneI ? <><CheckCircleIcon style={{ width:14, height:14 }} /> Salvo!</> : 'Salvar Instagram'}
        </button>
      </div>

      {/* Telegram */}
      <div style={CARD}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <SectionTitle icon={WifiIcon} title="Telegram Bot" subtitle="Captura de leads e notificações via Telegram" />
          <IntegrationStatus ok={tgStatus?.configured} />
        </div>

        {tgStatus?.configured && (
          <p style={{ margin:'0 0 12px', fontSize:12, color:'#475569' }}>
            Token atual: <code style={{ color:'#94a3b8' }}>{tgStatus.preview}</code>
            {tgStatus.username && <span style={{ marginLeft:8, color:'#34d399' }}>{tgStatus.username}</span>}
          </p>
        )}

        {/* Token + test */}
        <Label>Bot Token (cole para atualizar)</Label>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input type="password" style={{ ...inp, flex:1 }} value={tg.bot_token} onChange={e => setTg(t => ({ ...t, bot_token: e.target.value }))} placeholder="123456789:AABBcc..." />
          <button onClick={testTgConnection} style={{ ...btn({ background:'rgba(41,182,246,0.12)', color:'#29b6f6', whiteSpace:'nowrap' }) }}>Testar Conexão</button>
        </div>

        {/* Webhook */}
        <Label>URL do servidor (para registrar webhook)</Label>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input style={{ ...inp, flex:1 }} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://seudominio.com" />
          <button onClick={setTgWebhook} style={{ ...btn({ background:'rgba(99,102,241,0.12)', color:'#a5b4fc', whiteSpace:'nowrap' }) }}>Registrar Webhook</button>
          <button onClick={deleteTgWebhook} style={{ ...btn({ background:'rgba(248,113,113,0.1)', color:'#f87171', whiteSpace:'nowrap' }) }}>Remover</button>
        </div>

        {tgMsg && (
          <p style={{ margin:'0 0 12px', fontSize:12, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', color: tgMsg.startsWith('✓') ? '#34d399' : tgMsg === 'Testando...' || tgMsg.includes('...') ? '#94a3b8' : '#f87171' }}>{tgMsg}</p>
        )}

        {/* Notificações */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div>
            <Label>Chat ID para notificações</Label>
            <input style={inp} value={tg.notification_chat_id} onChange={e => setTg(t => ({ ...t, notification_chat_id: e.target.value }))} placeholder="-1001234567890" />
          </div>
          <div>
            <Label>Mensagem de boas-vindas</Label>
            <input style={inp} value={tg.welcome_message} onChange={e => setTg(t => ({ ...t, welcome_message: e.target.value }))} placeholder="Olá! Como posso ajudar?" />
          </div>
        </div>

        <div style={{ display:'flex', gap:20, marginBottom:16 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#94a3b8' }}>
            <input type="checkbox" checked={!!tg.auto_create_lead} onChange={e => setTg(t => ({ ...t, auto_create_lead: e.target.checked ? 1 : 0 }))} />
            Criar lead automaticamente ao receber mensagem
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#94a3b8' }}>
            <input type="checkbox" checked={!!tg.notifications_enabled} onChange={e => setTg(t => ({ ...t, notifications_enabled: e.target.checked ? 1 : 0 }))} />
            Notificações de CRM habilitadas
          </label>
        </div>

        <button onClick={saveTg} disabled={savingT} style={{ ...btn({ background: doneT ? 'rgba(16,185,129,0.15)' : 'rgba(41,182,246,0.12)', color: doneT ? '#34d399' : '#29b6f6', opacity:savingT?0.6:1 }) }}>
          {doneT ? <><CheckCircleIcon style={{ width:14, height:14 }} /> Salvo!</> : 'Salvar Telegram'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ABA: MINHA CONTA
════════════════════════════════════════════════════════════════ */
function TabConta() {
  const { user, setUser } = useAuth();
  const [prefs, setPrefs]   = useState({ notifications_sound: true });
  const [passForm, setPass] = useState({ current:'', novo:'', confirm:'' });
  const [passMsg, setPMsg]  = useState({ type:'', text:'' });

  useEffect(() => {
    api.get('/profile/me').then(r => setPrefs({ notifications_sound: !!r.data.notifications_sound }));
  }, []);

  const toggleSound = async () => {
    const v = !prefs.notifications_sound;
    const { data } = await api.patch('/profile/preferences', { notifications_sound: v });
    setPrefs({ notifications_sound: !!data.notifications_sound });
    if (setUser) setUser(u => ({ ...u, notifications_sound: data.notifications_sound ? 1 : 0 }));
  };

  const handlePassword = async e => {
    e.preventDefault(); setPMsg({ type:'', text:'' });
    if (passForm.novo !== passForm.confirm) return setPMsg({ type:'error', text:'As novas senhas não coincidem' });
    try {
      await api.patch('/profile/password', { currentPassword: passForm.current, newPassword: passForm.novo });
      setPMsg({ type:'success', text:'Senha alterada com sucesso!' });
      setPass({ current:'', novo:'', confirm:'' });
    } catch (err) { setPMsg({ type:'error', text: err.response?.data?.error || 'Erro ao alterar senha' }); }
  };

  return (
    <div>
      {/* Perfil */}
      <div style={CARD}>
        <SectionTitle icon={UsersIcon} title="Perfil" />
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'white' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ margin:'0 0 2px', fontSize:15, fontWeight:700, color:'#f1f5f9' }}>{user?.name}</p>
            <p style={{ margin:'0 0 4px', fontSize:12, color:'#64748b' }}>{user?.email}</p>
            <Tag color={ROLE_COLORS[user?.role]}>{ROLE_LABELS[user?.role] || user?.role}</Tag>
          </div>
        </div>
      </div>

      {/* Sons */}
      <div style={CARD}>
        <SectionTitle icon={prefs.notifications_sound ? SpeakerWaveIcon : SpeakerXMarkIcon} title="Preferências de Notificação" />
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:'0 0 2px', fontSize:13, fontWeight:600, color:'#e2e8f0' }}>Sons do Sistema</p>
            <p style={{ margin:0, fontSize:11, color:'#64748b' }}>Ativar alertas sonoros (ex: caixa registradora ao fechar negócio).</p>
          </div>
          <button onClick={toggleSound} style={{ ...btn({ background: prefs.notifications_sound ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: prefs.notifications_sound ? '#34d399' : '#64748b' }) }}>
            {prefs.notifications_sound ? <><SpeakerWaveIcon style={{ width:14, height:14 }} /> Sons Ativados</> : <><SpeakerXMarkIcon style={{ width:14, height:14 }} /> Sons Desativados</>}
          </button>
        </div>
      </div>

      {/* Senha */}
      <div style={CARD}>
        <SectionTitle icon={LockClosedIcon} title="Segurança da Conta" subtitle="Altere sua senha de acesso" />
        <form onSubmit={handlePassword} style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          <div><Label>Senha atual</Label><input type="password" style={inp} value={passForm.current} onChange={e => setPass(f => ({ ...f, current: e.target.value }))} required /></div>
          <div><Label>Nova senha</Label><input type="password" style={inp} value={passForm.novo} onChange={e => setPass(f => ({ ...f, novo: e.target.value }))} required /></div>
          <div><Label>Confirmar nova senha</Label><input type="password" style={inp} value={passForm.confirm} onChange={e => setPass(f => ({ ...f, confirm: e.target.value }))} required /></div>
          <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:14 }}>
            {passMsg.text && <p style={{ margin:0, fontSize:12, color: passMsg.type === 'error' ? '#f87171' : '#34d399', background: passMsg.type === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', padding:'6px 12px', borderRadius:8 }}>{passMsg.text}</p>}
            <button type="submit" style={{ ...btn({ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'white', marginLeft:'auto' }) }}>
              <ShieldCheckIcon style={{ width:14, height:14 }} /> Atualizar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════════════════════ */
export default function Settings() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const [tab, setTab] = useState('geral');

  const TABS = [
    { k:'geral',       l:'Geral',        Icon:Cog6ToothIcon,    admin:false },
    { k:'equipe',      l:'Equipe',       Icon:UsersIcon,        admin:true  },
    { k:'pipeline',    l:'Pipeline',     Icon:ChartBarIcon,     admin:true  },
    { k:'backup',      l:'Backup & Dados',Icon:CircleStackIcon, admin:true  },
    { k:'integracoes', l:'Integrações',  Icon:WifiIcon,         admin:true  },
    { k:'conta',       l:'Minha Conta',  Icon:LockClosedIcon,   admin:false },
  ].filter(t => !t.admin || isAdmin);

  return (
    <div style={{ maxWidth:820, padding:'0 4px' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, background:'linear-gradient(135deg,#f1f5f9,#a5b4fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Configurações
        </h1>
        <p style={{ margin:0, fontSize:13, color:'#475569' }}>Gerencie equipe, pipeline, integrações e preferências</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:22, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:1, flexWrap:'wrap' }}>
        {TABS.map(({ k, l, Icon }) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...btn({ background:'transparent', color: tab===k ? '#a5b4fc' : '#475569', borderBottom: tab===k ? '2px solid #6366f1' : '2px solid transparent', borderRadius:0, paddingBottom:12, gap:6 }) }}>
            <Icon style={{ width:15, height:15 }} /> {l}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === 'geral'       && <TabGeral />}
      {tab === 'equipe'      && isAdmin && <TabEquipe />}
      {tab === 'pipeline'    && isAdmin && <TabPipeline />}
      {tab === 'backup'      && isAdmin && <TabBackup />}
      {tab === 'integracoes' && isAdmin && <TabIntegracoes />}
      {tab === 'conta'       && <TabConta />}
    </div>
  );
}
