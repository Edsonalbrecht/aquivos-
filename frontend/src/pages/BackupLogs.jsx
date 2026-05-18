import { useEffect, useState } from 'react';
import { CloudArrowUpIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

export default function BackupLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const loadLogs = () => {
    api.get('/backups/logs').then(r => {
      setLogs(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadLogs(); }, []);

  const handleRunBackup = async () => {
    if (!confirm('Deseja iniciar o backup do banco de dados agora? Isso pode levar alguns segundos.')) return;
    setExecuting(true);
    try {
      await api.post('/backups/run');
      loadLogs(); // Recarrega a tabela para mostrar o novo log
    } catch (err) {
      alert('Erro ao executar backup: ' + (err.response?.data?.error || err.message));
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando histórico...</div>;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Histórico de Backup</h2>
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Monitoramento das rotinas de segurança na nuvem S3</p>
        </div>
        <button 
          onClick={handleRunBackup}
          disabled={executing}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13, opacity: executing ? 0.7 : 1 }}
        >
          <CloudArrowUpIcon style={{ width: 18, height: 18 }} />
          {executing ? 'Executando...' : 'Executar Backup Agora'}
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)', color: '#64748b', textTransform: 'uppercase' }}>
            <tr>
              {['Data/Hora', 'Operação', 'Mensagem', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '14px 24px', color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ClockIcon style={{ width: 14, height: 14 }} />
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </div>
                </td>
                <td style={{ padding: '14px 24px' }}>
                  <span style={{ fontSize: 11, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    {log.operation}
                  </span>
                </td>
                <td style={{ padding: '14px 24px', color: '#e2e8f0' }}>{log.message}</td>
                <td style={{ padding: '14px 24px' }}>
                  {log.status === 'success' ? (
                    <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircleIcon style={{ width: 18, height: 18 }} /> Sucesso
                    </div>
                  ) : (
                    <div style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ExclamationTriangleIcon style={{ width: 18, height: 18 }} /> Erro
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}