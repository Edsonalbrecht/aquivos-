import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handle = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate('/app/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#070B14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '20%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(30px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 24,
        boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)',
        padding: 40,
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="CandeiasNexus" style={{ width: 160, height: 160, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: 0, fontSize: 12, color: '#6366f1', letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600 }}>CRM Platform</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.04)',
          borderRadius: 12, padding: 4, marginBottom: 28,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', borderRadius: 9,
              transition: 'all 0.2s',
              background: mode === m ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: mode === m ? 'white' : '#64748b',
              boxShadow: mode === m ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
            }}>{m === 'login' ? 'Entrar' : 'Cadastrar'}</button>
          ))}
        </div>

        <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <input type="text" placeholder="Nome completo" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required className="input" />
          )}
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required className="input" />
          <input type="password" placeholder="Senha" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required className="input" />

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 0', fontSize: 14, marginTop: 4 }}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar na plataforma' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  );
}
